---
phase: 27-substack-handle-db
verified: 2026-06-08T00:00:00Z
status: verified
score: 10/10 must-haves verified
overrides_applied: 0
human_verification_status: passed (本番 6/6 PASS — Phase 36-03 手動 UAT, 2026-06-08)
human_verification:
  - test: "Visit /my when logged in — confirm @handle input renders below name field with placeholder '@yourhandle'"
    expected: "Input field with id=substack_handle, label 'Substack ハンドル', placeholder '@yourhandle', hint text '例: @yourname — 入力すると個人ページからプロフィールへのリンクが作成されます' appears below the name field"
    why_human: "Server-rendered page with auth state cannot be exercised by static grep; requires a live login session"
  - test: "Enter 'hoge' (no @) in the handle field, save, reload /my — confirm input shows '@hoge'"
    expected: "Saved value is persisted to DB with @ prefix; on reload the field pre-fills with '@hoge' from the DB value"
    why_human: "Requires live Supabase write and subsequent fetch cycle; not exercisable by static analysis"
  - test: "Visit /member/[publicationId] for a member whose substack_handle is set — click the name/avatar"
    expected: "https://substack.com/@handle opens in a new browser tab"
    why_human: "Requires live DB row with substack_handle set and real browser navigation"
  - test: "Visit /member/[publicationId] for a member with substack_handle=null — confirm name/avatar has no link"
    expected: "Name/avatar renders as a plain div with no anchor; no pointer cursor"
    why_human: "Requires a live member row with null substack_handle"
  - test: "Navigate to /login-…/?handle=hoge, complete Magic Link flow — confirm /my pre-fills @handle input with 'hoge'"
    expected: "/my page loads with substackHandleDefault='hoge' in the handle input when the user's DB substack_handle is null"
    why_human: "Full Magic Link round-trip requires live email delivery and Supabase auth callback, not automatable by grep"
  - test: "Apply supabase/migrations/20260602000000_add_substack_handle.sql to live Supabase instance"
    expected: "SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle' returns 1 row; existing member rows show NULL for substack_handle"
    why_human: "Migration applied to code but not confirmed against live DB instances (production and TEST); requires SQL Editor access per Plan 01 instructions"
---

# Phase 27: Substack Handle — DB + Profile Link Verification Report

**Phase Goal:** `members` テーブルに `substack_handle` カラムを追加し、/my ページから登録・個人マンスリービューからプロフィールリンクを実装する
**Verified:** 2026-06-08T00:00:00Z（human verification 完了で再確定）
**Status:** verified
**Re-verification:** Yes — 2026-06-08 に Phase 36-03 手動 UAT で 6 件の human verification をすべて本番で PASS させ human_needed → verified に確定

## Goal Achievement

### Observable Truths

