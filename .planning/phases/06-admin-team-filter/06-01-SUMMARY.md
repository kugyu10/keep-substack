---
phase: 06-admin-team-filter
plan: 01
subsystem: auth, database
tags: [next.js, middleware, basic-auth, upstash-redis, kv]

# Dependency graph
requires:
  - phase: 04-kv-data-layer
    provides: getMembers()関数とredisインスタンス（kvMembers.ts, redis.ts）

provides:
  - addMember(member): KVへの新メンバー追加（重複チェック付き）
  - deleteMember(substackId): KVからメンバー削除
  - middleware.ts: /adminをBasic認証で保護するEdge Middleware
  - .env.exampleへのADMIN_PASSWORDドキュメント化

affects:
  - 06-admin-team-filter/plan-02（管理UI実装でaddMember/deleteMember/middleware.tsを使用）

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js Edge Middleware によるBasic認証（ユーザー名不要・パスワードのみ）"
    - "KV操作関数のgetMembers() → 変換 → redis.set() パターン"
    - "重複チェックはサーバー側でErrorをthrow（useActionState連携用）"

key-files:
  created:
    - middleware.ts
  modified:
    - src/lib/kvMembers.ts
    - .env.example

key-decisions:
  - "ADMIN_PASSWORD のみで認証（ユーザー名不要 — D-01）。Buffer.from(':password').toString('base64') でBasic認証エンコード"
  - "addMemberの重複チェックはErrorをthrow（D-15）。useActionStateでのエラーハンドリングをPlan 02に委譲"
  - "deleteMemberは存在しないsubstackIdでも静かに成功（エラーなし）"
  - "matcher: ['/admin', '/admin/:path*'] で全サブパスを保護（T-06-02対策）"

patterns-established:
  - "Edge Middleware パターン: import {NextRequest, NextResponse} from 'next/server' + export function middleware + export const config"
  - "KV操作パターン: getMembers() → 変換処理 → redis.set('members', updated)"

requirements-completed:
  - ADM-03

# Metrics
duration: 5min
completed: 2026-05-10
---

# Phase 6 Plan 01: 管理画面データ層・認証基盤 Summary

**Upstash KV用addMember/deleteMember関数とNext.js Edge MiddlewareによるBasic認証（/admin保護）を実装**

## Performance

- **Duration:** 約5分
- **Started:** 2026-05-10T07:00:00Z
- **Completed:** 2026-05-10T07:05:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- kvMembers.tsにaddMemberとdeleteMemberを追加（重複チェック・静的削除）
- middleware.tsを新規作成し、/admin全サブパスをBasic認証で保護
- .env.exampleにADMIN_PASSWORDを追記してドキュメント化

## Task Commits

1. **Task 1: kvMembers.tsにaddMemberとdeleteMemberを追加** - `732d7ce` (feat)
2. **Task 2: middleware.tsを新規作成（Basic認証）** - `b35b5d8` (feat)
3. **Task 3: .env.exampleにADMIN_PASSWORD追記** - `401c46e` (chore)

## Files Created/Modified

- `src/lib/kvMembers.ts` - addMember（重複チェック付き）とdeleteMemberを追加。getMembers()は変更なし
- `middleware.ts` - Next.js Edge Middlewareとして/admin全パスをBasic認証でインターセプト
- `.env.example` - ADMIN_PASSWORD=your-admin-password を末尾に追記

## Decisions Made

- None - followed plan as specified（コンテキストD-01〜D-04の設計に完全準拠）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required (ADMIN_PASSWORD ENV変数はPlan 02実装時にVercelで設定).

## Next Phase Readiness

- Plan 02（管理UI）でaddMember/deleteMember/middleware.tsが即座に使用可能
- Server Actions実装にはuseActionState連携が必要（addMemberのError throwはPlan 02側で処理）
- Vercel環境でのADMIN_PASSWORD環境変数設定が必要（デプロイ前に設定すること）

## Self-Check

- [x] `src/lib/kvMembers.ts` — addMember/deleteMemberがexportされている (`732d7ce`)
- [x] `middleware.ts` — 存在し、matcherとADMIN_PASSWORDロジックが含まれている (`b35b5d8`)
- [x] `.env.example` — ADMIN_PASSWORDが1件含まれている (`401c46e`)
- [x] `npx tsc --noEmit` — エラーなし

## Self-Check: PASSED

---
*Phase: 06-admin-team-filter*
*Completed: 2026-05-10*
