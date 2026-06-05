# Phase 31: ログインフロー修正 - Research

**Researched:** 2026-06-05
**Domain:** Supabase Auth (Magic Link), Next.js Server Actions, PostgreSQL FK constraints
**Confidence:** HIGH

## Summary

Phase 31 は4つの問題を一括解決する: (1) `auth/callback` での `pid` 未一致時の新規 member 自動作成、(2) `/my` 上での `substack_handle` 読み取り専用制御、(3) admin による `publication_id` / `substack_handle` 編集、(4) `substack_handle` unique 制約違反のグレースフルハンドリング。

現在の `auth/callback/route.ts` は `pid` で既存メンバーを検索して `user_id` を紐付けるが、メンバーが存在しない場合の新規作成処理が未実装。`sendMagicLinkAction` は `pid` が空でもエラーにならず callback URL を生成し続ける（D-01 要求: 両方必須）。`MyProfileForm` は `substack_handle` を常に編集可能で表示している（D-03 要求: 設定済みなら読み取り専用）。`updateMemberAction` は `substack_handle` / `publication_id` のフィールドを一切扱わない（D-04 要求: admin 編集対応）。

重要な発見: `substack_handle` の UNIQUE 制約は `schema.sql` にも `migrations/` にも存在しない。CONTEXT.md の「Phase 27 で追加済み」という記述は schema ファイル上では未反映であり、Phase 31 の作業範囲に **migration の追加** が含まれる。

**Primary recommendation:** 5ファイル（route.ts, actions.ts x2, form コンポーネント x2）を直接修正し、新規 migration で UNIQUE 制約を追加する。既存ライブラリ追加は不要。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: サインイン Magic Link は `pid` と `handle` の両方が必須。`sendMagicLinkAction` で `pid` または `handle` が空の場合はエラー「登録リンクが不正です」を返す
- **D-02**: `pid` に一致するメンバーが存在しない → `publication_id=pid, substack_handle=handle` で新規 member INSERT + `user_id` 設定。`substack_handle` unique 違反時は `substack_handle=null` でフォールバック INSERT。`name` は `publication_id` 値で仮置き
- **D-03**: `substack_handle` 設定済み → `<p>` タグで読み取り専用表示（「変更できません」メッセージ付き）。`null` の例外ケースのみ入力フィールドを表示
- **D-04**: admin `updateMemberAction` に `substack_handle` と `publication_id` を追加。`AdminMemberList.tsx` の編集行に両フィールドを追加
- **D-05**: INSERT/UPDATE 時に `error.code === '23505'` (unique violation) → 「このハンドルはすでに使用されています」エラー。callback での新規 member 作成時は `substack_handle=null` でサイレントフォールバック

### Claude's Discretion

- admin フォームの `publication_id` 変更に対する確認ダイアログの有無（推奨: 表示する）
- `/my` での `substack_handle` 未設定時のバリデーション（`@` プレフィックスの自動付与はそのまま維持）

### Deferred Ideas (OUT OF SCOPE)

- なし（CONTEXT.md に明記なし）

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-FIX-01 | Magic Link ログインフローの不具合を調査・修正し、メンバーが確実にログインできる状態にする | 以下の5サブ問題を解決: (1) callback 新規member作成, (2) sendMagicLinkAction バリデーション, (3) /my substack_handle 読み取り専用, (4) admin 編集拡張, (5) unique violation 処理 |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Magic Link 送信バリデーション (D-01) | API/Backend (Server Action) | — | `sendMagicLinkAction` はサーバー側で pid/handle の存在チェックを行う |
| auth callback での member 紐付け・作成 (D-02) | API/Backend (Next.js Route Handler) | Database | `createSupabaseAdminClient` で直接 DB 操作。RLS バイパス必要 |
| substack_handle 読み取り専用制御 (D-03) | Frontend Server (SSR) + Browser/Client | — | page.tsx で DB から取得した値をもとに MyProfileForm に props で渡す |
| admin による publication_id / substack_handle 編集 (D-04) | API/Backend (Server Action) + Browser/Client | Database | AdminMemberList は Client Component で FormData を組み立て Server Action を呼ぶ |
| unique violation ハンドリング (D-05) | API/Backend (Server Action + Route Handler) | — | DB エラーコード `23505` を検出してユーザー向けメッセージに変換 |
| substack_handle UNIQUE 制約 | Database | — | schema.sql + migration でコンストレイント追加 |

