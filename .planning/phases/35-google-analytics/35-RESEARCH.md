# Phase 35: チーム可視性拡張 + Google Analytics - Research

**Researched:** 2026-06-08
**Domain:** Next.js 16 RSC / @next/third-parties Google Analytics / React Server Component filtering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TEAM-01: private チームをチームタブに表示**
- D-01: `src/app/page.tsx` の teams 計算を変更。`flatMap` 内フィルタを `t.status === 'public'` から `t.status !== 'hidden'` に変更する（1行変更）。
- D-02: private チームのタブは public チームと同じ外観。鍵アイコン・異なるスタイル等は追加しない。
- D-03: All タブ（チーム未選択）の `filteredMembers` フィルタ (`m.teams.every((t) => t.status !== 'hidden')`) は変更なし。
- D-04: `/my` ページの private チーム参加・退出制限（readonly 表示）は変更なし。

**ANLT-01/02: Google Analytics 導入**
- D-05: `@next/third-parties` は v16.2.7 がインストール済み。追加パッケージは不要。
- D-06: `src/app/layout.tsx` に `GoogleAnalytics` コンポーネントを追加。`NEXT_PUBLIC_GA_MEASUREMENT_ID` 環境変数が設定されている場合のみレンダリングする。
- D-07: 実装パターン: `{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />}`
- D-08: `.env.local` に `NEXT_PUBLIC_GA_MEASUREMENT_ID` を設定しない → ローカル開発環境では GA スクリプトが自動的に読み込まれない。
- D-09: Vercel の本番環境変数に `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` を設定する（ユーザーが ID を直接設定）。
- D-10: `NODE_ENV` によるコード内チェックは不要。env var の有無だけで dev/prod の切り替えを制御する。

### Claude's Discretion

None — all implementation decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- private チームタブの視覚的区別（鍵アイコン等）
- All タブの filteredMembers フィルタ変更
- `/my` ページの private チーム参加・退出制限変更
- NODE_ENV によるコード内 GA 無効化
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEAM-01 | private チームがトップビューのチームタブに表示され、ログイン不要で閲覧できる（/my ページでの参加・退出制限はそのまま維持） | 1行コード変更 (page.tsx line 21) + 既存テストの更新が必要 |
| ANLT-01 | GA4 が全ページのページビューを自動トラッキングする（`@next/third-parties` の `GoogleAnalytics` コンポーネント使用） | @next/third-parties@16.2.7 インストール済み、GoogleAnalytics エクスポート確認済み |
| ANLT-02 | 開発環境（`NODE_ENV !== 'production'`）では GA4 トラッキングが無効になる | env var ガード実装パターン確立済み（D-10: NODE_ENV チェック不要、env var 有無で制御） |
</phase_requirements>

---

## Summary

Phase 35 は 2 つの独立した変更から成る。(1) `src/app/page.tsx` の teams フィルタを1行変更して private チームをトップページのチームタブに表示する。(2) `src/app/layout.tsx` に `@next/third-parties` の `GoogleAnalytics` コンポーネントを追加して本番環境の全ページで GA4 ページビュートラッキングを有効にする。

コードの変更量は非常に小さい（2ファイル、合計3行程度）が、**既存テストの更新が必要**という重要な注意点がある。`src/app/__tests__/page.test.tsx` の TEAM-03 describe ブロック内に、private チームがタブに表示されないことを asserting する既存テスト（line 139-161）が存在し、TEAM-01 の変更後はこのテストが失敗する。このテストを新しい仕様に合わせて更新することが計画の中心的タスクとなる。

`@next/third-parties` は Vercel が管理する Next.js 公式パッケージであり、既に v16.2.7 がインストール済み。`GoogleAnalytics` エクスポートは実際に存在することを確認済み。コンポーネントは `'use client'` ディレクティブを持つが、`next/script` を通じて動作するため、root layout（Server Component）に条件付きで追加するだけで全ページに適用される。

