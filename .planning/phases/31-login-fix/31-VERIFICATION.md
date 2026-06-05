---
phase: 31-login-fix
verified: 2026-06-05T22:20:00Z
status: gaps_found
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "実環境での Magic Link フロー — 招待リンク経由ログイン（member 未存在ケース）"
    expected: "リンクをクリック → 認証完了 → /my にリダイレクト → DB に member レコードが自動作成されている"
    why_human: "Supabase メール送信・OTP コード生成は実 DB 環境でのみ確認可能。ユニットテストではモックで代替済み"
  - test: "substack_handle 重複でのフォールバック動作"
    expected: "既存の handle と同じ handle を持つ招待リンクでログインした場合、substack_handle=null で member が作成され /my にリダイレクトされる"
    why_human: "DB の UNIQUE 制約は実 DB 環境でのみ検証可能。23505 発生条件は live Supabase でのみ再現できる"
  - test: "セッション切れ・再ログイン時のリダイレクト"
    expected: "再ログイン後も /my に正しくリダイレクトされ、既存の member レコードへの user_id 紐付けが正しく機能する"
    why_human: "Supabase セッション状態は実環境でのみ確認可能"
---

# Phase 31: ログインフロー修正 — 検証レポート

**Phase Goal:** Magic Link ログインフローにおいて、pid/handle を持つ招待リンク経由でログインしたユーザーが DB に存在しない場合でも自動的に member レコードが作成される。また substack_handle は callback 時に自動設定され、admin のみが変更できる状態になる。
**Verified:** 2026-06-05T22:20:00Z
**Status:** human_needed
**Re-verification:** No — 初回検証

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | pid/handle 両方必須。欠けた URL から Magic Link を送ろうとすると「登録リンクが不正です」が返る | VERIFIED | `actions.ts` line 17: `if (!pid \|\| !handle) return '登録リンクが不正です'`。テスト Test 1/2 GREEN |
| 2 | callback で pid に一致する member が存在しない場合、新規 member が INSERT されて /my にリダイレクトされる | VERIFIED | `callback/route.ts` lines 33-53: `else if (!member)` ブロックで INSERT 実行。Test A GREEN |
| 3 | 新規 member INSERT 時に substack_handle の unique 違反（23505）が起きた場合、substack_handle=null でフォールバック INSERT が実行される | VERIFIED | `callback/route.ts` lines 45-50: `if (insertError?.code === '23505')` でフォールバック INSERT。Test B GREEN |
| 4 | callback のリダイレクト先が /my になっている（handle= パラメータなし） | VERIFIED | `callback/route.ts` line 57: `return NextResponse.redirect(new URL('/my', origin))` |
| 5 | updateMyProfileAction で substack_handle 更新時に 23505 が返ると「このハンドルはすでに使用されています」が返る | VERIFIED | `my/actions.ts` lines 70-72: `if (updateError?.code === '23505') { return 'このハンドルはすでに使用されています' }`。Test D GREEN |
| 6 | /my ページで substack_handle 設定済みの場合、読み取り専用表示になり入力フィールドは表示されない | VERIFIED | `MyProfileForm.tsx` line 52: `{substackHandle != null ? (` で条件分岐、設定済みケースは `<p>` タグ表示 + 「Substack ハンドルは変更できません」 |
| 7 | /my ページで substack_handle が null の場合のみ入力フィールドが表示される | VERIFIED | `MyProfileForm.tsx` lines 59-70: null ケースで `<input>` 表示 |
| 8 | /my ページの substackHandle は DB 値のみから取得される（URL パラメータのフォールバックは廃止） | VERIFIED | `my/page.tsx` line 50: `const substackHandle = (member as any)?.substack_handle ?? null` |
| 9 | admin 画面の編集行に substack_handle と publication_id の入力フィールドが表示される | VERIFIED | `AdminMemberList.tsx` line 76: `name="substack_handle"`、line 84: `name="new_publication_id"` |
| 10 | admin が substack_handle を更新すると members.substack_handle が DB に保存される。admin の updateMemberAction で 23505 が返ると「このハンドルはすでに使用されています」が返る | VERIFIED | `admin/actions.ts` line 86: `substackHandle: substack_handle`、line 93: `return 'このハンドルはすでに使用されています'`。Test 1/4 GREEN |
| 11 | admin が publication_id を変更すると articles.publication_id も連動更新され、確認ダイアログが表示される | VERIFIED | `members.ts` lines 110-117: articles 連動 UPDATE。`AdminMemberList.tsx` lines 24-27: `window.confirm` ダイアログ |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | 期待内容 | Status | 詳細 |
|----------|---------|--------|------|
| `supabase/migrations/20260605000000_add_substack_handle_unique.sql` | substack_handle UNIQUE 制約追加 DDL | VERIFIED | `members_substack_handle_key` 制約を `IF NOT EXISTS` 付きで追加 |
| `supabase/schema.sql` | substack_handle TEXT UNIQUE | VERIFIED | line 16: `substack_handle TEXT UNIQUE` |
| `src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts` | D-01 pid/handle バリデーションテスト | VERIFIED | 4 テスト存在、「登録リンクが不正です」を含む |
| `src/app/login-51cf21389c56/actions.ts` | D-01 pid/handle バリデーション実装 | VERIFIED | `登録リンクが不正です` 含む、line 17 |
| `src/app/auth/callback/route.ts` | D-02 新規 member INSERT + 23505 フォールバック | VERIFIED | `23505` コード検出とフォールバック INSERT 実装済み |
| `src/app/my/actions.ts` | D-05 updateMyProfileAction 23505 ハンドリング | VERIFIED | `このハンドルはすでに使用されています` 含む、line 71 |
| `src/app/my/MyProfileForm.tsx` | D-03 substackHandle 条件付きレンダリング | VERIFIED | `substackHandle != null` による分岐、「変更できません」テキスト含む |
| `src/app/my/page.tsx` | D-03 substackHandle DB 値直接取得 | VERIFIED | `substackHandle={substackHandle}` で props 渡し |
| `src/app/admin/AdminMemberList.tsx` | D-04 substack_handle / new_publication_id 入力フィールド + confirm | VERIFIED | `name="substack_handle"` と `name="new_publication_id"` の input 存在 |
| `src/app/admin/actions.ts` | D-04/D-05 updateMemberAction 拡張 | VERIFIED | FormData から `substack_handle` / `new_publication_id` 読み取り + 23505 ハンドリング |
| `src/lib/members.ts` | D-04 updateMember substackHandle/publicationId 対応 + articles 連動 | VERIFIED | `substackHandle` → `substack_handle`、articles 連動 UPDATE 実装 |
| `src/app/admin/__tests__/updateMemberAction.test.ts` | D-04/D-05 admin テスト | VERIFIED | 5 テスト存在、「このハンドルはすでに使用されています」を含む |

