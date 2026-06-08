---
phase: 33-commitslots-upsert
plan: 01
subsystem: auth
tags: [middleware, supabase-ssr, next.js, open-redirect, magic-link]

# Dependency graph
requires:
  - phase: 31-login-flow-split
    provides: "/login ページ分離と auth/callback route 構造"
provides:
  - "src/middleware.ts — /my 認証ガード、未認証時 /login?next=<path> リダイレクト"
  - "auth/callback の next パラメータ有効化（ハードコード '/my' を除去）"
affects: [33-02, 33-03, 34-login-ui, e2e/admin-guard.spec.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js middleware に @supabase/ssr createServerClient + getUser() を統合（セッションリフレッシュ + 認証ガード両立）"
    - "encodeURIComponent(pathname) で next パラメータを安全にエンコード"
    - "Open Redirect 防止: startsWith('/') && !startsWith('//') チェック（auth/callback で確立済みパターンの継承）"

key-files:
  created:
    - "src/middleware.ts"
    - "src/middleware.test.ts"
  modified:
    - "src/app/auth/callback/route.ts"

key-decisions:
  - "middleware.ts の matcher は ['/my', '/my/:path*'] のみ — /admin と /signin-* は含めない（別保護・秘匿方式維持）"
  - "proxy.ts は変更せず — ユニットテスト専用モジュールとして独立維持"
  - "TDD: 先に失敗テスト (RED) をコミット後に実装 (GREEN) を追加"

patterns-established:
  - "Pattern: middleware.ts は proxy.ts と同じ createServerClient + cookies getAll/setAll + getUser() パターン"
  - "Pattern: next param は middleware 側で encodeURIComponent、page.tsx 側でデコード済みを hidden input に渡す（二重エンコード防止）"

requirements-completed:
  - BUG-02

# Metrics
duration: 2min
completed: 2026-06-08
---

# Phase 33 Plan 01: BUG-02 middleware/auth コールバック修正 Summary

**Next.js middleware で /my を認証ガードし、Magic Link 後に元ページへ戻る UX を実現 — open-redirect 安全な next パラメータ伝搬を確立**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-08T01:17:58Z
- **Completed:** 2026-06-08T01:19:30Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `src/middleware.ts` を新規作成。未認証 GET /my → `/login?next=%2Fmy` へリダイレクト、認証済みはパススルー
- `src/app/auth/callback/route.ts` の line 59 を修正。ハードコード `new URL('/my', origin)` を `new URL(next, origin)` に変更し next パラメータが有効化
- TODO コメント（lines 12-13）削除
- middleware unit test 3 件 green、全体テストスイート 127 tests / 20 files すべてパス

## Task Commits

Each task was committed atomically:

1. **TDD RED — middleware test** - `d9465cc` (test)
2. **Task 1: src/middleware.ts 新規作成** - `fe52fdb` (feat)
3. **Task 2: auth/callback next 変数使用** - `92608cc` (fix)

**Plan metadata:** (このコミット — docs)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified

- `src/middleware.ts` — /my 認証ガード middleware（@supabase/ssr 統合、encodeURIComponent で next エンコード）
- `src/middleware.test.ts` — 3 unit tests（未認証リダイレクト、認証済みパススルー、/my/settings サブパス）
- `src/app/auth/callback/route.ts` — line 59 修正（new URL('/my') → new URL(next)）+ TODO コメント削除

## Decisions Made

- `proxy.ts` は変更しない（ユニットテスト専用モジュールとして独立維持）
- `middleware.ts` の matcher は `/my` と `/my/:path*` のみ（/admin・/signin-* は含めない）
- middleware 内の pathname はサーバー側で生成されるため Open Redirect のリスクなし（それでも encodeURIComponent 適用）
- page.tsx 側の既存 `if (!user) redirect('/')` は Defense-in-Depth として残す（middleware が先に動作するため実ユーザーへの影響なし）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. DB 変更なし、環境変数追加なし。

## Next Phase Readiness

- Plan 02（/login page の searchParams.next 対応 + sendMagicLinkAction に ?next= 付与）の前提となるミドルウェアが完成
- E2E テスト `e2e/admin-guard.spec.ts` の "未認証で /my → / にリダイレクト" アサーションは、このフェーズの変更により `/login?next=...` に変わるため Plan 04 or 05 で更新が必要（RESEARCH.md Pitfall 2 として既知）

---
*Phase: 33-commitslots-upsert*
*Completed: 2026-06-08*

## Self-Check: PASSED

- [x] `src/middleware.ts` exists
- [x] `src/middleware.test.ts` exists
- [x] Commits d9465cc, fe52fdb, 92608cc exist in git log
- [x] `npm test` exits 0 (127 tests, 20 files)
