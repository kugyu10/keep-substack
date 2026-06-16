---
phase: 39-og-og
plan: 01
subsystem: ui
tags: [opengraph, og-image, metadata, next-og, ImageResponse, seo, sharing]

# Dependency graph
requires:
  - phase: 38-share
    provides: buildShareUrl / parseYmParam / formatYmParam（共有URL正準化）
provides:
  - top / daily / member ルートの OG メタタグ（og:title/description/image + twitter summary_large_image）
  - metadataBase の本番ドメイン修正（keep-substack.com）
  - メンバー専用の動的 OG 画像（草ストリップ + 記事数 + ハンドル, 1200x630, #FF6719）
  - サイト共通ブランドデフォルト OG 画像（top/daily フォールバック）
  - 純関数ヘルパ ogMeta / ogImageData（テスト付き）
affects: [sharing, seo, member-page, top-page, daily-page]

# Tech tracking
tech-stack:
  added:
    - next/og ImageResponse（Next.js 16 同梱, 新規パッケージ導入なし）
  patterns:
    - Next.js opengraph-image.tsx ファイル規約（size/contentType/alt + default async）
    - ImageResponse 内は inline flexbox スタイル（className 不可）
    - ピクセル検証不可なデータ整形を純関数へ分離して vitest 検証

created:
  - src/lib/ogMeta.ts
  - src/lib/__tests__/ogMeta.test.ts
  - src/lib/ogImageData.ts
  - src/lib/__tests__/ogImageData.test.ts
  - src/app/opengraph-image.tsx
  - src/app/(main)/member/[publicationId]/opengraph-image.tsx
modified:
  - src/app/layout.tsx
  - src/app/(main)/page.tsx
  - src/app/(main)/daily/page.tsx
  - src/app/(main)/member/[publicationId]/page.tsx

key-decisions:
  - "メンバーOG画像/メタは getMembers + getArticles の安価クエリのみ。fetchAllFeedsCached（RSS, 5s timeout）は使わない（T-39-03）"
  - "日本語フォント fetch は導入せず。latin/数値/草を確実な土台にし JP ラベルは best-effort（build/edge 失敗リスク回避）"
  - "top/daily は専用 opengraph-image を作らず src/app/opengraph-image.tsx 共通デフォルトで充足（KISS）"
  - "草の日付計算は getRecentDays / isoToJSTDateKey と同一 JST 規約（Date.now()+9h を UTC 値で読む）を再利用、新規日付ロジックなし"

requirements-completed: [OGP-01, OGP-02]

# Metrics
duration: 4min
completed: 2026-06-14
---

# Phase 39 Plan 01: 動的OG画像とOGメタタグ Summary

**共有URL（top/daily/member）に summary_large_image の OG メタと next/og 動的画像を追加。メンバールートは草ストリップ + 記事数 + ハンドルを安価な Supabase クエリのみで描く（RSS フェッチ回避）。**

## What Was Built

OGP-01（メタタグ）と OGP-02（動的OG画像）を実装した。

- **ogMeta.ts**（純関数）: `buildMemberMetaTitle`（「{name}のSubstack継続記録 📈」、空 name フォールバック）、`buildMemberMetaDescription`（articleCount=0 でも破綻しない自慢/誘引文）、`TOP_META` / `DAILY_META` 定数。
- **ogImageData.ts**（純関数）: `OG_GRASS_WEEKS=12`、`buildOgGrassStrip(items, weeks?)` が直近 weeks×7 日の JST 日付ごとに記事数を集計（古い→新しい順、範囲外/未来日/isoDate無しを除外）。
- **layout.tsx**: `metadataBase` を `https://keep-substack.com` に修正、`twitter: { card: 'summary_large_image', ... }` を追加、既存サイトデフォルト openGraph は維持。
- **top / daily**: `TOP_META` / `DAILY_META` で static `metadata`（openGraph.title/description + canonical url）。
- **member page**: `generateMetadata` を追加。`getMembers()` で name、`getArticles()` で記事数を取り `buildMemberMetaTitle/Description` でメタ生成、canonical は `buildShareUrl`。未一致時は安全な空 metadata（notFound は page 本体に委譲）。ページ本体（fetchAllFeedsCached のカレンダー描画）は無変更。
- **member opengraph-image.tsx**: 1200x630 / image/png。`buildOgGrassStrip` で 12週×7日の草グリッド（count による濃淡: 0=薄グレー / 1=primary70% / 2=primary / 2+=濃赤）、name（JP best-effort）、@handle（latin）、記事数（数値）、"Keep Substack"、#FF6719。member 未一致/記事ゼロでも破綻しない。
- **site opengraph-image.tsx**: top/daily 用のブランドデフォルトカード（"Keep Substack" + latin タグライン + 草装飾）。

