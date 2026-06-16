---
phase: 39-og-og
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/layout.tsx
  - src/lib/ogMeta.ts
  - src/lib/__tests__/ogMeta.test.ts
  - src/lib/ogImageData.ts
  - src/lib/__tests__/ogImageData.test.ts
  - src/app/(main)/page.tsx
  - src/app/(main)/daily/page.tsx
  - src/app/(main)/member/[publicationId]/page.tsx
  - src/app/opengraph-image.tsx
  - src/app/(main)/member/[publicationId]/opengraph-image.tsx
autonomous: true
requirements: [OGP-01, OGP-02]

must_haves:
  truths:
    - "共有対象ルート（top / daily / member）に og:title / og:description / og:image / twitter card メタタグが出力される"
    - "ルートメタデータの metadataBase が https://keep-substack.com になっている（絶対URLが正しい本番ドメインを指す）"
    - "/member/[publicationId] を共有すると、そのメンバー固有の草ストリップ・記事数・ハンドルを反映した動的OG画像が og:image として配信される"
    - "top / daily を共有すると、ブランド統一されたデフォルト動的OG画像が og:image として配信される"
    - "OG画像のデータ整形・タイトル/説明文生成が純関数として単体テストされている"
    - "npm test と npm run build が opengraph-image ルートを含めて通る"
  artifacts:
    - path: "src/lib/ogMeta.ts"
      provides: "ルート別 OG title/description 文字列を生成する純関数群"
      exports: ["buildMemberMetaTitle", "buildMemberMetaDescription", "TOP_META", "DAILY_META"]
    - path: "src/lib/ogImageData.ts"
      provides: "記事 isoDate から OG画像用の草ストリップ・記事数を整形する純関数"
      exports: ["buildOgGrassStrip", "OG_GRASS_WEEKS"]
    - path: "src/app/(main)/member/[publicationId]/opengraph-image.tsx"
      provides: "メンバー専用 1200x630 動的OG画像（草 + 記事数 + ハンドル + #FF6719）"
    - path: "src/app/opengraph-image.tsx"
      provides: "サイト共通ブランドデフォルト 1200x630 OG画像（top/daily フォールバック）"
    - path: "src/app/layout.tsx"
      provides: "修正済みルートメタデータ（metadataBase + twitter card デフォルト）"
      contains: "keep-substack.com"
  key_links:
    - from: "src/app/(main)/member/[publicationId]/opengraph-image.tsx"
      to: "src/lib/ogImageData.ts"
      via: "buildOgGrassStrip(items)"
      pattern: "buildOgGrassStrip"
    - from: "src/app/(main)/member/[publicationId]/page.tsx"
      to: "src/lib/ogMeta.ts"
      via: "generateMetadata が buildMemberMetaTitle/Description を呼ぶ"
      pattern: "buildMemberMeta"
    - from: "src/app/(main)/member/[publicationId]/opengraph-image.tsx"
      to: "src/lib/articles.ts"
      via: "getArticles(publicationId)（安価な Supabase クエリのみ）"
      pattern: "getArticles"
---

<objective>
共有された公開URL（top / daily / member）を Substack Notes / SNS に貼ったときに、草・実績が見えるリッチなリンクプレビューを出す。OGメタタグ（OGP-01）と Next.js `ImageResponse` による動的OG画像（OGP-02）を追加する。メンバールートのOG画像が最優先。

Purpose: 共有体験の総仕上げ。リンクを貼るだけで「継続記録の自慢」が視覚的に伝わり、誘引につながる。
Output: 修正済みルートメタデータ、純関数ヘルパ（テスト付き）、各ルートの `generateMetadata`、メンバー専用 + サイト共通の動的OG画像。
</objective>

<execution_context>
@/Users/kugyu10/work/keep-substack/.claude/get-shit-done/workflows/execute-plan.md
@/Users/kugyu10/work/keep-substack/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/39-og-og/39-RESEARCH.md
@.planning/phases/39-og-og/39-CONTEXT.md

