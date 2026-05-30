# Phase 22: チームステータス管理 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 22-チームステータス管理
**Areas discussed:** 管理画面のUI配置, privateチームのAll表示, データ取得の変更範囲, マイグレーション方法

---

## 管理画面のUI配置

### チームstatus編集UIの配置

| Option | Description | Selected |
|--------|-------------|----------|
| /admin 内にチーム表を追加 | メンバー一覧の下に「チーム設定」テーブルを追加。新規ページ不要でシンプル。 | |
| /admin/teams 別ページを新設 | Phase 24の /admin/teams/{teamName} と近いが、ベースURLが違う。将来のチーム管理機能拡張に有利。 | ✓ |

**User's choice:** /admin/teams 別ページを新設

### /admin/teams のレイアウト

| Option | Description | Selected |
|--------|-------------|----------|
| テーブル形式 | チーム名 \| statusドロップダウン \| Saveボタン の行ごとリスト。管理画面のメンバーリストと同じパターン。 | ✓ |
| カード形式 | チームごとにカードを表示。将来の詳細表示拡張に有利。現時点では情報量が少なくオーバースペック。 | |

**User's choice:** テーブル形式

### /admin から /admin/teams へのナビゲーション

| Option | Description | Selected |
|--------|-------------|----------|
| リンクを追加（推奨） | /admin に「チーム設定」リンクを追加。シンプル。 | ✓ |
| ボタンを追加 | /admin に「Team Settings」ボタンを配置しクリックで遷移。 | |

**User's choice:** リンクを追加

---

## privateチームのAll表示

### status=private のメンバーのAllビュー表示

| Option | Description | Selected |
|--------|-------------|----------|
| Allに表示される（推奨） | privateチームはタブに出ないが、Allビューには含まれる。「hiddenと違って秘密ではない、タブがないだけ」という語義。 | ✓ |
| Allからも除外 | hiddenと同じ扱い。privateメンバーは完全に非表示。ロジックがシンプル（「public以外は全部除外」）。 | |

**User's choice:** Allに表示される（一度「修正したい」と回答したが直後に「やっぱOK」と確認）

**確定ルール:**
- `public`: タブあり + Allあり
- `private`: タブなし + Allあり
- `hidden`: タブなし + Allなし

---

## データ取得の変更範囲

### page.tsx がstatus情報を取得する方法

| Option | Description | Selected |
|--------|-------------|----------|
| getMembers()を変更（推奨） | members.ts の getMembers() が teams(name, status) をJOINし、Member型にteam status情報を追加。1ファイル変更で完結。 | ✓ |
| getTeams()を新設 | members.ts に別途 getTeams() を追加してstatus付きチーム一覧を取得。Member型変更なし。page.tsxが2回クエリする。 | |

**User's choice:** getMembers()を変更

### Member型に追加するstatus情報の形式

| Option | Description | Selected |
|--------|-------------|----------|
| teamStatuses: Record\<string, string\> | { teamNames: ['all'], teamStatuses: { all: 'public' } }。チーム名からstatusを引ける。 | |
| teams: {name, status}[]に変更 | teamNames: string[] を teams: {name: string, status: string}[] に置き換え。より一貫性あり。呼び出し元の変更が多い。 | ✓ |

**User's choice:** teams: {name, status}[]に変更（呼び出し元の小修正はプランナーが対応）

---

## マイグレーション方法

### DDLファイルの置き場所

| Option | Description | Selected |
|--------|-------------|----------|
| migrations/に新ファイル（推奨） | supabase/migrations/20260517_add_team_status.sql を作成。履歴管理が明確。 | ✓ |
| schema.sqlに追記 | schema.sql を直接変更し、コメントで「ALTERは別途」と記載。既存パターンと同じ。 | |

**User's choice:** migrations/に新ファイル

### chameleon→hiddenのUPDATE文の扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 含める（推奨） | ALTER TABLE + UPDATE を同じファイルにまとめる。Supabase SQL Editorで一発実行で完結。 | ✓ |
| 別ファイルに分ける | スキーマ変更とデータ変換を分離。履歴が細かくなるが、実践的には過剰。 | |

**User's choice:** 含める

### schema.sqlの更新

| Option | Description | Selected |
|--------|-------------|----------|
| 更新する（推奨） | schema.sql は「Create from scratch」用途なのでstatusを含む内容に更新。migrations/ファイルと両方保持。 | ✓ |
| 更新しない | schema.sqlは現状のまま。migrations/ファイルだけ管理。 | |

**User's choice:** 更新する

---

## Claude's Discretion

なし — すべてのエリアでユーザーが選択した。

## Deferred Ideas

なし — 議論はフェーズスコープ内に収まった。
