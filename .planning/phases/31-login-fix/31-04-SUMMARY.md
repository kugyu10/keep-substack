---
phase: 31-login-fix
plan: "04"
subsystem: auth
tags: [login, magic-link, tdd, gap-closure]
dependency_graph:
  requires: []
  provides: [AUTH-FIX-01]
  affects: [src/app/login, src/app/signin-51cf21389c56]
tech_stack:
  added: []
  patterns: [TDD (RED/GREEN), Server Action, useActionState]
key_files:
  created:
    - src/app/login/actions.ts
    - src/app/login/LoginForm.tsx
    - src/app/login/page.tsx
    - src/app/login/__tests__/sendMagicLinkAction.test.ts
  modified:
    - src/app/signin-51cf21389c56/actions.ts (renamed from login-51cf21389c56)
    - src/app/signin-51cf21389c56/LoginForm.tsx (renamed from login-51cf21389c56)
    - src/app/signin-51cf21389c56/page.tsx (renamed from login-51cf21389c56)
    - src/app/signin-51cf21389c56/__tests__/sendMagicLinkAction.test.ts (renamed from login-51cf21389c56)
decisions:
  - "ログインページを 2 つに分離: signin-51cf21389c56 (招待専用) / login (既存メンバー再ログイン用)"
  - "/login の callbackUrl は /auth/callback のみ (pid/handle クエリパラメータなし)"
  - "signin-51cf21389c56 は D-01 pid/handle 必須バリデーションを維持"
metrics:
  duration: "約 8 分"
  completed: "2026-06-06"
  tasks: 3
  files: 8
---

# Phase 31 Plan 04: Login Page Split (G-01 Gap Closure) Summary

**One-liner:** /login を既存メンバー再ログイン専用ページとして新規作成し、旧 login-51cf21389c56 を signin-51cf21389c56 に git mv でリネームすることで、G-01（既存メンバーが pid/handle なしで再ログインできない）を解消した。

## What Was Built

1. **`src/app/signin-51cf21389c56/` (招待専用ページ):** `git mv` で `login-51cf21389c56` から `signin-51cf21389c56` にリネーム。URL が `/signin-51cf21389c56?pid={id}&handle={handle}` になり、`actions.ts` の D-01 バリデーション（`!pid || !handle` → `登録リンクが不正です`）は維持。

2. **`src/app/login/` (既存メンバー再ログイン用ページ):** TDD（RED/GREEN）で新規作成。
   - `actions.ts`: email のみ入力、`callbackUrl = /auth/callback`（pid/handle クエリパラメータなし）
   - `LoginForm.tsx`: hidden input（pid/handle）なし、メールアドレス入力のみ
   - `page.tsx`: searchParams なし、セッションあり → `/my` リダイレクト
   - `__tests__/sendMagicLinkAction.test.ts`: 4 件テスト（L-1〜L-4）GREEN

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| signin-51cf21389c56 (renamed) | 4 | PASS |
| login (new, TDD) | 4 | PASS |
| All tests | 120 | PASS (0 failed) |

## TypeScript

- `npx tsc --noEmit` — saveArticles.test.ts 以外の新規エラー 0 件（PLAN 許容済み）
- 新規作成ファイル (login/*, signin-51cf21389c56/*) に型エラーなし

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 50886f8 | feat | git mv login-51cf21389c56 → signin-51cf21389c56 |
| 417fae1 | test | add failing test for /login sendMagicLinkAction (RED) |
| 0d0fb0b | feat | create /login directory for existing member re-login (GREEN) |

## TDD Gate Compliance

- RED commit: `417fae1` — `test(31-04): add failing test for /login sendMagicLinkAction`
- GREEN commit: `0d0fb0b` — `feat(31-04): create /login directory for existing member re-login`
- REFACTOR: 不要（コードはシンプル、変更なし）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] コメント中の pid/handle 語句を削除**
- **Found during:** Task 2 acceptance criteria 検証
- **Issue:** PLAN acceptance criteria は `grep -c "pid\|handle" src/app/login/actions.ts` が 0 件を要求。初期実装でコメント中に `pid/handle パラメータなし` という語句が含まれていた
- **Fix:** コメントを `クエリパラメータなし` に変更（意味は同じ）
- **Files modified:** src/app/login/actions.ts

**2. [Rule 3 - Blocking] .next/types/validator.ts の stale キャッシュ**
- **Found during:** Task 3 TypeScript チェック
- **Issue:** `.next/types/validator.ts` が git mv 前の `login-51cf21389c56/page.js` を参照して TS2307 エラー
- **Fix:** `rm -rf .next/types` でキャッシュクリア後、再チェックでエラー解消
- **Files modified:** なし（キャッシュ削除のみ）

## Threat Surface Scan

T-31-G02 の mitigation として `/login` の `callbackUrl` は `/auth/callback` のみ（クエリパラメータなし）に設定済み。callback route の既存 open redirect 対策（`nextParam.startsWith('/')` チェック）は影響を受けない。新たな trust boundary は追加されていない。

## Self-Check: PASSED

- [x] src/app/signin-51cf21389c56/ 存在確認
- [x] src/app/login/ 存在確認（4 ファイル）
- [x] src/app/login-51cf21389c56/ 存在しないこと確認
- [x] コミット 50886f8, 417fae1, 0d0fb0b 存在確認
- [x] 全テスト 120 件 PASS
- [x] TypeScript 新規エラー 0 件
