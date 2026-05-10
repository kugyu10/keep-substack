---
status: complete
phase: 06-admin-team-filter
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
started: "2026-05-10T00:00:00Z"
updated: "2026-05-10T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Basic認証ダイアログ
expected: http://localhost:3000/admin にアクセスするとブラウザのBasic認証ダイアログが表示される。.env.local の ADMIN_PASSWORD 以外では入れない。正しいパスワードを入力すると /admin が表示される。
result: pass

### 2. メンバー追加フォーム
expected: /admin にメンバー追加フォーム（名前・substackId・teamId の3フィールド）と「追加」ボタンが表示される。フォームを入力して送信するとメンバー一覧に即時反映される（ページリロードなし）。
result: pass

### 3. 重複追加エラー
expected: 既に登録済みの substackId を追加しようとすると、フォーム下に「〜は既に登録されています」などのエラーメッセージが赤字で表示され、追加されない。
result: pass

### 4. メンバー削除
expected: メンバー一覧の削除ボタンをクリックするとブラウザの確認ダイアログが表示される。「OK」を選択するとそのメンバーが一覧から即時消える。
result: pass

### 5. チームタブUI
expected: トップページ（http://localhost:3000）にチームタブ（「All」＋各チーム名）が表示される。タブは teamId が設定されたメンバーが存在する場合のみ表示される。
result: pass

### 6. チームフィルタリング
expected: チームタブをクリックすると URL が /?team=xxx に変わり、そのチームのメンバーのみのヒートマップが表示される。「All」タブをクリックすると全メンバーに戻る。
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
