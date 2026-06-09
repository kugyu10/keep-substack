---
phase: 29-commit-goal-view
verified: 2026-06-04T08:48:00Z
status: verified
resolved: 2026-06-08T11:29:45Z
resolved_by: Phase 36 Plan 04（QA-04 ギャップ解消、D-09 in-place / Drift D-C 追従）
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "スマホ幅 (375px) で Grid が1週のみ表示されることを確認する"
    expected: "古い2週 (week-0, week-1) が非表示になり、最新週 (week-2) のみ表示される"
    why_human: "hidden sm:flex は CSS-only。vitest はブラウザレンダリングを実行しないため DOM の表示/非表示を検証できない"
    resolution: "automate pass → e2e/29-mobile.spec.ts（Phase 36 Plan 02、mobile-375 viewport project、1 green）。375px で CommitGrid root の week-0/week-1（hidden sm:flex）を toBeHidden、week-2（flex flex-1）を toBeVisible で検証し、Tailwind hidden sm:flex の display:none をブラックボックス検出（本文 #### 1 参照）。"
  - test: "/ (新トップ) でメンバーごとの3列レイアウト (avatar+name / CommitGrid / 空欄) が正しく表示されることを確認する"
    expected: "各行に左カラム(アバター+名前)、中央カラム(CommitGrid または「未コミット」)、右カラム(w-8空白) が揃って表示される"
    why_human: "VIEW-03 の視覚的レイアウト整合性はブラウザでのみ確認可能"
    resolution: "構造 automate pass + 本番目視 pass の二層。構造: e2e/29-layout-nav.spec.ts（Phase 36 Plan 02、anonymous project）が a[href^=/member/] の存在を toBeVisible で検証。ピクセル整列: 36-03 の本番手動ウォークスルー（keep-substack.com / prod、Phase 27 UAT 一巡で全 PASS）の本番目視で補完（Pitfall 4 — 構造のみ自動・整列は本番目視へ委譲）。境界注記は本文 #### 2 参照。"
  - test: "/daily で旧ヒートマップが正常に動作することを確認する（⚠ 旧 /weekly-stamp は Drift D-C により /daily へリネーム済み）"
    expected: "既存の WeeklyHeatmapGrid が /daily で表示され、ViewTabs（コミット＆ゴール / デイリー）と /daily ベースのチームタブが動作する"
    why_human: "CSS・レンダリングの動作確認はブラウザが必要"
    resolution: "automate pass → e2e/29-layout-nav.spec.ts（Phase 36 Plan 02）。⚠ Drift D-C: 旧 /weekly-stamp は現行 /daily へリネーム済み（ViewTabs.tsx / src/app/daily/page.tsx、後続フェーズの意図的リネーム・src バグではない）。spec は / で nav a[href=/daily]（ViewTabs デイリータブ）を toBeVisible → /daily で All タブ a[href=/daily] と WeeklyHeatmapGrid 描画を検証し green（本文 #### 3 参照）。検証文言を /weekly-stamp → /daily に追従更新。"
---

# Phase 29: Commit & Goal View Verification Report

