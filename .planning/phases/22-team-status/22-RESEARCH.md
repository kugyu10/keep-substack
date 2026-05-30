# Phase 22: チームステータス管理 - Research

**Researched:** 2026-05-19
**Domain:** Next.js App Router / Supabase / TypeScript — スキーマ変更 + Server Actions + 管理UI新設
**Confidence:** HIGH（全知見を既存コードから直接検証済み）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** チームstatus編集UIは `/admin/teams` として別ページを新設する（/admin内にセクション追加ではなく）
- **D-02:** `/admin/teams` のレイアウトはテーブル形式。チーム名 | statusドロップダウン（public/private/hidden） | Saveボタン の行ごとリスト
- **D-03:** `/admin` メインページに「チーム設定」リンクを追加して `/admin/teams` へ誘導する
- **D-04:** status別の表示ルール:
  - `public`: チームタブあり + Allビューあり
  - `private`: チームタブなし + Allビューあり（タブに出ないだけ、メンバーはAll表示）
  - `hidden`: チームタブなし + Allビューなし（完全非表示）
- **D-05:** `getMembers()` の SELECT クエリを `teams(name, status)` にJOIN拡張する
- **D-06:** `Member` 型の `teamNames: string[]` を `teams: {name: string, status: string}[]` に変更する
- **D-07:** 呼び出し元で team名のみ必要な箇所は `.map(t => t.name)` で対応する
- **D-08:** `page.tsx` のフィルタリングロジック:
  - タブ一覧: `member.teams.filter(t => t.status === 'public').map(t => t.name)` で重複排除
  - Allビュー: `member.teams.every(t => t.status !== 'hidden')` で除外判定
- **D-09:** `supabase/migrations/20260517_add_team_status.sql` を新規作成する
- **D-10:** マイグレーションファイルに以下を含める:
  ```sql
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
  UPDATE teams SET status = 'hidden' WHERE name = 'chameleon';
  ```
- **D-11:** `supabase/schema.sql` の teams テーブル定義にも status カラムを追加する

### Claude's Discretion

なし（全実装詳細がLocked Decisionsで定義済み）

### Deferred Ideas (OUT OF SCOPE)

- `/admin/teams/{teamName}` の週次ヒートマップビュー（Phase 24）
- `/my` ページのpublicチーム参加・退出UI（Phase 23）
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEAM-01 | teamsテーブルにstatus（public/private/hidden）カラムを追加できる | D-09/D-10/D-11: マイグレーションDDL + schema.sql更新で実現 |
| TEAM-02 | 管理画面でチームのstatusを設定・変更できる | D-01/D-02/D-03: `/admin/teams` 新設 + Server Actionパターン流用で実現 |
| TEAM-03 | publicチームのみがトップページのチームタブに表示される | D-08: `filter(t => t.status === 'public')` フィルタリングで実現 |
| TEAM-04 | HIDDEN_TEAM定数を廃止し、teams.status='hidden'で同等の動作を実現できる | D-06/D-08: Member型変更 + status判定ロジックへの置き換えで実現 |
</phase_requirements>

---

## Summary

Phase 22は「HIDDEN_TEAM定数の廃止とteams.statusカラム導入」を中心とした、データモデル拡張と管理UI新設の変更フェーズである。変更規模はコンパクトだが、`Member`型の破壊的変更（`teamNames: string[]` → `teams: {name: string, status: string}[]`）が複数のコンポーネントに波及するため、型変更の影響範囲を正確に把握した上で実装順序を設計する必要がある。

既存コードはNext.js App Router + Supabase (service_role) + Server Actionsという一貫したパターンで構成されており、`/admin/teams/actions.ts` および `/admin/teams/page.tsx` の新設も既存の `/admin/` 配下のパターンをほぼそのまま踏襲できる。マイグレーションは既存の `20260516_rename_substack_id_to_publication_id.sql` に倣い、`BEGIN/COMMIT` トランザクションで記述する。

