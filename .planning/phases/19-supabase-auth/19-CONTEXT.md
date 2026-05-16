# Phase 19: Supabase Auth + メンバー自己管理 - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Supabase Auth の Magic Link を用いた認証フローを実装し、既存メンバーが自分の Supabase アカウントと substackId を紐付けて自己管理できる /my ページを構築する。
あわせて /admin の認証を Basic Auth から Supabase Auth admin ロールに完全移行する。

**このフェーズで作るもの:**
- `/login` ページ（Magic Link メール送信フォーム）
- `/auth/callback` ルートハンドラー（PKCE code exchange → /my リダイレクト）
- `/my` ページ（未紐付け: substackId 入力→紐付け / 紐付け済み: name・teamNames 編集）
- `members.user_id` 列追加（`auth.users(id)` への FK）
- `proxy.ts` を Supabase Auth admin ロールチェックに完全書き換え（Basic Auth 廃止）

**このフェーズで作らないもの:**
- 新規メンバーの完全自己登録（管理者未登録ユーザーの新規参加）— 将来フェーズ
- /my ページのチームチェックボックスUI — Phase 20
- @upstash/redis の完全削除 — Phase 21

</domain>

<decisions>
## Implementation Decisions

### 認証方式（admin）

- **D-01:** `/admin` の認証を Basic Auth（proxy.ts）から Supabase Auth の `app_metadata.role === 'admin'` チェックに**完全移行**する。Phase 19 完了後は `ADMIN_PASSWORD` 環境変数不要になる
- **D-02:** admin ロールの付与は Supabase Dashboard で手動実施（Service Role キーで `app_metadata.role: 'admin'` をセット）。自動化は不要

### 自己登録範囲

- **D-03:** Phase 19 では**紐付けのみ**。既存メンバー（管理者登録済み）が /my ページで substackId を入力し、自分のアカウントと紐付ける。新規参加は引き続き管理者経由
- **D-04:** 紐付けは admin クライアント（service_role）で実施。`members.user_id = auth.uid()` をセット。既に別ユーザーが紐付けた substackId はエラーとする

### /my ページのチーム入力

- **D-05:** Phase 19 では**カンマ区切りテキスト入力**のまま。Phase 20 でチェックボックスUIに改善する

### proxy.ts の書き換え

- **D-06:** proxy.ts を Supabase Auth を使ったルートガードに書き換える。`@supabase/ssr` の `createServerClient` を Edge runtime で使用する
- **D-07:** `/my` ルートもログイン必須（認証なしなら /login にリダイレクト）。proxy.ts の matcher を `/admin` + `/my` に拡張する
- **D-08:** 公開ルート（/、/member/*, /login、/auth/callback）は認証不要

### members テーブル

- **D-09:** `members` テーブルに `user_id UUID REFERENCES auth.users(id) UNIQUE` 列を追加する。UNIQUE 制約で1ユーザー1メンバーを保証する

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — AUTH-01〜04の定義
- `.planning/ROADMAP.md` §Phase 19 — Success Criteria 5項目

### アーキテクチャ（既存基盤）
- `src/lib/supabase/server.ts` — createSupabaseServerClient（cookies管理あり、Phase 19で /my の認証確認に使用）
- `src/lib/supabase/admin.ts` — createSupabaseAdminClient（service_role、紐付け操作に使用）
- `src/proxy.ts` — 現行 Basic Auth ミドルウェア（Phase 19 で Supabase Auth に完全置換）
- `supabase/schema.sql` — membersテーブル（user_id 列追加が必要）

### 既存実装パターン（参考）
- `src/app/admin/AdminAddForm.tsx` — useActionState を使った Client Component フォームパターン
- `src/app/admin/actions.ts` — Server Actions パターン（'use server', revalidatePath）

</canonical_refs>

<code_context>
## Existing Code Insights

### 認証クライアント
- `createSupabaseServerClient()` が `@supabase/ssr` の `createServerClient` + cookies を使用済み → /my ページの `getUser()` に使える
- `createSupabaseAdminClient()` が `service_role` で動作済み → 紐付け操作・member_teams 更新に使う

### proxy.ts（書き換え対象）
```typescript
// 現行: Basic Auth のみ
export function proxy(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const encoded = btoa(`:${adminPassword}`)
  if (authHeader !== `Basic ${encoded}`) {
    return new NextResponse('Unauthorized', { status: 401, ... })
  }
  return NextResponse.next()
}
export const config = { matcher: ['/admin', '/admin/:path*'] }
```

書き換え後: Supabase Auth `getUser()` + admin ロールチェック + /my ログインチェック

### members テーブル（schema.sql）
現在: `id, name, substack_id, image_url, added_at`
追加: `user_id UUID REFERENCES auth.users(id) UNIQUE`

### member_teams テーブル
チーム名更新時: member_teams を全削除して再INSERT する（Phase 18 の kvMembers.ts 実装と同パターン）

</code_context>

<specifics>
## Specific Ideas

### /login ページ
- `src/app/login/page.tsx` — Server Component（LoginForm を render）
- `src/app/login/LoginForm.tsx` — Client Component（useActionState でメール送信 + 送信済み表示）
- `src/app/login/actions.ts` — Server Action: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '.../auth/callback' } })`

### /auth/callback
- `src/app/auth/callback/route.ts` — GET ハンドラー: `supabase.auth.exchangeCodeForSession(code)` → redirect to `/my`

### /my ページ
- `src/app/my/page.tsx` — Server Component
  - `getUser()` → 未認証なら `/login` にリダイレクト（proxy でも弾くが二重チェック）
  - `members WHERE user_id = user.id` → 未紐付けなら `<LinkMemberForm>`, 紐付け済みなら `<MyProfileForm>`
- `src/app/my/LinkMemberForm.tsx` — Client Component（substackId 入力 → linkMemberAction）
- `src/app/my/MyProfileForm.tsx` — Client Component（name + teamNames 編集 → updateMyProfileAction）
- `src/app/my/actions.ts` — Server Actions:
  - `linkMemberAction(substackId)`: admin client で members.user_id をセット
  - `updateMyProfileAction(name, teamNamesRaw)`: admin client で members UPDATE + member_teams 再INSERT

### proxy.ts 書き換え
```typescript
import { createServerClient } from '@supabase/ssr'
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (list) => { ... } }
  })
  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  if (request.nextUrl.pathname.startsWith('/my')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}
export const config = { matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*'] }
```

</specifics>

<deferred>
## Deferred Ideas

- 新規メンバー完全自己登録（管理者未登録ユーザーが自分で参加）— 将来フェーズ
- /my ページのチェックボックスUI — Phase 20
- Magic Link 以外のログイン方法（OAuth等）— v1.6以降
- ログアウト機能 — Phase 19 または Phase 20 で追加検討（/my ページに logout ボタン）
- プロフィール写真アップロード — v1.6以降

</deferred>

---

*Phase: 19-Supabase Auth + メンバー自己管理*
*Context gathered: 2026-05-16*
