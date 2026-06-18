---
phase: 41-2-note
plan: 01
subsystem: notes
tags: [substack-notes, rsc, fetch, tdd, poc]
requires:
  - middleware /admin/:path* guard (既存)
provides:
  - "src/lib/notes.ts: fetchAdminNotes() + parseNoteFeed() + NoteItem/NoteListResult 型（Phase 42 再利用予定の安定 API）"
  - "/admin/notes RSC ページ（読み取り専用 Note 一覧）"
affects:
  - src/lib/notes.ts
  - src/app/(main)/admin/notes/page.tsx
  - .env.example
  - .env.local (gitignored)
tech-stack:
  added: []
  patterns:
    - "判別ユニオン NoteListResult で 取得失敗 と 0件 を別状態として表現（NOTE-03）"
    - "型ガード isNoteItem で context.type==='note' + comment 型整合のみ通す（throw しない）"
    - "fetch cache:'no-store' + page force-dynamic の二重で永続化なし担保（NOTE-01）"
    - "fetchFeed.ts 踏襲のリトライ（1回失敗→1秒待ち→1回リトライ）"
key-files:
  created:
    - src/lib/notes.ts
    - src/lib/__tests__/notes.test.ts
    - src/lib/__tests__/fixtures/profile_feed.json
    - src/app/(main)/admin/notes/page.tsx
  modified:
    - .env.example
    - .env.local
key-decisions:
  - "parseNoteFeed を純関数として fetchAdminNotes から分離（fetch 非依存・テスト容易・Phase 42 再利用）"
  - "NoteItem は id/body/date のみ。children_count/reaction_count を型に含めない（D-04）"
  - "取得失敗時は空配列フォールバックせず status:'error' を返す（0件と失敗を別文言で出すため・NOTE-03）"
requirements-completed: [NOTE-01, NOTE-02, NOTE-03]
duration: 4 min
completed: 2026-06-18
---

# Phase 41 Plan 01: 機能2 Note 一覧 PoC Summary

admin が `/admin/notes` で自分が投稿した Substack Note を都度サーバー fetch して読み取り専用表示する最小 PoC。取得層 `lib/notes.ts`（純関数 `parseNoteFeed` + 判別ユニオンを返す `fetchAdminNotes`）と force-dynamic な RSC ページを TDD で実装。DB・キャッシュ・永続化なし。

- 開始: 2026-06-18T01:22:08Z / 終了: 2026-06-18T01:26:31Z / 所要 約4分
- タスク: 4 中 3 完了（Task 4 は blocking human-verify チェックポイントで未着手）
- 変更ファイル: 6（新規4 / 変更2）

## 完了したタスク

| Task | 内容 | コミット |
| ---- | ---- | -------- |
| 1 (TDD RED) | parseNoteFeed / fetchAdminNotes の失敗テスト + フィクスチャ化 | 1aff727 |
| 1 (TDD GREEN) | src/lib/notes.ts 実装（13テスト green） | 1ba8712 |
| 2 | /admin/notes RSC ページ（status 3分岐・pre-wrap・JST） | 8f7b3d5 |
| 3 | env 契約（.env.example / .env.local） | fe06950 |
| 4 | 表示 UAT + Vercel env 反映 | **未完了（人手チェックポイント）** |

## 検証結果

- `npx vitest run src/lib/__tests__/notes.test.ts` → 13 passed (13) ✅
- `npm test`（全 263 テスト）→ 41-01 関連は全 green。既存の `my/__tests__/page.test.tsx` 5件失敗は **本プラン着手前（base commit 4597b91）から存在する pre-existing**（同条件で再現確認済み）→ 範囲外につき未修正、deferred-items.md に記録。
- `npx tsc --noEmit` → 41-01 のファイル（notes.ts / notes.test.ts / admin/notes page）には型エラー **0**。既存 `saveArticles.test.ts` の型エラーは pre-existing・範囲外（deferred-items.md）。
- `npx next build` → `ƒ /admin/notes`（Dynamic、force-dynamic 効いている）✅

## 実装の要点

- `parseNoteFeed(json: unknown): NoteItem[]` — `items` を `context.type==='note'` でフィルタし、`comment.id`(number)/`body`(string)/`date`(string) を型ガードで検証して `{id,body,date}` に正規化。restack（comment_restack/post_restack）は除外。不正・空入力は throw せず `[]`。フィクスチャ 11 items から note 8件を抽出。
- `fetchAdminNotes(): Promise<NoteListResult>` — env `SUBSTACK_ADMIN_USER_ID` 未設定なら fetch せず `{status:'error'}`。`https://substack.com/api/v1/reader/feed/profile/${userId}?types=note` を `cache:'no-store'` + `AbortSignal.timeout(5000)` で取得。`res.ok` 不成立は throw → 1秒待ち → 1回リトライ → なお失敗で `{status:'error'}`（空配列フォールバックしない）。成功時 `{status:'ok', notes}`。
- `/admin/notes` ページ — `export const dynamic='force-dynamic'`。error / 0件 / 一覧の3分岐を別文言で描画。本文は `whitespace-pre-wrap break-words` でテキストノード描画（改行保持・XSS安全）。日時は `toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})`。admin ガードは middleware 任せ（page で再ガードしない）。

## Deviations from Plan

None - plan executed exactly as written.

範囲外の pre-existing 失敗（`my/page.test.tsx` 5件・`saveArticles.test.ts` 型エラー）は本プランの変更が原因ではないため未修正。`.planning/phases/41-2-note/deferred-items.md` に証跡付きで記録。

## Known Stubs

なし。`/admin/notes` は実エンドポイントから都度 fetch するため、表示確認には実 Substack 応答が必要（Task 4 の人手 UAT で検証）。

## Task 4 — 未完了の人手チェックポイント（blocking: human-verify）

Claude の自動作業は Task 1-3 で完了。Task 4 は開発者本人による確認・登録が必要。

開発者が確認すること:
1. ローカルで env 反映後 `npm run dev` を再起動。
2. admin アカウントで `http://localhost:3000/admin/notes` を開く → 自分の Note 一覧が本文全文（改行保持）＋投稿日時 JST で表示されること。他人の名前/restack・コメント数/リアクション数・外部リンクが出ていないこと。
3. （任意）0件 user_id に切替 → 「まだ Note がありません。」が出ること。
4. 失敗確認: `.env.local` の `SUBSTACK_ADMIN_USER_ID` を空にして再起動 → 「Note の取得に失敗しました。…」（0件文言と別）が出ること。確認後 110584954 に戻す。

Vercel env 登録（開発者作業・Claude では実行不可）:
- Vercel Dashboard → keep-substack → Settings → Environment Variables に
  `SUBSTACK_ADMIN_USER_ID=110584954` を **dev / preview / production すべて**に追加。
- preview デプロイで `/admin/notes` が同様に表示されることを確認。

resume-signal: 表示・JST・状態文言（失敗/0件の別文言）を確認したら "approved"、問題があれば内容を記載。

## Self-Check: PASSED

全 created/modified ファイルがディスク上に存在し、Task 1-3 の全コミット（1aff727 / 1ba8712 / 8f7b3d5 / fe06950）が git 履歴に存在することを確認。
