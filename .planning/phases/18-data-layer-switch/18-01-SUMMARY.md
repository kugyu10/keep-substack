# Plan 18-01: kvMembers.ts — Supabase差し替え — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** 9e8951f

## What was done

- `src/lib/kvMembers.ts` の内部実装をUpstash Redisからsupabase-jsに全面書き換え
- getMembers(): members + member_teams + teams JOIN でチーム名を取得
- addMember(): members INSERT → teams upsert → member_teams INSERT
- deleteMember(): members DELETE（member_teams/articlesはCASCADE）
- updateMember(): スカラーフィールド UPDATE + member_teams 全削除・再INSERT
- 関数シグネチャは変更なし（admin/actions.ts等の呼び出し元への変更ゼロ）

## Verification

- [x] npm run build 通過
- [x] redis import 除去確認（`import { redis }` 行なし）
- [x] 4関数シグネチャ維持確認（getMembers/addMember/deleteMember/updateMember）
- [x] createSupabaseAdminClient インポート確認

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @supabase/supabase-js が未インストール**
- **Found during:** Task 1（ビルド時）
- **Issue:** node_modules に `@supabase` ディレクトリが存在せず、ビルドエラー（Module not found）が発生
- **Fix:** `npm install` を実行してパッケージをインストール（package.json には既に `^2.105.4` が記載済み）
- **Files modified:** package-lock.json（間接的）
- **Commit:** 9e8951f（同コミットに含む）

## Self-Check: PASSED

- src/lib/kvMembers.ts: FOUND
- .planning/phases/18-data-layer-switch/18-01-SUMMARY.md: FOUND
- commit 9e8951f: FOUND
- src/middleware.ts: 誤削除後に 7a03516 で復元済み

## Notes

- redis.ts と @upstash/redis は Phase 21 で削除予定
- `getMembers()` の SELECT に `image_url` は含めない（Member型に該当フィールドがないため）
- teams の upsert は `onConflict: 'name'` で既存チームを再利用（重複行防止）
