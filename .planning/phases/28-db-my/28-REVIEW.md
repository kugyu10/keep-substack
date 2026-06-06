---
phase: 28-db-my
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/20260602000001_add_member_commit_slots.sql
  - supabase/schema.sql
  - src/app/my/__tests__/updateCommitSlotsAction.test.ts
  - src/app/my/CommitScheduleModal.tsx
  - src/app/my/actions.ts
  - src/app/my/page.tsx
  - src/app/my/__tests__/page.test.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-06-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 28 の実装は `member_commit_slots` テーブルの DB マイグレーション、Server Action、React クライアントコンポーネント（CommitScheduleModal）、/my ページ RSC、および対応ユニットテストで構成される。全体的な構造は既存パターンに準拠しており、認証・RLS の基本設計は適切。ただし以下の問題を検出した:

- **Critical**: Server Action のバリデーションが型チェック不足で細工した JSON により整数制約を迂回可能。delete→insert が非トランザクションであるため部分失敗でデータロストが発生。DB 側に (member_id, day_of_week) のユニーク制約がなく重複行が挿入可能。
- **Warning**: モーダルの閉じるロジックが保存成功後でも`initialSlots`の古い値を表示し続ける UI 不整合。`hasDuplicateDays` の警告が表示されても送信をブロックしない。テストのモック構造が delete チェーン深度を誤っており deleteError ケースが未テスト。`memberId` プロパティが受け取りながら未使用。
- **Info**: `schema.sql` に `member_commit_slots` の RLS ポリシーが migration と重複定義。テストファイルに残留 TODO コメント。`as any` キャストが page.tsx に複数存在。

---

## Critical Issues

### CR-01: Server Action の JSON バリデーションが型チェック不足 — 浮動小数点・非整数を通過させる

**File:** `src/app/my/actions.ts:134-137`
**Issue:**
`JSON.parse(rawSlots)` 後の検証は `day_of_week` と `hour` の範囲のみチェックする。`Number.isInteger()` チェックがないため、`{"day_of_week": 1.5, "hour": 8.9}` のような値が範囲チェックを通過し DB に INSERT される。`hour BETWEEN 0 AND 23` の DB CHECK 制約は PostgreSQL が浮動小数点を暗黙キャストするため `1.5` は通過してしまう（BIGINT 型の id とは異なり INT は `1.5` を `1` へ truncate する）。これにより DB に想定外の値が格納される。また各スロット要素が object かどうかのチェックも行われていないため `[null]` や `[1]` など非オブジェクト配列を渡すと後続の `s.day_of_week` アクセスで実行時エラーになる。

**Fix:**
```typescript
if (!Array.isArray(slots) || slots.length > 4) return '不正なスロット数です'
for (const s of slots) {
  if (
    typeof s !== 'object' || s === null ||
    !Number.isInteger(s.day_of_week) || !Number.isInteger(s.hour)
  ) return 'スロットデータが不正です'
  if (s.day_of_week < 1 || s.day_of_week > 7) return '曜日の値が不正です'
  if (s.hour < 0 || s.hour > 23) return '時刻の値が不正です'
}
```

---

### CR-02: delete → insert が非トランザクションのため、insert 失敗時にスロットが全消去される

**File:** `src/app/my/actions.ts:156-174`
**Issue:**
`updateCommitSlotsAction` は以下の順序で 2 回の DB 操作を行う:
1. `DELETE ... WHERE member_id = ?`
2. `INSERT ...`

DELETE が成功して INSERT が失敗した場合（ネットワーク断、制約違反等）、エラーメッセージを返すが DELETE はロールバックされない。ユーザーの既存スケジュールデータが消失し、リトライしても元のデータは復元不可能。Supabase JS クライアントは `BEGIN/COMMIT` をラップした rpc を呼ぶ方法がないため、「先に insert してから delete」の順序逆転か、DB 側の FUNCTION + RPC で原子性を担保する必要がある。

**Fix:**
insert を先に実行する "insert then delete" パターンか、Supabase の `rpc` で DB 関数として実装する:

```typescript
// 方法1: insert → delete の順番に逆転 (insert 失敗時は delete 未実行のまま)
if (slots.length > 0) {
  const { error: insertError } = await admin
    .from('member_commit_slots')
    .insert(slots.map(s => ({ member_id: member.id, day_of_week: s.day_of_week, hour: s.hour })))
  if (insertError) {
    console.error('[updateCommitSlots] insert:', insertError)
    return '保存に失敗しました。もう一度お試しください'
  }
}
const { error: deleteError } = await admin
  .from('member_commit_slots')
  .delete()
  .eq('member_id', member.id)
  // ただしこれも完全ではない。確実にするには DB 側の replace 関数が必要。
```

