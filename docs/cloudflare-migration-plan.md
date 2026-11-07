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
| RLS | 全テーブル RLS 有効。公開 SELECT 全許可。書き込みは `member_commit_slots` のみ `auth.uid()` ベース、他は service_role | D1 には RLS が無い。アプリ層で認可（§3.2 の認可一覧） |
| 認証 | Supabase Auth の **Magic Link（signInWithOtp）のみ**。`/login` と隠しログイン `/signin-<hash>`、`/auth/callback` で `exchangeCodeForSession`。`members.user_id` が `auth.users(id)` を参照。**管理者は `auth.users.role = 'admin'`**（`src/lib/authz.ts` の `isAdmin()`。middleware と `requireAdmin.ts` が使用）。`SUBSTACK_ADMIN_USER_ID` は認証と無関係で、`notes.ts` が Substack の profile API に渡す **Substack 側のユーザー ID** | Auth の置換が大きな論点（§3.3）。移行時は `role` の移し先が必要。メール送信基盤も別途必要 |
| ミドルウェア | `src/middleware.ts`（`@supabase/ssr` で毎回 `auth.getUser()`）。`/admin` `/my` `/notes` を保護 | OpenNext は Node ランタイム middleware 未対応の旨（§4.1 要確認）。Next 16 の `proxy.ts` 化も要検討 |
| Cron | Vercel Cron `0 18 * * *`（UTC 18:00 = JST 03:00）で `GET /api/cron`（`CRON_SECRET` Bearer 認証）。全メンバーの Substack RSS を `Promise.allSettled` で取得し `articles` に upsert | Cron Triggers の `scheduled` ハンドラへ（§4.4） |
| OG 画像 | `/api/og` が `playwright-core` + `@sparticuz/chromium`（Lambda 向け Chromium）で同一オリジンの `/og-view/<view>` を 1200x630 撮影。失敗時は `next/og` の `ImageResponse` でフォールバック。`revalidate=300`、CDN キャッシュ | Workers では Chromium を同梱できない。Browser Rendering に置換（§4.5） |
| 外向き fetch | Substack RSS（`fetchFeed.ts`）、Substack Note/コメント API（`notes.ts` `comments.ts`） | Workers の subrequest 上限（公式 limits ページ: 1 呼び出しあたり Free 50 / Paid 10,000）内か確認。cron だけでなく**ページ表示でも効く**（「ページの動的性」行） |
| Next.js 機能 | `next/font/google`、`next/image`（`PrBanner` のみ）、`next/og`、`next/headers`、`revalidatePath`（admin のみ）、Server Actions、`force-dynamic`、`revalidate=300`（`/api/og` `(main)/page.tsx` `daily` `member/[publicationId]` `admin/teams/[teamName]` `og-view/[view]`）。`unstable_cache` / `use cache` は不使用 | ISR/キャッシュは最小。OpenNext のキャッシュ層（R2/KV）はほぼ不要の見込み |
| 画像 | ローカル静的画像のみ（`next/image` は1箇所） | Cloudflare Images 不要。必要なら `images.unoptimized` かアダプタの設定で対応 |
| ページの動的性 | `/` `/daily` `/member/[id]` `/admin/teams/[teamName]` `/og-view/*` `/my` は `fetchAllFeedsCached(members)` で**リクエストごとに全メンバーの Substack RSS を live fetch**し、メンバーごとに `getArticles`（articles + members の2クエリ）を投げる（`fetchFeed.ts:72-`）。`createSupabaseServerClient()` で cookie を読むため `revalidate = 300` があっても実際は毎回動的描画の見込み（**ビルド出力で未確認**）。一括取得の `getArticlesForMembers` は存在するが `fetchAllFeedsCached` は使っていない | 1表示 = メンバー数 × (RSS fetch + DB クエリ2) のサブリクエストと RSS パース CPU。§4 のコストの本体 |
| 環境変数 | `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` `CRON_SECRET` `SUBSTACK_ADMIN_USER_ID` `NEXT_PUBLIC_SITE_URL` `NEXT_PUBLIC_GA_MEASUREMENT_ID`。Vercel 固有: `VERCEL` `VERCEL_ENV` `VERCEL_URL` `VERCEL_PROJECT_PRODUCTION_URL`（`siteUrl.ts` `screenshot.ts`。`api/og/route.tsx:84` はコメントのみだが `getSiteUrl()` 経由で `VERCEL_URL` 前提） | `getSiteUrl` と OG 撮影の serverless 判定を置換。`grep VERCEL src` で全洗い出し |
| next.config | `serverExternalPackages` と `outputFileTracingIncludes` は Chromium 同梱のための設定。セキュリティヘッダ3種 | Chromium 依存を外せば不要。ヘッダは Workers でも `next.config` の headers で維持できるか確認 |
| ドメイン | 本番 `https://keep-substack.com` | DNS を Cloudflare に移し Workers の Custom Domain を割当 |
| テスト | vitest（unit）、Playwright E2E | 移行後も E2E で回帰確認 |
| 孤立スクリプト | `scripts/seed-kv.ts`（Upstash Redis 時代の遺物）`scripts/export-to-sql.ts` | 移行対象外。整理は別 Issue |