## Standard Stack

### Core (既存スタック — 変更なし)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | (既存) | DB 操作・認証 | プロジェクト全体で使用中 |
| `@supabase/ssr` | (既存) | Next.js SSR 対応セッション管理 | プロジェクト全体で使用中 |
| `next` | (既存) | Server Actions, Route Handlers | フレームワーク |
| `vitest` | (既存) | 単体テスト | 103 tests passing — 既存インフラ |

**新規ライブラリの追加は不要。** すべての変更は既存スタックの範囲内で完結する。

### Package Legitimacy Audit

新規パッケージのインストールなし — 監査不要。

## Architecture Patterns

### System Architecture Diagram

```
User clicks Magic Link
        ↓
GET /auth/callback?code=xxx&pid=yyy&handle=@zzz
        ↓
exchangeCodeForSession(code)        — Supabase Auth
        ↓ success
getUser() → user.id
        ↓
SELECT members WHERE publication_id = pid
        ↓
    [found?]
   /        \
YES            NO
↓              ↓
user_id=null?  INSERT member {publication_id=pid, substack_handle=handle, name=pid}
↓              ↓ (23505 on substack_handle?)
UPDATE         ↓ YES: retry with substack_handle=null
user_id        ↓
        ↓
redirect /my
```

### Recommended Project Structure

変更対象ファイル（新規ファイルなし）:

```
src/app/
├── auth/callback/route.ts          # D-02: 新規 member 作成ロジック追加
├── login-51cf21389c56/
│   ├── actions.ts                  # D-01: pid/handle 必須バリデーション追加
│   └── LoginForm.tsx               # (変更不要 — hidden input は既存で両方対応済み)
├── my/
│   ├── MyProfileForm.tsx           # D-03: substack_handle 条件付きレンダリング
│   ├── page.tsx                    # D-03: substack_handle 値を props に渡す変更
│   └── actions.ts                  # D-05: 23505 エラーハンドリング追加
└── admin/
    ├── AdminMemberList.tsx         # D-04: substack_handle/publication_id フィールド追加
    └── actions.ts                  # D-04: updateMemberAction に両フィールド追加
supabase/
└── migrations/                     # substack_handle UNIQUE 制約追加
```

### Pattern 1: auth/callback での新規 member INSERT + フォールバック

**What:** `pid` に一致する member が存在しない場合、INSERT を試みる。`substack_handle` の unique 違反 (23505) 時は `substack_handle=null` でリトライする

**When to use:** callback route の `pid` 処理ブランチ

**Example:**
```typescript
// Source: [ASSUMED] — Supabase JS SDK error handling pattern
const insertPayload = {
  publication_id: pid,
  substack_handle: handle || null,
  name: pid,  // D-02: 仮置き
  added_at: new Date().toISOString(),
}
const { data: newMember, error: insertError } = await admin
  .from('members')
  .insert({ ...insertPayload, user_id: user.id })
  .select('id')
  .single()

if (insertError?.code === '23505') {
  // substack_handle unique violation — fallback to null handle
  await admin
    .from('members')
    .insert({ ...insertPayload, substack_handle: null, user_id: user.id })
}
```

### Pattern 2: Server Action での unique violation ハンドリング

**What:** Supabase が返す PostgreSQL エラーコード `23505` を検出し、ユーザー向けメッセージを返す

**When to use:** `updateMyProfileAction` での `substack_handle` 更新、admin `updateMemberAction` での同フィールド更新

**Example:**
```typescript
// Source: [ASSUMED] — Supabase error object structure
const { error: updateError } = await admin
  .from('members')
  .update({ substack_handle })
  .eq('user_id', user.id)

if (updateError?.code === '23505') {
  return 'このハンドルはすでに使用されています'
}
if (updateError) {
  return '保存に失敗しました。もう一度お試しください'
}
```