All 10 must-have truths are verified at the code level. Six items require human/live-environment confirmation (live DB apply, E2E user flows).

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `members` テーブルに `substack_handle TEXT NULL` カラムが存在する | VERIFIED (code) | `supabase/schema.sql` line 16: `substack_handle TEXT` inside `CREATE TABLE members`; `supabase/migrations/20260602000000_add_substack_handle.sql`: `ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT` in BEGIN/COMMIT |
| 2 | 既存の `members` 行は `substack_handle = NULL` のまま影響を受けない | VERIFIED (code) | Migration uses `ADD COLUMN IF NOT EXISTS` with no DEFAULT and no NOT NULL constraint — existing rows receive NULL per PostgreSQL default |
| 3 | `schema.sql` と `migrations/` の両方が同一の DDL を持ち同期されている | VERIFIED | Both files contain `substack_handle TEXT`; schema.sql uses inline column, migration uses `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| 4 | `Member` 型に `substackHandle?: string` が追加されている | VERIFIED | `src/lib/types.ts` line 15: `substackHandle?: string` |
| 5 | `getMembers()` が `substack_handle` を SELECT して `Member.substackHandle` にマップする | VERIFIED | `src/lib/members.ts` SELECT includes `substack_handle`; mapper: `substackHandle: m.substack_handle ?? undefined` |
| 6 | `/my` ページで `@handle` を入力・保存できる（D-01, D-02, D-03）| VERIFIED (code) | `MyProfileForm.tsx`: input `id=substack_handle`, `name=substack_handle`, `placeholder="@yourhandle"`; `actions.ts`: extracts, normalizes (trim + @-prefix or null), saves via `.update({ name, substack_handle })` |
| 7 | 保存後に `/my` を再ロードすると `@handle` 入力欄に保存した値が表示される（D-06）| VERIFIED (code) | `page.tsx` computes `substackHandleDefault = (member as any)?.substack_handle ?? handle ?? undefined`; DB value takes priority |
| 8 | 個人マンスリービューの名前/アイコンが `substack.com/@handle` を新タブで開く（PROF-02）| VERIFIED (code) | `CalendarGrid.tsx`: `substackHandle` prop added to Props; `avatarNameBlock` extracted; conditional `<a href={'https://substack.com/' + substackHandle} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80">`; `member/[publicationId]/page.tsx` passes `substackHandle={memberResult.member.substackHandle}` |
| 9 | `substack_handle` が null の場合は名前/アイコンが静的表示のまま（PROF-02 フォールバック）| VERIFIED (code) | `CalendarGrid.tsx` line 63: `{substackHandle ? (<a>...</a>) : avatarNameBlock}` — when `substackHandle` is undefined/null, renders the div unwrapped |
| 10 | `/login-…/?handle=hoge` → Magic Link → `/my?handle=hoge` → DB null 時のみ pre-fill（D-04, D-05, D-06）| VERIFIED (code) | `LoginForm.tsx`: hidden input for handle; `actions.ts`: callbackUrl builds all four combinations (pid+handle, pid-only, handle-only, neither); `callback/route.ts`: `const myRedirectPath = handle ? '/my?handle=' + encodeURIComponent(handle) : next`; `page.tsx`: DB-wins logic |

