---
phase: 36-qa-uat
plan: 01
subsystem: testing
tags: [playwright, e2e, supabase, rpc, session-injection, regression]

# Dependency graph
requires:
  - phase: 26-e2e-harness
    provides: session-injection ハーネス（mintAuthCookies + storageState + member_id スコープ afterEach）、createTestAdmin、TEST fixtures
  - phase: 27-handle
    provides: /my @handle 描画・保存往復・プロフィールリンクの src 実装（検証対象）
  - phase: 28-commit-flow
    provides: /my スケジュール宣言モーダル（CommitScheduleModal）の src 実装（検証対象）
  - phase: 32-db
    provides: member_commit_slots テーブル本番適用（DB-02）
  - phase: 33-commitslots-upsert
    provides: replace_member_commit_slots RPC（commit slots アトミック保存）
provides:
  - QA-02（Phase 27 #2-#5）の TEST project 自動回帰 spec（e2e/27-handle.spec.ts、4 テスト）
  - QA-03（Phase 28 #2）の /my スケジュール宣言フルフロー自動回帰 spec（e2e/28-commit-flow.spec.ts、RPC 前提 + フルフロー）
  - playwright.config.ts への 27/28/29 spec の project 割り当て + mobile-375 project 定義
affects: [36-03-manual-uat, 29-mobile, 29-layout-nav]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPC 前提 fail-fast スモーク（タイトルにリテラル `RPC 前提` 固定 + ranRpcSmoke フラグ + afterAll ガードで no-tests-run の false green を防止）"
    - "RPC 往復のブラックボックス検証（member_commit_slots の count を expect.poll、内部 delete+insert vs RPC に非依存）"

key-files:
  created:
    - e2e/27-handle.spec.ts
    - e2e/28-commit-flow.spec.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "Playwright 1.60 は --fail-on-empty 未サポートのため、spec 内 ranRpcSmoke フラグ + test.afterAll(expect) で等価の fail-fast を実装"
  - "TEST project（otydhiumsdsyxepnjqjp）に replace_member_commit_slots RPC を SQL Editor 経由で適用（テスト環境 readiness。本番 xolhjcngrwwwqtklmoyk には未接触）"
  - "commit slots 保存は RPC（actions.ts、Drift Alert D-B）のためブラックボックス往復で count==2 を検証し内部実装に非依存とした"
  - "@handle は設定後 read-only（Drift Alert D-A）のため afterEach で substack_handle を NULL 復元し再実行で input が再描画される前提を満たす"

patterns-established:
  - "RPC 前提 fail-fast スモーク: スキーマ依存テストの前提を別テストで先に検証し、タイトル固定 + 実行ガードでフィルタ false green を防ぐ"
  - "session-injection ハーネスへの薄い追加レイヤー: 新仕組みを作らず my-teams.spec.ts の構造（resolveTestMemberId + member_id スコープ afterEach + expect.poll）を 1:1 踏襲"

requirements-completed: [QA-02, QA-03]

# Metrics
duration: 約15分（継続実行分）
completed: 2026-06-08
---

# Phase 36 Plan 01: QA・UAT 自動回帰レイヤー Summary

**Phase 27 #2-#5（@handle 描画/保存往復/プロフィールリンク）と Phase 28 #2（/my スケジュール宣言フルフロー）を、Phase 26 の session-injection Playwright ハーネス上に TEST project 向け durable 回帰 spec として追加。RPC 前提 fail-fast スモークで commit slots スキーマ readiness を保証。**

## Performance

- **Duration:** 約15分（継続実行分。前回 executor 分を除く）
- **Completed:** 2026-06-08
- **Tasks:** 3（うち Task 1/2 は前回 executor、Task 1 acceptance + Task 3 を本継続で完了）
- **Files modified:** 3（27-handle.spec.ts, 28-commit-flow.spec.ts, playwright.config.ts）

