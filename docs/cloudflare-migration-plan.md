# Cloudflare 完全移行計画（Vercel + Supabase → Cloudflare）

Issue #15 の計画ドキュメント。**本書は計画のみで、アプリコード・インフラは一切変更しない。**
Cloudflare 製品の仕様・料金は公開ドキュメントの参照時点（2026-11）のもの。変動しうるため、実施前に必ず再確認する。確証のない数値は「要確認」と記す。

## 1. 目的と前提

- 目的: Vercel（無料枠超過）と Supabase（費用高）の経費削減。
- 前提: 開発者・管理者は1人。小規模サービス（メンバー数十〜百人規模、1日1回の RSS 巡回）。可用性より「安く・壊さず・シンプル」を優先。
- 日時は全て JST 表示（既存方針を維持）。

## 2. 現構成の棚卸し（コードを読んで確認した事実）

| 領域 | 現状 | 移行への影響 |
|---|---|---|
| フレームワーク | Next.js 16.4.1 App Router、`next build --webpack`、React 19 | Workers 向けアダプタが必要（§4.1） |
| ホスティング | Vercel。`vercel.json` に cron と `/api/og` の memory 1536MB / maxDuration 60 | Workers へ置換。メモリ/時間設定は別物 |
| DB | Supabase Postgres。テーブル7: `members` `teams` `member_teams` `articles` `member_publications` `member_commit_slots` `note_comments` | §4.2 |
| DB アクセス | `supabase-js` の PostgREST 呼び出し（`.from()` 約46箇所、`.rpc('replace_member_commit_slots')` 1箇所）。生 SQL は無い | D1/生 Postgres にするとクエリ層の書き換えが必要 |
| DB ロジック | トリガー `sync_member_publications`（members→member_publications 同期）、RPC `replace_member_commit_slots`（DELETE→INSERT のアトミック置換）、部分ユニーク index、CHECK 制約、JSONB 列（`note_comments.comments`） | D1(SQLite) では PL/pgSQL が使えない。アプリ側 or `db.batch()` に移植 |
| RLS | 全テーブル RLS 有効。公開 SELECT 全許可。書き込みは `member_commit_slots` のみ `auth.uid()` ベース、他は service_role | Supabase 離脱時は RLS を捨て、アプリ層で認可（`src/lib/authz.ts` `requireAdmin.ts` を拡張） |
| 認証 | Supabase Auth の **Magic Link（signInWithOtp）のみ**。`/login` と隠しログイン `/signin-<hash>`、`/auth/callback` で `exchangeCodeForSession`。`members.user_id` が `auth.users(id)` を参照。管理者は env `SUBSTACK_ADMIN_USER_ID` の user id 一致で判定 | Auth の代替が最大の論点（§4.3）。メール送信基盤も別途必要 |
| ミドルウェア | `src/middleware.ts`（`@supabase/ssr` で毎回 `auth.getUser()`）。`/admin` `/my` `/notes` を保護 | OpenNext は Node ランタイム middleware 未対応の旨（§4.1 要確認）。Next 16 の `proxy.ts` 化も要検討 |
| Cron | Vercel Cron `0 18 * * *`（UTC 18:00 = JST 03:00）で `GET /api/cron`（`CRON_SECRET` Bearer 認証）。全メンバーの Substack RSS を `Promise.allSettled` で取得し `articles` に upsert | Cron Triggers の `scheduled` ハンドラへ（§4.4） |
| OG 画像 | `/api/og` が `playwright-core` + `@sparticuz/chromium`（Lambda 向け Chromium）で同一オリジンの `/og-view/<view>` を 1200x630 撮影。失敗時は `next/og` の `ImageResponse` でフォールバック。`revalidate=300`、CDN キャッシュ | Workers では Chromium を同梱できない。Browser Rendering に置換（§4.5） |
| 外向き fetch | Substack RSS（`fetchFeed.ts`）、Substack Note/コメント API（`notes.ts` `comments.ts`） | Workers の subrequest 上限内か確認（有料: 1リクエスト1000、無料: 50）。cron で全員巡回する場合、メンバー数が上限に近づくと分割が必要 |
| Next.js 機能 | `next/font/google`、`next/image`（`PrBanner` のみ）、`next/og`、`next/headers`、`revalidatePath`（admin のみ）、Server Actions、`force-dynamic`、`revalidate=300`（`/api/og`）。`unstable_cache` / `use cache` は不使用 | ISR/キャッシュは最小。OpenNext のキャッシュ層（R2/KV）はほぼ不要の見込み |
| 画像 | ローカル静的画像のみ（`next/image` は1箇所） | Cloudflare Images 不要。必要なら `images.unoptimized` かアダプタの設定で対応 |
| 環境変数 | `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` `CRON_SECRET` `SUBSTACK_ADMIN_USER_ID` `NEXT_PUBLIC_SITE_URL` `NEXT_PUBLIC_GA_MEASUREMENT_ID`。Vercel 固有: `VERCEL` `VERCEL_ENV` `VERCEL_URL` `VERCEL_PROJECT_PRODUCTION_URL`（`siteUrl.ts` `screenshot.ts`） | Vercel 固有 env を使う分岐（`getSiteUrl` と OG 撮影の serverless 判定）の置換が必要 |
| next.config | `serverExternalPackages` と `outputFileTracingIncludes` は Chromium 同梱のための設定。セキュリティヘッダ3種 | Chromium 依存を外せば不要。ヘッダは Workers でも `next.config` の headers で維持できるか確認 |
| ドメイン | 本番 `https://keep-substack.com` | DNS を Cloudflare に移し Workers の Custom Domain を割当 |
| テスト | vitest（unit）、Playwright E2E | 移行後も E2E で回帰確認 |
| 孤立スクリプト | `scripts/seed-kv.ts`（Upstash Redis 時代の遺物）`scripts/export-to-sql.ts` | 移行対象外。整理は別 Issue |

