---
phase: 23
slug: my-team-join
status: secured
threats_open: 0
asvs_level: default
created: 2026-05-30
---

# SECURITY — Phase 23: My Team Join

**Audited:** 2026-05-30
**ASVS Level:** default
**block_on:** high
**Result:** SECURED — 10/10 threats resolved (7 mitigated + verified, 3 accepted + confirmed no-op)
**Scope:** `updateMyProfileAction` (actions.ts), `/my` RSC (page.tsx), `MyProfileForm.tsx`. `linkMemberAction` is prior-phase and out of scope.

register_authored_at_plan_time: true — each mitigate-disposition threat was verified to exist in the implementation, not accepted on documentation alone.

## Mitigated Threats — Verified Present

| Threat | Category | Evidence (file:line) |
|--------|----------|----------------------|
| T-23-01 | Elevation of Privilege | actions.ts:73-76 fetches `teams.select('id, name').eq('status','public')`; actions.ts:85 `allowed = publicTeams.filter((t) => checkedTeamNames.includes(t.name))`; insert at actions.ts:105 uses `allowed`-derived ids only. No upsert/free-creation of teams. Submitted private/hidden/nonexistent names are silently dropped. CLOSED. |
| T-23-02 | Tampering (delete scope) | actions.ts:89-94 delete is `.eq('member_id', member.id).in('team_id', publicTeamIds)`, wrapped in `if (publicTeamIds.length > 0)` (line 89) so a save never issues a member-only/broad delete and never removes private/hidden membership rows. CLOSED. |
| T-23-03 | Spoofing / IDOR | actions.ts:54 `auth.getUser()`; actions.ts:55 unauth returns exact JP copy `'ログインセッションが切れました。再ログインしてください'` before any write; actions.ts:60-63 member update scoped `.eq('user_id', user.id)`. No `member_id` accepted from client. CLOSED. |
| T-23-04 | Repudiation | All Supabase error paths log with `[updateMyProfile]` prefix before returning the JP message: actions.ts:68, 79, 97, 108. CLOSED. |
| T-23-05 | Information Disclosure / IDOR | page.tsx:11 `redirect('/')` on unauth before any read; page.tsx:23-24 member query scoped `.eq('user_id', user.id).maybeSingle()`. No member identifier read from request params. CLOSED. |
| T-23-06 | Information Disclosure | page.tsx:35-39 join-able list query `.select('id, name').eq('status','public')`; page.tsx:41-43 maps to `{ name }` only. Private/hidden team names never enter the rendered list. CLOSED. |
| T-23-08 | Tampering (private readonly rows) | MyProfileForm.tsx:88-103 private joined rows render `checked disabled` (lines 95-96) and carry NO `name` attribute, so they are excluded from `formData.getAll('teams')`. Defense-in-depth atop T-23-01's server-side public-set validation. CLOSED. |
| T-23-10 | Information Disclosure (rendered list) | MyProfileForm.tsx:59 renders only `member.publicTeams`; MyProfileForm.tsx:88 renders only `privateJoined` (teams the user already belongs to, derived from `currentTeams`). No unjoined private/hidden team can be rendered — props supplied upstream by page.tsx are public-only + own-membership-only. CLOSED. |

## Accepted Risks — Confirmed No-Op / Neutralized

| Threat | Category | Disposition | Confirmation |
|--------|----------|-------------|--------------|
| T-23-07 | Tampering (data reshape only) | accept | page.tsx (Plan 02) performs only `.select(...)` reads (lines 14-24, 35-39); zero write operations. No-op confirmed. |
| T-23-09 | Spoofing/Tampering (injected non-public team name) | accept | Neutralized server-side by T-23-01: actions.ts:85 filters submitted names against the `status='public'` set; any injected non-public name is dropped before insert. Form adds no client trust. Confirmed. |
| T-23-SC (x3) | Tampering (npm installs) | accept | All three plan SUMMARYs declare `tech-stack.added: []`; `git log` shows no `package.json`/`package-lock.json` changes in the phase 23 window. No new packages. Confirmed. |

## Unregistered Flags

None. The Plan SUMMARYs use `## Threat Surface` sections; every threat referenced (T-23-05, T-23-06, T-23-08, T-23-10) maps to a registered threat ID. All three plans declare no new package/network/auth/file attack surface (`tech-stack.added: []`, "no new write surface", "no new packages installed").

## Open Threats

threats_open: 0

None. Phase 23 is cleared to ship.

## Audit Trail

### Security Audit 2026-05-30
| Metric | Count |
|--------|-------|
| Threats found | 10 |
| Closed | 10 |
| Open | 0 |

Register built from all three PLAN.md `<threat_model>` blocks (register_authored_at_plan_time: true). gsd-security-auditor verified each mitigate-disposition threat against the implementation; accepted risks confirmed as genuine no-op/server-neutralized surfaces.
