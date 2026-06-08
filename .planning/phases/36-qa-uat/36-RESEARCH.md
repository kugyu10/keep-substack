# Phase 36: QA・UAT・検証ギャップ解消 - Research

**Researched:** 2026-06-08
**Domain:** E2E test harness extension (Playwright + Supabase session-injection) + manual production UAT runbook
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** ハイブリッド方式。自動化できる項目は既存 Playwright E2E ハーネスを拡張して durable な回帰テスト化し、視覚目視・実メール往復が必須の項目のみ開発者が手動実行する。
- **D-02:** 自動化対象の目安 — @handle入力描画 / 保存往復 / プロフィールリンク有無（27）、/my スケジュール宣言フルフロー（28）、モバイル縮退・3列レイアウト・weekly-stamp（29 CSS/ナビ）。手動必須 — 実 Magic Link メール往復（27 シナリオ6）、本番ブラウザ目視。
- **D-03:** 自動化は技術的に可能な範囲で。困難な項目（実メール配信を伴う Magic Link 往復）を無理に自動化しない。
- **D-04:** SC#1 が要求する「本番環境で」の Phase 27 UAT 6シナリオは本番（https://keep-substack.com）で開発者自身のアカウントに対して手動実行する。他メンバーのデータは汚さない。検証後は変更した値を元に戻す。
- **D-05:** 既存 E2E ハーネスは session-injection で TEST project（otydhiumsdsyxepnjqjp）に紐付いており本番には向けられない。自動回帰テストは TEST project で実行し、SC#1 の「本番充足」は D-04 の本番手動パスで担保する。
- **D-06:** ⚠ 本番ドメインが keep-substack.vercel.app → https://keep-substack.com に移行済み。Magic Link UAT（シナリオ6）実行前に Supabase の Redirect URLs / Site URL が新ドメインを許可しているか確認が必要（landmine 候補）。
- **D-07:** resolved-by-reference 項目（Phase 28 ① → Phase 32 / Phase 29 HUMAN-UAT 3/3）は再検証しない。ポインタを記録する。
- **D-08:** 真に未実行の項目（Phase 27 全6、Phase 28 フルフロー、Phase 29 VERIFICATION 3視覚）にのみリソースを集中。
- **D-09:** 結果は 27/28/29 の既存 HUMAN-UAT.md / VERIFICATION.md を in-place 更新。Phase 36 側に統合サマリーは作らない。
- **D-10:** テスト失敗時は新規バグ化（/gsd:debug または新規フェーズ）。失敗を黙って通さない。
- **D-11:** Definition of Done = QA-01〜QA-04 が満たされ、各ギャップが pass / resolved-by-reference / バグ化のいずれかで処理済み、v1.8 出荷判定（go/no-go）が下せる状態。

### Claude's Discretion
- 自動化テストの具体的な spec ファイル構成・配置（既存 e2e/ 配下のパターンに合わせる）。
- どの 28/29 項目を自動化し切るか手動に残すかの最終線引き（D-02 を出発点に planner/researcher が判断）。

### Deferred Ideas (OUT OF SCOPE)
- 検証で発見されたバグの修正実装 — 本フェーズスコープ外。/gsd:debug または新規フェーズで capture（D-10）。
- 既知の logout redirect bug（ログアウト時にトップへ遷移、Phase 33 対応予定）— 再遭遇したら参照のみ、修正は別トラック。
- src/ は本フェーズで変更しない（検証のみ）。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QA-01 | Phase 27 の human UAT 6 シナリオを本番環境で検証する | §Manual Production UAT Runbook — 本番手動パス（D-04/D-05）。SC#1「本番環境で」は本番手動でのみ充足、自動化は TEST project の durable 追加レイヤー |
| QA-02 | Phase 27 VERIFICATION.md のギャップを解消する | §Outstanding Gap Inventory — 6 human_verification 項目を automate / manual-production にディスパッチ。在 27-VERIFICATION.md / 27-HUMAN-UAT.md を in-place 更新 |
| QA-03 | Phase 28 VERIFICATION.md のギャップを解消する | §Outstanding Gap Inventory — ① resolved-by-reference(Phase 32) / ② /my フルフロー自動化（E2E spec）。28-VERIFICATION.md を in-place 更新 |
| QA-04 | Phase 29 VERIFICATION.md のギャップを解消する | §Outstanding Gap Inventory — 3 視覚項目を Playwright viewport 投影で自動化。29-VERIFICATION.md を in-place 更新（HUMAN-UAT は既 resolved、再実行しない） |

QA-01 は本質的に「本番手動」であり自動化のみでは充足不可（D-04/D-05）。QA-02/03/04 のコードレベル振る舞いは TEST project の自動回帰でクローズし、QA-01 の本番要件は手動パスで担保する二層構造。
</phase_requirements>

## Summary

これは新機能を作らない検証フェーズである。Phase 27-29 で `human_needed` / `pending` のまま残った 11 個の検証項目（27=6、28=2、29=3）を実行・記録してクローズし、v1.8 の go/no-go を可能にする。プランナブルな仕事は (a) 自動化できる振る舞いを既存 Playwright ハーネス（Phase 26 確立の session-injection パターン）に durable な回帰 spec として追加すること、(b) 実メール往復・本番ブラウザ目視が必須の項目を本番手動 UAT ランブックとして定義することの 2 つ。

調査の最重要発見: **既存実装は Phase 27 検証時から変化している**。(1) `MyProfileForm.tsx` は @handle を**一度設定したら変更不可**に変更済み（`substackHandle != null` のとき read-only `<p>` + hidden input をレンダリングし、null のときのみ編集可能な input を出す）。これは 27 シナリオ3「保存往復」の自動化に直接影響する — TEST member の handle が NULL の状態から開始する必要がある。(2) commit slots 保存は delete+insert ではなく **RPC `replace_member_commit_slots`**（Phase 33 のアトミック化）に変わっている。28 のフルフロー自動化はこの RPC 経由の往復を検証することになる。