## 3. 移行先の選択肢と方針

### 3.1 アプリ実行基盤

| 案 | 内容 | 評価 |
|---|---|---|
| A. Workers + OpenNext（`@opennextjs/cloudflare`） | Next.js をそのまま Workers の Node 互換で動かす | **推奨**。Next 16 の各マイナー/パッチをサポートと公式に記載。Pages 向けの `next-on-pages`（Edge 限定）は避ける |
| B. vinext | Next.js API を Vite 上で再実装した Workers 向け | 新しく、本アプリの Server Actions / `next/og` / middleware の互換性は未検証。**第2候補（PoC で比較）** |
| C. Next.js を捨てて作り直し | Hono + 静的 SPA 等 | コスト過大。却下 |

注意点（PoC で必ず確認）:
- **Node ランタイムの middleware**: OpenNext 公式は Node Middleware（Next 15.2+）を「未対応」としている（要確認: 現行バージョンで解消済みか）。本アプリの middleware は Edge 相当の書き方なので動く見込みだが、Next 16 の `proxy.ts` 移行との関係を確認する。
- Worker のサイズ上限: 従来値は無料 3 MiB / 有料 10 MiB。公式 limits ページでは Free/Paid とも 64 MiB と読めるが、圧縮前か圧縮後かは**原文で要確認**。`@sparticuz/chromium` と `playwright-core` を除去すれば収まる見込み。
- `next/og`（`ImageResponse`）は Workers で動く（WASM）。フォント同梱方法のみ確認。
- ビルドは Linux/macOS（Windows 不可）。現行の `--webpack` は維持できるか確認。

### 3.2 データベース: **D1 に決定**（開発者決定 2026-11-07）

| 案 | 判定 | 理由 |
|---|---|---|
| **D1（SQLite）** | **採用** | 追加サービス無し、Workers バインディングで直接クエリ、レイテンシ最小、インデックスを張れば小規模なら込みの料金で収まる見込み（Free 5M 読み/日・Paid 25B 読み/月込み。§4.1） |
| Postgres 継続 + Hyperdrive | 不採用 | スキーマ流用は楽だが DB 費用が別に発生し、DB を Cloudflare に寄せて費用を下げる目的に合わない |
| Supabase 無料枠で継続 | 不採用 | 最小工数だが、Auth/DB を Supabase に残す前提で「完全移行」に反する |

#### Postgres → D1 差分表（コードで確認した使い方に基づく）

