---
phase: 17
plan: "01"
subsystem: database
tags: [supabase, postgresql, ddl, rls, schema]
dependency_graph:
  requires: []
  provides: [supabase/schema.sql]
  affects: [Phase 18 data layer, Phase 19 auth RLS]
tech_stack:
  added: []
  patterns: [PostgreSQL DDL, Row Level Security, gen_random_uuid()]
key_files:
  created:
    - supabase/schema.sql
  modified: []
decisions:
  - "service_roleはBYPASSRLS権限を持つためINSERT/UPDATE/DELETE用ポリシーは不要（Supabaseのデフォルト動作）"
  - "articlesテーブルのsubstack_idはmembers.substack_idへのFK（ON DELETE CASCADE）でメンバー削除時に記事も自動削除"
  - "link列のUNIQUE制約で記事の重複排除を実現（Phase 18のCronでON CONFLICT DO NOTHINGと組み合わせる）"
metrics:
  duration: "2m"
  completed: "2026-05-16T03:39:04Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 17 Plan 01: PostgreSQL DDL + RLS SQL スクリプト Summary

## One-liner

4テーブル（members/teams/member_teams/articles）のDDLとRLSポリシーをSQL Editorに貼り付けて実行するための `supabase/schema.sql` を作成した。

## What Was Built

Supabase管理画面のSQL Editorで実行するDDL + RLSポリシーSQLファイル `supabase/schema.sql` を新規作成。

### テーブル構成

| テーブル | PK | 主要カラム | 備考 |
|---------|-----|-----------|------|
| members | UUID | substack_id TEXT UNIQUE NOT NULL, name, image_url, added_at | メンバーマスター |
| teams | UUID | name TEXT UNIQUE NOT NULL | チームマスター |
| member_teams | (member_id, team_id) | FK→members.id, FK→teams.id | 多対多中間テーブル |
| articles | UUID | substack_id FK→members.substack_id, link UNIQUE NOT NULL, title, pub_date | 記事履歴 |

### RLSポリシー

- 全4テーブルに `ENABLE ROW LEVEL SECURITY` 設定済み
- anon/authenticatedロール向けにSELECT全件許可ポリシーを4テーブルに追加
- service_roleはSupabaseのBYPASSRLS権限によりポリシー不要（INSERT/UPDATE/DELETE）

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | supabase/schema.sql を作成する | 8b0e5b5 | supabase/schema.sql (新規) |

## Verification Results

- [x] `supabase/schema.sql` が存在すること
- [x] ファイル内に `CREATE TABLE IF NOT EXISTS members` が含まれること
- [x] ファイル内に `CREATE TABLE IF NOT EXISTS teams` が含まれること
- [x] ファイル内に `CREATE TABLE IF NOT EXISTS member_teams` が含まれること
- [x] ファイル内に `CREATE TABLE IF NOT EXISTS articles` が含まれること
- [x] ファイル内に `ENABLE ROW LEVEL SECURITY` が4件含まれること
- [x] ファイル内に `CREATE POLICY` が4件含まれること

## Deviations from Plan

なし — プラン通りに実行された。

## Known Stubs

なし。

## Threat Flags

なし。このプランはSQLファイルの作成のみで、アプリコードの変更はない。

## Next Steps

- Phase 17-02: Supabaseクライアントライブラリ（server.ts / client.ts / admin.ts）の作成
- Phase 17-03: KV→SQL移行スクリプト（scripts/export-to-sql.ts）の作成
- Phase 18以降: データレイヤー差し替え時に `supabase/schema.sql` を参照

## Self-Check: PASSED

- supabase/schema.sql: FOUND
- commit 8b0e5b5: FOUND (git log確認済み)
