# Phase 36: QA・UAT・検証ギャップ解消 - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 5 new + 5 in-place edits + 1 config edit = 11
**Analogs found:** 11 / 11 (全ファイルに既存の手本がある)

> 検証フェーズ。src/ は変更しない（read-only）。新規作成は e2e/ 配下の Playwright spec のみ、in-place 更新は 27/28/29 の検証 .md のみ。
> ⚠ **重大ドリフト発見（下記 "Drift Alerts" 参照）**: (1) Phase 29 の `/weekly-stamp` ルートは現行コードで `/daily` に移動済み + `ViewTabs` コンポーネント追加。29 #3 spec / 29-VERIFICATION の human_verification 文言が現行と乖離。(2) commit slots 保存は RPC `replace_member_commit_slots`（actions.ts:178 で確認、RESEARCH Pitfall 2 と一致）。(3) @handle は設定後 read-only（MyProfileForm.tsx:52、RESEARCH Pitfall 1 と一致）。

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `e2e/27-handle.spec.ts` (NEW) | test (logged-in) | request-response + DB round-trip | `e2e/my-teams.spec.ts` | exact（認証済み /my 操作 + admin DB assert + member_id afterEach） |
| `e2e/28-commit-flow.spec.ts` (NEW) | test (logged-in) | request-response + DB round-trip (RPC) | `e2e/my-teams.spec.ts` | exact（同上 + モーダル操作は CommitScheduleModal.tsx の DOM 契約） |
| `e2e/29-mobile.spec.ts` (NEW) | test (375px viewport) | render / CSS visibility | `e2e/admin-guard.spec.ts` | role-match（anonymous + page.goto、storageState なし。viewport 拡張は新規） |
| `e2e/29-layout-nav.spec.ts` (NEW) | test (anonymous/desktop) | render / navigation | `e2e/admin-guard.spec.ts` | exact（anonymous で page.goto + DOM/href assert） |
| `playwright.config.ts` (MODIFY) | config | — | 同ファイルの既存 `projects[]` エントリ | self-analog（375px project を追加するのみ） |
| `27-HUMAN-UAT.md` (MODIFY in-place) | verification artifact | — | 自身の frontmatter + Tests/Summary 構造 | self（result 行 + status + Summary カウント編集） |
| `27-VERIFICATION.md` (MODIFY in-place) | verification artifact | — | 28/29-VERIFICATION の verified 状態 | self（status + human_verification 解決） |
| `28-VERIFICATION.md` (MODIFY in-place) | verification artifact | — | 同上 | self |
| `29-VERIFICATION.md` (MODIFY in-place) | verification artifact | — | 同上 | self |
| `29-HUMAN-UAT.md` | — | — | — | 参照のみ・再実行しない（D-07、既 resolved 3/3） |

## Shared Patterns

すべての新 spec が共有する基盤。これらは既に green な 3 spec ハーネスで確立済み（Phase 26）。**新しい仕組みは作らない — 薄い追加レイヤーのみ。**

### S-1. service_role admin client（seed / assert / cleanup）
**Source:** `e2e/helpers/admin.ts:8-19`
**Apply to:** 27-handle, 28-commit-flow（DB 書き込み検証する全 spec）
```typescript
import { createTestAdmin } from './helpers/admin'
// createTestAdmin() は service_role → RLS バイパス。DB delta の読み取り・状態リセットに使う。
const admin = createTestAdmin()
```

### S-2. 固定 fixture 定数
**Source:** `e2e/fixtures/test-data.ts:6-11`
**Apply to:** 全 spec（member 行の解決キーは publicationId）
```typescript
import { TEST } from './fixtures/test-data'
// TEST.publicationId = 'e2e-test-publication' / TEST.teamName = 'e2e-public-team'
// TEST.memberName / TEST.userEmail。seed 済み member 行はこの publicationId で一意に引ける。
```

