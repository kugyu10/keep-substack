---
phase: 36-qa-uat
plan: 03
subsystem: testing
tags: [uat, manual-testing, production, supabase, magic-link, substack-handle]

requires:
  - phase: 27-substack-handle-db
    provides: substack_handle カラム / @handle 入力・保存 / プロフィールリンク / Magic Link ?handle= 伝播の実装
  - phase: 36-qa-uat (36-01)
    provides: TEST project 自動回帰 spec（e2e/27-handle.spec.ts）— #2-#5 の補助レイヤー
provides:
  - 本番（keep-substack.com）での Phase 27 UAT 6 シナリオ #1-#6 全 PASS の手動結果記録（SC#1 充足）
  - 27-HUMAN-UAT.md / 27-VERIFICATION.md の in-place 更新（status: passed / verified）
  - Magic Link 入口の訂正記録（/login → signin ルート）
affects: [phase-36-04, v1.8-go-no-go]

tech-stack:
  added: []
  patterns:
    - "本番手動 UAT を主結果・TEST 自動 spec を補助レイヤーとする二層検証記録（D-05）"
    - "検証で変更した本番データを自分の行限定で復元するデータ衛生（D-04）"

key-files:
  created:
    - .planning/phases/36-qa-uat/36-03-SUMMARY.md
  modified:
    - .planning/phases/27-substack-handle-db/27-HUMAN-UAT.md
    - .planning/phases/27-substack-handle-db/27-VERIFICATION.md

key-decisions:
  - "本番 UAT 6 シナリオ #1-#6 すべてが本番（keep-substack.com / prod xolhjcngrwwwqtklmoyk）で PASS — テストアカウント kugyu10@gmail.com 使用"
  - "#6 Magic Link の入口を /login-51cf21389c56 → signin-51cf21389c56 に訂正（チェックリストの取り違え、src バグではない）"
  - "#6/全体の前提として D-06 Redirect URL 修正（新ドメイン keep-substack.com 許可）を明記"
  - "fail 0 件のため D-10 バグ化は該当なし（全 pass・bug capture 不要）"

patterns-established:
  - "本番手動結果を主・自動 spec を補助とする二層記録で SC#1（本番充足）を自動 spec で代替しない（D-05）"

requirements-completed: [QA-01, QA-02]

duration: ~10min
completed: 2026-06-08
---

# Phase 36 Plan 03: 本番手動 UAT 実行 + Phase 27 検証 .md in-place 更新 Summary

**本番（keep-substack.com / Supabase prod）で Phase 27 UAT 6 シナリオ #1-#6 を開発者自身が一巡し全 PASS、27-HUMAN-UAT.md / 27-VERIFICATION.md を実結果で in-place 更新（D-09）**

## Performance

- **Duration:** ~10 min（継続 executor 分。本番手動実行は別途開発者が実施）
- **Started:** 2026-06-08（継続セッション）
- **Completed:** 2026-06-08
- **Tasks:** 4（Task 1/2 は前 executor で human checkpoint 完了、Task 3/4 を本継続で実行）
- **Files modified:** 2（Phase 27 正典 .md）

## Accomplishments

- 本番 https://keep-substack.com（Supabase prod `xolhjcngrwwwqtklmoyk`）で Phase 27 UAT 6 シナリオ #1-#6 を開発者自身がテストアカウント `kugyu10@gmail.com` で一巡し **全 6 シナリオ PASS**（SC#1 充足）。
- 27-HUMAN-UAT.md を in-place 更新: status `partial → passed`、6 シナリオの result `[pending] → [pass]`、Summary `passed:6 / pending:0`、Current Test を完了状態に。
- 27-VERIFICATION.md を in-place 更新: status `human_needed → verified`、6 件の Human Verification に本番 PASS を記録（#2-#5 は本番手動=主 + 36-01 自動 spec=補助の二層、D-05）。
- #6 の入口を `/login` → **signin ルート** に訂正記録（チェックリストの取り違え、src バグではない）。D-06 Redirect URL 修正を #6/全体の前提として明記。
- fail 0 件のため D-10 バグ化は該当なしと記録（全 pass・bug capture 不要）。

## Task Commits

1. **Task 1: 本番 Redirect URL 事前チェック（D-06）** — 前 executor の human-action checkpoint で完了（開発者が Supabase Dashboard で新ドメイン許可を確認・修正、コミット対象なし）
2. **Task 2: 本番 6 シナリオ手動実行（QA-01）** — 前 executor の human-verify checkpoint で完了（開発者が本番ブラウザ + テストアカウントで #1-#6 一巡、全 PASS、コミット対象なし）
3. **Task 3 + Task 4: Phase 27 .md in-place 更新 + バグ化判定** — 本継続でコミット（docs、下記メタコミットに含む）

