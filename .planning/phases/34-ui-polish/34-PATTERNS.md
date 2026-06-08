# Phase 34: UI Polish バッチ - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 10 (3 new + 7 modified)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(auth)/layout.tsx` | layout | request-response | `src/app/layout.tsx` | role-match (no html/body) |
| `src/components/Footer.tsx` | component (Server) | request-response | `src/components/Header.tsx` | exact (auth + admin query pattern) |
| `src/components/HeaderNav.tsx` | component (Client) | request-response | `src/components/LogoutButton.tsx` | role-match ('use client' pattern) |
| `src/components/Header.tsx` | component (Server) | request-response | `src/components/Header.tsx` (self) | self (minor refactor) |
| `src/app/(auth)/login/page.tsx` | page | request-response | `src/app/login/page.tsx` (self) | self (additions only) |
| `src/app/(auth)/signin-51cf21389c56/page.tsx` | page | request-response | `src/app/signin-51cf21389c56/page.tsx` (self) | self (additions only) |
| `src/app/layout.tsx` | layout | request-response | `src/app/layout.tsx` (self) | self (inline footer → `<Footer />`) |
| `src/lib/types.ts` | model | — | `src/lib/types.ts` (self) | self (field addition) |
| `src/lib/commitUtils.ts` | utility | batch/transform | `src/lib/commitUtils.ts` (self) | self (function extension) |
| `src/app/page.tsx` | page | CRUD | `src/app/my/page.tsx` | exact (admin query + user_id pattern) |

---

## Pattern Assignments

### `src/app/(auth)/layout.tsx` (layout, request-response)

**Analog:** `src/app/layout.tsx` (lines 16–42) — but WITHOUT `<html>`, `<body>`, `<Header />`, or `<Footer />`.

**Core layout pattern** (`src/app/layout.tsx` lines 16–30):
```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
        {/* footer */}
      </body>
    </html>
  )
}
```

**Auth layout pattern** (no html/body — copy this structure only):
```tsx
// src/app/(auth)/layout.tsx
// No 'use client' — this is a Server Component (default)
// No <html>, <body>, <Header />, or <Footer /> — those remain in RootLayout
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {children}
    </div>
  )
}
```

**Critical constraint:** Route Group layouts are nested inside RootLayout's `<body>`. Never add `<html>` or `<body>` here.

---

### `src/components/Footer.tsx` (component Server, request-response)

**Analog:** `src/components/Header.tsx` (all 36 lines) — same auth + Supabase pattern.

**Imports pattern** (`src/components/Header.tsx` lines 1–2):
```tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
```

**Auth fetch pattern** (`src/components/Header.tsx` lines 4–6):
```tsx
export default async function Header() {
  const supabase = await createSupabaseServerClient()  // async — must await
  const { data: { user } } = await supabase.auth.getUser()
```

**Admin query pattern** (`src/app/my/page.tsx` lines 17–30):
```tsx
const admin = createSupabaseAdminClient()  // sync — no await needed
const { data: member } = await admin
  .from('members')
  .select(`id, name, publication_id, ...`)
  .eq('user_id', user.id)
  .maybeSingle()
```

