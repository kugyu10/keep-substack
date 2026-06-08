# Phase 36: QA・UAT・検証ギャップ解消 - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 27-29 で「human_needed / pending」のまま積み残された UAT シナリオと VERIFICATION.md の未検証項目を、実際に**実行し結果を記録して**クローズするフェーズ。新機能は作らない — 既存実装の振る舞いを検証し、v1.8 milestone close の出荷判定を可能にすることがゴール。

**対象ギャップ（実態）:**
- **Phase 27 HUMAN-UAT** — 6シナリオ pending（@handle入力描画 / 保存往復 / プロフィールリンク / null時フォールバック / Magic Link伝播 / substack_handle DB migration適用）
- **Phase 27 VERIFICATION** — human_needed（上記6項目に対応、コードは 10/10 検証済み）
- **Phase 28 VERIFICATION** — human_needed 2項目（① member_commit_slots テーブル存在＋RLS＋UNIQUE / ② /my スケジュール宣言フルフロー操作）
- **Phase 29 VERIFICATION** — human_needed 3項目（モバイル1週縮退 / 3列レイアウト / weekly-stamp動作）
- **Phase 29 HUMAN-UAT** — ✅ 既に resolved (3/3 pass) → 再検証しない

**スコープ外:** 検証で発見されたバグの修正そのもの（→ 新規 debug/phase として capture）、Phase 27-29 以外のフェーズの検証。

</domain>

<decisions>
## Implementation Decisions

### 検証実行方法（自動 vs 手動）
- **D-01:** ハイブリッド方式を採用。自動化できる項目は既存 Playwright E2E ハーネスを拡張して durable な回帰テスト化し、視覚目視・実メール往復が必須の項目のみ開発者が手動実行する。
- **D-02:** 自動化対象の目安 — @handle入力描画 / 保存往復 / プロフィールリンク有無（27）、/my スケジュール宣言フルフロー（28）、モバイル縮退・3列レイアウト・weekly-stamp（29 CSS/ナビ）。手動必須 — 実 Magic Link メール往復（27 シナリオ6）、本番ブラウザ目視。
- **D-03:** 自動化は技術的に可能な範囲で。困難な項目（実メール配信を伴う Magic Link 往復など）を無理に自動化しない。

### 検証環境
- **D-04:** SC#1 が要求する「本番環境で」の Phase 27 UAT 6シナリオは**本番（https://keep-substack.com）で開発者自身のアカウント（メンバー行）に対して手動実行**する。他メンバーのデータは汚さない。検証後は変更した値を元に戻す運用とする。
- **D-05:** 既存 E2E ハーネスは session-injection で **TEST project（otydhiumsdsyxepnjqjp）** に紐付いており本番には向けられない。したがって自動回帰テストは TEST project で実行し、SC#1 の「本番充足」は上記 D-04 の本番手動パスで担保する（自動化は durable な追加レイヤー）。
- **D-06:** ⚠ 本番ドメインが `keep-substack.vercel.app` → **`https://keep-substack.com`** に移行済み。Magic Link UAT（シナリオ6）実行前に Supabase の Redirect URLs / Site URL が新ドメインを許可しているか確認が必要（landmine 候補）。

### 既済項目の扱い
- **D-07:** 他フェーズで実質解消済みの項目は**参照解決（resolved-by-reference）**とし、再検証しない。該当フェーズへのポインタを記録する。
  - Phase 28 VERIFICATION ①「member_commit_slots テーブル本番存在」→ **Phase 32 で本番適用確認済み**として resolved-by-reference。
  - Phase 29 HUMAN-UAT（3シナリオ）→ 既に resolved(3/3) として再実行しない。
- **D-08:** 真に未実行の項目（Phase 27 全6、Phase 28 フルフロー操作、Phase 29 VERIFICATION 3視覚項目）にのみ実行リソースを集中する。

### 結果記録方法 / Definition of Done
- **D-09:** 結果は **27/28/29 の既存 HUMAN-UAT.md / VERIFICATION.md を in-place 更新**（status フィールド・result 行・human_verification の状態を実際の結果で更新）。Phase 36 側に統合サマリーは作らない（個別ファイルが正典）。
- **D-10:** テストが**失敗した場合は新規バグ化** — `/gsd:debug` セッションまたは新規フェーズとして capture し、milestone close 可否を明示する。失敗を黙って通さない。
- **D-11:** Definition of Done = QA-01〜QA-04 が満たされ、各ギャップが pass 記録 or resolved-by-reference or バグ化のいずれかで処理済みになり、v1.8 全フェーズの success criteria に対する出荷判定（go / no-go）が下せる状態。