<interfaces>
<!-- 既存コードから抽出。executor はこれらを直接使う（コードベース探索不要）。 -->

From src/lib/types.ts:
```typescript
export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string
  thumbnail?: string
}
export type Member = {
  id: string
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string
  substackHandle?: string | null
  hasUser: boolean
}
```

From src/lib/members.ts:
```typescript
export async function getMembers(): Promise<Member[]>
// 安価: 1 Supabase クエリ + join。id/name/publicationId/teams/substackHandle を返す。
```

From src/lib/articles.ts:
```typescript
type StoredFeed = { items: FeedItem[]; imageUrl?: string }
export async function getArticles(publicationId: string): Promise<StoredFeed>
// 安価: articles テーブルのみ。items[].isoDate（= pub_date）/ items[].thumbnail / imageUrl。
// 注意: RSS を引く fetchAllFeedsCached（5s timeout, 高価）は OG画像で使わない。
```

From src/lib/heatmapUtils.ts:
```typescript
export function getRecentDays(weekOffset?: number): string[]  // 直近7日のJST日付キー配列（"YYYY-MM-DD"）
export function buildHeatmapArticleMap(items: FeedItem[]): Map<string, HeatmapArticle[]>
```

From src/lib/calendarUtils.ts:
```typescript
export function isoToJSTDateKey(isoDate: string): string | null  // ISO → "YYYY-MM-DD"（JST）
```

From src/lib/shareUrl.ts:
```typescript
export function buildShareUrl(view: ShareView): string  // 相対URL
export function parseYmParam(ym?: string | null): { year: number; month: number }
export function formatYmParam(year: number, month: number): string
// member route: /member/{encodeURIComponent(publicationId)}（+?ym=YYYY-MM）
```

Current src/app/layout.tsx metadata（修正対象）:
```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://keep-substack.vercel.app'), // → keep-substack.com に修正
  title: 'Keep Substack',
  description: 'Substackコミュニティメンバーの記事更新を確認するツール',
  openGraph: { title, description, images: ['/keep-substack-kv.png'] },
  // twitter なし → 追加
}
```

Member page signature（src/app/(main)/member/[publicationId]/page.tsx）:
```typescript
export default async function MemberPage({
  params,        // Promise<{ publicationId: string }>
  searchParams,  // Promise<{ ym?: string }>
})
```
ブランド: `--color-primary: #FF6719`（globals.css）。日本語ローカルフォントなし。
既存 ImageResponse / opengraph-image の使用なし。
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: OGメタ文字列・草ストリップ整形を純関数として切り出し + 単体テスト</name>
  <files>src/lib/ogMeta.ts, src/lib/__tests__/ogMeta.test.ts, src/lib/ogImageData.ts, src/lib/__tests__/ogImageData.test.ts</files>
  <behavior>
    src/lib/ogMeta.ts:
    - `buildMemberMetaTitle(name: string): string` → `'{name}のSubstack継続記録 📈'`。name が空文字/undefined のときは 'Substack継続記録 📈' のような安全なデフォルト。
    - `buildMemberMetaDescription(name: string, articleCount: number): string` → 自慢/誘引文（例: `'{name}さんのSubstack継続の記録。これまで{articleCount}本を公開。草の記録を見にいく。'`）。articleCount=0 のときも破綻しない文面。
    - `TOP_META: { title: string; description: string }` / `DAILY_META: { title: string; description: string }` → top/daily 用 JP 自慢/誘引コピー定数。
    - Test: 既知 name で期待文字列、空 name フォールバック、articleCount=0/複数 の説明文。
    src/lib/ogImageData.ts:
    - `OG_GRASS_WEEKS: number`（直近何週ぶんを描くか。例 12）。
    - `buildOgGrassStrip(items: FeedItem[], weeks?: number): { dateKey: string; count: number }[]`
      → 直近 weeks×7 日ぶんの日付配列（古い→新しい順）について、各日の記事数を集計して返す。isoDate を isoToJSTDateKey で JST 日付キーに正規化して数える（buildHeatmapArticleMap と同じ JST 規約）。記事のない日は count:0。
    - Test: isoDate を持つ items から特定日が count:1/2 になること、isoDate 無し item を無視すること、配列長が weeks×7 であること、未来日や範囲外日が除外されること。
  </behavior>
  <action>
    ImageResponse 内ではピクセル検証ができないため、OG画像の「数値・草データの集計」と「メタ文字列生成」をすべて純関数へ分離する。日付計算は getRecentDays / isoToJSTDateKey と同一の JST 規約（Date.now()+9h の UTC 値）に揃え、独自の日付計算を新規に作らない。これらは Task 2/3 が import する契約（interface-first）。description の articleCount はメンバーOG画像/メタの両方で使うため、記事数のカウント自体も ogImageData 側のヘルパ（例 `items.length` をそのまま使う場合は呼び出し側で）を一貫させる。実装は既存 src/lib/__tests__/shareUrl.test.ts のスタイル（describe/it/expect、日本語 it 文）に合わせる。
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/ogMeta.test.ts src/lib/__tests__/ogImageData.test.ts</automated>
  </verify>
  <done>ogMeta.ts と ogImageData.ts が純関数をエクスポートし、両テストファイルが green。新規日付計算ロジックは導入せず既存 JST 規約を再利用している。</done>
