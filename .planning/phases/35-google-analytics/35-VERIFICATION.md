---
phase: 35-google-analytics
verified: 2026-06-08T07:55:00Z
status: human_needed
score: 6/8 must-haves verified (2 require human)
overrides_applied: 1
overrides:
  - must_have: "開発環境（NODE_ENV !== 'production'）では GA4 トラッキングが無効になる"
    reason: "User explicitly chose env-var-guard strategy over NODE_ENV check (documented in 35-DISCUSSION-LOG.md: 'env var ガード（NODE_ENV チェック不要）'). Dev environment has no NEXT_PUBLIC_GA_MEASUREMENT_ID set in .env.local — GA script is silent. The intent of ANLT-02 (GA disabled in dev) is achieved through D-10 design decision."
    accepted_by: "kugyu10"
    accepted_at: "2026-06-08T00:00:00Z"
human_verification:
  - test: "本番 URL（https://keep-substack.vercel.app）をブラウザで開き DevTools Network タブで gtag/js へのリクエストが発生していることを確認する"
    expected: "gtag/js?id=G-XXXXXXXXXX へのリクエストが Network タブに表示される"
    why_human: "Vercel 本番環境変数と実際のブラウザ動作はコード検査では確認不可。env var がビルド時にインライン化されるため、Vercel 側の設定状況をコードから読み取れない。"
  - test: "GA4 管理画面のリアルタイムレポートを開き、本番 URL を訪問してページビューがカウントされることを確認する"
    expected: "GA4 リアルタイムレポートにページビューが 1 件以上記録される（数分の遅延あり）"
    why_human: "GA4 データ収集は外部サービス（Google Analytics）への依存があり、プログラム的に検証不可。"
---

# Phase 35: チーム可視性拡張 + Google Analytics — Verification Report

**Phase Goal:** private チームがトップビューのチームタブに表示されてログイン不要で閲覧でき、GA4 が本番環境の全ページでページビューをトラッキングしている
**Verified:** 2026-06-08T07:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | private チームが未ログインユーザーに対してトップページのタブとして表示される | VERIFIED | `src/app/page.tsx` line 21: `.filter((t) => t.status !== 'hidden')` — private チームが teams 配列に含まれる。TEAM-03 テストが toContain('PrivateTeam') / toContain('SecretTeam') でアサート、5/5 グリーン |
| 2 | hidden チームはタブに表示されない | VERIFIED | `src/app/page.tsx` line 21: `t.status !== 'hidden'` フィルタが hidden を除外。テスト: `expect(labels).not.toContain('HiddenTeam')` グリーン |
| 3 | All タブに private チームのメンバーが引き続き表示される | VERIFIED | `src/app/page.tsx` line 30: `filteredMembers` は `m.teams.every((t) => t.status !== 'hidden')` を使用 — private メンバーは hidden でないので All タブに表示される。TEAM-04 テスト: Alice (public) + Bob (private) が included、Carol (hidden) が excluded でグリーン |
| 4 | /my ページからの private チームへの参加・退出操作は引き続き不可 | VERIFIED | `src/app/my/page.tsx` line 44: `.eq('status', 'public')` — join リストは public チームのみ。`src/app/my/actions.ts` line 91: `.eq('status', 'public')` で DB 側も public のみ。`MyProfileForm.tsx` line 112-123: private チームは `disabled` + `cursor-not-allowed` でレンダリング |
| 5 | 本番環境（NEXT_PUBLIC_GA_MEASUREMENT_ID 設定済み）では GoogleAnalytics スクリプトが全ページに注入される | VERIFIED (code) | `src/app/layout.tsx` line 5: import済み。line 29-31: `{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics gaId={...} />}` — root layout に配置され全ページに適用される。コード実装は正しい。本番環境での実動作は Human Verification 参照 |
| 6 | 開発環境では GA スクリプトが読み込まれない | PASSED (override) | Override: env var ガード戦略（D-10）を採用。`.env.local` に `NEXT_PUBLIC_GA_MEASUREMENT_ID` は未設定（確認済み）→ ローカルでは短絡評価で GA スクリプト非注入。NODE_ENV チェック不使用はユーザーが明示的に選択した設計決定（35-DISCUSSION-LOG.md） |
| 7 | 全テストスイート（22 ファイル・150 テスト以上）がグリーン | VERIFIED | `npx vitest run` 実行結果: `Test Files 22 passed (22)`, `Tests 150 passed (150)` |
| 8 | 本番デプロイ後に GA4 プロパティでページビューが記録される | ? HUMAN NEEDED | Vercel 本番環境変数の設定と GA4 リアルタイム動作はコード検査では確認不可 |

