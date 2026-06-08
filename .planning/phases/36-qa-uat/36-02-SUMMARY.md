---
phase: 36-qa-uat
plan: 02
subsystem: e2e-testing
tags: [playwright, e2e, regression, phase-29, qa-04]
requires:
  - "36-01: playwright.config.ts に mobile-375 project + 29 spec testMatch 割り当て"
  - "TEST Supabase project (otydhiumsdsyxepnjqjp) の seed member"
provides:
  - "e2e/29-mobile.spec.ts: 375px モバイル1週縮退の回帰 spec"
  - "e2e/29-layout-nav.spec.ts: 3列構造 + /daily ナビ回帰 spec"
affects:
  - "QA-04 (Phase 29 VERIFICATION ギャップ) の自動化可能部分を回帰検証可能に"
tech_stack:
  added: []
  patterns:
    - "anonymous project + page.goto（storageState 不要、ログイン不要ページ検証）"
    - "mobile-375 viewport project で Tailwind hidden sm:flex の display:none を toBeHidden 検出"
    - "beforeAll seed + afterAll member_id スコープ delete（truncate 禁止, D-09）"
key_files:
  created:
    - "e2e/29-mobile.spec.ts"
    - "e2e/29-layout-nav.spec.ts"
  modified: []
decisions:
  - "29 #2 はピクセル整列を assert せず構造存在（a[href^=/member/]）のみ自動化、整列は本番手動目視へ委譲（Pitfall 4）"
  - "29 #3 は Drift D-C に従い旧 /weekly-stamp ではなく現行 /daily を対象（src バグではなく後続リネーム追従）"
  - "29-mobile は seed member に commit slot 1 件を独立 seed（28 spec と非競合）し afterAll で復元"
metrics:
  duration: ~6min
  completed: 2026-06-08
---

# Phase 36 Plan 02: 29-mobile / 29-layout-nav 回帰 spec Summary

Phase 29 の視覚/ナビ検証項目（QA-04）のうち自動化可能な振る舞いを、375px viewport project と anonymous project の薄い回帰 spec として追加。src/ は無変更。

## What Was Built

### Task 1: e2e/29-mobile.spec.ts（QA-04, 29 #1）
375px viewport（mobile-375 project）で CommitGrid root `div.flex.flex-1.gap-2` の直下 3 週ブロックを検証。`hidden sm:flex` の week-0/week-1 が `toBeHidden`、`flex flex-1` の week-2 が `toBeVisible`。`/` 上に CommitGrid を持つ行を確実に出すため、`beforeAll` で seed member（TEST.publicationId）に commit slot を 1 件投入し、`afterAll` で member_id スコープ delete して復元（truncate 禁止、28 spec と独立 seed）。storageState 不要の anonymous 同型。

- Commit: b8e8d2d

### Task 2: e2e/29-layout-nav.spec.ts（QA-04, 29 #2構造 / #3ナビ）
anonymous project で 2 テスト:
- #2 構造: `page.goto('/')` → `a[href^="/member/"]` の `.first()` が `toBeVisible`（各行に member link 存在）。ピクセル整列は assert せず構造存在のみ（Pitfall 4）。
- #3 ナビ: `/` で `nav a[href="/daily"]` が `toBeVisible`（ViewTabs デイリータブ）→ `/daily` で All タブ `a[href="/daily"]` とデイリータブ描画を検証。⚠ Drift D-C により旧 `/weekly-stamp` ではなく現行 `/daily` を対象。ファイル冒頭にリネーム注記コメントあり。DB 書き込み無しのため afterEach 不要。

- Commit: 9182e9e

## Verification

- `npx playwright test e2e/29-mobile.spec.ts` → 1 passed（mobile-375 project, viewport 375）
- `npx playwright test e2e/29-layout-nav.spec.ts` → 2 passed（anonymous project）
- 両 spec 同時実行 → 3 passed
- seed restoration: 実行後 seed member の member_commit_slots は 0 行（member_id スコープで復元）
- `git diff --stat src/` 空（src/ 無変更）
- acceptance: `grep -c "/daily" e2e/29-layout-nav.spec.ts` = 14（>= 2）、`/weekly-stamp` はコメント注記のみで locator/goto ターゲットにしていない

## Deviations from Plan

None - plan executed exactly as written.

注: RSS feed の HTTP 404 警告（e2e-test-publication.substack.com / kugyu100.substack.com）が WebServer ログに出るが、これは TEST publication が実 Substack feed を持たないことによる既知ノイズで、レンダリング/検証に影響しない。

## Threat Surface

新規攻撃面なし。29-mobile の seed/cleanup のみ service_role（createTestAdmin）を使い member_id スコープ delete で復元（T-36-04 mitigate）。29-layout-nav は読み取り専用 anonymous spec（T-36-05 mitigate）。パッケージ install 無し（T-36-SC N/A）。

## Self-Check: PASSED

- FOUND: e2e/29-mobile.spec.ts
- FOUND: e2e/29-layout-nav.spec.ts
- FOUND commit: b8e8d2d
- FOUND commit: 9182e9e
