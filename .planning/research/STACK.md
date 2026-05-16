# Stack Research: v1.5

**Project:** keep-substack
**Researched:** 2026-05-16
**Scope:** Redis→Supabase移行 + Auth追加に必要な新規依存関係

> 注: v1.1〜v1.4の既存スタック（Next.js 16.2.6 / React 19.2.4 / rss-parser / Tailwind CSS 4）は変更なし。本ドキュメントはv1.5で**追加・変更・削除するもの**のみ記載する。

---

## New Dependencies

| Package | Version | Purpose | Confidence |
|---------|---------|---------|-----------|
| `@supabase/supabase-js` | `^2.105.4` | Supabase クライアント（DB操作・Auth） | HIGH — npm確認済み（2026-05-16） |
| `@supabase/ssr` | `^0.10.3` | Next.js App Router / SSR向けサーバーサイドクライアント（Session管理をCookieで実現） | HIGH — npm確認済み、Context7で統合例確認済み |

**追加しない関連パッケージ:**
- `@supabase/auth-helpers-nextjs` — **非推奨**。現行の正式代替は `@supabase/ssr`。

---

## Changes / Removals

### 削除

| Package | 理由 |
|---------|------|
| `@upstash/redis` | Supabase PostgreSQLへ完全移行するため不要になる |

### 変更なし（継続使用）

| Package | 理由 |
|---------|------|
| `next 16.2.6` | 変更なし |
| `rss-parser ^3.13.0` | RSSフィード取得は継続 |
| `tailwindcss ^4` | UIはそのまま |
| `react 19.2.4` | 変更なし |

---

## Key Integration Notes

### Next.js App Router との統合

`@supabase/ssr` の `createServerClient` を用途別に使い分ける（Context7確認済みパターン）。

**Server Component:**
```typescript
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const cookieStore = await cookies()
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // setAll は Server Componentから呼べないため省略
    }
  }
)
```

**Route Handler / Server Action:**
- `getAll` + `setAll` の両方を実装する。

**Middleware（既存 `middleware.ts` の拡張）:**
- 現在のBasic Auth（`/admin`保護）は**そのまま維持**する。
- メンバー自己管理ページ（例: `/profile`）にはSupabase Authのセッション確認を追加。
- `createServerClient` でセッションリフレッシュ → 未ログイン時はログインページへリダイレクト。

