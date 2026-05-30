---
phase: 24
slug: admin-teams-teamname-hidden
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.6 |
| **Config file** | none — vitest デフォルト設定（`vitest.config.*` 不在を確認） |
| **Quick run command** | `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~5 seconds (single file) / full suite per project |

**確立済みパターン（流用元）:** `src/app/my/__tests__/page.test.tsx` — jsdom不使用で RSC が返す React element ツリーを `findByType` で走査し props を検証するスタイル。`next/navigation` の `redirect` は throw でモック、`@/lib/*` は `vi.mock` でスタブ。本フェーズもこのパターンを流用する。

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | VIEW-01 | — | 有効 teamName でフィルタ後メンバーが `<WeeklyHeatmapGrid>` の `results` props に渡る | unit (RSC element-tree) | `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx -t "renders heatmap"` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | VIEW-01 | — | teamName完全一致(D-07): 別チームは除外、status無視で hidden も含む (D-06) | unit | `... -t "filters by exact teamName"` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | VIEW-01 | — | 日本語/エンコード teamName が decode されフィルタ一致 | unit | `... -t "decodes encoded teamName"` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 1 | VIEW-01 | — | DB未存在 teamName → 200でメッセージ、`WeeklyHeatmapGrid` 不在 (D-01) | unit | `... -t "unknown team shows message"` | ❌ W0 | ⬜ pending |
| 24-01-05 | 01 | 1 | VIEW-01 | — | 存在するが0人 → 200でメッセージ (D-01/D-05) | unit | `... -t "empty team shows message"` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | VIEW-02 | EoP / Info Disclosure | proxy.ts: 非admin/未認証 → `/` リダイレクト（既存ゲートが新ルートを自動カバーすることの確認） | unit (proxy 直テスト) | `npx vitest run src/__tests__/proxy.test.ts -t "non-admin redirect"` | ❌ W0（任意） | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**観測可能シグナル（admin保護SSRルートゆえの工夫）:** ページが返す React element ツリーを直接 await して検査（jsdom/レンダリング不要）。`findByType(el, WeeklyHeatmapGrid)` の有無、`.props.results` の中身、メッセージ `<p>` テキストで判定。`getMembers`/`fetchAllFeedsCached` は `vi.mock` で固定値を返し、実RSS/DBに依存させない。

---

## Wave 0 Requirements

- [ ] `src/app/admin/teams/__tests__/teamPage.test.tsx` — VIEW-01 / D-01 / D-05 / D-06 / D-07 / decode を網羅。`src/app/my/__tests__/page.test.tsx` の element-tree + vi.mock パターンを流用。
- [ ] (任意) `src/__tests__/proxy.test.ts` — VIEW-02 確認テスト。proxy 無変更のため優先度低。
- [ ] 共有 fixture 不要（各テストで `getMembers`/`fetchAllFeedsCached` を直接モック）。
- [ ] framework install 不要（vitest 導入済み）。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ブラウザで実 admin セッションでの `/` リダイレクト体感 | VIEW-02 | 実 Supabase セッション + middleware ランタイム挙動。unit は proxy 関数の戻り値のみ検証 | E2E は Phase 26 スコープ。手動: 非admin でログインし `/admin/teams/{任意}` を開く → `/` へ遷移することを確認 |
| hidden チームの実データ表示 | VIEW-01 / SC#3 | 実 DB の hidden チームメンバー + 実 RSS フィード取得 | 手動: admin で `/admin/teams/{hidden チーム名}` を開き、週次ヒートマップにそのメンバーが表示されることを確認 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
