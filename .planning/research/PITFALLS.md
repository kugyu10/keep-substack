# Pitfalls Research: v1.5

**Domain:** RSS feed activity visualization — v1.5 additions: Supabase migration + Auth + long-term history
**Researched:** 2026-05-16
**Scope:** Adding Supabase PostgreSQL, Supabase Auth, and long-term article cumulative storage to an existing Next.js 16 App Router / Vercel / Upstash Redis app.

---

## Migration Pitfalls (Redis → Supabase PostgreSQL)

### Pitfall M1: デュアルライト期間なしの一括切り替え（ダウンタイム発生）

- **Risk:** Upstash Redis → Supabase PostgreSQL を「一気に切り替える」と、デプロイ瞬間にデータが空になる。メンバーリストが消えたままISRキャッシュが古いデータを返し続け、一見動いているように見えるが再ビルドで全404になる。
- **Prevention:**
  1. Supabase テーブル（`members`, `articles`）を先に作成・データ投入する（Redis は削除しない）
  2. 読み取りを PostgreSQL に切り替えるPRをデプロイ（書き込みはまだ両方）
  3. 動作確認後、Redisへの書き込みを削除するPRをデプロイ
  4. Redis 環境変数を最後に削除
- **Phase:** Phase 1（DB移行）で必ず段階デプロイを採用する

### Pitfall M2: KV の JSON ブロブ構造がそのまま PostgreSQL に合わない

- **Risk:** 現在の `articles:{substackId}` キーは `{ items: FeedItem[], imageUrl?: string }` というJSONブロブをRedisに1キーで格納している。これを PostgreSQL に移行する際に `articles` テーブルを1行1記事の正規化構造にしようとすると、既存の `saveArticles`/`getArticles` 関数のシグネチャと完全に変わるため、呼び出し元（Cronルート、ISRフェッチ）を全て修正する必要がある。
- **Prevention:**
  - PostgreSQL スキーマは最初から正規化（`articles(id, substack_id, link, title, pub_date, image_url)`）で設計し、`link` に UNIQUE 制約を張る
  - `saveArticles` / `getArticles` の関数シグネチャ（インターフェース）を維持しつつ、内部実装だけ差し替える（現在の `fetchAllFeedsCached` シグネチャ維持の教訓と同じパターン）
- **Phase:** Phase 1 設計時に確定する

### Pitfall M3: Vercel Serverless + Supabase の接続枯渇

- **Risk:** Vercel サーバーレス関数はリクエストごとに新しいDB接続を開く。Supabase 無料枠のPostgres直接接続上限は **25〜30接続**。トラフィックスパイク時（ISR再生成 + Cron + 管理操作が同時）に `too many connections` エラーで全APIが停止する。開発・ステージング環境では再現しないため発見が遅れる。
- **Prevention:**
  - 必ず **Supavisor（トランザクションモード、ポート 6543）のConnection Pooling URL** を使う。直接接続URL（ポート 5432）は Cron や管理用途の永続接続のみ
  - `@supabase/supabase-js` の `createClient` はリクエストごとに生成せず、シングルトン（サーバー側モジュールスコープ）で管理する
  - `DATABASE_URL` ではなく Supabase ダッシュボードの "Transaction pooler" 接続文字列を環境変数に設定する
- **Detection:** Vercel ログに `PostgresError: sorry, too many clients already` が出始めたら赤信号
- **Phase:** Phase 1（DB設定）で接続文字列の種類を確定する

### Pitfall M4: generateStaticParams がマイグレーション直後に空を返す