**Footer-specific imports** (extend Header's imports with admin):
```tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
```

**Existing inline footer markup** (`src/app/layout.tsx` lines 26–38) — this is what Footer.tsx replaces:
```tsx
<footer className="py-4 text-center">
  <span className="text-xs text-gray-400">
    このSubstack継続可視化ツールに参加したい方は{' '}
    <a
      href="https://uojun.substack.com/p/8cd"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-[#FF6719] underline"
    >
      コチラ
    </a>
  </span>
</footer>
```

**3-pattern Footer core** (extends existing inline with conditional logic):
```tsx
export default async function Footer() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let publicationId: string | null = null
  if (user) {
    const admin = createSupabaseAdminClient()
    const { data: member } = await admin
      .from('members')
      .select('publication_id')
      .eq('user_id', user.id)
      .maybeSingle()
    publicationId = member?.publication_id ?? null
  }

  return (
    <footer className="py-4 text-center">
      <span className="text-xs text-gray-400">
        {!user && (
          <>このSubstack継続可視化ツールに参加したい方は{' '}
            <a href="https://uojun.substack.com/p/8cd" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6719] underline">コチラ</a>
          </>
        )}
        {user && publicationId && (
          <>あなたの個人ビューは{' '}
            <Link href={`/member/${publicationId}`} className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
        {user && !publicationId && (
          <>参加登録は{' '}
            <Link href="/my" className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
      </span>
    </footer>
  )
}
```

---

### `src/components/HeaderNav.tsx` (component Client, request-response)

**Analog:** `src/components/LogoutButton.tsx` (all 16 lines) — closest 'use client' component in src/components.

**'use client' pattern** (`src/components/LogoutButton.tsx` lines 1–3):
```tsx
'use client'

import { signOutAction } from '@/lib/authActions'
```

**Button styling pattern** (`src/components/Header.tsx` lines 19–31) — copy link styles from current Header:
```tsx
<Link
  href="/my"
  className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
>
  マイページ
</Link>
```

**HeaderNav full pattern** (new file, no existing analog — follows RESEARCH.md Pattern 2):
```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

type HeaderNavProps = { user: User | null }

export default function HeaderNav({ user }: HeaderNavProps) {
  const pathname = usePathname()
  if (user) {
    if (pathname === '/my') return null
    return (
      <Link href="/my" className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors">
        マイページ
      </Link>
    )
  }
  return (
    <Link href="/login" className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors">
      ログイン
    </Link>
  )
}
```

---

### `src/components/Header.tsx` (component Server, modified)

**Current file:** `src/components/Header.tsx` (all 36 lines) — self-analog.

**Current nav block to replace** (lines 18–32):
```tsx
{user ? (
  <Link
    href="/my"
    className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
  >
    マイページ
  </Link>
) : (
  <Link
    href="/login"
    className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
  >
    ログイン
  </Link>
)}
```

**Replacement pattern** — delegate nav to `<HeaderNav user={user} />`:
```tsx
// Header.tsx after modification: import HeaderNav, replace nav block
import HeaderNav from './HeaderNav'

// Inside JSX, replace the {user ? ... : ...} block with:
<HeaderNav user={user} />
```

**Logo style to preserve** (`src/components/Header.tsx` lines 11–17):
```tsx
<Link
  href="/"
  className="text-lg font-black hover:opacity-70 transition-opacity"
  style={{ fontFamily: 'Georgia, serif' }}
>
  Keep Substack
</Link>
```

---

### `src/app/(auth)/login/page.tsx` (page, request-response, modified)

**Current file:** `src/app/login/page.tsx` (all 24 lines) — self-analog after directory move.

**Current structure** (lines 1–24):
```tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'
import { safeRedirectPath } from '@/lib/safe-redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { next } = await searchParams
  const safeNext = safeRedirectPath(next) ?? undefined

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">ログイン</h1>
      <LoginForm next={safeNext} />
    </main>
  )
}
```

**Logo style source** (`src/components/Header.tsx` lines 11–17) — apply same Georgia serif, font-black, but larger (text-2xl) and non-clickable:
```tsx
<p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
  Keep Substack
</p>
```

**Return block after modifications** (D-04, D-05, D-06, D-07, D-08):
```tsx
return (
  <main className="max-w-sm mx-auto px-4 py-12">
    <p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
      Keep Substack
    </p>
    <h1 className="text-2xl font-black text-center mb-8">ログイン</h1>
    <LoginForm next={safeNext} />
    <p className="text-xs text-gray-400 text-center mt-6">
      サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます
    </p>
  </main>
)
```

**Changes from current:** `py-16` → `py-12`, `font-semibold` → `font-black`, add logo `<p>`, add invitation note `<p>`.

---

### `src/app/(auth)/signin-51cf21389c56/page.tsx` (page, request-response, modified)

**Current file:** `src/app/signin-51cf21389c56/page.tsx` (all 22 lines) — self-analog after directory move.

**Current structure** (lines 1–22):
```tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; handle?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { pid, handle } = await searchParams

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">サインイン</h1>
      <LoginForm pid={pid} handle={handle} />
    </main>
  )
}
```

**Return block after modifications** (D-04, D-05, D-06; no invitation note per D-09):
```tsx
return (
  <main className="max-w-sm mx-auto px-4 py-12">
    <p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
      Keep Substack
    </p>
    <h1 className="text-2xl font-black text-center mb-8">サインイン</h1>
    <LoginForm pid={pid} handle={handle} />
  </main>
)
```

**Changes from current:** `py-16` → `py-12`, `font-semibold` → `font-black`, add logo `<p>` only.

---

### `src/app/layout.tsx` (layout, modified)

**Current file:** `src/app/layout.tsx` (all 42 lines) — self-analog.

**Current imports** (lines 1–3):
```tsx
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
```

**Change:** Add `import Footer from '@/components/Footer'` to imports.

**Current inline footer** (lines 26–38) to replace with `<Footer />`:
```tsx
<footer className="py-4 text-center">
  <span className="text-xs text-gray-400">
    このSubstack継続可視化ツールに参加したい方は{' '}
    <a
      href="https://uojun.substack.com/p/8cd"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-[#FF6719] underline"
    >
      コチラ
    </a>
  </span>
</footer>
```

**After change:**
```tsx
import Footer from '@/components/Footer'
// ...
<body>
  <Header />
  {children}
  <Footer />
</body>
```

---

### `src/lib/types.ts` (model, modified)

**Current file:** `src/lib/types.ts` (all 35 lines) — self-analog.

**Current Member type** (lines 10–17):
```typescript
export type Member = {
  id: string  // UUID from members.id — required; use a placeholder UUID in test fixtures
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string  // ISO 8601
  substackHandle?: string | null
}
```

**Add `hasUser: boolean` field** (D-15) — required (not optional, per D-16 and RESEARCH.md Pitfall 4):
```typescript
export type Member = {
  id: string  // UUID from members.id — required; use a placeholder UUID in test fixtures
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string  // ISO 8601
  substackHandle?: string | null
  hasUser: boolean  // true if auth user exists for this member (user_id IS NOT NULL)
}
```

**Cascade effect:** Every location that constructs a `Member` object must add `hasUser`. Affected: `src/lib/members.ts` (mapper in `getMembers()`), all test fixtures using `member()` helper.

---

### `src/lib/commitUtils.ts` (utility, batch/transform, modified)

**Current file:** `src/lib/commitUtils.ts` (all 213 lines) — self-analog.

**Current private `achievementRate`** (lines 158–171):
```typescript
function achievementRate(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): number {
  if (slots.length === 0) return 0
  const achieved = slots.filter((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    const articles = articleDateMap.get(dateKey)
    return articles !== undefined && articles.length > 0
  }).length
  return achieved / slots.length
}
```

**Change:** Add `export` keyword. Signature unchanged:
```typescript
export function achievementRate(  // ← add 'export'
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): number {
```

**Current `sortMembersForCommitView`** (lines 179–213) — meta Map pre-computation pattern to preserve:
```typescript
const meta = new Map(
  results.map(({ member, items }) => {
    const memberSlots = slots.filter((s) => s.member_id === member.id)
    const dateMap = buildArticleDateMap(items)
    return [
      member.id,
      {
        rate: achievementRate(memberSlots, thisWeekDates, dateMap),
        streak: consecutiveWeekStreak(memberSlots, items),
      },
    ]
  })
)
```

**Extended meta Map** (D-13, D-14 — add group + rate1 + rate2):
```typescript
// Import Member type addition needed at top:
import type { CommitSlot, FeedItem, Member, MemberFeedResult } from './types'

// Group helper (add before sortMembersForCommitView):
function getGroup(member: Member, memberSlots: CommitSlot[]): 0 | 1 | 2 {
  if (!member.hasUser) return 2          // Group C: no auth user
  if (memberSlots.length === 0) return 1  // Group B: no slots configured
  return 0                                // Group A: slots configured
}

// Extended meta Map inside sortMembersForCommitView:
const thisWeekDates = getWeekDates(0)
const lastWeekDates = getWeekDates(-1)
const twoWeeksAgoDates = getWeekDates(-2)

const meta = new Map(
  results.map(({ member, items }) => {
    const memberSlots = slots.filter((s) => s.member_id === member.id)
    const dateMap = buildArticleDateMap(items)
    return [
      member.id,
      {
        group:  getGroup(member, memberSlots),
        rate0:  achievementRate(memberSlots, thisWeekDates, dateMap),
        streak: consecutiveWeekStreak(memberSlots, items),
        rate1:  achievementRate(memberSlots, lastWeekDates, dateMap),
        rate2:  achievementRate(memberSlots, twoWeeksAgoDates, dateMap),
      },
    ]
  })
)

// Extended comparator (replace current sort):
return [...results].sort((a, b) => {
  const am = meta.get(a.member.id)!
  const bm = meta.get(b.member.id)!

  if (am.group  !== bm.group)  return am.group  - bm.group   // ① group asc
  if (bm.rate0  !== am.rate0)  return bm.rate0  - am.rate0   // ② this week desc
  if (bm.streak !== am.streak) return bm.streak - am.streak  // ③ streak desc
  if (bm.rate1  !== am.rate1)  return bm.rate1  - am.rate1   // ④ last week desc
  if (bm.rate2  !== am.rate2)  return bm.rate2  - am.rate2   // ⑤ 2wks ago desc
  return a.member.addedAt.localeCompare(b.member.addedAt)    // ⑥ addedAt asc
})
```

**Note on `buildArticleDateMap`:** Already defined at line 57, used once per member. The three weekDates arrays share the same `dateMap` per member — no extra cost.

---

### `src/app/page.tsx` (page, CRUD, modified)

**Analog:** `src/app/my/page.tsx` (lines 1–30) — exact pattern for admin query + `.eq('user_id', ...)`.

**Current members fetch** (`src/app/page.tsx` lines 1, 16–17):
```typescript
import { getMembers } from '@/lib/members'
// ...
const allMembers = await getMembers()
```

**Admin query pattern from analog** (`src/app/my/page.tsx` lines 17–29):
```tsx
const admin = createSupabaseAdminClient()
const { data: member } = await admin
  .from('members')
  .select(`id, name, publication_id, ...`)
  .eq('user_id', user.id)
  .maybeSingle()
```

**Required change per D-16:** `getMembers()` in `src/lib/members.ts` needs `user_id` added to SELECT and `hasUser: !!m.user_id` added to the mapper — so that the `Member` type's required `hasUser` field is populated.

**Mapper change in `src/lib/members.ts`** (lines 20–30):
```typescript
return data.map((m: any) => ({
  id: m.id,
  name: m.name,
  publicationId: m.publication_id,
  teams: (m.member_teams as any[])
    .map((mt: any) => mt.teams)
    .filter((t: unknown): t is { name: string; status: string } =>
      t !== null && typeof t === 'object' && 'name' in (t as object)
    ),
  addedAt: m.added_at,
  substackHandle: m.substack_handle ?? undefined,
  hasUser: !!m.user_id,  // ← add this line
}))
```

**SELECT change in `src/lib/members.ts`** (line 7):
```typescript
.select(`
  id,
  name,
  publication_id,
  added_at,
  substack_handle,
  user_id,            // ← add this line
  member_teams (
    teams (name, status)
  )
`)
```

**Note:** `page.tsx` itself does not need a new query — `getMembers()` already supplies `allMembers` which becomes `filteredMembers` passed to `fetchAllFeedsCached`. The `MemberFeedResult.member` field will carry `hasUser` automatically once `getMembers()` is updated.

---

## Shared Patterns

### Supabase Server Component Auth
**Source:** `src/lib/supabase/server.ts` (all 26 lines) + `src/components/Header.tsx` lines 4–6
**Apply to:** `Footer.tsx` (new), `Header.tsx` (already uses it)
```typescript
// createSupabaseServerClient is ASYNC — always await
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Supabase Admin Client
**Source:** `src/lib/supabase/admin.ts` (all 14 lines) + `src/app/my/page.tsx` lines 17–30
**Apply to:** `Footer.tsx` (new), `src/lib/members.ts` (existing, no change to client usage)
```typescript
// createSupabaseAdminClient is SYNC — no await
const admin = createSupabaseAdminClient()
const { data: member } = await admin
  .from('members')
  .select('publication_id')
  .eq('user_id', user.id)
  .maybeSingle()
```

### Georgia Serif Logo Style
**Source:** `src/components/Header.tsx` lines 11–17
**Apply to:** `login/page.tsx` (logo p tag), `signin-51cf21389c56/page.tsx` (logo p tag)
```tsx
// Header uses text-lg on Link; pages use text-2xl on <p> (non-clickable)
className="text-2xl font-black text-center mb-6"
style={{ fontFamily: 'Georgia, serif' }}
```

### 'use client' Component Structure
**Source:** `src/components/LogoutButton.tsx` lines 1–16
**Apply to:** `HeaderNav.tsx` (new)
```tsx
'use client'

import { ... } from '...'

export default function ComponentName(...) {
  // browser hooks (usePathname, useState, etc.) used here
}
```

### Link Hover Style
**Source:** `src/components/Header.tsx` lines 19–31 (both nav links)
**Apply to:** `HeaderNav.tsx` (both マイページ and ログイン links)
```tsx
className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
```

### Footer Link Hover Color
**Source:** `src/app/layout.tsx` line 34 (existing inline footer)
**Apply to:** `Footer.tsx` (all conditional links)
```tsx
className="hover:text-[#FF6719] underline"
```

---

## No Analog Found

All files have close analogs in the codebase. No files require pure RESEARCH.md pattern fallback.

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`
**Files scanned:** 14 source files read directly
**Pattern extraction date:** 2026-06-08
