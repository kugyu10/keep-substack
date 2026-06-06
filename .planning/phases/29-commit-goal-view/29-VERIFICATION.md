---
phase: 29-commit-goal-view
verified: 2026-06-04T08:48:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "スマホ幅 (375px) で Grid が1週のみ表示されることを確認する"
    expected: "古い2週 (week-0, week-1) が非表示になり、最新週 (week-2) のみ表示される"
    why_human: "hidden sm:flex は CSS-only。vitest はブラウザレンダリングを実行しないため DOM の表示/非表示を検証できない"
  - test: "/ (新トップ) でメンバーごとの3列レイアウト (avatar+name / CommitGrid / 空欄) が正しく表示されることを確認する"
    expected: "各行に左カラム(アバター+名前)、中央カラム(CommitGrid または「未コミット」)、右カラム(w-8空白) が揃って表示される"
    why_human: "VIEW-03 の視覚的レイアウト整合性はブラウザでのみ確認可能"
  - test: "/weekly-stamp で旧ヒートマップが正常に動作することを確認する"
    expected: "既存の WeeklyHeatmapGrid が表示され、チームタブが /weekly-stamp ベースのリンクで動作する"
    why_human: "CSS・レンダリングの動作確認はブラウザが必要"
---

# Phase 29: Commit & Goal View Verification Report

**Phase Goal:** 現トップ（週次ヒートマップ）を `/weekly-stamp` に移動し、新トップにコミット＆ゴールビューを実装する
**Verified:** 2026-06-04T08:48:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

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

### Human Verification Required

#### 1. Mobile Grid Collapse (VIEW-07 runtime)

**Test:** Open `/` in Chrome DevTools at 375px viewport width. Inspect the CommitGrid rows.
**Expected:** Only the current week (week-2, rightmost) columns are visible in each member's CommitGrid. Enlarge to >= 640px and verify all 3 weeks appear.
**Why human:** `hidden sm:flex` is CSS-only. vitest RSC inspection does not render CSS or apply media queries. The class attribute is verified to exist in code, but visual absence on mobile must be confirmed in a browser.

#### 2. Three-Column Row Layout Visual Integrity (VIEW-03)

**Test:** Open `/` in a browser and visually inspect each CommitGoalRow.
**Expected:** Each row shows three distinct columns: (1) avatar + member name on the left, (2) the CommitGrid (or 未コミット text) in the center taking up available space, (3) a small empty rightmost column.
**Why human:** CSS flex layout alignment and spacing are not verifiable programmatically with the RSC element-tree inspection pattern used in tests.

#### 3. /weekly-stamp Route Functional Check (VIEW-01)

**Test:** Navigate to `/weekly-stamp` in a browser and click team tabs and the All tab.
**Expected:** The heatmap displays correctly. The All tab navigates to `/weekly-stamp` (not `/`). Team tabs navigate to `/weekly-stamp?team=...`.
**Why human:** Browser navigation behavior and CSS rendering require a running application.

### Gaps Summary

No blocking gaps found. All 7/7 observable truths are verified in the codebase. All artifacts exist, are substantive, wired, and have data flowing through them.

The 3 items in Human Verification are visual/runtime checks (CSS layout, browser behavior) that cannot be assessed with static code analysis. They are required because VIEW-03 and VIEW-07 have visual success criteria per ROADMAP.md.

---

_Verified: 2026-06-04T08:48:00Z_
_Verifier: Claude (gsd-verifier)_
