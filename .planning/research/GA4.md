# GA4 Integration Research — Next.js App Router

**Researched:** 2026-06-07
**Domain:** Google Analytics 4 / Next.js App Router / @next/third-parties
**Stack:** Next.js 16.2.6, React 19.2.4, TypeScript 5, Vercel

---

## Recommended Implementation Approach

### Use `@next/third-parties` — The Official Path

`@next/third-parties` (version 16.2.7, published 2023-10, maintained inside the `vercel/next.js` monorepo) is the official and recommended approach. It wraps `next/script` with the right defaults so you do not hand-roll script loading strategy, hydration timing, or dataLayer initialization. [VERIFIED: nextjs.org/docs/app/guides/third-party-libraries]

The package is already installed in this project (added during research). It is a Server Component-compatible import — the `GoogleAnalytics` component is marked `'use client'` internally (verified in `node_modules/@next/third-parties/dist/google/ga.js`), so you can import it directly from a Server Component layout without wrapping.

`@next/third-parties` is listed as "experimental" in the official docs but it ships versioned alongside Next.js itself, is tested in the monorepo, and is the approach Next.js's own linter (`next-script-for-ga`) pushes you towards. Treat "experimental" as "API may evolve" not "avoid in production."

### Minimal production-safe setup

**Step 1 — Add env var**

```
# .env.local  (never commit to git)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Step 2 — Update `src/app/layout.tsx`**

```tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
        <footer>…</footer>
      </body>
      {/* GA loads after hydration; only renders when env var is set */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  )
}
```

Key points:
- Place `<GoogleAnalytics>` **outside** `<body>` but inside `<html>` — this is the pattern from the official docs. The component injects `<Script>` tags which Next.js hoists correctly.
- The `process.env.NEXT_PUBLIC_GA_ID` guard means: if the env var is absent (local dev, staging without GA), no script loads. This is the simplest dev/prod split.
- The component uses `afterInteractive` strategy internally (loads after hydration), which is correct for analytics — it does not block LCP.

**Step 3 — Custom event tracking (client components only)**

```tsx
'use client'
import { sendGAEvent } from '@next/third-parties/google'

// Example: track a button click
<button onClick={() => sendGAEvent('event', 'article_click', { article_id: id })}>
  Read