`proxy.ts` は `pathname.startsWith('/admin')` でキャッチしているため、`/admin/teams` は追加のmatcher設定なしに既存のadminロール保護が自動適用される。

**Primary recommendation:** Member型変更を最初に確定させ、型エラーを軸に変更箇所を特定・修正するウェーブ構成で進める。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| statusカラムDDL追加 | Database / Storage | — | Supabaseスキーマ変更はSQLマイグレーションで管理 |
| チームstatus読み取り | API / Backend (getMembers) | — | Supabase service_roleで取得し、型安全なMember[]として返す |
| statusドロップダウンUI | Frontend Server (RSC page) + Client | — | page.tsxでチーム一覧fetch → Client Componentで`<select>`描画 |
| status更新Server Action | API / Backend (Server Action) | — | `requireAdmin()` 付きServer ActionでSupabase直接書き込み |
| チームタブ・Allビュー フィルタリング | Frontend Server (RSC page) | — | `page.tsx`のサーバーサイドロジックで制御 |
| 管理画面ルート保護 | Frontend Server (proxy.ts middleware) | — | `startsWith('/admin')` で既にカバー済み |

---

## Standard Stack

### Core（既存スタックをそのまま使用）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | プロジェクト既存 | RSCページ・Server Actions | 既存パターンに統一 |
| Supabase JS Client | プロジェクト既存 | DB操作（`createSupabaseAdminClient`） | service_role経由でRLSバイパス書き込み |
| TypeScript | プロジェクト既存 | 型安全性 | Member型の破壊的変更を型エラーで検出 |
| Tailwind CSS | プロジェクト既存 | スタイリング | 既存テーブルUIのクラスを踏襲 |

[VERIFIED: 既存コードベース直接確認]

### 新規パッケージ

なし。追加インストール不要。

---

## Architecture Patterns

### System Architecture Diagram

```
[Supabase DB: teams table]
       |  ALTER TABLE ADD COLUMN status
       v
[getMembers() in members.ts]
  SELECT teams(name, status) via member_teams JOIN
       |
       v
[Member[] with teams: {name, status}[]]
       |
       +---> [src/app/page.tsx]
       |       filter public tabs / Allビュー除外ロジック (D-08)
       |
       +---> [src/app/admin/page.tsx]
       |       teams props を .map(t => t.name) で string[] 変換 (D-07)
       |       AdminAddForm / AdminMemberList に渡す
       |
       +---> [src/app/admin/teams/page.tsx] (新規)
               teams テーブルから name + status を直接SELECT
               |
               v
             [TeamStatusList (Client Component)]
               <select> ドロップダウン + Save ボタン
               |
               v
             [src/app/admin/teams/actions.ts] (新規)
               updateTeamStatusAction() → supabase.update teams
               revalidatePath('/admin/teams')
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── types.ts              # Member型変更（teamNames → teams）
│   └── members.ts            # getMembers() SELECT拡張
├── app/
│   ├── page.tsx              # HIDDEN_TEAM廃止 → status判定に変更
│   └── admin/
│       ├── page.tsx          # /admin/teamsリンク追加
│       ├── AdminAddForm.tsx  # teams prop型変更対応 (.map(t=>t.name))
│       ├── AdminMemberList.tsx # 同上
│       └── teams/
│           ├── page.tsx      # 新規: チームstatus管理ページ（RSC）
│           └── actions.ts    # 新規: updateTeamStatusAction
supabase/
├── schema.sql                # teams定義にstatusカラム追加
└── migrations/
    └── 20260517_add_team_status.sql  # 新規マイグレーション
```

### Pattern 1: 既存Server Actionパターン（チームstatus更新に流用）

**What:** `requireAdmin()` でロール確認後、Supabaseで書き込み、`revalidatePath` でキャッシュクリア
**When to use:** admin保護が必要な全Server Action

