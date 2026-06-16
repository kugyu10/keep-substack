---
phase: 38
slug: substack-notes
discuss: skipped
workflow: yolo / skip_discuss
---

# Phase 38 — ワンボタン共有（クリップボード + Substack Notes 起動）

## ゴール
対象4ビューに再利用可能な `<ShareButton>` を置き、押すと「定型文＋ハッシュタグ＋対象ビューの公開URL」をクリップボードにコピーし、続けて Substack Notes コンポーザーを新規タブで開く。コピー完了フィードバック（toast/インライン）を表示する。

## 対象4ビュー
- トップ Commit&Goal: `src/app/(main)/page.tsx` + `src/components/CommitGoalView.tsx`
- `/daily`: `src/app/(main)/daily/page.tsx`
- 個人カレンダー: `src/app/(main)/member/[publicationId]/page.tsx`
- チーム選択ビュー: `?team=` 経由（上記ビュー内で team 状態に追従）

## 要件
- SHARE-01: 再利用可能な `<ShareButton>` を各ビューの自然な位置に1行で配置（後から差し替え容易）
- SHARE-02: クリック時、共有テキスト（定型文＋ハッシュタグ＋公開URL）を Clipboard API でコピー
- SHARE-03: コピー後 `https://substack.com/notes` を `window.open(..., '_blank')` で開く
- SHARE-04: コピー完了＋「貼り付けて投稿してください」の toast/インラインフィードバック（KISS、重依存追加なし）
- SHARE-05: 定型文＋ハッシュタグを `src/lib/share.ts` の編集容易な定数で一元管理。既定文面は製品名＋`#KeepSubstack`＋URL（日本語・前向きトーン）
- SHARE-06: 既定でログイン済みユーザーのみ表示。全員表示へはフラグ1か所で切替

## ロック済み決定（v1.9）
- 共有メカニズム: copy + open-Notes（投稿API連携はしない）
- 既定はログインゲート
- KISS（重い新規依存を入れない）

## 再利用
- Phase 37 の `src/lib/shareUrl.ts` `buildShareUrl`（+ `parseYmParam`/`formatYmParam`）で各ビューの公開URLを生成。URL生成ロジックを重複させない。
- ログイン検出は既存の Supabase auth/session パターンを再利用（header / `/my` 等）。

## スコープ外
- OG画像 / meta タグ（Phase 39）
