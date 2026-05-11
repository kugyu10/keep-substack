# Phase 7: UI小改善バッチ（Tooltip・ナビ・フッター） - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

フロントエンドのみで完結する小さなUX改善5件を一括適用する。
変更対象ファイルは `src/components/HeatmapTooltip.tsx`（TOOLTIP-01+02）、`src/app/member/[substackId]/page.tsx`（NAV-01+02）、`src/app/layout.tsx`（FOOTER-01）の3ファイル。バックエンド・API変更なし。

</domain>

<decisions>
## Implementation Decisions

### Tooltip記事カードの構造（TOOLTIP-01+02）
- **D-01:** 画像+タイトルを1つの `<a>` ブロックにまとめるカード型リンクにする — `<img>` と タイトルテキストを同一 `<a>` 内に配置し、どこをクリックしても記事に遷移する
- **D-02:** 記事間スペースは `mb-3`（現在の `mb-1` から拡大）— タイトルと画像のペアが明確に区切られ視認しやすくなる
- **D-03:** リンクには既存の `withUtm()` 関数を引き続き使用する

### ナビゲーション（NAV-01+02） — Claude判断
- **D-04:** 戻りリンクのラベルは「← メンバー一覧」固定（要件通り）
- **D-05:** 戻りリンクのURLはメンバーの `teamId` が空でなければ `/?team=${teamId}`、空（未所属）なら `/`（要件通り）
- **D-06:** `teamId` は既存の `memberResult.member.teamId` から取得（追加のデータフェッチ不要）

### フッター（FOOTER-01）
- **D-07:** `src/app/layout.tsx` に共通フッターとして追加 — 全ページに自動適用される
- **D-08:** シンプルな1行テキストリンクのみ — ボーダーなし、`py-4 text-center`、`text-xs text-gray-400 hover:text-gray-600` スタイル
- **D-09:** リンクテキスト「コミュニティに参加する」、リンク先 `https://uojun.substack.com/p/5d4`、`target="_blank" rel="noopener noreferrer"`

### Claude's Discretion
- Tailwind CSSクラスの微調整（hover効果、padding等）はClaude判断でOK
- フッターリンクの `utm_source` パラメータ付与はClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — TOOLTIP-01, TOOLTIP-02, NAV-01, NAV-02, FOOTER-01 の詳細要件
- `.planning/ROADMAP.md` — Phase 7のSuccess Criteria（5項目）

### 変更対象ファイル
- `src/components/HeatmapTooltip.tsx` — Tooltip実装（TOOLTIP-01+02変更対象）。現在: 画像はリンクなし、タイトルのみ `<a>`、記事間 `mb-1`
- `src/app/member/[substackId]/page.tsx` — メンバー詳細ページ（NAV-01+02変更対象）。現在: `href="/"` + 「← ダッシュボードに戻る」
- `src/app/layout.tsx` — 共通レイアウト（FOOTER-01変更対象）。現在: フッターなし

### 参照パターン
- `src/lib/types.ts` — `Member` 型 `{ name, substackId, teamId, addedAt }`（NAV-02でteamId参照）
- `.planning/PROJECT.md` — コアバリュー、制約（Next.js App Router + Tailwind CSS）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `withUtm(url)` in `HeatmapTooltip.tsx` — UTMパラメータ付与関数。画像リンクにも同じ関数を使用する
- `memberResult.member.teamId` in `member/[substackId]/page.tsx` — すでに取得済みのteamId。NAV-02のURL生成に使用可能

### Established Patterns
- **Tailwind CSS** — 全コンポーネントのスタイリング
- **`<Link>` from next/link** — 内部ナビゲーション（戻りリンクに使用中）
- **Server Component** — `member/[substackId]/page.tsx` はServer Component。Client Componentへの変換不要

### Integration Points
- `HeatmapTooltip.tsx`: `<li>` 内の `<img>` + `<a>` 構造 → 一体型 `<a>` ブロックに変更。`withUtm()` は画像にも適用
- `member/[substackId]/page.tsx`: `href="/"` → `href={memberResult.member.teamId ? \`/?team=${memberResult.member.teamId}\` : '/'}` に変更、テキスト変更
- `layout.tsx`: `<body>` 内に `<main>{children}</main>` + `<footer>` を追加（またはchildrenの後にfooterを挿入）

</code_context>

<specifics>
## Specific Ideas

- フッターのプレビュー（ユーザー承認済み）:
  ```tsx
  <footer className="py-4 text-center">
    <a
      href="https://uojun.substack.com/p/5d4"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-gray-400 hover:text-gray-600"
    >
      コミュニティに参加する
    </a>
  </footer>
  ```

- Tooltip記事カードのプレビュー（ユーザー承認済み構造）:
  ```tsx
  <a href={withUtm(article.link ?? '#')} target="_blank" rel="noopener noreferrer">
    <img src={article.thumbnail} alt="" className="..." />
    <span className="text-xs text-blue-600 hover:underline break-words block">
      {article.title}
    </span>
  </a>
  ```

</specifics>

<deferred>
## Deferred Ideas

None — 議論はフェーズスコープ内に収まった。

</deferred>

---

*Phase: 7-UI小改善バッチ（Tooltip・ナビ・フッター）*
*Context gathered: 2026-05-11*