### S-3. test member の id 解決ヘルパー
**Source:** `e2e/my-teams.spec.ts:18-31`（踏襲対象。spec ローカル関数として複製 or helpers/ へ抽出は planner 判断）
```typescript
async function resolveTestMemberId(): Promise<string> {
  const admin = createTestAdmin()
  const { data: m, error } = await admin
    .from('members').select('id')
    .eq('publication_id', TEST.publicationId).single()
  if (error || !m) throw new Error(`could not resolve test member: ${error?.message ?? 'not found'}`)
  return m.id
}
```

### S-4. member_id スコープ afterEach クリーンアップ（mutation spec 必須）
**Source:** `e2e/my-teams.spec.ts:33-45`
**Apply to:** 27-handle（handle→NULL 復元）、28-commit-flow（slots 削除）
**⚠ truncate 禁止。他メンバー非汚染（D-09）。**
```typescript
test.afterEach(async () => {
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  // 27: handle は設定後 read-only なので NULL に戻さないと再実行で input が出ず spec が壊れる（Pitfall 1）
  await admin.from('members').update({ substack_handle: null }).eq('id', memberId)
  // 28: commit slots を削除（次テストをクリーン状態から開始）
  await admin.from('member_commit_slots').delete().eq('member_id', memberId)
})
```

### S-5. expect.poll で server-action レイテンシ吸収（waitForTimeout 禁止）
**Source:** `e2e/my-teams.spec.ts:57-72`
**Apply to:** DB 書き込みの往復を assert する全 spec
```typescript
const admin = createTestAdmin()
await expect.poll(async () => {
  const { count } = await admin
    .from('member_commit_slots')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
  return count
}).toBe(2)
```

### S-6. storageState 添付 = playwright.config.ts の project 割り当て
**Source:** `playwright.config.ts:30-41`
- `logged-in` project（`testMatch` + `storageState: 'e2e/.auth/user.json'`）→ spec は `page.goto('/my')` だけで認証済み。global-setup.ts:74-80 が mint 済み。
- `anonymous` project（storageState なし）→ ログイン不要ページの検証。
- 新 spec はそれぞれ適切な project の `testMatch` に追加する（下記 P-config 参照）。

---

## Pattern Assignments

### `e2e/27-handle.spec.ts` (logged-in, DB round-trip) — QA-02 / 27 #2,#3,#4,#5

**Analog:** `e2e/my-teams.spec.ts`（構造を 1:1 で踏襲）。DOM 契約は `MyProfileForm.tsx` と `CalendarGrid.tsx`。

**Imports + afterEach:** S-1〜S-5 をそのまま（afterEach は handle→NULL 復元を使う）。

**#2 @handle input 描画**（DOM契約 `MyProfileForm.tsx:59-71` — handle が NULL のときだけ編集可能 input が出る）:
```typescript
// 前提: seed member.substack_handle は初期 NULL（global-setup は handle をセットしない）
test('@handle input が NULL 時に描画される (PROF-01)', async ({ page }) => {
  await page.goto('/my')
  // null のとき: label「Substack ハンドル」 + id=substack_handle + placeholder「@yourhandle」
  await expect(page.getByLabel('Substack ハンドル')).toBeVisible()
  await expect(page.locator('#substack_handle')).toHaveAttribute('placeholder', '@yourhandle')
})
```

**#3 @handle 保存往復**（⚠ Pitfall 1 — 設定後 read-only。`MyProfileForm.tsx:52-58` の hidden input + read-only `<p>`）:
```typescript
test('@handle 保存往復で read-only @hoge 表示 (PROF-01)', async ({ page }) => {
  await page.goto('/my')
  await page.locator('#substack_handle').fill('hoge')           // @ なし入力
  await page.getByRole('button', { name: '保存する' }).click()   // updateMyProfileAction → '@' 正規化(actions.ts:50-60)
  // DB 往復を expect.poll で確認
  const admin = createTestAdmin()
  await expect.poll(async () => {
    const { data } = await admin.from('members').select('substack_handle')
      .eq('publication_id', TEST.publicationId).single()
    return data?.substack_handle
  }).toBe('@hoge')
  await page.reload()
  // 設定後は編集 input ではなく read-only <p> に @hoge（Pitfall 1）
  await expect(page.locator('#substack_handle')).toHaveCount(0)
  await expect(page.getByText('@hoge', { exact: true })).toBeVisible()
})
// afterEach（S-4）が substack_handle を NULL に戻す → 次テストで input 再描画
```

