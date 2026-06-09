---
phase: 36-qa-uat
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - e2e/27-handle.spec.ts
  - e2e/28-commit-flow.spec.ts
  - e2e/29-layout-nav.spec.ts
  - e2e/29-mobile.spec.ts
  - playwright.config.ts
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: partially_resolved
resolution:
  resolved:
    - "CR-03: fixed in f7d13d9 — reuseExistingServer 明示オプトイン化 + global-setup.ts に TEST project ref ランタイム検証（prod ref denylist）"
  deferred_to_backlog:
    - "CR-01/CR-02: ISR キャッシュ起因 flaky（27 #4/#5・29-mobile）。go/no-go で backlog 退避（2026-06-08）"
    - "WR-01..05 / IN-01..02: 同上 backlog"
---

> **更新 (2026-06-08, go/no-go 判定):** CR-03（本番データ破壊リスク）は f7d13d9 で修正済み。
> 残る CRITICAL（CR-01/CR-02 = ISR flaky）と Warning/Info は backlog へ退避。SC#1 は本番手動 UAT で独立裏付け済みのため Phase 36 は完了受理。

# Phase 36: コードレビュー報告書（QA/UAT E2E 回帰 spec）

**レビュー日時:** 2026-06-08
**深度:** standard
**レビュー対象ファイル数:** 5
**ステータス:** issues_found

## サマリー

Phase 36 で追加された Playwright E2E 回帰 spec 4 本と設定 1 本をレビューした。test isolation（member_id スコープの afterEach/afterAll、truncate 無し、他メンバー非汚染）の設計思想は概ね妥当で、`expect.poll` による server-action レイテンシ吸収・`waitForTimeout` 不使用の方針も守られている。

しかし最大の構造的欠陥として、**admin クライアントによる DB 直書き込み → ISR キャッシュ（`revalidate = 300`）されたルートへ `goto` するパターン**が複数の spec に存在する。これらのルート（`/`, `/daily`, `/member/[publicationId]`）は production ビルド（`npm run build && npm run start`）で静的 ISR となり、`revalidatePath` を経由しない admin 直書きは 300 秒間反映されない。結果、キャッシュの暖まり具合に依存して合否が変わる flaky テスト（false green / false red の両方）になる。これを最重要 BLOCKER として扱う。

加えて、本番 Supabase プロジェクトへの誤書き込みを招きうる `reuseExistingServer` の運用依存、admin 書き込みのエラー未チェック、重複曜日テストが実際には状態遷移を検証していない問題などを検出した。

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: ISR キャッシュ（revalidate=300）により admin 直書き込みが `/member` に反映されず flaky（27 #4 / #5）

**File:** `e2e/27-handle.spec.ts:88-117`
**Issue:**
`#4` は admin クライアントで `members.substack_handle = '@hoge'` を直接 update した直後に `page.goto('/member/${TEST.publicationId}')` し、`#5` は `null` に戻した直後に同ルートへ goto する。しかし `/member/[publicationId]`（`src/app/member/[publicationId]/page.tsx:8`）は `export const revalidate = 300` かつ dynamic API（cookies/headers）を読まないため、production モード（`playwright.config.ts:58` の `npm run build && npm run start`）では **静的 ISR としてキャッシュされる**。

admin 直書きは server action ではないため `revalidatePath('/member/...')` を一切呼ばない。よって 300 秒のキャッシュ窓内では update がページに反映されず、

- ビルド直後でキャッシュが冷たいと（初回 goto でレンダリング）偶然通る
- 同一ルートに先行アクセスがあってキャッシュが暖まっていると**古い値**（前テストの `@hoge` や `null`）を読んで失敗する

という非決定的挙動になる。`#4`（リンクが出る）と `#5`（リンクが出ない）は同じルートを逆の前提で連続して叩くため、キャッシュ汚染が直接 false result を生む高リスク構成。

**Fix:**
`/member/[publicationId]` をテスト時に強制的に動的化するか、admin 書き込み後にキャッシュを無効化する。最小修正は対象ルートに動的化を入れること（ただし src は変更不可なので spec 側で対処）:
```ts
// 書き込みを UI/server-action 経由にできない読み取り検証では、
// goto にキャッシュバスター query を付けるだけでは ISR は割れない点に注意。
// 確実なのは対象ルートを force-dynamic にすること（src 側）か、
// goto 後に expect.poll でリンク有無が安定するまでリトライしつつ
// 失敗時に revalidate を促す仕組みを入れること。
// 推奨: member ページに `export const dynamic = 'force-dynamic'`(test 専用)か、
// 書き込み→ revalidatePath を実行する server action 経由に統一する。
await expect.poll(
  async () => page.locator('a[href="https://substack.com/@hoge"]').count(),
  { timeout: 10_000 }
).toBeGreaterThan(0)
```
根本的には「DB 直書き → ISR ルート読み取り」の組合せを避け、書き込みは `revalidatePath` を伴う経路に統一すべき。

