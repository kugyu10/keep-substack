---
phase: 36-qa-uat
verified: 2026-06-08T00:00:00Z
status: human_needed
score: 5/5 truths verified（ただし SC#5 は条件付き — 下記 human_verification / 警告参照）
overrides_applied: 0
human_verification:
  - test: "Phase 36 コードレビュー（36-REVIEW.md）の CRITICAL 3 件（CR-01/CR-02 ISR flaky / CR-03 本番 Supabase 誤書き込みリスク）を許容するか、修正フェーズを起こすかを判断する"
    expected: "ship-decision の前に、自動回帰 spec（28 #2 / 29 #1 / 27 #4-#5 の automate pass 根拠）が ISR キャッシュ起因で false green/false red になりうる構造的欠陥、および reuseExistingServer による本番 community データ破壊リスクを開発者が認識し、accept（go/no-go に記録）または fix の判断を下す"
    why_human: "REVIEW.md は issues_found（critical:3）のまま修正コミットが存在しない。これらは本番手動 UAT（36-03、Phase 27）で独立に裏付けられた SC#1 には影響しないが、Phase 28/29 VERIFICATION が引用する『automate pass』証拠の durable 性に直結する設計判断であり、人間の go/no-go 判断が必要"
  - test: "v1.8 milestone close 判定（SC#5）に対し、Phase 33 / Phase 35 が status: human_needed のまま残っている本番環境確認項目を accept するか実施するかを判断する"
    expected: "SC#5『v1.8 全フェーズの success criteria がすべて満たされている』に対し、Phase 33（新規メンバー RSS 即時取得の本番動作 / replace_member_commit_slots の本番存在 / 本番 /my リダイレクト）と Phase 35（本番 gtag/js リクエスト / GA4 リアルタイム計測）の未確認 human 項目を、milestone close の go/no-go で明示的に accept するか本番で確認する"
    why_human: "Phase 36 のスコープは Phase 27/28/29 のみ（4 プラン）であり、Phase 33/35 の human 項目は Phase 36 では harvest/解消されていない。本番外部サービス依存のため確認には人間操作が必要。SC#5 が『milestone close 判定ができる』を満たすには、これらの残項目を accept として記録する必要がある"
---

# Phase 36: QA・UAT・検証ギャップ解消 検証レポート

**Phase Goal:** Phase 27-29 で積み残されていた human UAT シナリオと VERIFICATION.md の未検証項目がすべて完了し、v1.8 出荷判定が可能な状態になっている
**Verified:** 2026-06-08T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | Phase 27 の human UAT 6 シナリオがすべて本番環境で実行・パスしている | ✓ VERIFIED | `27-HUMAN-UAT.md` frontmatter `status: passed`、Summary `total:6 / passed:6 / pending:0 / issues:0`。#1-#6 すべて `result: [pass]` で本番（https://keep-substack.com / prod xolhjcngrwwwqtklmoyk）の結果を主たる証拠として記録。テストアカウント kugyu10@gmail.com。#6 は入口を signin ルートに訂正のうえ PASS（src バグではない）。検証後 substack_handle を NULL 復元（D-04） |
| 2 | Phase 27 VERIFICATION.md の未解決ギャップが解消され記録されている | ✓ VERIFIED | `27-VERIFICATION.md` frontmatter `status: verified`、score 10/10。`### Human Verification Required → RESOLVED (本番 6/6 PASS, 2026-06-08)`。#2-#5 は本番手動=主 + 36-01 自動 spec=補助の二層（D-05）。Gaps Summary に残ギャップなしと記録 |
| 3 | Phase 28 VERIFICATION.md の未解決ギャップが解消され記録されている | ✓ VERIFIED | `28-VERIFICATION.md` frontmatter `status: verified`、score 14/14、`resolved_by: Phase 36 Plan 04`。#1 = Phase 32（DB-02 Complete）への resolved-by-reference（D-07/D-08、再検証なし — これは正当な closure）、#2 = `e2e/28-commit-flow.spec.ts` automate pass、Observable Truth #14 を RPC（Drift D-B）前提に VERIFIED へ更新 |
| 4 | Phase 29 VERIFICATION.md の未解決ギャップが解消され記録されている | ✓ VERIFIED | `29-VERIFICATION.md` frontmatter `status: verified`、score 7/7、`resolved_by: Phase 36 Plan 04`。#1 = `e2e/29-mobile.spec.ts` automate pass、#2 = 構造 automate + 36-03 本番目視の二層、#3 = `e2e/29-layout-nav.spec.ts` automate pass（Drift D-C: /weekly-stamp → /daily リネーム追従）。29-HUMAN-UAT.md 無編集（D-07） |
| 5 | v1.8 全フェーズの success criteria がすべて満たされており milestone close 判定ができる | ✓ VERIFIED（条件付き — 下記警告 + human_verification 参照） | Phase 27/28/29 = verified、Phase 32/34 = passed、Phase 36 = 自動レイヤー + 本番手動 UAT 完了。**ただし** Phase 33/35 = `human_needed`（本番外部依存の未確認項目あり）、かつ Phase 36 自身の 36-REVIEW.md が critical:3 未修正。これらを accept すれば「判定ができる」状態には到達するが、無条件 PASS ではなく go/no-go で明示的判断が必要 |

