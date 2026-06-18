---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Substack Notes PoC
status: executing
stopped_at: Completed 42-1-01-PLAN.md (2026-06-18)
last_updated: "2026-06-18T06:04:22.182Z"
last_activity: 2026-06-18 -- Phase 42-1 Plan 01 実行完了（コメント取得＋キャッシュ層）
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 44
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11 — v1.8 shipped)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 40 スパイク **GO 確定**。次は Phase 41（機能2 Note一覧）の plan/discuss

## Current Position

Phase: 42-1 — 機能1 コメント取得＋キャッシュ層 — Plan 01 Complete ✓ (vitest 30/30 green)
Plan: 42-1-01 ✓（schema.sql note_comments + comments.ts + 30 ユニットテスト）
Status: Ready for verification / next plan
Last activity: 2026-06-18 -- Phase 42-1 Plan 01 実行完了

⚠ 申し送り: note_comments DDL を本番(prod=xolhjcngrwwwqtklmoyk)/dev(otydhiumsdsyxepnjqjp) の SQL Editor で手動実行する必要あり（schema.sql 参照）

### 確定エンドポイント（Phase 41/42 で使用・すべて無認証サーバー側 fetch）

- 機能2 Note一覧: `GET https://substack.com/api/v1/reader/feed/profile/{user_id}`（`?types=note`、`nextCursor`）
- 機能1 件数/本体: `GET https://substack.com/api/v1/reader/comment/{id}`（`children_count`=件数）
- 機能1 返信ツリー: `GET https://substack.com/api/v1/reader/comment/{id}/replies`（`commentBranches[].comment`: name/photo_url/body）
- フィクスチャ: user_id=`110584954`（@uojun）/ Note id=`276780760`

### v1.10 Roadmap Summary

フィージビリティ・ゲート型 PoC。Phase 40 で取得可否を実測し go/no-go を判定。no-go なら負の結果を文書化してクローズ＝有効な PoC 成果。

| Phase | Goal | Requirements |
|-------|------|--------------|
| 40 — 取得可否スパイク（go/no-go） | 非公式エンドポイントで Note 一覧/コメントが本番 Vercel から取れるかを実測（捨てスパイク、成果物=レポート+生JSON+エンドポイント表） | SPIKE-01, SPIKE-02 |
| 41 — 機能2 Note一覧（永続化なし） | `/admin/notes` Server Component で admin の Note 一覧を都度 fetch・表示（本文プレビュー+投稿日時JST） | NOTE-01..03 |
| 42 — 機能1 コメント可視化（キャッシュ+永続化） | Note URL/ID 入力 → コメント件数/本文/名前/アイコン表示 + `note_comments` Supabase キャッシュ（鮮度判定+force再取得） | COMMENT-01..06 |

**Coverage:** 11/11 v1.10 要件マップ済み（orphan 0）。Granularity=coarse（spike 単独 + cache 基盤は機能1へ統合し 3 フェーズ）。Ordering: 40(gate) → 41(永続化なし) → 42(取得+キャッシュ+表示)。40 が no-go なら以降は設計のみで停止し文書化クローズへ分岐。

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260605-42o | grid hoverでタイトルpopover | 2026-06-05 | d4bc6f6 | [260605-42o-grid-hover-popover](.planning/quick/260605-42o-grid-hover-popover/) |
| 260605-qqq | 未投稿日は曜日・日付だけでなく時刻HH:mmも表示 | 2026-06-05 | d2f55a2 | [260605-qqq-hh-mm](.planning/quick/260605-qqq-hh-mm/) |
| 260610-1f2 | 未登録と未コミットメントの表示分離 | 2026-06-10 | e04cb50 | [260610-1f2-separate-unregistered-uncommitted](.planning/quick/260610-1f2-separate-unregistered-uncommitted/) |
| 260611-ebu | UI-01修正: (main) Route Group化でログイン/サインインからHeader/Footer除去 | 2026-06-11 | 74e2faa | [260611-ebu-ui-01-fix-move-pages-into-main-route-gro](.planning/quick/260611-ebu-ui-01-fix-move-pages-into-main-route-gro/) |

## Performance Metrics

**By Milestone:**