**Primary recommendation:** 既存 `e2e/` の session-injection パターン（`mintAuthCookies` + storageState + `member_id` スコープ `afterEach` クリーンアップ）を踏襲し、27 と 28 の DB ラウンドトリップ項目を `logged-in` プロジェクトの新 spec として、29 の CSS 縮退/レイアウト項目を **375px viewport の anonymous プロジェクト**として追加する。Playwright の `toBeVisible()` は CSS メディアクエリ由来の `display:none` を正しく検出するため、`hidden sm:flex`（モバイル1週縮退）は信頼性高く自動化できる。実 Magic Link 往復（27 シナリオ6）と本番目視（QA-01 全6）は手動ランブックに残す。結果は各フェーズの既存 .md を in-place 更新する（D-09）。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| @handle 描画/保存往復検証（27 #2,#3） | E2E test harness (Playwright `logged-in`) | API/Backend (Server Action + Supabase) | DOM レンダリング + DB 書き込みの往復は session-injection 済みブラウザ + service_role admin client で検証 |
| プロフィールリンク有無検証（27 #4,#5） | E2E test harness (Playwright) | — | `<a href>` 属性/不在の DOM 検証。member 行の substack_handle 状態を admin で制御 |
| Magic Link 伝播（27 #6） | Manual production UAT | Supabase Auth (email delivery) | 実メール配信は自動化不可（D-03）。本番のみ（D-04） |
| DB migration 適用確認（27 #1, 28 #1） | Manual / resolved-by-reference | Supabase SQL Editor | 27 #1 は本番 information_schema クエリ（手動）。28 #1 は Phase 32 で確認済み → resolved-by-reference（D-07） |
| /my スケジュール宣言フルフロー（28 #2） | E2E test harness (Playwright `logged-in`) | API/Backend (RPC `replace_member_commit_slots`) | モーダル開閉・動的スロット増減・重複警告・保存往復をブラウザで駆動、DB 書き込みを admin で検証 |
| モバイル1週縮退（29 #1） | E2E test harness (Playwright 375px viewport) | CSS (Tailwind `hidden sm:flex`) | `toBeVisible/toBeHidden` がメディアクエリの display:none を検出 |
| 3列レイアウト整合性（29 #2） | E2E test harness (Playwright) | CSS (flex) | 3つの構造カラムの存在/順序を DOM で検証可能。ピクセル単位の整列は限定的 |
| weekly-stamp ナビ（29 #3） | E2E test harness (Playwright) | — | href / ページ遷移 / ヒートマップ描画の検証 |
| SC#1「本番環境で」充足（QA-01） | Manual production UAT (https://keep-substack.com) | — | TEST project E2E は本番に向けられない（D-05）。本番手動でのみ充足 |

## Standard Stack

このフェーズは新規パッケージをインストールしない。既存の検証スタックを使用する（バージョンは package.json から検証済み）。

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | 1.60.0 | E2E ブラウザ自動化 | [VERIFIED: package.json + `npx playwright --version`] 既存 e2e/ ハーネスの基盤。3 spec green |
| `@supabase/ssr` | ^0.10.3 | 本番同一 cookie 生成（session-injection） | [VERIFIED: package.json] `mintAuthCookies` が同一ライブラリで cookie をシリアライズ → proxy.ts の getUser() と互換保証 |
| `@supabase/supabase-js` | ^2.105.4 | service_role admin client（seed/mint/cleanup/assert） | [VERIFIED: package.json] `createTestAdmin` が RLS をバイパスして DB 状態を制御・検証 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^4.1.6 | コードレベルユニット（既に green） | [VERIFIED: package.json] 27=28テスト/28=8テスト/29=88テスト 全 green。**追加不要** — 本フェーズは DB/ブラウザ往復レイヤーのみ |
| `dotenv` | (transitive) | playwright.config.ts が `.env.test` をロード | TEST project への向き先を build/runtime に注入 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 375px viewport project for 29 mobile | DevTools 手動目視 | 自動化が durable（回帰検出可）。D-02 が自動化目安に挙げているので自動を優先 |
| service_role admin で member 行を直接操作 | 実 Magic Link でログイン | session-injection（既存パターン）の方が高速・決定的。実メールは 27 #6 のみ手動 |

**Installation:** なし（既存依存のみ）。

**Version verification:** [VERIFIED: package.json + `npx playwright --version` → 1.60.0]。新規依存追加なしのため registry 検証不要。

## Package Legitimacy Audit

> このフェーズは外部パッケージを一切インストールしない（検証のみ、src/ 不変）。Package Legitimacy Gate は N/A。

| Package | Disposition |
|---------|-------------|
| (none — no installs) | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Outstanding Gap Inventory（正確な enumeration + disposition）

各ギャップの現状（pending / human_needed）と本フェーズでの処理方針。**結果はここに挙げた既存ファイルを in-place 更新する（D-09）**。

### Phase 27 — `27-HUMAN-UAT.md`（6 pending）＋ `27-VERIFICATION.md`（human_verification 6）
これら 2 ファイルは同一の 6 項目を表す（VERIFICATION の `human_verification` と HUMAN-UAT の Tests #1-6 が 1:1 対応）。