**Score:** 5/5 truths verified（SC#1-4 は無条件 VERIFIED。SC#5 は残項目の accept 判断を要するため human_needed に分類）

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `e2e/27-handle.spec.ts` | Phase 27 #2-#5 の logged-in DB round-trip 回帰 spec | ✓ VERIFIED | 118 行、4 テスト（#2/#3/#4/#5）。`resolveTestMemberId` + `createTestAdmin` + member_id スコープ afterEach（NULL 復元）。real DB round-trip（expect.poll）、no mocking。stub なし |
| `e2e/28-commit-flow.spec.ts` | Phase 28 #2 スケジュール宣言フルフロー spec | ✓ VERIFIED | 124 行、RPC 前提スモーク（ranRpcSmoke ガード）+ フルフローテスト。`member_commit_slots` count==2 を expect.poll でブラックボックス往復検証。afterEach で member_id スコープ delete |
| `e2e/29-mobile.spec.ts` | 375px viewport で hidden sm:flex 縮退検証 | ✓ VERIFIED | 79 行。mobile-375 project。week-0/1 toBeHidden + week-2 toBeVisible。beforeAll seed + afterAll member_id スコープ delete |
| `e2e/29-layout-nav.spec.ts` | 3列構造 + /daily ナビ検証 spec（anonymous project） | ✓ VERIFIED | 40 行、2 テスト。`a[href^="/member/"]` 構造存在 + `/daily` ナビ。冒頭に Drift D-C リネーム注記コメントあり。読み取り専用 |
| `playwright.config.ts` | logged-in testMatch に 27/28 追加 + anonymous に 29-layout-nav + mobile-375 project | ✓ VERIFIED | grep count 5（27-handle / 28-commit / 29-mobile / 29-layout / mobile-375）。mobile-375 project（viewport 375x800）定義済み |
| `27-HUMAN-UAT.md` | #1-#6 result + Summary + status:passed | ✓ VERIFIED | status:passed / passed:6 / pending:0 |
| `27-VERIFICATION.md` | status: verified + 本番 pass 記録 | ✓ VERIFIED | status:verified、6 件すべて RESOLVED |
| `28-VERIFICATION.md` | status: verified + #1 resolved-by-reference / #2 automate | ✓ VERIFIED | status:verified、14/14 |
| `29-VERIFICATION.md` | status: verified + 3 項目 pass + /daily 注記 | ✓ VERIFIED | status:verified、7/7、/daily count 確認 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `e2e/27-handle.spec.ts` | members テーブル | createTestAdmin で seed/assert/cleanup | WIRED | `createTestAdmin` import + member_id スコープ afterEach 確認 |
| `e2e/28-commit-flow.spec.ts` | member_commit_slots テーブル | expect.poll で count==2 + afterEach delete | WIRED | `member_commit_slots` count 検証 + RPC 前提スモーク |
| `e2e/29-mobile.spec.ts` | CommitGrid の hidden sm:flex 週ブロック | mobile-375 viewport で toBeHidden/toBeVisible | WIRED | `div.flex.flex-1.gap-2 > div` の nth 検証（⚠ WR-05: クラス組合せ依存の脆いセレクタ） |
| `e2e/29-layout-nav.spec.ts` | ViewTabs / src/app/daily/page.tsx | anonymous で href=/daily ナビ検証 | WIRED | `/daily` route 実在確認（src/app/daily/page.tsx）、/weekly-stamp は削除済み、ViewTabs href='/daily' 確認 |
| `36-04` 自動 spec pass | 28/29-VERIFICATION.md | automate 結果を in-place 記録 | WIRED | 両 VERIFICATION が status:verified + spec 名を引用 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 4 spec ファイルの実在 + 実質性 | `wc -l e2e/{27,28,29}*.spec.ts` | 118/124/79/40 行、全て実アサーション・real DB round-trip | ✓ PASS |
| playwright.config の project 割り当て | `grep -c "27-handle\|28-commit\|29-mobile\|29-layout\|mobile-375"` | 5（>= 5） | ✓ PASS |
| /daily route 実在（Drift D-C 追従） | `ls src/app/daily/page.tsx` / `ls src/app/weekly-stamp/page.tsx` | /daily 実在、/weekly-stamp 不在、ViewTabs href='/daily' | ✓ PASS |
| spec 7 コミット実在 | `git log --grep 36` | 7b7220f/802e229/fe841b2/b8e8d2d/9182e9e/677c462/d446579 全実在 | ✓ PASS |
| QA-01..04 REQUIREMENTS 整合 | `grep QA-0 REQUIREMENTS.md` | 全 4 件 [x] / Phase 36 / Complete | ✓ PASS |
| spec の実 green 実行（本番ビルド + TEST project） | `npx playwright test`（要 build+start 180s+） | 未実行（CR-03 split-brain リスク + 高コスト。静的検証で十分判断可） | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| QA-01 | 36-03 | Phase 27 human UAT 6 シナリオを本番環境で検証 | ✓ SATISFIED | 27-HUMAN-UAT.md 6/6 pass（本番手動）。REQUIREMENTS.md [x] / Complete |
| QA-02 | 36-01, 36-03 | Phase 27 VERIFICATION.md のギャップ解消 | ✓ SATISFIED | 27-VERIFICATION.md verified + 27-handle.spec.ts 補助レイヤー |
| QA-03 | 36-01, 36-04 | Phase 28 VERIFICATION.md のギャップ解消 | ✓ SATISFIED | 28-VERIFICATION.md verified（#1 resolved-by-ref / #2 automate） |
| QA-04 | 36-02, 36-04 | Phase 29 VERIFICATION.md のギャップ解消 | ✓ SATISFIED | 29-VERIFICATION.md verified（#1/#3 automate / #2 二層） |