**Primary recommendation:** 計画は (1) 既存テストの更新、(2) page.tsx の1行変更、(3) layout.tsx への GoogleAnalytics 追加、(4) テストスイートの全通過確認という順序で構成する。Vercel 環境変数設定手順はドキュメントで提供する。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| チームタブフィルタ（private 表示） | Frontend Server (RSC) | — | `page.tsx` は Server Component。`getMembers()` の結果を server-side でフィルタしてチーム名配列を生成。クライアント不要 |
| GA4 ページビュートラッキング | Browser / Client | CDN / Static | `GoogleAnalytics` は `'use client'` コンポーネント。`next/script` 経由でブラウザに gtag スクリプトをインジェクト |
| GA 有効/無効制御（env guard） | Frontend Server (SSR/Build) | — | `NEXT_PUBLIC_*` 変数はビルド時インライン化。Vercel production ビルドでのみ変数が設定される |
| /my private チーム readonly | Frontend Server (RSC) | Database / Storage | `src/app/my/page.tsx` は変更なし。この phase のスコープ外 |

---

## Standard Stack

### Core (このフェーズで使用)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@next/third-parties` | 16.2.7 (installed) | GoogleAnalytics コンポーネント | Vercel/Next.js 公式パッケージ。gtag.js を next/script 最適化で読み込む |
| Next.js | 16.2.6 (installed) | フレームワーク | プロジェクト標準 |
| TypeScript / React 19 | 19.2.4 (installed) | UI ランタイム | プロジェクト標準 |

**No new packages needed.** `@next/third-parties@16.2.7` はすでに `package.json` と `package-lock.json` に存在する。

[VERIFIED: npm registry + local node_modules]

### Supporting

なし。このフェーズは既存スタック上での最小変更。

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@next/third-parties` GoogleAnalytics | 手動 `<Script src="https://...gtag...">` | 標準より低品質。next/script の loading strategy 最適化を失う。D-05 で @next/third-parties 使用が確定済み |
| env var ガード | `NODE_ENV !== 'production'` チェック | D-10 で NODE_ENV チェックは不要と確定。env var ガードの方が Vercel preview/prod での細粒度制御が可能 |

---

## Package Legitimacy Audit

> このフェーズは新規パッケージをインストールしない。`@next/third-parties@16.2.7` は既にインストール済み。

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@next/third-parties` | npm | ~2.6 yrs (created 2023-10-17) | N/A (first-party) | github.com/vercel/next.js (packages/third-parties) | not run (slopcheck unavailable) | Approved — Vercel first-party package |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. However, `@next/third-parties` is confirmed as a Vercel-maintained first-party package within the `vercel/next.js` monorepo. Registry existence, source repository, creation date, and `GoogleAnalytics` export all verified via `npm view` and local `node_modules` inspection. Trust level: HIGH.*

[VERIFIED: npm registry + local node_modules inspection]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
      |
      v
Next.js RSC: src/app/page.tsx
  - getMembers() → DB query
  - teams = allMembers.flatMap(m => m.teams.filter(t => t.status !== 'hidden'))  ← CHANGE
  - filteredMembers = team-selected OR all-non-hidden
      |
      v
CommitGoalView (RSC + client components)
      |
      v
HTML Response to Browser
      |
      +─── root layout (src/app/layout.tsx)
              - <Header />
              - {children}
              - <Footer />
              - {NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics />}  ← ADD
                        |
                        v
                  next/script → gtag.js (production only)
                  → GA4 property pageview event
```

### Recommended Project Structure

No new files needed. Changes are in existing files:

```
src/
├── app/
│   ├── page.tsx           ← CHANGE: line 21, filter 'public' → not 'hidden'
│   └── layout.tsx         ← ADD: GoogleAnalytics import + conditional render
```

### Pattern 1: env var ガードによる条件付きコンポーネントレンダリング

**What:** `NEXT_PUBLIC_*` 変数はビルド時にインライン化される。未設定時は `undefined` になり、短絡評価で GoogleAnalytics がスキップされる。

**When to use:** 環境によって third-party スクリプトの有無を制御したい場合。

**Example:**
```tsx
// Source: 35-CONTEXT.md D-07 (confirmed against @next/third-parties source)
import { GoogleAnalytics } from '@next/third-parties/google'

