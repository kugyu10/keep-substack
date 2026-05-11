# Phase 11: チーム多対多所属 — Discussion Log

**Phase:** 11-multi-team-membership
**Date:** 2026-05-11
**Status:** Complete

## Areas Discussed

### 1. memberページの戻りリンク
**Options presented:**
- 最初のチームのみ（teamNames[0]）
- 複数リンクを並べる
- 常に / に戻る

**Selected:** 複数リンクを並べる

**Notes:** `← TeamA | ← TeamB` のように各チームへのリンクを並べる。単一チームは従来通り。

---

### 2. teams重複除去方法
**Options presented:**
- Setで重複除去（推奨）
- 重複容認

**Selected:** Setで重複除去

**Notes:** `[...new Set(allMembers.flatMap(m => m.teamNames).filter(Boolean))]` で一意なタブリスト。

## Decisions Not Discussed (Claude's Discretion)
- 複数リンクのセパレーター（`|` vs スペース）はClaude判断
- teamNamesの並び順は保存順そのまま
- カンマ区切り入力→string[]変換は前回ミルストーン計画時に決定済み

## Deferred Ideas
None
