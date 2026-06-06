---
phase: 31
slug: login-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | AUTH-FIX-01-a | — | pid/handle 欠落時エラー返す | unit | `npx vitest run src/app/login-51cf21389c56/__tests__/` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | AUTH-FIX-01-b | — | pid 未一致で新規 member INSERT | unit | `npx vitest run src/app/auth/__tests__/callback.test.ts` | ✅ 拡張 | ⬜ pending |
| 31-01-03 | 01 | 1 | AUTH-FIX-01-c | — | 23505 時 handle=null フォールバック | unit | `npx vitest run src/app/auth/__tests__/callback.test.ts` | ✅ 拡張 | ⬜ pending |
| 31-02-01 | 02 | 2 | AUTH-FIX-01-d | — | 23505 でエラーメッセージ返す | unit | `npx vitest run src/app/my/__tests__/updateMyProfileAction.test.ts` | ✅ 拡張 | ⬜ pending |
| 31-02-02 | 02 | 2 | AUTH-FIX-01-e | — | admin が handle/publication_id 更新できる | unit | `npx vitest run src/app/admin/__tests__/updateMemberAction.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts` — AUTH-FIX-01-a (pid/handle 欠落バリデーション)
- [ ] `src/app/admin/__tests__/updateMemberAction.test.ts` — AUTH-FIX-01-e (admin substack_handle / publication_id 更新)

*Existing: `src/app/auth/__tests__/callback.test.ts` および `src/app/my/__tests__/updateMyProfileAction.test.ts` に新テストケース追加で対応*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Magic Link メール送信→クリック→セッション確立 | AUTH-FIX-01 | Supabase メール送信を mock できない | 実環境でログイン試行し /my へリダイレクト確認 |
| 重複 substack_handle でのフォールバック動作 | AUTH-FIX-01-c | DB unique 制約は実 DB 環境でのみ確認可能 | 同 handle の 2 件目 magic link を dev 環境でテスト |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
