# Phase 25: 複数publication_idスキーマ拡張 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 25-publication-id
**Areas discussed:** 既存カラムとの並存方針, テーブル制約の設計, 書き込み同期の範囲

---

## 既存カラムとの並存方針

| Option | Description | Selected |
|--------|-------------|----------|
| members が真実源・member_pub はミラー | members.publication_id を真実源に温存、articles FK据え置き、member_publications は将来用ミラーとして並存 | ✓（確認後） |
| member_pub を真実源にしFK貼り替え | member_publications を唯一の真実源にし articles FK を貼り替え、members.publication_id は将来削除 | |

**User's choice:** 自由記述「将来的に1memberは複数publication_idを持てるようにしたい」→ 段階移行の意図を確認。プレーンテキストで「今回はスキーマ追加＋データ移行まで、アプリ切り替え・FK貼り替えは将来Phase」を提示し「1でok」で確定。
**Notes:** 長期ゴールは複数publication_id所持。本Phaseはその第一歩。articles FK貼り替えは取得ロジック変更を招き Success Criteria #3 に違反するため将来Phaseへ。

---

## テーブル制約の設計

| Option | Description | Selected |
|--------|-------------|----------|
| 部分ユニークインデックスで1メンバー1primaryを強制 | UNIQUE INDEX ON (member_id) WHERE is_primary | ✓ |
| 制約なし（アプリ側で保証） | is_primary は単なるBOOLEAN列、一意性は将来のアプリロジックで担保 | |

**User's choice:** 部分ユニークインデックスで1メンバー1primaryを強制（推奨）

| Option | Description | Selected |
|--------|-------------|----------|
| ON DELETE CASCADE + is_primary NOT NULL DEFAULT false | member_teams と同じカスケード、移行時に明示的に true セット | ✓ |
| ON DELETE CASCADE + is_primary DEFAULT true | デフォルト true、複数追加時に部分ユニーク制約と衝突しやすい | |

**User's choice:** ON DELETE CASCADE + is_primary NOT NULL DEFAULT false（推奨）
**Notes:** publication_id TEXT UNIQUE はSuccess Criteria由来でグローバルUNIQUE確定。

---

## 書き込み同期の範囲

| Option | Description | Selected |
|--------|-------------|----------|
| DBトリガーで自動同期 | members の INSERT/UPDATE/DELETE をトリガーで member_publications に反映。アプリコード変更ゼロ | ✓ |
| コード側で同期 | addMember/updateMember/deleteMember に member_publications 書き込みを追記 | |
| 今回は移行のみ | 移行スクリプトで既存分を1回コピー、以降の同期は将来Phase | |

**User's choice:** DBトリガーで自動同期（推奨）
**Notes:** アプリコードを一切触らず Success Criteria #3 を厳密に守りつつ、新規メンバーも並走テーブルに漏れなく入る。DELETE は ON DELETE CASCADE でカバーされる。

---

## Claude's Discretion

- **マイグレーション構成（未選択エリア）:** Phase 22 パターン踏襲 — `supabase/migrations/` 新ファイル + `supabase/schema.sql` 追記の二重管理。
- **RLS（未選択エリア）:** 他テーブル同様 `member_publications` も RLS有効化 + `public select` ポリシー追加。
- トリガー関数の PL/pgSQL 実装詳細・主キー方式は planner/researcher 裁量。

## Deferred Ideas

- データ取得ロジックの member_publications ベース切り替え — 将来Phase
- articles FK の member_publications への貼り替え — 将来Phase
- 複数publication_id表示/編集UI — 将来Phase（REQUIREMENTS.md §DEFERRED既出）
- members.publication_id カラムの最終廃止 — 真実源昇格後の将来Phase
