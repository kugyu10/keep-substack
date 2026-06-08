---
status: partial
phase: 33-commitslots-upsert
source: [33-VERIFICATION.md]
started: 2026-06-08T11:30:00Z
updated: 2026-06-08T11:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. BUG-01 本番確認 — 新規メンバー追加時の RSS 取得
expected: /admin でメンバーを新規追加後、記事一覧でそのメンバーの記事データが即時確認できる
result: [pending]

### 2. DB-01 本番DB確認 — replace_member_commit_slots 関数存在確認
expected: SELECT proname FROM pg_proc WHERE proname = 'replace_member_commit_slots' が prod (xolhjcngrwwwqtklmoyk) で 1 行返る
result: [pending — Plan 04 チェックポイントで operator が確認済みと報告]

### 3. BUG-02 本番 E2E — 未認証 /my → /login → Magic Link → /my 復元
expected: https://keep-substack.vercel.app/my に未認証でアクセス → /login?next=%2Fmy にリダイレクト → Magic Link クリック → /my に戻る
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