### CR-02: ISR キャッシュにより beforeAll の slot seed が `/` に反映されず flaky（29-mobile）

**File:** `e2e/29-mobile.spec.ts:37-78`
**Issue:**
`beforeAll` で admin 直 insert した commit slot を前提に、`page.goto('/')` 後 `div.flex.flex-1.gap-2`（CommitGrid root）が存在することを期待する（`firstGrid` の `toBeAttached`）。しかしルート `/`（`src/app/page.tsx:8`）も `revalidate = 300` の ISR で、slot は `admin.from('member_commit_slots')` から読まれる（`page.tsx:34`）。admin 直 insert は `revalidatePath('/')` を呼ばないため、キャッシュ窓内では seed 行が CommitGrid に反映されない可能性がある。

キャッシュが暖まっていると CommitGrid を持つ行が出ず、`firstGrid` が他の `flex flex-1 gap-2` 要素（あるいは 0 件）にマッチして `toBeAttached` 段階で誤検出/失敗する。CR-01 と同根の ISR 起因 flaky。

**Fix:**
seed 後に `/` のキャッシュを確実に割る。spec 側だけで閉じるなら、対象ルートを test 環境で `force-dynamic` にする（src 側設定）か、seed を server action 経由（`updateCommitSlotsAction`、内部で `revalidatePath('/my')` を呼ぶが `/` は別途要対応）にし、`/` も revalidate 対象に含める。最低限、`toBeAttached` ではなく `expect.poll` で CommitGrid 行の出現をリトライ付きで待つこと。

### CR-03: `reuseExistingServer` が本番 Supabase への誤書き込みを招く運用依存リスク

**File:** `playwright.config.ts:60`
**Issue:**
`reuseExistingServer: !process.env.CI` はローカル（非 CI）で :3000 にリッスン中の既存プロセスへ**無条件にアタッチ**する。コメント（`playwright.config.ts:3-6`）でも警告しているが、もし `npm run dev`（本番 env でビルドされた dev server）が起動していると、テストはその dev server にアタッチし、ブラウザ側は**本番 Supabase プロジェクト**を読み書きする一方、`createTestAdmin`（`.env.test` の service_role）は TEST プロジェクトへ書く split-brain になる。

これは単なるテスト失敗ではなく、**本番 community データの破壊**（handle 上書き・commit slot 削除）につながりうるデータ損失リスク。コメントによる注意喚起だけで、コード的なガードが無い。

**Fix:**
テスト対象 URL が確実に TEST プロジェクトを指していることを globalSetup でランタイム検証する。例えば webServer 起動後にヘルスエンドポイント or `NEXT_PUBLIC_SUPABASE_URL` を読み出して TEST プロジェクト ref と突合し、不一致なら fail-fast する。あるいはローカルでも `reuseExistingServer: false` を既定にし、明示フラグでのみ再利用を許可する:
```ts
// 既存サーバ再利用は明示オプトインのみ。誤アタッチによる本番書き込みを防ぐ。
reuseExistingServer: process.env.PW_REUSE_SERVER === '1' && !process.env.CI,
```

## Warnings

### WR-01: admin 直書き込みの error を未チェック（27 #4 / #5）

**File:** `e2e/27-handle.spec.ts:92-95,107-110`
**Issue:**
`#4`・`#5` の `await admin.from('members').update(...)` は戻り値の `error` を一切検査していない。RLS や制約違反、ネットワーク失敗で update が黙って失敗しても、テストは「書けた前提」で goto に進む。afterEach（`27-handle.spec.ts:44-50`）や resolveTestMemberId（`30-37`）は error を投げているのに、この 2 箇所だけ抜けており一貫性が無い。失敗の原因が「アサーション失敗」として現れ、真因（書き込み失敗）が隠れる。

