---
phase: 4
plan: "04-01"
subsystem: kv-data-layer
tags: [upstash-redis, kv, types, data-layer]
dependency_graph:
  requires: []
  provides: [src/lib/redis.ts, src/lib/kvMembers.ts, src/lib/types.ts]
  affects: [src/lib/fetchFeed.ts, src/app/page.tsx, src/app/member/[substackId]/page.tsx]
tech_stack:
  added: ["@upstash/redis ^1.38.0", "tsx ^4.21.0 (dev)", "dotenv ^17.4.2 (dev)"]
  patterns: ["Redis.fromEnv() シングルトン", "KV単一キー 'members' に配列を格納"]
key_files:
  created:
    - src/lib/redis.ts
    - src/lib/kvMembers.ts
  modified:
    - src/lib/types.ts
    - package.json
    - package-lock.json
decisions:
  - "@upstash/redis の自動シリアライズを使用（redis.json.* は使わない）"
  - "feedUrl フィールドを types.ts から削除。フィードURLは substackId から動的生成する"
  - "getMembers() は KV キーが存在しない場合に空配列を返す（null safety）"
metrics:
  duration: "1 minutes"
  completed_date: "2026-05-09"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 01: KVデータ層基盤構築 Summary

## One-liner

@upstash/redis を使った Redis シングルトンと getMembers() KV取得関数を新設し、Member 型を新KVスキーマ（substackId/teamId/addedAt）に更新した。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 依存パッケージのインストール | eda3686 | package.json, package-lock.json |
| 2 | Member 型の更新と redis/kvMembers モジュールの新設 | fcd3066 | src/lib/types.ts, src/lib/redis.ts, src/lib/kvMembers.ts |

## What Was Built

### Task 1: 依存パッケージのインストール
- `@upstash/redis ^1.38.0` を dependencies に追加
- `tsx ^4.21.0` を devDependencies に追加（seed スクリプト用）
- `dotenv ^17.4.2` を devDependencies に追加（seed スクリプト用）

### Task 2: Member 型の更新と redis/kvMembers モジュールの新設
- `src/lib/types.ts` の Member 型を新KVスキーマに更新（feedUrl 削除、substackId/teamId/addedAt 追加）
- `src/lib/redis.ts` を新設（@upstash/redis シングルトンクライアント）
- `src/lib/kvMembers.ts` を新設（getMembers() 関数、KV未シード時は空配列返却）

## Verification Results

- `@upstash/redis ^1.38.0`: dependencies に存在する
- `tsx ^4.21.0`: devDependencies に存在する
- `dotenv ^17.4.2`: devDependencies に存在する
- `src/lib/types.ts`: substackId/teamId/addedAt フィールドあり、feedUrl フィールドなし
- `src/lib/redis.ts`: `export const redis = Redis.fromEnv()` を含む
- `src/lib/kvMembers.ts`: `getMembers(): Promise<Member[]>` と `return members ?? []` を含む
- TypeScript: 新設ファイル自体に型エラーなし。fetchFeed.ts/page.tsx の feedUrl 参照エラーは 04-02-PLAN で解消予定

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] types.ts コメントの feedUrl 文字列を削除**
- **Found during:** Task 2 の acceptance_criteria 検証
- **Issue:** `grep -c "feedUrl" src/lib/types.ts` が 1 を返した（コメント中に "feedUrl" が含まれていた）
- **Fix:** コメントの "feedUrl" を "フィードURL" に変更してプランの acceptance_criteria を満たした
- **Files modified:** src/lib/types.ts
- **Commit:** fcd3066（Task 2 コミットに含める）

## Known Stubs

なし。

## Threat Flags

T-04-01（セキュリティ）: UPSTASH_REDIS_REST_TOKEN および UPSTASH_REDIS_REST_URL は `.env.local` に格納し git にコミットしない。`.gitignore` に `.env.local` が含まれることを別途確認すること。

## Self-Check

ファイル存在確認:
- src/lib/redis.ts: FOUND
- src/lib/kvMembers.ts: FOUND
- src/lib/types.ts: FOUND（更新済み）

コミット確認:
- eda3686 (chore(04-01)): FOUND
- fcd3066 (feat(04-01)): FOUND

## Self-Check: PASSED
