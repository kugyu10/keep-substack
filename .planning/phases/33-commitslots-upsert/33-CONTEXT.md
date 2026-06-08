# Phase 33: バグ修正 + commitSlots upsert化 - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Magic Link 認証後のリダイレクト欠落・非ログイン時の /my アクセス制御・commitSlots の非アトミック保存の3問題を修正する。新規メンバー追加時の RSS 取得（BUG-01）は実装済み確認によりスキップ。

**スコープ in:**
- middleware.ts 新規作成による /my の認証ガード
- auth/callback の next パラメータ有効化（ログイン後に元ページへ戻る）
- /login ページへの next クエリパラメータ対応
- commitSlots 保存を Supabase RPC でアトミック化

**スコープ out:**
- ログアウト後リダイレクト先（/ のまま変更なし）
- /admin, /signin-xxx の保護（現状の秘匿方式を維持）
- RSS サムネ空上書き問題（将来フェーズ defer）

</domain>

<decisions>
## Implementation Decisions

### BUG-01: RSS取得バグ
- **D-01:** `addMemberAction` は既に `fetchWithRetry → saveArticles` を実装済み。BUG-01 は解決済みとして本フェーズではスキップする
- **D-02 (defer):** RSS 取得失敗時にサムネが空で上書きされる問題は、スクレイピング修正が必要なため将来フェーズへ defer

### BUG-02: 認証フロー修正
- **D-03:** `middleware.ts` を `src/middleware.ts` として新規作成
  - Matcher: `/my` と `/my/:path*` のみ（将来の protected pages 追加を想定した構造に）
  - `/admin`, `/signin-*` は matcher に含めない（別保護・秘匿のまま）
  - Supabase SSR の `updateSession` パターンと統合（セッション更新 + 認証ガード両立）
- **D-04:** 非ログイン時のリダイレクト: `/login?next=<currentPath>`
  - Open Redirect 防止: `next` は内部パス（`/` 始まり、`//` 非始まり）のみ許可
- **D-05:** `next` パラメータの end-to-end フロー
  1. `middleware.ts` が `/login?next=/my` へリダイレクト
  2. `/login/page.tsx` が `searchParams.next` を読み取り hidden input で保持
  3. `sendMagicLinkAction` が `callbackUrl = ${origin}/auth/callback?next=${next}` を構築
  4. `/auth/callback/route.ts` の `next` 変数を `NextResponse.redirect(new URL(next, origin))` に使用（現在ハードコード `/my` → 修正）
- **D-06:** ログアウト後リダイレクト先は `/` のまま変更なし（`signOutAction` はそのまま）

### DB-01: commitSlots アトミック保存
- **D-07:** Supabase RPC 関数 `replace_member_commit_slots(p_member_id UUID, p_slots JSONB)` を作成
  - SQL トランザクション内で `DELETE` → `INSERT` を実行（完全アトミック）
  - `p_slots` が空配列の場合: `DELETE ALL` のみ（全コミット定日解除を許可）
  - `p_slots` が非空の場合: `DELETE` + `INSERT` をトランザクションで実行
- **D-08:** 関数定義を `supabase/schema.sql` + 新規 migration ファイル（`supabase/migrations/YYYYMMDDHHMMSS_add_replace_member_commit_slots_rpc.sql`）の両方に追加
- **D-09:** `updateCommitSlotsAction` を `admin.rpc('replace_member_commit_slots', { p_member_id: member.id, p_slots: slots })` 呼び出しに変更。既存のバリデーション・auth チェックは維持。