**Score:** 6/8 truths verified (1 override applied, 2 human verification pending)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/page.tsx` | private チームをタブに含む teams 配列（`status !== 'hidden'` フィルタ） | VERIFIED | Line 21: `t.status !== 'hidden'` 確認済み。filteredMembers (line 30) は変更なし |
| `src/app/__tests__/page.test.tsx` | TEAM-01 の新仕様に適合した TEAM-03 テスト | VERIFIED | Line 139: `'shows public AND private team names as tabs — hidden teams absent'`. toContain('PrivateTeam') / toContain('SecretTeam') アサート確認済み |
| `src/app/layout.tsx` | GoogleAnalytics コンポーネントの条件付きレンダリング | VERIFIED | Import line 5 + conditional render lines 29-31 確認済み |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/page.tsx` | `teams` 配列（line 21） | `flatMap` filter change | WIRED | `t.status !== 'hidden'` が teams 計算を制御。実際に tabs JSX（line 64）でレンダリング |
| `src/app/layout.tsx` | `@next/third-parties/google` | `import { GoogleAnalytics }` | WIRED | `from '@next/third-parties/google'` line 5。パッケージ v16.2.7 インストール済み確認 |
| `src/app/layout.tsx` | `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` | conditional render `&&` | WIRED | `NEXT_PUBLIC_GA_MEASUREMENT_ID &&` line 29 確認。ローカル未設定も確認済み |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/app/page.tsx` | `teams` | `allMembers` from `getMembers()` (DB query) | Yes | FLOWING — DB 由来の team.status を使い動的にフィルタ |
| `src/app/layout.tsx` | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Vercel 本番環境変数（ビルド時インライン） | Yes (in prod) | FLOWING (conditional) — env var 存在時のみ GA コンポーネントがレンダリング |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| page.test.tsx 全テストグリーン | `npx vitest run src/app/__tests__/page.test.tsx` | `Test Files 1 passed (1)`, `Tests 5 passed (5)` | PASS |
| 全スイートグリーン | `npx vitest run` | `Test Files 22 passed (22)`, `Tests 150 passed (150)` | PASS |
| layout.tsx に GoogleAnalytics import | `grep -n "GoogleAnalytics" src/app/layout.tsx` | Line 5 (import) + Line 30 (JSX) の 2 件 | PASS |
| layout.tsx に条件付きレンダリング | `grep -n "NEXT_PUBLIC_GA_MEASUREMENT_ID" src/app/layout.tsx` | Line 29: `{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID &&` | PASS |
| layout.tsx に NODE_ENV チェックなし | `grep "NODE_ENV" src/app/layout.tsx` | 結果なし（0 件） | PASS |
| page.tsx filter 変更確認 | `grep -n "t\.status !== 'hidden'" src/app/page.tsx` | Line 21 と Line 30 の 2 件 | PASS |

---

### Probe Execution

No conventional probes (`scripts/*/tests/probe-*.sh`) found. Step 7c: SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TEAM-01 | 35-01-PLAN.md | private チームがトップビューのチームタブに表示され、ログイン不要で閲覧できる（/my ページでの参加・退出制限はそのまま維持） | SATISFIED | `page.tsx` line 21 フィルタ変更確認済み。/my ページの readonly 制限確認済み。テスト 5/5 グリーン |
| ANLT-01 | 35-02-PLAN.md, 35-03-PLAN.md | GA4 が全ページのページビューを自動トラッキングする（`@next/third-parties` の `GoogleAnalytics` コンポーネント使用） | SATISFIED (code) / NEEDS HUMAN (prod) | `layout.tsx` にコンポーネント実装済み。本番動作は Human Verification 必要 |
| ANLT-02 | 35-02-PLAN.md, 35-03-PLAN.md | 開発環境では GA4 トラッキングが無効になる | SATISFIED (override) | env var ガード戦略（D-10）によりローカル開発では GA 非ロード。`.env.local` に変数未設定確認済み。NODE_ENV チェック不使用はユーザー決定 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/__tests__/page.test.tsx` | 25-27 | `vi.mock('@/components/PrBanner', ...)` — PrBanner は page.tsx に import されていないためデッドモック（WR-02 in REVIEW.md） | Warning | テスト意図が不明確になる。テスト動作に影響なし |
| `.env.example` | — | `NEXT_PUBLIC_GA_MEASUREMENT_ID` が未記載（WR-01 in REVIEW.md） | Warning | 新規開発者や CI セットアップ時に GA 設定が漏れるリスク |

**Debt marker check:** `TBD`, `FIXME`, `XXX` マーカーなし — クリーン。

---

### Human Verification Required

#### 1. 本番 GA4 ページビュートラッキング動作確認

**Test:** 本番 URL（https://keep-substack.vercel.app）をブラウザで開き、DevTools の Network タブで `gtag/js` へのリクエストが発生していることを確認する。その後 GA4 管理画面のリアルタイムレポートで自分のアクセスが記録されることを確認する。
**Expected:** Network タブに `gtag/js?id=G-XXXXXXXXXX` リクエスト表示、かつ GA4 リアルタイムレポートに 1 件以上のページビューが記録される。
**Why human:** Vercel 本番環境変数（`NEXT_PUBLIC_GA_MEASUREMENT_ID`）の設定状況と GA4 外部サービスへのデータ送信はコードベース内から検証不可。NEXT_PUBLIC_* 変数はビルド時インライン化のため、Vercel ダッシュボードの設定内容を読み取れない。

---

### Gaps Summary

技術的実装（コードベース）については全 must-have が VERIFIED または override 適用済みで達成されている。未解決ギャップは以下の 2 件のみで、いずれも本番外部サービス動作確認が必要な項目：

1. **本番 GA4 ページビュー記録**（SC-3）— Vercel 環境変数設定と GA4 外部サービス連携のため Human Verification が必要。35-03-SUMMARY.md ではユーザーが Vercel 設定を完了したと記録されているが、実際の GA4 動作確認は人間による確認が必要。

**Review document open items（非ブロッカー）:**
- WR-01: `.env.example` に `NEXT_PUBLIC_GA_MEASUREMENT_ID` 未記載（ops/onboarding リスク）
- WR-02: `page.test.tsx` に PrBanner のデッドモック残存（テスト動作に影響なし）

これらは next phase（Phase 36）またはハウスキーピングで対処可能。フェーズ目標の達成を妨げない。

---

_Verified: 2026-06-08T07:55:00Z_
_Verifier: Claude (gsd-verifier)_
