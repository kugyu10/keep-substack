---
phase: 39-og-og
verified: 2026-06-14T01:42:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "本番/プレビューURL（top / daily / /member/[id]）をリンクデバッガ（X Cards Validator, Facebook Sharing Debugger 等）に貼る"
    expected: "summary_large_image のリッチカードが認識され、og:title / og:description / og:image が正しく表示される"
    why_human: "外部リンクデバッガによる実プレビュー描画はコードベースだけでは検証不可（OGP-01 success criteria の『リンクデバッガで正しく認識される』）"
  - test: "/member/[id] のOG画像を実際に描画させ、草ストリップ・記事数・@handle が見えるか確認"
    expected: "対象メンバー固有の草グリッド・記事数・ハンドルが画像に表示される"
    why_human: "ImageResponse のピクセル描画結果（画像の見た目）はプログラム検証不可。純関数の整形ロジックは vitest 済み"
  - test: "OG画像内の日本語ラベル（name）の実描画可否を確認"
    expected: "JPフォント未バンドルのため name が出ない可能性あり。出なくてもレイアウトが成立する（latin handle + 数値 + 草で自慢が伝わる）"
    why_human: "JPグリフ描画は edge/node runtime のフォント有無に依存。本フェーズは意図的に best-effort（key-decision で記録済み）"
---

# Phase 39: リンクプレビュー（OGメタタグ + 動的OG画像）Verification Report

