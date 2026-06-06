---
phase: 31-login-fix
plan: 03
subsystem: frontend + admin-backend
tags: [tdd, substack-handle, admin, read-only, publication-id, unique-constraint]

requires:
  - "31-01: members.substack_handle UNIQUE 制約が存在する"
  - "31-02: callback D-02 で substack_handle が DB に保存済み、handle= パラメータ廃止"
provides:
  - "D-03: /my ページで substack_handle 設定済みなら読み取り専用表示 + 未設定ケースのみ入力フィールド"
  - "D-04: admin 編集行に substack_handle / new_publication_id 入力フィールド + confirm ダイアログ"
  - "D-04: updateMemberAction が substack_handle / new_publication_id を FormData から読み取り updateMember に渡す"
  - "D-04: updateMember が substackHandle → substack_handle / publicationId → publication_id を DB UPDATE"
  - "D-04: publication_id 変更時に articles テーブルを連動 UPDATE"
  - "D-05: updateMemberAction が 23505 エラーを検出して 'このハンドルはすでに使用されています' を返す"
affects: []

tech-stack:
  added: []
  patterns:
    - "TDD RED→GREEN: テストファイル先行作成 (Test 5 GREEN, Test 1-4 RED) → 実装で全 GREEN"
    - "vi.hoisted() パターン: vi.mock ファクトリ内変数 hoisting 対応"
    - "substackHandle?: string | null 型拡張: nullable DB カラムを型に反映"
    - "Partial<Omit<Member, 'id'>> シグネチャ: updateMember で publicationId も更新可能"

key-files:
  created:
    - src/app/admin/__tests__/updateMemberAction.test.ts
  modified:
    - src/lib/members.ts
    - src/lib/types.ts
    - src/app/admin/actions.ts
    - src/app/admin/AdminMemberList.tsx
    - src/app/my/MyProfileForm.tsx
    - src/app/my/page.tsx
    - src/app/my/__tests__/page.test.tsx
    - src/app/member/[publicationId]/page.tsx

key-decisions:
  - "Member.substackHandle を string | null | undefined に拡張 — DB の nullable TEXT カラムを正確に反映"
  - "addMember シグネチャを Omit<Member,'addedAt'|'id'> に変更 — id は DB 自動生成のため呼び出し元が指定不要"
  - "page.test.tsx の substackHandleDefault テストを D-03 仕様に合わせ更新 — handle URL param フォールバック廃止が breaking change"

patterns-established:
  - "admin.from('articles').update({ publication_id }).eq('publication_id', oldId) による publication_id 連動更新パターン"

requirements-completed:
  - AUTH-FIX-01

duration: ~6min
completed: 2026-06-05
---

# Phase 31 Plan 03 Summary

**フロントエンド 2 箇所 + admin バックエンド 3 箇所を修正 — D-03 substack_handle 読み取り専用化、D-04 admin 編集フィールド追加、D-05 23505 エラーハンドリング**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-06-05
- **Tasks:** 3 (全て auto + TDD x2)
- **Files modified:** 8 src (1 新規テスト + 7 実装/テスト更新)

## Accomplishments

- `updateMemberAction.test.ts` を新規作成 — 5 テスト (TDD RED→GREEN サイクル)
- `lib/members.ts` `updateMember` を D-04 対応に拡張: `substackHandle` / `publicationId` → DB UPDATE + articles 連動 UPDATE
- `admin/actions.ts` `updateMemberAction` を D-04/D-05 対応に拡張: FormData から `substack_handle` / `new_publication_id` を読み取り + 23505 エラーハンドリング
- `AdminMemberList.tsx` に `name="substack_handle"` と `name="new_publication_id"` 入力フィールド追加 + confirm ダイアログ追加
- `MyProfileForm.tsx` を D-03 対応: `substackHandle != null` → 読み取り専用 `<p>` タグ表示、`null` → `<input>` 表示
- `my/page.tsx` を D-03 対応: `substackHandle` を DB 値のみから取得（handle URL パラメータ廃止）
- 全 116 テスト GREEN

## Task Commits

1. **Task 1: TDD RED + members.ts D-04** — `cfb3987` — updateMemberAction.test.ts 新規作成 (Test 5 GREEN, Test 1-4 RED) + members.ts 拡張
2. **Task 2: TDD GREEN — D-04/D-05 実装** — `c14eb90` — actions.ts + AdminMemberList.tsx 修正 (全 5 テスト GREEN)
3. **Task 3: D-03 実装** — `bb90605` — MyProfileForm.tsx + my/page.tsx 修正 + 関連型修正

## Files Created/Modified

