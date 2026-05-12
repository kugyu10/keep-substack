---
status: root_cause_found
trigger: ユーザー追加時にRSSが読まれない
created: 2026-05-12
updated: 2026-05-12
---

# Debug Session: rss-not-fetched-on-user-add

## Symptoms

- **expected**: ユーザー追加直後にRSSを自動取得する
- **actual**: RSSが全く取得されない
- **errors**: エラーなし（サイレント失敗）
- **timeline**: 最初から（新機能実装時から）
- **reproduction**: 管理画面からユーザー追加

## Current Focus

```
hypothesis: fetchWithRetry がエラーを握りつぶし、saveArticles に空配列が渡っている
test: fetchFeed.ts の catch ブロックにログがなく、失敗が完全に隠蔽される
expecting: エラーログを追加すれば実際の失敗原因が判明する
next_action: fix applied
```

## Evidence

- timestamp: 2026-05-12T00:00:00Z
  file: src/lib/fetchFeed.ts
  finding: fetchWithRetry の catch ブロック（36行・44行）でエラーを完全に握りつぶし、{ items: [] } を返す。console.error すらない。
- timestamp: 2026-05-12T00:00:00Z
  file: src/app/admin/actions.ts
  finding: addMemberAction は fetchWithRetry の結果が空配列でも成功扱い。空配列が saveArticles に渡ると KV に空データが書き込まれる。
- timestamp: 2026-05-12T00:00:00Z
  file: src/lib/kvArticles.ts
  finding: saveArticles は newItems が空配列の場合、既存KVに何も追加しない（toAdd = [] になるため）。初回なら KV に { items: [], imageUrl: undefined } が保存される。
- timestamp: 2026-05-12T00:00:00Z
  finding: actions.ts コメントに「失敗しても登録自体は成功扱い」「次のCronで補填」と明記されている。設計上の意図はあるが、Cronも同じ fetchWithRetry を使うため、ネットワーク問題が根本にある場合は補填されない。

## Eliminated

- saveArticles のロジックバグ: dedupe は正常動作。初回は existing が空なので全件追加のはず。
- addMember の失敗: エラーがあれば catch で return するため、fetch まで到達していると判断。

## Resolution

- root_cause: fetchWithRetry の catch ブロックがエラーをログせず { items: [] } を返すため、RSS取得失敗がサイレントになっている。結果として saveArticles に空配列が渡り、KVには空データが保存される。実際のフェッチ失敗原因（タイムアウト・DNS解決失敗・Substackのレート制限等）が全く追跡できない。
- fix: fetchWithRetry の各 catch ブロックに console.error を追加してエラーをログする。これにより実際の失敗原因が判明し、根本的な対処が可能になる。
- verification: ユーザー追加時にサーバーログにエラーメッセージが表示されること、またはRSS取得が成功して記事が保存されることを確認する。
- files_changed: src/lib/fetchFeed.ts
