---
phase: 38
status: passed
verified_at: 2026-06-14
requirements: [SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06]
---

# Phase 38 VERIFICATION — ワンボタン共有

## 判定: passed

`npm test` 206 passed / `npm run build` 成功。全6要件をコードで確認。

## 要件別

| Req | 状態 | 根拠 |
|-----|------|------|
| SHARE-01 | ✅ | 再利用可能な `src/components/ShareButton.tsx`。各ビューで `<ShareButton view={...} />` 1行配置（page.tsx ×3）。配置移動はその1行のみ。 |
| SHARE-02 | ✅ | ShareButton.handleShare で `navigator.clipboard.writeText(buildShareText(...).text)`。text = 定型文＋ハッシュタグ＋公開URL。 |
| SHARE-03 | ✅ | コピー成功後 `window.open(SHARE_NOTES_URL='https://substack.com/notes', '_blank', 'noopener,noreferrer')`。 |
| SHARE-04 | ✅ | コピー後インラインフィードバック「コピー完了！貼り付けて投稿してください」を表示し4秒で自動消去。新規依存なし（KISS）。 |
| SHARE-05 | ✅ | `src/lib/share.ts` に `SHARE_TEMPLATE` / `SHARE_HASHTAG` / `SHARE_NOTES_URL` 定数。文面変更は1か所。 |
| SHARE-06 | ✅ | 各ページで `createSupabaseServerClient().auth.getUser()`（既存パターン踏襲）→ `SHARE_REQUIRE_LOGIN ? !!user : true`。全員表示は定数1か所で切替。 |

## URL再利用
Phase 37 の `buildShareUrl` を `share.ts` 経由で利用。相対→絶対化はクライアントで `window.location.origin`（ベースURL env が無いため）。URLロジックの重複なし。

## human-UAT 必要項目
- ログイン状態で4ビューにボタン表示・未ログインで非表示（本番 UAT は kugyu10@gmail.com）。
- 押下でクリップボードに正しいテキスト・新規タブで Notes が開く・フィードバック表示。
- `?team=` 選択時に team 付き URL が共有テキストに入る。

## 既知の留意点（ブロッカーではない）
- `/` と `/daily` は `getUser()`（cookies）により動的レンダリングに変わる（従来 revalidate=300 のISRキャッシュは無効化）。認証依存表示のため妥当。