### Pattern 3: substack_handle 読み取り専用制御

**What:** `substack_handle` が設定済みかどうかで表示を切り替える — 設定済みなら `<p>` タグ、未設定なら `<input>` タグ

**When to use:** `MyProfileForm.tsx` の substack_handle フィールド

**Example:**
```tsx
{/* Source: [ASSUMED] — 既存の publicationId 読み取り専用パターンを踏襲 */}
{substackHandle ? (
  <div>
    <label className="block text-sm font-semibold mb-1">Substack ハンドル</label>
    <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
      {substackHandle}
    </p>
    <p className="text-xs text-gray-500 mt-1">Substack ハンドルは変更できません</p>
  </div>
) : (
  <div>
    <label htmlFor="substack_handle" className="block text-sm font-semibold mb-1">
      Substack ハンドル
    </label>
    <input id="substack_handle" name="substack_handle" ... />
  </div>
)}
```

### Pattern 4: admin での publication_id UPDATE と articles FK

**Critical:** `articles` テーブルの FK `publication_id TEXT NOT NULL REFERENCES members(publication_id) ON DELETE CASCADE` は `ON UPDATE CASCADE` を**持たない**。

管理画面で `publication_id` を変更する場合、`articles` の `publication_id` も手動で UPDATE する必要がある。`updateMember` 関数は現在この処理を持たないため、admin `updateMemberAction` から publication_id 変更を行う際はトランザクション的に `articles` も更新する実装が必要。

同様に `member_publications` テーブルの FK も `ON UPDATE CASCADE` なし。ただし `sync_member_publications` トリガーが `UPDATE` 時に `publication_id` の変更を `member_publications` に反映する処理を含む（schema.sql の ELSIF TG_OP = 'UPDATE' ブランチ）。

**articles の更新は `lib/members.ts` の `updateMember` 内で行うのが適切。**

### Anti-Patterns to Avoid

- **callback で `pid` のみチェックして `handle` を無視する:** D-01 で両方必須。片方だけでは不完全
- **admin の publication_id 変更で articles を更新しない:** articles は `ON UPDATE CASCADE` なし。FK 違反は起きないが（`members.publication_id` UNIQUE 変更後 articles は古い pid を参照し続ける = データ不整合）
- **`substack_handle` の UNIQUE 制約を DB に追加せず code-only で保証:** DB 制約なしでは並行 INSERT で重複が生じる
- **`error.code` ではなく `error.message` で `23505` を検出:** PostgreSQL エラーコードは `code` フィールドに入る

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| unique violation 検出 | 事前 SELECT で重複チェック | `error.code === '23505'` | TOCTOU race condition が発生する |
| user_id 紐付け | 独自 JWT 解析 | `supabase.auth.getUser()` + admin client | セキュリティ上の問題 |
| publication_id FK 更新 | アプリ側でトランザクション管理 | Supabase admin client の逐次 UPDATE | DB トランザクションの代替不可 |

## Common Pitfalls

### Pitfall 1: substack_handle UNIQUE 制約の欠落

**What goes wrong:** `schema.sql` と `migrations/` のどちらにも `substack_handle` の UNIQUE 制約が存在しない（Phase 27 migration で追加されていない）。CONTEXT.md の「既に存在する」という記述と実態が乖離している。

**Why it happens:** Phase 27 で unique constraint 追加が計画されたが、migration ファイルには反映されていない。

**How to avoid:** Phase 31 の Wave 0 または Plan 01 で migration `20260605000000_add_substack_handle_unique.sql` を作成し、live DB に適用する。schema.sql にも UNIQUE を追記する。

**Warning signs:** `error.code === '23505'` のハンドリングを実装してもテストで23505が発生しない、または本番で重複登録が通ってしまう。

### Pitfall 2: articles テーブルの ON UPDATE CASCADE なし

