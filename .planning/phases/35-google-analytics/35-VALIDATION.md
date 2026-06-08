---
phase: 35
slug: google-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.6 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/app/__tests__/page.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

**Baseline:** 22 test files, 150 tests — all passing (confirmed 2026-06-08).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/__tests__/page.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | TEAM-01 | — | private チームはタブに表示される（閲覧のみ） | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ (requires UPDATE) | ⬜ pending |
| 35-01-02 | 01 | 1 | TEAM-01 | — | hidden チームはタブに表示されない | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ | ⬜ pending |
| 35-02-01 | 02 | 2 | ANLT-01 | — | GoogleAnalytics コンポーネントが layout.tsx に追加される | build | `npx tsc --noEmit && npx next build` | ❌ (build verification) | ⬜ pending |
| 35-02-02 | 02 | 2 | ANLT-02 | — | env var 未設定時 GA スクリプトが読み込まれない | manual | browser devtools で script タグ確認 | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

既存のテストインフラがフェーズ要件をカバー。新規ファイルのインストール不要。

- `src/app/__tests__/page.test.tsx` — TEAM-01 に合わせたテスト更新（Wave 1 実装タスクに含む）

*既存インフラで全フェーズ要件をカバーできる。Wave 0 の新規セットアップは不要。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 本番環境（Vercel production build）で GA スクリプトが読み込まれる | ANLT-02 | ブラウザ devtools でのネットワーク確認が必要 | 1. Vercel production deploy 後にアクセス 2. DevTools → Network → `gtag` または `googletagmanager` スクリプトを確認 |
| ローカル開発環境（next dev）では GA スクリプトが読み込まれない | ANLT-02 | 環境変数の有無によるランタイム動作 | 1. `.env.local` に `NEXT_PUBLIC_GA_MEASUREMENT_ID` を設定しない 2. `npm run dev` で起動 3. DevTools → Network に GA スクリプトが存在しないことを確認 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
