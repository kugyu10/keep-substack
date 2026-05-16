---
phase: "21"
plan: "21-01"
subsystem: "lib"
tags: [cleanup, redis, supabase, refactor]
dependency_graph:
  requires: []
  provides: [members.ts, articles.ts]
  affects: [admin/actions.ts, admin/page.tsx, api/cron/route.ts, lib/fetchFeed.ts, lib/__tests__/fetchFeed.test.ts, app/page.tsx, app/member/[substackId]/page.tsx]
tech_stack:
  added: []
  patterns: []
key_files:
  created:
    - src/lib/members.ts
    - src/lib/articles.ts
  modified:
    - src/app/admin/actions.ts
    - src/app/admin/page.tsx
    - src/app/api/cron/route.ts
    - src/lib/fetchFeed.ts
    - src/lib/__tests__/fetchFeed.test.ts
    - src/app/page.tsx
    - src/app/member/[substackId]/page.tsx
    - package.json
    - package-lock.json
  deleted:
    - src/lib/redis.ts
    - src/lib/kvMembers.ts
    - src/lib/kvArticles.ts
decisions:
  - "@upstash/redis を完全削除し、コードベースをSupabaseのみに統一した"
  - "kvMembers.ts・kvArticles.ts はリネームのみで内容変更なし（すでにSupabase実装済みだった）"
metrics:
  duration: "117s"
  completed_date: "2026-05-16"
  tasks_completed: 6
  tasks_total: 6
---

# Phase 21 Plan 01: Redisクリーンアップ Summary

**One-liner:** @upstash/redis の完全削除とkvファイルのリネーム（members.ts/articles.ts）によりコードベースをSupabaseのみに統一した。

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | `src/lib/redis.ts` を削除 | eb3b191 |
| 2 | `kvMembers.ts` → `members.ts` にリネーム | e7b9904 |
| 3 | `kvArticles.ts` → `articles.ts` にリネーム | 64613ff |
| 4 | 全ファイルのimportを更新（8箇所 + 発見1箇所） | a21f889 |
| 5 | `@upstash/redis` を package.json から削除・npm install | 9013043 |
| 6 | `npm run build` でビルド確認 — 成功 | (no commit) |

## Success Criteria

- [x] `@upstash/redis` がpackage.jsonから削除されており、`npm install` でインストールされない
- [x] `kvMembers.ts`・`kvArticles.ts`・`redis.ts` が削除されており、これらを参照するimportが存在しない
- [x] `npm run build` がエラーなく完了する

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] `src/app/admin/page.tsx` の import 更新漏れ**
- **Found during:** Task 4
- **Issue:** プランの対象リストに `src/app/admin/page.tsx` が記載されていなかったが、`from '@/lib/kvMembers'` が存在した
- **Fix:** `@/lib/members` に更新
- **Files modified:** `src/app/admin/page.tsx`
- **Commit:** a21f889

## Known Stubs

なし。

## Threat Flags

なし。

## Self-Check: PASSED

- `src/lib/members.ts` — FOUND
- `src/lib/articles.ts` — FOUND
- `src/lib/redis.ts` — 削除済み（存在しない）
- `src/lib/kvMembers.ts` — 削除済み（存在しない）
- `src/lib/kvArticles.ts` — 削除済み（存在しない）
- Commits eb3b191, e7b9904, 64613ff, a21f889, 9013043 — FOUND
- `grep -r "upstash\|kvMembers\|kvArticles" src/` — 0件
- `npm run build` — 成功