| # | Postgres の機能 | 今の使い方 | D1 での置き換え | 書き換える箇所 |
|---|---|---|---|---|
| 1 | `UUID` + `gen_random_uuid()` | `members` `teams` `articles` `member_publications` の PK | `TEXT` PK。アプリで `crypto.randomUUID()` を INSERT 時に振る。**既存 id は文字列のまま保持**（FK を壊さない） | INSERT する全箇所（`members.ts` `articles.ts` `auth/callback` `admin/*actions`） |
| 2 | `TIMESTAMPTZ`（`added_at` `pub_date` `fetched_at`） | `articles.pub_date` を `.order('pub_date', desc)`、`fetched_at` を鮮度判定（30分） | **UTC・`Z` 付き ISO8601 `TEXT`** に統一（例 `2026-11-07T18:00:00.000Z`）。形式を固定すれば文字列比較で順序が正しい。epoch INTEGER は可読性で却下 | `articles.ts` `comments.ts` と移行スクリプト（offset 付きの値は UTC へ正規化） |
| 3 | `JSONB`（`note_comments.comments`） | CommentItem[] を1行で保存し丸ごと読む | `TEXT` に `JSON.stringify`、読む側で `JSON.parse`。DB 内で JSON 演算はしていないので `json_extract` は不要 | `comments.ts` の読み書き |
| 4 | `now()` / 日付演算 | `DEFAULT now()` のみ。JST 計算は全てアプリ側（`commitUtils.ts` `gamification.ts` `shareUrl.ts` の +9h） | DB は **UTC で保持**（JST は表示層で維持）。`DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` で同形式の UTC 文字列を生成。`datetime('now')` は `Z` 無しなので使わない | スキーマ DEFAULT のみ |
| 5 | `BIGINT GENERATED ALWAYS AS IDENTITY` | `member_commit_slots.id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | スキーマのみ |
| 6 | `CHECK` / `UNIQUE` / 部分ユニーク index | `teams.status` CHECK、`member_commit_slots` の CHECK、`(member_id, day_of_week)` UNIQUE、`uq_member_publications_one_primary`（`WHERE is_primary`） | SQLite も同等に対応（BOOLEAN は `INTEGER 0/1`）。D1 は外部キーを既定で強制し `ON DELETE CASCADE` も使える（公式 foreign-keys ページ）。投入順が崩れる場合のみ `PRAGMA defer_foreign_keys = on` | スキーマ、`is_primary` の true/false → 1/0 |
| 7 | トリガー `sync_member_publications` | members の INSERT/UPDATE で primary 行を同期。INSERT は `ON CONFLICT (publication_id) DO NOTHING` | **SQLite トリガーで移植する案を第一候補**（D1 のトリガー対応は**要確認**）。`AFTER INSERT` と `AFTER UPDATE OF publication_id` の2本に分け、`IS DISTINCT FROM` は `IS NOT`、INSERT は `ON CONFLICT(publication_id) DO NOTHING` のまま（SQLite 3.24+ の UPSERT。`INSERT OR IGNORE` は NOT NULL・CHECK 違反も黙って無視するため使わない）。不可なら members を書く全経路（`admin/actions.ts` `auth/callback` `my/actions.ts`）で同じ `db.batch()` に含める | スキーマ、またはその3経路 |
| 8 | RPC `replace_member_commit_slots`（DELETE→INSERT） | `my/actions.ts:175` が `.rpc()` で呼ぶ | `db.batch([DELETE, INSERT…])`（batch は暗黙のトランザクションで原子的、**要確認**）。空配列なら DELETE のみ | `my/actions.ts` |
| 9 | 一意制約違反コード `23505` | `auth/callback/route.ts:55`、`admin/actions.ts:110`、`admin/teams/actions.ts:21`、`my/actions.ts:77` で分岐 | D1 は `SQLITE_CONSTRAINT`（メッセージ `UNIQUE constraint failed: <table>.<col>`）。**判定用の共通関数を1つ作り**、列名（`substack_handle` / `publication_id` / `name`）で分岐 | 上記4箇所 |
| 10 | `upsert(onConflict)` | `articles`（`link`、`ignoreDuplicates` あり）、`note_comments`（`note_id`）、`teams`（`name`）計6箇所 | `INSERT … ON CONFLICT(col) DO UPDATE` / `DO NOTHING`（`ignoreDuplicates` は後者）。多行は `db.batch()` | `articles.ts:108,122` `comments.ts:214` `members.ts:62,131` |
| 11 | RLS | 公開 SELECT 全許可、`member_commit_slots` のみ `auth.uid()` | **廃止。アプリ層で認可**（下の一覧） | 全 Server Action / route |
| 12 | マイグレーション運用 | `supabase/schema.sql` を正規とし SQL Editor で手流し | `wrangler d1 migrations`（`migrations/NNNN_*.sql`）。**dev 用と本番用の D1 を分ける**（今の dev/prod Supabase に対応）。`schema.sql` は廃止し migrations を正とする | リポジトリ構成、手順書 |
| 13 | クエリ層（`.from()` 46箇所 + `.rpc` 1 + `auth.*`） | `supabase-js`（PostgREST）。生 SQL は無い | 素の `env.DB.prepare().bind()` か Drizzle 等。**選択は #16 の論点**。Drizzle は型が付き書き換えが機械的だが、バンドルサイズは PoC で確認 | `src/lib/*.ts`（members 12 / articles 8）、`my/*`、`auth/callback`、`og-view`、`admin/*`、一部コンポーネント |
| 14 | インデックス（**現行に無い**） | `articles.publication_id` は FK だが Postgres は FK に自動でインデックスを張らず、`schema.sql` と `migrations/` の INDEX は `uq_member_publications_one_primary` のみ（`link` は UNIQUE なので有り）。`getArticles`（`articles.ts:8-13`）は `.eq('publication_id').order('pub_date' desc)` でメンバーごとに1回引く | D1 の migrations で `CREATE INDEX idx_articles_publication_pub_date ON articles(publication_id, pub_date DESC)` を**必ず入れる**。D1 の rows read は走査行で数えるため、無いと全件スキャンになる（§4.1） | D1 スキーマ（現行 Postgres への追加は本計画の範囲外） |

#### RLS 廃止後の認可一覧（アプリ層で必ず検証し、テストを追加する）

| 操作 | 今の防御 | 移行後の検証 | テスト |
|---|---|---|---|
| 公開データの SELECT | RLS 公開 SELECT | 不要（元から公開）。D1 binding は Worker 内だけで露出し外部から直接は叩けない | - |
| admin 操作（members/teams 管理） | `requireAdmin()` + service_role | `requireAdmin()` を新 Auth の admin 判定に差し替え（§3.3） | 非 admin が拒否される |
| 自分のスロット書き込み（`member_commit_slots`） | RLS `auth.uid()` | Server Action で「セッションの user → `members.user_id` → `member_id`」を引き、**その member_id の行しか書かない**。クライアントから member_id を受け取らない | 他人の member_id を渡しても自分の行しか変わらない |
| プロフィール更新（`my/actions.ts` の `.eq('user_id', user.id)`） | アプリ層 | 同じ。新 Auth の user id で絞る | 他人の行を更新できない |
| member の claim / 自動作成（`auth/callback`） | service_role + 検証 | 同じ検証（`isValidPublicationId`、`user_id` 未設定のみ claim）を維持 | claim 済み member を奪えない |
| cron の articles / note_comments 書き込み | `CRON_SECRET` | 同じ（`scheduled` は外部から叩けない。HTTP 経路を残すなら Bearer を維持） | 認証なしの `/api/cron` が 401 |

### 3.3 認証（置換対象。Better Auth に決定、§8）

「完全移行」のため Supabase Auth も置き換える。現状は Magic Link のみ（パスワード無し）なので、ユーザー移行は比較的容易。

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **A. Better Auth（magic link プラグイン + D1）** | OSS ライブラリ。セッション・トークン・レート制限をライブラリに任せる。メールは Resend か Cloudflare Email Service | 実装量が少なく、トークン失効やセッション管理の穴を作りにくい。D1 に同居 | ライブラリ依存。Workers/D1/Next 16 との相性は PoC で確認（**要確認**）。user 表をライブラリのスキーマに合わせる必要 |
| B. Auth.js（Email プロバイダ + D1 アダプタ） | 定番ライブラリ | 情報が多い | Workers 対応・D1 アダプタの成熟度は**要確認**。メール送信は別途必要 |
| C. 自前 Magic Link | トークンを D1（または KV）に保存、署名 Cookie（JWT）でセッション | 依存が最小 | レート制限・トークン失効・メール到達性の責任を全部負う。1人開発で保守が重い |
| D. 外部 IdP（Clerk 等） | マネージド | 運用ゼロ | 無料枠は MAU 依存（**要確認**）。コスト削減目的に反しうる。ユーザー情報が外部に出る |

**おすすめ: A（Better Auth）**。認証の「作り込みで事故る部分」を自作せずに済み、DB を D1 に寄せる決定とも整合する。PoC で Workers 上の動作、Magic Link の送信、`/auth/callback` 相当の流れを確認し、動かなければ B → C の順に落とす。**決定済み（#16）**。

どの案でも決めておくこと:
- **admin 判定**: 今は `auth.users.role='admin'`。新 user 表に `role` 列（または admin の user id を env）を持たせ、`isAdmin()` / `requireAdmin()` / middleware を差し替える。移行手順に「`role` を引き継ぐ」を含める（§6）。`SUBSTACK_ADMIN_USER_ID` は Substack の profile id なので触らない。
- **ユーザー id の保持**: `members.user_id` の参照先なので、既存の `auth.users.id`（UUID）を**そのままの文字列で新 user 表の id に入れる**。保持できないライブラリなら `members.user_id` を email 経由で振り直す。
- **未登録メールの扱い**: 今は `signInWithOtp` の既定でユーザーが自動作成される（`shouldCreateUser` 既定）。新方式でも「誰でもメールでサインアップできる」を維持するか、招待制にするかを明示的に決める（維持が現行互換）。
- **メール送信**: Supabase の SMTP から離れるため、送信ドメインの SPF/DKIM/DMARC を設定する。
- **セッション**: 既存 Supabase のセッションは引き継げない。切替時に全員ログアウトされ、**メール宛の Magic Link で再ログイン**してもらう。告知を出す。`email_confirmed_at` は新 user 表の「メール確認済み」に写す。
- 書き換え対象: `/login`、隠し `/signin-<hash>`、`/auth/callback`、`authActions.ts`、`middleware.ts`、`requireAdmin.ts`、`@supabase/ssr` の全面撤去。

### 3.4 Cron

`vercel.json` の cron を Workers の **Cron Triggers**（`triggers.crons = ["0 18 * * *"]`、UTC なので JST 03:00 のまま）に置換。OpenNext 生成の worker をラップして `scheduled` ハンドラを追加し、既存 `/api/cron` ロジックを共通関数に切り出して呼ぶ（HTTP 経由の `CRON_SECRET` 認証は手動実行用に残すか廃止を判断）。メンバー増加時の subrequest 上限・実行時間は Queues / Workflows での分割を検討（現状規模では不要見込み）。

### 3.5 OG 画像

Chromium 同梱は Workers で不可。選択肢:
1. **Browser Rendering（現 Browser Run）+ `@cloudflare/playwright`**: 現行の「実ページを撮影」方式（ユーザーが忠実さを重視）を維持できる。撮影結果を **R2 または Cache API** に保存して再撮影を抑える。Free は 1日 10 分、Paid は月 10 時間込み・超過 $0.09/時間（公式ドキュメントで確認済み）。
2. `next/og` の `ImageResponse` だけで描画（現フォールバックを本採用）: 最安・最速だが**見た目が実物と変わる**ため、既存の「忠実さ優先」方針と衝突。
3. 撮影を cron 時に事前生成して R2 に置く: 同時実行・コールドスタートの問題を回避できる。

**確定（開発者回答 2026-11-07、#18）: 簡素化（案2）**。まず既存フォールバックをそのまま採用（全 view 共通の固定画像。個別の草は出ない）して期限を優先し、view ごとの描画（`ImageResponse`）や撮影方式（案1）は移行後に必要なら足す。R2 は使わない。詳細は `docs/cloudflare-phase0-decisions.md` §3。
（参考・旧推奨: 1+R2 キャッシュ。撮影対象は `/og-view/*` で、撮影1回ごとに全 RSS fetch が走る点が時間・コストに効く。）

### 3.6 その他

- 静的アセット: Workers Static Assets（リクエスト無料・無制限と公式に記載）。
- メール: §3.3 のとおり Resend か Cloudflare Email Service（料金は要確認）。
- 分析: GA4 は据え置き。
- KV/R2: OpenNext のキャッシュ用に R2 を使えるが、ISR をほぼ使っていないため当面不要。

## 4. コスト比較（概算）

**現行は確定: Supabase $20 + Vercel $20 = 約 $40/月。**
**開発者の見立て**: 「Cloudflare はフロント無料、バックエンドも $20/月 未満」。この見立てが成り立つ条件と崩れる条件を、コードの構造から整理する。

### 4.1 コストを決める構造（§2「ページの動的性」）

1表示あたり「メンバー数 N × (Substack RSS fetch + D1 クエリ2)」と、N 件の RSS XML パースの CPU がかかる。N は数十〜百人規模（要確認）。
- **サブリクエスト**: 1表示で N 件超。上限は 1 呼び出しあたり Free 50 / Paid 10,000（公式 limits ページ）。Free では N が数十で壊れる。Paid では当面起きない。
- **CPU 時間**: Workers Free は 10ms/リクエスト（Paid は既定 30 秒、`cpu_ms` で最大 5 分）。数十件の RSS パース＋SSR が収まる見込みは低い（**要実測**）。
- **D1 rows read**（走査した行数で数える）: インデックスあり = N × (その人の articles 行数 + 1)。**なし = N × articles 全件**。例: N=100・articles 5,000 件（仮置き）なら 1表示 50 万行で、Free の 5M/日は 1日10表示で尽き、Paid の 25B/月込みも約 5 万表示/月で超える（超過 $0.001/百万行、10 万表示/月で約 $25 増）。差分表 #14 のインデックスで防ぐ。公式値（pricing ページ）: Free 5M 読み/日・100k 書き/日・5GB、Paid 25B 読み/月・50M 書き/月込み、超過 読み $0.001/百万行・書き $1/百万行。
- 改善余地: `fetchAllFeedsCached` が既存の `getArticlesForMembers`（一括取得）を使えば D1 クエリは 2N → 2 に減らせる。表示時に RSS を取らず cron 結果（articles）だけで描画すれば、サブリクエストと CPU が激減する（挙動変更なので別 Issue で判断）。

### 4.2 比較表

| 構成 | 月額の目安 | 見立てとの関係 |
|---|---|---|
| 現状（Vercel + Supabase） | **$40（確定）** | - |
| Workers Free + D1 Free | $0 | CPU 10ms/リクエストと subrequest 上限に収まる場合のみ。現構造では**収まらない可能性が高い**（要実測） |
| Workers Paid + D1 | **$5〜（Paid 最低）** + 従量 | Workers Paid は $5/月（1,000万リクエスト・3,000万 CPU ms 込み、超過 $0.30/百万リクエスト）。D1 は Paid で 25B 読み/月・50M 書き/月込み。インデックスありなら小規模は込みの範囲に収まる見込み（なしだと崩れる、§4.1）。→ **見立て（< $20）は成り立つ見込み** |
| + Browser Rendering（OG を A 案にする場合のみ） | Paid に 10 時間/月込み、超過 $0.09/時間 | B1 採用なら不要 |
| + メール送信 | Resend 無料枠等（**要確認**） | Magic Link は少量 |

### 4.3 見立てが崩れる条件

- 表示ごとの RSS 取得で Paid の CPU 込み量（3,000万 ms/月）を超える: 1表示 50ms と仮定すると月 60 万表示で到達。通常は超えない見込みだが実測しないと分からない。
- subrequest 上限でページが壊れる（メンバー増加）: Free（50）では N が数十で起きる。Paid（10,000）では当面起きない。起きた場合は費用ではなく設計変更（上の改善余地）が必要。
- **D1 のインデックスを張り忘れて全件スキャンになる**（差分表 #14）: rows read が桁違いに増え、Paid 込み量を超えて D1 だけで数十ドル増えうる。
- （OG を A 案にした場合のみ）OG 撮影が頻繁に再実行され、Browser Rendering が込み 10 時間を超える。

結論: **「$20 未満」は Workers Paid $5 + 従量でほぼ確実。「フロント無料（Free）」は現構造では厳しい**。フェーズ1 の完了条件に実測を入れる（§5）。

## 5. 段階的な移行フェーズとロールバック

D1 への移行を前提とする。**確定（#18）: 現行環境（Vercel）は既に完全停止しており、並行稼働も切り戻しも無い**。期限は 11/10（できれば 11/8 中）。フェーズ3〜6 は短縮して進め、旧環境側のロールバック欄は適用しない。バックアップ（`pg_dump`）の取得だけは必須。

| フェーズ | 内容 | 完了条件 | ロールバック |
|---|---|---|---|
| 0. 実態調査 | 使用量（メンバー数、articles 件数、月間 PV）確認、判断事項（UAT #16）の確定、Cloudflare アカウント準備 | Auth 方式・クエリ層が決まる | 不要 |
| 1. PoC | 別ブランチで OpenNext（と vinext）ビルド、`wrangler dev` / preview。D1（dev）にスキーマ投入、Auth 候補で Magic Link ログイン、middleware、Server Actions、`next/og` を確認。**計測**: 1表示あたりの CPU ms・サブリクエスト数・D1 rows read（クエリ結果の `meta.rows_read` で測る。インデックス有無の両方）、Worker サイズ。`next/og`（`ImageResponse`）が Workers で動くことの確認 | 計測値が §4 の前提を満たし、GO/NO-GO を docs に追記 | ブランチ破棄のみ |
| 2. アプリ移植 | クエリ層を D1 向けに書き換え、Auth 置換、Vercel 固有 env の除去、cron の `scheduled` 化、OG は既存 `fallbackImage()` に一本化し `playwright-core` / `@sparticuz/chromium` と `vercel.json` の `/api/og` 設定を撤去（phase0 文書 §3 の B1）、`wrangler.jsonc`・CI 追加。**別 PR に小分け**。RLS 廃止分の認可テスト（§3.2）を同時に追加 | preview URL で E2E 合格、認可テスト全通過 | ブランチ破棄のみ（旧環境は停止済み） |
| 3. ステージング | `*.workers.dev` で、本番データのコピーを入れた D1 で確認。Magic Link の到達性を確認 | 手動 UAT 合格 | URL を使わなくなるだけ |
| 4. DNS（2段階） | §5.1。**4-1（zone 移管）は先行してよいが、4-2（Custom Domain 割当）はフェーズ5 の突き合わせ（§6 手順7）後** | 各段階で正常 | §5.1 |
| 5. データ移行とカットオーバー | §6（D1 移行は必須工程） | 件数・整合性一致 | なし（再投入で直す。§6.5） |
| 6. 旧環境撤去 | 突き合わせ完了後に Supabase 等を解約。解約前に `pg_dump` を保管 | 請求が下がったことを確認 | バックアップから復元 |

Vercel は停止済みのため cron の二重実行は起きない（Cron Triggers だけ有効にする）。

### 5.1 DNS 切替（2段階）

Workers の Custom Domain は Cloudflare の zone にあるドメインにしか割り当てられない。`keep-substack.com` はレジストラでネームサーバを Cloudflare に変える作業になり、NS の委譲は TLD 側の TTL に従うため「TTL を短縮すれば数分で戻せる」は成り立たない。そこで分ける。

1. **zone 移管**: Cloudflare に zone を作り、取り込んだ DNS レコードは**今の Vercel 向けのまま**にしてネームサーバを切り替える。この段階でサービスの挙動は変わらない。ネームサーバ変更は戻しにくい前提で、余裕を持って実施する。
2. **Custom Domain 割当**: 安定してから Worker に Custom Domain を割り当てる。既存の CNAME があるホスト名には作れないので、そのレコードを先に外す手順を用意する。**この段階は §6 手順7（突き合わせ）の完了後に行う**（空の D1 のアプリを本番ドメインで公開しない）。戻し先は無い（Vercel は停止済み）。Custom Domain の不具合は Worker 側を直して対応する。
- Magic Link のリンク先（Redirect URL）は、切替前に新旧両方を許可しておく。

## 6. データ移行とカットオーバー手順（D1・時系列）

データ規模は小さい（7テーブル、`articles` が最大）。件数は要確認。

1. **告知**: 再ログインが必要になることとメンテ時間を利用者に告知。
2. **バックアップ**: 本番（prod=xolhjcngrwwwqtklmoyk）の `pg_dump` を取得し、安全な場所に保管。
3. ~~凍結~~: 旧環境が停止済みで書き込みは発生しないため不要。
4. **export**: 各テーブルを SELECT して JSON/CSV に出す。`pg_dump --data-only` の出力は D1 にそのまま入らないため、変換スクリプトを使う。`auth.users` は service_role の Admin API、または SQL Editor で SELECT して取り出す（`id`, `email`, `created_at`, `email_confirmed_at`, **`role`**）。
5. **変換**: UUID → TEXT（値は保持）、TIMESTAMPTZ → UTC ISO8601 `Z` 付き TEXT（§3.2 #2）、JSONB → TEXT、BOOLEAN → 0/1。`INSERT` 文を生成。D1 の1回あたりの文・サイズ上限は**要確認**なので分割して投入する。
6. **投入**: `wrangler d1 migrations apply`（スキーマ）→ `wrangler d1 execute --file`（データ）。順序は FK に従う（Auth の user 表 → `members` → `teams` → `member_teams` / `articles` / `member_publications` / `member_commit_slots` / `note_comments`）。user 表へは `id` を保持して投入し（`members.user_id` が参照するため最初。順が崩れる場合は `PRAGMA defer_foreign_keys = on`）、**`role='admin'` を新 admin 判定に反映**する。
7. **突き合わせ**: 各テーブルの件数、主キー集合、`articles.link` の一意性、admin ユーザーが `/admin` に入れること、`members.user_id` の参照先が全て存在することを確認。差分があれば中止せず、D1 を空にして変換・再投入する（スクリプトは冪等にする）。
8. **切替**: 手順7 の完了後に、§5.1 段階2 の Custom Domain を割り当て、Cron Triggers を有効化。

### 6.5 切り戻しの扱い

**確定（#18）: 切り戻しなし**。現行環境が完全停止中のため、切替後の書き込み分を旧 Supabase に戻す逆変換スクリプトも、切り戻し期限も作らない。データ損失への備えは次の2点:
- 投入前に `pg_dump` と付録 A の SQL 結果を保管する（Supabase が一時停止中なら先に再開して取得。停止しているのが何かは要確認）。
- 突き合わせで差分が出たら D1 を作り直して再投入する。

## 7. リスク

| リスク | 影響 | 対策 |
|---|---|---|
| OpenNext/vinext と Next 16.4 / middleware / Server Actions の非互換 | 移植不能 | フェーズ1 の PoC で GO/NO-GO。NO-GO の場合、Workers 化を取りやめて別ホスティング（Vercel Pro 再開など）で一時復旧するかは**要判断**（開発者、UAT #16）。旧環境は停止中で自動の逃げ道は無い |
| 表示ごとの全メンバー RSS fetch が CPU/subrequest 上限に当たる | 表示失敗、有料化 | PoC で計測。`getArticlesForMembers` 利用や cron 結果のみで描画する設計変更を検討 |
| B1 で個別の草が OG に出ない | SNS シェア画像が全 view 共通になる | UAT で許容を確認。不可なら B2（Satori で描き直し）→ A（撮影）の順で足す（phase0 文書 §3） |
| Auth 置換でログイン不能・管理者が入れない | 運用停止 | `role` を移行手順に含め、`pg_dump` と突き合わせて admin ログインを確認 |
| Magic Link メール到達性の悪化 | ログイン不能 | SPF/DKIM/DMARC、ステージングで到達確認 |
| RLS 喪失による認可漏れ | データ漏えい・改ざん | §3.2 の認可一覧どおり実装し、各行にテストを追加 |
| SQLite 化で型・時刻形式が崩れ、並べ替えや鮮度判定が壊れる | 表示不整合 | 時刻は UTC ISO8601 `Z` 付きに固定、変換後に突き合わせ |
| DNS 切替の不整合 | 一時的に停止 | §5.1 の2段階化、Redirect URL に新旧を併記 |
| cron の subrequest/実行時間上限 | 一部メンバー未更新 | 件数が上限に近づいたら分割。`allSettled` の失敗件数をログ化 |
| Vercel 固有 env 依存の取りこぼし | 誤った OG ホスト判定 | `grep VERCEL src` で全洗い出し |
| 不可逆な移行でのデータ破損 | 最悪データ喪失 | `pg_dump` 保管、冪等な再投入スクリプト、突合手順（切り戻しなし） |

## 8. 確定事項（旧: 未決事項）

確定: 現行月額 $40、DB は D1、Auth は Better Auth（#15）。クエリ層は Drizzle。以下は #18 の開発者回答（2026-11-07）で確定。詳細は `docs/cloudflare-phase0-decisions.md`。
1. 月額上限: $20 未満。
2. D1 クエリ層: Drizzle（PoC #19 で不可なら素の SQL）。
3. OG 画像: 簡素化（既存フォールバックで先行）。
4. 期限: 11/10 まで（できれば 11/8 中）。切り戻しなし。
5. `keep-substack.com` の NS 移管: 11/7 中に開発者が実施。

## 9. 次のアクション

- フェーズ1（PoC）は #19 に着手する。

## 参考（公式ドキュメント）

- Workers 料金: https://developers.cloudflare.com/workers/platform/pricing/
- Browser Run: https://developers.cloudflare.com/browser-run/
- D1 料金: https://developers.cloudflare.com/d1/platform/pricing/
- OpenNext Cloudflare: https://opennext.js.org/cloudflare
- Vercel から Workers への移行: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/
- Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