```typescript
// Source: src/app/admin/actions.ts (既存パターン)
'use server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function updateTeamStatusAction(
  teamId: string,
  status: string
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('teams')
    .update({ status })
    .eq('id', teamId)
  if (error) return error.message

  revalidatePath('/admin/teams')
  return null
}
```

[VERIFIED: src/app/admin/actions.ts の既存パターンから確認]

### Pattern 2: Supabase ネストSELECT（teams(name, status)）

**What:** member_teams JOIN経由でteamsのname+statusを取得する
**When to use:** getMembers()の拡張

```typescript
// Source: src/lib/members.ts (既存パターンの拡張)
const { data, error } = await supabase
  .from('members')
  .select(`
    name,
    publication_id,
    added_at,
    member_teams (
      teams (name, status)
    )
  `)

// マッピング
return data.map((m: any) => ({
  name: m.name,
  publicationId: m.publication_id,
  teams: (m.member_teams as any[])
    .map((mt: any) => mt.teams)
    .filter((t: unknown): t is { name: string; status: string } =>
      t !== null && typeof t === 'object'
    ),
  addedAt: m.added_at,
}))
```

[VERIFIED: src/lib/members.ts の既存SELECTパターンから確認]

### Pattern 3: Supabaseマイグレーション（BEGINトランザクション）

```sql
-- Source: supabase/migrations/20260516_rename_substack_id_to_publication_id.sql 参照
BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
UPDATE teams SET status = 'hidden' WHERE name = 'chameleon';

COMMIT;
```

[VERIFIED: 既存マイグレーションファイルの書き方から確認]

### Anti-Patterns to Avoid

- **`teamNames`を既存のまま残すハーフ対応:** 型を中途半端に変更すると、`AdminMemberList.tsx`の `m.teamNames.includes(team)` など既存の参照が型エラーを出しつつ動作してしまいバグを見逃す。型変更は一括で行い、コンパイルエラーを完走させてから実装を進める。
- **`/admin/teams`のmatcher個別追加:** `proxy.ts` は既に `pathname.startsWith('/admin')` でカバーしているため、matcher配列への追加は不要。重複追加は混乱の原因になる。
- **`chameleon`チーム名ハードコードの残留:** HIDDEN_TEAM定数廃止後に `'chameleon'` という文字列リテラルがコード中に残ると、将来チーム名変更時に漏れが生じる。status判定ロジックのみで完結させる。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| admin認証チェック | 独自auth guard | 既存`requireAdmin()` in actions.ts | コード重複。既存関数を再利用する |
| Supabase書き込み | REST API直接呼び出し | `createSupabaseAdminClient()` | service_role経由でRLSバイパス済み、既存パターン |
| キャッシュ無効化 | カスタムキャッシュ機構 | `revalidatePath('/admin/teams')` | Next.js標準。既存actionsと同じ |

---

## Common Pitfalls

### Pitfall 1: Member型変更後の`updateMember()`の`teamNames`参照

**What goes wrong:** `updateMember()` の引数が `Partial<Omit<Member, 'publicationId'>>` であり、`updates.teamNames` を参照している。`teamNames` を `teams` に改名すると、`updateMember()` 内の `if (updates.teamNames !== undefined)` と `for (const teamName of updates.teamNames)` のループが壊れる。

**Why it happens:** Member型変更がDAL（Data Access Layer）まで波及するが、`updateMember()` は内部でteam名のみを使用するロジック（upsert）を持っているため、型変更に合わせたインターフェース設計が必要。

**How to avoid:** `updateMember()` の引数型を `updates.teams` (name配列) として受け取るか、呼び出し側で `.map(t => t.name)` 変換を行い内部は`teamNames`相当のstring[]として扱う。呼び出し元（`actions.ts`の`updateMemberAction`）も合わせて変更する。

**Warning signs:** TypeScriptコンパイルエラー `Property 'teamNames' does not exist on type ...`

### Pitfall 2: `AdminMemberList.tsx`の`m.teamNames`参照が3箇所ある

