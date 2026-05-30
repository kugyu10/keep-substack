---
phase: 24-admin-teams-teamname-hidden
verified: 2026-05-30T13:35:00Z
status: human_needed
score: 2/2 must-haves verified
overrides_applied: 0
human_verification:
  - test: "ブラウザで admin ログイン状態で /admin/teams/{hiddenチーム名} にアクセスする（日本語チーム名はそのまま URL に入れる）"
    expected: "チーム名見出し + 週次ヒートマップグリッドが表示される（hidden ステータスでもメンバーが出る）。存在しない/0人チームでは「該当するチームのメンバーがいません」メッセージが表示される"
    why_human: "RSC 単体テストは要素ツリーとフィルタ後 results を検証済みだが、実ブラウザでの実描画・日本語 URL の実エンコード往復・実 DB データでの表示は live 確認が必要"
  - test: "非admin（member ロール）または未ログインのブラウザで /admin/teams/{teamName} にアクセスする"
    expected: "/ にリダイレクトされ、ヒートマップが一切表示されない"
    why_human: "proxy() 単体テストで redirect 応答は確認済みだが、実 middleware 経由のブラウザリダイレクト挙動は live/E2E でのみ確証できる（E2E-03 / Phase 26 で網羅予定）"
deferred:
  - truth: "非admin/未認証アクセスが実ブラウザで / にリダイレクトされる（E2E レベル）"
    addressed_in: "Phase 26"
    evidence: "Phase 26 success criteria 3: '/adminへの未認証アクセスが / にリダイレクトされることのテストが通る'（E2E-03, Playwright）"
---

# Phase 24: /admin/teams/{teamName} hiddenチームビュー Verification Report

**Phase Goal:** 管理者が /admin/teams/{teamName} でhiddenチームの週次ヒートマップビューを確認できる
**Verified:** 2026-05-30T13:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | /admin/teams/{teamName} にアクセスするとそのチームの週次ヒートマップが表示される (VIEW-01) | ✓ VERIFIED | `page.tsx`: `getMembers()` → status非依存・完全一致フィルタ `m.teams.some(t => t.name === teamName)` → `<WeeklyHeatmapGrid results={await fetchAllFeedsCached(filtered)} />`。teamPage.test.tsx 5/5 GREEN（"renders heatmap" で grid 存在 + results 長一致、"filters by exact teamName" で hidden メンバー INCLUDE、"decodes encoded teamName" で日本語 decode 一致を検証）。build で `ƒ /admin/teams/[teamName]` 登録確認 |
| 2   | adminロール以外のユーザーが /admin/teams/{teamName} にアクセスすると / にリダイレクトされる (VIEW-02) | ✓ VERIFIED | `proxy.ts` の `pathname.startsWith('/admin')` + `user.app_metadata?.role !== 'admin'` ゲート + matcher `/admin/:path*` が新ルートを自動カバー。proxy.test.ts 3/3 GREEN（non-admin redirect / unauthenticated redirect → `https://example.com/`、admin pass-through → location なし）。proxy.ts は phase 24 で無変更（最終変更 76e2bcc、pre-24） |