最も確実な実装は DB 関数として `replace_commit_slots(p_member_id, p_slots)` を作成し、1 トランザクションで DELETE + INSERT を行う方法。

---

### CR-03: `member_commit_slots` テーブルに `(member_id, day_of_week)` のユニーク制約がなく重複行が挿入可能

**File:** `supabase/migrations/20260602000001_add_member_commit_slots.sql:4-9`  
**File (same issue):** `supabase/schema.sql:57-62`

**Issue:**
テーブル定義に `(member_id, day_of_week)` のユニーク制約がない。Server Action のバリデーションは `hasDuplicateDays` を UI 上で警告するが、サーバー側では同一 `day_of_week` の重複チェックを行わない（`slots.length > 4` チェックのみ）。また UI の警告は送信をブロックしない（後述 WR-02）。そのため同じ曜日に複数行が INSERT 可能で、読み取り時の挙動が不定になる。

**Fix:**

migration ファイルに以下を追加:
```sql
ALTER TABLE member_commit_slots
  ADD CONSTRAINT uq_member_commit_slots_day
  UNIQUE (member_id, day_of_week);
```

また schema.sql の定義にも同様の制約を追加:
```sql
CREATE TABLE IF NOT EXISTS member_commit_slots (
  id           BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id    UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_of_week  INT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour         INT     NOT NULL CHECK (hour BETWEEN 0 AND 23),
  UNIQUE (member_id, day_of_week)
);
```

---

## Warnings

### WR-01: モーダル保存成功後にトリガー表示が古い `initialSlots` を使い続ける（UI 不整合）

**File:** `src/app/my/CommitScheduleModal.tsx:88-108`
**Issue:**
閉じた後の「サマリー表示」は `formatSummary(initialSlots)` を使っている（106行目）。保存が成功してモーダルが閉じると RSC の `revalidatePath('/my')` によりページが再レンダリングされるが、クライアントコンポーネントの `initialSlots` prop が更新される前の短い間、古い値が表示される。さらに Next.js の Router Cache によりページ再取得が遅延した場合、保存前のスケジュールが長時間表示され続ける可能性がある。保存後は `slots` 状態変数（更新済みの値）を使って表示するか、`revalidatePath` + `router.refresh()` で確実に再取得を促すべき。

**Fix:**
```tsx
// isOpen===false の表示部分で initialSlots の代わりに保存済みの slots state を使う
// ただし初回は initialSlots と同期しているため問題ない
// 保存後は useEffect で slots を更新する方法が最も確実
```
あるいは、表示部分を別のサーバーコンポーネントに切り出して RSC の再レンダリングにより自動更新させる設計が望ましい。

---

### WR-02: 重複曜日の警告が表示されても送信ボタンがブロックされない

**File:** `src/app/my/CommitScheduleModal.tsx:194-208`
**Issue:**
`hasDuplicateDays(slots)` が true のとき「同じ曜日を複数選択しています」という警告を表示するが、submit ボタンは `disabled={isPending}` のみで重複チェックの結果に関係なく常に有効。CR-03 の DB ユニーク制約が追加されれば INSERT エラーで跳ね返されるが、その場合ユーザーへのエラーメッセージが一般的な「保存に失敗しました」になる。UX 上はクライアント側でもブロックするべき。

**Fix:**
```tsx
<button
  type="submit"
  disabled={isPending || showDuplicateWarning}
  className="..."
>
```

---

### WR-03: テストのモック `deleteSpy` が実際の呼び出しチェーンと深度不一致

**File:** `src/app/my/__tests__/updateCommitSlotsAction.test.ts:41-43`
**Issue:**
実際の Server Action は `admin.from('member_commit_slots').delete().eq('member_id', member.id)` という呼び出しチェーンを使う（actions.ts:157-159）。テストのモックでは `deleteSpy` を `{ eq: async () => ({...}) }` と定義しているが、`deleteSpy` 自体は `vi.fn()` として呼ばれる。つまりモックは `delete()` → `.eq()` の 2 段チェーンを正確に再現している。

しかし `deleteError` を渡してもテスト内でその分岐を検証するテストケースが存在しない。`deleteError` を設定した際に関数が正しくエラーメッセージを返すかテストされていないため、delete 失敗パスはカバーされていない。

