---
plan: 28-01
phase: 28-db-my
status: complete
completed_at: "2026-06-03"
tasks_completed: 4
commits:
  - "test(28-01): Wave 0 — updateCommitSlotsAction テストスキャフォールド（RED）"
  - "feat(28-01): member_commit_slots migration ファイルを作成"
  - "feat(28-01): schema.sql に member_commit_slots を追加（Phase 26 確立ルール）"
key_files:
  created:
    - supabase/migrations/20260602000001_add_member_commit_slots.sql
    - src/app/my/__tests__/updateCommitSlotsAction.test.ts
  modified:
    - supabase/schema.sql
self_check: PASSED
---

# Plan 28-01 Summary: member_commit_slots DBマイグレーション

## What was built

`member_commit_slots` テーブルを Supabase dev DB に追加した。

- **migration ファイル** (`supabase/migrations/20260602000001_add_member_commit_slots.sql`): `member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE`（BIGINT ではなく UUID）、ISO 8601 準拠の CHECK 制約（day_of_week BETWEEN 1 AND 7, hour BETWEEN 0 AND 23）、RLS 有効化 + public SELECT + 本人書き込みポリシー（auth.uid() スコープ）
- **schema.sql 同期**: Phase 26 確立ルール通り migration と schema.sql を同時更新
- **Wave 0 テストスキャフォールド** (`src/app/my/__tests__/updateCommitSlotsAction.test.ts`): 6 件のテストケースが RED 状態で存在。Plan 02 の実装後に GREEN になる

## Verification

- `supabase db push` が成功し、Supabase dev Dashboard で `member_commit_slots` テーブルと 2 つの RLS ポリシーを確認
- `member_id` は UUID 型で `members(id)` への FK 制約が成立
- 既存テストへの影響なし（page.test.tsx の既存失敗は事前から存在）

## Deviations

なし — プランの全 must_haves を満たした。push 先を prod ではなく dev 環境（otydhiumsdsyxepnjqjp）に変更した（ユーザー判断）。