**What goes wrong:** admin が `publication_id` を変更しても `articles.publication_id` が更新されず、データ不整合が残る。ただし FK 違反にはならない（articles の FK は `members.publication_id` へ参照しているが、`members.publication_id` が UNIQUE なので古い値はもう存在しない = articles が宙に浮く）。

**Why it happens:** `articles` テーブルは `ON DELETE CASCADE` のみで `ON UPDATE CASCADE` がない。

**How to avoid:** `lib/members.ts` の `updateMember` 関数で `publication_id` 変更が要求された場合、`articles` テーブルも同じ値で UPDATE する処理を追加する（あるいは migration で `ON UPDATE CASCADE` を追加する）。

**Warning signs:** admin で publication_id を変更後、メンバーの記事一覧が空になる。

### Pitfall 3: member 作成時の added_at 欠落

**What goes wrong:** callback での新規 member INSERT で `added_at` を省略すると、NOT NULL 制約違反が発生する。

**Why it happens:** `members` テーブルの `added_at TIMESTAMPTZ NOT NULL DEFAULT now()` は DEFAULT があるが、`addMember` 関数では明示的に `new Date().toISOString()` を渡している。Supabase JS SDK で DEFAULT を利用する場合は列を省略すれば良い。

**How to avoid:** INSERT 時に `added_at` は省略（DEFAULT now() に任せる）か、`new Date().toISOString()` を明示的に渡す。

### Pitfall 4: sendMagicLinkAction の origin が空文字列

**What goes wrong:** Vercel 環境以外（localhost 開発）で `headers().get('origin')` が `null` を返すことがあり、`origin ?? ''` で空文字列になる。結果として callbackUrl が `/auth/callback?...` の相対パスとなり、`signInWithOtp` の `emailRedirectTo` が不正になる可能性がある。

**Why it happens:** 現在のコードは `origin ?? ''` でフォールバックしているが、空文字列のままでは URL が不完全。

**How to avoid:** CONTEXT.md の D-02 に従い Phase 31 スコープでは `origin` の fallback は「確認」レベル。Vercel 本番では `origin` は正常に取得できるため、開発環境でのテスト注意事項として記録する。

### Pitfall 5: MyProfileForm の props 型変更

**What goes wrong:** `substack_handle` の読み取り専用制御を実装するには、`MyProfileForm` に `substackHandle` (設定済み値) と `isHandleLocked` (読み取り専用フラグ) のどちらかを渡す必要がある。現在の props は `substackHandleDefault?: string` のみ。

**Why it happens:** 現在 `substackHandleDefault` は「設定済みかどうか」を判定するのに使われていない — `undefined` は「未設定」を意味するが、既存コードでは input の `defaultValue` に使うだけ。

**How to avoid:** `page.tsx` で `(member as any)?.substack_handle` を `substackHandle` として渡し、`MyProfileForm` 内で `substackHandle != null` を読み取り専用フラグとして使う。props 型を整理する。

## Code Examples

### 既存の unique violation エラー形状 (Supabase)

```typescript
// Source: [ASSUMED] — Supabase PostgrestError の構造
// error.code は PostgreSQL エラーコード文字列
// "23505" = unique_violation
{
  code: "23505",
  details: "Key (substack_handle)=(@hoge) already exists.",
  hint: null,
  message: 'duplicate key value violates unique constraint "members_substack_handle_key"'
}
```

### 既存の callback route — 現在のピン留め動作

```typescript
// src/app/auth/callback/route.ts (現在の実装)
// pid に一致する member が存在する AND user_id が未設定 → user_id を UPDATE
// pid に一致する member が存在しない → 何もしない（D-02 で修正対象）
if (member && !member.user_id) {
  await admin.from('members').update({ user_id: user.id }).eq('id', member.id)
}
```

### 既存の publicationId 読み取り専用表示パターン (MyProfileForm)

