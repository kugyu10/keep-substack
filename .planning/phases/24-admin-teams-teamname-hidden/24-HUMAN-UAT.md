---
status: partial
phase: 24-admin-teams-teamname-hidden
source: [24-VERIFICATION.md]
started: 2026-05-30T13:35:00Z
updated: 2026-05-30T13:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. ブラウザで admin ログイン状態で /admin/teams/{hiddenチーム名} にアクセスする（日本語チーム名はそのまま URL に入れる）
expected: チーム名見出し + 週次ヒートマップグリッドが表示される（hidden ステータスでもメンバーが出る）。存在しない/0人チームでは「該当するチームのメンバーがいません」メッセージが表示される
result: [pending]

### 2. 非admin（member ロール）または未ログインのブラウザで /admin/teams/{teamName} にアクセスする
expected: / にリダイレクトされ、ヒートマップが一切表示されない（E2E-03 / Phase 26 で網羅予定）
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
