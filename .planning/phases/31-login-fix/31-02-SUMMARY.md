---
phase: 31-login-fix
plan: 02
subsystem: auth
tags: [magic-link, server-action, callback, validation, tdd]

requires:
  - "31-01: members.substack_handle UNIQUE 制約が存在する"
provides:
  - "sendMagicLinkAction が pid/handle 欠落時に 登録リンクが不正です を返す (D-01)"
  - "auth/callback が pid 未一致時に新規 member を INSERT する (D-02)"
  - "callback の 23505 フォールバック INSERT (substack_handle=null) が機能する (D-02/D-05)"
  - "callback のリダイレクト先が /my に変更された（handle= パラメータ廃止）"
  - "updateMyProfileAction が 23505 時に このハンドルはすでに使用されています を返す (D-05)"
  - "LoginForm エラー <p> に role="alert" が追加された (UI-SPEC)"
affects: [31-03]

tech-stack:
  added: []
  patterns:
    - "TDD RED→GREEN: テストファイル先行作成 → 実装で全 GREEN"
    - "Supabase admin insertPayload + 23505 フォールバック INSERT パターン"
    - "Server Action 早期リターン: !pid || !handle → 登録リンクが不正です"

key-files:
  created:
    - src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts
  modified:
    - src/app/login-51cf21389c56/actions.ts
    - src/app/login-51cf21389c56/LoginForm.tsx
    - src/app/auth/callback/route.ts
    - src/app/auth/__tests__/callback.test.ts
    - src/app/my/actions.ts
    - src/app/my/__tests__/updateMyProfileAction.test.ts

key-decisions:
  - "D-01: pid または handle が空の場合は callbackUrl 生成前に即 return — 不完全なリンクから Magic Link を送れないことを Server Action レイヤーで保証"
  - "D-02: callback INSERT ペイロードの name フィールドには pid 値を仮置き — ユーザーが /my から後で変更できる"
  - "D-02: INSERT 後のリダイレクトを /my に変更 — substack_handle は DB 保存済みのため handle= パラメータ不要"
  - "D-05: 23505 チェックは既存の updateError || !member チェックより先に配置 — より具体的なエラーを先に処理する原則に従う"

patterns-established:
  - "insertError?.code === '23505' で unique 違反を検出し substack_handle=null でフォールバック INSERT する Supabase パターン"

requirements-completed:
  - AUTH-FIX-01

duration: ~3min
completed: 2026-06-05
---

# Phase 31 Plan 02 Summary

**Magic Link 認証バックエンド 3 箇所を修正 — D-01 pid/handle バリデーション、D-02 callback 新規 member INSERT、D-05 23505 ハンドリング**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-06-05
- **Tasks:** 3 (全て auto + TDD)
- **Files modified:** 6 src (1 新規テスト + 2 実装 + 2 テスト拡張 + 1 UI)

## Accomplishments

- `sendMagicLinkAction` に D-01 バリデーション追加: `!pid || !handle` で `登録リンクが不正です` 早期リターン
- `LoginForm.tsx` エラー表示に `role="alert"` 追加 + 送信完了 heading を `font-semibold` に修正 (UI-SPEC 準拠)
- `auth/callback/route.ts` に D-02 ロジック追加: member 未存在時に `publication_id/name/user_id/substack_handle` で INSERT
- callback 23505 フォールバック: `substack_handle=null` で再 INSERT (D-05 サイレント処理)
- callback リダイレクト先を `/my` に変更 (handle= パラメータ廃止)
- `my/actions.ts` に D-05 ハンドリング追加: `updateError.code === '23505'` → `このハンドルはすでに使用されています`
- 全 111 テスト GREEN (TDD RED→GREEN サイクルで実装)

## Task Commits

1. **Task 1: TDD RED** — `13e9101` — sendMagicLinkAction.test.ts 新規作成 (Test 1/2 RED, Test 3/4 GREEN)
2. **Task 2: TDD GREEN** — `a0e368e` — D-01 実装 + LoginForm role="alert" (全 4 テスト GREEN)
3. **Task 3: TDD RED** — `3e32402` — callback.test.ts + updateMyProfileAction.test.ts テスト追加
4. **Task 3: TDD GREEN** — `180018d` — D-02/D-05 実装 (全 111 テスト GREEN)

## Files Created/Modified

- `src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts` — 新規: D-01 バリデーション 4 テスト
- `src/app/login-51cf21389c56/actions.ts` — D-01: pid/handle バリデーション + callbackUrl 単一形式化
- `src/app/login-51cf21389c56/LoginForm.tsx` — role="alert" 追加 + font-semibold 修正
- `src/app/auth/callback/route.ts` — D-02: member INSERT + 23505 フォールバック + /my リダイレクト
- `src/app/auth/__tests__/callback.test.ts` — 既存テスト更新 + Test A/B/C 追加
- `src/app/my/actions.ts` — D-05: 23505 チェック追加
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — Test D 追加

## Decisions Made

- pid または handle が空の場合は callbackUrl 生成前に即 return — 不完全なリンクから Magic Link を送れないことを Server Action レイヤーで保証
- callback INSERT 後のリダイレクトを /my に変更 — substack_handle は DB 保存済みのため handle= パラメータ不要
- 23505 チェックは既存の updateError || !member チェックより先に配置 — より具体的なエラーを先に処理する原則に従う

## Deviations from Plan

なし — プラン通りに実行。TDD RED→GREEN サイクルを完全に遵守した。

callback.test.ts の既存テスト `redirects to /my?handle=hoge` は D-02 の仕様変更（handle= パラメータ廃止）により期待値を更新した。これはプランの指示通りの変更（PLAN line 208）であり、deviation ではない。

## Known Stubs

なし — 全ての実装はプランに定義された仕様を完全に実装済み。

## Threat Surface Scan

T-31-03, T-31-04, T-31-05, T-31-06, T-31-07 (plan threat model に定義済み) を全て対応済み:
- T-31-03: INSERT 時に user_id を同時設定 → 作成直後からオーナーに紐付く
- T-31-04: D-01 バリデーション実装済み
- T-31-05: 23505 フォールバック INSERT 実装済み
- T-31-06: `.eq('user_id', user.id)` で自分の行のみ UPDATE (既存、変更なし)
- T-31-07: accept 済み (公開情報)

新規のネットワークエンドポイント・auth パス・スキーマ変更なし。

## Self-Check

File existence:
- [x] src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts
- [x] src/app/login-51cf21389c56/actions.ts (modified)
- [x] src/app/login-51cf21389c56/LoginForm.tsx (modified)
- [x] src/app/auth/callback/route.ts (modified)
- [x] src/app/auth/__tests__/callback.test.ts (modified)
- [x] src/app/my/actions.ts (modified)
- [x] src/app/my/__tests__/updateMyProfileAction.test.ts (modified)

Commit existence:
- [x] 13e9101 (TDD RED task 1)
- [x] a0e368e (TDD GREEN task 2)
- [x] 3e32402 (TDD RED task 3)
- [x] 180018d (TDD GREEN task 3)

Test results: 111 passed / 0 failed

## Self-Check: PASSED

---
*Phase: 31-login-fix*
*Completed: 2026-06-05*
