# Plan 18-03: middleware.ts → proxy.ts リネーム — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** 24bc3a7

## What was done

- `src/proxy.ts` を新規作成（Basic Auth ロジックを移動、関数名を `proxy` に変更）
- `src/middleware.ts` を削除（Next.js 16では middleware.ts と proxy.ts の共存がエラーになるため）
- Next.js の /admin 保護は引き続き proxy.ts 経由で動作（Next.js 16 Proxy/Middleware として認識）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Next.js 16のmiddleware.ts + proxy.ts共存エラー対応**
- **Found during:** Task 2（npm run build）
- **Issue:** Next.js 16.2.6 では `middleware.ts` と `proxy.ts` が同時に存在するとビルドエラー（E900）になる。プランではmiddleware.tsをre-exportラッパーとして残す想定だったが、Next.js 16仕様と非互換だった。
- **Fix:** middleware.ts を削除し、proxy.ts のみを残す方式に変更。
- **Files modified:** src/middleware.ts（削除）

**2. [Rule 1 - Bug] Next.js 16 proxy.ts の関数名規約対応**
- **Found during:** middleware.ts削除後のビルド
- **Issue:** Next.js 16 では proxy.ts 内の関数名は `middleware` ではなく `proxy`（または `default`）でなければならない。
- **Fix:** `export function middleware` を `export function proxy` に変更。
- **Files modified:** src/proxy.ts

## Verification

- [x] src/proxy.ts に proxy 関数と config オブジェクトが存在すること
- [x] src/middleware.ts が削除されていること（Next.js 16では不要）
- [x] npm run build 通過（`ƒ Proxy (Middleware)` として認識）

## Notes

- Next.js 16.2.6 では `proxy.ts` が新しい規約ファイル名（`middleware.ts` は deprecated）
- Phase 19 で Supabase Auth ロール制御に移行する際は src/proxy.ts を書き換えるだけでよい
- Human verification: curl -I http://localhost:3000/admin → 401 Unauthorized を確認

## Self-Check: PASSED

- src/proxy.ts: FOUND
- Commit 24bc3a7: FOUND