// In RootLayout body:
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
)}
```

[VERIFIED: local node_modules/@next/third-parties/dist/google/ga.js — export exists]

### Pattern 2: team status フィルタ変更

**What:** `t.status === 'public'` から `t.status !== 'hidden'` へ変更することで、private チームも teams 配列（タブ表示用）に含めつつ hidden チームは除外する。

**When to use:** 既存ロジックの range 変更。

**Example:**
```tsx
// Before (page.tsx line 21):
.flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))

// After (TEAM-01 D-01):
.flatMap((m) => m.teams.filter((t) => t.status !== 'hidden').map((t) => t.name))
```

[VERIFIED: src/app/page.tsx line 21 — current code confirmed]

### Anti-Patterns to Avoid

- **NODE_ENV によるコード内 GA 無効化:** D-10 で明示的に除外。env var ガードのみ使用。
- **`(auth)` layout への GoogleAnalytics 追加:** root layout は Next.js ルートグループ継承により /login, /signin-* にも適用される。`src/app/(auth)/layout.tsx` は変更不要。
- **teams フィルタと filteredMembers フィルタの混同:** teams（タブ名一覧）フィルタは変更するが、`filteredMembers`（All タブ表示ユーザー）の `m.teams.every((t) => t.status !== 'hidden')` は D-03 により変更しない。この2つは別の配列・別の目的を持つ。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GA gtag.js 読み込み | `<script>` タグ手書き + dataLayer 初期化 | `@next/third-parties` `GoogleAnalytics` | next/script loading strategy, nonce サポート, Chrome Aurora ペルフォーマンスマーク統合が含まれる |

**Key insight:** `@next/third-parties` は Vercel が Next.js パフォーマンスを考慮して設計した薄いラッパー。手書き script タグでは得られる最適化が複数ある。

---

## Critical Pitfall: 既存テストの仕様変更

### Pitfall 1: TEAM-03 テストが TEAM-01 変更後に失敗する

**What goes wrong:** `src/app/__tests__/page.test.tsx` の 'shows ONLY public team names as tabs — private/hidden teams absent' テスト（line 139-161）は、現在 private チームがタブに表示されないことを assert している:

```typescript
// lines 157-159 — これらは TEAM-01 変更後に失敗する
expect(labels).not.toContain('PrivateTeam')
expect(labels).not.toContain('SecretTeam')
```

**Why it happens:** 既存テストはフェーズ 29 の仕様（public のみ表示）に基づいて書かれた。TEAM-01 が private チームをタブに表示する仕様変更を実施すると、これらの `not.toContain` assertion が壊れる。

**How to avoid:** 実装コード変更と同じタスクか直前のタスクでテストを更新する。

**新しいテスト仕様:**
- private チームは tabs に含まれる（`toContain('PrivateTeam')` に変更）
- hidden チームはタブに含まれない（`not.toContain('HiddenTeam')` のまま）
- All タブの filteredMembers ロジックも更新: Bob (private) は results に含まれる
  - line 198 のコメント: "Alice (public) and Bob (private, not hidden) included." は既に正しい
  - line 195-200 の実際の assertion: `expect(names).toEqual(['Alice', 'Bob'])` — これは **今回の変更後も正しい**（Bob の private メンバーシップは filteredMembers に含まれる。変わるのは tabs 表示のみ）

**Test file to update:** `src/app/__tests__/page.test.tsx`
- describe 名を更新（'shows ONLY public...' → 'shows public AND private team names as tabs — hidden teams absent'）
- `expect(labels).not.toContain('PrivateTeam')` → `expect(labels).toContain('PrivateTeam')`
- `expect(labels).not.toContain('SecretTeam')` → `expect(labels).toContain('SecretTeam')`
- `expect(labels).not.toContain('HiddenTeam')` → そのまま維持

[VERIFIED: src/app/__tests__/page.test.tsx — lines 139-161 inspected directly]

### Pitfall 2: GoogleAnalytics は 'use client' コンポーネントだが root layout への追加は問題ない

**What goes wrong:** root layout は Server Component。`'use client'` コンポーネントを直接 import しているように見えてエラーが起きるかと誤解される。

**Why it happens:** Server Component に 'use client' コンポーネントを import することへの誤解。

**How to avoid:** これは Next.js の標準パターン。Server Component は Client Component を import できる（逆は不可）。`next/script` は既にプロジェクト内の他のコンポーネントでも同様のパターンが使われている可能性が高い。条件付きレンダリング `{env && <GoogleAnalytics />}` で問題なく動作する。

### Pitfall 3: TypeScript 型エラー — process.env は string | undefined

**What goes wrong:** `<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />` は TypeScript が `string | undefined` を受け入れない場合にビルドエラーになる可能性。

**How to avoid:** D-07 のパターン通り、`&&` による短絡評価で条件付きレンダリングする。`&&` の左辺が truthy な場合、TypeScript はその変数を `string` と narrowing するため型エラーは発生しない。

---

## Code Examples

### TEAM-01: page.tsx line 21 変更

```tsx
// Before (current):
// src/app/page.tsx line 21
.flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))

