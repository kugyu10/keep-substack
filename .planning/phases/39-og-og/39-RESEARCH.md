# Phase 39 — RESEARCH: リンクプレビュー（OGメタタグ + 動的OG画像）

## 要約
共有対象4ルートに OGメタタグ（OGP-01）と Next.js `ImageResponse` による動的OG画像（OGP-02）を追加する。
メンバールートの動的OG画像が最優先。データ取得経路の調査により、安価な Supabase-only クエリ（`getArticles`）で記事公開日が取れるため、重い `fetchAllFeedsCached`（RSS HTTP, 5s timeout）を回避して草を描画できることが判明。

## 既存実装の事実（調査結果）

### ルートとメタデータ現状
- ルートレイアウト `src/app/layout.tsx`: 静的 `metadata` 既存（`metadataBase: https://keep-substack.vercel.app`、`title: 'Keep Substack'`、OG画像 `/keep-substack-kv.png`）。**metadataBase が旧 vercel.app のまま** → `https://keep-substack.com` に修正必要。
- `src/app/(main)/page.tsx`（トップ Commit&Goal）/ `src/app/(main)/daily/page.tsx` / `src/app/(main)/member/[publicationId]/page.tsx`: いずれも `generateMetadata`/`metadata` 未定義。`revalidate = 300`（ISR）。

### URL 形状（shareUrl.ts）
- `buildShareUrl(view)`、`view: { type: 'goal'|'daily'|'member'; team?; publicationId?; ym? }`
- goal: `/` or `/?team=...`、daily: `/daily` or `/daily?team=...`、member: `/member/{encoded publicationId}` (+`?ym=YYYY-MM`)
- `parseYmParam` / `formatYmParam` あり。

### データ取得コスト（OG画像にとって重要）
| 関数 | 場所 | コスト | 取れるデータ |
|---|---|---|---|
| `getMembers()` | src/lib/members.ts | 安価（1 Supabase クエリ + join） | id, name, publicationId, teams[], substackHandle, imageUrl |
| `getArticles(publicationId)` | src/lib/articles.ts | **安価（Supabase articles テーブルのみ）** | items: FeedItem[]（title, link, isoDate, thumbnail）, imageUrl |
| `fetchAllFeedsCached(members)` | src/lib/fetchFeed.ts | **高価（RSS HTTP, 5s timeout, 全メンバー並列）** | 同上＋ライブ |
| `buildHeatmapArticleMap(items)` | src/lib/heatmapUtils.ts | 安価（in-memory Map） | Map<dateKey, HeatmapArticle[]> |
| `consecutiveWeekStreak(slots, items)` | src/lib/commitUtils.ts | 安価（in-memory） | 連続達成週数 |
| `getRecentDays(weekOffset)` | src/lib/heatmapUtils.ts | 安価 | 日付キー配列 |

**決定**: メンバーOG画像は `getMembers()` + `getArticles(publicationId)` のみで描画する（RSS フェッチ回避）。記事公開日を直近 N 週ぶんの草ストリップ（日別濃度）として可視化し、合計記事数を実績数値として表示。これで OGP-02 のメンバー優先要件を、build/edge で軽量に満たせる。streak はコミット slots が必要だが、OG画像簡略化のため「直近の記事日からの草」と「総記事数」を主軸にし、slots 依存は任意（取得できれば streak も載せる）。トレードオフを CONTEXT/PLAN に記録。

### publicationId の意味
- Substack の publication id。`members.publication_id` 列。`https://{publicationId}.substack.com/feed` を動的生成。`/member/[publicationId]` で URL エンコード渡し。

### ブランド/フォント
- `--color-primary: #FF6719`（globals.css）。Lora は Google Fonts CDN。**ローカル日本語フォントなし**（public/ に .woff/.ttf なし）。
- 既存フォールバックOG画像 `/public/keep-substack-kv.png` あり。
- 既存 `ImageResponse`/`opengraph-image` の使用なし。

## 技術アプローチ（Next.js 16 App Router）

### OGP-01: メタタグ
- ルートごとに `generateMetadata`（member/daily は動的）または static `metadata`。
- メンバー: `generateMetadata({ params })` で `getMembers()` から name を引き、`title: '{name}のSubstack継続記録 📈'`、`description` を自慢/誘引文、`openGraph.url`（canonical, keep-substack.com 基準）、`twitter.card: 'summary_large_image'`。
- `opengraph-image.tsx` を同階層に置けば Next.js が自動的に `og:image` と `twitter:image` を 1200×630・`summary_large_image` で注入する（手動で images を書く必要は基本なし。ただし絶対URL/twitter card 明示のため root layout の twitter 設定は補強）。
- root layout: `metadataBase` を `https://keep-substack.com` に修正、`twitter: { card: 'summary_large_image' }` を追加、サイト全体デフォルト OG を維持。

### OGP-02: 動的OG画像（`opengraph-image.tsx` 規約）
- ファイル: 各ルート同階層に `opengraph-image.tsx`。`export const size = { width:1200, height:630 }`、`export const contentType = 'image/png'`、`export const alt`。デフォルト関数で `new ImageResponse(<JSX>, { ...size })` を返す。
- メンバー: `src/app/(main)/member/[publicationId]/opengraph-image.tsx` — params で publicationId を受け、`getMembers()`+`getArticles()` で name/handle/imageUrl/記事日を取得し、草ストリップ + name/handle + 総記事数（+可能なら streak）を描画。
- トップ/daily: 強いブランドデフォルト（`src/app/opengraph-image.tsx` をサイト共通フォールバックに）。daily/トップ固有が欲しければ各 (main) 階層 or ルート直下に1枚。KISS でまずサイト共通ブランドOG + メンバー専用OGの2枚を必須とし、トップ/daily はブランドOGで充足（成功基準を満たす）。

### 日本語フォント問題（重要なグレーゾーン）
- `ImageResponse` はデフォルトで日本語グリフを描画できない（システムフォント非バンドル）。
- 対応案: (A) Google Fonts 等から `.woff`/`.ttf` を build 時に fetch して `fonts` オプションに渡す（Noto Sans JP の subset）。(B) 日本語を避け、ハンドル(latin) + 数値 + 草ビジュアル + ブランド英字（"Keep Substack"）でデザイン。
- **方針**: まず (B) を確実な土台にする（latin/数値/草で確実にレンダリング）。可能なら (A) で日本語ラベルを足すが、フォント fetch が build/edge で失敗するリスクがあるため、日本語が出ない場合のフォールバックを (B) として常に成立させる。日本語グリフ検証は human-UAT 項目（リンクデバッガでの実画像確認）として記録。

## テスト戦略
- vitest（`src/**/*.{test,spec}.{ts,tsx}`）。OG画像は ImageResponse のピクセル検証は不可 → ロジック（データ整形/草ストリップ用の集計関数、メタタグ生成のタイトル/説明文字列）を純関数に切り出して単体テスト。
- `generateMetadata` のタイトル/description 文字列生成を検証。
- `npm run build` が `opengraph-image.tsx` を含めて通ることを確認（型・runtime）。
- リンクプレビューの実描画は human-UAT（本番/プレビューURL を Substack Notes / X デバッガに貼る）。

## グレーゾーン決定の記録
1. メンバーOG画像は安価な `getArticles` のみ使用、RSS フェッチ回避（パフォーマンス）。
2. 日本語フォントは latin/数値ベースのデザインを確実な土台に、日本語は best-effort。human-UAT 項目。
3. トップ/daily は共通ブランドOG画像で成功基準を充足（KISS、過剰実装回避）。
4. `metadataBase` を keep-substack.com に修正。