**Phase Goal:** 現トップ（週次ヒートマップ）を `/weekly-stamp` に移動し、新トップにコミット＆ゴールビューを実装する（⚠ 旧 `/weekly-stamp` は Drift D-C により現行 `/daily` へリネーム済み）
**Verified:** 2026-06-04T08:48:00Z
**Status:** verified（2026-06-08 Phase 36 Plan 04 でギャップ解消、D-09 in-place / Drift D-C 追従）
**Re-verification:** No — initial verification + Phase 36 Plan 04 でギャップ解消（automate pass + 36-03 本番目視 + /daily リネーム追従）

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/weekly-stamp` ルートが存在し、旧ヒートマップ (WeeklyHeatmapGrid) が引き続き表示される (VIEW-01) | VERIFIED | `src/app/weekly-stamp/page.tsx` 存在。`WeeklyHeatmapGrid` import + JSX 使用確認。All href=`/weekly-stamp`、チームタブ href=`/weekly-stamp?team=...`。4テスト green |
| 2 | `/` が CommitGoalView を表示し、メンバーごとに1行ある (VIEW-02) | VERIFIED | `src/app/page.tsx` が `CommitGoalView` をインポートし `<CommitGoalView results={results21} slots={...} />` でレンダリング。`createSupabaseAdminClient` + `member_commit_slots` SELECT + 21日フィルタ実装済み |
| 3 | 各行に avatar+name / CommitGrid / Achievement placeholder (w-8) がある (VIEW-03) | VERIFIED | `CommitGoalRow.tsx` が3列レイアウト実装: Column 1 (w-16 sm:w-52 Link), Column 2 (CommitGrid or 未コミット fallback), Column 3 (`w-8 shrink-0` div) |
| 4 | CommitGrid が3週横並びで表示され、週1〜4のメンバーの総横幅が視覚的に同一 (VIEW-04) | VERIFIED | `CommitGrid.tsx` が `flex-1` 週ブロック×3 を実装。静的 COLS_CLASS マップ使用 (Pitfall 2 回避)。9テスト green |
| 5 | 投稿済みスロットにサムネイル、未投稿スロットに曜日名（日本語2文字）が表示される (VIEW-05) | VERIFIED | `CommitGrid.tsx` が `matchArticleToSlot` + `article.thumbnail` で投稿済みセル `<img>` レンダリング。未投稿は `DAY_NAMES[slot.day_of_week]` で月/火/水/木/金/土/日 表示 |
| 6 | コミット未設定メンバーが「未コミット」グレーテキストで表示される (VIEW-06) | VERIFIED | `CommitGoalRow.tsx` L39-42: `slots.length === 0` のとき `<span className="text-sm text-gray-400">未コミット</span>` をレンダリング |
| 7 | スマホ幅で古い2週が `hidden sm:flex` で非表示になる (VIEW-07) | VERIFIED (CSS contract) | `CommitGrid.tsx` L86: week-0 `className="hidden sm:flex flex-1 gap-1"`, L92: week-1 `className="hidden sm:flex flex-1 gap-1 border-l border-gray-200"`, L98: week-2 `className="flex flex-1 gap-1 border-l border-gray-200 sm:border-l-0"`. CommitGrid.test.tsx でクラス存在確認済み。ブラウザ目視確認は Human Verification |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/weekly-stamp/page.tsx` | /weekly-stamp ルート — 旧トップページのコピー | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. WeeklyHeatmapGrid import, href="/weekly-stamp", revalidate=300 |
| `src/lib/types.ts` | CommitSlot 型 + Member.id フィールド | VERIFIED | EXISTS + SUBSTANTIVE. `CommitSlot { member_id, day_of_week, hour }` + `Member.id?: string` エクスポート確認 |
| `src/lib/members.ts` | getMembers() が id を返す | VERIFIED | EXISTS + SUBSTANTIVE. SELECT に `id,` 追加、map() に `id: m.id` 追加 |
| `src/lib/commitUtils.ts` | getWeekDates, matchArticleToSlot, sortMembersForCommitView | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. 3関数エクスポート確認。`isoToJSTDateKey` import使用。13テスト green |
| `src/app/page.tsx` | 新トップページ: CommitGoalView + Supabase member_commit_slots SELECT | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. CommitGoalView/createSupabaseAdminClient/results21/slotsData/revalidate=300 全確認 |
| `src/components/CommitGoalView.tsx` | Server Component: メンバーリストを CommitGoalRow に渡す | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. sortMembersForCommitView + CommitGoalRow per member + slots filter |
| `src/components/CommitGoalRow.tsx` | 1行レイアウト: avatar+name / CommitGrid / achievement placeholder | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. 3列レイアウト + 未コミット分岐 + CommitGrid import |
| `src/components/CommitGrid.tsx` | 3週グリッド: CSS-only レスポンシブ縮退 + セル種別分岐 | VERIFIED | EXISTS + SUBSTANTIVE + WIRED. DAY_NAMES + COLS_CLASS + hidden sm:flex + matchArticleToSlot |
| `src/app/__tests__/page.test.tsx` | CommitGoalView 参照に更新された既存テスト | VERIFIED | CommitGoalView mock + createSupabaseAdminClient mock + findByType(el, CommitGoalView) + slots: CommitSlot[] props check. WeeklyHeatmapGrid mock 削除済み |
| `src/app/weekly-stamp/__tests__/page.test.tsx` | /weekly-stamp ページのスモークテスト | VERIFIED | EXISTS. 4テスト: WeeklyHeatmapGrid render, All link href, team tab hrefs, tab labels |
| `src/components/__tests__/CommitGrid.test.tsx` | VIEW-04/05/06 のユニットテスト | VERIFIED | EXISTS. 9テスト: cell counts, DAY_NAMES, hidden sm:flex CSS contract |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/weekly-stamp/page.tsx` | `WeeklyHeatmapGrid` | import | WIRED | `import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'` + JSX usage `<WeeklyHeatmapGrid results={results} />` |
| `src/lib/members.ts` | supabase members table | `SELECT id, name, publication_id` | WIRED | L8-17: SELECT template literal に `id,` 先頭追加確認 |
| `src/lib/commitUtils.ts` | `src/lib/calendarUtils.ts` | `isoToJSTDateKey` import | WIRED | L1: `import { isoToJSTDateKey } from './calendarUtils'` 確認 |
| `src/app/page.tsx` | `CommitGoalView` | import + props passing | WIRED | `import CommitGoalView` + `<CommitGoalView results={results21} slots={...} />` |
| `src/components/CommitGoalView.tsx` | `CommitGoalRow` | render per member | WIRED | sorted.map → `<CommitGoalRow key=... member=... items=... slots=... imageUrl=... />` |
| `src/components/CommitGoalRow.tsx` | `CommitGrid` | slots.length > 0 branch | WIRED | `<CommitGrid slots={slots} items={items} />` in slots.length > 0 branch |
| `src/components/CommitGrid.tsx` | `src/lib/commitUtils.ts` | `getWeekDates` + `matchArticleToSlot` | WIRED | `import { getWeekDates, matchArticleToSlot } from '@/lib/commitUtils'` + L48-50 week dates computation |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CommitGoalView.tsx` | `results: MemberFeedResult[]`, `slots: CommitSlot[]` | `page.tsx` → `fetchAllFeedsCached` + `admin.from('member_commit_slots')` | Yes — `fetchAllFeedsCached` queries KV+RSS; admin client queries Supabase | FLOWING |
| `CommitGrid.tsx` | `articleDateMap: Map<string, FeedItem[]>` | Built inline from `items` prop using `isoToJSTDateKey` | Yes — derives from MemberFeedResult.items (RSS data) | FLOWING |
| `CommitGrid.tsx` | `week0Dates`, `week1Dates`, `week2Dates` | `getWeekDates(-2/-1/0)` — computes from `Date.now()` + JST offset | Yes — real-time computation | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vitest full suite (88 tests) | `npx vitest run` | 15 test files, 88 tests, 0 failures | PASS |
| TypeScript type check (phase files) | `npx tsc --noEmit` | Only `saveArticles.test.ts` errors (pre-existing, unrelated to Phase 29) | PASS (pre-existing errors excluded) |

### Probe Execution

No probe scripts declared or found for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIEW-01 | 29-01 | Current home page (weekly heatmap) accessible at `/weekly-stamp` | SATISFIED | `src/app/weekly-stamp/page.tsx` exists with WeeklyHeatmapGrid + /weekly-stamp hrefs |
| VIEW-02 | 29-01, 29-02 | New home page (`/`) displays Commit & Goal View with one row per member | SATISFIED | `src/app/page.tsx` renders CommitGoalView with member data + slots |
| VIEW-03 | 29-02 | Each row: `| avatar + name | Commit Grid | Achievement icons |` | SATISFIED | CommitGoalRow three-column flex layout implemented |
| VIEW-04 | 29-02 | Commit Grid spans 3 weeks; total width same for 1–4 weekly commits | SATISFIED | flex-1 week blocks + static COLS_CLASS map |
| VIEW-05 | 29-02 | Posted cells show thumbnail; unposted cells show day name | SATISFIED | matchArticleToSlot + article.thumbnail + DAY_NAMES |
| VIEW-06 | 29-02 | Members with no commit setup show grey `未コミット` | SATISFIED | CommitGoalRow slots.length === 0 branch |
| VIEW-07 | 29-02 | On narrow mobile, Grid collapses to 1-week display | SATISFIED (CSS contract) | hidden sm:flex on week-0/1 confirmed in code + test |

All 7 VIEW requirements are accounted for. No orphaned requirements from REQUIREMENTS.md for Phase 29.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CommitGoalRow.tsx` | 49 | `{/* Column 3: Achievement placeholder (D-09) — Phase 30 will fill this */}` | INFO | Design decision comment, not a debt marker. References `D-09` and Phase 30 — tracked work. The `w-8 shrink-0` empty div is the intentional Phase 29 scope boundary per CONTEXT.md D-09. Not a BLOCKER. |

