# Phase 23: my-team-join - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 3 (all modified, no new files)
**Analogs found:** 3 / 3 (all are self-analogs — the files being modified plus sibling /my files and Phase 22 references)

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/app/my/page.tsx` | route (RSC) | request-response (read) | `src/app/admin/teams/page.tsx` (public-teams query), self (member JOIN) | exact (self) |
| `src/app/my/MyProfileForm.tsx` | component (Client) | request-response (form submit) | self (current form) + `src/app/admin/teams/TeamStatusList.tsx` (checkbox/empty-state) | exact (self) |
| `src/app/my/actions.ts` | service (Server Action) | CRUD (member_teams reconcile) | self `updateMyProfileAction` + `src/lib/members.ts` `updateMember` (delete-then-insert) | exact (self) |

All three files already exist and are being modified in place. The strongest analogs are the current versions of the same files, supplemented by Phase 22 code for the new checkbox + public-teams-query + status-filtered-delete behavior.

## Pattern Assignments

### `src/app/my/page.tsx` (route / RSC, request-response read)

**Analog:** self (current page.tsx) + `src/app/admin/teams/page.tsx`

**Auth + client-factory pattern to keep verbatim** (`src/app/my/page.tsx` lines 8-13):
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/')

const admin = createSupabaseAdminClient()
```

**Member JOIN query — EXTEND to include `status`** (current lines 14-30). The current select uses `teams (name)`; change to `teams (name, status)`, mirroring the Phase 22 `getMembers()` JOIN in `src/lib/members.ts` lines 8-15:
```typescript
// current (lines 14-24):
.select(`
  name,
  publication_id,
  member_teams (
    teams (name)
  )
`)
// becomes teams (name, status) — see members.ts getMembers() lines 11-13
```

The current mapping at lines 26-30 flattens to `string[]`. Per CONTEXT D-06 / code_context, change to keep both name and status. Mirror the `members.ts` filter at lines 20-26:
```typescript
teams: (m.member_teams as any[])
  .map((mt: any) => mt.teams)
  .filter((t: unknown): t is { name: string; status: string } =>
    t !== null && typeof t === 'object' && 'name' in (t as object)
  )
```

**ADD public-teams query — copy from `src/app/admin/teams/page.tsx` lines 6-9** (filter to public, order by name):
```typescript
const { data: publicTeams } = await admin
  .from('teams')
  .select('id, name')
  .eq('status', 'public')
  .order('name')
```
(The admin analog selects `id, name, status` without the `.eq` — add the `status='public'` filter per CONTEXT D-07 / Integration Points line 92.)

**Props pass-down — extend the current `<MyProfileForm member={...} />` block** (current lines 41-47). Per CONTEXT lines 93-95, change props from `team_names: string[]` to `currentTeams: { name: string; status: string }[]` + `publicTeams: { name: string }[]`.

---

### `src/app/my/MyProfileForm.tsx` (component / Client, request-response form submit)

**Analog:** self (current form) + `src/app/admin/teams/TeamStatusList.tsx` (empty-state, checkbox list)

**`useActionState` wiring — keep verbatim** (current lines 1-13):
```typescript
'use client'

import { useActionState } from 'react'
import { updateMyProfileAction } from './actions'
// ...
const [state, action, isPending] = useActionState(updateMyProfileAction, null)
```

**Form shell + error display — keep verbatim** (current lines 15-17). Note UI-SPEC line 203 requires adding `role="alert"` to the error `<p>`:
```typescript
<form action={action} className="space-y-4">
  {state && <p className="text-sm text-red-600" role="alert">{state}</p>}
```

**Publication ID readonly + name input — keep verbatim** (current lines 19-39). UI-SPEC line 62 says change label weight `font-medium` → `font-semibold` on all form labels.

**REPLACE teamNames text input (current lines 41-54)** with the checkbox list from UI-SPEC lines 105-135.

Public-team checkbox item (joinable), UI-SPEC lines 106-113:
```tsx
<label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
  <input type="checkbox" name="teams" value={teamName}
    defaultChecked={isMember}
    className="w-4 h-4 accent-orange-500" />
  <span className="text-sm text-[#363737]">{teamName}</span>
</label>
```

Private-team readonly item (admin-set), UI-SPEC lines 116-123 + accessibility line 202:
```tsx
<label className="flex items-center gap-3 min-h-[44px] cursor-not-allowed opacity-60">
  <input type="checkbox" checked disabled
    aria-label={`${teamName} 管理者設定済み`}
    className="w-4 h-4" />
  <span className="text-sm text-[#363737]">{teamName}</span>
  <span className="text-xs text-gray-500 ml-auto">管理者が設定</span>
</label>
```

Container + section label, UI-SPEC lines 127 / 131-135:
```tsx
<label className="block text-sm font-semibold mb-2">所属チーム</label>
<div className="space-y-1 border rounded px-3 py-2">{/* items */}</div>
```

Empty / all-joined states (CONTEXT D-05/D-06, UI-SPEC copy lines 172-173) — pattern mirrors the empty-state guard in `src/app/admin/teams/TeamStatusList.tsx` lines 31-38:
```tsx
// no public teams:
<p className="text-sm text-gray-500">参加できる公開チームはありません</p>
// all public teams joined:
<p className="text-xs text-gray-500 mt-1">すべての公開チームに参加中です</p>
```

**Submit button — keep verbatim** (current lines 56-62), but UI-SPEC line 62 changes `font-medium` → `font-semibold` and accessibility line 204 adds `aria-disabled={isPending}`:
```tsx
<button type="submit" disabled={isPending} aria-disabled={isPending}
  className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
  {isPending ? '保存中...' : '保存する'}
</button>
```

**Form data extraction note (CONTEXT line 106):** checkboxes share `name="teams"`; the Server Action reads them with `formData.getAll('teams')`.