**#4 プロフィールリンクあり**（DOM契約 `CalendarGrid.tsx:63-71` — `<a href="https://substack.com/@handle" target="_blank" rel="noopener noreferrer">`）:
```typescript
test('handle 設定時 /member にプロフィールリンクが出る (PROF-02)', async ({ page }) => {
  const admin = createTestAdmin()
  await admin.from('members').update({ substack_handle: '@hoge' })
    .eq('publication_id', TEST.publicationId)
  await page.goto(`/member/${TEST.publicationId}`)
  const link = page.locator('a[href="https://substack.com/@hoge"][target="_blank"]')
  await expect(link).toBeVisible()
})
```

**#5 プロフィールリンクなし**（DOM契約 `CalendarGrid.tsx:72-74` — null 時は `avatarNameBlock` を `<a>` でラップせず素の div）:
```typescript
test('handle null 時はリンクなし (PROF-02 fallback)', async ({ page }) => {
  // afterEach 後 / seed 初期は NULL。明示リセットしたうえで goto。
  await page.goto(`/member/${TEST.publicationId}`)
  // 名前 <h2> は存在するが substack.com への <a> は存在しない
  await expect(page.getByRole('heading', { name: TEST.memberName })).toBeVisible()
  await expect(page.locator('a[href^="https://substack.com/"]')).toHaveCount(0)
})
```

**config:** `playwright.config.ts` の `logged-in` project の `testMatch` に `'27-handle.spec.ts'` を追加。

---

### `e2e/28-commit-flow.spec.ts` (logged-in, DB round-trip via RPC) — QA-03 / 28 #2

**Analog:** `e2e/my-teams.spec.ts`（認証 + DB assert）。モーダル DOM 契約は `CommitScheduleModal.tsx`。

**⚠ Pitfall 2:** 保存は delete+insert ではなく RPC `replace_member_commit_slots`（`actions.ts:178` で確認）。E2E はブラックボックス往復で検証（内部実装に依存しない）。**前提:** TEST project に RPC が適用済みか事前確認（RESEARCH Open Question 1 — planner が前提タスク化）。

**afterEach:** S-4 の slots 削除版。

**フルフロー**（DOM契約は `CommitScheduleModal.tsx`：トリガー `:101`「投稿スケジュールを宣言する」/ `role="dialog" aria-modal` `:122-124` / `#frequency` select `:149` / `#day-{i}` select `:170` / 重複警告「同じ曜日を複数選択しています」`:200` / 送信「宣言する」`:209-214`、`disabled={isPending || showDuplicateWarning}` `:211`）:
```typescript
test('スケジュール宣言フルフロー (SCHED-01/02/03)', async ({ page }) => {
  await page.goto('/my')
  await page.getByRole('button', { name: '投稿スケジュールを宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#frequency').selectOption('2')   // handleFrequencyChange → スロット行 2 つ
  await expect(page.locator('#day-1')).toBeVisible()
  // 重複曜日 → 警告 + ボタン無効化
  await page.locator('#day-0').selectOption('1')
  await page.locator('#day-1').selectOption('1')
  await expect(page.getByText('同じ曜日を複数選択しています')).toBeVisible()
  await expect(page.getByRole('button', { name: '宣言する' })).toBeDisabled()
  // 別曜日 → 宣言 → モーダルが閉じる（useEffect が state===null で setIsOpen(false)、:53-56）
  await page.locator('#day-1').selectOption('3')
  await page.getByRole('button', { name: '宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  // DB 往復（RPC 経由）: member_commit_slots に 2 行（S-5）
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  await expect.poll(async () => {
    const { count } = await admin.from('member_commit_slots')
      .select('*', { count: 'exact', head: true }).eq('member_id', memberId)
    return count
  }).toBe(2)
  // reload 後サマリー（formatSummary `:19-22` → 「週2回 — …」、savedSlots>0 時は span:106-113）
  await page.reload()
  await expect(page.getByText(/週2回 —/)).toBeVisible()
})
```

