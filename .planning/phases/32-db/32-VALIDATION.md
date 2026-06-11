---
phase: 32
slug: db
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 32 — Validation Strategy

> Per-phase validation contract. Reconstructed retroactively (State B) by /gsd:validate-phase.

**Phase nature:** 純粋な運用フェーズ — コード変更ゼロ（`files_modified: []`）。本番 Supabase DB
(xolhjcngrwwwqtklmoyk) へ Phase 28 で作成済みのマイグレーション 2 本を適用しただけ。自動化可能な
コード振る舞いは存在せず、被覆は兄弟フェーズ 28/33 のテストが所有する。

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit) / Playwright (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | unit ~数秒 / E2E ~数十秒 |

---

## Sampling Rate

- **After every task commit:** N/A — このフェーズはソースコードコミットを伴わない（DB 運用のみ）
- **Before `/gsd:verify-work`:** N/A — 検証は本番 SQL Editor / 本番ブラウザでの human checkpoint

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | DB-02 | T-32-01 | 正しい prod project ref (xolhjcngrwwwqtklmoyk) への適用 | manual | — | N/A | ✅ green (manual, operator verified 2026-06-08) |
| 32-01-02 | 01 | 1 | DB-02 | T-32-02 | 部分マイグレーション防止（CREATE TABLE） | manual | — | N/A | ✅ green (skipped — 適用済み確認) |
| 32-01-03 | 01 | 1 | DB-02 | T-32-02 | UNIQUE 制約適用 | manual | — | N/A | ✅ green (skipped — 適用済み確認) |
| 32-01-04 | 01 | 1 | DB-02 | T-32-03 | RLS が匿名 write を拒否、admin client がバイパス | manual | — | N/A | ✅ green (E2E save PASS, operator verified) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all automatable phase requirements. Phase 32 が追加したコードは
ゼロのため、生成すべき新規テストは存在しない。DB-02 の自動化可能な側面（commitSlots 保存・
スキーマ・RPC）の被覆は以下の兄弟フェーズテストが所有する:

- `src/app/my/__tests__/updateCommitSlotsAction.test.ts` — updateCommitSlotsAction → RPC（Phase 33）
- `e2e/28-commit-flow.spec.ts` — コミット保存フロー E2E（Phase 28/36）
- `supabase/schema.sql:57-104,150-166` — member_commit_slots テーブル・UNIQUE・RLS・RPC の正規ソース定義

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 本番 DB に member_commit_slots テーブルが存在する | DB-02 | 本番 DB 状態は CI で検証不可（テストは本番に接続しない／すべきでない） | SQL Editor (prod ref xolhjcngrwwwqtklmoyk) で `SELECT table_name FROM information_schema.tables WHERE table_name='member_commit_slots' AND table_schema='public'` → 1 行 |
| uq_member_commit_slots_day UNIQUE 制約が存在する | DB-02 | 同上、本番 DB 状態 | `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='member_commit_slots' AND constraint_name='uq_member_commit_slots_day'` → 1 行 |
| /my でスケジュール保存が本番で成功する | DB-02 | 本番 Vercel + 本番 DB の統合動作。コードレベルは updateCommitSlotsAction.test.ts が被覆済みだが本番実機は inherent manual | 本番 /my でメンバーログイン → スロット選択 → 保存 → 「保存に失敗しました」が出ない → リロードで表示維持 |
| RLS が匿名ユーザーの write を拒否する | DB-02 (T-32-03) | 本番 RLS ポリシーの実効性は本番環境でのみ確認可能 | 匿名セッションで member_commit_slots への INSERT が拒否される / admin client (service_role) はバイパスできることを確認 |

**Note:** 上記 4 項目はいずれも 2026-06-08 にオペレーター (kugyu10) が本番環境で検証済み
（32-VERIFICATION.md に override×4 として記録）。inherent-manual のため Nyquist 自動化対象外。

---

## Validation Sign-Off

- [x] All tasks have verify (manual checkpoints — inherent-manual operational phase)
- [x] Sampling continuity: N/A — コード変更なしの運用フェーズ
- [x] Wave 0 covers all MISSING references — 新規テスト不要（兄弟フェーズが被覆）
- [x] No watch-mode flags
- [x] Feedback latency: N/A
- [x] `nyquist_compliant: true` set in frontmatter

**Rationale for compliant:** Phase 32 はコード変更を伴わない本番 DB 運用フェーズであり、自動化
可能な振る舞いを一切追加していない。DB-02 の本質（本番 DB 状態 + 本番 E2E）は構造的に
inherent-manual であり、その manual 検証は 2026-06-08 にオペレーターが完了済み。自動化可能な
コード側被覆は Phase 28/33 のテストが所有する。よって Nyquist 観点で未充足な自動化ギャップは
存在しない。

**Approval:** approved 2026-06-11 (retroactive reconstruction)

---

## Validation Audit 2026-06-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 (automatable) |
| Resolved | 0 |
| Escalated | 0 |
| Marked manual-only | 4 |

State B reconstruction. 自動化可能なギャップなし — 純粋な運用フェーズ。全 must-have を
manual-only として記録し、兄弟フェーズ 28/33 への被覆帰属を明記。