**What goes wrong:** `AdminMemberList.tsx` は `m.teamNames.includes(team)` (行73) と `m.teamNames.join(', ')` (行107) の2箇所でtypeNameを参照している。型変更後にどちらか片方だけ修正すると実行時エラーになる。

**How to avoid:** `AdminMemberList.tsx` 内の`teamNames`参照を全件検索して一括修正する。

### Pitfall 3: `page.tsx`の`team`クエリパラメータ処理

**What goes wrong:** `src/app/page.tsx` の `allMembers.filter((m) => m.teamNames.includes(team))` はteam名でフィルタリングしている。型変更後は `m.teams.some(t => t.name === team)` に変更が必要。この変更漏れはビルドエラーではなく実行時の表示バグになる可能性がある（TypeScript型推論次第）。

**How to avoid:** フィルタリングロジック変更時はD-08の定義を厳守する。

### Pitfall 4: `admin/page.tsx`の`teams`取得クエリ

**What goes wrong:** 現在 `admin/page.tsx` は `supabase.from('teams').select('name').order('name')` でチーム名のみ取得している。この `teams` 変数は `AdminAddForm` と `AdminMemberList` に `string[]` として渡される。`Member.teams` の型変更とは別に、この`teams: string[]`はそのまま維持できる（チェックボックスUIはチーム名のみ必要）。

**How to avoid:** `admin/page.tsx` の`teams`取得クエリは変更不要。`AdminAddForm`/`AdminMemberList`のPropsの `teams: string[]` も変更不要。変更が必要なのは `members` から渡る `Member[]` 型の `teamNames → teams` 部分のみ。

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | teamsテーブルの `chameleon` 行（statusカラムなし） | マイグレーションDDLで `status='hidden'` に設定 |
| Live service config | Supabase本番DBのteamsテーブル定義 | `20260517_add_team_status.sql` をSQL Editorで手動実行 |
| OS-registered state | なし — 確認済み | 不要 |
| Secrets/env vars | なし — テーブルカラム追加はコード変数変更なし | 不要 |
| Build artifacts | なし | 不要 |

**補足:** Supabaseのマイグレーションは `supabase db push` ではなく、SQL Editorでの手動実行が既存のプロジェクト慣習である（既存マイグレーションファイルのコメントより）。[VERIFIED: supabase/migrations/20260516_rename_substack_id_to_publication_id.sql のコメント]

---

## Environment Availability

Step 2.6: 外部ツール依存なし（コード変更 + SQL手動実行のみ）のためSKIPPED。

---

## Code Examples

### getMembers() 変更後の型マッピング

```typescript
// Source: src/lib/members.ts（既存パターンから拡張）
// teams(name, status) にJOIN拡張 → Member.teams[] に変換
return data.map((m: any) => ({
  name: m.name,
  publicationId: m.publication_id,
  teams: (m.member_teams as any[])
    .map((mt: any) => mt.teams)
    .filter((t: unknown): t is { name: string; status: string } =>
      t !== null && typeof t === 'object' && 'name' in (t as object)
    ),
  addedAt: m.added_at,
}))
```

### page.tsx フィルタリングロジック（D-08準拠）

```typescript
// Source: D-08 (CONTEXT.md Locked Decision)
// タブ一覧: publicチームのみ、重複排除
const teams = [
  ...new Set(
    allMembers
      .flatMap((m) => m.teams.filter(t => t.status === 'public').map(t => t.name))
      .filter(Boolean)
  )
]

// Allビュー: hiddenチームメンバーを完全除外
// teamフィルタ時: status問わずteam名で絞る（privateメンバーも表示）
const filteredMembers = team
  ? allMembers.filter((m) => m.teams.some(t => t.name === team))
  : allMembers.filter((m) => m.teams.every(t => t.status !== 'hidden'))
```

### /admin/teams/page.tsx（新規RSCページの骨格）