**Fix:**
```ts
const { error } = await admin
  .from('members')
  .update({ substack_handle: '@hoge' })
  .eq('publication_id', TEST.publicationId)
if (error) throw new Error(`[27-handle #4] seed update failed: ${error.message}`)
```

### WR-02: 重複曜日テストが実際には「状態遷移」を検証していない（28）

**File:** `e2e/28-commit-flow.spec.ts:94-101`
**Issue:**
`#frequency` を 2 にすると `makeDefaultSlots`（`CommitScheduleModal.tsx:29-31`）が両スロットを `day_of_week: 1` で初期化するため、**頻度変更の瞬間にすでに重複警告が表示されている**。spec はその後 `#day-0` と `#day-1` を両方 `1`（＝既に 1）にセットしているが、これは値を変えない no-op。

結果、「曜日を重複させたら警告が出てボタンが無効化される」という遷移はテストされておらず、単に「初期状態で重複警告が出ている」ことを確認しているだけ。重複→非重複への解消（`#day-1` を `3` に変更）は検証されているが、非重複→重複の遷移カバレッジが欠落している。

**Fix:**
まず非重複状態を作ってから重複に遷移させる:
```ts
await page.locator('#frequency').selectOption('2')
await page.locator('#day-1').selectOption('3') // まず別曜日にして警告を消す
await expect(page.getByText('同じ曜日を複数選択しています')).toBeHidden()
await page.locator('#day-1').selectOption('1')  // 重複に遷移
await expect(page.getByText('同じ曜日を複数選択しています')).toBeVisible()
await expect(page.getByRole('button', { name: '宣言する' })).toBeDisabled()
```

### WR-03: `/daily` ナビテストが WeeklyHeatmapGrid 到達を実際には検証していない（29-layout-nav）

**File:** `e2e/29-layout-nav.spec.ts:28-40`
**Issue:**
コメント（`:36-38`）自身が認めている通り、テストは「デイリータブが描画されている＝ページ到達の担保」としているが、`ViewTabs`（`ViewTabs.tsx:11-28`）は active 状態に関わらず**常に両タブをレンダリングする**ため、`getByRole('link', { name: 'デイリー' })` は `/` 上でも `/daily` 上でも可視。すなわちこのアサーションは「`/daily` に正しく遷移して WeeklyHeatmapGrid が出た」ことを区別できない。`daily/page.tsx:59` の `WeeklyHeatmapGrid` 描画は実質未検証。

**Fix:**
WeeklyHeatmapGrid 固有の DOM（コンポーネント root の data-testid やヒートマップセル）を直接アサートする。例:
```ts
await page.goto('/daily')
await expect(page.getByText('All')).toBeVisible() // daily 固有のチーム All タブ
// もしくは WeeklyHeatmapGrid root の安定セレクタを追加して assert
```

### WR-04: `a[href="/daily"]` セレクタが複数要素にマッチ、`.first()` 依存で脆い（29-layout-nav）

**File:** `e2e/29-layout-nav.spec.ts:31,35`
**Issue:**
`/daily` ページには `nav` 内のデイリータブ（`ViewTabs.tsx`）と、チームフィルタの All リンク（`daily/page.tsx:38` の `href="/daily"`）の少なくとも 2 つの `a[href="/daily"]` が存在する。`:35` の `.first()` は DOM 順依存で、レイアウト変更で容易に別要素を指す。`:31` も `nav` プレフィックスで一応スコープしているが、`:35` はスコープ無し。

**Fix:**
`getByRole('navigation')` 内にスコープするか、ViewTabs のタブに固有属性（`aria-current` 等）を持たせて active タブを一意特定する:
```ts
await expect(page.getByRole('navigation').getByRole('link', { name: 'デイリー' })).toBeVisible()
```

### WR-05: `div.flex.flex-1.gap-2` がクラス組合せ依存の脆いセレクタ（29-mobile）

**File:** `e2e/29-mobile.spec.ts:70`
**Issue:**
CommitGrid root を Tailwind ユーティリティクラスの組合せ `div.flex.flex-1.gap-2`（`CommitGrid.tsx:118`）で特定している。これは実装詳細（クラス名）への密結合で、スタイル調整（`gap-2`→`gap-1` 等）で即座に壊れる。さらに将来同じクラス組合せの別要素が増えると `.first()` が誤要素を掴む。`weekBlocks = firstGrid.locator('> div')`（`:72`）も子 div が正確に 3 つである前提に依存。

**Fix:**
CommitGrid root と各週ブロックに安定した `data-testid`（例 `data-testid="commit-grid"` / `data-week="0|1|2"`）を付与し、spec はそれを参照する。src 変更が必要なため、最低限コメントで「クラス変更時に要追従」と明示しスナップショット脆弱性を記録すること。

## Info

### IN-01: ADMIN_PASSWORD のハードコードされた弱いデフォルト値

**File:** `playwright.config.ts:67`
**Issue:**
`ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'test'` はテスト専用 webServer env だが、`'test'` という弱いパスワードがソースに埋め込まれている。TEST プロジェクト限定なので実害は小さいが、env 未設定時に弱い既定で起動が成功してしまい、本来必要な env 設定漏れが顕在化しない。

**Fix:**
未設定時は fail-fast させ、明示的な設定を強制する:
```ts
ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? (() => { throw new Error('ADMIN_PASSWORD required for e2e') })(),
```

### IN-02: resolveTestMemberId が 3 ファイルに重複定義

**File:** `e2e/27-handle.spec.ts:24-37`, `e2e/28-commit-flow.spec.ts:25-38`, `e2e/29-mobile.spec.ts:22-35`
**Issue:**
`resolveTestMemberId()` が 3 つの spec にほぼ逐語コピーされている（エラープレフィックスのみ差分）。ロジック（publication_id で single 取得 → エラー時 throw）が変わると 3 箇所同時修正が必要で、ドリフトの温床。

**Fix:**
`e2e/helpers/` に共通化する（例 `e2e/helpers/member.ts` に `resolveTestMemberId(tag: string)` を抽出）。

---

_Reviewed: 2026-06-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