// After (TEAM-01):
.flatMap((m) => m.teams.filter((t) => t.status !== 'hidden').map((t) => t.name))
```
[VERIFIED: src/app/page.tsx — line 21 confirmed via file read]

### ANLT-01/02: layout.tsx GoogleAnalytics 追加

```tsx
// src/app/layout.tsx — AFTER changes
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata: Metadata = { /* unchanged */ }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
        <Footer />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
```
[VERIFIED: src/app/layout.tsx current state + @next/third-parties export confirmed]

### 更新後テスト（TEAM-03）

```typescript
// src/app/__tests__/page.test.tsx
// describe name を更新:
it('shows public AND private team names as tabs — hidden teams absent', async () => {
  mockGetMembers.mockResolvedValue([
    member('Alice', [{ name: 'PublicTeam', status: 'public' }]),
    member('Bob', [{ name: 'PrivateTeam', status: 'private' }]),
    member('Carol', [{ name: 'HiddenTeam', status: 'hidden' }]),
    member('Dave', [
      { name: 'PublicTeam', status: 'public' },
      { name: 'SecretTeam', status: 'private' },
    ]),
  ])

  const el = await Home({ searchParams: Promise.resolve({}) })
  const labels = collectAnchorLabels(el)

  expect(labels).toContain('All')
  expect(labels).toContain('PublicTeam')
  expect(labels).toContain('PrivateTeam')   // ← CHANGED: now expected
  expect(labels).toContain('SecretTeam')    // ← CHANGED: now expected
  expect(labels).not.toContain('HiddenTeam') // ← UNCHANGED: hidden still excluded
})
```
[VERIFIED: existing test structure read from src/app/__tests__/page.test.tsx]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 手動 `<script>` gtag.js | `@next/third-parties` `GoogleAnalytics` | Next.js 13.4+ | Script loading 最適化、型安全性 |
| `NODE_ENV` チェックで dev/prod GA 切り替え | `NEXT_PUBLIC_*` env var 有無による制御 | — (D-10 決定) | Vercel preview env でも env var で細粒度制御可能 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel 環境変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID` が未設定の場合、`process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` は `undefined` になりビルド成功する | Architecture Patterns | 低リスク — Next.js の NEXT_PUBLIC_* 変数の動作は公式ドキュメントで確立済み |

**ほぼすべての主要クレームは検証済み。** 上記の A1 は Next.js の標準動作だが、このプロジェクトでの実際のビルド確認はされていない。

---

## Open Questions

1. **GA Measurement ID の実際の値**
   - What we know: フォーマットは `G-XXXXXXXXXX`（D-09）
   - What's unclear: 実際の ID はユーザーが Vercel 環境変数に直接設定する（D-09）。実装時点では不明で問題ない
   - Recommendation: RESEARCH.md / PLAN.md には `G-XXXXXXXXXX` プレースホルダーを使用。Vercel 設定手順をドキュメントとして提供する