## 3. 移行先の選択肢と推奨

### 3.1 アプリ実行基盤

| 案 | 内容 | 評価 |
|---|---|---|
| A. Workers + OpenNext（`@opennextjs/cloudflare`） | Next.js をそのまま Workers の Node 互換で動かす | **推奨**。Next 16 の各マイナー/パッチをサポートと公式に記載。Pages 向けの `next-on-pages`（Edge 限定）は避ける |
| B. vinext | Next.js API を Vite 上で再実装した Workers 向け | 新しく、本アプリの Server Actions / `next/og` / middleware の互換性は未検証。**第2候補（PoC で比較）** |
| C. Next.js を捨てて作り直し | Hono + 静的 SPA 等 | コスト過大。却下 |

注意点（PoC で必ず確認）:
- **Node ランタイムの middleware**: OpenNext 公式は Node Middleware（Next 15.2+）を「未対応」としている（要確認: 現行バージョンで解消済みか）。本アプリの middleware は Edge 相当の書き方なので動く見込みだが、Next 16 の `proxy.ts` 移行との関係を確認する。
- Worker のサイズ上限: 無料 3 MiB / 有料 10 MiB（gzip 後）。`@sparticuz/chromium` と `playwright-core` を除去すれば収まる見込み。
- `next/og`（`ImageResponse`）は Workers で動く（WASM）。フォント同梱方法のみ確認。
- ビルドは Linux/macOS（Windows 不可）。現行の `--webpack` は維持できるか確認。

### 3.2 データベース（人の判断が必要・UAT #16 に集約）

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **D1（SQLite）** | Workers バインディングで直接クエリ | 追加サービス無し、低価格（無料枠あり。上限は要確認）、レイテンシ最小 | Postgres 固有機能（トリガー/PL/pgSQL/RPC/RLS/JSONB 演算/UUID・TIMESTAMPTZ 型）を全て移植。クエリ層（約46箇所）を書き直し。**移行コスト大** |
| **Postgres 継続 + Hyperdrive** | DB は他社 Postgres（Neon / Supabase 無料枠 / Xata 等）に置き、Hyperdrive で接続を最適化 | スキーマ・SQL・トリガー・RPC を流用可能。Hyperdrive は Free 1日 10万クエリ、有料は無制限と公式に記載（要確認） | DB 側の費用が別に発生しうる。クエリ層は `supabase-js`(PostgREST) から生 SQL（`postgres`/`pg` ドライバ）へ書き換え |
| **Supabase を無料枠に落として継続** | Auth+DB は据え置き、ホスティングだけ Cloudflare | **最小工数**。コードはほぼ無改修 | Supabase が「高い」原因が Pro プラン（月額約 25 USD 要確認）なら無料枠（500MB、7日無操作で一時停止、要確認）に収まるかが条件。daily cron が動くので停止は起きにくい見込みだが保証なし |