## Verification Results

- `npx vitest run src/lib/__tests__/ogMeta.test.ts src/lib/__tests__/ogImageData.test.ts`: **19 passed**。
- `npx vitest run`（全体）: **228 passed / 28 files**（既存テスト無破壊）。
- `npm run build`: **成功**。opengraph-image ルート 2 本を確認（`/member/[publicationId]/opengraph-image-ksanrz` 動的, `/opengraph-image` 静的）。build 内 TypeScript ステップ green（compile/type error なし）。
- TDD ゲート: `test(39)` RED → `feat(39)` GREEN の順序を満たす。

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Out-of-Scope Items (deferred, NOT fixed)

`npx tsc --noEmit -p tsconfig.json` 単体実行は 13 件の error を出すが、**全て Phase 39 着手前から存在する pre-existing**（着手前後で同一であることを `git stash` で確認済み）。

1. `.next/dev/types/validator.ts`（7件）: `next dev` 由来の stale な route validator が route group 移動前の `.js` パス（`src/app/daily/page.js` 等）を参照。`npm run build` の正規 TypeScript ステップ（`.next/types/` を使用）は green。
2. テストファイルの型キャスト問題（`(main)/__tests__/page.test.tsx`, `saveArticles.test.ts` 計6件）。

詳細は `.planning/phases/39-og-og/deferred-items.md` に記録。OG 実装由来の型エラーはゼロ。

## Grey-area Decisions (per PLAN notes — best judgment / KISS)

1. **データ取得**: メンバーOG画像・メタは `getMembers()` + `getArticles()` の安価 Supabase クエリのみ。`fetchAllFeedsCached`（RSS, 5s timeout）は禁止（T-39-03）。実績数値は `items.length`。
2. **日本語フォント**: ImageResponse はデフォルトで JP グリフ非対応。latin（@handle, "Keep Substack", タグライン）・数値・草ビジュアルを「確実に出る土台」とし、JP name は best-effort（出なくてもレイアウト成立）。フォント fetch は build/edge 失敗リスク回避のため本フェーズ未導入。**JP グリフの実描画可否は human-UAT 項目**。
3. **top/daily 画像**: 専用 opengraph-image を作らず `src/app/opengraph-image.tsx` 共通デフォルトで充足（過剰実装回避）。
4. **草の濃淡**: `getIntensityClass` の色感（primary/70 → primary → 赤系）に合わせ、className 不可のため背景色を直接指定。
5. **runtime**: 安価クエリのため edge 強制せず Next.js デフォルト（nodejs）。

## Threat Model Compliance

- T-39-01（publicationId injection）: Supabase `.eq()` 等値パラメータ + JSX エスケープ + 未一致時の安全フォールバックで mitigate。
- T-39-03（DoS / 重いデータ取得）: RSS フェッチ禁止、getArticles 単一クエリ + ISR revalidate=300 で mitigate。
- 新規パッケージ導入なし（next/og は同梱） → T-39-SC 該当なし。

## Human-UAT Required

本番/プレビューURLをリンクデバッガ（X cards validator, Facebook debugger 等）に貼り、(a) summary_large_image 認識、(b) /member 画像に草・記事数・ハンドルが見える、(c) 日本語ラベル描画可否（出なくてもデザイン成立）を確認する。

## Commits

- 4c2a14d `test(39): add failing tests for ogMeta and ogImageData pure functions`
- 11529a0 `feat(39): implement ogMeta and ogImageData pure functions`
- 9d751cc `feat(39): add OG metadata to layout and share routes (OGP-01)`
- 93d23aa `feat(39): add dynamic OG images for member + site default (OGP-02)`

## Self-Check: PASSED

All 7 created files verified on disk. All 4 task commits verified in git log.
