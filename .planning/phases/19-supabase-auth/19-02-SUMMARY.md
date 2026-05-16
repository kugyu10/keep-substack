# Plan 19-02: /my ページ + members.user_id — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** fb2dbd2

## What was done

- Updated `supabase/schema.sql`: added `user_id UUID REFERENCES auth.users(id) UNIQUE` to members table definition、および既存インスタンス向け ALTER TABLE コメントを追記
- Created `src/app/my/page.tsx` (Server Component — 認証チェック、member取得、紐付け未済/済で条件分岐して各フォーム表示)
- Created `src/app/my/LinkMemberForm.tsx` (Client Component — substackId 入力で accounts 紐付け)
- Created `src/app/my/MyProfileForm.tsx` (Client Component — 名前・所属チーム編集フォーム)
- Created `src/app/my/actions.ts` (`linkMemberAction` + `updateMyProfileAction` をエクスポート)

## Human action required

Supabase SQL Editor で以下を実行（まだ未実施の場合）:

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE;
```

## Verification

- [x] `supabase/schema.sql` に `user_id UUID REFERENCES auth.users(id) UNIQUE` が存在すること
- [x] `src/app/my/page.tsx` が存在すること
- [x] `src/app/my/LinkMemberForm.tsx` が存在すること
- [x] `src/app/my/MyProfileForm.tsx` が存在すること
- [x] `src/app/my/actions.ts` が存在すること（`linkMemberAction`, `updateMyProfileAction` をエクスポート）
- [x] `npm run build` がエラーなく完了すること

## Deviations from Plan

なし — プラン通りに実行。

## Self-Check: PASSED

- `supabase/schema.sql` — 存在・更新済み
- `src/app/my/page.tsx` — 存在
- `src/app/my/LinkMemberForm.tsx` — 存在
- `src/app/my/MyProfileForm.tsx` — 存在
- `src/app/my/actions.ts` — 存在
- commit fb2dbd2 — 確認済み
- `npm run build` — 正常完了（`/my` ルートが Dynamic として認識）