**Score:** 10/10 truths verified (code-level)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/schema.sql` | `substack_handle TEXT` in CREATE TABLE members | VERIFIED | Line 16; idempotent CREATE TABLE IF NOT EXISTS |
| `supabase/migrations/20260602000000_add_substack_handle.sql` | `ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT` in BEGIN/COMMIT | VERIFIED | 6 lines; wraps single ALTER in BEGIN/COMMIT; comment line present |
| `src/lib/types.ts` | `substackHandle?: string` in Member type | VERIFIED | Line 15 |
| `src/lib/members.ts` | `substack_handle` in SELECT + `substackHandle` in mapper | VERIFIED | Lines 13, 28 |
| `src/app/my/actions.ts` | `substack_handle` extracted, normalized, included in `.update()` | VERIFIED | Lines 50-51, 64 |
| `src/app/my/MyProfileForm.tsx` | `@handle` input block with `substackHandleDefault` defaultValue | VERIFIED | Lines 53-63; label, input, hint all present as specified |
| `src/app/my/page.tsx` | `searchParams: Promise<{handle?}>`, `substackHandleDefault` computed, passed to form | VERIFIED | Lines 8, 13, 48, 67 |
| `src/app/auth/callback/route.ts` | `handle` extracted; `myRedirectPath` with `encodeURIComponent` | VERIFIED | Lines 9, 36-37 |
| `src/app/login-51cf21389c56/LoginForm.tsx` | `handle?: string` prop; hidden input | VERIFIED | Lines 6, 23 |
| `src/app/login-51cf21389c56/actions.ts` | `callbackUrl` built with all four pid/handle combinations | VERIFIED | Lines 14, 20-28 |
| `src/components/CalendarGrid.tsx` | `substackHandle?: string` prop; `avatarNameBlock` extracted; conditional `<a>` wrapper | VERIFIED | Lines 13, 44-59, 63-74 |
| `src/app/member/[publicationId]/page.tsx` | `substackHandle={memberResult.member.substackHandle}` passed to CalendarGrid | VERIFIED | Line 55 |
| `src/lib/__tests__/members.test.ts` | NEW: mapper + type acceptance tests | VERIFIED | 4 tests — all passing |
| `src/app/auth/__tests__/callback.test.ts` | NEW: 3 handle-forwarding tests | VERIFIED | 3 tests — all passing |
| `src/components/__tests__/CalendarGrid.test.tsx` | NEW: 3 profile link tests | VERIFIED | 3 tests — all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/members.ts` | `src/lib/types.ts` | `Member` type `substackHandle` field | WIRED | `import type { Member }` at line 2; `substackHandle: m.substack_handle ?? undefined` at line 28 |
| `src/app/member/[publicationId]/page.tsx` | `src/components/CalendarGrid.tsx` | `substackHandle` prop | WIRED | `substackHandle={memberResult.member.substackHandle}` at line 55; `memberResult.member` is `Member` from `getMembers()` |
| `src/app/auth/callback/route.ts` | `src/app/my/page.tsx` | `?handle=` query param in redirect URL | WIRED | `'/my?handle=' + encodeURIComponent(handle)` at line 36; page.tsx receives `handle` from `searchParams` at line 13 |
| `src/app/login-51cf21389c56/LoginForm.tsx` | `src/app/login-51cf21389c56/actions.ts` | hidden input `name=handle` → `formData.get('handle')` | WIRED | LoginForm line 23: `<input type="hidden" name="handle" value={handle} />`; actions.ts line 14: `formData.get('handle')` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CalendarGrid.tsx` | `substackHandle` prop | `getMembers()` → `m.substack_handle` from Supabase `members` table | Yes — DB query with `substack_handle` in SELECT | FLOWING |
| `MyProfileForm.tsx` | `substackHandleDefault` | `page.tsx` → `(member as any)?.substack_handle` from Supabase `members` SELECT | Yes — DB query includes `substack_handle` in SELECT | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 27 test suite (5 new/extended files, 28 tests) | `npx vitest run src/lib/__tests__/members.test.ts src/app/auth/__tests__/callback.test.ts src/components/__tests__/CalendarGrid.test.tsx src/app/my/__tests__/updateMyProfileAction.test.ts src/app/my/__tests__/page.test.tsx` | 5 files, 28 tests — all PASS | PASS |
| Full vitest suite | `npx vitest run` | 10 files pass, 53 tests pass; 1 pre-existing failure in `src/app/__tests__/page.test.tsx` (TEAM-03 "team-selected view" test — pre-dates Phase 27) | INFO |
| TypeScript compilation (Phase 27 files) | `npx tsc --noEmit 2>&1 \| grep -v saveArticles` | Zero errors in any Phase 27 file | PASS |

**Note on full-suite pre-existing failure:** `src/app/__tests__/page.test.tsx` has 1 failing test ("team-selected view: shows members of selected team REGARDLESS of status") that was present before Phase 27 as documented in the 27-02-SUMMARY deviations. This is not introduced by Phase 27 changes. The git log confirms Phase 27 commits did not touch `src/app/__tests__/page.test.tsx`.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROF-01 | 27-01-PLAN.md, 27-02-PLAN.md | User can register and update Substack @handle from /my page | SATISFIED | `MyProfileForm.tsx` @handle input; `actions.ts` normalization + save; `page.tsx` DB-priority pre-fill; 4 normalization tests + 3 pre-fill tests all pass |
| PROF-02 | 27-02-PLAN.md | User can click name/icon on personal monthly view to open `https://substack.com/@{handle}` in new tab | SATISFIED (code) | `CalendarGrid.tsx` conditional `<a>` wrapper; `member/[publicationId]/page.tsx` passes `substackHandle`; CalendarGrid.test.tsx 3 tests pass; live click behavior needs human verification |
| PROF-03 | 27-02-PLAN.md | Login URL accepts `?handle=hoge`; after Magic Link login, /my page pre-fills @handle input | SATISFIED (code) | `LoginForm.tsx` hidden input; `actions.ts` callbackUrl construction; `callback/route.ts` handle forwarding; 3 callback tests pass; live Magic Link round-trip needs human verification |

