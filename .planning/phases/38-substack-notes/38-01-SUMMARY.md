---
plan_id: 38-01
phase: 38
title: ワンボタン共有（ShareButton + クリップボード + Substack Notes 起動）
requirements: [SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06]
status: complete
completed: 2026-06-14
---

# Phase 38 SUMMARY — ワンボタン共有

**one_liner:** 対象4ビューに再利用可能な `<ShareButton>` を配置し、押下で定型文＋ハッシュタグ＋公開URLをクリップボードにコピーして Substack Notes を新規タブで開く、ログイン済み限定のワンボタン共有を実装した。

## 完了タスク

- **T1 `src/lib/share.ts`**: 編集容易な定数 `SHARE_TEMPLATE` / `SHARE_HASHTAG` / `SHARE_NOTES_URL`（`https://substack.com/notes`）/ `SHARE_REQUIRE_LOGIN=true` を一元管理。`buildShareText({ view, origin })` が Phase 37 の `buildShareUrl` に委譲して相対URLを取得、origin で絶対化し `${SHARE_TEMPLATE} ${SHARE_HASHTAG}\n${url}` を組み立てる（SHARE-05）。
- **T2 `src/components/ShareButton.tsx`**（`'use client'`）: `view: ShareView` を受け、`navigator.clipboard.writeText` でコピー（SHARE-02）→成功で `window.open(SHARE_NOTES_URL, '_blank', 'noopener,noreferrer')`（SHARE-03）→「コピー完了！貼り付けて投稿してください」をインライン表示し4秒で自動消去（SHARE-04、新規依存なし）。
- **T3 4ビュー配置**: `(main)/page.tsx`・`(main)/daily/page.tsx`・`(main)/member/[publicationId]/page.tsx` に `<ShareButton view={...} />` を1行配置（SHARE-01）。各ページで `createSupabaseServerClient().auth.getUser()` → `SHARE_REQUIRE_LOGIN ? !!user : true` でログイン時のみ表示（SHARE-06）。`?team=` 選択は同一ページの `team` 変数を view に渡して自動追従。
- **T4 テスト** `src/lib/__tests__/share.test.ts`: `buildShareText` の組み立て（origin あり/なし）・4ビューのURL・`SHARE_REQUIRE_LOGIN` 既定を検証。

## 検証

- `npm test` 206 passed / `npm run build` 成功。
- VERIFICATION: **passed**（全6要件をコードで確認）。

## 設計判断 / 留意点

- URL生成ロジックは複製せず Phase 37 `buildShareUrl` に委譲。絶対化はベースURL env が無いためクライアントで `window.location.origin` を使用（本番 `https://keep-substack.com` / dev を正しく反映）。
- toast ライブラリは導入せずインラインフィードバックで KISS。
- 全員表示への切替は `SHARE_REQUIRE_LOGIN` 定数1か所の変更で完結。
- `/` と `/daily` は `getUser()`（cookies）参照により動的レンダリングへ移行（従来の revalidate=300 ISR キャッシュは無効化）。認証依存表示のため妥当。
