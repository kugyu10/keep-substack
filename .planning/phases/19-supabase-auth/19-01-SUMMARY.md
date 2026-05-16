# Plan 19-01: /login + Magic Link + /auth/callback — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** 1fa16b0

## What was done

- Created `src/app/login/page.tsx` (Server Component、ログイン済みユーザーは /my にリダイレクト)
- Created `src/app/login/LoginForm.tsx` (Client Component、useActionState でメール送信と送信済み表示を管理)
- Created `src/app/login/actions.ts` (Server Action: sendMagicLinkAction — Supabase Magic Link メール送信)
- Created `src/app/auth/callback/route.ts` (GET ハンドラー: PKCE code exchange → セッション確立 → /my にリダイレクト)

## Verification

- [x] `src/app/login/page.tsx` 存在確認
- [x] `src/app/login/LoginForm.tsx` 存在確認
- [x] `src/app/login/actions.ts` 存在確認（`sendMagicLinkAction` エクスポート）
- [x] `src/app/auth/callback/route.ts` 存在確認（GET ハンドラー）
- [x] `npm run build` エラーなく完了

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] worktreeブランチがmasterから大きく遅れており supabase/server.ts が存在しなかった**
- **Found during:** ビルド実行時
- **Issue:** worktreeブランチはmasterより数十コミット遅れており、`src/lib/supabase/server.ts` がworktree内に存在しないため `@/lib/supabase/server` のインポートが解決できなかった
- **Fix:** `git merge master` でworktreeブランチをmasterに追いつかせた
- **Files modified:** なし（マージのみ）
- **Commit:** (fast-forward merge)

**2. [Rule 3 - Blocking Issue] .env.local が worktree に存在せず /admin ページのビルドが失敗**
- **Found during:** マージ後のビルド実行時
- **Issue:** `/admin` ページがSupabaseクライアントを使うようになっており、`NEXT_PUBLIC_SUPABASE_URL` が必要だが worktree に `.env.local` がなかった
- **Fix:** メインリポジトリの `.env.local` を worktree にコピー
- **Files modified:** `.env.local`（worktreeのみ、gitignore対象）

## Self-Check: PASSED

- FOUND: src/app/login/page.tsx
- FOUND: src/app/login/LoginForm.tsx
- FOUND: src/app/login/actions.ts
- FOUND: src/app/auth/callback/route.ts
- FOUND: commit 1fa16b0

## Human actions required

- Supabase Dashboard > Authentication > URL Configuration に `/auth/callback` を Redirect URLs として追加すること
- ローカル開発では `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を `.env.local` に設定すること（Vercel環境変数も同様）