All three requirements are mapped to Phase 27 in REQUIREMENTS.md and ROADMAP.md. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/my/MyProfileForm.tsx` | 58 | `placeholder="@yourhandle"` | INFO | HTML `placeholder` attribute — not a code debt marker; intentional UX hint |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or stub patterns found in any Phase 27 modified files.

### Human Verification Required → RESOLVED (本番 6/6 PASS, 2026-06-08)

**実行コンテキスト:** Phase 36-03 手動 UAT。本番 https://keep-substack.com / Supabase prod `xolhjcngrwwwqtklmoyk`、テスト用アカウント `kugyu10@gmail.com` で開発者自身が一巡。検証後にテストアカウント行の `substack_handle` を NULL に復元（D-04、自分の行限定・他メンバー非汚染）。
**D-06 前提（全体共通・特に #6）:** 本番 Supabase Auth の URL Configuration（Redirect URL）で新ドメイン `keep-substack.com` を許可するよう開発者が事前に修正済み（D-06 landmine 解消）。これが Magic Link 系シナリオ成功の前提。

#### 1. Live DB Migration Apply — ✅ PASS（本番 SQL）

**Test:** Apply `supabase/migrations/20260602000000_add_substack_handle.sql` to both production (`xolhjcngrwwwqtklmoyk`) and TEST (`otydhiumsdsyxepnjqjp`) Supabase instances via SQL Editor.
**Expected:** `SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle'` returns 1 row; `SELECT substack_handle FROM members LIMIT 5` returns all NULL.
**Result:** PASS — 本番 prod の SQL Editor で `information_schema.columns` 参照により `substack_handle` カラム 1 行存在を確認、既存 5 行が NULL であることも確認（本番手動、2026-06-08）。

#### 2. /my Page @handle Input Renders (PROF-01) — ✅ PASS（本番手動が主 + 自動 spec 補助）

**Test:** Visit `/my` when logged in as a member.
**Expected:** Input field labeled "Substack ハンドル" with placeholder "@yourhandle" and hint text "例: @yourname — 入力すると個人ページからプロフィールへのリンクが作成されます" appears between the name field and the team checkboxes.
**Result:** PASS — 本番 https://keep-substack.com/my に kugyu10@gmail.com でログインし、handle を NULL にした状態で「Substack ハンドル」入力欄が描画されることを本番ブラウザで目視（**主たる結果 = 本番手動**、SC#1 充足）。**補助証拠（D-05）:** 36-01 の TEST project 自動 spec `e2e/27-handle.spec.ts`（4 テスト green）が durable レイヤーとして同挙動を裏付け。自動 spec の green は本番手動結果の代替ではない。

#### 3. @handle Save + Reload (PROF-01 D-08) — ✅ PASS（本番手動が主 + 自動 spec 補助、Drift D-A 追従）

**Test:** Enter "hoge" (no @) in the handle field, click 保存する, then reload `/my`.
**Expected:** The handle input pre-fills with "@hoge" on reload (DB value, @-normalized).
**Result:** PASS — 本番で "hoge" 保存 → reload で `@hoge` が表示。⚠ **Drift D-A 追従**: handle は設定後 read-only（`MyProfileForm.tsx:52`）のため、input への pre-fill 再編集ではなく read-only `<p>` 表示で検証が追従した（仕様変更に検証文言が追従、src バグではない）。**主たる結果 = 本番手動**、補助証拠 = 36-01 自動 spec（D-05）。

