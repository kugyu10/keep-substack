---
phase: 39-og-og
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/lib/ogMeta.ts
  - src/lib/ogImageData.ts
  - src/lib/__tests__/ogMeta.test.ts
  - src/lib/__tests__/ogImageData.test.ts
  - src/app/opengraph-image.tsx
  - src/app/(main)/member/[publicationId]/opengraph-image.tsx
  - src/app/layout.tsx
  - src/app/(main)/page.tsx
  - src/app/(main)/daily/page.tsx
  - src/app/(main)/member/[publicationId]/page.tsx
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 39 (OGP-01 メタタグ + OGP-02 動的OG画像) のレビュー。セキュリティ面の主要懸念（外部入力 publicationId の扱い T-39-01、RSS フェッチ禁止 T-39-03、injection）はおおむね適切に処理されている：`publicationId` は Supabase の `.eq()` 経由（パラメータ化）で渡され、JSX に出力されるテキストは next/og がエスケープし、生成物は PNG のため XSS/インジェクション経路は成立しない。`opengraph-image.tsx` と `generateMetadata` は安価な `getMembers()`+`getArticles()` のみを使用し、`fetchAllFeedsCached`/RSS を呼ばない（T-39-03 充足）。メタ文字列生成は純関数化され vitest で検証されている。

**Critical はなし。** ただし、(1) 草グリッドが曜日に整列しない表示バグ、(2) OG画像ルートにキャッシュ指示がなく存在しない publicationId でも毎回フルテーブルスキャン＋画像生成が走る増幅リスク、(3) 不要な `as never` キャスト、(4) generateMetadata と page 本体のメンバー判定の不整合、を Warning として挙げる。

## Warnings

### WR-01: 草グリッドが曜日に整列しない（縦=曜日が成立しない表示バグ）

**File:** `src/app/(main)/member/[publicationId]/opengraph-image.tsx:47-52`
**Issue:** コメントは「草を 7行（曜日）×週 のグリッドに並べる（縦=曜日, 横=週）」と宣言しているが、`buildOgGrassStrip` が返す配列は単に「84日前→今日」の連続日付であり、週境界（日曜/月曜）に整列していない。`strip.slice(w*7, w*7+7)` で7日ずつ機械的に切るため、各行 `ri` が表す曜日は列ごとにバラバラになり、本物のヒートマップ（`getRecentDays` も曜日整列しないが個人カレンダーは `buildDayGrid` で曜日整列している）と視覚規約が一致しない。クラッシュはしないが「縦=曜日」という設計意図は満たされていない。
**Fix:** 設計意図どおりにするなら、先頭を直近の週初め（例: 日曜）までパディングして整列させるか、コメントの「縦=曜日」主張を削除して「単なる12週×7日のストリップ」に正直に書き換える。後者で十分なら：
```tsx
// 草を 7行 × 12列のストリップに並べる（曜日整列はしない／装飾目的）。
```

### WR-02: OG画像ルートにキャッシュ指示がなく、存在しない publicationId で増幅リスク

**File:** `src/app/(main)/member/[publicationId]/opengraph-image.tsx:24-41`
**Issue:** このルートには `export const revalidate` 等のキャッシュ指示がない（同階層の `page.tsx` は `revalidate = 300`）。外部入力の publicationId は任意であり、`/member/<任意文字列>/opengraph-image` を叩くたびに `getMembers()`（members フルテーブル取得）が実行される。member 未一致でも `return` で早期終了せず ImageResponse（1200x630 PNG 合成）まで到達するため、存在しないメンバー名でも毎回 1 クエリ + 画像レンダリングが走る。攻撃者がランダムな publicationId を連打すると安価とはいえ増幅しうる（軽度 DoS 表面）。
**Fix:** ルートにキャッシュ指示を付与し、member 未一致時はブランドデフォルト画像へ早期 return する：
```tsx
export const revalidate = 300
// ...
if (!member) {
  // 共通ブランド画像にフォールバック（getArticles も呼ばない、毎回の合成も回避）
  return new ImageResponse(/* 既存の共通デフォルト相当 */, { ...size })
}
```

### WR-03: 不要かつ危険な `as never` キャストが型チェックを無効化