| # | 項目 | 現状 | Disposition | 自動化メモ |
|---|------|------|-------------|-----------|
| 1 | SQL migration 適用（substack_handle カラム存在） | pending | **manual-production** | 本番(`xolhjcngrwwwqtklmoyk`)で `SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle'`。TEST project は E2E global-setup が前提とするので暗黙確認済み。手動 SQL Editor |
| 2 | @handle input が /my に描画 | pending | **automate** (logged-in) | TEST member.substack_handle が NULL のとき `#substack_handle` input が描画される。`getByLabel('Substack ハンドル')` で検証 |
| 3 | @handle 保存往復（"hoge"→"@hoge" pre-fill） | pending | **automate** (logged-in) | ⚠ 実装変更注意（下記 Pitfall 1）: handle は一度設定したら変更不可。NULL 開始 → 入力 → 保存 → reload で `@hoge` 表示（read-only `<p>`）を検証。afterEach で member.substack_handle=NULL に戻す |
| 4 | CalendarGrid プロフィールリンク（handle set 時） | pending | **automate** (logged-in or anonymous) | `/member/[publicationId]` で `<a href="https://substack.com/@handle" target="_blank">` の存在を検証。member 行の handle を admin でセット |
| 5 | CalendarGrid リンクなし（handle null 時） | pending | **automate** | 同ページで名前/アイコンが `<a>` でラップされていない（plain div）ことを検証 |
| 6 | Magic Link `?handle=hoge` 伝播 | pending | **manual-production** | 実メール配信 + auth callback 往復。D-03 により自動化しない。本番手動（D-04） |

**Phase 27 まとめ:** automate=4（#2,#3,#4,#5）、manual-production=2（#1,#6）。SC#1「本番環境で」要件のため、**#2-#5 も本番で開発者が手動で一度通す**（QA-01）。自動化はそれと並行する durable な TEST-project 回帰レイヤー（D-05）。

### Phase 28 — `28-VERIFICATION.md`（human_verification 2）

| # | 項目 | 現状 | Disposition | メモ |
|---|------|------|-------------|------|
| 1 | member_commit_slots テーブル存在＋RLS＋UNIQUE（本番） | human_needed | **resolved-by-reference → Phase 32** | D-07。Phase 32 で本番(`xolhjcngrwwwqtklmoyk`)に適用確認済み（DB-02 Complete, REQUIREMENTS.md）。再検証しない、ポインタのみ記録 |
| 2 | /my スケジュール宣言フルフロー操作 | human_needed | **automate** (logged-in) | モーダル開閉・頻度変更でスロット増減・重複曜日警告＋ボタン無効化・宣言保存・reload 後サマリー表示・DB 書き込み。Phase 33 で保存は RPC `replace_member_commit_slots` 経由（Pitfall 2） |

**Phase 28 まとめ:** automate=1（#2）、resolved-by-reference=1（#1）。

### Phase 29 — `29-VERIFICATION.md`（human_verification 3）＋ `29-HUMAN-UAT.md`（resolved 3/3、再実行しない）

| # | 項目 | 現状 | Disposition | メモ |
|---|------|------|-------------|------|
| 1 | モバイル(375px)で 1週のみ表示 | human_needed | **automate** (375px viewport) | week-0/week-1 が `hidden sm:flex` で `toBeHidden()`、week-2 が `toBeVisible()`。Playwright が CSS メディアクエリの display:none を検出（HIGH 信頼） |
| 2 | / の3列レイアウト整合性 | human_needed | **automate (部分)** + manual 補完 | 3カラムの構造存在/順序は DOM で検証可能。ピクセル整列の目視は本番手動でカバー。下記「29 #2 の自動化境界」参照 |
| 3 | /weekly-stamp 旧ヒートマップ＋タブナビ | human_needed | **automate** (anonymous) | `/weekly-stamp` 到達 → WeeklyHeatmapGrid 描画 + タブ href が `/weekly-stamp` ベースであることを検証 |

**Phase 29 HUMAN-UAT.md（3/3 resolved）:** D-07 により**再実行しない**。参照のみ。
**Phase 29 まとめ:** automate=2.5（#1, #3 完全 / #2 構造のみ自動 + 目視補完）。

### Grand Total
- **automate（TEST project, durable）:** 27 #2,#3,#4,#5 / 28 #2 / 29 #1,#2(部分),#3 = 7〜8 spec ケース
- **manual-production:** 27 #1（SQL）, 27 #6（Magic Link）, + QA-01 のため 27 #2-#5 も本番手動で一巡
- **resolved-by-reference:** 28 #1（→Phase 32）, 29 HUMAN-UAT 3/3（→既 resolved）

## Architecture Patterns

### System Architecture Diagram

```
                        Phase 36 検証の二層構造
                        ─────────────────────

[自動レイヤー: durable 回帰]              [手動レイヤー: SC#1 本番充足]
TEST project (otydhiumsdsyxepnjqjp)        本番 (xolhjcngrwwwqtklmoyk
                                            / https://keep-substack.com)
        │                                          │
   playwright.config.ts                       開発者ブラウザ
   webServer: npm build+start                 （自分のメンバー行のみ）
   .env.test → TEST project                        │
        │                                          │
        ├─ global-setup.ts                    手動ランブック実行:
        │   ├ seed: auth user/team/member      ① SQL Editor: information_schema
        │   ├ mintAuthCookies (@supabase/ssr)  ② @handle 描画目視
        │   └ → e2e/.auth/user.json            ③ 保存往復 + reload
        │                                       ④/⑤ profile link 目視
        ├─ logged-in project (storageState):   ⑥ Magic Link 実メール往復
        │   ├ 27-handle.spec.ts  (#2,#3,#4,#5)      ↑ Redirect URL 事前確認(D-06)
        │   └ 28-commit-flow.spec.ts (#2)           │
        │       └→ RPC replace_member_commit_slots  │
        │                                          結果を
        ├─ 375px viewport project:                 in-place 更新
        │   └ 29-mobile.spec.ts  (#1)              (D-09)
        │                                          27/28/29 の
        └─ anonymous/desktop project:              HUMAN-UAT.md /
            └ 29-layout-nav.spec.ts (#2,#3)        VERIFICATION.md
                                                        │
   afterEach: member_id スコープ delete            失敗 → 新規バグ化 (D-10)
   (truncate 禁止) で TEST データ復元                    │
        │                                              ▼
        └──────────────► v1.8 go / no-go 判定 (D-11) ◄──┘
```

