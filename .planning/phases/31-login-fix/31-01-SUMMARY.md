---
phase: 31-login-fix
plan: 01
subsystem: database
tags: [supabase, postgres, migration, unique-constraint]

requires: []
provides:
  - "members.substack_handle に UNIQUE 制約 (members_substack_handle_key) が存在する"
  - "schema.sql の substack_handle 列が TEXT UNIQUE として定義されている"
affects: [31-02, 31-03]

tech-stack:
  added: []
  patterns: ["ADD CONSTRAINT IF NOT EXISTS で冪等な DDL migration"]

key-files:
  created:
    - supabase/migrations/20260605000000_add_substack_handle_unique.sql
  modified:
    - supabase/schema.sql

key-decisions:
  - "IF NOT EXISTS を使い冪等性を確保 — 再実行しても既存制約を壊さない"
  - "制約名 members_substack_handle_key は plan 02/03 の 23505 ハンドリングが期待する名前"

patterns-established:
  - "DB 制約追加は BEGIN/COMMIT 付き migration ファイルとして作成し supabase db push で適用"

requirements-completed:
  - AUTH-FIX-01

duration: 10min
completed: 2026-06-05
---

# Phase 31 Plan 01 Summary

**`members.substack_handle` に UNIQUE 制約を追加する migration を作成し live DB に適用**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-06-05
- **Tasks:** 2 (Task 1 自動, Task 2 人手)
- **Files modified:** 2

## Accomplishments
- migration ファイル `20260605000000_add_substack_handle_unique.sql` を作成 (`ADD CONSTRAINT IF NOT EXISTS members_substack_handle_key UNIQUE (substack_handle)`)
- `supabase/schema.sql` の `substack_handle TEXT` を `TEXT UNIQUE` に更新
- `supabase db push` で live DB に制約を適用済み

## Task Commits

1. **Task 1: migration ファイル作成 + schema.sql 更新** — `1c4e460` (feat)
2. **Task 2: supabase db push (人手チェックポイント)** — live DB 適用確認済み

## Files Created/Modified
- `supabase/migrations/20260605000000_add_substack_handle_unique.sql` — UNIQUE 制約追加 DDL
- `supabase/schema.sql` — substack_handle 列定義を `TEXT UNIQUE` に更新

## Decisions Made
- `IF NOT EXISTS` 構文を採用し冪等性を確保。live DB に既に制約がある場合も安全に実行できる。

## Deviations from Plan
なし — プラン通りに実行。

## Issues Encountered
なし

## Next Phase Readiness
- Wave 2 (Plan 02/03) の 23505 ハンドリングが機能するための DB 制約が整った
- Plan 02/03 は並行実行可能（ファイル競合なし）

---
*Phase: 31-login-fix*
*Completed: 2026-06-05*
