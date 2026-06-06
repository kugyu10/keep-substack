# Phase 28: コミットスケジュール — DB + /my ページ - Research

**Researched:** 2026-06-02
**Domain:** Supabase PostgreSQL migration + Next.js 16 Server Action + React 19 Client Component (useActionState)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** コミットスロットの保存は `updateCommitSlotsAction`（`src/app/my/actions.ts` に追加）として独立させる。既存の `updateMyProfileAction` には統合しない
- **D-02:** プロフィール保存（name/handle/teams）とスケジュール宣言は独立したボタンと Server Action で処理する
- **D-03:** コミットスケジュール設定は `/my` ページにモーダルUIとして実装する。新規コンポーネント `src/app/my/CommitScheduleModal.tsx`（Client Component）として作成
- **D-04:** スケジュール未設定時: `「投稿スケジュールを宣言する」` ボタンを表示 → クリックでモーダルを開く
- **D-05:** スケジュール設定済み時: 「週N回 — 月曜 8:00、水曜 20:00…」のサマリーテキストをクリックして編集モーダルを開く
- **D-06:** モーダルの開閉状態 (`isOpen`) は `CommitScheduleModal` 自身の `useState` で管理する。`/my/page.tsx` は開閉を管理しない
- **D-07:** `/my/page.tsx` はサーバーサイドで `member_commit_slots` を SELECT し、スロット配列 + メンバー ID を props として `CommitScheduleModal` に渡す
- **D-08:** 頻度選択: `<select>` プルダウン（1/2/3/4）。変更時に曜日+時刻ペアが動的に増減する（`useState` で頻度を管理）
- **D-09:** 各スロットの曜日: `<select>`（月/火/水/木/金/土/日 = 0〜6）
- **D-10:** 各スロットの時刻: `<select>`（00〜23の整数値、分は:00固定）
- **D-11:** UIバリデーション: 同一曜日を2つ以上のスロットで選択することを禁止する（クライアントサイドで警告）
- **D-12:** モーダル内の送信ボタンは「宣言する」。押すと DB 保存 + モーダルを閉じる
- **D-13:** テーブル名: `member_commit_slots`
- **D-14:** カラム: `id` (BIGINT GENERATED ALWAYS AS IDENTITY PK), `member_id` (UUID, FK → members.id), `day_of_week` (INT), `hour` (INT)
- **D-15:** `day_of_week` マッピング: **ISO 8601 準拠** — 1=月, 2=火, 3=水, 4=木, 5=金, 6=土, 7=日
- **D-16:** DB UNIQUE 制約なし（UIバリデーションのみで重複を防ぐ）
- **D-17:** 保存戦略: `updateCommitSlotsAction` でそのメンバーの全スロットを `DELETE` してから `INSERT`
- **D-18:** RLS: 本人のみ書き込み可（`member_id` = 認証済みメンバーの `id`）

### Claude's Discretion

- モーダルの実装方法（Tailwind fixed + overlay で実装。`dialog` タグまたは div+role="dialog" はどちらでも可）
- `updateCommitSlotsAction` のエラーハンドリング: 既存の `string | null` 返り値パターンを踏襲
- migration ファイル名: `supabase/migrations/20260602000001_add_member_commit_slots.sql`（または適切な timestamp）

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHED-01 | User can set weekly commit frequency (1, 2, 3, or 4 times) from /my page | `<select>` 1〜4 in CommitScheduleModal; useState で管理 |
| SCHED-02 | User can set day-of-week and hour (00–23, minutes fixed at :00) for each commit slot | 各スロットに曜日 `<select>` (ISO 1〜7) + 時刻 `<select>` (0〜23) |
| SCHED-03 | Commit schedule is persisted in DB (`member_commit_slots` table: member_id, day_of_week, hour) | migration + updateCommitSlotsAction (delete+insert) |
</phase_requirements>

---

## Summary