### Recommended Project Structure
```
e2e/
├── global-setup.ts          # 既存 — seed + mint。⚠ 拡張要(下記)
├── playwright.config.ts      # 既存 — projects に 375px viewport を追加
├── helpers/
│   ├── session.ts            # 既存 mintAuthCookies — 再利用
│   └── admin.ts              # 既存 createTestAdmin — 再利用
├── fixtures/
│   └── test-data.ts          # 既存 TEST 定数 — 再利用
├── login.spec.ts             # 既存（変更なし）
├── my-teams.spec.ts          # 既存（変更なし — afterEach パターンの手本）
├── admin-guard.spec.ts       # 既存（変更なし）
├── 27-handle.spec.ts         # NEW — logged-in: #2,#3,#4,#5
├── 28-commit-flow.spec.ts    # NEW — logged-in: #2 フルフロー
├── 29-mobile.spec.ts         # NEW — 375px viewport: #1 縮退
└── 29-layout-nav.spec.ts     # NEW — desktop/anonymous: #2 構造, #3 ナビ
```

### Pattern 1: session-injection logged-in spec（既存パターン踏襲）
**What:** storageState（`e2e/.auth/user.json`、global-setup が mint）を `logged-in` プロジェクトで自動添付。spec は `page.goto('/my')` するだけで認証済み。
**When to use:** 27 #2/#3、28 #2 のように認証必須の /my 操作。
**Example:**
```typescript
// Source: e2e/my-teams.spec.ts（既存、踏襲対象）
import { test, expect } from '@playwright/test'
import { createTestAdmin } from './helpers/admin'
import { TEST } from './fixtures/test-data'

test('public チームに参加できる (E2E-02)', async ({ page }) => {
  await page.goto('/my')
  await page.getByRole('checkbox', { name: TEST.teamName }).check()
  await page.getByRole('button', { name: '保存する' }).click()
  // expect.poll が server-action のレイテンシを吸収（waitForTimeout 禁止）
  const admin = createTestAdmin()
  await expect.poll(async () => { /* DB delta を読む */ }).toBe(1)
})
```

### Pattern 2: member_id スコープ afterEach クリーンアップ（mutation を伴う spec 必須）
**What:** 各テスト後に TEST member が触れた行だけを `member_id` で削除。**truncate 禁止**、他メンバー非汚染。
**When to use:** 27 #3（handle を書く）、28 #2（commit slots を書く）。
**Example:**
```typescript
// Source: e2e/my-teams.spec.ts:33-45（既存パターン）
test.afterEach(async () => {
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId() // publication_id → id
  // 27 #3: handle を NULL に戻す（一度設定すると編集不可になるため必須リセット）
  await admin.from('members').update({ substack_handle: null }).eq('id', memberId)
  // 28 #2: commit slots を削除
  await admin.from('member_commit_slots').delete().eq('member_id', memberId)
})
```

### Pattern 3: 375px viewport project で CSS 縮退を検証（29 #1）
**What:** 専用プロジェクトを `viewport: { width: 375, height: 800 }` で定義。Playwright の `toBeHidden()` はメディアクエリ由来の `display:none` を検出するため、`hidden sm:flex`（< 640px で非表示）が信頼性高く判定できる。
**When to use:** 29 #1 モバイル1週縮退。
**Example:**
```typescript
// 29-mobile.spec.ts — week-0/1 が hidden、week-2 が visible
test('375px で最新週のみ表示 (VIEW-07)', async ({ page }) => {
  await page.goto('/')
  const grids = page.locator('div.flex.flex-1.gap-2') // CommitGrid root
  // week-0/week-1 は className に 'hidden sm:flex' → 375px で display:none
  // week-2 は常時 'flex flex-1' → visible
  // 構造的に最も安定するのは「可視の週ブロック数 == 1」を数えること
})
```
**Note (信頼度):** HIGH。WebSearch で確認 — Playwright の `toBeVisible/toBeHidden` は親要素の `display:none`（Tailwind `sm:` ブレークポイント由来）を visibility 判定に含める。375px viewport プロジェクトで media query が実際に適用される。

### Pattern 4: anonymous project でナビ/構造を検証（29 #2 構造, #3 ナビ）
**What:** storageState なしの `anonymous` プロジェクト（既存 admin-guard.spec.ts と同型）。/ と /weekly-stamp はログイン不要で閲覧可能。
**When to use:** 29 #3（weekly-stamp タブナビ）、29 #2 の構造カラム検証。

### Anti-Patterns to Avoid
- **`waitForTimeout` でレイテンシ吸収:** 既存ハーネスは `expect.poll` / auto-waiting を使う。固定 sleep は flaky。
- **truncate / 全件 delete:** TEST project は dev と共有。必ず `member_id` スコープ delete（D-09 / Pattern 2）。
- **本番(`xolhjcngrwwwqtklmoyk`)を E2E のターゲットにする:** 不可能かつ禁止（D-05）。`.env.test` は TEST project のみ。本番充足は手動パス。
- **ピクセル整列を Playwright で厳密 assert:** 29 #2 のレイアウト「整列」は脆い。構造（カラム存在・順序）のみ自動化し、見た目の整列は本番目視で補完。
- **27 #3 で handle を NULL に戻し忘れる:** 実装が「設定後は編集不可」なので、リセットしないと再実行時に input が出ず spec が壊れる（Pitfall 1）。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 認証 cookie の生成 | 手書きの JWT/base64 chunk encoding | 既存 `mintAuthCookies`（@supabase/ssr setSession） | proxy.ts の getUser() と互換保証。cookie 名/base64-prefix/3180byte chunking は内部生成（session.ts コメント参照） |
| DB 状態の seed/assert/cleanup | 直 SQL スクリプト | 既存 `createTestAdmin`（service_role） | RLS バイパス、既存パターン。型安全な supabase-js クライアント |
| CSS メディアクエリの検証 | DOM の computed style を手で読む | Playwright `toBeVisible/toBeHidden` + viewport project | 親の display:none を自動考慮。375px project で media query 実適用 |
| commit slots の保存ロジック検証 | actions.ts のロジックを再実装 | 実 Server Action を /my モーダル経由で駆動 → RPC `replace_member_commit_slots` の結果を DB で確認 | E2E は実装をブラックボックスとして往復検証。ユニットは既に 8 件 green |

