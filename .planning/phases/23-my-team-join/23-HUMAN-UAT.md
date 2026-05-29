---
status: partial
phase: 23-my-team-join
source: [23-VERIFICATION.md]
started: 2026-05-30T09:00:00Z
updated: 2026-05-30T09:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. /my で公開チームのチェックボックス一覧が表示されることを確認
expected: ログイン後 /my を開くと status=public の全チームがチェックボックスで並び、自分が所属中のものは初期チェック済み。private 所属チームは disabled・チェック済み・「管理者が設定」ラベル付きで表示される
result: [pending]

### 2. チェックボックスを ON にして「保存する」を押すと参加できることを確認
expected: 未参加の公開チームにチェックを入れて保存 → 再読み込み後そのチームがチェック済みのまま（member_teams に行が追加されている）
result: [pending]

### 3. チェックボックスを OFF にして「保存する」を押すと退出できることを確認
expected: 参加中の公開チームのチェックを外して保存 → 再読み込み後そのチームが未チェック（member_teams から行が削除されている）。private 所属行は削除されずに残る（D-09）
result: [pending]

### 4. private チームのチェックボックスが操作不能であることを確認
expected: private 所属行は disabled でクリックしても切り替わらず、保存しても member_teams から削除されない（name 属性が無く送信対象外）
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