- `src/app/admin/__tests__/updateMemberAction.test.ts` — 新規: 5 テスト (TDD)
- `src/lib/members.ts` — updateMember シグネチャ変更 + substackHandle/publicationId 対応 + articles 連動 UPDATE
- `src/lib/types.ts` — Member.substackHandle を `string | null | undefined` に拡張 + addMember シグネチャ修正
- `src/app/admin/actions.ts` — substack_handle/new_publication_id FormData 読み取り + 23505 ハンドリング
- `src/app/admin/AdminMemberList.tsx` — handle/publicationId(edit) 列追加 + confirm ダイアログ
- `src/app/my/MyProfileForm.tsx` — substackHandle 条件分岐レンダリング
- `src/app/my/page.tsx` — substackHandle DB 直接取得 (URL param 廃止)
- `src/app/my/__tests__/page.test.tsx` — D-03 仕様変更に合わせてテスト更新
- `src/app/member/[publicationId]/page.tsx` — substackHandle ?? undefined (CalendarGrid 互換)

## Decisions Made

- `Member.substackHandle` を `string | null | undefined` に拡張 — DB の nullable TEXT カラムを正確に型で表現するため。`null` は「設定されていない（フォールバックケース）」、`undefined` は「未取得」と意味が異なる
- `addMember` シグネチャを `Omit<Member,'addedAt'|'id'>` に変更 — id は UUID として DB が自動生成するため、呼び出し元が id を指定する必要はない（今回の変更でこの不整合が顕在化）
- `page.test.tsx` の `substackHandleDefault` テストを D-03 仕様に合わせて更新 — handle URL param フォールバック廃止は破壊的変更。D-02 で callback 時に DB 保存済みのため、フォールバック不要

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Member 型の substackHandle が null を許容しない型不整合**
- **Found during:** Task 3
- **Issue:** `Member.substackHandle?: string` は `string | undefined` のみ受け入れる。`updateMemberAction` が `substack_handle: null` を渡すと TypeScript エラー TS2322
- **Fix:** `Member.substackHandle?: string | null` に変更。CalendarGrid の呼び出し元 (`member/[publicationId]/page.tsx`) では `?? undefined` でフォールバック
- **Files modified:** `src/lib/types.ts`, `src/app/member/[publicationId]/page.tsx`
- **Commit:** bb90605

**2. [Rule 1 - Bug] addMember が id を必須とする型エラー TS2345**
- **Found during:** Task 3
- **Issue:** `Member.id: string` が必須のため `Omit<Member, 'addedAt'>` にも id が含まれ、addMember 呼び出し時に id を渡さないとエラー
- **Fix:** `addMember` の引数型を `Omit<Member, 'addedAt' | 'id'>` に変更
- **Files modified:** `src/lib/members.ts`
- **Commit:** bb90605

**3. [Rule 1 - Bug] page.test.tsx の substackHandleDefault テストが D-03 変更で壊れる**
- **Found during:** Task 3
- **Issue:** `substackHandleDefault` → `substackHandle` へのリネームと handle URL param フォールバック廃止により、既存の 2 テストが失敗
- **Fix:** テストを D-03 の仕様（DB 値のみ使用、URL param フォールバックなし）に合わせて更新
- **Files modified:** `src/app/my/__tests__/page.test.tsx`
- **Commit:** bb90605

## Known Stubs

なし — 全ての実装はプランに定義された仕様を完全に実装済み。

## Threat Surface Scan

T-31-08, T-31-09, T-31-10, T-31-11 (plan threat model に定義済み) を全て対応済み:
- T-31-08: requireAdmin() で user.role !== 'admin' を確認。throw で早期終了 → '権限がありません'（既存）
- T-31-09: UI で入力フィールドを非表示。updateMyProfileAction は user_id スコープで UPDATE（設定済み handle の上書きは admin のみ可能）
- T-31-10: publication_id 変更時に articles.publication_id を連動 UPDATE + confirm ダイアログで誤操作防止
- T-31-11: accept 済み (admin 画面は authenticated admin のみアクセス可能)

新規のネットワークエンドポイント・auth パス・スキーマ変更なし。

## Self-Check

File existence:
- [x] src/app/admin/__tests__/updateMemberAction.test.ts
- [x] src/lib/members.ts (modified)
- [x] src/lib/types.ts (modified)
- [x] src/app/admin/actions.ts (modified)
- [x] src/app/admin/AdminMemberList.tsx (modified)
- [x] src/app/my/MyProfileForm.tsx (modified)
- [x] src/app/my/page.tsx (modified)
- [x] src/app/my/__tests__/page.test.tsx (modified)
- [x] src/app/member/[publicationId]/page.tsx (modified)

Commit existence:
- [x] cfb3987 (TDD RED + members.ts D-04)
- [x] c14eb90 (TDD GREEN D-04/D-05)
- [x] bb90605 (D-03)

Test results: 116 passed / 0 failed

## Self-Check: PASSED

---
*Phase: 31-login-fix*
*Completed: 2026-06-05*