**推奨（暫定）**: 段階的に **フェーズ1 = ホスティングのみ Cloudflare（DB/Auth は Supabase 継続、可能なら無料枠）**、フェーズ2 で DB/Auth を判断する。理由: Vercel 無料枠超過という即効性のある問題を最小リスクで解消でき、Supabase 費用の実態（プラン・使用量）を確認してから不可逆な DB 移行を決められる。「完全移行」が必須ならフェーズ2 は **Postgres 継続 + Hyperdrive**（トリガー/RPC をそのまま使えデータ破壊リスクが最小）を第一候補、D1 は工数が大きいので第二候補とする。

### 3.3 認証

| 案 | 内容 | 評価 |
|---|---|---|
| Supabase Auth 継続 | DB を Supabase に残す限りそのまま | フェーズ1 の前提。Cookie ドメイン/Redirect URL の更新のみ |
| 自前 Magic Link | トークンを DB(or KV) に保存、メールは Cloudflare Email Service / Resend 等、セッションは署名 Cookie（JWT）。ライブラリ候補: Auth.js / Better Auth / Lucia 系（要確認） | DB 離脱時の現実解。実装・セキュリティ責任（レート制限、トークン失効、メール到達性）が増える |
| 外部 IdP（Clerk 等） | マネージド | 無料枠は MAU 依存（要確認）。コスト削減目的に反する可能性 |

論点: `auth.users.id` を FK にしている `members.user_id` と `SUBSTACK_ADMIN_USER_ID` の扱い。移行時は **既存ユーザーの user id を保持**してインポートするか、email をキーに再紐付けする（§6）。Magic Link のみで パスワードが無いため、パスワードハッシュ移行は不要で、ユーザー移行は比較的容易。

### 3.4 Cron

`vercel.json` の cron を Workers の **Cron Triggers**（`triggers.crons = ["0 18 * * *"]`、UTC なので JST 03:00 のまま）に置換。OpenNext 生成の worker をラップして `scheduled` ハンドラを追加し、既存 `/api/cron` ロジックを共通関数に切り出して呼ぶ（HTTP 経由の `CRON_SECRET` 認証は手動実行用に残すか廃止を判断）。メンバー増加時の subrequest 上限・実行時間は Queues / Workflows での分割を検討（現状規模では不要見込み）。

### 3.5 OG 画像

Chromium 同梱は Workers で不可。選択肢:
1. **Browser Rendering（現 Browser Run）+ `@cloudflare/playwright`**: 現行の「実ページを撮影」方式（ユーザーが忠実さを重視）を維持できる。撮影結果を **R2 または Cache API** に保存して再撮影を抑える。Free は 1日あたりの利用時間に上限、有料は月 10 時間込み・超過 0.09 USD/時間（要確認）。
2. `next/og` の `ImageResponse` だけで描画（現フォールバックを本採用）: 最安・最速だが**見た目が実物と変わる**ため、既存の「忠実さ優先」方針と衝突。
3. 撮影を cron 時に事前生成して R2 に置く: 同時実行・コールドスタートの問題を回避できる。

推奨: 1+R2 キャッシュ（OG は SNS クローラが叩くだけでアクセス頻度が低い見込み）。撮影対象は同一オリジンの `/og-view/*` で、Worker から自分自身へ到達する経路（Browser Rendering から公開ホスト名へ）を PoC で確認。SSRF 対策（`isAllowedOgHost`）は維持。

### 3.6 その他

- 静的アセット: Workers Static Assets（リクエスト無料・無制限と公式に記載）。
- メール（Magic Link 用）: Supabase 継続なら Supabase 側 SMTP 設定のまま。自前化する場合は Cloudflare Email Service か Resend 等（要確認）。
- 分析: GA4 は据え置き。
- KV/R2: OpenNext のインクリメンタルキャッシュ用に R2 を使えるが、ISR をほぼ使っていないため当面不要。

## 4. コスト比較（概算）

**前提（要確認）**: 月間 PV 数十万以下、API/SSR リクエストは月 1,000 万未満、DB は数十 MB、cron は1日1回、OG 撮影は月数百回。現在の Vercel/Supabase の実請求額は**本書の作成者は未確認**（人が請求書を確認する必要あり。UAT #16）。