**config:** `logged-in` project の `testMatch` に `'28-commit-flow.spec.ts'` を追加。

---

### `e2e/29-mobile.spec.ts` (375px viewport, CSS visibility) — QA-04 / 29 #1

**Analog:** `e2e/admin-guard.spec.ts`（anonymous + page.goto。storageState 不要 — `/` はログイン不要）。viewport project は新規（P-config）。

**DOM契約** `CommitGrid.tsx:117-137`: 3 週ブロックは外側 `div.flex.flex-1.gap-2` の子。week-0 `:120` と week-1 `:126` は `hidden sm:flex`（< 640px で `display:none`）、week-2 `:132` は `flex flex-1`（常時可視）。Playwright の `toBeHidden/toBeVisible` は親の media-query 由来 display:none を検出（RESEARCH Pattern 3、HIGH 信頼）。
```typescript
test('375px で最新週(week-2)のみ可視 (VIEW-07)', async ({ page }) => {
  await page.goto('/')
  // 各 CommitGoalRow の CommitGrid root（div.flex.flex-1.gap-2）の直下 3 週ブロックのうち
  // 可視は 1（週ブロック直接子: hidden sm:flex は < 640px で隠れる）
  const firstGrid = page.locator('div.flex.flex-1.gap-2').first()
  const weekBlocks = firstGrid.locator('> div')
  await expect(weekBlocks.nth(0)).toBeHidden()  // week-0 (hidden sm:flex)
  await expect(weekBlocks.nth(1)).toBeHidden()  // week-1 (hidden sm:flex)
  await expect(weekBlocks.nth(2)).toBeVisible()  // week-2 (flex flex-1)
})
```
**注:** 「未コミット」行（slots.length===0）には CommitGrid が描画されない（`CommitGoalRow.tsx:42-50`）ので、seed member に commit slots を持たせるか、CommitGrid を持つ行を `.first()` で選ぶ前提を planner が決める（28 spec が slots を書く順序依存を避けるため、29-mobile は独立 seed が望ましい）。

**config:** 新 project `mobile-375`（`viewport: { width: 375, height: 800 }`、storageState なし、`testMatch: ['29-mobile.spec.ts']`）を追加。

---

### `e2e/29-layout-nav.spec.ts` (anonymous/desktop, render + navigation) — QA-04 / 29 #2(構造), #3(ナビ)

**Analog:** `e2e/admin-guard.spec.ts`（anonymous で page.goto + href/DOM assert。Desktop Chrome デフォルト viewport）。

**⚠ Drift Alert（最重要）:** 29-VERIFICATION / RESEARCH が言う `/weekly-stamp` ルートは**現行コードで `/daily` に移動済み**。タブナビは `ViewTabs.tsx` コンポーネント（href `/`=「コミット＆ゴール」, `/daily`=「デイリー」）。さらに `/daily` 内にチームタブ（`/daily` All + `/daily?team=...`）がある。29 #3 spec はこの現行ルートで書く。

