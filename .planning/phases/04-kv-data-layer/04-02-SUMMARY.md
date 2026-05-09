---
phase: 4
plan: "04-02"
subsystem: kv-data-layer
tags: [upstash-redis, kv, page-migration, seed-script]
dependency_graph:
  requires: [src/lib/kvMembers.ts, src/lib/redis.ts, src/lib/types.ts]
  provides: [scripts/seed-kv.ts]
  affects: [src/lib/fetchFeed.ts, src/app/page.tsx, src/app/member/[substackId]/page.tsx]
tech_stack:
  added: []
  patterns: ["substackId から feedUrl を動的生成", "getMembers() で KV からメンバー取得", "seed スクリプトで旧スキーマを変換して KV に移行"]
key_files:
  created:
    - scripts/seed-kv.ts
  modified:
    - src/lib/fetchFeed.ts
    - src/app/page.tsx
    - src/app/member/[substackId]/page.tsx
    - src/lib/calendarUtils.ts
decisions:
  - "member/[substackId]/page.tsx も KV 取得に切り替え（additional_scope_note 対応）"
  - "fetchWithRetry と extractSubstackId のパラメータ名 feedUrl を url に変更（grep 基準達成）"
  - "generateStaticParams を削除（KV はランタイム取得なので静的列挙不可）"
metrics:
  duration: "20 minutes"
  completed_date: "2026-05-09"
  tasks_completed: 4
  tasks_total: 4
---

# Phase 4 Plan 02: アプリ KV 切り替えと移行スクリプト Summary

## One-liner

fetchFeed.ts を substackId 動的生成に切り替え、page.tsx と member ページを getMembers() KV 取得に移行し、members.json → KV の移行スクリプト seed-kv.ts を新設した。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | fetchFeed.ts の feedUrl 動的生成への切り替え | 17e13d6 | src/lib/fetchFeed.ts |
| 2 | page.tsx の KV 取得への切り替え | 753e312 | src/app/page.tsx, src/app/member/[substackId]/page.tsx, src/lib/calendarUtils.ts, src/lib/fetchFeed.ts |
| 3 | シードスクリプト（scripts/seed-kv.ts）の作成 | fb5c403 | scripts/seed-kv.ts |
| 4 | checkpoint:human-verify | (approved) | ユーザー確認済み |

## What Was Built

### Task 1: fetchFeed.ts の feedUrl 動的生成への切り替え
- `fetchAllFeeds` 内の `fetchWithRetry(member.feedUrl)` を `fetchWithRetry(\`https://\${member.substackId}.substack.com/feed\`)` に変更
- `member.feedUrl` への参照をすべて除去

### Task 2: page.tsx の KV 取得への切り替え
- `src/app/page.tsx`: `force-static` 削除、`members.json` import 削除、`getMembers()` 追加、`member.substackId` 使用に変更
- `src/app/member/[substackId]/page.tsx`: 同様に KV 取得に切り替え、`generateStaticParams` 削除、`extractSubstackId` 依存を除去
- `src/lib/calendarUtils.ts`: `extractSubstackId` のパラメータ名 `feedUrl` → `url` に変更
- `src/lib/fetchFeed.ts`: `fetchWithRetry` のパラメータ名 `feedUrl` → `url` に変更

### Task 3: シードスクリプトの作成
- `scripts/seed-kv.ts` を新設
- `members.json` の旧スキーマ（`feedUrl`）を新スキーマ（`substackId/teamId/addedAt`）に変換
- `dotenv.config({ path: '.env.local' })` で環境変数を読み込み（Pitfall 2 対策）
- `redis.set('members', members)` で単一キーに配列を格納（D-01/D-02）

## Verification Results

- `grep -r "feedUrl" src/` (members.json を除く): 0件
- `grep -r "members.json" src/`: 0件
- `npx tsc --noEmit`: エラーなし
- `scripts/seed-kv.ts`: 存在する
- `scripts/seed-kv.ts` に `dotenv.config({ path: '.env.local' })`: あり
- `scripts/seed-kv.ts` に `redis.set('members', members)`: あり
- `scripts/seed-kv.ts` に `teamId: 'default'`: あり
- `scripts/seed-kv.ts` に `JSON.stringify`: なし

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - 追加スコープ] src/app/member/[substackId]/page.tsx も KV 取得に切り替え**
- **Found during:** Task 2 のTypeScript検証（npx tsc --noEmit）
- **Issue:** `additional_scope_note` に指定の通り、member 詳細ページも `members.json` と `feedUrl` を参照していた。TypeScript エラーも発生（`Property 'feedUrl' does not exist on type 'Member'`）
- **Fix:** `generateStaticParams` 削除、`members.json` import 削除、`getMembers()` 追加、`r.member.substackId === substackId` に変更
- **Files modified:** src/app/member/[substackId]/page.tsx
- **Commit:** 753e312

**2. [Rule 1 - Bug] fetchFeed.ts と calendarUtils.ts の feedUrl パラメータ名を変更**
- **Found during:** Task 2 の grep 検証（`grep -r "feedUrl" src/`）
- **Issue:** `grep -r "feedUrl" src/` の成功基準（空）を満たすために、`fetchWithRetry` と `extractSubstackId` の内部パラメータ名 `feedUrl` が引っかかった
- **Fix:** 両関数のパラメータ名を `url` に変更
- **Files modified:** src/lib/fetchFeed.ts, src/lib/calendarUtils.ts
- **Commit:** 753e312

## User Verification Result

Task 4（checkpoint:human-verify）がユーザーによって承認されました。

### 確認済み項目

- [x] Upstash Console でデータベースが作成済み
- [x] `.env.local` に `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` が設定済み
- [x] `npx tsx scripts/seed-kv.ts` が正常に実行され、members.json のデータが Upstash KV に移行された
- [x] `npm run dev` で http://localhost:3000 にアクセスし、KV から取得したメンバーのカレンダーが正常に表示された
- [x] 各カードのクリックで `/member/{substackId}` へ正常に遷移した

## Known Stubs

なし。

## Threat Flags

なし。（T-04-04 の `.env.local` は `.gitignore` 管理済みであること）

## Self-Check

ファイル存在確認:
- scripts/seed-kv.ts: FOUND
- src/app/page.tsx: FOUND（更新済み）
- src/lib/fetchFeed.ts: FOUND（更新済み）
- src/app/member/[substackId]/page.tsx: FOUND（更新済み）

コミット確認:
- 17e13d6 (feat(04-02)): Task 1
- 753e312 (feat(04-02)): Task 2
- fb5c403 (feat(04-02)): Task 3

## Self-Check: PASSED