---

## Key Link Verification

| From | To | Via | Status | 詳細 |
|------|-----|-----|--------|------|
| `sendMagicLinkAction` | `auth/callback/route.ts` | callbackUrl に pid + handle を付与 | WIRED | line 23: `encodeURIComponent(pid)` + `encodeURIComponent(handle)` |
| `auth/callback/route.ts` | members テーブル | admin.from('members').insert() + 23505 フォールバック | WIRED | lines 43-52: INSERT + `insertError?.code === '23505'` チェック |
| `AdminMemberList.tsx` | `admin/actions.ts` | handleUpdate → updateMemberAction(publicationId, formData) | WIRED | line 38: `updateMemberAction(publicationId, formData)` |
| `admin/actions.ts` | `src/lib/members.ts` | updateMember(publicationId, { substackHandle, publicationId: new_publication_id }) | WIRED | lines 82-88: updateMember 呼び出し、substackHandle と publicationId を渡す |
| `src/lib/members.ts` | articles テーブル | admin.from('articles').update({ publication_id }).eq('publication_id', oldId) | WIRED | lines 112-116: articles 連動 UPDATE |

---

## Data-Flow Trace (Level 4)

| Artifact | データ変数 | Source | 実データ生成 | Status |
|----------|---------|--------|------------|--------|
| `MyProfileForm.tsx` | `substackHandle` | `my/page.tsx` → DB `members.substack_handle` | `admin.from('members').select(...).eq('user_id', user.id)` | FLOWING |
| `AdminMemberList.tsx` | `members` | props（page.tsx 経由） | `getMembers()` → `members` テーブル全件取得 | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---------|---------|--------|--------|
| 全テスト pass | `npx vitest run` | 116 passed / 0 failed | PASS |
| TypeScript コンパイル | `npx tsc --noEmit` | 5 件のエラーは全て `saveArticles.test.ts`（Phase 31 変更ファイル外） | PASS |
| `登録リンクが不正です` in actions.ts | `grep "登録リンクが不正です" src/app/login-51cf21389c56/actions.ts` | line 17 で確認 | PASS |
| `23505` in callback/route.ts | `grep "23505" src/app/auth/callback/route.ts` | line 45 で確認 | PASS |
| `このハンドルはすでに使用されています` in my/actions.ts | `grep "このハンドルは" src/app/my/actions.ts` | line 71 で確認 | PASS |
| `このハンドルはすでに使用されています` in admin/actions.ts | `grep "このハンドルは" src/app/admin/actions.ts` | line 93 で確認 | PASS |

