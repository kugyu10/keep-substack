---
phase: 28-db-my
verified: 2026-06-03T12:30:00Z
status: human_needed
score: 13/14 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "member_commit_slots テーブルが Supabase dev/prod DB に存在することを Dashboard で確認する"
    expected: "Dashboard の Table Editor で member_commit_slots テーブルが表示され、カラム id/member_id/day_of_week/hour が存在し RLS が有効で 2 つのポリシーが登録されている"
    why_human: "supabase db push の結果はコードから検証できない。SUMMARY は dev 環境に push したと記載しており、prod DB（xolhjcngrwwwqtklmoyk）への適用状況はブラウザ確認が必要"
  - test: "/my ページでコミットスケジュール設定のフルフローを確認する"
    expected: "「投稿スケジュールを宣言する」ボタン表示 → クリックでモーダルが開く → 頻度変更でスロット行が増減する → 重複曜日選択で警告表示かつ「宣言する」ボタンが無効化される → 「宣言する」クリックで保存され Supabase に書き込まれる → ページリロード後もサマリーテキスト（例: 「週1回 — 月曜 8:00」）が表示される"
    why_human: "Client Component のインタラクション（モーダル開閉・動的スロット増減・成功時クローズ）は grep では確認できない。DB 書き込みの実ラウンドトリップも必要"
---

# Phase 28: 検証レポート

**Phase Goal:** コミットスケジュール設定機能の実装 — member_commit_slots テーブル追加 + /my ページで週1〜4回のスケジュールを設定・DB保存できるようにする
**Verified:** 2026-06-03T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `updateCommitSlotsAction` が `src/app/my/actions.ts` に独立した Server Action として実装されている（D-01） | VERIFIED | `actions.ts` line 119: `export async function updateCommitSlotsAction(...)` |
| 2  | プロフィール保存とスケジュール宣言は独立したボタンと Server Action で処理される（D-02） | VERIFIED | `updateMyProfileAction`（line 43）と `updateCommitSlotsAction`（line 119）が独立した関数として共存 |
| 3  | `CommitScheduleModal.tsx` が `src/app/my/` に Client Component として存在する（D-03） | VERIFIED | `CommitScheduleModal.tsx` line 1: `'use client'` |
| 4  | スケジュール未設定時は「投稿スケジュールを宣言する」ボタンが表示される（D-04） | VERIFIED | `CommitScheduleModal.tsx` line 101: `投稿スケジュールを宣言する` (savedSlots.length === 0 条件下) |
| 5  | スケジュール設定済み時は「週N回 — 月曜 8:00、水曜 20:00…」形式のサマリーテキストが表示される（D-05） | VERIFIED | `formatSummary` 関数が line 19〜22 に実装。`週${slots.length}回 — ${parts.join('、')}` |
| 6  | モーダルの開閉状態（isOpen）は CommitScheduleModal 自身の useState で管理される（D-06） | VERIFIED | `CommitScheduleModal.tsx` line 34: `const [isOpen, setIsOpen] = useState(false)` |
| 7  | `/my/page.tsx` がサーバーサイドで member_commit_slots を SELECT し props として CommitScheduleModal に渡す（D-07） | VERIFIED | `page.tsx` line 52〜60: Supabase クエリ → `commitSlots`。line 83: `<CommitScheduleModal initialSlots={commitSlots} />` |
| 8  | 頻度 select で 1〜4 を選択すると曜日+時刻ペアの入力欄が動的に増減する（D-08） | VERIFIED | `CommitScheduleModal.tsx` line 71〜79: `handleFrequencyChange` で slots 配列を増減。options: `[1, 2, 3, 4].map(...)` (line 155) |
| 9  | 各スロットに曜日 select（月〜日 = 1〜7）が存在する（D-09） | VERIFIED | `CommitScheduleModal.tsx` line 175: `[1, 2, 3, 4, 5, 6, 7].map(d => ...)` の select |
| 10 | 各スロットに時刻 select（00〜23）が存在する（D-10） | VERIFIED | `CommitScheduleModal.tsx` line 190: `Array.from({ length: 24 }, ...)` の select |
| 11 | 同一曜日を複数選択するとクライアントサイドで警告が表示され、送信ボタンが無効化される（D-11） | VERIFIED | `showDuplicateWarning` + line 200〜201 警告 `<p>` + `disabled={isPending \|\| showDuplicateWarning}` (line 210) |
| 12 | 送信ボタンのテキストは「宣言する」である（D-12） | VERIFIED | `CommitScheduleModal.tsx` line 214: `'宣言する'` |
| 13 | `updateCommitSlotsAction` が DELETE してから INSERT する全置換パターンで実装されている（D-17） | VERIFIED | `actions.ts` line 160〜179: delete(.eq) → (slots.length > 0 の場合のみ) insert |
| 14 | `member_commit_slots` テーブルが DB に存在し、RLS が有効で 2 つのポリシーが登録されている | UNCERTAIN | migration ファイルは正しく存在するが supabase db push の実行結果（dev または prod）はコードから確認不能 |

