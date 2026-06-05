---
phase: 31-login-fix
verified: 2026-06-06T08:40:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/11
  gaps_closed:
    - "G-01: 既存メンバーが pid/handle なしで再ログインできない — /login ページ新規作成 + signin-51cf21389c56 リネームにより解消"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "実環境での Magic Link フロー — 招待リンク（/signin-51cf21389c56）経由ログイン（member 未存在ケース）"
    expected: "新規招待リンクをクリック → 認証完了 → /my にリダイレクト → DB に member レコードが自動作成されている"
    why_human: "Supabase メール送信・OTP コード生成は実 DB 環境でのみ確認可能"
  - test: "substack_handle 重複でのフォールバック動作"
    expected: "既存の handle と同じ handle を持つ招待リンクでログインした場合、substack_handle=null で member が作成され /my にリダイレクトされる"
    why_human: "DB の UNIQUE 制約は live Supabase でのみ 23505 を発生させられる"
  - test: "既存メンバーの再ログイン — /login ページ経由（G-01 修正の UAT 再確認）"
    expected: "既存メンバーが /login にメールアドレスのみ入力して Magic Link を送信 → ログイン後 /my にリダイレクトされる"
    why_human: "Supabase セッション状態管理は実環境でのみ確認可能"
---

# Phase 31: ログインフロー修正 — 検証レポート（再検証）

**Phase Goal:** Magic Link ログインフローの不具合を調査・修正し、メンバーが確実にログインできる状態にする
**Verified:** 2026-06-06T08:40:00Z
**Status:** human_needed
**Re-verification:** Yes — G-01 gap closure（Plan 04）後の再検証

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | pid/handle 両方必須の招待ページ（signin-51cf21389c56）から Magic Link を送ろうとすると「登録リンクが不正です」が返る | VERIFIED | `signin-51cf21389c56/actions.ts` line 17: `if (!pid \|\| !handle) return '登録リンクが不正です'`。テスト Test 1/2 GREEN |
| 2 | callback で pid に一致する member が存在しない場合、新規 member が INSERT されて /my にリダイレクトされる | VERIFIED | `callback/route.ts` lines 33-53: `else if (!member)` ブロックで INSERT 実行。Test A GREEN |
| 3 | 新規 member INSERT 時に substack_handle の unique 違反（23505）が起きた場合、substack_handle=null でフォールバック INSERT が実行される | VERIFIED | `callback/route.ts` lines 45-50: `if (insertError?.code === '23505')` でフォールバック INSERT。Test B GREEN |
| 4 | callback のリダイレクト先が /my になっている（handle= パラメータなし） | VERIFIED | `callback/route.ts` line 57: `return NextResponse.redirect(new URL('/my', origin))` |
| 5 | updateMyProfileAction で substack_handle 更新時に 23505 が返ると「このハンドルはすでに使用されています」が返る | VERIFIED | `my/actions.ts` line 71: `if (updateError?.code === '23505') return 'このハンドルはすでに使用されています'`。Test D GREEN |
| 6 | /my ページで substack_handle 設定済みの場合、読み取り専用表示になり入力フィールドは表示されない | VERIFIED | `MyProfileForm.tsx` line 52: `{substackHandle != null ? (` で条件分岐。設定済みケースは `<p>` タグ表示 + 「Substack ハンドルは変更できません」 |
| 7 | /my ページで substack_handle が null の場合のみ入力フィールドが表示される | VERIFIED | `MyProfileForm.tsx` null ケースで `<input>` 表示 |
| 8 | /my ページの substackHandle は DB 値のみから取得される（URL パラメータのフォールバックは廃止） | VERIFIED | `my/page.tsx` line 50: `const substackHandle = (member as any)?.substack_handle ?? null` |
| 9 | admin 画面の編集行に substack_handle と publication_id の入力フィールドが表示される | VERIFIED | `AdminMemberList.tsx`: `name="substack_handle"` と `name="new_publication_id"` の input 存在 |
| 10 | admin が substack_handle を更新すると members.substack_handle が DB に保存される。admin の updateMemberAction で 23505 が返ると「このハンドルはすでに使用されています」が返る | VERIFIED | `admin/actions.ts` line 93: `return 'このハンドルはすでに使用されています'`。Test 1/4 GREEN |
| 11 | admin が publication_id を変更すると articles.publication_id も連動更新され、確認ダイアログが表示される | VERIFIED | `members.ts` lines 110-116: articles 連動 UPDATE。`AdminMemberList.tsx` lines 24-27: `window.confirm` ダイアログ |
| 12 | 既存メンバーが /login にメールアドレスのみ入力して Magic Link を送信できる（pid/handle 不要）| VERIFIED | `src/app/login/actions.ts` に pid/handle の読み取り・バリデーションなし。`grep -c "pid\|handle" login/actions.ts` → 0 件。Test L-1 GREEN |
| 13 | /login の sendMagicLinkAction は callbackUrl を /auth/callback のみに設定する（pid/handle パラメータなし） | VERIFIED | `login/actions.ts` line 17: `const callbackUrl = \`${origin}/auth/callback\``。Test L-2 GREEN（`not.toContain('pid=')` / `not.toContain('handle=')` 確認済み） |
| 14 | 新規招待ページが /signin-51cf21389c56?pid={id}&handle={handle} として引き続き機能する | VERIFIED | `src/app/signin-51cf21389c56/` が存在し 4 ファイルを含む。`login-51cf21389c56/` は削除済み。4 テスト GREEN |

**Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact | 期待内容 | Status | 詳細 |
|----------|---------|--------|------|
| `supabase/migrations/20260605000000_add_substack_handle_unique.sql` | substack_handle UNIQUE 制約追加 DDL | VERIFIED | `members_substack_handle_key` 制約を DO/IF NOT EXISTS 付きで追加 |
| `supabase/schema.sql` | substack_handle TEXT UNIQUE | VERIFIED | line 16: `substack_handle TEXT UNIQUE` |
| `src/app/signin-51cf21389c56/__tests__/sendMagicLinkAction.test.ts` | D-01 pid/handle バリデーションテスト（git mv 後） | VERIFIED | 4 テスト存在、「登録リンクが不正です」を含む。全 GREEN |
| `src/app/signin-51cf21389c56/actions.ts` | D-01 pid/handle バリデーション実装（招待専用） | VERIFIED | `登録リンクが不正です` 含む、line 17 |
| `src/app/login/actions.ts` | 既存メンバー再ログイン用 — email のみ、/auth/callback へのリダイレクト | VERIFIED | pid/handle コードなし（grep 0 件）。callbackUrl は `/auth/callback` のみ |
| `src/app/login/LoginForm.tsx` | hidden input（pid/handle）なし、メールアドレス入力のみ | VERIFIED | hidden input なし。`role="alert"` エラー表示あり |
| `src/app/login/page.tsx` | 既存メンバー向けログインページ | VERIFIED | searchParams なし、セッションあり → `/my` リダイレクト |
| `src/app/login/__tests__/sendMagicLinkAction.test.ts` | /login の action テスト（4 件） | VERIFIED | Test L-1〜L-4 存在・GREEN |
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
| `signin-51cf21389c56/actions.ts` | `auth/callback/route.ts` | callbackUrl に pid + handle を付与 | WIRED | line 23: `encodeURIComponent(pid)` + `encodeURIComponent(handle)` |
| `login/actions.ts` | `auth/callback/route.ts` | callbackUrl を /auth/callback のみ（パラメータなし）に設定 | WIRED | line 17: `/auth/callback` のみ。Test L-2 で `not.toContain('pid=')` 確認 |
| `login/LoginForm.tsx` | `login/actions.ts` | `useActionState(sendMagicLinkAction)` | WIRED | LoginForm.tsx line 7: `useActionState(sendMagicLinkAction, null)` |
| `auth/callback/route.ts` | members テーブル | admin.from('members').insert() + 23505 フォールバック | WIRED | lines 41-52: INSERT + `insertError?.code === '23505'` チェック |
| `AdminMemberList.tsx` | `admin/actions.ts` | handleUpdate → updateMemberAction(publicationId, formData) | WIRED | AdminMemberList.tsx で `updateMemberAction(publicationId, formData)` 呼び出し |
| `admin/actions.ts` | `src/lib/members.ts` | updateMember(publicationId, { substackHandle, publicationId }) | WIRED | actions.ts: updateMember 呼び出し、substackHandle と publicationId を渡す |
| `src/lib/members.ts` | articles テーブル | admin.from('articles').update({ publication_id }).eq('publication_id', oldId) | WIRED | members.ts lines 112-116: articles 連動 UPDATE |

---

## Data-Flow Trace (Level 4)