Phase 28 では 2 つの独立した成果物を作る: (1) `member_commit_slots` テーブルを追加する DB migration、(2) `/my` ページへの `CommitScheduleModal` Client Component と `updateCommitSlotsAction` Server Action の追加。

DB 層は既存の migration パターン（BEGIN/COMMIT ラップ、IF NOT EXISTS ガード、`supabase/schema.sql` との同期）に完全に沿う。テーブルの型は `members.id` が UUID であることに注意 — CONTEXT.md D-14 は BIGINT FK と書いているが、実際の `members.id` は UUID PRIMARY KEY であるため `member_id UUID` が正しい（詳細は「重要な修正点」参照）。

UI 層は既存の `MyProfileForm.tsx + updateMyProfileAction` パターンを忠実に踏襲する。`useActionState` + `'use server'` Server Action + `revalidatePath('/my')` + `string | null` 返り値 — これらは既にコードベースで確立済みであり、追加の外部パッケージは一切不要。

**Primary recommendation:** 既存の `member_teams` delete+insert パターンと `updateMyProfileAction` の実装構造を直接複製し、テーブル名と列名のみを置き換える。

---

## 重要な修正点 (D-14 の型不整合)

**CONTEXT.md D-14 は `member_id (BIGINT, FK → members.id)` と記載しているが、実際の `members.id` は UUID PRIMARY KEY DEFAULT gen_random_uuid()。**

`supabase/schema.sql` の確認結果:
```sql
CREATE TABLE IF NOT EXISTS members (
  id  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
)
```

`member_id` は `UUID` で定義しなければ FK 制約が通らない。Plan 01 の DDL では必ず `member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE` を使うこと。

[VERIFIED: supabase/schema.sql 直接確認]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DB migration (CREATE TABLE + RLS) | Database/Storage | — | 純粋な DDL。アプリコード無し |
| `member_commit_slots` 読み取り | Frontend Server (SSR) | — | page.tsx Server Component が SELECT し props で渡す |
| スロット保存 (delete + insert) | API / Backend | — | `updateCommitSlotsAction` は `'use server'`、admin client で実行 |
| モーダル開閉 + 動的スロット行 | Browser / Client | — | `useState` で管理。CommitScheduleModal は `'use client'` |
| 重複曜日バリデーション | Browser / Client | — | onChange で即時フィードバック。サーバー往復不要 |
| RLS 認可 | Database/Storage | API / Backend | DB ポリシーが最終防壁。Server Action は admin client で RLS バイパス後、user_id スコープで本人確認 |

---

## Standard Stack

### Core (外部パッケージ追加なし)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.105.4 | DB クエリ (admin client) | 既存。全 Server Action で使用中 |
| `@supabase/ssr` | ^0.10.3 | Cookie ベース認証クライアント | 既存。`createSupabaseServerClient` で使用中 |
| Next.js | 16.2.6 | Server Component + Server Action + `revalidatePath` | 既存。App Router 確立済み |
| React | 19.2.4 | `useActionState`, `useState` | 既存。`MyProfileForm.tsx` で確立済み |
| Tailwind CSS | ^4 | モーダルスタイル (fixed overlay, bg-orange-500 等) | 既存。CSS ライブラリは Tailwind 一本 |

[VERIFIED: package.json 直接確認]

### Supporting

このフェーズで新規にインストールするパッケージはゼロ。

---

## Package Legitimacy Audit

> このフェーズでは外部パッケージを新規インストールしない。既存スタックのみを使用。

パッケージ追加なし — audit 不要。

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser]
  CommitScheduleModal ('use client')
    useState: isOpen, frequency, slots[]
    onChange: duplicate-day validation
    "宣言する" → form action → updateCommitSlotsAction
                                      |