</button>
```

`sendGAEvent` pushes to `window.dataLayer` directly. It logs a `console.warn` if GA was not initialized (e.g. in dev with no env var) rather than throwing. [VERIFIED: inspected source at node_modules/@next/third-parties/dist/google/ga.js]

---

## Pageview Tracking — No Extra Code Needed

GA4's gtag.js automatically fires a `page_view` event on `history.pushState` / `replaceState`, which is exactly how Next.js App Router handles client-side navigation. This replaces the old Pages Router pattern of `router.events.on('routeChangeComplete', …)` which no longer exists in App Router. [CITED: nextjs.org/docs/app/guides/third-party-libraries — "Tracking Pageviews" section]

The old `router.events` API was removed in Next.js 13 App Router. Do not use it.

**One admin action required:** In your GA4 property settings, confirm that Enhanced Measurement is enabled and "Page changes based on browser history events" is checked. This is on by default in new GA4 properties.

---

## `@next/third-parties` vs Manual `<Script>` Tag

| Aspect | `@next/third-parties` | Manual `next/script` |
|--------|----------------------|----------------------|
| Script loading strategy | `afterInteractive` (correct default) | Developer must set explicitly |
| dataLayer init | Handled internally | Must write inline script manually |
| gtag.js URL construction | Automatic | Manual string concat |
| `sendGAEvent` / `sendGTMEvent` helpers | Included | Must build own abstraction |
| Server Component compatible | Yes (client boundary inside) | Yes |
| Maintenance burden | Zero (versioned with Next.js) | Yours |

**Verdict:** Use `@next/third-parties`. The manual approach only makes sense if you need Consent Mode v2 plumbing (see below) — even then you layer it on top, not instead of.

---

## Vercel-Specific Considerations

- **No Vercel-specific GA integration exists.** Vercel offers its own products: Web Analytics (pageview-level, cookieless) and Speed Insights (Core Web Vitals). Neither replaces GA4 behavioral tracking. They are additive, not alternatives. [CITED: vercel.com/docs/analytics, vercel.com/docs/speed-insights]
- **Environment variables on Vercel:** Set `NEXT_PUBLIC_GA_ID` in Vercel project settings > Environment Variables. Scope it to "Production" only if you want staging to be untracked, or set a separate GA4 property for preview and scope per environment.
- **Vercel's build does not inject GA automatically** — the `@next/third-parties` component is the complete solution; nothing extra is needed.
- **Vercel Web Analytics** can be added later with `@vercel/analytics` (a separate tiny package) if you want cookieless aggregate data alongside GA4. It is independent and does not interfere.

---

## Key Pitfalls and How to Avoid Them

### 1. Development data polluting production GA4 property

**Problem:** Running `npm run dev` locally with `NEXT_PUBLIC_GA_ID` set sends hits to your production property.

**Solutions (pick one):**
- (Simplest) Add `&& process.env.NODE_ENV === 'production'` to the guard condition: `{process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production' && <GoogleAnalytics … />}`. Note: `NODE_ENV` is `'production'` only during `next build` / `next start`, not `next dev`.
- (Recommended for parity testing) Create a second GA4 property for development and use a `.env.local` entry pointing to it. [CITED: GA4 admin docs — Data Filters]
- (Cleanup fallback) Add a Data Filter in GA4 Admin to exclude traffic from hostname `localhost`.

### 2. Double pageview events

**Problem:** If you add a custom `usePathname` + `useEffect` pageview tracker AND leave Enhanced Measurement on, you get 2× pageviews.

**Rule:** Use one mechanism only. With `@next/third-parties`, Enhanced Measurement handles it. Do not add a manual pageview sender.

If for some reason you must send manual pageview events (e.g. custom parameters), set `send_page_view: false` in the gtag config to disable automatic ones:
```js
gtag('config', 'G-XXXXXXXXXX', { send_page_view: false });
```
The `@next/third-parties` component does not expose this option directly — you would need the manual `next/script` approach in that case.

### 3. Ad blockers silently drop GA in development

GA4 hits from localhost are blocked by most ad blockers and privacy extensions (uBlock Origin, Privacy Badger, etc.). This is normal. Test GA functionality in an incognito window with extensions disabled, or use the GA4 DebugView in the Admin panel with `debugMode` prop:

```tsx
<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} debugMode={process.env.NODE_ENV !== 'production'} />
```

`debugMode` makes hits appear in GA4 DebugView in near-real-time (seconds instead of 24-48h).

### 4. `sendGAEvent` called before GA initializes

**Problem:** If `sendGAEvent` is called during SSR or before the GA script hydrates, it logs a `console.warn` and does nothing. The event is lost.

**Rule:** Only call `sendGAEvent` from event handlers (onClick, onSubmit, etc.) or inside `useEffect` with a dependency on user action — never at module load time or in Server Components.

### 5. GDPR / Consent Mode v2 (relevant if EU traffic is expected)

Google began enforcing Consent Mode v2 for EEA traffic in March 2024, with advertising feature shutoff for non-compliant properties starting July 2025. [CITED: developers.google.com/tag-platform/security/guides/consent]

**For this project (Japanese-primary audience):** Japan's Act on Protection of Personal Information (APPI) does not require an opt-in cookie banner for analytics at the same legal threshold as GDPR. However, if any EU users visit the site, Consent Mode v2 becomes relevant for ad features. Since this app currently has no ads or remarketing, the immediate risk is low.

**If you add ads later or expect EU traffic, the minimum required pattern is:**

```html
<!-- Before gtag.js loads -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
</script>
```

This requires a manual `next/script` inline block before `@next/third-parties` loads, plus a consent UI that calls `gtag('consent', 'update', { analytics_storage: 'granted' })` on accept. This is a separate feature, not a blocker for the initial GA4 integration.

---

## Version-Specific Notes (Next.js 16 / React 19)

### `@next/third-parties` version alignment

`@next/third-parties` 16.2.7 ships alongside Next.js 16.2.7 and is tested against React 19. The peer dependency conflict documented in GitHub issue #71602 affected Next.js 15 RC + React 19 RC combinations from late 2024. **This is resolved in the stable 16.x release.** Installation in this project (Next.js 16.2.6 + React 19.2.4) completed without errors, confirmed by slopcheck `[OK]` and npm install success.

### App Router constraint: no `router.events`

`router.events` was removed in Next.js 13 App Router. Any tutorial showing `useRouter().events.on('routeChangeComplete', …)` for GA pageview tracking is Pages Router documentation and must not be used. The `@next/third-parties` component handles this correctly via gtag's native history API listener.

### React 19 + Server Components

The `GoogleAnalytics` component is a Client Component (marked `'use client'` at the top of `ga.js`). You can import it from Server Component layouts without any wrapping — Next.js handles the boundary automatically. This is confirmed by the official docs pattern placing `<GoogleAnalytics>` directly in `app/layout.tsx` which is a Server Component.

### `debugMode` prop

The `debugMode` boolean prop was added in the 14.x series and is present in 16.2.7 (verified in source). It is not documented prominently but is in the component's TypeScript signature.

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@next/third-parties` | npm | ~2.5 yrs (2023-10) | github.com/vercel/next.js | [OK] | Approved |

Packages removed due to slopcheck [SLOP] verdict: none
Packages flagged as suspicious [SUS]: none

---

## Sources

**HIGH confidence (official docs, verified in source):**
- [Next.js — Third Party Libraries guide](https://nextjs.org/docs/app/guides/third-party-libraries) — GoogleAnalytics component API, pageview tracking, sendGAEvent
- [Next.js — next-script-for-ga message](https://nextjs.org/docs/messages/next-script-for-ga) — official migration guidance from inline script
- [Google — Set up Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) — Consent Mode v2 parameters and defaults
- Installed source: `node_modules/@next/third-parties/dist/google/ga.js` — actual implementation, script strategy, sendGAEvent behavior

**MEDIUM confidence (web search, verified against official docs):**
- [Next.js GitHub Discussion #42016](https://github.com/vercel/next.js/discussions/42016) — router.events removal in App Router
- [Vercel Speed Insights docs](https://vercel.com/docs/speed-insights) — scope of Vercel's own analytics products
- [GA4 Enhanced Measurement — Google Support](https://support.google.com/analytics/answer/9216061) — "Page changes based on browser history events" checkbox

**LOW confidence (community articles, not independently verified):**
- Various Medium posts on conditional NODE_ENV rendering — pattern matches official docs reasoning but not cited in Next.js docs directly
