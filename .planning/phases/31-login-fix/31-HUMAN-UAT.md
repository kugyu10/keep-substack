---
status: resolved
phase: 31-login-fix
source: [31-VERIFICATION.md]
started: 2026-06-05T22:20:00Z
updated: 2026-06-06T09:00:00Z
---

## Current Test

完了（2026-06-06）

## Tests

### 1. 実環境 Magic Link フロー（member 未存在ケース）
expected: 新規招待リンク（pid と handle を持つ URL）からのログインで、DB に member レコードが存在しない場合に自動 INSERT され、/my にリダイレクトされる
result: PASSED ✓

### 2. substack_handle 重複フォールバック
expected: 既存の member が持つ substack_handle と同じ handle を持つ招待リンクでログインした場合、`substack_handle=null` でフォールバック INSERT が実行される（エラーにならずログイン完了）
result: PASSED ✓

### 3. 既存メンバーの再ログイン時リダイレクト
expected: 既存メンバーが再ログイン後に /my にリダイレクトされる（handle= パラメータなしの /my に遷移する）
result: FAILED ✗ — pid/handle クエリパラメータなしでは Magic Link が送れない（D-01 バリデーションが既存メンバーの再ログインも阻害）

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

### G-01: 既存メンバーが pid/handle なしで再ログインできない
status: resolved
description: D-01 で sendMagicLinkAction に pid/handle 必須バリデーションを追加したため、クエリパラメータなしの URL からはログイン不可になった
fix: ログインページを /login（既存メンバー用）と /login-51cf21389c56（新規招待用）に分離する
resolved_by: plan 31-04 — /login と /signin-51cf21389c56 に分離完了（2026-06-06）