</task>

<task type="auto">
  <name>Task 2: ルートメタデータ修正 + 各共有ルートに generateMetadata / metadata</name>
  <files>src/app/layout.tsx, src/app/(main)/page.tsx, src/app/(main)/daily/page.tsx, src/app/(main)/member/[publicationId]/page.tsx</files>
  <action>
    OGP-01 を満たす。
    1) src/app/layout.tsx: `metadataBase` を `new URL('https://keep-substack.com')` に修正（旧 vercel.app を除去）。`twitter: { card: 'summary_large_image', title, description }` を追加。既存のサイトデフォルト openGraph（title/description/images: ['/keep-substack-kv.png']）は維持。
    2) src/app/(main)/page.tsx（top）: static `export const metadata: Metadata` を追加。`TOP_META`（ogMeta.ts）から title/description を流用し、openGraph.title/description と openGraph.url（canonical, '/'）を設定。og:image は同階層/ルートの opengraph-image が自動注入するので images は手書きしない。
    3) src/app/(main)/daily/page.tsx: 同様に `DAILY_META` で metadata を設定、openGraph.url は '/daily'。
    4) src/app/(main)/member/[publicationId]/page.tsx: `export async function generateMetadata({ params }: { params: Promise<{ publicationId: string }> }): Promise<Metadata>` を追加。getMembers() で publicationId に一致する name を引き（getArticles で記事数も取得し description に渡す。安価なクエリのみ、fetchAllFeedsCached は使わない）、`buildMemberMetaTitle(name)` / `buildMemberMetaDescription(name, count)` を使用。openGraph.url は buildShareUrl({type:'member', publicationId}) ベースの canonical。twitter.card は root の summary_large_image を継承するため個別指定は任意。member が存在しない場合はサイトデフォルトに準じた安全な metadata を返す（generateMetadata 内で notFound は呼ばない。page 本体側の notFound に委ねる）。既存のページ本体（fetchAllFeedsCached を使う描画）は変更しない。
    revalidate=300（ISR）は維持する。これらの実装は OGP-01（D-記録: metadataBase 修正・JP 自慢/誘引タイトル・twitter card）を満たす。
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json && grep -rl "keep-substack.com" src/app/layout.tsx</automated>
  </verify>
  <done>layout.tsx の metadataBase が keep-substack.com、twitter card あり。top/daily/member の各ルートが OG title/description/url を出力する metadata を持つ。型エラーなし。</done>
</task>