**Score:** 2/2 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | 非admin/未認証アクセスが実ブラウザで / にリダイレクトされる（E2Eレベル） | Phase 26 | Phase 26 success criteria 3: "/adminへの未認証アクセスが / にリダイレクトされることのテストが通る"（E2E-03） |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/app/admin/teams/[teamName]/page.tsx` | Next 16 動的 RSC。teamName完全一致フィルタ → WeeklyHeatmapGrid / 空時メッセージ | ✓ VERIFIED | 36 行。`await params` + `decodeURIComponent` あり。status除外分岐なし。`notFound`/`PrBanner` なし。WIRED: getMembers/fetchAllFeedsCached/WeeklyHeatmapGrid 全 import+使用 |
| `src/app/admin/teams/__tests__/teamPage.test.tsx` | RSC element-tree 5ケーステスト | ✓ VERIFIED | `findByType` 含む。5 `it()`。5/5 GREEN。@/lib モック・実DB非依存 |
| `src/__tests__/proxy.test.ts` | proxy.ts が /admin/teams/{teamName} を既存ゲートでカバーする確認テスト | ✓ VERIFIED | `/admin/teams/` 含む。3 `it()`。3/3 GREEN。@supabase/ssr モック・実Supabase非依存 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| page.tsx | @/lib/members getMembers | `await getMembers()` 全件取得 | ✓ WIRED | line: `const allMembers = await getMembers()`。getMembers は実 Supabase クエリ（members ⋈ member_teams ⋈ teams[status]） |
| page.tsx | @/components/WeeklyHeatmapGrid | results props でフィルタ後フィードを渡す | ✓ WIRED | `<WeeklyHeatmapGrid results={await fetchAllFeedsCached(filtered)} />` |
| page.tsx | @/lib/fetchFeed fetchAllFeedsCached | 空チェック後にフィルタ済みメンバーで呼ぶ | ✓ WIRED | `filtered.length === 0` 分岐の else 内で呼ぶ。空時は呼ばない（テストで `not.toHaveBeenCalled()` 確認） |
| proxy.test.ts | src/proxy.ts proxy() | NextRequest モックして proxy() 直接呼び戻り値 assert | ✓ WIRED | `const res = await proxy(makeRequest())`、status/location assert |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| page.tsx → WeeklyHeatmapGrid | `results` | `fetchAllFeedsCached(filtered)` ← `getMembers()`（実 Supabase select） | ✓ Yes（実DBクエリ起点、静的フォールバックなし） | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| teamPage RSC テスト | `npx vitest run .../teamPage.test.tsx` | Test Files 1 passed, Tests 5 passed | ✓ PASS |
| proxy 認可ゲートテスト | `npx vitest run src/__tests__/proxy.test.ts` | Test Files 1 passed, Tests 3 passed | ✓ PASS |
| 全スイート回帰 | `npx vitest run` | 7 files / 34 tests passed | ✓ PASS |
| Next 16 build + ルート登録 | `npm run build` | Compiled successfully; `ƒ /admin/teams/[teamName]` 登録、Proxy (Middleware) 有効 | ✓ PASS |
| 禁止パターンゲート | `grep -c` on page.tsx | status!=='hidden'=0 / notFound=0 / PrBanner=0 | ✓ PASS |
| proxy.ts 無変更 | `git log -1 -- src/proxy.ts` | 76e2bcc（pre-phase-24）。phase 24 コミットに proxy.ts 不在 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| VIEW-01 | 24-01-PLAN | /admin/teams/{teamName} でhiddenチームの週次ヒートマップビューが表示される | ✓ SATISFIED | page.tsx 実装 + teamPage.test 5/5 + build ルート登録 |
| VIEW-02 | 24-02-PLAN | /admin/teams/{teamName} はadminロールのユーザーのみアクセスできる（proxy.tsで制御） | ✓ SATISFIED | 既存 proxy.ts ゲート + proxy.test 3/3。新規認可コードなし（confirm-only） |

両 ID が PLAN frontmatter（VIEW-01 in 24-01, VIEW-02 in 24-02）と REQUIREMENTS.md（共に Phase 24 / Complete）で対応済み。オーファン要件なし。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | — | — | なし（全3ファイル clean。TODO/FIXME/XXX/TBD/placeholder 等の検出なし） |

注: WeeklyHeatmapGrid を teamPage.test.tsx で `vi.mock` stub している点は、page と test が同一スタブモジュールを参照するため `findByType` の参照一致が維持され、フィルタ後 results の長さ・メンバー名検証は有効。VIEW-01 のコアロジック（status非依存フィルタ・decode・空判定）は実コードで完全に exercise されており、スタブはグリッド内部描画のみを省略する妥当な代替。STUB ではない。

### Human Verification Required

#### 1. admin ブラウザでの実描画確認（VIEW-01）

**Test:** admin ログイン状態で `/admin/teams/{hiddenチーム名}`（日本語名はそのまま URL に入力）にアクセスする
**Expected:** チーム名見出し + 週次ヒートマップグリッドが表示される（hidden ステータスでもメンバーが出る）。存在しない/0人チームでは「該当するチームのメンバーがいません」メッセージが表示される
**Why human:** RSC 単体テストは要素ツリーとフィルタ後 results を検証済みだが、実ブラウザでの実描画・日本語 URL の実エンコード往復・実 DB データでの表示は live 確認が必要

#### 2. 非admin/未認証のリダイレクト確認（VIEW-02）

**Test:** 非admin（member ロール）または未ログインのブラウザで `/admin/teams/{teamName}` にアクセスする
**Expected:** `/` にリダイレクトされ、ヒートマップが一切表示されない
**Why human:** proxy() 単体テストで redirect 応答は確認済みだが、実 middleware 経由のブラウザリダイレクト挙動は live/E2E でのみ確証できる（E2E-03 / Phase 26 で網羅予定）

### Gaps Summary

ブロッカーなし。両 success criteria（VIEW-01 / VIEW-02）はコードベースレベルで完全に検証済み — 動的ルート page.tsx は実 DB 起点のデータフローでヒートマップを描画し、proxy.ts の既存 admin ゲートが新ルートを自動カバーする。全 8 テスト（teamPage 5 + proxy 3）GREEN、全スイート 34/34 GREEN、`npm run build` 成功で `ƒ /admin/teams/[teamName]` 登録確認、禁止パターンゲート（status除外分岐 / notFound / PrBanner = 各0）クリア、proxy.ts は phase 24 で無変更。

status は human_needed: success criteria が「URL にアクセスすると表示される / リダイレクトされる」という実行時ブラウザ挙動を記述しており、単体・統合テストとビルドで強く裏付けられているものの、実ブラウザでの最終確認（特に日本語 URL 往復と middleware 経由の実リダイレクト）は live 確認が残る。VIEW-02 の実ブラウザ確認は Phase 26（E2E-03, Playwright）で正式に網羅される予定のため deferred として記録。

---

_Verified: 2026-05-30T13:35:00Z_
_Verifier: Claude (gsd-verifier)_
