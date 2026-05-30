# Phase 24: /admin/teams/{teamName} hiddenチームビュー - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

管理者が `/admin/teams/{teamName}` にURL直接アクセスして、指定チーム（主にhidden）の週次ヒートマップを確認できる動的ルートページを新設する。トップページ（`page.tsx`）の週次ヒートマップ描画パターン（`getMembers()` → teamNameでフィルタ → `fetchAllFeedsCached()` → `<WeeklyHeatmapGrid>`）を流用し、単一チーム表示に特化させる。

**このフェーズで変更するもの:**
- `src/app/admin/teams/[teamName]/page.tsx` — 新規作成（動的ルート。teamName で `getMembers()` の結果をフィルタし `WeeklyHeatmapGrid` を描画）

**このフェーズで作らないもの:**
- adminロール保護の新規実装（`src/proxy.ts` の matcher `/admin/:path*` で既にカバー済み。確認のみ）
- `/admin/teams` チームstatus管理テーブル（Phase 22で実装済み）
- member_publicationsスキーマ拡張（Phase 25）
- E2Eテスト（Phase 26）

</domain>

<decisions>
## Implementation Decisions

### 無効/空チームの扱い

- **D-01:** teamName がDBに存在しない場合も、存在するがメンバーが0人の場合も、**200でメッセージを表示する**（`notFound()`/404 にはしない）。メッセージ例: 「該当するチームのメンバーがいません」等
- **D-02:** いずれの場合もページ自体はadmin保護下で正常表示し、ヒートマップ領域の代わりに上記メッセージを出す

### ページの見た目

- **D-03:** 管理用の**簡素なビュー**にする。構成は チーム名見出し + `/admin` への戻りリンク + `<WeeklyHeatmapGrid>`
- **D-04:** トップページのチームタブ・`PrBanner`（参加案内バナー）は**表示しない**（管理者専用ビューのため不要）
- **D-05:** トップページの最大幅・余白スタイル（`max-w-[600px] mx-auto px-3 py-4`）は踏襲してよい（Claude裁量）

### 表示できるチームの範囲

- **D-06:** **任意の teamName を表示できる**（public/private/hidden を問わない）。ルート名は hidden 用途だが、管理者が全チームをURL直接で確認できるようにする
- **D-07:** メンバーのフィルタは teamName の完全一致: `allMembers.filter(m => m.teams.some(t => t.name === teamName))`（status 条件は付けない）

### Claude's Discretion

- 見出しに status バッジ（hidden/private/public）を併記するかは任意
- teamName のURLデコード（`decodeURIComponent`）の扱い — 日本語・特殊文字チーム名に対応すること（実装詳細）
- `revalidate` の値（トップは300）に合わせるかは任意

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` §VIEW — VIEW-01・VIEW-02（Phase 24対象要件）
- `.planning/ROADMAP.md` §Phase 24 — Goal・Success Criteria・Requirements

### 流用元コード（最重要）
- `src/app/page.tsx` — トップページの週次ヒートマップ描画パターン（`getMembers()` → teamNameフィルタ → `fetchAllFeedsCached()` → `<WeeklyHeatmapGrid>`）。この実装を単一チーム用に流用する
- `src/components/WeeklyHeatmapGrid.tsx` — 週次ヒートマップ本体。props は `{ results: MemberFeedResult[] }`。そのまま再利用
- `src/lib/members.ts` — `getMembers(): Promise<Member[]>`（全メンバー取得、teams: {name, status}[] 付き）
- `src/lib/fetchFeed.ts` — `fetchAllFeedsCached(members): Promise<MemberFeedResult[]>`
- `src/lib/types.ts` — `Member`（teams: {name, status}[]）・`MemberFeedResult` 型

### 認証保護（確認のみ）
- `src/proxy.ts` — `/admin/:path*` matcher + adminロールチェック（VIEW-02 は新規実装不要、ここで担保されることを確認）

### Phase 22/23 引継ぎ
- `.planning/phases/22-team-status/22-CONTEXT.md` — D-04: status別表示ルール、D-06: Member型（teams: {name, status}[]）
- `src/app/admin/teams/page.tsx` / `src/app/admin/teams/actions.ts` — `/admin/teams` 配下の既存ページ・Server Actionパターン（同ディレクトリへの動的ルート追加の参考）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getMembers()` (`src/lib/members.ts`) — 全メンバーを teams(name, status) 付きで取得。teamNameでin-memoryフィルタ
- `fetchAllFeedsCached()` (`src/lib/fetchFeed.ts`) — フィルタ後メンバーのフィード取得（トップと同じ）
- `<WeeklyHeatmapGrid results={...} />` (`src/components/WeeklyHeatmapGrid.tsx`) — 週送りナビ付き週次ヒートマップ。props変更なしで再利用可能
- トップページのレイアウト/フィルタロジック（`src/app/page.tsx`）— ほぼコピーして単一チーム用に簡素化

### Established Patterns
- Next.js App Router 動的ルート: `app/admin/teams/[teamName]/page.tsx`（params から teamName 取得、Next 15では `params` は Promise）
- RSC でのデータ取得 → Client Component（`WeeklyHeatmapGrid`）へ props 渡し
- `export const revalidate`（トップは300）でISRキャッシュ

### Integration Points
- adminロール保護は `src/proxy.ts` の matcher `/admin/:path*` が `/admin/teams/{teamName}` を自動でカバー。新規middleware変更は不要（VIEW-02 / Success Criteria #2 を充足）
- 既存 `/admin/teams/page.tsx`（status管理テーブル）と同ディレクトリに `[teamName]/page.tsx` を追加。ルート競合なし（`/admin/teams` と `/admin/teams/{name}` は別セグメント）

</code_context>

<specifics>
## Specific Ideas

- ページ構成: `<チーム名見出し>` + `<a href="/admin">← 管理画面に戻る</a>` 的な戻りリンク + `<WeeklyHeatmapGrid>`
- 無効/空チーム時はヒートマップの代わりに1行メッセージ（「該当するチームのメンバーがいません」等）を200で表示

</specifics>

<deferred>
## Deferred Ideas

None — 議論はフェーズスコープ内に収まった

### Reviewed Todos (not folded)
- `2026-05-11-multi-team-membership.md`（多対多所属）— v1.3で実装済み、Phase 24スコープ外
- `2026-05-11-article-history-persistence.md`（Cron+KV累積保存）— v1.3で実装済み、スコープ外
- `2026-05-11-supabase-migration.md`（Supabase移行）— v1.5で実装済み、スコープ外

</deferred>

---

*Phase: 24-/admin/teams/{teamName} hiddenチームビュー*
*Context gathered: 2026-05-30*