**Score:** 13/14 truths verified (1 UNCERTAIN = human_needed)

---

### D-16 偏差（計画からの変更点）

Plan 01 の must_have D-16 では「UNIQUE 制約なし（UIバリデーションのみで重複を防ぐ）」と規定されていた。しかしコードレビュー（28-REVIEW.md）の CR-03 指摘を受け、以下が追加された：

- `supabase/migrations/20260602000002_add_member_commit_slots_unique.sql`: `UNIQUE (member_id, day_of_week)` 制約を追加
- `schema.sql` line 62: `UNIQUE (member_id, day_of_week)` を追加

この変更は 28-REVIEW-FIX.md で文書化され意図的な品質改善。D-16 の「制約なし」方針は覆されたが、より堅牢な設計となっている。

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260602000001_add_member_commit_slots.sql` | CREATE TABLE DDL + RLS ポリシー | VERIFIED | 29 行。`member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE`, CHECK 制約, RLS 2 ポリシー, BEGIN/COMMIT ラップ |
| `supabase/migrations/20260602000002_add_member_commit_slots_unique.sql` | UNIQUE(member_id,day_of_week) 制約追加 | VERIFIED | 8 行。CR-03 対応として追加 |
| `supabase/schema.sql` | member_commit_slots の最終状態ミラー | VERIFIED | line 57〜63 に CREATE TABLE、line 74 に RLS 有効化、line 92〜103 に 2 ポリシーを含む |
| `src/app/my/__tests__/updateCommitSlotsAction.test.ts` | テストスイート（8 件 GREEN） | VERIFIED | 8 件全 GREEN（npm test -- updateCommitSlotsAction: 8 passed） |
| `src/app/my/CommitScheduleModal.tsx` | Client Component（モーダルUI） | VERIFIED | 220 行。`'use client'`, useActionState, role="dialog", aria-modal, hidden input, isFirstRender, savedSlots |
| `src/app/my/actions.ts` | `updateCommitSlotsAction` Server Action | VERIFIED | line 119〜183。バリデーション + auth + delete → insert + revalidatePath |
| `src/app/my/page.tsx` | member.id + commitSlots + CommitScheduleModal 統合 | VERIFIED | line 19 に `id,` SELECT、line 52〜60 に commitSlots クエリ、line 83 に CommitScheduleModal 統合 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CommitScheduleModal.tsx` | `actions.ts` | `useActionState(updateCommitSlotsAction, null)` | WIRED | line 45: `const [state, action, isPending] = useActionState(updateCommitSlotsAction, null)` |
| `page.tsx` | `CommitScheduleModal.tsx` | props: `initialSlots={commitSlots}` | WIRED | line 6: import、line 83: `<CommitScheduleModal initialSlots={commitSlots} />`。Note: memberId prop は WR-04 修正で削除済み（plan より slim な props） |
| `actions.ts` | `member_commit_slots` テーブル | `admin.from('member_commit_slots').delete().eq(...)` | WIRED | line 161〜163: delete、line 172〜174: insert（条件付き） |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CommitScheduleModal.tsx` | `savedSlots` (initialSlots 経由) | `page.tsx`: Supabase `admin.from('member_commit_slots').select(...)` | Yes — DB クエリ（`.select('id, day_of_week, hour').eq('member_id', ...).order('day_of_week')`） | FLOWING |
| `CommitScheduleModal.tsx` | `state` (useActionState) | `updateCommitSlotsAction` の戻り値 | Yes — `null`（成功）または エラーメッセージ文字列 | FLOWING |
| `actions.ts` | `slots` | `formData.get('slots')` → JSON.parse | Yes — FormData からパース、バリデーション済み | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| updateCommitSlotsAction ユニットテスト（8件） | `npm test -- updateCommitSlotsAction` | 8 passed | PASS |
| TypeScript ビルド | `npm run build` | exit 0 (`✓ Compiled successfully`) | PASS |
| 全テストスイート（TEAM-04 は Phase 28 開始前から失敗） | `npm test` | 1 failed (TEAM-04, pre-existing) / 61 passed | PASS (既存失敗) |

---

### Probe Execution

Phase 28 のプランにプローブスクリプトの定義はない。Step 7c は SKIPPED。

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHED-01 | 28-01, 28-02 | User can set weekly commit frequency (1, 2, 3, or 4 times) from /my page | SATISFIED | CommitScheduleModal に `[1, 2, 3, 4].map(n => ...)` select + handleFrequencyChange で動的スロット増減 |
| SCHED-02 | 28-01, 28-02 | User can set day-of-week and hour (00–23, minutes fixed at :00) for each commit slot | SATISFIED | day_of_week select (1〜7 ISO 8601) + hour select (0〜23) を各スロット行に実装 |
| SCHED-03 | 28-01, 28-02 | Commit schedule is persisted in DB (member_commit_slots table: member_id, day_of_week, hour) | SATISFIED (with caveat) | migration ファイルで DDL 定義済み、actions.ts で delete→insert DB 書き込み実装済み。ただし DB への実適用（supabase db push）は dev 環境のみ確認（prod は要人間確認） |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/my/__tests__/updateCommitSlotsAction.test.ts` | 26 | `// TODO: implement in Plan 02` | INFO | Plan 02 は完了しアクションも実装済み。テストも全件 GREEN のため実害なし。ただし完了済みタスクへの TODO コメントが残留 |
| `src/app/my/page.tsx` | 複数箇所 | `(member as any).id`, `(member.member_teams as any[])` 等の `as any` キャスト | INFO | 28-REVIEW.md で INFO-03 として記録。機能的問題なし。型安全性の改善余地あり |