**環境変数（Vercel側で設定）:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```
Vercel + Supabase Integration を使うと環境変数が自動設定される（推奨）。

---

### Supabase Auth の方針

**ログイン方式: Magic Link（OTP）を採用**

- パスワードUI不要 → KISS原則に合致
- 実装: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
- `shouldCreateUser: false` = 管理者が事前に登録したメンバーのみログイン可
- メールアドレスは `members` テーブルの `email` カラムと紐付けて権限確認する

---

### Vercel デプロイ上の注意点

- Supabase Free Tier: PostgreSQL直接接続 **最大60接続**、Supavisor（接続プーラー）経由で **最大200クライアント接続**
- Vercel Serverless Functions は接続を持続しないため、必ず **Supavisor の Transaction Mode（port 6543）** を使う
- `@supabase/supabase-js` はデフォルトでSupavisor接続URLを使う設定のため**追加設定不要**
- 現在の規模（50フィード・少人数コミュニティ）ではFree Tierで問題ない
- Vercel Cron（既存）: Route Handler内で `createClient`（service role key）を使ってCron処理可能

---

### データスキーマ（移行後の PostgreSQL）

既存のKVデータ構造をそのままPostgreSQLテーブルに変換する。

**`members` テーブル（既存 `redis.get('members')` の代替）:**
```sql
create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  substack_id text not null unique,
  team_names text[] not null default '{}',
  added_at timestamptz not null default now(),
  email text,         -- Supabase Auth との紐付け用（null許容: 管理者追加分）
  image_url text      -- アイコンURL（既存 StoredFeed.imageUrl の代替）
);
```

**`articles` テーブル（既存 `articles:{substackId}` KVキーの代替）:**
```sql
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  substack_id text not null references public.members(substack_id) on delete cascade,
  title text,
  link text not null unique,   -- dedupeキー（既存KVと同ロジック）
  pub_date timestamptz,
  thumbnail text,
  saved_at timestamptz not null default now()
);
create index on public.articles(substack_id, pub_date desc);
```

---

### 移行アプローチ: Redis → Supabase

**関数シグネチャ保持方針（v1.3踏襲）:**
既存の `getMembers()` / `addMember()` / `deleteMember()` / `updateMember()` / `getArticles()` / `saveArticles()` / `deleteArticles()` のシグネチャは変更しない。内部実装のみSupabaseに差し替える。`page.tsx` や `admin/actions.ts` の呼び出し元はゼロ変更で済む。

**ステップ概要:**
1. Supabase プロジェクト作成 → テーブル定義 → RLS ポリシー設定
2. `src/lib/redis.ts` → `src/lib/supabase.ts`（Supabaseクライアント初期化）に置き換え
3. `src/lib/kvMembers.ts` → `src/lib/dbMembers.ts`（同シグネチャで内部実装差し替え）
4. `src/lib/kvArticles.ts` → `src/lib/dbArticles.ts`（同シグネチャで内部実装差し替え）
5. 既存Redisからデータを移行する一回限りのスクリプトを実行
6. Vercel環境変数から `UPSTASH_REDIS_*` を削除し、`NEXT_PUBLIC_SUPABASE_*` を設定

---

## What NOT to Add

| 除外対象 | 理由（YAGNI） |
|----------|--------------|
| `Prisma` / `Drizzle` ORM | Supabase JS Clientで十分。ORMは学習コストとボイラープレートが増える |
| `@supabase/auth-helpers-nextjs` | 非推奨パッケージ。`@supabase/ssr` で完全代替済み |
| `react-hook-form` | チェックボックスUIはネイティブフォーム + Server Actionsで対応可能 |
| `zod` | Server Action内の簡易バリデーションで十分（現行踏襲）。型安全はTypeScriptで確保 |
| `@tanstack/react-query` | データフェッチはServer Component + Server Actionsで完結。クライアントキャッシュ不要 |
| `supabase` CLI（npm依存） | ローカルマイグレーション管理はSupabase Dashboardで代替可（小規模プロジェクト）。必要ならグローバルインストールで対応 |
| Real-time subscriptions | Vercel Serverless環境でWebSocket持続は困難。ISR+Cronの既存方式を維持する |
| `pg` / `postgres` 直接接続 | Supabase JS Clientが抽象化済み。生のPostgres接続は不要 |
| Supabase Storage | 画像は外部URL参照のまま（Substack CDN）で十分。YAGNI |

---

## Installation (新規パッケージのみ)

```bash
npm install @supabase/supabase-js @supabase/ssr
npm uninstall @upstash/redis
```

---

## Confidence Assessment

| 決定事項 | 信頼度 | 根拠 |
|----------|--------|------|
| `@supabase/supabase-js` v2.105.4 | HIGH | npm直接確認済み（2026-05-16）|
| `@supabase/ssr` v0.10.3 | HIGH | npm直接確認済み、Context7でApp Router統合例確認 |
| Magic Link認証方式 | HIGH | Supabase公式ドキュメント・Context7確認済み |
| Supavisor Transaction Mode | HIGH | Supabase公式ドキュメント確認済み、Free Tier制限も確認 |
| スキーマ設計（テーブル構造） | MEDIUM | 既存KV構造の移植のため実績あり。RLSポリシーは実装時に詳細設計要 |

---

## Sources

- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.105.4（2026-05-16確認）
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) — v0.10.3（2026-05-16確認）
- [Supabase SSR Context7ドキュメント](https://context7.com/supabase/ssr/llms.txt) — Next.js App Router統合パターン（HIGH confidence）
- [Supabase Auth Magic Link公式](https://supabase.com/docs/guides/auth/auth-email-passwordless) — signInWithOtp仕様
- [Supabase Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — Supavisor Transaction Mode
- [Vercel + Supabase Integration](https://supabase.com/blog/using-supabase-with-vercel) — Vercel環境変数自動設定
- [Supabase Free Tier Limits 2026](https://aiagencyplus.com/supabase-free-tier-limits/) — 接続数上限（60直接接続 / 200プーラー接続）