| Artifact | データ変数 | Source | 実データ生成 | Status |
|----------|---------|--------|------------|--------|
| `MyProfileForm.tsx` | `substackHandle` | `my/page.tsx` → DB `members.substack_handle` | `admin.from('members').select(...).eq('user_id', user.id)` | FLOWING |
| `AdminMemberList.tsx` | `members` | props（page.tsx 経由） | `getMembers()` → `members` テーブル全件取得 | FLOWING |
| `login/LoginForm.tsx` | `state` | `useActionState(sendMagicLinkAction)` | email → signInWithOtp → `'SENT'` または エラー文字列 | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---------|---------|--------|--------|
| 全テスト pass | `npx vitest run` | 120 passed / 0 failed | PASS |
| TypeScript コンパイル | `npx tsc --noEmit` | saveArticles.test.ts 以外の新規エラー 0 件 | PASS |
| `/login` テスト | `npx vitest run src/app/login/__tests__/...` | 4 passed | PASS |
| `/signin-51cf21389c56` テスト | `npx vitest run src/app/signin-51cf21389c56/__tests__/...` | 4 passed | PASS |
| `登録リンクが不正です` in signin actions.ts | `grep` | line 17 で確認 | PASS |
| `pid/handle` コード in login/actions.ts | `grep -c "pid\|handle"` | 0 件 | PASS |
| `23505` in callback/route.ts | `grep "23505"` | line 45 で確認 | PASS |
| `login-51cf21389c56/` が存在しない | `ls src/app/login-51cf21389c56/` | No such file or directory | PASS |

---

## Probe Execution

Step 7c: SKIPPED — フェーズにプローブスクリプトは定義されていない。

---

## Requirements Coverage

| Requirement | Source Plan | 説明 | Status | 証拠 |
|-------------|------------|------|--------|------|
| AUTH-FIX-01 | 31-01, 31-02, 31-03, 31-04 | Magic Link ログインフロー修正（5サブ問題すべて + G-01 再ログイン修正） | SATISFIED | RESEARCH.md で定義。ROADMAP.md Phase 31 に記載。バグフィックス専用要件として ROADMAP レベルで管理（REQUIREMENTS.md は v1.7 機能要件のみ管理する設計的分離） |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/lib/__tests__/saveArticles.test.ts` | 36, 39, 54, 57 | TypeScript エラー TS2493, TS2352 | INFO | Phase 31 変更ファイル外。既存テストファイルのエラーであり Phase 31 の変更による劣化ではない |

Phase 31 で変更・作成された全ファイルにスタブパターン（TBD/FIXME/XXX/placeholder）は検出されなかった。

---

## Human Verification Required

### 1. 実環境での Magic Link フロー — 招待リンク（/signin-51cf21389c56）経由ログイン（member 未存在ケース）

**Test:** 新規招待リンク（`/signin-51cf21389c56?pid=testpid&handle=@testhoge`）にアクセスし、メールアドレスを入力して Magic Link を送信。受信したリンクをクリックする。
**Expected:** セッションが確立され `/my` にリダイレクトされる。Supabase ダッシュボードで `members` テーブルに `publication_id=testpid, substack_handle=@testhoge` の新規レコードが作成されている。
**Why human:** Supabase メール送信・OTP コード生成は実 DB 環境でのみ確認可能。ユニットテストではモックで代替済み。

### 2. substack_handle 重複でのフォールバック動作

**Test:** 既存メンバーと同じ `handle` を持つ招待リンク（例: `?pid=newpid&handle=@existinghandle`）で Magic Link ログインを試行する。
**Expected:** ログインが成功し、`members` テーブルに `publication_id=newpid, substack_handle=null` のレコードが作成される（handle 欄は空）。
**Why human:** DB の UNIQUE 制約 `members_substack_handle_key` は live Supabase でのみ 23505 を発生させられる。ユニットテスト（Test B）はモックで動作確認済み。

### 3. 既存メンバーの再ログイン — /login ページ経由（G-01 修正の UAT 再確認）

**Test:** 既存メンバーが `/login` にアクセスし、メールアドレスのみ入力して Magic Link を送信。受信したリンクをクリックする。
**Expected:** ログイン後に `/my` にリダイレクトされ、既存の member レコードへの user_id 紐付けが維持されている。UAT テスト 3「既存メンバーの再ログイン時リダイレクト」が PASS になる。
**Why human:** Supabase セッション状態管理は実環境でのみ確認可能。G-01 fix の実環境での最終確認。

---

## Re-verification Summary

### 前回 (2026-06-05T22:20:00Z) からの変更

**Closed Gap:**
- **G-01:** 既存メンバーが pid/handle なしで再ログインできない問題を Plan 04 で解消済み。`src/app/login-51cf21389c56/` を `src/app/signin-51cf21389c56/` に git mv でリネームし、`src/app/login/` を新規作成（email のみ、pid/handle 不要）。

**追加されたスコア:**
- 前回: 11/11（全 VERIFIED、ただし G-01 gap で gaps_found）
- 今回: 14/14（Plan 04 の 3 must-have を追加検証）

**ステータス変化:** `gaps_found` → `human_needed`（G-01 ギャップが解消され、残るのは実環境テストのみ）

---

_Verified: 2026-06-06T08:40:00Z_
_Verifier: Claude (gsd-verifier)_