No TBD, FIXME, or XXX markers in Phase 29 files.
No dynamic Tailwind class generation (`grid-cols-${...}`) found.
No `use client` directives in CommitGoalView, CommitGoalRow, or CommitGrid.

### Human Verification Required → 解消済み（Phase 36 Plan 04、D-09 in-place / Drift D-C 追従）

> 2026-06-08 Phase 36 Plan 04 で、本セクションの 3 項目を automate pass（36-02）+ 36-03 本番目視で解消した（D-09）。依存 spec（36-02、3 green）と 36-03 本番ウォークスルー（全 PASS）に fail が無いため verified に確定（D-10 のバグ化は該当なし）。⚠ 旧 `/weekly-stamp` は Drift D-C により現行 `/daily` へリネーム済み（後続フェーズの意図的リネーム・src バグではない）— #3 の検証文言を `/daily` に追従させた。

#### 1. Mobile Grid Collapse (VIEW-07 runtime) — RESOLVED（automate pass → e2e/29-mobile.spec.ts）

**Status:** ✅ AUTOMATE PASS（Phase 36 Plan 02、mobile-375 project、1 green）
**Evidence:** `e2e/29-mobile.spec.ts` が 375px viewport（mobile-375 project）で `/` を開き、CommitGrid root `div.flex.flex-1.gap-2` 直下の 3 週ブロックを検証: week-0 / week-1（`hidden sm:flex`）を `toBeHidden`、week-2（`flex flex-1`）を `toBeVisible`。Tailwind `hidden sm:flex` の < 640px における `display:none` をブラウザ実描画でブラックボックス検出した（vitest では不可能だった runtime CSS 検証を Playwright で代替）。CommitGrid を持つ行を確実に出すため beforeAll で seed member に commit slot を 1 件投入し afterAll で member_id スコープ delete 復元。

