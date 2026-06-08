---
phase: 33-commitslots-upsert
fixed_at: 2026-06-08T11:23:00Z
review_path: .planning/phases/33-commitslots-upsert/33-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 33: Code Review Fix Report

**Fixed at:** 2026-06-08T11:23:00Z
**Source review:** .planning/phases/33-commitslots-upsert/33-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Open redirect bypass via backslash path

**Files modified:** `src/lib/safe-redirect.ts` (new), `src/app/auth/callback/route.ts`, `src/app/login/page.tsx`
**Commit:** d3b7139
**Applied fix:** Created `src/lib/safe-redirect.ts` with `safeRedirectPath()` using WHATWG URL-parse validation against a dummy `https://__internal__` origin. Any input whose resolved origin differs (including backslash paths like `/\evil.com`) is rejected and falls back to the default path. Replaced the old `startsWith('/') && !startsWith('//')` checks in both `auth/callback/route.ts` (removed `nextParam` intermediate variable) and `login/page.tsx` with calls to the new utility.

### WR-01: admin-guard.ts redirects /my to / instead of /login

**Files modified:** `src/admin-guard.ts`
**Commit:** dffbc8e
**Applied fix:** Changed the unauthenticated `/my` redirect from `new URL('/', request.url)` to clone `request.nextUrl`, set `pathname = '/login'` and `search = ?next=<encoded-pathname>`, matching the behavior of `middleware.ts`. The `/admin` redirect to `/` is intentional (no `?next` there) and was left unchanged.

### WR-02: No duplicate day_of_week validation

**Files modified:** `src/app/my/actions.ts`
**Commit:** 1290d7e
**Applied fix:** Added a Set-based uniqueness check after the per-slot validation loop and before the auth check. If the submitted slots array contains duplicate `day_of_week` values, the action now returns `'同じ曜日を複数指定することはできません'` immediately, preventing the DB-level UNIQUE constraint failure that previously surfaced only as a generic error.

### WR-03: E2E comment names wrong role field

**Files modified:** `e2e/admin-guard.spec.ts`
**Commit:** 56c03a4
**Applied fix:** Replaced the misleading comment `proxy.ts checks app_metadata.role === 'admin'` with an accurate description: `middleware checks user.role === 'admin'` (the `auth.users.role` JWT claim), plus a SQL snippet showing how to correctly provision an admin user. The old comment would have caused developers to set the wrong field when provisioning admins.

---

_Fixed: 2026-06-08T11:23:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