**Phase Goal:** 共有された公開URLを Substack Notes / SNS に貼ると、その人の草・実績が見えるリッチなリンクプレビューが表示される。OGメタタグと Next.js `ImageResponse` による動的OG画像を出力する。
**Verified:** 2026-06-14T01:42:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | 共有対象ルート（top / daily / member）に og:title / og:description / og:image / twitter card が出力される | ✓ VERIFIED | layout.tsx に `twitter: { card: 'summary_large_image', ... }` + デフォルト openGraph.images。top/daily に static `metadata.openGraph`（title/description/url）。member は `generateMetadata` で openGraph title/description/url。og:image は opengraph-image.tsx 規約で自動配信（build に両ルート出現） |
| 2 | metadataBase が https://keep-substack.com になっている | ✓ VERIFIED | `layout.tsx:6` `metadataBase: new URL('https://keep-substack.com')` |
| 3 | /member を共有すると固有の草ストリップ・記事数・ハンドルを反映した動的OG画像が配信される | ✓ VERIFIED | member opengraph-image.tsx: 1200x630 / image/png、`buildOgGrassStrip` で草グリッド、`articleCount` 表示、`@handle` 表示、#FF6719。データは getMembers + getArticles（安価）のみ。build に動的ルート `/member/[publicationId]/opengraph-image-ksanrz` 出現 |
| 4 | top / daily を共有するとブランド統一デフォルトOG画像が配信される | ✓ VERIFIED | src/app/opengraph-image.tsx: 1200x630 / image/png、"Keep Substack" + タグライン + 草装飾、#FF6719。build に静的ルート `/opengraph-image` 出現 |
| 5 | OG画像データ整形・タイトル/説明文生成が純関数として単体テストされている | ✓ VERIFIED | ogMeta.ts（buildMemberMetaTitle/Description, TOP_META, DAILY_META）+ ogImageData.ts（buildOgGrassStrip, OG_GRASS_WEEKS）。__tests__ に両テスト存在、計19テスト（境界・空name・count=0・範囲外/未来日 等を網羅） |
| 6 | npm test と npm run build が opengraph-image ルートを含めて通る | ✓ VERIFIED | `npx vitest run` → 228 passed / 28 files。`npm run build` → Compiled successfully + TypeScript green。opengraph-image ルート 2 本が build 出力に出現 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/ogMeta.ts` | OG title/description 純関数群 | ✓ VERIFIED | 4 exports（buildMemberMetaTitle/Description, TOP_META, DAILY_META）。空name/articleCount=0 のフォールバック実装あり |
| `src/lib/ogImageData.ts` | 草ストリップ整形純関数 | ✓ VERIFIED | buildOgGrassStrip + OG_GRASS_WEEKS=12。JST規約再利用、範囲外/未来日除外 |
| `src/app/(main)/member/[publicationId]/opengraph-image.tsx` | メンバー専用 1200x630 動的OG | ✓ VERIFIED | size/contentType/alt + default async export。flexbox inline style。草/記事数/handle/#FF6719 |
| `src/app/opengraph-image.tsx` | サイト共通ブランドデフォルト | ✓ VERIFIED | 1200x630 image/png、#FF6719、草装飾 |
| `src/app/layout.tsx` | metadataBase + twitter デフォルト | ✓ VERIFIED | keep-substack.com + summary_large_image + 既存 openGraph 維持 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| member/opengraph-image.tsx | ogImageData.ts | buildOgGrassStrip(items) | ✓ WIRED | import + 呼び出し（`strip = buildOgGrassStrip(items, OG_GRASS_WEEKS)`）→ columns グリッド描画 |
| member/page.tsx | ogMeta.ts | generateMetadata が buildMemberMeta* を呼ぶ | ✓ WIRED | import + generateMetadata 内で buildMemberMetaTitle/Description 呼び出し → openGraph に格納 |
| member/opengraph-image.tsx | articles.ts | getArticles（安価クエリのみ） | ✓ WIRED | import + 呼び出し。articles.ts は Supabase 単一テーブルクエリのみ（RSS/fetchAllFeedsCached 不使用）→ T-39-03 mitigate 確認 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| member/opengraph-image.tsx | items / articleCount | getArticles(publicationId)（Supabase articles テーブル） | Yes（実DBクエリ。member未一致時のみ空フォールバック=意図的） | ✓ FLOWING |
| member/page.tsx generateMetadata | member.name / articleCount | getMembers + getArticles | Yes（実DBクエリ） | ✓ FLOWING |
| opengraph-image.tsx (site) | 静的ブランドカード | — | N/A（デザイン定数。動的データ不要） | ✓ N/A |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| 純関数テスト全通過 | `npx vitest run` | 228 passed / 28 files | ✓ PASS |
| 本番ビルド成功 | `npm run build` | Compiled successfully + TypeScript green | ✓ PASS |
| OG画像ルート生成 | build route 出力確認 | `/member/[publicationId]/opengraph-image-ksanrz`（動的）+ `/opengraph-image`（静的）両方出現 | ✓ PASS |
| 実リンクプレビュー描画 | リンクデバッガ | — | ? SKIP（human-UAT へ） |

### Probe Execution

該当なし（migration/CLI/probe フェーズではない。UI/メタデータフェーズ）。

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| OGP-01 | 39-PLAN | og:title/description/image/url + twitter summary_large_image、JPタイトル、metadataBase=keep-substack.com、サイトデフォルト | ✓ SATISFIED | layout.tsx + 3ルートの metadata/generateMetadata。Truths 1,2 |
| OGP-02 | 39-PLAN | ImageResponse 動的OG、MEMBER が草/記事数/handle、top/daily ブランドデフォルト、1200x630、#FF6719 | ✓ SATISFIED | member + site opengraph-image.tsx。Truths 3,4。実描画は human-UAT |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| member/page.tsx | 32 | `return {}`（generateMetadata） | ℹ️ Info | member 未一致時の意図的な安全フォールバック。notFound は page 本体に委譲。スタブではない |
| member/opengraph-image.tsx | 35-36 | `articleCount = 0` / `items = []` 初期値 | ℹ️ Info | member 存在時に getArticles で上書き。未一致時のグレースフル劣化。スタブではない |

デバットマーカー（TBD/FIXME/XXX）は Phase 39 変更ファイルに無し。

### Human Verification Required

#### 1. リンクデバッガでのプレビュー認識（OGP-01）
**Test:** 本番/プレビューURL（top / daily / /member/[id]）を X Cards Validator・Facebook Sharing Debugger 等に貼る
**Expected:** summary_large_image のリッチカードが認識され、og:title/description/image が正しく表示される
**Why human:** 外部リンクデバッガによる実プレビュー描画はコードベースだけでは検証不可

#### 2. メンバーOG画像の内容（OGP-02 最優先）
**Test:** /member/[id] のOG画像を実描画させ、草ストリップ・記事数・@handle が見えるか確認
**Expected:** 対象メンバー固有の草グリッド・記事数・ハンドルが画像に表示される
**Why human:** ImageResponse のピクセル描画結果（見た目）はプログラム検証不可

#### 3. 日本語グリフ描画可否
**Test:** OG画像内の name（日本語）の実描画を確認
**Expected:** JPフォント未バンドルのため出ない可能性あり。出なくても latin handle + 数値 + 草でレイアウト成立
**Why human:** JPグリフ描画は runtime のフォント有無依存。意図的な best-effort（key-decision 記録済み）

### Gaps Summary

ギャップなし。OGP-01 / OGP-02 の全 must-have truth（6/6）がコードベースで検証された。純関数は vitest 19 テスト（全体 228 passed）、build 成功、opengraph-image ルート 2 本が生成出力に出現。メンバーOG画像はメンバー固有データ（getMembers + getArticles の安価クエリ）を Level 4 まで追跡してデータ流通を確認。RSS 不使用（T-39-03 mitigate）も実コードで確認。

残るのは視覚的リンクプレビュー描画（外部デバッガ）と JPグリフ描画の human-UAT のみで、これらは本フェーズの性質上プログラム検証不可な期待された項目。コードベースは OGP-01/OGP-02 を満たしているため status: passed（human_verification 項目は本質的に視覚検証で、コード achievability を妨げない）。

---

_Verified: 2026-06-14T01:42:00Z_
_Verifier: Claude (gsd-verifier)_
