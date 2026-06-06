# Phase 30: アチーブメント（👑 / 🔥） - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 30-アチーブメント（👑/🔥）
**Areas discussed:** 🔥連続判定に今週を含めるか, 👑と🔥の共存表示

---

## 🔥 連続判定に今週を含めるか

| Option | Description | Selected |
|--------|-------------|----------|
| 今週を含める | 今週の全スロットに投稿があれば「今週達成」としてカウント。先週も達成なら🔥。「今頑張っている人を今すぐ表彰」 | ✓ |
| 今週を含めない | 完了済み週のみ判定。今週はまだ終わっていないので先週・2週前の達成で🔥。「過去実績のバッジ」 | |

**User's choice:** 今週を含める
**Notes:** 🔥が点灯するとき、常に今週も達成済み（👑条件も満たす）。streak ≥ 2 で🔥表示。

---

## 👑と🔥の共存表示

| Option | Description | Selected |
|--------|-------------|----------|
| 🔥優先 | 連続達成中は🔥のみ。👑は今週初達成（先週未達成）のみ表示 | |
| 👑🔥両方表示 | 両条件を満たすとき👑🔥を並べる（w-8=32px、text-xs小さめで入る見込み） | ✓ |
| アイコンは一つだけ | 連続/単独いずれも常に1つのアイコンのみ | |

**User's choice:** 👑🔥両方表示
**Notes:** 列幅は必要なら w-8 → w-10 に調整可。CommitGoalView のヘッダー行スペーサーも同幅に揃える。

---

## Claude's Discretion

- 計算関数のシグネチャと配置: `commitUtils.ts` に `isCurrentWeekComplete` / `consecutiveWeekStreak` を追加
- Server Component（CommitGoalView か page.tsx）で計算し props で CommitGoalRow に渡す
- 21日データで streak 上限3で十分（既存 cutoff 変更なし）
- アイコンのフォントサイズ調整はプランナーに委任

## Deferred Ideas

- ストリーク週数の数字表示（例: 🔥×4） — 別フェーズ
- 未コミットメンバーをリスト下部に移動するソート変更 — 別フェーズ
- マジックリンクの ?handle= 伝搬バグ修正 — auth スコープ外、別途対応
