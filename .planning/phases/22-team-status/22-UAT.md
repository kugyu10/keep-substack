---
status: complete
phase: 22-team-status
source: 22-01-SUMMARY.md, 22-02-SUMMARY.md, 22-03-SUMMARY.md, 22-04-SUMMARY.md
started: 2026-05-26T14:49:51Z
updated: 2026-05-26T14:49:51Z
---

## Current Test

number: 7
name: hiddenへの変更時の確認ダイアログ
expected: /admin/teams でチームのstatusをhiddenに変更して「ステータスを保存」をクリックすると、確認ダイアログが表示される。「キャンセル」を押すと保存されない。
result: pass

## Tests

### 1. Cold Start Smoke Test
expected: アプリを起動してトップページ（http://localhost:3000）を開く。ページが正常にロードされ、メンバーのヒートマップが表示される。エラーや白画面にならないこと。
result: pass

### 2. トップページ: publicチームのみタブ表示
expected: トップページ上部のチームタブに、status=publicのチームのみ表示される。chameleonチーム（status=hidden）はタブに表示されない。
result: pass

### 3. トップページ: Allビューでhiddenチームメンバーが非表示
expected: 「All」ビュー（チームタブ未選択）を表示したとき、chameleonチームに所属するメンバーが一覧に表示されない。
result: pass

### 4. /adminページ: 「チーム設定」リンク表示
expected: /admin ページを開いたとき、メンバー数の下に「チーム設定」リンクが表示されている。クリックすると /admin/teams に遷移する。
result: pass

### 5. /admin/teamsページ: チーム一覧とstatusドロップダウン表示
expected: /admin/teams を開いたとき、チーム名・statusドロップダウン（public/private/hidden）・「ステータスを保存」ボタンの行が各チームに対して表示される。「← 管理画面へ」リンクも表示される。
result: pass

### 6. チームstatusの変更と保存
expected: /admin/teams でいずれかのチームのドロップダウンを変更し「ステータスを保存」をクリックすると、エラーなく保存される（ページリフレッシュ後も値が保持されている）。
result: pass

### 7. hiddenへの変更時の確認ダイアログ
expected: /admin/teams でチームのstatusをhiddenに変更して「ステータスを保存」をクリックすると、「このチームをhiddenにすると、メンバーがAll表示からも非表示になります。続けますか？」という確認ダイアログが表示される。「キャンセル」を押すと保存されない。
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