| Milestone | Phases | Plans | Sessions |
|-----------|--------|-------|----------|
| v1.0 MVP | 3 | 6 | 1日 |
| v1.1 Dynamic Members | 3 | 6 | 2日 |
| v1.2 UX Polish | 3 | 3 | 1日 |
| v1.3 Data Persistence | 4 | 4 | 2日 |
| v1.4 UI/UX Refresh | 4 | 4 | 1日 |
| v1.5 Member Auth + Supabase Migration | 5 | 11 | 2日 |
| v1.6 Team Roles + Member Self-Service | 5 | 14 | ~5日 |
| Phase 23 P01 | 15min | 2 tasks | 2 files |
| Phase 23 P02 | ~5min | 2 tasks | 1 files |
| Phase 23 P03 | ~3min | 2 tasks | 1 files |
| Phase 24 P01 | 8min | 2 tasks | 2 files |
| Phase 24 P02 | 4min | 1 tasks | 1 files |
| Phase 25 P01 | 12min | 2 tasks | 2 files |
| Phase 25 P02 | ~6min | 3 tasks | 0 src files (live DB apply + verify) |
| Phase 26 P01 | ~10min | 3 tasks | 10 files |
| Phase 26 P02 | ~5min | 2 tasks | 0 src files (TEST project provision + schema apply) |
| Phase 26 P03 | ~8min | 2 tasks | 3 files |
| Phase 27 P02 | 25min | 3 tasks | 12 files |
| Phase 29 P01 | ~25min | 3 tasks | 9 files |
| Phase 29 P02 | ~4min | 3 tasks | 5 files |
| Phase 31 P03 | 6 | 3 tasks | 9 files |
| Phase 31 P04 | ~8min | 3 tasks | 8 files |
| Phase 33-commitslots-upsert P02 | 5min | 2 tasks | 4 files |
| Phase 33-commitslots-upsert P03 | 2min | 2 tasks | 3 files |
| Phase 33-commitslots-upsert P04 | ~5min | 2 tasks | 1 file (migration) |
| Phase 33-commitslots-upsert P05 | 7min | 2 tasks | 4 files |
| Phase 34 P03 | 129s | 2 tasks | 2 files |
| Phase 34-ui-polish P05 | 5min | 2 tasks | 2 files |
| Phase 36 P01 | 15 | 3 tasks | 3 files |
| Phase 36 P02 | ~6min | 2 tasks | 2 files files |
| Phase 36 P03 | ~10min | 4 tasks | 2 files |
| Phase 36 P04 | ~3min | 2 tasks | 2 files |
| Phase 39 P01 | 4min | 3 tasks | 10 files |
| Phase 41-2-note P01 | 4 min | 3 tasks | 6 files |

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック
- Phase 25 P01: member_publications を additive テーブル（surrogate PK）として追加。single-primary は partial unique index で保証、sync trigger は ON CONFLICT DO NOTHING・DELETE ブランチ無し（CASCADE）、backfill は migration のみ・schema.sql は durable 定義をミラー（D-01..D-09）。app code は無変更（SC#3）。
- Phase 26 P02: Dedicated cloud TEST Supabase project provisioned (otydhiumsdsyxepnjqjp, distinct from prod xolhjcngrwwwqtklmoyk); .env.test populated + gitignored. DEVIATION (Rule 3): supabase/migrations/ are incremental diffs that cannot bootstrap a fresh empty project (`relation "articles" does not exist`), so the operator applied supabase/schema.sql (durable final-state mirror) via the SQL Editor instead — same goal achieved (teams.status, members.publication_id, member_publications all queryable; SCHEMA_OK). Canonical from-scratch bootstrap source for fresh DBs is schema.sql, not migrations/.
- Phase 26 P01: E2E harness via session-injection — mintAuthCookies uses @supabase/ssr setSession round-trip (no hand-rolled sb-<ref>-auth-token encoding); seeded test user is NON-admin (doubles as E2E-03 negative case); vitest.config.ts scopes include to src/** to avoid Playwright collision; webServer is build+start (NEXT_PUBLIC_* are build-time inlined). Zero production-code changes. (Actual E2E run gated on Plan 02 .env.test provisioning.)
- Phase 29 P01: CommitSlot type added to types.ts; Member.id optional field added; getMembers() SELECT extended with id; DB policy "public select member_commit_slots" confirmed in schema.sql + migration (no new migration needed). commitUtils.ts: getWeekDates (JST Monday-start), matchArticleToSlot (day_of_week 1=Mon index mapping), sortMembersForCommitView (D-10 simplified: this-week count desc, addedAt asc). /weekly-stamp route: copy of old page.tsx with /weekly-stamp hrefs. CommitGoalView stub created for Plan 02. team-selected filter bug fixed (Rule 1: removed erroneous t.status !== 'hidden' check). 79 tests passing.
- Phase 29 P02: CommitGrid Server Component: flex-1 week blocks (not 36-col grid), static COLS_CLASS map, DAY_NAMES, CSS-only hidden sm:flex mobile collapse. CommitGoalRow: three-column HeatmapRow analog, 未コミット fallback, w-8 placeholder. CommitGoalView: stub replaced with sortMembersForCommitView + per-member slot filter. page.tsx: 21-day cutoff filter producing results21. 88 tests passing. VIEW-01 through VIEW-07 all satisfied.
- Phase 26 P03: Three E2E specs green against the TEST project — login.spec (E2E-01 injected session reaches /my, heading マイページ), my-teams.spec (E2E-02 public-team join → member_teams INSERT via expect.poll + scoped afterEach delete by member_id, no truncate per D-09), admin-guard.spec (E2E-03 anon /admin+/my redirect + non-admin /admin redirect via nested test.use storageState inside the anonymous project). Full Playwright suite 5 passed; vitest 24 passed (src/** only, no runner collision). Zero src/ changes. Real end-to-end (no Supabase mocking) — distinct from src/__tests__/proxy.test.ts. Stopped a stale next-server on :3000 to avoid reuseExistingServer attaching to a prod-env build (Pitfall 6). Phase 26 success criteria fully met.

### Key Architecture Decisions (v1.8 — 計画段階)

- Phase 32: 本番 DB マイグレーションは SQL Editor 経由（schema.sql が正規ソース）— dev=otydhiumsdsyxepnjqjp / prod=xolhjcngrwwwqtklmoyk
- Phase 32 (完了): 両マイグレーション (20260602000001/02) は事前に本番 DB へ適用済みだった。コード変更なしで /my スケジュール保存が本番動作確認済み。ログアウトリダイレクトバグ (BUG-02) は Phase 33 対応。
- Phase 33: commitSlots の delete+insert → upsert 置き換え（冪等性確保）。upsert key は (member_id, day_of_week)
- Phase 33: BUG-01 (rss-not-fetched-on-user-add) の根本原因はメンバー追加 Server Action 内の RSS fetch 呼び出し欠落またはエラーハンドリング不備
- Phase 33: BUG-02 (auth/callback next パラメータ) — /auth/callback でのリダイレクト先が固定になっている箇所を修正
- Phase 33 P01 (完了): src/middleware.ts 新規作成 — /my と /my/:path* を matcher に設定、未認証時 /login?next=<encodeURIComponent(pathname)> へリダイレクト。proxy.ts は変更なし（ユニットテスト専用モジュール維持）。auth/callback/route.ts の line 59 を next 変数使用に修正（ハードコード '/my' 除去）。3 unit tests green。
- Phase 34: UI-01/02 — /login と /signin-51cf21389c56 のレイアウトにヘッダー・フッターを含まない専用レイアウトを適用
- Phase 35: TEAM-01 — getMembers() の status フィルタを 'hidden' のみ除外に変更（'private' を含める）
- Phase 35: ANLT-01/02 — @next/third-parties の GoogleAnalytics コンポーネントを layout.tsx に追加。NODE_ENV !== 'production' ガードで dev 無効化
- Phase 36 P02 (完了): QA-04（Phase 29 VERIFICATION ギャップ）の自動化可能部分を回帰 spec 化。e2e/29-mobile.spec.ts（mobile-375 project で CommitGrid root `div.flex.flex-1.gap-2` の week-0/1 を toBeHidden・week-2 を toBeVisible、`hidden sm:flex` の 375px display:none をブラックボックス検出）+ e2e/29-layout-nav.spec.ts（anonymous で #2 `a[href^=/member/]` 構造存在のみ + #3 ViewTabs `/daily` ナビ・/daily 到達）。29 #2 はピクセル整列を assert せず構造のみ自動化し整列は本番手動目視へ委譲（Pitfall 4）。29 #3 は ⚠ Drift D-C に従い旧 `/weekly-stamp` ではなく現行 `/daily` を対象（src バグではなく後続フェーズの意図的リネーム追従、検証文言の追従であり修正対象ではない）。29-mobile は CommitGrid を持つ行を `/` に確実に出すため beforeAll で seed member（TEST.publicationId）に commit slot 1 件を独立 seed（28 spec と非競合）し afterAll で member_id スコープ delete 復元（truncate 禁止、D-09 / T-36-04）。29-layout-nav は読み取り専用で afterEach 不要（T-36-05）。src/ 無変更（git diff src/ 空）。3 tests green（mobile 1 + layout-nav 2）、実行後 seed slots 0 行で復元確認。config は 36-01 が owner のため無変更。DEVIATION なし。
- Phase 36 P01 (完了): QA-02/QA-03 の自動回帰レイヤー（D-01 自動側）を session-injection ハーネスに薄く追加。e2e/27-handle.spec.ts（@handle 描画/保存往復/プロフィールリンク有無、4 テスト）+ e2e/28-commit-flow.spec.ts（RPC 前提スモーク + /my スケジュール宣言フルフロー）。playwright.config.ts に 27/28/29 spec の project 割り当て + mobile-375（375px viewport）を確定（config はこのプランが唯一の owner）。DEVIATION なし（src/ 無変更）。CHECKPOINT: TEST project（otydhiumsdsyxepnjqjp）に replace_member_commit_slots RPC が未適用 → human-action で停止し SQL Editor 経由で適用、本継続で green 確認（本番 xolhjcngrwwwqtklmoyk 未接触）。Playwright 1.60 は --fail-on-empty 未サポートのため ranRpcSmoke フラグ + afterAll(expect) で no-tests-run の false green を防止。commit slots 保存は RPC（Drift D-B）のため count==2 でブラックボックス往復検証。SC#1 の本番充足は 36-03 手動 UAT が担保（D-04）。
- Phase 36 P03 (完了): 本番 https://keep-substack.com / Supabase prod xolhjcngrwwwqtklmoyk でテストアカウント kugyu10@gmail.com を用い Phase 27 UAT 6 シナリオ #1-#6 を一巡し**全 PASS**（SC#1 充足 — #2-#5 も本番手動結果を個別取得）。27-HUMAN-UAT.md を status partial→passed / result 全 [pass] / Summary passed:6 pending:0 に、27-VERIFICATION.md を human_needed→verified に in-place 更新（D-09）。#2-#5 は**本番手動=主 + 36-01 自動 spec=補助**の二層記録（D-05、自動 spec を本番結果の代替にしない）。⚠ #6 Magic Link の入口を `/login-51cf21389c56` → **`signin-51cf21389c56`** に訂正（`?handle=` を消費するのは signin ルート: `src/app/(auth)/signin-51cf21389c56/page.tsx`→LoginForm→`src/app/my/page.tsx`。`/login` は handle を読まない。チェックリストの取り違えであり src バグではない）。#6/全体の前提として D-06 Redirect URL 修正（本番 Auth が新ドメイン keep-substack.com を許可）を明記。#3 は Drift D-A（handle 設定後 read-only）に検証が追従。検証で変更したテストアカウント行の substack_handle は最終的に NULL に復元（D-04、自分の行限定・他メンバー非汚染）。fail 0 件のため D-10 バグ化は該当なし。Phase 27 正典 .md が verified/passed に確定し v1.8 go/no-go 判定（D-11）材料が揃った。src/ 無変更。
- Phase 36 P04 (完了): 28/29-VERIFICATION.md を in-place で `human_needed → verified` に解消（D-09、Phase 36 側に統合サマリーを作らない）。**28-VERIFICATION**: #1（member_commit_slots 本番存在）= Phase 32（DB-02 Complete、本番 xolhjcngrwwwqtklmoyk 適用確認済み）への **resolved-by-reference** で再検証なし close（D-07/D-08）、#2（/my フルフロー）= `e2e/28-commit-flow.spec.ts`（36-01、2 green）の automate pass、Observable Truth #14 を RPC `replace_member_commit_slots`（Drift D-B）前提に **VERIFIED**（旧 delete+insert 前提の UNCERTAIN から往復検証へ、13/14→14/14）。**29-VERIFICATION**: #1（モバイル375px 1週縮退）= `e2e/29-mobile.spec.ts`（36-02）automate pass、#3（ヒートマップ+タブナビ）= `e2e/29-layout-nav.spec.ts` automate pass で ⚠ 旧 `/weekly-stamp` → 現行 `/daily` リネーム（Drift D-C、src バグではなく後続フェーズの意図的リネーム）に**文言追従**、#2（3列レイアウト）= 構造 automate（a[href^=/member/]）+ ピクセル整列は **36-03 本番目視**の二層（Pitfall 4、provenance=36-03-SUMMARY.md）。依存 spec 計 5 green + 36-03 本番ウォークスルー全 PASS で fail 0 → D-10 バグ化は該当なし、両 VERIFICATION を verified に確定。29-HUMAN-UAT.md は無編集（D-07、既 resolved 3/3）、src/ 無変更。**v1.8 全検証ギャップ（Phase 27/28/29）が pass / resolved-by-reference / バグ化のいずれかで処理済みとなり、go/no-go 判定（D-11）の材料が揃った。**

## Session Continuity

Last session: 2026-06-18T06:04:22.175Z
Stopped at: context exhaustion at 75% (2026-06-18)
Next step: `/gsd:plan-phase 40` — 取得可否スパイク（go/no-go ゲート）。最大リスク=本番 Vercel IP からの到達性を実測し go/no-go を出す。no-go なら negative-result 文書化でクローズ。

## Deferred Items (v1.9 close — 2026-06-17)

v1.9 マイルストーンクローズ時に Acknowledge して繰り越した項目（計16件）。v1.9-MILESTONE-AUDIT は
9/9 要件 Complete・統合 5/5・status=passed。以下はいずれも機能ギャップではなく、bookkeeping
（quick の status を監査が読めない）・過去マイルストーン繰り越し・検証アーティファクトのギャップ。

| Category | Item | Status | 備考 |
|----------|------|--------|------|
| todo | 2026-06-08-verify-admin-role-check-middleware | pending 🔴 high | PR #5レビュー指摘。次マイルストーン候補 |
| todo | 2026-06-08-dedupe-auth-guard-middleware-admin-guard | pending 🔴 high | PR #5レビュー指摘。次マイルストーン候補 |
| todo | 2026-05-11 article-history / multi-team / supabase-migration ほか | pending | 長期backlog |
| verification_gap | Phase 37 — 37-VERIFICATION.md | human_needed | 37-UAT 3/3 passed でカバー済（URL-01 充足） |
| debug_session | og-image系 / schedule-save-fails-production | diagnosed / root_cause_found | 実質解決済（スクショ方式 / Phase 32-33）、status未更新 |
| quick_task | 260515〜260611 の完了済みquick ×8（status missing/unknown）| bookkeeping | 完了済み、audit が status を読めないだけ |

**Known deferred items at close: 16**（真の未消化＝PR#5指摘の 🔴 high 2件のみ。残りは解決済み/bookkeeping/UATカバー済）。

## Deferred Items (v1.8 close — 2026-06-11)

v1.8 マイルストーンクローズ時に Acknowledge して繰り越した項目。マイルストーン監査
（v1.8-MILESTONE-AUDIT.md）では 16/16 要件がコードレベルで Complete、唯一の BLOCKER
だった UI-01 は quick 260611-ebu で解消済み。残るは外部サービス依存の本番手動確認
（inherent-manual）と、長期 backlog・bookkeeping ギャップで、機能的欠落ではない。

| Category | Item | Status | 備考 |
|----------|------|--------|------|
| verification_gap | Phase 33 — 33-VERIFICATION.md（本番RSS即時取得 / prod RPC存在 / 本番/myリダイレクト）| human_needed | コード配線は監査で検証済み。本番デプロイ後の目視のみ |
| verification_gap | Phase 35 — 35-VERIFICATION.md（GA4リアルタイム計測）| human_needed | gtag/js本番ロードは監査のcurlで実証済み。GA4記録確認のみ |
| uat_gap | Phase 33 — 33-HUMAN-UAT.md | partial (2) | 上記 verification と同一の本番確認 |
| uat_gap | Phase 35 — 35-HUMAN-UAT.md | partial (1) | 同上 |
| debug_session | schedule-save-fails-production | root_cause_found（Phase 32/33で実質解決・ステータス未更新）| クローズ扱い。次回 /gsd:debug で resolved 化推奨 |
| todo | 2026-06-06-restore-next-redirect-in-auth-callback | resolved (Phase 33 P01)（todoファイル未削除）| 実装済み |
| todo | 2026-06-06-upsert-commit-slots-replace-delete-insert | resolved (Phase 33 DB-01)（todoファイル未削除）| 実装済み |
| todo | 2026-06-08-verify-admin-role-check-middleware | pending 🔴 high | PR #5レビュー指摘。次マイルストーン候補 |
| todo | 2026-06-08-dedupe-auth-guard-middleware-admin-guard | pending 🔴 high | PR #5レビュー指摘。次マイルストーン候補 |
| todo | 2026-05-11 article-history / multi-team / supabase-migration | pending | 長期backlog |
| quick_task | 260515〜260611 の完了済みquick（status missing/unknown）| bookkeeping | 完了済み、audit が status を読めないだけ |

**Known deferred items at close: 5**（真に未消化＝Phase 33/35 の本番手動確認）。残りは解決済み/bookkeeping。

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30. The v1.6 audit
confirmed all 14 requirements are functionally satisfied (6/6 integration WIRED,
0 blockers); these are verification-artifact/bookkeeping process gaps and
long-standing backlog ideas, not functional gaps.

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 24 — 24-HUMAN-UAT.md (VIEW-01 live browser render) | partial |
| verification_gap | Phase 17 — 17-VERIFICATION.md (predates v1.5 close) | gaps_found |
| verification_gap | Phase 23 — 23-VERIFICATION.md | human_needed |
| verification_gap | Phase 24 — 24-VERIFICATION.md | human_needed |
| quick_task | 260515-mx8-white-bg-to-black-fix-text | missing |
| quick_task | 260516-001-substackid-to-publicationid | unknown |
| quick_task | 260516-r2r-master-main | missing |
| quick_task | 260516-rz5-pr-component | missing |
| todo | 2026-05-11-article-history-persistence | pending |
| todo | 2026-05-11-multi-team-membership | pending |
| todo | 2026-05-11-supabase-migration | pending |

## Deferred Items (v1.7 close — 2026-06-06)

Items acknowledged and deferred at v1.7 milestone close. v1.8 安定化フェーズで解消予定（Phase 33, 36 で対応）。

| Category | Item | Status | v1.8 Phase |
|----------|------|--------|------------|
| debug_session | schedule-save-fails-production | root_cause_found (本番DBマイグレーション適用で解消) | Phase 32 |
| uat_gap | Phase 27 — 27-HUMAN-UAT.md (6 pending scenarios) | partial | Phase 36 |
| verification_gap | Phase 27 — 27-VERIFICATION.md | human_needed | Phase 36 |
| verification_gap | Phase 28 — 28-VERIFICATION.md | human_needed | Phase 36 |
| verification_gap | Phase 29 — 29-VERIFICATION.md | human_needed | Phase 36 |
| quick_task | 260605-42o-grid-hover-popover | missing | — |
| quick_task | 260605-qqq-hh-mm | missing | — |
| todo | 2026-06-06-restore-next-redirect-in-auth-callback | resolved (Phase 33 P01) | Phase 33 |
| todo | 2026-06-06-upsert-commit-slots-replace-delete-insert | pending | Phase 33 |

Known deferred items at close: 9 (v1.7) + 11 (v1.6 carry-over) = 20 total

## Backlog (PR #5 code review — 2026-06-08)

PR #5（v1.8 Phase 32–36）マージ時のコードレビュー指摘。コード変更は行わずバックログ登録のみ。

| Category | Item | Status | Priority |
|----------|------|--------|----------|
| todo | 2026-06-08-verify-admin-role-check-middleware (指摘1: `user.role !== 'admin'` 判定検証) | pending | 🔴 high |
| todo | 2026-06-08-dedupe-auth-guard-middleware-admin-guard (指摘2: 認証ガード二重化の解消) | pending | 🔴 high |

## Operator Next Steps

- Plan the first v1.10 phase with `/gsd:plan-phase 40`（取得可否スパイク）
