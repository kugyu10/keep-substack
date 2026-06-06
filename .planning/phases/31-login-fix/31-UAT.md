---
status: complete
phase: 31-login-fix
source: [31-01-SUMMARY.md, 31-02-SUMMARY.md, 31-03-SUMMARY.md, 31-04-SUMMARY.md]
started: 2026-06-06T09:00:00Z
updated: 2026-06-06T09:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. コールドスタート動作確認
expected: 開発サーバーを再起動（npm run dev）して、エラーなく起動し、アプリのトップページが正常に表示される。コンソールに起動エラーがない。
result: pass

### 2. 不正な招待リンクでのエラー表示（D-01 バリデーション）
expected: /signin-51cf21389c56 に pid/handle なしでアクセスしてメールアドレスを入力し送信ボタンを押すと、「登録リンクが不正です」というエラーメッセージが表示される。Magic Link は送信されない。
result: issue
reported: "ログイン→サインイン に タイトルとボタンラベル変更"
severity: cosmetic

### 3. 招待リンクから新規メンバーログイン
expected: /signin-51cf21389c56?pid={id}&handle=@{handle} の形式の招待リンクにアクセスし、メールアドレスを入力して送信すると Magic Link メールが届く。リンクをクリックすると /my ページにリダイレクトされ、DB に member レコードが INSERT されている。
result: pass

### 4. 既存メンバーが /login でメールのみ再ログイン（G-01 修正 — 最重要）
expected: /login にアクセスすると、メールアドレスのみ入力するシンプルなフォームが表示される（pid/handle フィールドなし）。メールアドレスを入力して送信すると Magic Link メールが届く。リンクをクリックすると /my ページにリダイレクトされる。
result: pass

### 5. 旧 URL が 404 を返す
expected: /login-51cf21389c56 にアクセスすると Next.js の 404 ページが表示される（旧ディレクトリは削除済みのため）。
result: pass

### 6. /my ページで substack_handle が読み取り専用表示
expected: substack_handle が設定済みのメンバーが /my にアクセスすると、Substack ハンドルが編集不可のテキストとして表示される（input フィールドではなく p タグ）。
result: pass

### 7. admin による substack_handle / publication_id 編集
expected: 管理画面（/admin）でメンバーの substack_handle と publication_id の入力フィールドが表示され、値を変更して保存できる。保存後、変更が反映されている。
result: issue
reported: "publicationId列とpublicationId (edit)列がある　一つにして　テーブルの横幅が狭くて保存ボタンが隠れるのでレイアウト調整して(max-width大きめにして）"
severity: major

### 8. substack_handle 重複時のフォールバックログイン
expected: 既存メンバーと同じ substack_handle を持つ招待リンクでログインした場合、エラーにならず /my にリダイレクトされる。member レコードは substack_handle=null でフォールバック INSERT される（またはすでに存在する場合はスキップ）。
result: skipped
reason: 重複ケースのテストデータ準備が困難なためスキップ

## Summary

total: 8
passed: 5
issues: 2
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "/signin-51cf21389c56 のページタイトルとボタンラベルが「サインイン」と表示される"
  status: failed
  reason: "User reported: ログイン→サインイン に タイトルとボタンラベル変更"
  severity: cosmetic
  test: 2
  root_cause: ""
  artifacts: []
  missing: []

- truth: "管理画面の publication_id 列が一つに統合され、保存ボタンが画面内に収まっている"
  status: failed
  reason: "User reported: publicationId列とpublicationId (edit)列がある　一つにして　テーブルの横幅が狭くて保存ボタンが隠れるのでレイアウト調整して(max-width大きめにして）"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