```tsx
// 既存の publicationId の表示スタイル — substack_handle の読み取り専用表示に踏襲
<label className="block text-sm font-semibold mb-1">パブリケーションID</label>
<p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
  {member.publicationId}
</p>
<p className="text-xs text-gray-500 mt-1">パブリケーションID は変更できません</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| handle のみでコールバック `/my?handle=@hoge` | pid + handle の両方必須 | Phase 31 D-01 | 既存 Phase 27 の `/my?handle=xxx` フローとは異なる — callback は既に handle を直接渡している |
| substack_handle は /my で自由編集 | 設定済みなら読み取り専用 | Phase 31 D-03 | 一度設定したら admin のみ変更可能 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `substack_handle` の UNIQUE 制約は live DB に存在しない（schema.sql, migrations 両方に未定義） | Common Pitfalls #1 | HIGH: 制約が既に live DB に存在していた場合、migration 追加が重複エラーになる。ただし `ADD CONSTRAINT IF NOT EXISTS` で安全に対応可能 |
| A2 | `articles` テーブルに `ON UPDATE CASCADE` がない場合、publication_id 変更で articles が orphan になる | Pitfalls #2 / Pattern 4 | MEDIUM: admin が publication_id を変更するユースケースは稀だが、データ不整合リスクあり |
| A3 | Supabase PostgrestError の unique violation は `error.code === '23505'` で検出可能 | Pattern 2 | LOW: Supabase JS SDK の公式 error 構造。PostgreSQL エラーコードをそのまま露出するのが通常の動作 |
| A4 | `substack_handle` の UNIQUE 制約追加 migration は `20260605000000_add_substack_handle_unique.sql` として追加が適切 | Standard Stack | LOW: ファイル名の命名規則は既存 migration に倣う（YYYYMMDDHHMMSS_ prefix）|
| A5 | `added_at` の DEFAULT now() は Supabase admin client の INSERT で省略すれば自動付与される | Common Pitfalls #3 | LOW: PostgreSQL DEFAULT の標準的な動作 |

## Open Questions

1. **live DB に substack_handle UNIQUE 制約が存在するか**
   - What we know: schema.sql と migrations/ には定義なし
   - What's unclear: live DB に手動で制約が追加されている可能性
   - Recommendation: migration を `ADD CONSTRAINT IF NOT EXISTS` で安全に書く。または planner が「migration 適用前に live DB で確認」タスクを追加する

2. **publication_id 変更時の articles 更新をどこで行うか**
   - What we know: articles FK には ON UPDATE CASCADE がない。sync_member_publications トリガーは articles を対象にしていない
   - What's unclear: admin の D-04 要求は「admin が publication_id を編集できる」だが、articles の連動更新は明示されていない
   - Recommendation: `lib/members.ts` の `updateMember` に `publication_id` 変更時の articles UPDATE を追加するか、admin edit で publication_id 変更を制限する（確認ダイアログ + 注意メッセージ）

3. **LoginForm.tsx の変更は本当に不要か**
   - What we know: D-01 は sendMagicLinkAction 側でバリデーションする要求。LoginForm は既に両方の hidden input を保持
   - What's unclear: `{pid && ...}` / `{handle && ...}` で条件付きレンダリングしているため、pid/handle がない URL からアクセスした場合は hidden input が存在しない
   - Recommendation: sendMagicLinkAction で pid/handle が空の場合にエラーを返す対応で十分（D-01）。LoginForm 側の変更は不要

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — all changes are code/DB schema changes within existing stack)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-FIX-01-a | sendMagicLinkAction: pid/handle 欠落時にエラー返す | unit | `npx vitest run src/app/login-51cf21389c56/__tests__/` | ❌ Wave 0 |
| AUTH-FIX-01-b | callback: pid 未一致時に新規 member を INSERT する | unit | `npx vitest run src/app/auth/__tests__/callback.test.ts` | ✅ (拡張が必要) |
| AUTH-FIX-01-c | callback: substack_handle 23505 時に null でフォールバック INSERT | unit | `npx vitest run src/app/auth/__tests__/callback.test.ts` | ✅ (拡張が必要) |
| AUTH-FIX-01-d | updateMyProfileAction: substack_handle 23505 でエラーメッセージ返す | unit | `npx vitest run src/app/my/__tests__/updateMyProfileAction.test.ts` | ✅ (拡張が必要) |
| AUTH-FIX-01-e | updateMemberAction (admin): substack_handle / publication_id を更新できる | unit | `npx vitest run src/app/admin/__tests__/updateMemberAction.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts` — covers AUTH-FIX-01-a
- [ ] `src/app/admin/__tests__/updateMemberAction.test.ts` — covers AUTH-FIX-01-e

*(Existing: `src/app/auth/__tests__/callback.test.ts`, `src/app/my/__tests__/updateMyProfileAction.test.ts` に新テストケースを追加)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Magic Link — OTP ベース。既存実装を踏襲 |
| V3 Session Management | yes | `exchangeCodeForSession` — @supabase/ssr がセッション Cookie を管理 |
| V4 Access Control | yes | `createSupabaseAdminClient` は service_role (BYPASSRLS)。admin アクションは `requireAdmin()` でガード |
| V5 Input Validation | yes | `pid`, `handle` の空文字チェック (D-01)。`publication_id` は DB UNIQUE 制約で二重保護 |
| V6 Cryptography | no | — |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `next` param | Tampering | 既に実装済み: `nextParam.startsWith('/') && !nextParam.startsWith('//')` チェック |
| admin action に非認証アクセス | Elevation of Privilege | `requireAdmin()` が `user.role !== 'admin'` を確認。throw で早期終了 |
| publication_id での member 偽装 | Spoofing | callback での新規作成は `user_id` を同時に設定するため、作成直後に別ユーザーが同 pid で紐付けることは不可（user_id UNIQUE） |
| substack_handle squatting | Tampering | UNIQUE 制約 + 23505 ハンドリングで防止 |

## Sources

### Primary (HIGH confidence)

- `src/app/auth/callback/route.ts` — 直接コード読取り: 現在の callback 実装を確認
- `src/app/login-51cf21389c56/actions.ts` — 直接コード読取り: sendMagicLinkAction の実装を確認
- `src/app/login-51cf21389c56/LoginForm.tsx` — 直接コード読取り: hidden inputs の有無を確認
- `src/app/my/MyProfileForm.tsx` — 直接コード読取り: 現在の substack_handle 表示を確認
- `src/app/my/actions.ts` — 直接コード読取り: updateMyProfileAction の実装を確認
- `src/app/admin/AdminMemberList.tsx` — 直接コード読取り: 現在の編集フォームフィールドを確認
- `src/app/admin/actions.ts` — 直接コード読取り: updateMemberAction が substack_handle/publication_id を扱わないことを確認
- `supabase/schema.sql` — 直接コード読取り: UNIQUE 制約の欠落、FK の ON UPDATE CASCADE なしを確認
- `supabase/migrations/` — 直接コード読取り: Phase 27 migration に UNIQUE 制約が含まれないことを確認
- `src/lib/members.ts` — 直接コード読取り: updateMember 関数の実装を確認
- `src/lib/types.ts` — 直接コード読取り: Member 型の substackHandle フィールドを確認
- `.planning/phases/31-login-fix/31-CONTEXT.md` — ユーザー決定事項 D-01〜D-05 を確認

### Secondary (MEDIUM confidence)

- `src/app/auth/__tests__/callback.test.ts` — 既存テストのモック構造を確認（新テスト作成の参考）
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — 既存テストのモック構造を確認

### Tertiary (LOW confidence)

- `[ASSUMED]` Supabase PostgrestError の `code` フィールドに PostgreSQL エラーコード `23505` が入る — Supabase JS SDK の公式動作として広く知られるが、このセッションで Context7/公式ドキュメントからは未検証

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 既存コードベースから直接確認
- Architecture: HIGH — schema.sql と全ソースファイルを直接読取り
- Pitfalls: HIGH — schema.sql の UNIQUE 制約欠落は事実として確認済み、articles ON UPDATE CASCADE 欠落も事実として確認済み
- Supabase error code format: LOW — [ASSUMED]（training knowledge）

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stable stack)