## Accomplishments
- Task 1 acceptance 完了: TEST project に `replace_member_commit_slots` RPC が適用済みであることを `RPC 前提` スモークが green で確認（PGRST202 解消）
- Task 3 完了: /my スケジュール宣言フルフロー spec を追加（モーダル開閉 → 頻度変更でスロット増減 → 重複曜日警告＋宣言ボタン無効化 → 宣言保存 → member_commit_slots count==2 を RPC 往復ブラックボックス検証 → reload 後「週2回 —」サマリー表示）
- 28-commit-flow.spec.ts が 2 テスト全 green（RPC 前提 + フルフロー）
- src/ への変更ゼロ（検証フェーズの不変条件を維持）

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: RPC 前提スモーク** - `7b7220f` (test) — 前回 executor。本継続で green 確認し acceptance 完了
2. **Task 2: 27-handle round-trip spec + config project 割り当て** - `802e229` (test) — 前回 executor
3. **Task 3: /my スケジュール宣言フルフロー spec** - `fe841b2` (test) — 本継続

## Files Created/Modified
- `e2e/27-handle.spec.ts` - Phase 27 #2-#5 の logged-in DB round-trip 回帰 spec（4 テスト、前回 executor）
- `e2e/28-commit-flow.spec.ts` - RPC 前提スモーク + Phase 28 #2 スケジュール宣言フルフロー spec
- `playwright.config.ts` - logged-in に 27/28 spec、anonymous に 29-layout-nav、mobile-375 project（375px viewport）追加（前回 executor）

## Decisions Made
- Playwright 1.60 が `--fail-on-empty` を解さないため、`ranRpcSmoke` フラグ + `test.afterAll(() => expect(ranRpcSmoke).toBe(true))` で「RPC 前提 テストが実際に 1 件以上走った」ことを保証（acceptance の等価 fallback）
- commit slots 保存は RPC（Drift Alert D-B）のため、`member_commit_slots` の行数のみをブラックボックス検証し内部実装（delete+insert vs RPC）に非依存とした
- makeDefaultSlots の hour=8 を利用し、frequency=2 で曜日を月/水に設定 → サマリー「週2回 — 月曜 8:00、水曜 8:00」が `/週2回 —/` にマッチすることを DOM 契約直読で確認

## Deviations from Plan

None - plan executed exactly as written.

（ヒューマンアクション・チェックポイント1件は計画フロー上のもの。詳細は下記参照。）

## Issues Encountered
- **RPC 未適用ブロッカー（human-action チェックポイントとして解決）:** 前回 executor 実行時、TEST project に `replace_member_commit_slots` RPC が未適用で `RPC 前提` テストが PGRST202 で fail。human-action チェックポイントで停止し、ユーザーが TEST project（otydhiumsdsyxepnjqjp）の Supabase SQL Editor 経由で RPC を適用。本継続実行で再実行し green を確認した。本番 project（xolhjcngrwwwqtklmoyk）には未接触。
- WebServer ログに外部 Substack feed の HTTP 404 リトライが出るが、これは seed publication のダミー feed フェッチであり TEST 結果に影響しない。

## User Setup Required
None - no external service configuration required（RPC 適用は上記チェックポイントで完了済み）。

## Next Phase Readiness
- 自動回帰レイヤー（D-01 自動側）が完成。SC#1 の本番充足は 36-03 手動 UAT が担保する（D-04）
- Phase 36 残りプラン（29-mobile / 29-layout-nav spec 実装、検証 .md の in-place 更新、本番手動 UAT）へ進行可能
- playwright.config.ts は本プランが唯一の owner として 4 spec + mobile-375 project を確定済み（後続プランは config を再編集不要、spec 本体のみ実装すればよい）

## Self-Check: PASSED

- Files: e2e/27-handle.spec.ts, e2e/28-commit-flow.spec.ts, playwright.config.ts, 36-01-SUMMARY.md すべて存在
- Commits: 7b7220f, 802e229, fe841b2 すべて存在
- playwright.config.ts の 4 spec + mobile-375 grep count = 5（>=5 を満たす）

---
*Phase: 36-qa-uat*
*Completed: 2026-06-08*