<task type="auto">
  <name>Task 3: 動的OG画像（メンバー専用 + サイト共通ブランドデフォルト）</name>
  <files>src/app/(main)/member/[publicationId]/opengraph-image.tsx, src/app/opengraph-image.tsx</files>
  <action>
    OGP-02 を満たす。Next.js `opengraph-image.tsx` 規約に従い、各ファイルで `export const size = { width: 1200, height: 630 }`、`export const contentType = 'image/png'`、`export const alt`、default `async function` で `new ImageResponse(<JSX>, { ...size })` を返す。`next/og` の `ImageResponse` を import する。
    1) src/app/(main)/member/[publicationId]/opengraph-image.tsx: default 関数で `{ params }: { params: Promise<{ publicationId: string }> }` を受ける。getMembers() + getArticles(publicationId) のみ取得（RSS フェッチ禁止）。`buildOgGrassStrip(items)`（ogImageData.ts）で直近週の草データを作り、count に応じた濃淡（0=薄グレー, 1=primary/70 相当, 2+=primary/赤系。getIntensityClass の色感に合わせるが ImageResponse は className 不可なので背景色を直接指定）の小さな四角を横ストリップ状に並べる。表示要素: メンバー name（日本語=best-effort）、substackHandle（latin で確実に出る）、総記事数（数値, 例 "42 articles" / "42本"）、ブランド英字 "Keep Substack"、アクセントカラー #FF6719。member が見つからない/記事ゼロでも破綻せず、草ゼロ＋ブランドデフォルト寄りの体裁で 1200x630 を返す。
    2) src/app/opengraph-image.tsx: サイト共通のブランドデフォルト OG画像。#FF6719 を主体にした clean なブランドカード（"Keep Substack" + タグライン latin）。top/daily はこの共通画像で OGP-02 を充足（KISS, 過剰実装回避）。
    日本語フォント方針: ImageResponse はデフォルトで日本語グリフを描画できない。latin（handle, "Keep Substack", タグライン）・数値・草ビジュアルを「確実に出る土台」としてレイアウトを設計し、日本語ラベル（name 等）は best-effort（出なくてもデザインが成立すること）。本タスクではフォント fetch は導入しない（build/edge 失敗リスク回避）。実描画の確認は human-UAT 項目（下記 verification）。
    runtime: ImageResponse は Node ランタイムでも動くため、安価な Supabase クエリ（getMembers/getArticles）を使うこの実装では `export const runtime` を edge 強制しない（デフォルト = nodejs のまま）。
  </action>
  <verify>
    <automated>npm run build 2>&1 | tee /tmp/og-build.log; grep -E "opengraph-image" /tmp/og-build.log; grep -L -E "Failed to compile|Type error" /tmp/og-build.log</automated>
  </verify>
  <done>2つの opengraph-image.tsx が存在し、size 1200x630 / contentType image/png をエクスポート。npm run build が opengraph-image ルートを含めて成功（compile/type error なし）。メンバー画像は getArticles の安価データのみ使用。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 未ログイン訪問者 → /member/[publicationId] route params | publicationId は外部入力。OG画像/メタ生成に渡る |
| ビルド/サーバ → Supabase（getMembers/getArticles） | 読み取りクエリのみ |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-01 | Tampering/Injection | member opengraph-image / generateMetadata の publicationId | mitigate | publicationId は Supabase クエリの `.eq()` パラメータとして渡す（文字列等値, SQLi 不可）。OG画像内のテキスト描画は JSX 経由でエスケープされる。未一致時は notFound 相当の安全なデフォルトを返す |
| T-39-02 | Information Disclosure | OG画像に出る記事数/草 | accept | 既に公開ページで見える情報のみ。PII なし。低リスク |
| T-39-03 | Denial of Service | OG画像生成の重いデータ取得 | mitigate | fetchAllFeedsCached（RSS, 5s timeout）を禁止し getArticles の単一安価クエリに限定。ISR revalidate=300 でキャッシュ |
| T-39-SC | Tampering | npm/pip/cargo installs | mitigate | 新規パッケージ導入なし（next/og は Next.js 16 同梱）。install タスクなし → slopcheck 不要 |
</threat_model>