```typescript
// Source: src/app/admin/page.tsx の既存パターンを踏襲
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import TeamStatusList from './TeamStatusList'  // Client Component

export default async function AdminTeamsPage() {
  const supabase = createSupabaseAdminClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, status')
    .order('name')

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">チーム設定</h1>
      <TeamStatusList teams={teams ?? []} />
    </main>
  )
}
```

### admin/page.tsx へのリンク追加（D-03）

```tsx
// /admin/page.tsx に追加するリンク（既存UIスタイルに合わせる）
<a href="/admin/teams" className="text-blue-600 hover:underline text-sm">
  チーム設定
</a>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `HIDDEN_TEAM = 'chameleon'` 定数による除外 | `teams.status = 'hidden'` によるDB駆動除外 | Phase 22 | ハードコード廃止、将来のhiddenチーム追加が設定のみで完結 |
| `Member.teamNames: string[]` | `Member.teams: {name: string, status: string}[]` | Phase 22 | statusを型で保持。呼び出し元で `.map(t=>t.name)` 変換が必要 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `supabase db push` を使わず SQL Editor 手動実行が慣習 | Runtime State Inventory | 低リスク: 手動実行は常に有効な方法 |
| A2 | `chameleon` が現時点でDBに存在する唯一のhidden相当チーム | Runtime State Inventory | 中: 他に非公開運用チームがあればUPDATE漏れ |

---

## Open Questions

1. **`chameleon` 以外にhidden扱いしたいチームが存在するか**
   - What we know: 現行コードは `HIDDEN_TEAM = 'chameleon'` の1チームのみ
   - What's unclear: 本番DBに他の「非公開」チームがあるかどうか
   - Recommendation: マイグレーション実行前にSQLで `SELECT name FROM teams` を確認し、必要なら追加の `UPDATE` 文をマイグレーションに加える

2. **`updateMember()` の引数インターフェース変更方針**
   - What we know: 現行は `Partial<Omit<Member, 'publicationId'>>` を受け取り `updates.teamNames` を参照
   - What's unclear: `teams: {name, status}[]` を受け取って名前だけ使うか、呼び出し側で変換するか
   - Recommendation: KISS原則に従い、`updateMember()` 内部では `teamNames: string[]` 相当を維持し、呼び出し元（`actions.ts`）で `updates.teams?.map(t => t.name)` 変換を行う形が最小変更

---

## Sources

### Primary (HIGH confidence)

- `src/lib/types.ts` — HIDDEN_TEAM定数・Member型の現状を直接確認
- `src/lib/members.ts` — getMembers()・updateMember()のクエリパターンを直接確認
- `src/app/page.tsx` — HIDDEN_TEAMフィルタリングロジックを直接確認
- `src/app/admin/page.tsx` — 既存管理画面のパターンを直接確認
- `src/app/admin/actions.ts` — requireAdmin()・Server Actionパターンを直接確認
- `src/app/admin/AdminAddForm.tsx` — teams prop (`string[]`) の使い方を直接確認
- `src/app/admin/AdminMemberList.tsx` — `m.teamNames` 参照箇所を直接確認
- `src/proxy.ts` — `/admin` ルート保護パターン（`startsWith`）を直接確認
- `supabase/schema.sql` — teamsテーブルの現行定義（statusカラムなし）を直接確認
- `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` — マイグレーション記述様式を直接確認
- `.planning/phases/22-team-status/22-CONTEXT.md` — Locked Decisionsを直接確認

### Secondary (MEDIUM confidence)

なし

### Tertiary (LOW confidence)

なし

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 既存コードを全件直接読み取り確認
- Architecture: HIGH — 変更箇所・影響範囲を全ファイル精査済み
- Pitfalls: HIGH — コード参照に基づく具体的バグ箇所を特定済み

**Research date:** 2026-05-19
**Valid until:** 2026-06-19（Supabase・Next.js等の外部バージョン変更がなければ）