#### 4. CalendarGrid Profile Link (PROF-02) — ✅ PASS（本番手動が主 + 自動 spec 補助）

**Test:** Visit `/member/[publicationId]` for a member whose `substack_handle` is set in the DB; click their name/avatar.
**Expected:** `https://substack.com/@handle` opens in a new browser tab.
**Result:** PASS — 本番 /member/[テストアカウントの publicationId] で名前/アイコンが `https://substack.com/@hoge` を新タブで開くリンクとして表示されることを確認。**主たる結果 = 本番手動**、補助証拠 = 36-01 自動 spec（D-05）。

#### 5. CalendarGrid Static Fallback (PROF-02) — ✅ PASS（本番手動が主 + 自動 spec 補助）

**Test:** Visit `/member/[publicationId]` for a member whose `substack_handle` is NULL in the DB.
**Expected:** Name/avatar renders without an anchor element — no pointer cursor, not clickable as a link.
**Result:** PASS — handle を NULL に戻す（read-only のため UI 不可、本番 SQL Editor で `UPDATE members SET substack_handle=NULL WHERE id='<自分のid>'`、自分の行限定 D-04）と /member でリンクが消滅し plain 表示になることを確認。**主たる結果 = 本番手動**、補助証拠 = 36-01 自動 spec（D-05）。

#### 6. Magic Link ?handle= Pre-fill (PROF-03) — ✅ PASS（本番手動、⚠ 入口訂正 + D-06 前提）

**Test（訂正後）:** Navigate to `https://keep-substack.com/signin-51cf21389c56/?handle=hoge`, submit your email, click the Magic Link in your inbox.
**Expected:** You are redirected to `/my?handle=hoge`; the @handle input pre-fills with "hoge" if your DB `substack_handle` is currently null.
**Result:** PASS — Magic Link クリック後 `/my?handle=hoge` に着地し、DB handle が NULL のとき input に "hoge" pre-fill を確認（本番手動、2026-06-08）。
**⚠ テスト定義訂正（バグではなくチェックリストの取り違え）:** 当初の入口記載は `/login-51cf21389c56/?handle=hoge` だったが、これは誤り。実装上 `?handle=` を消費するのは **signin ルート**（`src/app/(auth)/signin-51cf21389c56/page.tsx` が `searchParams.handle` を `LoginForm` に渡し、`src/app/my/page.tsx` が `/my?handle=` を読んで pre-fill する）であり、`/login` 側は handle を読まない。正しい入口 `https://keep-substack.com/signin-51cf21389c56/?handle=hoge` で実行し PASS。これはチェックリストの入口記載誤りの訂正であり、src バグではない。
**前提（D-06）:** 本番 Supabase Auth の Redirect URL で新ドメイン `keep-substack.com` を許可済み（事前確認・必要分追加）。これが #6 成功の前提。

### Gaps Summary

✅ コードレベルのギャップ無し（10/10 must-have truths verified）+ human verification 6/6 を本番で PASS（2026-06-08）。全項目クローズ。残ギャップなし。
- #2-#5 は **本番手動を主たる結果**、TEST project の 36-01 自動 spec を **durable な補助レイヤー** として二層で記録（D-05、自動 spec を本番結果の代替にしていない）。
- #6 は入口を `/login` → signin ルートに訂正のうえ PASS（src バグではない）。D-06 Redirect URL 修正を前提として明記。
- 失敗シナリオ 0 件のため Phase 36-03 Task 4 のバグ化（D-10）は該当なし。go/no-go 判定（D-11）に必要な情報が揃った。

---

_Verified: 2026-06-02T13:40:00Z (code-level), 2026-06-08T00:00:00Z (human verification 完了で verified に確定)_
_Verifier: Claude (gsd-verifier) / Human UAT: 開発者（Phase 36-03 手動 UAT, 本番）_