**#2 3列構造**（DOM契約 `CommitGoalRow.tsx:17-69`: Col1 = `<Link href="/member/...">`（avatar+name）, Col2 = CommitGrid or `未コミット`, Col3 = `w-10 shrink-0` の achievement）。RESEARCH「29 #2 自動化境界」: 構造のみ自動、ピクセル整列は本番目視に委譲（Pitfall 4）:
```typescript
test('各行に member link が存在する (VIEW-03 構造)', async ({ page }) => {
  await page.goto('/')
  // Col1: 各行は /member/ への Link（CommitGoalRow:19-20）
  await expect(page.locator('a[href^="/member/"]').first()).toBeVisible()
  // Col2: CommitGrid（div.flex.flex-1.gap-2）または「未コミット」のいずれか
  // Col3 のピクセル整列は assert しない（Pitfall 4）— 構造存在のみ
})
```

**#3 タブナビ**（DOM契約 `ViewTabs.tsx:11-26` + `daily/page.tsx:33,38,48`）:
```typescript
test('ViewTabs と /daily ヒートマップナビ (VIEW-01)', async ({ page }) => {
  await page.goto('/')
  // ViewTabs: コミット＆ゴール(/) と デイリー(/daily)
  await expect(page.locator('nav a[href="/daily"]')).toBeVisible()
  await page.goto('/daily')
  // /daily 内: All タブ href="/daily"、チームタブ href="/daily?team=..."
  await expect(page.locator('a[href="/daily"]')).toBeVisible()
  // 旧 WeeklyHeatmapGrid が /daily で描画されること（daily/page.tsx:59）
})
```
**Drift handling:** 29-VERIFICATION の human_verification 文言（`/weekly-stamp`）を in-place 更新する際、**実ルートが `/daily` に変わった事実を注記**し、`/weekly-stamp` ではなく `/daily` で検証した旨を記録する（D-09）。これは src/ のバグではなく後続フェーズの意図的リネーム — 修正対象ではなく検証文言の追従。

**config:** `anonymous` project の `testMatch` に `'29-layout-nav.spec.ts'` を追加（既存 `admin-guard.spec.ts` と同居）。

---

### `playwright.config.ts` (MODIFY) — 375px viewport project 追加

**Self-analog:** 既存 `projects[]:30-41` のエントリ形。**唯一の config 変更**。fullyParallel:false / workers:1 / webServer は変更しない（Pitfall 3,5）。
```typescript
// 既存 logged-in / anonymous に testMatch を足し、mobile-375 を新規追加
projects: [
  { name: 'logged-in',
    testMatch: ['login.spec.ts', 'my-teams.spec.ts', '27-handle.spec.ts', '28-commit-flow.spec.ts'],
    use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' } },
  { name: 'anonymous',
    testMatch: ['admin-guard.spec.ts', '29-layout-nav.spec.ts'],
    use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-375',
    testMatch: ['29-mobile.spec.ts'],
    use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 800 } } },
]
```

---

## In-Place .md 更新の正典フィールド形（planner が編集を指定するための実形状）

### `27-HUMAN-UAT.md`（frontmatter + Tests + Summary）
- frontmatter（`:1-7`）: `status: partial` → 全 pass 後 `passed` 相当へ。`updated:` を実行日に。
- 各 Test（`### N.` + `expected:` + `result: [pending]`）の **`result:` 行**を `[pending]` → `[pass]`（or `[fail]`）に書き換え。Test #1〜#6 が存在（`:15-37`）。
- Summary ブロック（`:39-46`）: `total: 6 / passed: 0 / pending: 6` のカウントを実結果に更新。
- `## Current Test`（`:9-11`）の `[awaiting human testing]` を完了記述へ。
- #1(SQL本番) と #6(Magic Link) は manual-production の result。#2-#5 は automate(TEST) + 本番手動の両方が pass で記録。