**Fix:**
以下のテストを追加:
```typescript
it('delete エラー時は "保存に失敗しました..." を返す', async () => {
  setupAdminMock({ deleteError: { message: 'db error' } })
  const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
  expect(result).toBe('保存に失敗しました。もう一度お試しください')
})
```

---

### WR-04: `CommitScheduleModal` の `memberId` プロパティが受け取られているが完全に未使用

**File:** `src/app/my/CommitScheduleModal.tsx:34`
**Issue:**
`CommitScheduleModal` コンポーネントは `memberId` を props として受け取るが、`_memberId` として即座に破棄している。現状の設計では Server Action が自身で `auth.uid()` から `member.id` を解決するため不要だが、将来的に使用する意図があるのか、あるいは設計上の混乱があるのかが不明。もし不要であればインターフェースから削除すべき。残す場合は命名を `_memberId` ではなく実際に使用するか、型にコメントを付ける。

**Fix:**
削除する場合:
```typescript
// CommitScheduleModalProps から memberId を削除
interface CommitScheduleModalProps {
  initialSlots: { id: number; day_of_week: number; hour: number }[]
}

// page.tsx の呼び出し側も修正
<CommitScheduleModal initialSlots={commitSlots} />
```

---

### WR-05: `updateCommitSlotsAction` の insert 失敗テストが `insertError` を未検証

**File:** `src/app/my/__tests__/updateCommitSlotsAction.test.ts`
**Issue:**
`setupAdminMock` は `insertError` オプションを受け取るが、insert 失敗時（`insertError` 設定）のテストケースが 6 件中 1 件も存在しない。insert エラーパスの動作が未保証。

**Fix:**
```typescript
it('insert エラー時は "保存に失敗しました..." を返す', async () => {
  setupAdminMock({ insertError: { message: 'db error' } })
  const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
  expect(result).toBe('保存に失敗しました。もう一度お試しください')
})
```

---

## Info

### IN-01: `schema.sql` と migration の RLS ポリシーが重複定義

**File:** `supabase/schema.sql:91-102`
**File (same issue):** `supabase/migrations/20260602000001_add_member_commit_slots.sql:13-26`

**Issue:**
`schema.sql` は新規環境のフルセットアップ用で、migration は増分適用用という役割分担（MEMORY.md に記載）は正しい。ただし両ファイルに同一のポリシー定義が存在する。schema.sql 側は `DROP POLICY IF EXISTS` なしで `CREATE POLICY` しているため、migration 適用済みの環境に schema.sql を再適用しようとするとポリシー名の重複エラーになる。schema.sql に `DROP POLICY IF EXISTS` を追加するか、各 CREATE POLICY を `CREATE POLICY IF NOT EXISTS` にする（PG 9.5 以降は IF NOT EXISTS 非対応なため DROP IF EXISTS + CREATE が標準的）。

**Fix:**
`schema.sql` の各 `CREATE POLICY` 前に対応する `DROP POLICY IF EXISTS` を追加:
```sql
DROP POLICY IF EXISTS "public select member_commit_slots" ON member_commit_slots;
CREATE POLICY "public select member_commit_slots"
  ON member_commit_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "member write own commit slots" ON member_commit_slots;
CREATE POLICY "member write own commit slots"
  ...
```

---

### IN-02: テストファイルに残留 TODO コメント

**File:** `src/app/my/__tests__/updateCommitSlotsAction.test.ts:26`
**Issue:**
`// TODO: implement in Plan 02` というコメントが `import` 文の直前に残留している。実装は完了しているため、このコメントは不要であり混乱を招く。

**Fix:**
該当行を削除する。

---

### IN-03: `page.tsx` に `as any` キャストが複数存在

**File:** `src/app/my/page.tsx:32,50,56,83`
**Issue:**
Supabase の `.select()` クエリ結果に対して `as any[]`、`as any` が 4 箇所で使われている。Supabase が自動生成する型定義（`database.types.ts`）を使えばこれらのキャストは不要になる。現状ではコンパイル時の型安全が失われており、スキーマ変更時に型エラーが発生しない。

**Fix:**
`supabase gen types typescript` で型定義を生成し、Supabase クライアントの型パラメータとして使用する:
```typescript
import { Database } from '@/types/database.types'
const admin = createSupabaseAdminClient<Database>()
```

---

_Reviewed: 2026-06-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