<verification>
- `npx vitest run src/lib/__tests__/ogMeta.test.ts src/lib/__tests__/ogImageData.test.ts` green（純関数）。
- `npx vitest run` 全体が green（既存テストを壊していない）。
- `npm run build` が opengraph-image ルートを含めて成功。
- `npx tsc --noEmit` 型エラーなし。
- [HUMAN-UAT] 本番/プレビューURLを Substack Notes・X(Twitter)・Facebook 等のリンクデバッガ（例 https://cards-dev.twitter.com/validator, https://developers.facebook.com/tools/debug/）に貼り、(a) カードが summary_large_image で認識されること、(b) /member の画像に草・記事数・ハンドルが見えること、(c) 日本語ラベルの描画可否（出ない場合でもデザインが成立していること）を確認する。日本語グリフの実描画はこの human-UAT でのみ最終判定する。
</verification>

<success_criteria>
OGP-01:
- [ ] top / daily / member に og:title / og:description / og:image / twitter:card（summary_large_image）が出力される
- [ ] metadataBase が https://keep-substack.com（絶対URLが本番ドメインを指す）
- [ ] member のタイトルが「{name}のSubstack継続記録 📈」、JP 自慢/誘引 description、canonical openGraph.url を持つ
- [ ] top/daily に JP 自慢/誘引コピーのデフォルト OG メタがある

OGP-02:
- [ ] /member/[publicationId] に動的OG画像（ImageResponse, 1200x630, #FF6719）が生成され、対象メンバーの草ストリップ・記事数・ハンドルを反映する
- [ ] top/daily は強いブランド統一のサイト共通デフォルトOG画像（1200x630, #FF6719）で配信される
- [ ] OG画像のデータ整形・メタ文字列が純関数として単体テストされている（ImageResponse のピクセルは検証不可のため）
- [ ] メンバーOG画像は安価な getArticles のみ使用し RSS フェッチを回避

共通:
- [ ] npm test green / npm run build 成功（opengraph-image 含む）
</success_criteria>

<notes>
## グレーゾーン決定の記録（best judgment / KISS / 既存規約準拠）

1. **データ取得**: メンバーOG画像・メタは `getMembers()` + `getArticles(publicationId)` の安価な Supabase クエリのみを使い、`fetchAllFeedsCached`（RSS HTTP, 5s timeout）を回避する。記事公開日（isoDate）から草を描き、`items.length` を実績数値とする。理由: build/ISR/edge での生成を軽量・確実にするため（T-39-03）。streak（consecutiveWeekStreak）は commit slots が必要で OG画像の主軸にはコストが見合わないため採用しない。草＋総記事数を主軸とする。

2. **日本語フォント**: ImageResponse はデフォルトで日本語グリフを描画できない。latin（substackHandle, "Keep Substack", タグライン）・数値・草ビジュアルを「確実にレンダリングされる土台」としてデザインし、日本語ラベル（メンバー name 等）は best-effort（出なくてもデザインが成立）。フォント fetch（Noto Sans JP subset）は build/edge での失敗リスクがあるため本フェーズでは導入しない。日本語グリフの実描画可否はリンクデバッガでの **human-UAT** 項目とする。

3. **top/daily のOG画像**: KISS により、サイト共通ブランドデフォルト `src/app/opengraph-image.tsx` で top/daily を充足する（ルート個別の opengraph-image は作らない）。成功基準（OGP-02 のブランドデフォルト）を満たしつつ過剰実装を避ける。

4. **metadataBase 修正**: 旧 `keep-substack.vercel.app` → 本番ドメイン `https://keep-substack.com`。OG画像/canonical の絶対URLが正しい本番ドメインを指すために必須。

5. **テスト戦略**: ImageResponse はピクセル検証不可のため、草ストリップ集計（buildOgGrassStrip）とメタ文字列生成（ogMeta）を純関数に切り出して vitest で検証する。OG画像レンダ自体は npm run build の通過（型/runtime）＋ human-UAT で担保する。

6. **runtime**: 安価な Supabase クエリで生成するため edge ランタイムを強制せず Next.js デフォルト（nodejs）のまま。
</notes>

<output>
Create `.planning/phases/39-og-og/39-01-SUMMARY.md` when done
</output>