#### 2. Three-Column Row Layout Visual Integrity (VIEW-03) — RESOLVED（構造 automate pass + 36-03 本番目視）

**Status:** ✅ 構造 AUTOMATE PASS + 本番目視 PASS（二層、境界注記あり）
**Evidence（構造・自動）:** `e2e/29-layout-nav.spec.ts`（Phase 36 Plan 02、anonymous project）が `/` で `a[href^="/member/"]` の `.first()` を `toBeVisible` で検証 — 各行に Col1（avatar+name の member link）が存在する構造を自動確認。
**Evidence（ピクセル整列・本番目視）:** ピクセル整列（Col1 avatar+name / Col2 CommitGrid or 未コミット / Col3 空欄の視覚的整列）は **36-03 の本番手動ウォークスルー**（keep-substack.com / prod xolhjcngrwwwqtklmoyk、開発者がテストアカウントで Phase 27 UAT 6 シナリオを一巡し全 PASS）の本番目視で pass を確認。**provenance: 36-03-SUMMARY.md**。
**境界注記（Pitfall 4）:** 自動 spec は構造存在のみを assert し、ピクセル整列は assert しない。視覚的整合は本番目視に委譲（自動と本番目視で半分ずつ充足する二層検証）。

#### 3. /daily Route Functional Check (VIEW-01) — RESOLVED（automate pass → e2e/29-layout-nav.spec.ts、/weekly-stamp → /daily 追従）

**Status:** ✅ AUTOMATE PASS（Phase 36 Plan 02）
**⚠ Drift D-C 追従注記:** 旧 `/weekly-stamp` ルートは現行コードで `/daily` へリネーム済み（`src/components/ViewTabs.tsx` の href + `src/app/daily/page.tsx`）。これは後続フェーズの意図的リネームであり **src のバグではない** — 検証文言を `/weekly-stamp` から `/daily` へ追従させた（修正対象ではなく文言追従、D-09）。タブナビは ViewTabs コンポーネント（href `/`=「コミット＆ゴール」 / `/daily`=「デイリー」）。
**Evidence:** `e2e/29-layout-nav.spec.ts` が `/` で `nav a[href="/daily"]`（ViewTabs デイリータブ）を `toBeVisible` → `/daily` へ遷移し All タブ `a[href="/daily"]` と旧 WeeklyHeatmapGrid 描画を検証し green。旧 `/weekly-stamp` ではなく現行 `/daily` を対象とする（spec 冒頭にリネーム注記コメントあり）。

### Gaps Summary

No blocking gaps found. All 7/7 observable truths are verified in the codebase. All artifacts exist, are substantive, wired, and have data flowing through them.

**2026-06-08 Phase 36 Plan 04 更新:** Human Verification の 3 項目はすべて解消済み — #1（モバイル縮退）と #3（/daily ナビ）は 36-02 の automate pass、#2（3列レイアウト）は構造 automate pass + 36-03 本番目視 pass の二層で充足。⚠ #3 は Drift D-C により旧 `/weekly-stamp` → 現行 `/daily` に検証文言を追従させた（src バグではなく後続リネーム）。依存 spec（36-02、3 green）と 36-03 本番ウォークスルー（全 PASS）に fail が無いため verified に確定（D-10 バグ化は該当なし、D-11 go/no-go 判定材料が揃った）。29-HUMAN-UAT.md は既 resolved(3/3) のため編集していない（D-07）。src/ は無変更。

---

_Verified: 2026-06-04T08:48:00Z_
_Verifier: Claude (gsd-verifier)_