### Folded Todos
- **"auth/callback の next パラメータを有効化する"** → D-04/D-05 に吸収
- **"updateCommitSlotsAction を upsert に置き換える"** → D-07〜D-09 に吸収（upsert ではなく RPC アトミック実装に変更）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル
- `src/app/my/actions.ts` — `updateCommitSlotsAction` (D-09 変更対象: RPC 呼び出しに置換)
- `src/app/auth/callback/route.ts` — D-05 の step 4: `next` 変数をリダイレクトに使用
- `src/app/login/actions.ts` — `sendMagicLinkAction` (D-05 step 3: callbackUrl に `?next=` 付与)
- `src/app/login/page.tsx` — D-05 step 2: `searchParams.next` を読んで hidden input 化
- `supabase/schema.sql` — D-08: RPC 関数定義追加対象

### 新規作成
- `src/middleware.ts` — D-03/D-04: 認証ガード middleware（Supabase SSR 統合）

### 変更なし確認
- `src/lib/authActions.ts` — `signOutAction` は `/` リダイレクトのまま（D-06）
- `src/app/admin/actions.ts` — `addMemberAction` の RSS fetch は解決済み（D-01）

### 要件定義
- `.planning/REQUIREMENTS.md` — BUG-01（スキップ）, BUG-02（D-03〜D-06）, DB-01（D-07〜D-09）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`): RLS バイパスクライアント。`updateCommitSlotsAction` の RPC 呼び出しにそのまま使用
- `createSupabaseServerClient()` (`src/lib/supabase/server.ts`): middleware でのセッション更新に使用（Supabase SSR の `updateSession` パターン）
- `member_commit_slots` テーブル: `UNIQUE (member_id, day_of_week)` 制約あり（Phase 32 で本番 DB 適用済み）

### Established Patterns
- `admin.from('table').rpc(...)` パターン: 既存コードで `.rpc()` は未使用だが `@supabase/supabase-js` でサポート済み
- Open Redirect 防止: `next.startsWith('/') && !next.startsWith('//')` チェック — Phase 31 の `auth/callback` で確立されたパターン（D-04 で同じロジックを適用）
- Supabase SSR middleware パターン: `@supabase/ssr` の `createServerClient` + cookies を使う標準実装。公式ドキュメント参照要

### Integration Points
- `middleware.ts` ↔ `src/app/login/page.tsx`: middleware が `/login?next=...` にリダイレクト → page が `searchParams` から読取
- `sendMagicLinkAction` ↔ `/auth/callback`: callbackUrl に `?next=` を付与 → callback が受信して使用
- RPC 関数 `replace_member_commit_slots` ↔ `updateCommitSlotsAction`: TypeScript から `admin.rpc()` で呼び出し

</code_context>

<specifics>
## Specific Notes

- middleware.ts は現在 `src/` 以下に存在しない（git 管理外）。新規作成が必要
- Supabase SSR + Next.js App Router の middleware パターン: セッション更新を行いつつ認証ガードも実装する公式パターン確認要（`@supabase/ssr` docs）
- `/login` ページの URL は `src/app/login/` にある（`/login-51cf21389c56` は招待専用サインアップページ）
- RPC 関数の migration ファイル名: `supabase/migrations/` ディレクトリ内の既存ファイルの命名規則（`YYYYMMDDHHMMSS_description.sql`）に従うこと
- 将来 protected pages が増えた場合は `middleware.ts` の matcher 配列にパスを追加するだけでよい構造にすること

</specifics>

<deferred>
## Deferred Ideas

- **RSS サムネ空上書き問題**: RSS 取得失敗時に `image_url` が null で上書きされる。スクレイピングによる補完修正が必要。将来フェーズで対応
- **追加の protected pages**: 現時点では `/my` のみだが、将来追加が見込まれる。middleware.ts の matcher 配列に追加するだけで対応可能

### Reviewed Todos (not folded)
- **過去記事の消失問題（Cron+KV累積保存）**: v1.3 で実装済み。本フェーズ対象外
- **1人が複数チームに所属できる多対多**: v1.3 (Phase 11) で実装済み。本フェーズ対象外
- **のちのちSupabase移行**: v1.5 で完了済み。本フェーズ対象外

</deferred>

---

*Phase: 33-commitslots-upsert*
*Context gathered: 2026-06-08*