- **Risk:** v1.1 の Pitfall V2 の PostgreSQL 版。`generateStaticParams` がビルド時に Supabase クエリを発行するが、Vercel ビルド環境の環境変数スコープに `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が設定されていないと空配列になり、全メンバーページが 404 になる。
- **Prevention:**
  - Vercel Project Settings → Environment Variables → **Build** スコープにも Supabase 環境変数を設定する
  - `generateStaticParams` で空配列が返ったときにビルドを明示的に失敗させるガード句を入れる
- **Phase:** Phase 1 デプロイ前に環境変数スコープを確認する

### Pitfall M5: 重複記事の扱い — Redis と PostgreSQL の dedup ロジック差異

- **Risk:** 現在の `saveArticles` は `article.link` の Set 差分でメモリ上 dedup している。PostgreSQL 移行後に `INSERT ON CONFLICT DO NOTHING` を使わずに単純 INSERT すると、Cron が毎日同じ記事を重複挿入して記事数が膨らむ。また、既存 Redis データを PostgreSQL にエクスポートする際に重複が混入しやすい。
- **Prevention:**
  - `articles` テーブルの `link` カラムに `UNIQUE` 制約を設定する
  - INSERT 時は `INSERT INTO articles (...) VALUES (...) ON CONFLICT (link) DO NOTHING` を使う
  - Redis からのエクスポートスクリプトも同じ UPSERT パターンで実行する
- **Phase:** Phase 1 スキーマ設計時に UNIQUE 制約を必ず含める

---

## Auth Pitfalls (Supabase Auth + Next.js)

### Pitfall A1: middleware.ts の二重管理 — BasicAuth と Supabase Auth の競合

- **Risk:** 現在の `middleware.ts` は `/admin` のみに BasicAuth をかけている（matcher: `['/admin', '/admin/:path*']`）。Supabase Auth を追加する際、公式ドキュメントの middleware サンプルは matcher を `/((?!_next/static|_next/image|favicon.ico).*)` という広域パターンにする。このパターンに書き換えると、Basic Auth ロジックが消えてしまうか、または両方が混在して無限 redirect ループが発生する。
- **Prevention:**
  - middleware.ts 内で `/admin` パスと非adminパスを明示的に分岐する
  - Supabase のセッション refresh（`updateSession`）は全パスで実行し、`/admin` に対してだけ Basic Auth チェックを追加するシンプルな合成構造にする
  - matcher は広域（Supabase Auth 推奨パターン）を採用し、内部でルートを分岐させる
  ```typescript
  // middleware.ts の構造例
  export async function middleware(request: NextRequest) {
    const response = await updateSession(request) // Supabase セッション refresh
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // Basic Auth チェック（既存ロジック維持）
    }
    return response
  }
  ```
- **Phase:** Phase 2（Auth 追加）で middleware リファクタを最初のタスクにする

### Pitfall A2: getSession() をサーバー側で信頼する — セキュリティホール

- **Risk:** `supabase.auth.getSession()` をサーバーコンポーネントや Server Action で呼び出してセッションを検証すると、クライアントから送られた Cookie を検証なしに信頼することになる。攻撃者は偽造 Cookie で認証済みのふりができる。
- **Prevention:**
  - サーバーサイドでのユーザー検証は **必ず `supabase.auth.getUser()`** を使う（Supabase Auth サーバーへのリモートリクエストを発行し JWT を再検証する）
  - `getSession()` はクライアントコンポーネントでのセッション存在確認に限定する
- **Detection:** `getSession()` が Server Component / Server Action に登場したらレビューで必ず指摘する
- **Phase:** Phase 2 全体を通じて守るルール

### Pitfall A3: ISR ページに auth セッション refresh が混入 → CDN セッション漏洩

- **Risk:** Supabase Auth のセッション refresh は `Set-Cookie` ヘッダーを応答に含める。もし ISR ページ（revalidate あり）でセッション refresh が起きると、その `Set-Cookie` を含んだレスポンスが Vercel Edge/CDN にキャッシュされ、次のユーザーがそのキャッシュを受け取って他人のセッションにログインしてしまう（セッション漏洩）。
- **Prevention:**
  - 公開ページ（`/`, `/member/[substackId]`）では絶対に Supabase Auth クライアントを使わない
  - 認証が必要なページには `export const dynamic = 'force-dynamic'` を設定する
  - Supabase SSR パッケージ v0.10.0+ は `Cache-Control: no-store` を自動で付与するが、**ISR と auth を同一ルートで混在させない** というアーキテクチャルールを守ることが根本的な防止策
- **Detection:** Vercel の Analytics でユーザー間でセッションが混在する症状（別のユーザーとしてログインされる）
- **Phase:** Phase 2 設計時に「認証ルート」と「ISRルート」を完全分離する決定を下す

### Pitfall A4: cookies() の同期/非同期 API — Next.js 15/16 の互換性問題

- **Risk:** Next.js 15 以降、`cookies()` は非同期 API（`await cookies()`）に移行中。`@supabase/ssr` の `createServerClient` が内部で `cookies()` を呼ぶ際に同期/非同期の扱いがバージョンによって異なり、`cookies() should be awaited` エラーが Turbopack 環境で不定期に発生する（GitHub Discussion #81445 でも未解決の報告あり）。
- **Prevention:**
  - `createServerClient` を呼ぶラッパー関数を async で定義し、`const cookieStore = await cookies()` を先に解決してから渡す
  - `@supabase/ssr` は現時点で最新版（v0.10+）を使う
  - Turbopack（`next dev --turbo`）で開発する場合は上記エラーの発生有無を必ず確認する
- **Phase:** Phase 2 の最初のスパイクで動作確認する

### Pitfall A5: Edge Runtime で Supabase クライアントが動作しない場合がある

- **Risk:** middleware.ts は Edge Runtime で動く。`@supabase/ssr` の `createServerClient` は Edge Runtime で動作するが、接続先が Supabase の REST API（HTTP）であるため問題ない。ただし、将来的に ORM（Prisma など）や Node.js 専用ライブラリを middleware に混入させると Edge Runtime が壊れる。
- **Prevention:**
  - middleware.ts には `@supabase/ssr` と Next.js の標準 API のみを使う
  - Node.js 専用の処理（DB クエリなど）は Route Handler や Server Action に移す
  - `export const runtime = 'edge'` を middleware に明示してビルド時の Edge 互換チェックを有効にする
- **Phase:** Phase 2 の middleware リファクタ時に確認する

---

## Long-term History Pitfalls

### Pitfall H1: Cron が毎日フルスキャン → 処理時間が Vercel 10秒上限を超える

- **Risk:** 現在の Cron（`/api/cron`）は全メンバーのRSSフィードを逐次フェッチして KV に保存する。メンバーが50人いると 50フィード × 平均200ms = 10秒。PostgreSQL への INSERT を追加すると SQLラウンドトリップが加わり、Vercel 無料枠のサーバーレス関数タイムアウト（**10秒**）を超えてタイムアウトする。
- **Prevention:**
  - Cron を Vercel Edge Function（タイムアウト 25秒→300秒）に切り替えるか、または Cron を `NEXT_PUBLIC_` ではなく Vercel Cron Jobs として定義してタイムアウト設定を拡張する
  - フィードフェッチを並列化する（`Promise.allSettled`）が、Supabase 無料枠の接続数に注意
  - フェッチは `MAX_DURATION = 60` を `route.ts` に設定する（Vercel Pro 相当が必要な場合は Hobby でどこまで設定できるか確認が必要）
- **Detection:** Vercel Functions ログに `FUNCTION_INVOCATION_TIMEOUT` が出たら即対応
- **Phase:** Phase 1（Cron の PostgreSQL 対応）で並列化とタイムアウトを同時に対処する

### Pitfall H2: 記事データが際限なく増加 → Supabase 無料枠 500MB DB ストレージ圧迫

- **Risk:** Supabase 無料枠のDB ストレージは **500MB**。1記事あたり平均1〜2KBとして、50メンバー × 3年分 × 週2本 = 50 × 156週 × 2 ≈ 15,600行。テキストデータのみなら容量問題は当面ないが、画像URL・本文抜粋を含めると膨らむ。より現実的な問題はインデックスサイズ増加によるクエリ速度低下。
- **Prevention:**
  - `articles` テーブルに保存するのは `link`（UNIQUE）, `substack_id`, `title`, `pub_date`, `image_url` の最小カラムのみ。本文は保存しない
  - 定期的に古い記事（例: 3年以上前）を `archived_articles` テーブルに移動するか削除する POLICY を将来的に追加できるよう設計する
  - Supabase ダッシュボードでストレージ使用量を月次モニタリングする
- **Phase:** Phase 1 スキーマ設計で保存カラムを最小化する

### Pitfall H3: Redis からのデータエクスポートで文字化けや型不一致が発生する

- **Risk:** Upstash Redis は `@upstash/redis` の自動シリアライズ（JSON）で保存している。エクスポートスクリプトで `redis.get('members')` を直接呼んで JSON を取り出す場合、`teamNames` が `string[]` である保証がない（旧フォーマットは `teamName: string` 単体）。PostgreSQL に INSERT する際に型不一致でエラーが出るか、サイレントに NULL が入る。
- **Prevention:**
  - エクスポートスクリプトに `kvMembers.ts` の既存の後方互換フォールバックロジック（`m.teamNames ?? (m.teamName ? [m.teamName] : [])`）を必ず含める
  - エクスポート後の PostgreSQL データを全件 SELECT して目視確認する手順を Migration runbook に含める
  - エクスポートは本番環境へのデプロイ前日に staging/dev Supabase プロジェクトで一度テストする
- **Phase:** Phase 1 マイグレーション実行手順に含める

### Pitfall H4: メンバー削除時に記事データの孤立レコードが残る

- **Risk:** PostgreSQL に移行すると `members` テーブルと `articles` テーブルが外部キーで結べる。しかし外部キー制約なしで実装すると、メンバー削除時に `articles` テーブルに孤立した記事が残り続ける。ストレージ圧迫とクエリ結果の不整合が生じる。
- **Prevention:**
  - `articles.substack_id` に `REFERENCES members(substack_id) ON DELETE CASCADE` を設定する
  - または最低限、`deleteMember` に相当する PostgreSQL トランザクションで記事削除を同時実行する
- **Phase:** Phase 1 スキーマ設計時に CASCADE 設定を含める

---

## Vercel Free Tier Constraints

### Supabase 無料枠の制限

| リソース | 無料枠上限 | v1.5 想定使用量 | 判定 |
|---------|-----------|----------------|------|
| DB ストレージ | 500 MB | 〜数MB（テキストのみ） | 余裕あり |
| 月次アクティブユーザー (MAU) | 50,000 | 少人数コミュニティ | 余裕あり |
| ファイルストレージ | 1 GB | 使用しない | 該当なし |
| DB 接続（直接） | 最大 25〜30 | Cron + ISR で集中する可能性あり | 要 Pooler 必須 |
| **プロジェクト一時停止** | **7日間アクティビティなしで停止** | Cron が毎日動けば回避可能 | 要確認 |
| 同時 Realtime 接続 | 200 | 使用しない | 該当なし |

**最重要制約: 7日間非アクティブで自動停止**

- Supabase 無料プロジェクトは DB クエリが 7日間発生しないと自動的に一時停止される
- ダッシュボードへのアクセスはカウントされない（DB クエリが必要）
- Vercel Cron Job（毎日のRSS取得）が PostgreSQL にも書き込んでいれば自動的に回避できる
- Cron が止まった場合（メンバー0人でスキップなど）は GitHub Actions などの外部 ping を設定する

### Vercel 無料枠（Hobby）の制限

| リソース | 制限 | v1.5 への影響 |
|---------|------|--------------|
| サーバーレス関数タイムアウト | **10秒** | Cron でフルフェッチ（50人）が超過リスクあり |
| Edge Function タイムアウト | 25秒（ストリーミング継続は最大300秒） | middleware は Edge — 問題なし |
| Cron Job 実行回数 | 1件/日（Hobby）| 毎日1回のCronで十分 |
| 関数のメモリ | 1024 MB | 問題なし |
| ビルド時間 | 45分 | 問題なし |

### Connection Pooling の必須設定

Vercel サーバーレス関数から Supabase に接続する際は以下のURLを使い分ける:

| 用途 | 接続先 | ポート | 理由 |
|------|-------|-------|------|
| Vercel サーバーレス関数（ISR, API Routes, Server Actions） | Supabase Supavisor（Transaction モード）| **6543** | 接続を pooling して枯渇防止 |
| Vercel Cron Job（長時間トランザクション） | Supabase Supavisor（Session モード）or 直接 | 5432 | prepared statement が必要な場合 |
| ローカル開発 | 直接接続 | 5432 | 問題なし |

環境変数の使い分け:
```bash
# サーバーレス関数用（Transaction Pooler）
DATABASE_URL=postgresql://postgres:[password]@[project].supabase.co:6543/postgres?pgbouncer=true

