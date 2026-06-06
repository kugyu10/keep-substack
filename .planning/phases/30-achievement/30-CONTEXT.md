# Phase 30: アチーブメント（👑 / 🔥） - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

`isCurrentWeekComplete` / `consecutiveWeekStreak` の計算ロジックを `commitUtils.ts` に実装し、`CommitGoalRow` の既存 achievement 列（D-09 で確保済みの `w-8` プレースホルダー）に 👑 / 🔥 アイコンを表示する。あわせて `sortMembersForCommitView` の D-10 完全版（実績率→ストリーク→登録順）を実装する。

**Requirements:** ACHIEV-01, ACHIEV-02

</domain>

<decisions>
## Implementation Decisions

### 🔥 連続達成の判定スコープ
- **D-01:** `consecutiveWeekStreak` は**今週（進行中）を含める**。今週の全スロットに投稿があれば streak = 1 としてカウント開始し、先週も全達成なら streak = 2 → 🔥 表示。「今頑張っている人を今すぐ表彰する」アプローチ。
  - 帰結: 🔥 が点灯するとき、常に今週も達成済み（👑 の条件も満たしている）

### 👑 / 🔥 の共存表示
- **D-02:** 両条件を満たすとき（streak ≥ 2）は **👑🔥 を並べて表示**。列幅は現在の `w-8`（32px）から必要に応じて `w-10`（40px）程度に調整してよい。`CommitGoalView` のヘッダー行スペーサーも同幅に揃える。
  - streak = 0: アイコンなし
  - streak = 1（今週のみ達成）: 👑 のみ
  - streak ≥ 2（今週 + 先週以上）: 👑🔥 並べて表示

### ソート完全版（D-10 実装）
- **D-03:** Phase 29 で「仮実装」とされた `sortMembersForCommitView` を Phase 30 で完全版に更新する。`_slots` の予約パラメーターを実際のロジックに使う。
  - ①今週の実績率（達成スロット / 全スロット）降順
  - ②同率ならストリーク週数（`consecutiveWeekStreak` の返り値）降順
  - ③同位なら登録順（`member.addedAt` 昇順 — 既存の Phase 29 実装と同じ）

### Claude's Discretion
- 計算関数のシグネチャと配置: `commitUtils.ts` に `isCurrentWeekComplete(slots, items)` と `consecutiveWeekStreak(slots, items)` を追加。Server Component（`CommitGoalView` か `page.tsx`）で計算し結果を `CommitGoalRow` の props に渡す形が自然。
- 21日データで計算できるストリーク上限（3週）で十分とする。既存の `cutoff` フィルタを変更しない。
- アイコンのフォントサイズ: `text-xs` 〜 `text-sm` で収まるようプランナーが調整。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 30 — Goals, success criteria (ACHIEV-01, ACHIEV-02)
- `.planning/REQUIREMENTS.md` §ACHIEV-01, ACHIEV-02 — 詳細要件と受け入れ条件

### 実装対象コンポーネント（Phase 29 で確保済みスペース）
- `src/components/CommitGoalRow.tsx` — Column 3 achievement プレースホルダー（line 49–50）: `w-8 shrink-0` を今フェーズで埋める
- `src/components/CommitGoalView.tsx` — ヘッダー行の achievement 列スペーサー（line 35）: 幅変更時に同期が必要
- `src/lib/commitUtils.ts` — `sortMembersForCommitView`（D-10 完全版実装対象）+ 新規 `isCurrentWeekComplete` / `consecutiveWeekStreak` 関数を追加

### Phase 29 コンテキスト（引き継ぎ判定）
- `.planning/phases/29-commit-goal-view/29-CONTEXT.md` — D-09（achievement列スペース確保）・D-10（ソート暫定実装）の元定義

### 型・ユーティリティ
- `src/lib/types.ts` — `CommitSlot`（`member_id, day_of_week, hour`）・`FeedItem`（`isoDate`）型定義
- `src/lib/commitUtils.ts:getWeekDates` — 週ごとの日付配列取得ユーティリティ（ストリーク計算で流用）
- `src/lib/commitUtils.ts:matchArticleToSlot` — スロット×記事マッチング（isCurrentWeekComplete の内部で活用可能）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `commitUtils.ts:getWeekDates(mondayOffsetWeeks)` — `mondayOffsetWeeks=0` で今週、`-1` で先週、`-2` で2週前の日付配列を返す。ストリーク計算でそのまま使える
- `commitUtils.ts:matchArticleToSlot` — slot × weekDates × articleDateMap でそのスロットの投稿を返す。`isCurrentWeekComplete` の実装に直接活用可能
- `CommitGoalRow.tsx:Column 3` — `<div className="w-8 shrink-0" aria-hidden="true" />` を props 受け取り + アイコン表示に差し替えるだけ

### Established Patterns
- Server Component で計算 → props 経由で表示（`page.tsx` → `CommitGoalView` → `CommitGoalRow` の既存フロー）
- 記事の日付判定は JST キー（`isoToJSTDateKey`）で統一（`calendarUtils.ts`）
- 既存の21日カットオフ（`page.tsx:45`）: `const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()`

### Integration Points
- `CommitGoalView.tsx` → `CommitGoalRow.tsx` に achievement props（`👑`, `🔥` の真偽値か streak 数値）を追加
- `commitUtils.ts:sortMembersForCommitView` の `_slots` 予約パラメーターを実際のロジックに使い始める
- `CommitGoalRow.tsx` の `CommitGoalRowProps` に achievement 関連 prop を追加

</code_context>

<specifics>
## Specific Ideas

- アイコン表示: 条件による出し分けは streak 値（`0 / 1 / ≥2`）で switch するのが明快
- `👑🔥` 並列時に列幅が足りなければ `w-10`（40px）への変更を許可（`CommitGoalView` ヘッダーも同期）

</specifics>

<deferred>
## Deferred Ideas

- ストリーク週数のバッジ化（例: 🔥×4 など連続週数を数字で表示）— 別フェーズ
- 未コミットメンバーをリスト下部に移動するソート変更 — 別フェーズ

### Reviewed Todos (not folded)
- **マジックリンクの ?handle= 伝搬バグ** — auth の問題で Achievement スコープ外。別途対応
- **1人が複数チームに所属できる多対多** — team 管理フェーズのスコープ外

</deferred>

---

*Phase: 30-アチーブメント（👑/🔥）*
*Context gathered: 2026-06-05*
