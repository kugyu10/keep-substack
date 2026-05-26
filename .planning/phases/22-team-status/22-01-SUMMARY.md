---
phase: 22-team-status
plan: "01"
subsystem: database

tags: [supabase, postgres, migration, ddl]

# Dependency graph
requires: []
provides:
  - "teams テーブルに status TEXT NOT NULL DEFAULT 'public' カラムを追加"
  - "chameleon チームの status を 'hidden' に設定"
  - "supabase/schema.sql の teams 定義を最新化"
affects:
  - "22-02 以降の全プラン（types.ts・members.ts・page.tsx 等の DB 依存コード）"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BEGIN/COMMIT トランザクション + IF NOT EXISTS で冪等なマイグレーション"

key-files:
  created:
    - "supabase/migrations/20260517_add_team_status.sql"
  modified:
    - "supabase/schema.sql"

key-decisions:
  - "ADD COLUMN IF NOT EXISTS を使って冪等性を確保（二重実行しても安全）"
  - "chameleon チームのみ status='hidden' に変換（他は DEFAULT 'public' のまま）"
  - "schema.sql も同期更新して初期セットアップ用ドキュメントを最新化（D-11）"

patterns-established:
  - "マイグレーションファイル命名: YYYYMMDD_<description>.sql"
  - "マイグレーション構造: 説明コメント → BEGIN → DDL/DML → COMMIT"

requirements-completed:
  - TEAM-01

# Metrics
duration: 15min
completed: 2026-05-26
---

# Phase 22 Plan 01: Team Status Migration Summary

**teams テーブルへ status カラム（TEXT NOT NULL DEFAULT 'public'）を追加し、chameleon チームを status='hidden' に変換する DDL を Supabase 本番 DB に適用**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-26T14:00:00Z
- **Completed:** 2026-05-26T14:15:00Z
- **Tasks:** 3（うち 1 件は human-action チェックポイント）
- **Files modified:** 2

## Accomplishments

- `supabase/migrations/20260517_add_team_status.sql` を新規作成（D-09/D-10 準拠）
- `supabase/schema.sql` の teams テーブル定義に status カラムを追加（D-11）
- Supabase 本番 DB に適用済み（ユーザー確認: approved）

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: マイグレーションファイル作成** - `f3ec6e6` (feat)
2. **Task 2: schema.sql teams テーブル定義更新** - `f754186` (feat)
3. **Task 3: Supabase DB マイグレーション適用** - human-action（コミットなし）

## Files Created/Modified

- `supabase/migrations/20260517_add_team_status.sql` — status カラム追加 DDL + chameleon→hidden 変換 DML
- `supabase/schema.sql` — teams テーブル定義に status カラムを追加

## Decisions Made

- `ADD COLUMN IF NOT EXISTS` を使用して冪等性を確保（CONTEXT.md D-10）
- `UPDATE teams SET status = 'hidden' WHERE name = 'chameleon'` でデータ移行（他チームは DEFAULT 'public'）
- `schema.sql` も同期更新して初期セットアップ用ドキュメントを最新化（D-11）

## Deviations from Plan

なし — プランに記載されたとおりに実行。

## Issues Encountered

なし

## User Setup Required

Task 3 は human-action チェックポイントとして実施。
ユーザーが Supabase SQL Editor または `supabase db push` でマイグレーションを手動適用し、"approved" で確認。

## Next Phase Readiness

- Supabase 本番 DB に `teams.status` カラムが存在することが確認済み
- Wave 2（22-02 以降）の TypeScript コード変更（types.ts・members.ts・page.tsx 等）を安全に開始できる状態
- 懸念事項なし

---
*Phase: 22-team-status*
*Completed: 2026-05-26*