# Cron / マイグレーション用（直接または Session Pooler）
DATABASE_URL_UNPOOLED=postgresql://postgres:[password]@[project].supabase.co:5432/postgres
```

---

## Phase-Specific Warnings

| フェーズトピック | 重大なピットフォール | 対策 |
|---------------|------------------|------|
| DB スキーマ設計 | M2: JSONブロブ構造がPostgreSQLに合わない | 正規化スキーマ + UNIQUE制約を最初に確定 |
| DB スキーマ設計 | M5: dedup ロジック差異 | `link` カラムに UNIQUE 制約 + ON CONFLICT DO NOTHING |
| DB スキーマ設計 | H4: 孤立記事レコード | `ON DELETE CASCADE` 外部キー設定 |
| マイグレーション実行 | M1: 一括切り替えダウンタイム | 段階デプロイ（読み取り先切替→書き込み先切替の順） |
| マイグレーション実行 | M3: 接続枯渇 | Transaction Pooler URL（ポート6543）を設定 |
| マイグレーション実行 | M4: generateStaticParams が空 | Vercel Build スコープの環境変数設定 |
| マイグレーション実行 | H3: エクスポートの型不一致 | 後方互換フォールバックロジックをスクリプトに含める |
| Auth 追加 | A1: middleware競合 | middleware内でルート分岐（BasicAuth + Supabase Auth を合成） |
| Auth 追加 | A3: ISR+Auth → セッション漏洩 | 認証ルートとISRルートを完全分離 |
| Auth 追加 | A2: getSession() サーバー使用 | サーバー側では必ず getUser() を使う |
| Cron 更新 | H1: タイムアウト | 並列フェッチ + maxDuration 設定を確認 |
| Supabase 運用 | 7日間停止 | Cron がDB書き込みしていれば自然に回避できる |
| 接続管理 | M3: 接続枯渇 | Transaction Pooler URL を環境変数に設定 |

---

## Sources

- [Supabase Docs: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware セットアップ、getUser() vs getSession() の注意点
- [Supabase Docs: Troubleshooting Next.js Auth Issues](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) — ISR キャッシュ漏洩、CDN セッション問題
- [Supabase Docs: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) — Supavisor, Transaction Mode, ポート 6543
- [Supabase Pricing](https://supabase.com/pricing) — 無料枠: DB 500MB, MAU 50K, 7日間停止ルール
- [Supabase: Getting max connection reached using Supavisor (Discussion #18986)](https://github.com/orgs/supabase/discussions/18986) — 接続枯渇の実例
- [Vercel: Supabase Connection Pooling with PgBouncer (iloveblogs.blog)](https://www.iloveblogs.blog/guides/supabase-connection-pooling-vercel) — Vercel + Supabase 接続プールのベストプラクティス
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — Hobby タイムアウト 10秒, Edge 25秒
- [GitHub: Unsolvable cookies() should be awaited Error with Next.js + Supabase SSR (Discussion #81445)](https://github.com/vercel/next.js/discussions/81445) — Next.js 15/16 + @supabase/ssr の非同期 cookies() 問題
- [Supabase GitHub Discussion: Interaction between Supabase and Next.js middleware + PPR (#21656)](https://github.com/orgs/supabase/discussions/21656) — middleware と PPR の競合
- [Prevent Supabase Free Tier Pausing (Medium)](https://shadhujan.medium.com/how-to-keep-supabase-free-tier-projects-active-d60fd4a17263) — 7日間停止の回避策
- [PostgreSQL Upsert: INSERT ON CONFLICT Guide (dbvis.com)](https://www.dbvis.com/thetable/postgresql-upsert-insert-on-conflict-guide/) — ON CONFLICT DO NOTHING による dedup
- PROJECT.md — 既存システム構成・制約・設計決定の一覧

---

## v1.1 以前のピットフォール（引き続き有効）

v1.5 でも以下の v1.1 ピットフォールは引き続き適用される:

| ピットフォール | 引き続き有効 | v1.5 での備考 |
|-------------|------------|--------------|
| V3: CVE-2025-29927 ミドルウェアバイパス | YES | Next.js 16.2.6 で修正済み。middleware リファクタ時にバージョンを確認する |
| V4: matcher が広すぎて静的アセットに認証がかかる | YES | Supabase Auth 追加時に matcher を広域に変更するため再確認必須 |
| V5: force-static の誤削除 | YES | 認証ルートを追加する際に公開ページの force-static を誤って削除しやすい |
| V6: unstable_cache タグの非無効化 | YES | PostgreSQL 書き込み後も revalidateTag('feeds') を呼ぶ |