オーファン要件なし。QA-01..04 はすべて Phase 36 プランの requirements フィールドに claim され、REQUIREMENTS.md でも Phase 36 / Complete にマップされている。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `playwright.config.ts` | 67 | `ADMIN_PASSWORD ?? 'test'` 弱いデフォルト | ℹ️ Info | TEST project 限定。IN-01（REVIEW）で既出 |
| `e2e/*.spec.ts` | — | `resolveTestMemberId` が 3 ファイルに重複 | ℹ️ Info | IN-02（REVIEW）で既出、ドリフト温床 |

debt マーカー（TBD/FIXME/XXX）は spec / config いずれにも無し。スタブ・偽 green の return パターンも無し（全 spec が real DB round-trip + 実アサーション）。

### Human Verification Required（Escalation Gate）

#### 1. Phase 36 自身のコードレビュー CRITICAL 3 件（未修正）の go/no-go 判断

**Test:** 36-REVIEW.md（status: issues_found, critical:3）の以下を accept するか修正フェーズを起こすか判断する。
- **CR-01:** `e2e/27-handle.spec.ts` #4/#5 が admin 直書き → ISR キャッシュ（`/member/[publicationId]` の `revalidate=300`、ソースで確認）された逆前提のルートへ連続 goto し、キャッシュ暖まり次第で false green/false red になる flaky 構造。
- **CR-02:** `e2e/29-mobile.spec.ts` の beforeAll seed が ISR（`/` の `revalidate=300`、ソースで確認）に反映されず flaky。
- **CR-03:** `playwright.config.ts:60` `reuseExistingServer: !process.env.CI` がランタイムガード無しで、誤って本番 env の dev server にアタッチすると **本番 community データ破壊**（handle 上書き / commit slot 削除）に至りうる。
**Expected:** これらは 36-03 本番手動 UAT（Phase 27 = SC#1）には影響しないが、Phase 28 #2 / 29 #1 / 27 #4-#5 の「automate pass」証拠の durable 性に直結する。開発者が accept（go/no-go に記録）または修正の判断を下す。
**Why human:** REVIEW.md 提出後に修正コミットが存在せず、36-REVIEW-FIX プランも無い。設計判断であり人間の go/no-go が必要。

