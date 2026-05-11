---
status: complete
phase: 10-cron-kv-persistence
source: [10-01-SUMMARY.md]
started: 2026-05-11T09:00:00Z
updated: 2026-05-11T09:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cron API — 認証なしで401
expected: `curl http://localhost:3000/api/cron` で 401 Unauthorized が返る（CRON_SECRETなしで呼び出すと拒否される）。
result: pass

### 2. Cron API — 認証ありで200
expected: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron` で `{"ok":true,"count":N}` が返る。
result: pass

### 3. メンバー登録後にKVに記事が保存される
expected: 管理画面でメンバーを新規登録した直後に、トップページのヒートマップでそのメンバーの記事が表示される（KVへの初回保存が成功している）。
result: pass

### 4. トップページ — 既存メンバーの記事が引き続き表示される
expected: トップページを開くとヒートマップが通常通り表示される（KV移行後もデータが表示される）。
result: pass
note: "onMouseLeave の relatedTarget instanceof Node チェックを追加して修正済み"

### 5. vercel.json にCron設定が存在する
expected: プロジェクトルートの `vercel.json` に `"schedule": "0 20 * * *"` の設定が含まれている。
result: pass
note: "スケジュールを 0 18 * * * (JST 3:00) に変更済み"

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
