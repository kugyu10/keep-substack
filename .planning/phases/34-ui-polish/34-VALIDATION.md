---
phase: 34
slug: ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.6 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds (128 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | UI-04 | — | N/A (type change) | type-check + unit | `npm test -- members` | ✅ | ⬜ pending |
| 34-01-02 | 01 | 1 | UI-04 | — | N/A (fixture update) | unit | `npm test` | ✅ | ⬜ pending |
| 34-02-01 | 02 | 1 | UI-01 | — | N/A (layout, no auth bypass) | unit | `npm test -- "\\(auth\\)"` | ❌ W0 | ⬜ pending |
| 34-02-02 | 02 | 1 | UI-02 | — | N/A (static text) | unit | `npm test -- login` | ✅ (updated) | ⬜ pending |
| 34-03-01 | 03 | 2 | UI-04 | — | N/A (sort logic) | unit | `npm test -- commitUtils` | ✅ | ⬜ pending |
| 34-03-02 | 03 | 2 | UI-04 | — | N/A (sort tests) | unit | `npm test -- commitUtils` | ✅ | ⬜ pending |
| 34-04-01 | 04 | 2 | UI-03 | T-footer-ssrf | publicationId はユーザー入力を経由せずDBから取得 | unit | `npm test -- Footer` | ❌ W0 | ⬜ pending |
| 34-04-02 | 04 | 2 | UI-05 | — | N/A (client routing) | unit | `npm test -- HeaderNav` | ❌ W0 | ⬜ pending |
| 34-05-01 | 05 | 3 | UI-01, UI-03 | — | N/A (wiring) | unit + integration | `npm test` | ✅ | ⬜ pending |
| 34-05-02 | 05 | 3 | UI-05 | — | N/A (wiring) | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(auth)/__tests__/layout.test.tsx` — UI-01: auth layout が children のみレンダリングし、Header/Footer を含まないことを確認
- [ ] `src/components/__tests__/Footer.test.tsx` — UI-03: 3パターン（未ログイン/ログイン+member/ログイン+nomember）の出力を確認
- [ ] `src/components/__tests__/HeaderNav.test.tsx` — UI-05: pathname === '/my' でマイページボタン非表示、他パスで表示を確認

既存ファイルの更新（❌ではなく✅）:
- `src/lib/__tests__/commitUtils.test.ts` — UI-04: `hasUser` フィールド対応 + グループ分けテスト追加（Plan 03 Task 2 で実施）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /login + /signin のヘッダー・フッター非表示を目視確認 | UI-01 | RSCはブラウザでの目視が確実 | `npm run dev` → /login, /signin-51cf21389c56 を開きHeader/Footerがないことを確認 |
| フッターのログイン状態別文言を目視確認 | UI-03 | 認証状態の切り替えを自動化するのが複雑 | ログアウト/ログイン切り替えでフッター文言3パターンを確認 |
| /my ページのマイページボタン非表示を目視確認 | UI-05 | usePathname() のE2E確認 | ログイン後 /my にアクセスしヘッダーにマイページボタンがないことを確認 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