---

## Probe Execution

Step 7c: SKIPPED — フェーズにプローブスクリプトは定義されていない。

---

## Requirements Coverage

| Requirement | Source Plan | 説明 | Status | 証拠 |
|-------------|------------|------|--------|------|
| AUTH-FIX-01 | 31-01, 31-02, 31-03 | Magic Link ログインフロー修正（5サブ問題すべて） | SATISFIED | RESEARCH.md で定義。ROADMAP.md Phase 31 に記載。REQUIREMENTS.md には未記載だが、これはバグフィックス専用要件として ROADMAP で管理されている設計的意図に基づく |

### 注記: REQUIREMENTS.md への AUTH-FIX-01 未記載について

AUTH-FIX-01 は `REQUIREMENTS.md` に存在しないが、`ROADMAP.md` の Phase 31 セクション（line 223）および `RESEARCH.md` に定義されており、孤立した要件ではない。REQUIREMENTS.md は v1.7 の機能要件のみを管理し、バグフィックス専用フェーズの要件は ROADMAP レベルで管理する設計的分離と判断する。この分離は意図的な可能性が高く、BLOCKER ではなく INFO として記録する。

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/lib/__tests__/saveArticles.test.ts` | 36, 39, 54, 57 | TypeScript エラー TS2493, TS2352 | INFO | Phase 31 変更ファイル外。既存テストファイルのエラーであり Phase 31 の変更による劣化ではない |

Phase 31 で変更された全ファイルにスタブパターン（TBD/FIXME/XXX/placeholder）は検出されなかった。

---

## Human Verification Required

### 1. 実環境での Magic Link フロー — 招待リンク経由ログイン（member 未存在ケース）

**Test:** 新規招待リンク（`/login-51cf21389c56?pid=testpid&handle=@testhoge`）にアクセスし、メールアドレスを入力して Magic Link を送信。受信したリンクをクリックする。
**Expected:** セッションが確立され `/my` にリダイレクトされる。Supabase ダッシュボードで `members` テーブルに `publication_id=testpid, substack_handle=@testhoge` の新規レコードが作成されている。
**Why human:** Supabase メール送信・OTP コード生成は実 DB 環境でのみ確認可能。ユニットテストではモックで代替済み。

### 2. substack_handle 重複でのフォールバック動作

**Test:** 既存メンバーと同じ `handle` を持つ招待リンク（例: `?pid=newpid&handle=@existinghandle`）で Magic Link ログインを試行する。
**Expected:** ログインが成功し、`members` テーブルに `publication_id=newpid, substack_handle=null` のレコードが作成される（handle 欄は空）。
**Why human:** DB の UNIQUE 制約 `members_substack_handle_key` は live Supabase でのみ 23505 を発生させられる。ユニットテスト（Test B）はモックで動作確認済み。

### 3. セッション切れ・再ログイン時のリダイレクト（ROADMAP SC-3）

**Test:** 既存 member ユーザーがセッション切れ後に再ログインを試みる。
**Expected:** ログイン後に `/my` にリダイレクトされ、既存の member レコードへの user_id 紐付けが維持されている（UPDATE パスが正しく動作する）。
**Why human:** Supabase セッション状態管理は実環境でのみ確認可能。

---

## Gaps Summary

### Gap G-01: 既存メンバーが pid/handle なしで再ログインできない

**UAT テスト 3 が FAILED。**

D-01 で `sendMagicLinkAction` が `!pid || !handle` を必須バリデーションとしたため、クエリパラメータなしの URL（例: `/login-51cf21389c56` 直アクセス）では Magic Link を送信できなくなった。既存メンバーが招待リンクを手元に持っていない場合にログイン不可となる。

**影響:** 既存メンバーのすべての再ログインが阻害される（招待リンク保持者のみログイン可能という意図外の制限）。

**解決方針（ユーザー確認済み）:** ログインページを 2 つに分離する
- `/login` — 既存メンバー専用（メールアドレスのみ、pid/handle 不要）
- `/login-51cf21389c56?pid={id}&handle={handle}` — 新規招待専用（pid/handle 必須、member 自動作成）

**Gap closure:** `/gsd:plan-phase 31 --gaps` で gap closure プランを作成してください。

---

_Verified: 2026-06-05T22:20:00Z_
_Verifier: Claude (gsd-verifier)_
