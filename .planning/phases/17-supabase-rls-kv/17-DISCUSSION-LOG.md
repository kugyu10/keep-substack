# Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 17-Supabaseスキーマ + RLS設定 + KVデータ移行
**Areas discussed:** teamsテーブル設計, imageUrl格納場所, 移行スクリプト形式

---

## teamsテーブル設計

### teams/membersの関係

| Option | Description | Selected |
|--------|-------------|----------|
| teams マスター + members.team_names 配列 | teamsテーブルをマスターとして作り、members.team_names text[]で名前を直接格納。Phase 20のチェックボックスUIはteamsテーブルを参照。KV移行も簡単 | |
| teams + member_teams 中間テーブル（完全正規化） | teams(id, name) + member_teams(member_id, team_id) の多対多構成。型安全だがPhase 17スコープが大きくなる | ✓ |

**User's choice:** 完全正規化（teams + member_teams）

---

### members PKの選択

| Option | Description | Selected |
|--------|-------------|----------|
| substackId を TEXT PK | ON UPDATE CASCADEでFK連鎖更新。KV移行が簡単、Phase 18コードもシンプル | |
| UUID PK + substackId UNIQUE | Supabase Authとの将来的な結合を考えると標準。Phase 17スコープが増える | ✓ |

**User's choice:** UUID PK + substackId UNIQUE
**Notes:** substackId変更時の面倒さを考慮してUUIDを選択。Supabase Auth（Phase 19）との将来的な結合も見据えている

---

### teamsマスターの自動生成

| Option | Description | Selected |
|--------|-------------|----------|
| 自動生成（移行スクリプトがteamNamesを集約） | 移行スクリプトがKVのteamNamesを集約してteamsテーブルにINSERT、member_teamsも同時に書き込む | ✓ |
| 手動でteamsを事前登録 | 先にSupabase管理画面でチーム名を登録してから移行。チーム数が少ないので現実的 | |

**User's choice:** 自動生成

---

## imageUrl格納場所

| Option | Description | Selected |
|--------|-------------|----------|
| membersテーブルに image_url 列 | imageUrlはメンバー属性なのでmembersに置くのが正規化として自然。各記事行への冗長保存が不要 | ✓ |
| articlesテーブルの各行で保存 | 現行KV構造（StoredFeed.imageUrl）に最も近い形式。各記事行に同じimageUrlが増える | |

**User's choice:** membersテーブルにimage_url列

---

## 移行スクリプト形式

### 実行方式

| Option | Description | Selected |
|--------|-------------|----------|
| scripts/migrate.ts（tsx実行） | package.jsonに「migrate」スクリプトを追加、開発者がローカルから手動実行。環境変数だけで動く | |
| one-time API route (/api/migrate) | Vercelに配置してcurlで実行。実行後にAPI routeを削除。ローカル環境構築不要 | |
| Supabase管理画面SQL直接入力 | SQL Editorで直接INSERT文を実行。データ量が少ない場合は最もシンプル | ✓ |

**User's choice:** Supabase管理画面SQL直接入力

---

### SQL生成方式

| Option | Description | Selected |
|--------|-------------|----------|
| export スクリプトでSQL生成 | scripts/export-to-sql.ts をtsx実行してKVデータを読み、SQLファイルを出力→Supabase管理画面に貼り付け | ✓ |
| スクリプトが直接Supabase INSERT | tsx スクリプトがRedis取得→Supabase INSERT まで一括実行。最も少ない手順 | |

**User's choice:** exportスクリプトでSQL生成
**Notes:** SQLを事前確認できる方法を好む。内容を確認してから貼り付けたい

---

## Claude's Discretion

- RLSポリシーの設計詳細（ユーザーが「RLSポリシー設計」エリアを選ばなかった）→ STATE.mdの決定事項に基づきanon=SELECT全件可、service_role=全操作可で実装
- articlesテーブルのthumbnail列の有無 → Phase 18（HISTORY-01）に先送り

## Deferred Ideas

- チェックボックスUI（Phase 20）: teamsテーブル基盤はPhase 17で作成
- Supabase Authロール（admin）によるRLS細分化（Phase 19で追加）
- 1人が複数チームに所属できる多対多Todo（member_teams設計で解決、UIはPhase 20）
