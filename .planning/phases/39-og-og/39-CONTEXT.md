# Phase 39 — リンクプレビュー（OGメタタグ + 動的OG画像）

> discuss スキップ（workflow.skip_discuss=true）のため自動生成された最小 CONTEXT。

## Goal
共有された公開URLを Substack Notes / SNS に貼ると、その人の草・実績が見えるリッチなリンクプレビューが表示される。OGメタタグと Next.js `ImageResponse` による動的OG画像を出力する。これは v1.9 マイルストーンの最終フェーズ。

## Requirements
- **OGP-01**: 共有対象ルートに適切な Open Graph + Twitter Card メタタグ（`og:title` / `og:description` / `og:image` / `og:url` / `twitter:card=summary_large_image`）を出力。App Router の `generateMetadata`（または static `metadata`）をルートごとに使用。タイトル/説明は日本語で自慢・誘引向けにチューニング（例: メンバー「{name}のSubstack継続記録 📈」）。サイト全体のデフォルトも用意。
- **OGP-02**: Next.js `ImageResponse`（`opengraph-image.tsx` 規約）による動的OG画像。メンバールートの画像が最優先 — そのメンバーの草・実績を可視化（ヒートマップ/草ストリップ + ハンドル/名前 + ストリーク/達成数）。トップ/daily は強いブランドデフォルトOG画像でよい。ブランド: Substackオレンジ `#FF6719` アクセント、1200×630 で小サイズでも読める。

## 共有対象ルート（Phase 37/38）
- トップ Commit&Goal: `src/app/(main)/page.tsx`
- `/daily`: `src/app/(main)/daily/page.tsx`
- メンバーカレンダー: `src/app/(main)/member/[publicationId]/page.tsx`
- チーム選択中バリアント（`?team=`）
- `src/lib/shareUrl.ts`（canonical URL）/ `src/lib/share.ts` + `ShareButton`（Phase 38）

## グレーゾーン判断方針
- 質問せず最善判断・KISS・既存規約踏襲。
- メンバー草/heatmap データ取得経路（fetchFeed/Supabase）を調査し OG画像で再利用。重い場合は簡略化したビジュアルを描画しトレードオフを記録。
- `ImageResponse` は edge/node runtime。対応CSS（flexbox）のみ。日本語フォントはバンドル必要。グリフが出ない場合は latin handle + 数値 + 草ビジュアルにフォールバックし human-UAT 項目として記録。
- `npm test` / `npm run build` がパスすることを確認。
