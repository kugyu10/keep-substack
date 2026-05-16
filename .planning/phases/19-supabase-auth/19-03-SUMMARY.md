# Plan 19-03: proxy.ts → Supabase Auth admin ロール — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** 93775c6

## What was done

- Rewrote `src/proxy.ts`: replaced Basic Auth with Supabase Auth `getUser()` check
- `/admin` routes: require `user.app_metadata.role === 'admin'`, redirect to `/login` otherwise
- `/my` routes: require any authenticated user, redirect to `/login` otherwise
- Session refresh pattern (setAll) implemented for token renewal
- Removed all `ADMIN_PASSWORD` references

## Verification

- [x] No ADMIN_PASSWORD reference in proxy.ts
- [x] getUser() present
- [x] admin role check present
- [x] /my in matcher
- [x] npm run build passes

## Human actions required

After deployment:
1. Log in via /login with admin email
2. Set app_metadata.role = 'admin' in Supabase Dashboard for the admin user
3. Verify /admin is accessible with admin account and protected for others