[Next.js Server Action layer]         v
  updateCommitSlotsAction('use server')
    1. createSupabaseServerClient → auth.getUser() → user_id
    2. createSupabaseAdminClient → members.select('id').eq('user_id', ...) → member.id
    3. admin.from('member_commit_slots').delete().eq('member_id', member.id)
    4. admin.from('member_commit_slots').insert([{member_id, day_of_week, hour}, ...])
    5. revalidatePath('/my')
    6. return null | error string
                                      |
[Supabase PostgreSQL]                 v
  member_commit_slots (RLS enabled)
    SELECT: public (all) or anon
    INSERT/DELETE: service_role (admin client bypasses RLS)
    RLS write policy: member_id = auth.uid() の members.id (plan-timeで設計)

[/my page.tsx Server Component]
  SELECT member_commit_slots WHERE member_id = member.id
  → initialSlots props → CommitScheduleModal
```

### Recommended Project Structure

```
src/app/my/
├── page.tsx              # Server Component — member_commit_slots SELECT + CommitScheduleModal 配置を追加
├── MyProfileForm.tsx     # Client Component — 既存。変更なし
├── CommitScheduleModal.tsx  # NEW: Client Component ('use client')
├── actions.ts            # updateCommitSlotsAction を追加
├── LinkMemberForm.tsx    # 既存。変更なし
└── __tests__/
    ├── updateMyProfileAction.test.ts  # 既存
    ├── page.test.tsx                  # 既存
    └── updateCommitSlotsAction.test.ts  # NEW: phase 28 追加

supabase/
├── schema.sql            # CREATE TABLE member_commit_slots + RLS + policy を追加
└── migrations/
    ├── 20260531000000_consolidated_schema.sql  # 既存
    ├── 20260602000000_add_substack_handle.sql  # 既存
    └── 20260602000001_add_member_commit_slots.sql  # NEW
```

### Pattern 1: Server Action — delete + insert 全置換

`updateMyProfileAction` の `member_teams` 処理から直接転用:

```typescript
// Source: src/app/my/actions.ts (既存パターン — member_teams delete+insert)
// 同じパターンを member_commit_slots に適用

// DELETE フェーズ
const { error: deleteError } = await admin
  .from('member_commit_slots')
  .delete()
  .eq('member_id', member.id)
if (deleteError) {
  console.error('[updateCommitSlots] delete:', deleteError)
  return '保存に失敗しました。もう一度お試しください'
}

// INSERT フェーズ (slots が空の場合は INSERT をスキップ)
if (slots.length > 0) {
  const { error: insertError } = await admin
    .from('member_commit_slots')
    .insert(slots.map(s => ({ member_id: member.id, day_of_week: s.day_of_week, hour: s.hour })))
  if (insertError) {
    console.error('[updateCommitSlots] insert:', insertError)
    return '保存に失敗しました。もう一度お試しください'
  }
}

revalidatePath('/my')
return null
```

[VERIFIED: src/app/my/actions.ts 直接確認 — member_teams パターン]

### Pattern 2: useActionState + Server Action フォーム

`MyProfileForm.tsx` から直接転用:

```typescript
// Source: src/app/my/MyProfileForm.tsx (既存パターン)
'use client'
import { useActionState } from 'react'
import { updateCommitSlotsAction } from './actions'

const [state, formAction, isPending] = useActionState(updateCommitSlotsAction, null)

// state が非 null の場合はエラー表示
{state && <p role="alert" className="text-sm text-red-600">{state}</p>}

// 送信ボタン
<button
  type="submit"
  disabled={isPending}
  className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
>
  {isPending ? '宣言中...' : '宣言する'}
</button>
```

[VERIFIED: src/app/my/MyProfileForm.tsx 直接確認]

### Pattern 3: Server Action のシグネチャ

```typescript
// Source: src/app/my/actions.ts — updateMyProfileAction のシグネチャを踏襲
'use server'
export async function updateCommitSlotsAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null>
```

FormData から slots を取り出す方法の設計注意点:
- `<form>` の hidden input で JSON 文字列として渡すか、個別 input の配列として渡すかをPlanで決定する必要がある
- 推奨: `<input type="hidden" name="slots" value={JSON.stringify(slots)}/>` — シンプルで型安全

[VERIFIED: src/app/my/actions.ts 直接確認]

### Pattern 4: Migration ファイルの形式

```sql
-- Source: supabase/migrations/20260602000000_add_substack_handle.sql (直近 migration)
BEGIN;

