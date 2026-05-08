# Technology Stack

**Project:** Keep Substack
**Researched:** 2026-05-08

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.5.x (LTS) | Full-stack React framework | v16 has breaking changes (proxy.ts, Cache Components). v15 has stable ISR that meets all project requirements. Excellent Vercel free tier compatibility |
| React | 18.x | UI library | Compatible with Next.js 15. React 19 is for v16 -- unnecessary here |
| TypeScript | 5.x | Type safety | Supported by Next.js 15/16. Essential for DX and bug prevention |

### CSS / UI
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x (4.2+) | Utility-first CSS | 5x faster builds vs v3. No config file needed (auto-scan). Confirmed compatible with Next.js 15 |
| @tailwindcss/postcss | 4.x | PostCSS integration | Official recommended plugin for Tailwind v4 with Next.js |

### Data Fetching / RSS
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| rss-parser | 3.13.0 | RSS feed parsing | 530K weekly downloads on npm. Lightweight, TypeScript types included. Specified in PROJECT.md. No updates in 3 years but RSS is a stable spec -- this is fine |

### Date Handling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| date-fns | 4.x | Date manipulation and calendar math | Tree-shakeable for minimal bundle. Functional API is clean. Provides `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `format`, `getDay` -- all needed for calendar grid construction |

### Tooltip / Popover
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (CSS/HTML native) | - | Hover article title display | Project tooltips are simple info display only. CSS `:hover` + absolute positioning is sufficient. No external library needed (YAGNI) |

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | - | Hosting and deploy | Next.js creator. Native ISR support. Free tier handles 50 feeds easily |
| Node.js | 20.x LTS | Runtime | Next.js 15 minimum requirement. LTS for stability |

### Dev Tools
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | 9.x | Linter | Works with eslint-config-next |
| Prettier | 3.x | Formatter | Code style consistency |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework version | Next.js 15.5.x | Next.js 16.x | v16 deprecates middleware.ts, introduces Cache Components, requires React 19.2. Too much churn for a small project. v15 ISR meets all requirements |
| CSS version | Tailwind CSS v4 | Tailwind CSS v3 | v4 eliminates config file (simpler). Faster builds. v3 requires tailwind.config.js |
| RSS Parser | rss-parser | fast-xml-parser (raw) | rss-parser abstracts RSS/Atom parsing. Manual XML parsing is YAGNI |
| RSS Parser | rss-parser | @rowanmanning/feed-parser | rss-parser has vastly more downloads and community track record |
| Date library | date-fns | dayjs (2KB) | date-fns tree-shakes better. Functional API is cleaner for calendar operations. dayjs is better for moment.js migration (not our case) |
| Date library | date-fns | Native Date API | Calendar construction needs "first day of month", "days in month", "day of week" -- verbose with native API |
| Tooltip | CSS native | Floating UI / Tippy.js | 3KB+ library for simple hover display is overkill (KISS) |

## Version Compatibility Matrix

| Package | Version | Node.js | React | TypeScript |
|---------|---------|---------|-------|------------|
| next | 15.5.x | >=18.18.0 | 18.x | >=5.0 |
| tailwindcss | 4.x | >=18 | - | - |
| rss-parser | 3.13.0 | >=12 | - | - |
| date-fns | 4.x | >=16 | - | >=5.0 |

## Installation

```bash
# Create project with Next.js 15
npx create-next-app@15 keep-substack --typescript --tailwind --eslint --app --src-dir

# RSS parsing
npm install rss-parser

# Date utilities
npm install date-fns
```

## Key Configuration

### next.config.ts
```typescript
const nextConfig = {
  // ISR is built-in with App Router
  // revalidate is set per-page via export const revalidate = N
};
export default nextConfig;
```

### PostCSS (Tailwind v4)
```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### ISR Configuration (per page)
```typescript
// app/page.tsx
export const revalidate = 300; // 5 minutes default, configurable
```

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| Next.js 15.5.x | HIGH | Official docs and release notes verified. v16 is stable but v15 LTS is sufficient |
| Tailwind CSS v4 | HIGH | Official Next.js guide confirmed. Default in create-next-app |
| rss-parser 3.13.0 | HIGH | Verified on npm. 530K weekly downloads. Stable, mature |
| date-fns 4.x | MEDIUM | Tree-shaking support is well-known. Calendar-specific suitability is project-specific judgment |
| CSS native tooltip | MEDIUM | Based on KISS/YAGNI principles. Can switch to Floating UI if complex positioning needed later |

## Sources

- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- confirmed v16 breaking changes
- [Next.js ISR Documentation via Context7](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/incremental-static-regeneration.mdx)
- [rss-parser on npm](https://www.npmjs.com/package/rss-parser) -- version and download stats
- [Tailwind CSS v4 Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) -- official setup
- [tailwindcss on npm](https://www.npmjs.com/package/tailwindcss) -- version 4.2.4 confirmed
- [Floating UI](https://floating-ui.com/) -- tooltip alternative investigated
- [Next.js endoflife.date](https://endoflife.date/nextjs) -- version lifecycle
