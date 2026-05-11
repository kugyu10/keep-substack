# Phase 9: 管理画面メンバー編集 — Discussion Log

**Phase:** 09-admin-member-edit
**Date:** 2026-05-11
**Status:** Complete

## Areas Discussed

### 1. 編集UIのパターン
**Options presented:**
- 編集ボタン→行内インライン展開（td が input に切り替わる）
- クリックで行内フォーム展開
- 編集ボタン→行の下にフォーム展開

**Selected:** 編集ボタン→行内インライン展開

**Notes:** モーダル不要でシンプル。`editingId` stateで表示切り替え。

---

### 2. substackId変更の可否
**Options presented:**
- 変更禁止（推奨）
- 変更可能（delete+addと同義の処理）

**Selected:** 変更禁止

**Notes:** substackIdはKVの識別キー。変更したい場合は削除→再登録を係記に行う運用。

---

### 3. addedAtの入力形式
**Options presented:**
- date input（YYYY-MM-DD）
- text input（ISO文字列を直接入力）

**Selected:** text input（ISO文字列を直接入力）

**Notes:** `2026-05-11T00:00:00.000Z` 形式でそのまま入力。

---

### 4. teamId→teamName（追加議題）
**User request:** 「ついでにteamIdをteamNameにカラム名変えて」

**Scope clarification:**
- 表示ラベルのみ vs フィールド名自体も変更
- **Selected:** フィールド名自体も変更（types.ts、kvMembers.ts、全コンポーネント）

**Notes:** 既存Redisデータに `teamId` キーが残るため、後方互換読み込みを `getMembers()` に追加する。

---

## Decisions Not Discussed (Claude's Discretion)
- バリデーション: サーバーサイドのみ（既存パターン踏襲）
- インライン編集フォームのスタイリング
- キャンセル時のstate初期化方法
- 「保存」「キャンセル」ボタンのテキスト・色

## Deferred Ideas
None