**Plan metadata:** （final commit、docs: complete plan）

_Note: 本プランは src/ 無変更の検証・記録プラン。Task 1/2 は人間手動実行のためコード commit なし。_

## Files Created/Modified

- `.planning/phases/27-substack-handle-db/27-HUMAN-UAT.md` — frontmatter status `passed` / updated 2026-06-08、#1-#6 全 result `[pass]`、Summary passed:6/pending:0、Current Test 完了記述、Gaps に全 pass・#6 入口訂正・bug capture 不要を記録
- `.planning/phases/27-substack-handle-db/27-VERIFICATION.md` — frontmatter status `verified`、本文 Human Verification #1-#6 に本番 PASS 記録（#2-#5 二層、#6 signin 入口訂正 + D-06 前提、#3 Drift D-A 追従注記）、Gaps Summary 更新
- `.planning/phases/36-qa-uat/36-03-SUMMARY.md` — 本サマリー（新規）

## Decisions Made

- **#6 Magic Link 入口訂正:** `?handle=` を消費するのは signin ルート（`src/app/(auth)/signin-51cf21389c56/page.tsx` → `LoginForm` → `src/app/my/page.tsx`）であり `/login` ではない。チェックリストの入口記載誤りを訂正のうえ正しい入口で PASS。src バグではない。
- **二層検証記録（D-05）:** #2-#5 は本番手動 PASS を主たる結果、36-01 の TEST project 自動 spec（`e2e/27-handle.spec.ts` 4 テスト green）を durable な補助証拠として併記。自動 spec の green を本番結果の代替にしない。
- **データ衛生（D-04）:** テストアカウント `kugyu10@gmail.com` の行のみ操作し、検証後 `substack_handle` を NULL に復元（#5 は read-only のため SQL Editor の自分の id 限定 UPDATE）。他メンバー行は未接触。
- **Drift D-A 追従:** #3 は handle 設定後 read-only（`MyProfileForm.tsx:52`）の挙動どおり read-only `<p>` 表示で検証が追従（仕様追従であり修正対象ではない）。

## Deviations from Plan

### テスト定義訂正（src 変更なし・記録上の訂正）

**1. [Rule 1 系 — テスト定義訂正] #6 Magic Link の入口記載誤りを訂正**
- **Found during:** Task 2（本番手動実行、開発者報告）/ Task 3（記録時に反映）
- **Issue:** 前 executor のチェックリストは `?handle=` 伝播の入口を `/login-51cf21389c56/` と記載していたが、実装上 `?handle=` を消費するのは signin ルート。`/login` 側は handle を読まない。
- **Fix:** 正しい入口 `https://keep-substack.com/signin-51cf21389c56/?handle=hoge` で実行し PASS。27-HUMAN-UAT.md #6 / 27-VERIFICATION.md #6 に訂正注記を記録。
- **Files modified:** 27-HUMAN-UAT.md, 27-VERIFICATION.md
- **Verification:** 本番で /my?handle=hoge 着地 + handle NULL 時の "hoge" pre-fill を確認
- **備考:** src コードのバグではなく、検証チェックリストの入口記載誤りの訂正。src/ は無変更。

---

**Total deviations:** 1（テスト定義の訂正、src 影響なし）
**Impact on plan:** プランの意図（6 シナリオ本番 PASS + in-place 記録）は完全充足。訂正は記録上のものでスコープクリープなし。

## Issues Encountered

- なし。本番手動 UAT は全 6 シナリオ PASS。D-06 Redirect URL 前提も開発者が事前に充足済み。

## User Setup Required

None — 本プランは検証・記録のみ。外部サービス設定の追加要件なし（D-06 Redirect URL は本プラン Task 1 で開発者が確認・修正済み）。

## Next Phase Readiness

- QA-01（本番 UAT）/ QA-02 が SC#1 を充足（#1-#6 全本番 PASS、#2-#5 を自動 spec で代替していない）。
- Phase 27 の正典 .md（27-HUMAN-UAT.md / 27-VERIFICATION.md）が verified/passed に確定 — v1.8 go/no-go 判定（D-11）の材料が揃った。
- 36-04（28/29 VERIFICATION.md in-place 更新）へ進行可能。

## Self-Check: PASSED

- FOUND: .planning/phases/36-qa-uat/36-03-SUMMARY.md
- FOUND: 27-HUMAN-UAT.md pending count == 0 / pass count == 6
- FOUND: 27-VERIFICATION.md status: verified

---
*Phase: 36-qa-uat*
*Completed: 2026-06-08*