| 構成 | 月額の目安 | 根拠・備考 |
|---|---|---|
| 現状（Vercel + Supabase） | 要確認 | Vercel 無料枠超過、Supabase 有料プラン（Pro は約 25 USD 要確認）と推定 |
| Cloudflare Workers Free + Supabase Free | 0 USD | Workers Free は 1日 10万リクエスト・CPU 10ms/リクエスト。SSR+Supabase 呼び出しが CPU 10ms に収まるか要検証。Browser Rendering の無料枠は1日あたりの分数制限 |
| Workers Paid + Supabase Free | 約 5 USD〜 | Workers Paid は最低 5 USD/月（1,000万リクエスト・3,000万 CPU ms 込み、超過は 0.30 USD/百万リクエスト）。公式の例: 1,500万リクエスト・CPU 7ms で 8 USD |
| Workers Paid + Postgres(他社) + Hyperdrive | 約 5 USD + DB 費用 | Neon 等の無料〜低額プラン（要確認）。Hyperdrive は有料プランで追加費用なしと公式に記載（要確認） |
| Workers Paid + D1 | 約 5 USD〜（D1 は小規模なら込みの範囲に収まる見込み、要確認） | 最安だが移植工数最大 |
| Browser Rendering | 有料プランに 10 時間/月込み、超過 0.09 USD/時間（要確認） | OG 撮影を R2 キャッシュすれば込みの範囲に収まる見込み |

結論: どの案でも「Workers Paid 5 USD/月 + DB」が下限になる見込み。**Workers Free で収まるなら 0 USD**（CPU 10ms 制限が最大の不確実性）。DB 費用の差がコスト差の本体。

## 5. 段階的な移行フェーズとロールバック

各フェーズは**独立して戻せる**ように、旧環境（Vercel/Supabase）を最終フェーズまで稼働させる。

| フェーズ | 内容 | 完了条件 | ロールバック |
|---|---|---|---|
| 0. 実態調査 | Vercel/Supabase の請求・使用量確認、判断事項（UAT #16）の確定、Cloudflare アカウント準備 | 方針（§3.2/3.3）が決まる | 不要 |
| 1. PoC | 別ブランチで OpenNext（と vinext）ビルド、`wrangler dev` / preview デプロイ。Magic Link ログイン、middleware、Server Actions、`next/og` の動作確認。本番データは使わず **dev 用 Supabase（otydhiumsdsyxepnjqjp）** に接続 | PoC 結果を docs に追記し GO/NO-GO | ブランチ破棄のみ |
| 2. アプリ移植 | Vercel 固有 env の除去（`siteUrl.ts` `screenshot.ts`）、cron を `scheduled` 化、OG を Browser Rendering 化、`wrangler.jsonc` 追加、CI 追加。**別 PR に小分け**。Vercel でも動く状態を保つ（二重対応） | preview URL で E2E 合格 | Vercel は無改変で稼働継続 |
| 3. ステージング | Cloudflare の `*.workers.dev` / 検証サブドメインで本番相当データ（読み取り）を使い確認。Auth Redirect URL に追加 | 手動 UAT 合格 | URL を使わなくなるだけ |
| 4. DNS 切替 | `keep-substack.com` を Cloudflare に移し Custom Domain を Workers に割当。TTL を事前に短縮。Supabase の Site URL / Redirect URL、Magic Link メールのリンク先を更新 | 本番ログイン・cron・OG 正常 | DNS を Vercel に戻す（TTL 短縮済みなら数分） |
| 5. DB/Auth 移行（任意・別判断） | §6 のとおり | データ件数・整合性一致 | 旧 Supabase を読み取り専用で保持し切り戻し |
| 6. 旧環境撤去 | 1〜2 週間の安定稼働後に Vercel プロジェクト停止、Supabase 停止/ダウングレード | 請求が下がったことを確認 | 撤去前にバックアップ（pg_dump）を保管 |

重要: **cron の二重実行を避ける**（Vercel Cron と Cron Triggers を同時に有効にしない。切替日に Vercel 側を先に止める）。`articles.link` が UNIQUE なので二重でも壊れはしないが、外向き fetch が倍になる。

## 6. データ移行手順（フェーズ5）

データ規模は小さい（7テーブル、`articles` が最大）想定。件数は要確認。