**File:** `src/app/(main)/member/[publicationId]/opengraph-image.tsx:36,43`
**Issue:** `items` は `{ isoDate?: string }[]` で宣言され、`buildOgGrassStrip(items as never, ...)` で `never` にキャストして渡している。`buildOgGrassStrip` の引数は `FeedItem[]`。`getArticles` の返す `items` は `FeedItem[]` なので、`items` 変数を最初から `FeedItem[]` として宣言すればキャスト自体が不要。`as never` は最も緩いキャストで、将来 `buildOgGrassStrip` のシグネチャが変わっても型エラーが出なくなり、実バグを隠す。
**Fix:**
```tsx
import type { FeedItem } from '@/lib/types'
// ...
let items: FeedItem[] = []
// ...
const strip = buildOgGrassStrip(items, OG_GRASS_WEEKS) // キャスト不要
```

### WR-04: generateMetadata と page 本体でメンバー判定ロジックが分岐し不整合になりうる

**File:** `src/app/(main)/member/[publicationId]/page.tsx:26-32, 71-77`
**Issue:** `generateMetadata` は `getMembers()` 由来の `member` の有無で判定し、未一致なら `{}`（=サイトデフォルト metadata）を返す。一方 page 本体は `fetchAllFeedsCached(members)` の結果 `memberResult` の有無で判定し、未一致なら `notFound()`。両者は別のデータソース・別の判定を使うため、members には存在するが RSS フェッチ結果に現れない（フェッチ失敗等）ケースで「実在メンバー向けの OG メタを返すのに本文は 404」という不整合が起こりうる。逆に member 未一致時に metadata が空でも opengraph-image.tsx は画像を生成し続ける（WR-02）。
**Fix:** メンバー存在判定は単一ソース（`getMembers()` の `member` 有無）に統一し、page 本体でも `getMembers` ベースで先に存在チェックして `notFound()` する。`fetchAllFeedsCached` はカレンダー描画データの取得にのみ用いる。

## Info

### IN-01: テストの jstTodayIso がコメントと実装で乖離（境界フレーキー懸念）

**File:** `src/lib/__tests__/ogImageData.test.ts:6-11`
**Issue:** コメントは「正午JSTぶんを足すことで日付境界の揺れを避ける」とあるが、実装は `Date.now() - daysAgo*86400000` のみで正午オフセットを一切加えていない。JST 深夜帯（例: 00:00–09:00 JST 付近）に CI が走ると `jstTodayIso(0)`/`(1)` 系テストの日付キーが揺れてフレーキーになりうる。
**Fix:** コメントを実装に合わせて修正するか、固定時刻（vi.setSystemTime で JST 正午相当）を注入して境界依存を排除する。

### IN-02: grassColor の閾値が getIntensityClass と微妙にずれている

**File:** `src/app/(main)/member/[publicationId]/opengraph-image.tsx:17-22`
**Issue:** `getIntensityClass`（heatmapUtils）は count=1→primary/70、count=2→primary、3+→red-500。`grassColor` は count<=0→EMPTY、1→rgba(...0.7)、2→PRIMARY、3+→#e5481f。色感は近いが定数が二重管理されており、片方の調整がもう片方に反映されない。コメントで「getIntensityClass の色感に合わせる」と謳う以上、ドリフトの温床。
**Fix:** 色定数/閾値を共有モジュール（例: lib の色マップ）に集約し、CSS クラスとインライン背景色の両方が同一ソースを参照するようにする。

### IN-03: member 未一致時に未エンコードの publicationId がそのまま画像テキストに使われる

**File:** `src/app/(main)/member/[publicationId]/opengraph-image.tsx:44`
**Issue:** `const handle = member?.substackHandle ?? publicationId` で、member 未一致時は外部入力 publicationId が `@{handle}` として画像に描画される。next/og がテキストエスケープするためインジェクションは成立しないが、存在しないメンバー向けに攻撃者文字列が描画された OG 画像が生成される（WR-02 の早期 return を入れれば自然に解消）。長大な文字列でもレイアウトは折り返さず溢れるだけでクラッシュはしない。
**Fix:** WR-02 の member 未一致フォールバックを入れれば本項も解消。

### IN-04: 共通 OG 画像の草装飾セルが key=index でロジック値を持たない

**File:** `src/app/opengraph-image.tsx:70-87`
**Issue:** 装飾用の 14 セルを `Array.from({length:14}).map((_, i) => ...)` で `key={i}` 生成。静的描画なので実害はないが、`i % 4` のパターンは見栄えのためのマジックナンバーで、意図がコメントされていない（「ブランドの視覚的記号」とはあるが配色ロジックの説明なし）。
**Fix:** 任意。配色配列を定数化して意図を明示すると保守性が上がる。

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
