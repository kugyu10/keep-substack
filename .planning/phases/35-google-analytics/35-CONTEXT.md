# Phase 35: チーム可視性拡張 + Google Analytics - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

トップビューのチームタブに private チームを追加（`page.tsx` の1行変更）し、GA4 を全ページに導入する（`layout.tsx` に `GoogleAnalytics` コンポーネント追加）。

**スコープ in:**
- `page.tsx` の teams 計算: `t.status === 'public'` → `t.status !== 'hidden'` に変更（private チームをタブに表示）
- `layout.tsx` に `<GoogleAnalytics>` を追加（`NEXT_PUBLIC_GA_MEASUREMENT_ID` 未設定時スキップ）
- Vercel 本番環境変数への `NEXT_PUBLIC_GA_MEASUREMENT_ID` 設定手順

**スコープ out:**
- private チームタブの視覚的区別（鍵アイコン等）— 追加しない
- All タブの filteredMembers フィルタ変更（現行: `status !== 'hidden'` のまま）
- `/my` ページの private チーム参加・退出制限（readonly のまま変更なし）
- NODE_ENV によるコード内 GA 無効化（env var ガードで代替）

</domain>

<decisions>
## Implementation Decisions

### TEAM-01: private チームをチームタブに表示

- **D-01:** `src/app/page.tsx` の teams 計算を変更。`flatMap` 内フィルタを `t.status === 'public'` から `t.status !== 'hidden'` に変更する（1行変更）。
- **D-02:** private チームのタブは public チームと同じ外観。鍵アイコン・異なるスタイル等は追加しない。
- **D-03:** All タブ（チーム未選択）の `filteredMembers` フィルタ (`m.teams.every((t) => t.status !== 'hidden')`) は変更なし。private チームのみに所属するメンバーは現行コードですでに All タブに表示される。
- **D-04:** `/my` ページの private チーム参加・退出制限（readonly 表示）は変更なし。

### ANLT-01/02: Google Analytics 導入

- **D-05:** `@next/third-parties` は v16.2.7 がインストール済み。追加パッケージは不要。
- **D-06:** `src/app/layout.tsx` に `GoogleAnalytics` コンポーネントを追加。`NEXT_PUBLIC_GA_MEASUREMENT_ID` 環境変数が設定されている場合のみレンダリングする。
- **D-07:** 実装パターン: `{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />}`
- **D-08:** `.env.local` に `NEXT_PUBLIC_GA_MEASUREMENT_ID` を設定しない → ローカル開発環境では GA スクリプトが自動的に読み込まれない。
- **D-09:** Vercel の本番環境変数に `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` を設定する（ユーザーが ID を直接設定）。
- **D-10:** `NODE_ENV` によるコード内チェックは不要。env var の有無だけで dev/prod の切り替えを制御する。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル
- `src/app/page.tsx` — teams 計算の1行変更（D-01）
- `src/app/layout.tsx` — GoogleAnalytics コンポーネント追加（D-06/D-07）

### 変更なし確認
- `src/app/(auth)/layout.tsx` — 認証ページ専用レイアウト。GA は不要（全ページの定義は root layout）
- `src/app/my/page.tsx` — private チーム readonly 制限は変更なし（D-04）

### 要件定義
- `.planning/REQUIREMENTS.md` — TEAM-01, ANLT-01, ANLT-02

### 参考: @next/third-parties GoogleAnalytics API
- `import { GoogleAnalytics } from '@next/third-parties/google'`
- `<GoogleAnalytics gaId="G-XXXXXXXXXX" />`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@next/third-parties@16.2.7` — インストール済み。`from '@next/third-parties/google'` で import 可能
- `src/app/layout.tsx` — `<Header />` と `<Footer />` を既にラップ。`<GoogleAnalytics>` を `<body>` 内の末尾に追加するだけでよい

### Established Patterns
- `NEXT_PUBLIC_*` 環境変数: ビルド時インライン化。Vercel の環境変数設定で prod のみ有効化するパターン確立済み
- `page.tsx` の teams フィルタ: `flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))` — 1行変更のみで対応可能

### Integration Points
- `src/app/layout.tsx` ↔ `GoogleAnalytics`: root layout に追加することで全ページに自動適用（/daily, /member/*, /my, /admin 等すべて）
- `src/app/page.tsx` の teams 配列 ↔ チームタブ: teams に private チーム名が含まれると即時タブに反映

</code_context>

<specifics>
## Specific Ideas

- GA Measurement ID は `G-XXXXXXXXXX` 形式（ユーザーが Vercel 環境変数に直接設定）
- private チームタブの表示順: `page.tsx` の teams は `Set` → spread でユニーク化しているため、DB 返却順を維持

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-google-analytics*
*Context gathered: 2026-06-08*
