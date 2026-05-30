// Vitest config — scopes unit tests to src/** so `vitest run` NEVER globs the
// Playwright E2E specs under e2e/ (Pitfall 2). Convention: unit tests are
// *.test.ts(x) under src/; E2E specs are *.spec.ts under e2e/.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