2. **Vercel preview 環境での GA**
   - What we know: env var ガード（D-10）を使用。Vercel の production 環境変数は production branch のみに適用できる
   - What's unclear: preview deploy でも GA が発火するかどうかはユーザーの Vercel 環境変数設定次第
   - Recommendation: スコープ外。本番のみ設定する旨を手順に記載すれば十分

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build | ✓ | (npm 動作確認済み) | — |
| `@next/third-parties` | ANLT-01/02 | ✓ | 16.2.7 (installed) | — |
| Vercel 環境変数 | ANLT-01/02 (prod) | — (ユーザー設定) | — | — |
| vitest | Test validation | ✓ | 4.1.6 | — |

**Missing dependencies with no fallback:** なし（コード変更のみ）

**Vercel 環境変数:** 実装完了後にユーザーが手動設定。自動化不可。手順ドキュメントで対応。

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/app/__tests__/page.test.tsx` |
| Full suite command | `npx vitest run` |

**Baseline:** 22 test files, 150 tests — all passing (confirmed 2026-06-08).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | private チームがタブに表示される | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ (requires test UPDATE) |
| TEAM-01 | hidden チームはタブに表示されない | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ (existing assertion unchanged) |
| TEAM-01 | All タブは private チームメンバーを表示する | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ (existing assertion valid post-change) |
| ANLT-01 | GoogleAnalytics が layout.tsx に追加される | unit (smoke) | `npx vitest run` | ❌ Wave 0 — 新規テスト不要（コンポーネント追加は型チェックとビルド成功で検証） |
| ANLT-02 | env var 未設定時 GA スクリプトが読み込まれない | manual | browser devtools で script タグ確認 | manual-only |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/__tests__/page.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite (150 tests) green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/__tests__/page.test.tsx` の TEAM-03 テストを TEAM-01 新仕様に更新（private チームが tabs に表示されることを assert）— これは Wave 0 ではなく実装タスクとして扱う。既存ファイルの修正のみ。

*(新規テストファイルは不要。既存テストの更新で全 requirement をカバー)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | /my page は変更なし。private チームタブは閲覧のみ |
| V5 Input Validation | no | team フィルタは DB 値をそのまま表示。user input なし |
| V6 Cryptography | no | — |

**セキュリティ上の考慮:**
- GA Measurement ID (`G-XXXXXXXXXX`) は `NEXT_PUBLIC_*` 変数として公開される。これは意図的かつ正常（GA ID はフロントエンドで公開される性質のもの）。
- private チームのタブ表示は「チーム名の閲覧のみ」。メンバー情報は既存の `filteredMembers` ロジックで制御される（`t.name === team` の存在確認）。スコープ内の認可変更はなし。

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| GA ID の不正利用 | Information Disclosure | GA ID は本来公開情報。不正トラッキング耐性は GA プロパティ側で管理 |

---

## Sources

### Primary (HIGH confidence)

- Local codebase — `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/__tests__/page.test.tsx`, `vitest.config.ts` — current code state confirmed
- Local `node_modules/@next/third-parties/dist/google/ga.js` — `GoogleAnalytics` export existence and implementation confirmed
- `npm view @next/third-parties` — registry version 16.2.7, source repo vercel/next.js, created 2023-10-17
- `.planning/phases/35-google-analytics/35-CONTEXT.md` — locked decisions D-01 through D-10
- `.planning/phases/35-google-analytics/35-UI-SPEC.md` — visual contract confirmed

### Secondary (MEDIUM confidence)

- `npx vitest run` baseline — 150 tests passing, confirmed 2026-06-08

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `@next/third-parties` confirmed installed, export verified locally
- Architecture: HIGH — both changed files read and understood; test conflict identified precisely
- Pitfalls: HIGH — existing test failure is deterministic and verified by code inspection
- Test strategy: HIGH — existing test infrastructure covers all requirements with minimal updates

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (stable library; no external API changes expected)