**Key insight:** Phase 26 で確立した session-injection ハーネスが「実 DB 契約をモックなしで検証する基盤」として完成している。本フェーズの自動化は全てこの基盤の薄い追加レイヤーであり、新しい仕組みは一切作らない。

## Runtime State Inventory

> 本フェーズは検証フェーズ（src/ 不変）。コード rename/migration ではないが、E2E が TEST project に書き込む runtime state を扱うため記載。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | TEST project(`otydhiumsdsyxepnjqjp`) の seed: auth user `playwright-test-user@e2e.keep-substack.local` / team `e2e-public-team` / member `e2e-test-publication`。本フェーズ追加: TEST member の `substack_handle`（27 #3 で一時セット）/ `member_commit_slots` 行（28 #2 で一時セット） | afterEach で member_id スコープ復元（handle→NULL, slots→delete）。Pattern 2 |
| Live service config | **本番 Supabase Auth の Redirect URLs / Site URL（D-06 landmine）** — ドメイン移行 keep-substack.vercel.app → keep-substack.com。Magic Link UAT(#6) 実行前に新ドメインが許可されているか要確認 | 手動: Supabase Dashboard → Authentication → URL Configuration で `https://keep-substack.com/**` と auth callback を確認。下記ランブック §0 |
| OS-registered state | None — verified（E2E はローカル webServer のみ、OS 登録なし） | none |
| Secrets/env vars | `.env.test`（NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SERVICE_ROLE_KEY → TEST project）。本番手動 UAT は開発者の通常ログイン認証情報を使う（コード/env 変更なし） | none — 既存 .env.test を再利用。新規 secret 不要 |
| Build artifacts | playwright webServer が `npm run build` を TEST env で実行（NEXT_PUBLIC_* が build-time inline）。`npm run dev` が :3000 で起動中だと誤ってアタッチする危険（playwright.config.ts Pitfall 6 警告） | E2E 実行前に dev サーバを停止する手順をランブックに明記 |

## Manual Production UAT Runbook（QA-01 / 27 #1, #6）

SC#1「本番環境で」を充足する開発者手動パス。本番 https://keep-substack.com、開発者自身のメンバー行のみ対象、検証後に変更値を元に戻す（D-04）。

### §0. 事前チェック（landmine — D-06）⚠ 最初に必ず実行
1. Supabase Dashboard（本番 `xolhjcngrwwwqtklmoyk`）→ **Authentication → URL Configuration** を開く。
2. **Site URL** が `https://keep-substack.com` になっているか確認。
3. **Redirect URLs** に `https://keep-substack.com/**`（または最低限 `https://keep-substack.com/auth/callback`）が含まれているか確認。旧 `keep-substack.vercel.app` だけだと Magic Link(#6) が新ドメインにリダイレクトできず失敗する。
4. 不足していたら追加してから #6 を実行する。**この確認を飛ばすと #6 は確実に失敗する。**

### §1-#1. SQL migration 適用確認
- Supabase SQL Editor（本番）で `SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle';` → 1 行返ることを確認。`SELECT substack_handle FROM members LIMIT 5;` で既存行が NULL であることを確認。
- 結果を `27-HUMAN-UAT.md` Test #1 / `27-VERIFICATION.md` human_verification[6] に記録。

### §2-#2〜#5. /my + /member 目視（本番、自分のアカウント）
- `https://keep-substack.com/my` にログイン → @handle input 描画（#2）→ "hoge" 保存 → reload で "@hoge"（#3）→ `/member/[自分の publicationId]` で名前/アイコンが `substack.com/@hoge` を新タブで開く（#4）→ handle を空にして保存し直し（NULL）→ リンクが消える（#5）→ **検証後 handle を元の値に戻す**（D-04）。
- ⚠ 実装注意: handle は一度設定すると read-only 表示になる（Pitfall 1）。#5 の「null に戻す」は本番でも編集不可になっている可能性 — その場合は SQL Editor で `UPDATE members SET substack_handle=NULL WHERE id='<自分のid>'` で戻す。

### §3-#6. Magic Link `?handle=` 伝播
- §0 を完了済みであること。`https://keep-substack.com/login-51cf21389c56/?handle=hoge` でメール送信 → 受信メールの Magic Link クリック → `/my?handle=hoge` に着地 → DB handle が NULL のとき input に "hoge" が pre-fill されることを確認。
- 結果を `27-HUMAN-UAT.md` Test #6 / `27-VERIFICATION.md` human_verification[5] に記録。

### 結果記録（D-09）
全 27 項目を `27-HUMAN-UAT.md`（Tests #1-6 の `result:` 行 + Summary カウント + status frontmatter）と `27-VERIFICATION.md`（status: human_needed → verified、Human Verification セクションに pass 記録）に in-place 更新。失敗時は §D-10 で新規バグ化。

## Common Pitfalls

### Pitfall 1: @handle が「設定後は編集不可」に変更されている（実装ドリフト）
**What goes wrong:** Phase 27 検証時の前提（編集可能な input が常にある）で 27 #3 spec を書くと、handle が既にセットされた member では input が存在せず spec が壊れる。
**Why it happens:** `MyProfileForm.tsx:52-71` が `substackHandle != null` のとき read-only `<p>` + hidden input を、null のときのみ編集可能 `#substack_handle` input をレンダリングする（現行コードで確認）。Phase 27 VERIFICATION の Truth #6/#7 が記述した「保存・再ロードで pre-fill」は今や「初回設定のみ」の振る舞い。
**How to avoid:** spec は **member.substack_handle=NULL の状態から開始**（global-setup の seed は handle を設定しないので初期 NULL）。各 #3 テスト後に afterEach で `substack_handle=null` に戻す（Pattern 2）。assert は「保存後 reload で read-only `<p>` に @hoge が表示される」へ更新。
**Warning signs:** `getByLabel('Substack ハンドル')` で input が見つからない / 2回目以降の実行で失敗。
**Confidence:** [VERIFIED: MyProfileForm.tsx を直読]

### Pitfall 2: commit slots 保存は delete+insert ではなく RPC（Phase 33 アトミック化）
**What goes wrong:** 28 VERIFICATION は「delete → insert 全置換」と記述するが、現行 `actions.ts:176` は RPC `replace_member_commit_slots` を呼ぶ。DB 検証で誤った内部動作を前提にしない。
**Why it happens:** Phase 33（DB-01）が部分失敗排除のため upsert/RPC 化。RPC は schema.sql:150 と migration `20260608000000` に存在（確認済み）。
**How to avoid:** E2E は内部実装に依存せず「宣言する → reload 後 member_commit_slots 行が期待通り」を検証（ブラックボックス）。RPC が TEST project に適用済みか global-setup or 事前確認で担保。
**Warning signs:** 保存が無音で失敗（RPC 未適用なら `rpcError`）。
**Confidence:** [VERIFIED: actions.ts + schema.sql + migrations/ を直読]

### Pitfall 3: `reuseExistingServer` が dev サーバにアタッチして本番 env を読む
**What goes wrong:** `npm run dev` が :3000 で起動中に `npm run test:e2e` を実行すると、Playwright が dev サーバにアタッチし、誤って本番 Supabase を読み書きする可能性。
**Why it happens:** `reuseExistingServer: !process.env.CI`（playwright.config.ts:47、コメントで警告済み）。NEXT_PUBLIC_* は build-time inline なので dev サーバは TEST project を指していない。
**How to avoid:** E2E 実行前に dev サーバを停止。ランブック/タスクに明記。
**Confidence:** [VERIFIED: playwright.config.ts のインラインコメント]

### Pitfall 4: 29 #2「3列レイアウト整列」のピクセル整列は自動化に向かない
**What goes wrong:** flex のピクセル単位の整列・スペーシングを Playwright で厳密 assert すると flaky。
**Why it happens:** CSS レイアウトの視覚的整合性は bounding box の僅差で揺れる。29 VERIFICATION 自身が「RSC element-tree inspection では検証不能」と記述。
**How to avoid:** 構造（3カラムの存在・順序: Link → CommitGrid/未コミット → achievement div）のみ自動化。見た目の整列は本番目視（QA-01 と同時）で補完。下記「29 #2 の自動化境界」。
**Confidence:** [VERIFIED: CommitGoalRow.tsx の3カラム構造を直読]

### Pitfall 5: 単一共有 TEST ユーザーの直列実行前提を崩さない
**What goes wrong:** 新 spec を並列化すると共有 member 行（handle / commit_slots）でレースし flaky。
**Why it happens:** `playwright.config.ts:23-24` が `fullyParallel: false` / `workers: 1`。理由は共有テストユーザー。
**How to avoid:** 新 spec も既存設定を踏襲（変更しない）。afterEach で必ず状態復元。
**Confidence:** [VERIFIED: playwright.config.ts]

## 29 #2 の自動化境界（線引き — Claude's Discretion D-02）

| 観点 | 自動化 (Playwright) | 手動目視 (本番) |
|------|---------------------|------------------|
| 各行に Link(avatar+name) が存在 | ✓ DOM で `a[href^="/member/"]` を数える | — |
| CommitGrid または「未コミット」が中央に存在 | ✓ テキスト/構造で検証 | — |
| 右端 achievement カラム(`w-10 shrink-0`)が存在 | ✓ 構造で検証 | — |
| 3カラムが水平に整列して見える | △ bounding box の x 座標順序のみ | ✓ 最終目視 |
| スペーシング/視覚的バランス | ✗ | ✓ |

推奨: 構造アサーション（カラム存在・順序）を `29-layout-nav.spec.ts` に入れ、ピクセル整列は QA-01 本番目視に委譲。29-VERIFICATION #2 は「構造 automate pass + 本番目視 pass」で close。

## Code Examples

### 27 #4: プロフィールリンク存在検証
```typescript
// member 行に handle をセット → /member ページでリンク検証 → afterEach で NULL 復元
// Source: CalendarGrid.tsx:63-68 の <a href={'https://substack.com/' + substackHandle} target="_blank">
test('handle 設定時に profile link が出る (PROF-02)', async ({ page }) => {
  const admin = createTestAdmin()
  await admin.from('members').update({ substack_handle: '@hoge' })
    .eq('publication_id', TEST.publicationId)
  await page.goto(`/member/${TEST.publicationId}`)
  const link = page.locator('a[href="https://substack.com/@hoge"][target="_blank"]')
  await expect(link).toBeVisible()
})
```

### 28 #2: commit schedule フルフロー
```typescript
// Source: CommitScheduleModal.tsx — トリガー「投稿スケジュールを宣言する」/ 頻度 select#frequency
//   / 重複警告「同じ曜日を複数選択しています」/ 送信「宣言する」
test('スケジュール宣言フルフロー (SCHED-01/02/03)', async ({ page }) => {
  await page.goto('/my')
  await page.getByRole('button', { name: '投稿スケジュールを宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#frequency').selectOption('2')
  // スロット行が2つに増える
  await expect(page.locator('#day-1')).toBeVisible()
  // 重複曜日 → 警告 + ボタン無効化
  await page.locator('#day-0').selectOption('1')
  await page.locator('#day-1').selectOption('1')
  await expect(page.getByText('同じ曜日を複数選択しています')).toBeVisible()
  await expect(page.getByRole('button', { name: '宣言する' })).toBeDisabled()
  // 別曜日にして宣言 → モーダルが閉じる
  await page.locator('#day-1').selectOption('3')
  await page.getByRole('button', { name: '宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  // DB 往復: member_commit_slots に2行
  const admin = createTestAdmin()
  await expect.poll(async () => { /* count rows for member_id */ }).toBe(2)
  // reload 後サマリー表示
  await page.reload()
  await expect(page.getByText(/週2回 —/)).toBeVisible()
})
```

## State of the Art

| Old Approach（Phase 27/28 検証時の前提） | Current Approach（現行コード） | When Changed | Impact |
|-------------|------------------|--------------|--------|
| @handle は /my で常に編集可能 | 設定後は read-only（null 時のみ編集） | Phase 31 前後（substack_handle unique 追加と同時期） | 27 #3 spec は NULL 開始 + afterEach リセット必須（Pitfall 1） |
| commit slots = delete + insert 全置換 | RPC `replace_member_commit_slots`（アトミック） | Phase 33（DB-01） | 28 #2 はブラックボックス往復で検証（Pitfall 2） |
| 本番 = keep-substack.vercel.app | 本番 = https://keep-substack.com | v1.8 期間中 | Magic Link Redirect URL 事前確認必須（D-06 / ランブック §0） |

**Deprecated/outdated:**
- 27/28 VERIFICATION.md の本文記述の一部（編集可能 handle、delete+insert）は現行実装とドリフト。検証の assert は本文ではなく**現行ソース**を基準にする。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TEST project に migration（substack_handle / member_commit_slots / replace_member_commit_slots RPC）が全て適用済み | Outstanding Gap Inventory / Pitfall 2 | spec が RPC 未適用で失敗。緩和: global-setup で軽い存在確認 or 初回手動 push |
| A2 | 本番 Redirect URLs が keep-substack.com を含むかは未確認（要 Dashboard 目視） | Runbook §0 | #6 が失敗 → D-06 がまさにこの確認を要求。ランブック §0 で先頭にゲート化 |
| A3 | 29 #2 のピクセル整列は本番目視で十分（構造のみ自動） | 29 #2 自動化境界 | 過剰自動化で flaky。D-02 が自動/手動の線引きを Claude's Discretion に委ねている |
| A4 | Magic Link メール往復は自動化しない（D-03 準拠） | Disposition table 27 #6 | なし — D-03 が明示的に「無理に自動化しない」 |

## Open Questions

1. **TEST project への RPC/migration 適用状態**
   - What we know: schema.sql / migrations/ にコードは存在。global-setup は migration を流さない（seed のみ）。
   - What's unclear: TEST project の DB に `replace_member_commit_slots` RPC と member_commit_slots UNIQUE が反映済みか。
   - Recommendation: 28 spec を書く前に Supabase SQL Editor（TEST）で RPC 存在を 1 度確認、または global-setup に存在チェック（fail-fast）を追加。28 #2 の前提条件タスクとして planner が組む。

2. **本番 #5（handle を null に戻す）が UI 上可能か**
   - What we know: 設定後は read-only。/my から空にして保存できない可能性。
   - What's unclear: actions.ts は handleBody=='' で null 化を許すが、フォームが hidden input で既存値を送るため UI からは戻せない設計の可能性。
   - Recommendation: 本番では SQL Editor で `UPDATE members SET substack_handle=NULL` を fallback（ランブック §2 に記載済み）。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@playwright/test` | 自動 spec 実行 | ✓ | 1.60.0 | — |
| Playwright browsers (Chromium) | E2E 実行 | 要確認 | — | `npx playwright install chromium` |
| `.env.test`（TEST project secrets） | global-setup / webServer | 要確認（gitignore） | — | `.env.test.example` から作成（global-setup が fail-fast） |
| TEST Supabase project `otydhiumsdsyxepnjqjp` | 全自動 spec | ✓（既存ハーネス green） | — | — |
| 本番 Supabase `xolhjcngrwwwqtklmoyk` + keep-substack.com | QA-01 手動 UAT | ✓ | — | — |
| Node / npm（build+start） | playwright webServer | ✓ | — | — |

**Missing dependencies with no fallback:** なし（既存ハーネスが 3 spec green = 環境は基本整っている）。
**Missing dependencies with fallback:**
- Chromium 未インストールなら `npx playwright install chromium`。
- `.env.test` 未配置なら `.env.test.example` から作成（global-setup の fail-fast がガード）。

## Validation Architecture

> nyquist_validation = true（config.json で確認）のため記載。本フェーズの「テスト」自体が成果物（spec が durable な回帰）である点が特殊。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.60.0（E2E）/ vitest 4.1.6（ユニット、既 green、本フェーズでは追加しない） |
| Config file | `playwright.config.ts`（projects に 375px viewport 追加が唯一の config 変更候補） |
| Quick run command | `npm run test:e2e -- 27-handle.spec.ts`（個別 spec） |
| Full suite command | `npm run test:e2e`（全 E2E。dev サーバ停止後に実行 — Pitfall 3） |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QA-02 | @handle 描画/保存往復/プロフィールリンク（27 #2-5） | e2e | `npm run test:e2e -- 27-handle.spec.ts` | ❌ Wave 0 |
| QA-03 | /my スケジュール宣言フルフロー（28 #2） | e2e | `npm run test:e2e -- 28-commit-flow.spec.ts` | ❌ Wave 0 |
| QA-04 | モバイル1週縮退（29 #1） | e2e | `npm run test:e2e -- 29-mobile.spec.ts` | ❌ Wave 0 |
| QA-04 | 3列構造 + weekly-stamp ナビ（29 #2,#3） | e2e | `npm run test:e2e -- 29-layout-nav.spec.ts` | ❌ Wave 0 |
| QA-01 | 本番6シナリオ + Magic Link（27 全） | manual | （手動ランブック — 自動コマンドなし） | N/A（manual） |
| QA-03 | member_commit_slots 本番存在（28 #1） | resolved-by-reference | （Phase 32 で確認済み — 再実行なし） | N/A |

### Sampling Rate
- **Per task commit:** 当該 spec を個別実行（`npm run test:e2e -- <spec>`）。
- **Per wave merge:** `npm run test:e2e`（全 spec green、dev サーバ停止確認後）。
- **Phase gate:** 全自動 spec green + 全手動ランブック項目が pass/バグ化記録済み → `/gsd:verify-work`。

### Wave 0 Gaps
- [ ] `e2e/27-handle.spec.ts` — QA-02（#2,#3,#4,#5）+ afterEach で handle NULL 復元
- [ ] `e2e/28-commit-flow.spec.ts` — QA-03（#2）+ afterEach で slots delete
- [ ] `e2e/29-mobile.spec.ts` — QA-04（#1、375px viewport project 前提）
- [ ] `e2e/29-layout-nav.spec.ts` — QA-04（#2 構造, #3 ナビ）
- [ ] `playwright.config.ts` — 375px viewport project 追加（29 #1 用）
- [ ] （前提）TEST project に replace_member_commit_slots RPC 適用確認（Open Question 1）
- [ ] （手動）Manual Production UAT Runbook 実行 + 27/28/29 .md の in-place 更新（D-09）

## Security Domain

> 本フェーズは検証のみで src/ 不変、新規攻撃面なし。ただし E2E が service_role を使い TEST project に書き込むため最小限の確認を記載。

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes（検証対象） | proxy.ts getUser() ゲート。session-injection は本番同一 cookie を検証 |
| V4 Access Control | yes（検証対象） | 非 admin テストユーザーで /admin リダイレクトを既に検証（E2E-03）。本フェーズは追加なし |
| V5 Input Validation | yes（検証対象） | @handle 正規表現バリデーション（actions.ts）/ commit slot 範囲チェック。E2E で往復検証 |
| V6 Cryptography | no | 本フェーズで暗号は扱わない |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role key の client bundle 露出 | Information Disclosure | `createTestAdmin` は e2e/ のみ。`.env.test` は gitignore。src/ に混入させない |
| E2E が誤って本番 DB を汚染 | Tampering | `.env.test` = TEST project 限定。dev サーバ停止（Pitfall 3）。本番手動 UAT は自分の行のみ + 値復元（D-04） |

## Sources

### Primary (HIGH confidence)
- `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/helpers/session.ts`, `e2e/helpers/admin.ts`, `e2e/fixtures/test-data.ts`, `e2e/my-teams.spec.ts`, `e2e/login.spec.ts`, `e2e/admin-guard.spec.ts` — 既存ハーネスの直読
- `src/app/my/MyProfileForm.tsx`, `src/app/my/CommitScheduleModal.tsx`, `src/app/my/actions.ts`, `src/app/my/page.tsx`, `src/components/CommitGrid.tsx`, `src/components/CommitGoalRow.tsx`, `src/components/CalendarGrid.tsx`, `src/app/member/[publicationId]/page.tsx` — 現行実装の直読（実装ドリフト発見）
- `supabase/schema.sql`, `supabase/migrations/*` — RPC / UNIQUE 制約の存在確認
- `.planning/phases/{27,28,29}/*-VERIFICATION.md` / `*-HUMAN-UAT.md` — ギャップ enumeration の正典
- `.planning/config.json`（nyquist_validation=true）, `package.json`（版数）, `npx playwright --version`（1.60.0）

### Secondary (MEDIUM confidence)
- [Playwright element visibility validation](https://medium.com/@liubotester/playwright-element-visibility-validation-08d3ff310f43) — toBeVisible が親の display:none を考慮することの確認
- [Mastering Playwright's toBeVisible](https://runebook.dev/en/docs/playwright/api/class-locatorassertions/locator-assertions-to-be-visible) — visibility 判定基準（display:none / visibility:hidden / 親要素）

### Tertiary (LOW confidence)
- なし（全主張をソース直読で裏付け）

## Metadata

**Confidence breakdown:**
- Outstanding gap inventory: HIGH — 全ギャップを正典ファイルから 1:1 enumeration
- 自動化 how-to: HIGH — 既存ハーネスパターン + 現行ソース直読。実装ドリフト 2 件を発見し反映
- CSS 縮退の自動化可否: HIGH — Playwright 公式挙動（toBeVisible が media query 由来 display:none を検出）を WebSearch で確認
- 手動ランブック / Redirect URL: MEDIUM — D-06 の landmine は Dashboard 目視が前提（A2）

**Research date:** 2026-06-08
**Valid until:** 2026-07-08（安定。ただし src/ が次フェーズで変わると実装ドリフト前提が古くなる）

Sources:
- [Playwright element visibility validation](https://medium.com/@liubotester/playwright-element-visibility-validation-08d3ff310f43)
- [Mastering Playwright's toBeVisible](https://runebook.dev/en/docs/playwright/api/class-locatorassertions/locator-assertions-to-be-visible)