---

### `src/app/my/actions.ts` (service / Server Action, CRUD reconcile)

**Analog:** self `updateMyProfileAction` (current lines 43-99) — FULL REPLACEMENT per CONTEXT D-07. Reuse the delete-then-insert reconcile shape from `src/lib/members.ts` `updateMember` lines 103-123, but constrained to public teams.

**Header + name update — keep verbatim** (current lines 1-5, 47-68). Only change the team-input parse: replace `teamNamesRaw` (line 48, comma string) with `formData.getAll('teams')` (array of checked public team names):
```typescript
const checkedTeamNames = formData.getAll('teams').map(String)
```

**Auth + member lookup — keep verbatim** (current lines 52-68). NOTE: the auth-error return string is the UI-SPEC authoritative copy (line 176), NOT the old `認証が必要です`:
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 'ログインセッションが切れました。再ログインしてください'
const admin = createSupabaseAdminClient()
const { data: member, error: updateError } = await admin
  .from('members').update({ name }).eq('user_id', user.id)
  .select('id').single()
```

**REPLACE the team reconcile (current lines 70-95).** The current logic: deletes ALL member_teams (line 72-75) then upserts arbitrary team names (lines 82-95, free creation). New logic per CONTEXT D-07/D-08/D-09:

1. Fetch the canonical set of public teams (validation source — only these names/ids are honored):
```typescript
const { data: publicTeams } = await admin
  .from('teams').select('id, name').eq('status', 'public')
```
2. Validate submitted names against that set (D-08: ignore non-public / non-existent names):
```typescript
const allowed = (publicTeams ?? []).filter(t => checkedTeamNames.includes(t.name))
```
3. Delete ONLY public-team rows for this member (D-09: never delete private rows). This requires scoping the delete to public team ids, NOT the blanket `delete().eq('member_id', ...)` at current lines 72-75:
```typescript
const publicTeamIds = (publicTeams ?? []).map(t => t.id)
await admin.from('member_teams').delete()
  .eq('member_id', member.id).in('team_id', publicTeamIds)
```
4. Insert the checked public teams (no `teams.upsert` — D-08 forbids free creation):
```typescript
if (allowed.length > 0) {
  await admin.from('member_teams').insert(
    allowed.map(t => ({ member_id: member.id, team_id: t.id }))
  )
}
```

**Error handling + revalidate — keep verbatim pattern** (current lines 65-67 `console.error('[updateMyProfile] ...')` + return JP message; line 97 `revalidatePath('/my')`; line 98 `return null`). UI-SPEC copy lines 175-176 supply messages: general → `保存に失敗しました。もう一度お試しください`, auth → `ログインセッションが切れました。再ログインしてください`.

**Note:** `linkMemberAction` (lines 7-41) is unrelated — do NOT touch it.

---

## Shared Patterns

### Authentication (RSC + Server Action)
**Source:** `src/app/my/page.tsx` lines 9-11 (RSC, redirect) and `src/app/my/actions.ts` lines 52-54 (action, return string).
**Apply to:** page.tsx (redirect on no user), actions.ts (return JP error on no user). The Server-Action auth-error string is the UI-SPEC authoritative copy (line 176).
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/')                                          // RSC
if (!user) return 'ログインセッションが切れました。再ログインしてください'  // Server Action (UI-SPEC line 176)
```

### Supabase client factories
**Source:** `src/lib/supabase/server.ts` (anon, cookie-based, for auth) + `src/lib/supabase/admin.ts` (service role, for writes/reads bypassing RLS).
**Apply to:** all three files. Pattern: `createSupabaseServerClient()` for `auth.getUser()`, `createSupabaseAdminClient()` for table reads/writes. Both already imported in page.tsx (lines 2-3) and actions.ts (lines 4-5).

### member_teams reconcile (delete-then-insert)
**Source:** `src/lib/members.ts` `updateMember` lines 103-123 (delete all member_teams, re-insert). Phase 23 narrows the delete scope to public team ids only (D-09).
**Apply to:** actions.ts team reconcile.

### Status-filtered team query
**Source:** `src/app/admin/teams/page.tsx` lines 6-9 (`.select('id, name, status').order('name')`) + `src/lib/members.ts` lines 8-15 (`teams (name, status)` JOIN).
**Apply to:** page.tsx public-teams query and member JOIN; actions.ts public-team validation query.

### useActionState client form
**Source:** `src/app/my/LinkMemberForm.tsx` lines 1-7 and current `MyProfileForm.tsx` lines 1-13.
**Apply to:** MyProfileForm.tsx (kept verbatim).

### Empty-state guard
**Source:** `src/app/admin/teams/TeamStatusList.tsx` lines 31-38 (early-return message block when `teams.length === 0`).
**Apply to:** MyProfileForm.tsx public-team list (D-05/D-06).

### revalidate after write
**Source:** `src/app/my/actions.ts` line 97, `src/app/admin/teams/actions.ts` line 28.
**Apply to:** actions.ts → `revalidatePath('/my')`.

## No Analog Found

None. Every required pattern has a concrete in-repo analog. The only genuinely new behavior — scoping the `member_teams` delete to public team ids (`.in('team_id', publicTeamIds)`) — is a constrained variant of the existing blanket delete in `members.ts` lines 104-107 and `actions.ts` lines 72-75.

## Metadata

**Analog search scope:** `src/app/my/`, `src/app/admin/teams/`, `src/lib/`, `src/lib/supabase/`
**Files scanned:** 10 (page.tsx, MyProfileForm.tsx, actions.ts, LinkMemberForm.tsx, admin/teams/{page,actions,TeamStatusList}, members.ts, types.ts, supabase/{admin,server})
**Pattern extraction date:** 2026-05-30