共通:
1. 移行直前に `pg_dump`（本番 prod=xolhjcngrwwwqtklmoyk）を取得し安全な場所へ保管。
2. cron を一時停止し、`/admin` からの書き込みを止めるメンテ時間を設ける（深夜、cron 実行後）。
3. 移行後、各テーブルの件数・主キー集合・`articles.link` の一意性を突合。

**Postgres + Hyperdrive 案**: 新 DB に `supabase/schema.sql` から `auth.users` 参照と RLS を除いた版を適用 → `pg_dump --data-only` を `COPY` で投入 → `members.user_id` の FK は削除し、認証側のユーザー表に合わせる。トリガー・RPC はそのまま利用可。

**D1 案**: `export-to-sql` の方針を参考に、UUID→TEXT、TIMESTAMPTZ→ISO8601 TEXT、JSONB→TEXT(JSON) へ変換して `wrangler d1 execute --file` で投入。`sync_member_publications` はアプリ層/バッチで代替し、`replace_member_commit_slots` は `db.batch()` で DELETE+INSERT を原子化。部分ユニーク index は SQLite も対応。D1 のトランザクション/サイズ制限は要確認。

**Auth ユーザー移行**: Magic Link のみのため `auth.users` から id・email・created_at を抽出して新認証へ投入し、**id を保持**する。保持できない場合は `members.user_id` を email 経由で再紐付けし、`SUBSTACK_ADMIN_USER_ID` を更新する。ログイン中セッションは全員無効になる（再ログイン要）ことを告知する。

## 7. リスク

| リスク | 影響 | 対策 |
|---|---|---|
| OpenNext/vinext と Next 16.4 / middleware / Server Actions の非互換 | 移植不能 | フェーズ1 の PoC で GO/NO-GO。ダメなら Vercel 継続＋Supabase 見直しのみに縮小 |
| Workers Free の CPU 10ms 制限で SSR が超過 | 有料化（5 USD/月） | 計測して判断。有料でも許容か人が判断 |
| OG 撮影が Browser Rendering で再現しない/高コスト | SNS シェア画像の劣化 | R2 キャッシュ、フォールバック画像の維持（既存の 500 回避設計を踏襲） |
| Magic Link メール到達性の悪化（自前化時） | ログイン不能 | Supabase Auth を最後まで残す。送信ドメイン認証(SPF/DKIM/DMARC) |
| RLS 喪失による認可漏れ（DB 離脱時） | データ漏えい・改ざん | `member_commit_slots` の「自分の行のみ」をアプリ層で必ず検証＋テスト追加 |
| DNS 切替時のダウンタイム、Cookie/Redirect URL の不整合 | 一時的にログイン不能 | TTL 短縮、切替前に Redirect URL へ新ドメインを追加済みにする |
| cron の subrequest/実行時間上限 | 一部メンバー未更新 | 件数が上限に近づいたら分割。`allSettled` の失敗件数をログ化 |
| Vercel 固有 env 依存の取りこぼし | 誤った OG ホスト判定 | `grep VERCEL` で全洗い出し（現状 `siteUrl.ts` `screenshot.ts`） |
| 不可逆な DB 移行でのデータ破損 | 最悪データ喪失 | バックアップ、旧 DB 読み取り専用保持、突合手順 |

## 8. 未決事項（人の判断が必要）

UAT #16 に集約済み。要点:
1. 現在の Vercel / Supabase の実請求額と、許容する月額上限。
2. DB 方針: Supabase 無料枠継続 / Postgres+Hyperdrive / D1。
3. Auth 方針: Supabase Auth 継続 / 自前 Magic Link。
4. OG 画像: 実ページ撮影の維持（Browser Rendering）か簡素化か。
5. 「完全移行」の期限と、フェーズ5（DB/Auth）を実施するかどうか。
6. Cloudflare アカウント・ドメインの DNS 移管の可否。

## 9. 次のアクション

- 上記 1〜3 の回答後、フェーズ1（PoC）用の Issue を別途起票する（本 PR のスコープ外）。

## 参考（公式ドキュメント）

- Workers 料金: https://developers.cloudflare.com/workers/platform/pricing/
- Browser Run: https://developers.cloudflare.com/browser-run/
- D1 料金: https://developers.cloudflare.com/d1/platform/pricing/
- Hyperdrive 料金: https://developers.cloudflare.com/hyperdrive/platform/pricing/
- OpenNext Cloudflare: https://opennext.js.org/cloudflare
- Vercel から Workers への移行: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/