#### 2. SC#5 — v1.8 milestone close に残る Phase 33 / 35 の human 項目

**Test:** SC#5「v1.8 全フェーズの success criteria がすべて満たされている」に対し、`33-VERIFICATION.md`（status: human_needed）と `35-VERIFICATION.md`（status: human_needed）の未確認本番項目を accept するか実施するか判断する。
- Phase 33: 新規メンバー RSS 即時取得の本番動作 / 本番 prod での replace_member_commit_slots 存在 / 本番 Vercel での /my → /login リダイレクト。
- Phase 35: 本番 gtag/js リクエスト発生 / GA4 リアルタイム計測。
**Expected:** これらの残項目を milestone close の go/no-go で明示的に accept として記録すれば SC#5 の「判定ができる」を満たす。
**Why human:** Phase 36 のスコープは Phase 27/28/29 のみ（4 プラン）であり Phase 33/35 の human 項目は Phase 36 で harvest/解消されていない。本番外部サービス依存のため人間操作が必要。

### Gaps Summary

**SC#1-4（Phase 27/28/29 の human UAT + VERIFICATION ギャップ解消）は無条件で達成済み。** これは Phase 36 の中核成果であり、E2E 回帰 spec 4 本（real DB round-trip、stub なし）と本番手動 UAT 6/6 PASS、resolved-by-reference（28 #1 → Phase 32、正当な D-07/D-08 closure）が揃っている。QA-01..04 もすべて記録済み。

**ただし PASS には至らず human_needed。** 理由は 2 点:

1. **Phase 36 自身の deliverable に対する未修正 CRITICAL 3 件**（36-REVIEW.md, status: issues_found）。ISR キャッシュ起因の flaky（CR-01/CR-02、ソースで `revalidate=300` を確認）は、28/29-VERIFICATION が引用する「automate pass」証拠の信頼性を弱める。CR-03 は本番データ破壊リスク。修正コミット・FIX プランとも不在。SC#1（Phase 27）は本番手動 UAT で独立に裏付けられているため致命傷ではないが、go/no-go での明示判断が必要。

2. **SC#5 が無条件には満たせない。** Phase 33・Phase 35 が `status: human_needed` のまま残り、v1.8 全フェーズの success criteria が「すべて満たされている」とは静的に確認できない。これらは Phase 36 のスコープ外だが SC#5 はロードマップ契約として残項目の accept 記録を要する。

いずれも「黙って PASS」にせず、Escalation Gate として開発者の go/no-go 判断に委ねる（status: human_needed）。判断後に accept されれば v1.8 milestone close は成立する。

---

_Verified: 2026-06-08T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
