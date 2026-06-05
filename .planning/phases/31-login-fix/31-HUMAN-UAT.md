---
status: partial
phase: 31-login-fix
source: [31-VERIFICATION.md]
started: 2026-06-05T22:20:00Z
updated: 2026-06-05T22:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 実環境 Magic Link フロー（member 未存在ケース）
expected: 新規招待リンク（pid と handle を持つ URL）からのログインで、DB に member レコードが存在しない場合に自動 INSERT され、/my にリダイレクトされる
result: [pending]

### 2. substack_handle 重複フォールバック
expected: 既存の member が持つ substack_handle と同じ handle を持つ招待リンクでログインした場合、`substack_handle=null` でフォールバック INSERT が実行される（エラーにならずログイン完了）
result: [pending]

### 3. 既存メンバーの再ログイン時リダイレクト
expected: 既存メンバーが再ログイン後に /my にリダイレクトされる（handle= パラメータなしの /my に遷移する）
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