### Claude's Discretion
- 自動化テストの具体的な spec ファイル構成・配置（既存 e2e/ 配下のパターンに合わせる）。
- どの 28/29 項目を自動化し切るか手動に残すかの最終線引き（D-02 を出発点に、実装難度を見て planner/researcher が判断）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 検証対象ギャップ（正典 — 結果はこれらを in-place 更新する）
- `.planning/phases/27-substack-handle-db/27-HUMAN-UAT.md` — Phase 27 の6 UAT シナリオ（全 pending）
- `.planning/phases/27-substack-handle-db/27-VERIFICATION.md` — Phase 27 human_verification 6項目（frontmatter に詳細）
- `.planning/phases/28-db-my/28-VERIFICATION.md` — Phase 28 human_verification 2項目（① resolved-by-reference / ② フルフロー）
- `.planning/phases/29-commit-goal-view/29-VERIFICATION.md` — Phase 29 human_verification 3項目（視覚/ナビ）
- `.planning/phases/29-commit-goal-view/29-HUMAN-UAT.md` — 既 resolved(3/3)。参照のみ、再実行しない

### 要件・ロードマップ
- `.planning/ROADMAP.md` §Phase 36 — Goal / SC#1〜#5（SC#1 が「本番環境で」を明示）
- `.planning/REQUIREMENTS.md` §QA — QA-01（Phase 27 UAT 本番検証）, QA-02/03/04（27/28/29 VERIFICATION ギャップ解消）

### テスト基盤（自動化の拡張対象）
- `e2e/` — Playwright specs（login.spec.ts / my-teams.spec.ts / admin-guard.spec.ts）+ global-setup.ts + helpers/ + fixtures/
- `playwright.config.ts` — webServer build+start、TEST project 向け設定
- E2E は session-injection（@supabase/ssr setSession）で TEST project に対し実行（mintAuthCookies / 本番隔離） — v1.6 Phase 26 で確立

### 環境リファレンス
- 本番 Supabase: `xolhjcngrwwwqtklmoyk` / dev+E2E TEST: `otydhiumsdsyxepnjqjp`
- 本番 URL: `https://keep-substack.com`（旧 keep-substack.vercel.app から移行済み）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Playwright E2E ハーネス（3 spec green）: session-injection で実 DB 契約を検証する基盤が既にある。新規 UAT 自動化はこのパターン（mintAuthCookies + TEST project）を踏襲できる。
- vitest スイート: 27/28/29 のコードレベル検証は既にユニットテストで green（27=28テスト、28=8テスト、29=88テスト全体）。自動化が必要なのは「ブラウザ/DB ラウンドトリップ」レイヤーのみ。

### Established Patterns
- session-injection は NON-admin テストユーザーで実行（E2E-03 negative ケース兼用）。
- E2E は本番隔離 TEST project に対してのみ実行（本番データ非汚染の原則）。手動本番 UAT は開発者自身のアカウントに限定する（D-04）。
- afterEach で member_id スコープ delete（truncate 禁止）でデータをクリーンアップ。

### Integration Points
- 検証は src/ を変更しない（検証フェーズ）。失敗時のみ新規バグ化 → 別フェーズで src/ 修正（D-10）。
- 自動化追加分は e2e/ 配下の新 spec として追加、playwright.config.ts の既存 webServer 設定を再利用。

</code_context>

<specifics>
## Specific Ideas

- 「本番はhttps://keep-substack.com へ移行済み」— 開発者が明示。Magic Link / Redirect URL 設定の前提として downstream で確認すること（D-06）。
- SC#1 の「本番環境で」要件は厳守 — Phase 27 の6シナリオは本番手動パスで満たす（自動化のみでは不可）。

</specifics>

<deferred>
## Deferred Ideas

- 検証で発見されたバグの修正実装 — 本フェーズスコープ外。`/gsd:debug` または新規フェーズで capture（D-10）。
- 既知の logout redirect bug（ログアウト時にトップへ遷移、ログインページへ遷移すべき — Phase 32 E2E 中に発見、Phase 33 対応予定）— 本フェーズの検証中に再遭遇したら参照のみ、修正は別トラック。

None beyond the above — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-qa-uat*
*Context gathered: 2026-06-08*