### `27-VERIFICATION.md`（frontmatter `status` + `human_verification[]`）
- frontmatter `status: human_needed`（`:3`）→ `verified`（28/29 と同 enum）。
- `human_verification:` リスト（`:7-25`、6 エントリ）: 各 `- test: / expected: / why_human:` を解決済みとして扱う。planner は「resolved: <how>」注記の追加方針を決める（frontmatter スキーマ上は本文 `### Human Verification Required` セクションに pass 記録を追記する形が安全）。
- 本文 `### Human Verification Required`（`:120-156`、#1〜#6）に各項目の pass/手段（automate spec or 本番手動）を追記。

### `28-VERIFICATION.md`（frontmatter `status` + `human_verification[]` 2件）
- frontmatter `status: human_needed`（`:4`）→ `verified`。
- `human_verification[]`（`:8-14`、2 件）:
  - **#1**（member_commit_slots 本番存在）→ **resolved-by-reference**。Phase 32（DB-02 Complete）へのポインタを本文 `#### 1`（`:137-141`）に記録、再検証しない（D-07）。
  - **#2**（/my フルフロー）→ `28-commit-flow.spec.ts` automate pass を本文 `#### 2`（`:143-155`）に記録。
- 本文 Observable Truths #14（`:45` UNCERTAIN）を VERIFIED + 証拠（Phase 32 適用 / E2E green）へ更新。

### `29-VERIFICATION.md`（frontmatter `status` + `human_verification[]` 3件）
- frontmatter `status: human_needed`（`:4`）→ `verified`。
- `human_verification[]`（`:7-16`、3 件）:
  - **#1** モバイル1週縮退 → `29-mobile.spec.ts` automate pass。
  - **#2** 3列レイアウト → 構造 automate pass + 本番目視 pass（境界注記）。
  - **#3** /weekly-stamp ヒートマップ＋タブナビ → **⚠ ルートが `/daily` に移動済みの注記を付けて** `29-layout-nav.spec.ts` で検証 pass を本文 `#### 3`（`:127-131`）に記録。
- 本文 `### Human Verification Required`（`:113-131`、#1〜#3）に pass 記録を追記。

### `29-HUMAN-UAT.md`
- **編集しない**（D-07、既 resolved 3/3）。参照のみ。

---

## Drift Alerts（現行ソース vs 検証 .md の乖離 — assert は現行ソースを基準にする）

| # | 検証 .md / RESEARCH の前提 | 現行コード（直読確認） | 影響 |
|---|---------------------------|------------------------|------|
| D-A | @handle は /my で常に編集可能 | `MyProfileForm.tsx:52` — 設定後 read-only `<p>`+hidden input、null 時のみ `#substack_handle` input | 27 #3 は NULL 開始 + afterEach NULL 復元 + 「read-only @hoge」assert |
| D-B | commit slots = delete+insert 全置換（28-VERIFICATION Truth #13） | `actions.ts:178` — RPC `replace_member_commit_slots` | 28 #2 はブラックボックス往復で検証 |
| D-C | 旧トップ = `/weekly-stamp`（29-VERIFICATION 本文・RESEARCH 全体） | ルートは `/daily`（`src/app/daily/page.tsx`）+ `ViewTabs.tsx`（href `/` と `/daily`） | 29 #3 spec は `/daily` で書く。29-VERIFICATION の文言を `/daily` へ追従更新 |

> D-C は本フェーズで新たに発見したドリフト（RESEARCH は `/weekly-stamp` 前提のまま）。src/ のバグではなく後続フェーズのリネーム。検証文言の追従であり修正対象ではない。

## No Analog Found

なし。全ファイルに既存の手本がある（既存 3 spec ハーネス + 検証 .md 構造）。

## Metadata

**Analog search scope:** `e2e/`（spec + helpers + fixtures + global-setup + config）、`src/app/my/`、`src/components/`（CommitGrid/CommitGoalRow/CalendarGrid/ViewTabs）、`src/app/daily/`、`.planning/phases/{27,28,29}/`
**Files scanned:** 既存 3 spec + 4 harness 基盤 + config + 5 src 現行コンポーネント + 4 検証 .md = 17
**Pattern extraction date:** 2026-06-08
