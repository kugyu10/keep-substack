---
phase: 28
slug: db-my
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.6 |
| **Config file** | `vitest.config.ts` (include: `src/**/*.{test,spec}.{ts,tsx}`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | SCHED-03 | T-28-01 | migration が FK 型一致（UUID）で適用される | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | SCHED-03 | T-28-01 | RLS 有効: 本人のみ INSERT/UPDATE/DELETE 可 | manual | Supabase Dashboard で確認 | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | SCHED-01 | — | frequency select 1〜4 で slots 配列が増減する | unit | `npm test -- updateCommitSlotsAction` | ❌ W0 | ⬜ pending |
| 28-02-02 | 02 | 2 | SCHED-02 | — | day_of_week + hour が FormData から正しく parse される | unit | `npm test -- updateCommitSlotsAction` | ❌ W0 | ⬜ pending |
| 28-02-03 | 02 | 2 | SCHED-03 | T-28-02 | updateCommitSlotsAction が delete+insert を実行し null を返す | unit | `npm test -- updateCommitSlotsAction` | ❌ W0 | ⬜ pending |
| 28-02-04 | 02 | 2 | SCHED-03 | T-28-02 | 未認証時に auth エラー文字列を返す | unit | `npm test -- updateCommitSlotsAction` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/my/__tests__/updateCommitSlotsAction.test.ts` — SCHED-01, SCHED-02, SCHED-03 のユニットテスト（`updateMyProfileAction.test.ts` の mock 構造を転用）

*既存インフラ: vitest + mock 構造は Phase 27 で確立済み。新規インストール不要。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| migration がエラーなく適用される | SCHED-03 | DB 操作は vitest でモックできない | `supabase db push` を実行し exit 0 を確認 |
| RLS: 別ユーザーが DELETE できないこと | SCHED-03 | RLS ポリシーのテストは E2E または手動 | Supabase Dashboard の RLS テスト機能、または別ユーザーの JWT でリクエスト |
| /my ページで設定が再ロード後も反映されること | SCHED-01/02 | UI 統合テスト | ブラウザで設定→保存→リロード→確認 |

---

## Threat Model Summary

| Threat | STRIDE | Mitigation |
|--------|--------|-----------|
| T-28-01: member_id なりすまし | Tampering | Server Action で `auth.getUser()` → members テーブルで user_id 照合。FormData の member_id を直接信頼しない |
| T-28-02: 範囲外の day_of_week / hour | Tampering | DB CHECK 制約（1〜7, 0〜23）+ Server Action 内バリデーション |
| T-28-03: 大量スロット INSERT | DoS | Server Action で `slots.length <= 4` を検証 |
