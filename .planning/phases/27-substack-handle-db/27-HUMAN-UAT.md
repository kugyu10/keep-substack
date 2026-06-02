---
status: partial
phase: 27-substack-handle-db
source: [27-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Apply SQL migration to live Supabase instances
expected: `substack_handle TEXT` column exists in `members` table; confirmed via `SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle';`
result: [pending]

### 2. @handle input renders on /my page
expected: An @handle input field appears below the name field when logged in at `/my`
result: [pending]

### 3. Save @handle round-trip
expected: Saving "hoge" stores "@hoge" in DB; reloading `/my` shows "@hoge" pre-filled
result: [pending]

### 4. CalendarGrid shows profile link when handle set
expected: Member name/avatar on `/member/[publicationId]` is a clickable link to `https://substack.com/@handle` when `substack_handle` is non-null
result: [pending]

### 5. CalendarGrid shows no link when handle null
expected: Member name/avatar is NOT a link when `substack_handle` is null
result: [pending]

### 6. Magic Link handle propagation
expected: Magic Link URL with `?handle=hoge` pre-fills "@hoge" in the `/my` form after successful login
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
