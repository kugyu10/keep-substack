---
status: complete
phase: 37-url-url
source: [37-01-SUMMARY.md, 37-VERIFICATION.md]
started: 2026-06-16T00:00:00Z
updated: 2026-06-16T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. 未ログインで /member/[id]?ym=2026-05 を開く
expected: 未ログインでログイン要求されず、2026年5月のカレンダーが表示される。リロード/別タブでも同じ5月が維持。月送り（＜ ＞）でURLの ym= が前月/翌月に更新される。
result: pass

### 2. トップ Commit&Goal でチームタブを切り替える
expected: チームタブ切替でURLに ?team=<チーム名> が付与される。別タブで同URLを開くと同じチームが選択された状態で表示。未ログインでもアクセス可。
result: pass

### 3. /daily?team=<チーム名> を未ログインで開く
expected: 指定チームでフィルタされた daily ビューが表示され、ログイン要求されない。
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