**Debt Marker Gate (TBD/FIXME/XXX):** 対象ファイルに TBD/FIXME/XXX は存在しない。ゲート通過。

**TODO on line 26:** `// TODO: implement in Plan 02` は Wave 0 テストスキャフォールド作成時の意図的マーカー。Plan 02 完了後も削除されていないが、下の import 行が `'../actions'` から正常に動作（8件全 GREEN）しており、このコメントは現状の動作に影響しない。ただし stale なコメントとして WARNING とする。

---

### Human Verification Required

#### 1. Supabase DB への実適用確認

**Test:** Supabase Dashboard (dev 環境: otydhiumsdsyxepnjqjp) の Table Editor で `member_commit_slots` テーブルを確認する。必要に応じて prod 環境（xolhjcngrwwwqtklmoyk）への `supabase db push` も実施する。
**Expected:** テーブルが存在し、カラム `id (int8)`, `member_id (uuid)`, `day_of_week (int4)`, `hour (int4)` が確認できる。Authentication → RLS で `member_commit_slots` に RLS 有効 + `public select member_commit_slots` と `member write own commit slots` の 2 ポリシーが登録されている。また `20260602000002` の UNIQUE 制約も DB に反映されていること。
**Why human:** `supabase db push` の実行結果はコードから検証不能。SUMMARY.md では dev 環境に push したと記録されているが、実際のテーブル状態は Dashboard 確認が唯一の証拠。

#### 2. /my ページでのフルフロー動作確認

**Test:** `npm run dev` で開発サーバーを起動し、ログイン済みの状態で http://localhost:3000/my にアクセスする。
**Expected:** 以下のすべてが動作すること:
- ページ下部に「投稿スケジュール」セクションと「投稿スケジュールを宣言する」ボタンが表示される
- ボタンをクリックするとモーダルが開き「投稿スケジュールを宣言」タイトルが表示される
- 頻度を「2」に変更するとスロット行が 2 行に増える
- 同じ曜日を複数選択すると「同じ曜日を複数選択しています」警告が表示され「宣言する」ボタンが無効化される
- 別々の曜日を設定して「宣言する」をクリックするとモーダルが閉じる
- ページリロード後に「週1回 — 月曜 8:00」などのサマリーテキストが表示される
- Supabase Dashboard の `member_commit_slots` テーブルにデータが保存されている
- Escape キー / × ボタン / オーバーレイクリックでモーダルが閉じる
**Why human:** Client Component のインタラクション（モーダル開閉・動的スロット増減・成功時自動クローズ）は grep では検証できない。実 DB 書き込みの往復動作も確認が必要。

---

### Pre-existing Test Failure Note

`src/app/__tests__/page.test.tsx` の TEAM-04「team-selected view: shows members of selected team REGARDLESS of status」テストは Phase 28 開始前（commit `89966f0` 時点）からすでに失敗状態にある。Phase 28 のコードはこのファイルを変更しておらず（`git log --all -- src/app/__tests__/page.test.tsx` で最終変更は `129b539` = Phase 22）、Phase 28 が原因の失敗ではない。Phase 28 の pass/fail 判断に影響しない。

---

### Gaps Summary

技術的な BLOCKER は存在しない。すべての must-have は実装レベルで VERIFIED または UNCERTAIN（DB 実適用）であり、UNCERTAIN については Human Verification で解消できる。

D-16 の計画偏差（UNIQUE 制約追加）はコードレビューを経た意図的な品質改善であり、より堅牢な実装となっている。

---

_Verified: 2026-06-03T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