-- Phase 28: add member_commit_slots for commit schedule
CREATE TABLE IF NOT EXISTS member_commit_slots (
  id           BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id    UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_of_week  INT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour         INT     NOT NULL CHECK (hour BETWEEN 0 AND 23)
);

ALTER TABLE member_commit_slots ENABLE ROW LEVEL SECURITY;

-- public SELECT (既存テーブルパターンと同一)
CREATE POLICY "public select member_commit_slots"
  ON member_commit_slots FOR SELECT USING (true);

-- 本人のみ書き込み可 (D-18)
-- admin client (service_role) は BYPASSRLS のため INSERT/DELETE は実質 service_role が行う。
-- ここでは authenticated ユーザーが直接操作する経路（将来対応）のためのポリシーも定義しておく。
CREATE POLICY "member write own commit slots"
  ON member_commit_slots
  FOR ALL
  USING (
    member_id = (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id = (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

COMMIT;
```

[VERIFIED: supabase/migrations/20260602000000_add_substack_handle.sql + 20260531000000_consolidated_schema.sql 直接確認]

### Pattern 5: page.tsx への member_commit_slots SELECT 追加

```typescript
// Source: src/app/my/page.tsx (既存クエリパターンを踏襲)

// 既存の member SELECT の後に追加:
const { data: commitSlotsData } = await admin
  .from('member_commit_slots')
  .select('id, day_of_week, hour')
  .eq('member_id', member.id)  // ← member.id が必要 (既存の member クエリから取得)
  .order('day_of_week')

const commitSlots = commitSlotsData ?? []

// JSX:
<div className="mt-8">
  <h2 className="text-sm font-semibold mb-2">投稿スケジュール</h2>
  <CommitScheduleModal memberId={member.id} initialSlots={commitSlots} />
</div>
```

**注意:** 現在の `page.tsx` は `member` から `id` を SELECT していない。`member_commit_slots` を取得するには `members` クエリに `id` を追加する必要がある。

[VERIFIED: src/app/my/page.tsx 直接確認 — 現在のクエリに `id` が含まれていないことを確認]

### Anti-Patterns to Avoid

- **FormData で個別 input を多数定義する:** `slots[0][day_of_week]`, `slots[0][hour]` のような命名は Server Action での parse が複雑。JSON hidden input 一本の方がシンプル
- **useActionState を使わずに fetch/axios で POST する:** 既存パターンに反する。useActionState + form action で統一
- **モーダルの開閉を page.tsx に持ち上げる:** D-06 で明確に禁止。CommitScheduleModal の useState で完結させる
- **member.id を page.tsx で取得せずに CommitScheduleModal に渡す:** member_commit_slots の INSERT に member_id が必要。page.tsx のクエリで `id` を SELECT することを忘れない

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| フォーム送信状態管理 | カスタム isLoading state + fetch | `useActionState` (React 19 組み込み) | 既にコードベースで確立済み。Progressive Enhancement が自動適用される |
| SQL UPSERT ロジック | ON CONFLICT DO UPDATE | DELETE + INSERT (D-17 で確定済み) | member_teams で実証済みパターン。シンプルで予測可能 |
| モーダルライブラリ | headlessui, radix-ui Dialog 等 | Tailwind CSS 手書き (div + role="dialog") | shadcn_initialized: false。外部ライブラリ禁止 |
| アクセシビリティ管理 | カスタムフォーカストラップ実装 | role="dialog" + aria-modal + onKeyDown (Escape) | UI-SPEC で要件として明記。ライブラリ不要の最小実装 |

---

## Runtime State Inventory

> このフェーズは新規テーブル追加（グリーンフィールド追加）であり、リネーム/リファクタではない。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | member_commit_slots は未存在 | migration で CREATE TABLE |
| Live service config | Supabase prod インスタンス (xolhjcngrwwwqtklmoyk) にテーブル未存在 | migration SQL を SQL Editor で適用 |
| OS-registered state | なし | なし |
| Secrets/env vars | SUPABASE_SERVICE_ROLE_KEY — 変更なし | なし |
| Build artifacts | なし | なし |

---

## Common Pitfalls

### Pitfall 1: members.id の型不一致 (UUID vs BIGINT)

**What goes wrong:** CONTEXT.md D-14 が `member_id (BIGINT, FK → members.id)` と記載しているが、実際の `members.id` は UUID。BIGINT で定義すると FK 制約エラーで migration が失敗する。
**Why it happens:** D-14 の記載ミス（おそらくサロゲート PK の例を参照した際の誤記）。
**How to avoid:** migration DDL では `member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE` を使う。
**Warning signs:** `ERROR: foreign key constraint "member_commit_slots_member_id_fkey" cannot be implemented` → 型を UUID に修正

[VERIFIED: supabase/schema.sql 直接確認]

### Pitfall 2: page.tsx クエリに `id` カラムが含まれていない

**What goes wrong:** 現在の `page.tsx` は `members` から `name, publication_id, substack_handle, member_teams(...)` を SELECT しており `id` を含まない。`member_commit_slots` の SELECT に `member.id` が必要だが、型エラーまたは実行時エラーになる。
**Why it happens:** これまで `id` を UI に露出する必要がなかった。
**How to avoid:** page.tsx の members クエリに `id` を追加する。TypeScript の型推論が自動的に `member.id: string` を認識する。
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'id')` at runtime

[VERIFIED: src/app/my/page.tsx 直接確認]

### Pitfall 3: Server Action の FormData からのスロット配列 parse

**What goes wrong:** `formData.getAll('slots')` が `FormDataEntryValue[]` を返す。JSON.parse を忘れると文字列のまま DB に挿入しようとする。
**Why it happens:** FormData はすべての値を文字列で扱う。
**How to avoid:** `JSON.parse(formData.get('slots') as string)` で parse し、`z.array(...)` またはシンプルな型ガードで検証する。
**Warning signs:** TypeScript エラー `Type 'string' is not assignable to type 'number'` for `day_of_week`

### Pitfall 4: RLS ポリシーと admin client の組み合わせ

**What goes wrong:** Server Action で `createSupabaseAdminClient` (service_role) を使う場合、RLS は BYPASSRLS により無効化される。認可は Server Action 内の `auth.getUser()` → `user_id` スコープで実装する必要がある（DB の RLS に頼れない）。
**Why it happens:** service_role は PostgreSQL の BYPASSRLS 権限を持つ。
**How to avoid:** `updateMyProfileAction` の既存パターン通り — `auth.getUser()` で user を取得し、`.eq('user_id', user.id)` で members を引いてから member_commit_slots を操作する。直接 `member_id` を FormData から受け取って信頼してはいけない。
**Warning signs:** member_id をクライアントから受け取り、そのまま INSERT するコード

[VERIFIED: src/app/my/actions.ts 既存実装パターン確認]

### Pitfall 5: supabase/schema.sql と migrations/ の非同期

**What goes wrong:** migration ファイルのみ追加して `schema.sql` を更新し忘れると、新規 DB のブートストラップ（`schema.sql` を SQL Editor で実行）が `member_commit_slots` を作らない。
**Why it happens:** Phase 26 で確立された「schema.sql は最終状態のミラー」ルールを見落とす。
**How to avoid:** Plan 01 に `schema.sql` への `CREATE TABLE member_commit_slots` 追加タスクを含める。
**Warning signs:** TEST プロジェクトで `/my` ページが `member_commit_slots` テーブルなしで動作している

[VERIFIED: .planning/STATE.md Phase 26 P02 メモ + supabase/migrations/20260531000000_consolidated_schema.sql 確認]

### Pitfall 6: モーダルで useActionState の `formAction` を `<form action={formAction}>` ではなく手動呼び出しする

**What goes wrong:** `formAction(prevState, formData)` を直接呼び出すと Next.js の Server Action バインディングが壊れる。
**Why it happens:** モーダルで「成功時にモーダルを閉じる」ロジックを追加したいため、手動で呼び出したくなる。
**How to avoid:** `useActionState` の第三引数 `isPending` + state 変化を `useEffect` で監視してモーダルを閉じる。または `startTransition` を使う。具体的には: `useEffect(() => { if (state === null && !isPending) setIsOpen(false) }, [state, isPending])`

---

## Code Examples

### 曜日サマリーテキスト生成

```typescript
// UI-SPEC 28-UI-SPEC.md より — summaryテキスト生成ロジック
const DAY_LABELS: Record<number, string> = {
  1: '月曜', 2: '火曜', 3: '水曜', 4: '木曜',
  5: '金曜', 6: '土曜', 7: '日曜'
}

function formatSummary(slots: { day_of_week: number; hour: number }[]): string {
  const sorted = [...slots].sort((a, b) => a.day_of_week - b.day_of_week)
  const parts = sorted.map(s => `${DAY_LABELS[s.day_of_week]} ${s.hour}:00`)
  return `週${slots.length}回 — ${parts.join('、')}`
}
// 出力例: "週2回 — 月曜 8:00、水曜 20:00"
```

### 重複曜日バリデーション (Client Component)

```typescript
// onChange ハンドラで使用
function hasDuplicateDays(slots: { day_of_week: number }[]): boolean {
  const days = slots.map(s => s.day_of_week)
  return new Set(days).size !== days.length
}
```

### Escape キーでモーダルを閉じる

```typescript
// overlay div の onKeyDown に設定
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="commit-schedule-modal-title"
  onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false) }}
  // ...
>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (React-DOM) | `useActionState` (React 19 core) | React 19.0 (2024) | インポート元が `react` に変更。コードベース既に対応済み |
| `supabase db push` での migration 適用 | `schema.sql` を SQL Editor で適用 (新規 DB) / migration ファイルは incremental のみ | Phase 26 P02 で確立 | 新規 DB は必ず `schema.sql` → `migrations/*.sql` の順で適用 |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.6 |
| Config file | `vitest.config.ts` (include: `src/**/*.{test,spec}.{ts,tsx}`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | frequency select 1〜4 で slots 配列が増減する | unit | `npm test -- updateCommitSlotsAction` | Wave 0 で作成 |
| SCHED-02 | day_of_week + hour が正しく FormData から parse される | unit | `npm test -- updateCommitSlotsAction` | Wave 0 で作成 |
| SCHED-03 | updateCommitSlotsAction が delete+insert を実行し null を返す | unit | `npm test -- updateCommitSlotsAction` | Wave 0 で作成 |
| SCHED-03 | 未認証時に auth エラー文字列を返す | unit | `npm test -- updateCommitSlotsAction` | Wave 0 で作成 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/my/__tests__/updateCommitSlotsAction.test.ts` — SCHED-01, SCHED-02, SCHED-03 のユニットテスト (updateMyProfileAction.test.ts の mock 構造を転用)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `createSupabaseServerClient` → `auth.getUser()` — 既存パターン |
| V3 Session Management | no | Cookie セッションは Supabase SSR が管理。このフェーズで変更なし |
| V4 Access Control | yes | Server Action 内で user_id → member.id を解決。クライアントから member_id を受け取らない |
| V5 Input Validation | yes | `day_of_week` は 1〜7、`hour` は 0〜23 の範囲チェック。DB の CHECK 制約がバックストップ |
| V6 Cryptography | no | このフェーズで暗号化操作なし |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| member_id なりすまし | Tampering | Server Action で `auth.getUser()` → members テーブルで user_id 照合。FormData の member_id を直接信頼しない |
| 範囲外の day_of_week / hour | Tampering | DB CHECK 制約 + Server Action 内バリデーション |
| 大量スロット INSERT | Denial of Service | Server Action で `slots.length <= 4` を検証 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | 全タスク | ✓ | 推定 >= 18 | — |
| Supabase CLI | migration 適用 (SQL Editor) | SQL Editor 経由のため不要 | — | SQL Editor で手動実行 |
| Supabase (prod) | Plan 01 migration 適用 | ✓ | xolhjcngrwwwqtklmoyk | — |
| Supabase (test) | Plan 02 テスト実行 | ✓ | otydhiumsdsyxepnjqjp (Phase 26 で確立) | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 本フェーズでは `supabase db push` を使わず SQL Editor で migration を手動適用する | Architecture Patterns / Pattern 4 | CI/CD が設定されている場合はコマンドが異なる可能性あり。ただし STATE.md に明記済みのため LOW リスク |
| A2 | `useEffect(() => { if (state === null && !isPending) setIsOpen(false) })` で成功時のモーダルクローズが実装できる | Common Pitfalls / Pitfall 6 | React 19 の useActionState の state 更新タイミングによっては初期レンダー時に誤作動する可能性。`useRef` で初回スキップが必要かもしれない |

---

## Open Questions

1. **updateCommitSlotsAction の FormData からのスロット受け渡し方法**
   - What we know: FormData は文字列のみ扱える。`slots` は配列（複数の day_of_week + hour ペア）
   - What's unclear: JSON 一本の hidden input か、複数 input の配列形式か — Plan で決定が必要
   - Recommendation: `<input type="hidden" name="slots" value={JSON.stringify(slots)} />` で JSON 一本渡し。parse は Server Action 内で `JSON.parse(formData.get('slots') as string)` + 型ガード

2. **schema.sql と migration ファイルの両方を更新する必要があること**
   - What we know: Phase 26 P02 で「新規 DB は schema.sql が正典」と確立済み
   - What's unclear: Plan 01 に schema.sql 更新タスクが明示されていない場合、見落とされる可能性
   - Recommendation: Plan 01 に schema.sql 更新を独立タスクとして含める

---

## Sources

### Primary (HIGH confidence)

- `supabase/schema.sql` — members.id が UUID であることを確認
- `src/app/my/actions.ts` — updateMyProfileAction の実装パターン (delete+insert, string|null 返り値)
- `src/app/my/MyProfileForm.tsx` — useActionState パターン
- `src/app/my/page.tsx` — Server Component のクエリ構造
- `supabase/migrations/20260602000000_add_substack_handle.sql` — 直近 migration の形式 (BEGIN/COMMIT)
- `supabase/migrations/20260531000000_consolidated_schema.sql` — RLS ポリシーパターン
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — Vitest mock 構造
- `vitest.config.ts` — テスト設定 (include: src/**)
- `package.json` — 依存関係一覧
- `.planning/config.json` — nyquist_validation: true 確認

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` Phase 26 P02 — schema.sql ブートストラップルール
- `.planning/phases/28-db-my/28-CONTEXT.md` — 全実装決定事項
- `.planning/phases/28-db-my/28-UI-SPEC.md` — UI コンポーネント仕様

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json で直接確認
- Architecture: HIGH — 既存コードベースのパターンを直接読んで確認
- DB DDL: HIGH (一部 MEDIUM) — schema.sql 確認済み。RLS ポリシー構文は established パターンを踏襲
- Pitfalls: HIGH — コードベース直接調査に基づく

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (30 日間 — Next.js 16 + React 19 は安定バージョン)
