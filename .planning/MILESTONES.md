# Milestones: Keep Substack

## v1.8 Debug, Stabilization & UI Polish (Shipped: 2026-06-11)

**Phases completed:** 5 phases, 18 plans, 30 tasks

**Delivered:** 本番DBマイグレーション適用と本番バグ群の修正で安定化を図りつつ、ログイン周りのレイアウト分離・GA4導入・privateチーム公開閲覧などのUI/品質改善を積み重ねた。

**Key accomplishments:**

1. 本番 Supabase DB に member_commit_slots を適用し、/my のコミットスケジュール保存を本番稼働させた（Phase 32, DB-02）
2. RSS即時取得バグ（BUG-01）・Magic Linkのnextリダイレクト（BUG-02）を修正し、commitSlots保存を replace_member_commit_slots RPC でアトミック化（DB-01）。/my・/admin認証ガードを middleware.ts に集約（Phase 33）
3. ログイン/サインインページを (main) Route Group 化でヘッダー・フッターから分離（UI-01/02、quick 260611-ebu で本番レンダリングを是正）、フッター3ステート文言・ソート順・/myボタン制御（Phase 34）
4. privateチームをトップビューのタブに表示しログイン不要で閲覧可能に（TEAM-01）+ GA4(@next/third-parties)を全ページ導入（ANLT-01/02、Phase 35）
5. Phase 27 UAT 6シナリオを本番(keep-substack.com)で全PASS検証し、Phase 27/28/29 の VERIFICATION ギャップを verified に解消（QA-01〜04、Phase 36）

**Requirements:** 16/16 v1.8 要件すべて Complete（コードレベル検証済み）

**Known deferred items at close: 5** — Phase 33/35 の本番手動確認（RSS即時取得・prod RPC存在・Vercelリダイレクト・GA4リアルタイム計測）。コードは全検証済みで本番デプロイ後の目視のみ残。詳細は STATE.md "Deferred Items (v1.8 close)" 参照。

---

## v1.7 Commit & Goal View + Substack Profile Link (Shipped: 2026-06-06)

**Phases completed:** 5 phases, 12 plans, 21 tasks

**Key accomplishments:**

- Added `substack_handle TEXT NULL` to members table via idempotent migration file and updated schema.sql bootstrap definition
- Implemented full app-layer support for PROF-01/02/03: Member type extended with substackHandle, /my page @handle input with @-normalization save, auth callback ?handle= forwarding, login flow handle pass-through, and CalendarGrid conditional profile link
- One-liner:
- One-liner:
- `members.substack_handle` に UNIQUE 制約を追加する migration を作成し live DB に適用
- Magic Link 認証バックエンド 3 箇所を修正 — D-01 pid/handle バリデーション、D-02 callback 新規 member INSERT、D-05 23505 ハンドリング
- フロントエンド 2 箇所 + admin バックエンド 3 箇所を修正 — D-03 substack_handle 読み取り専用化、D-04 admin 編集フィールド追加、D-05 23505 エラーハンドリング
- One-liner:

---

## v1.6 Team Roles + Member Self-Service — ✅ SHIPPED 2026-05-30

**Phases:** 22-26 | **Plans:** 14 | **Tasks:** 25 | **Timeline:** 2026-05-26 → 2026-05-30 (~5 days)

**Delivered:** チームステータス管理・メンバー自律参加・E2Eテストにより、コミュニティの自律性と品質を強化。HIDDEN_TEAM定数を廃止しDB駆動のpublic/private/hidden運用へ移行、/myページの自由参加フロー、Playwright E2Eハーネスを実装。

**Key Accomplishments:**

1. チームステータス管理（public/private/hidden）をDBで実装し、HIDDEN_TEAM定数を廃止 — Member型を `teams: {name, status}[]` に刷新（Phase 22）
2. /myページからpublicチームをチェックボックスで自由参加・退出する自律参加フロー（private/hiddenはreadonly）（Phase 23）
3. /admin/teams/{teamName} 動的RSCでhiddenチームの週次ヒートマップを管理者がURL直アクセスで確認（既存proxy.tsゲートで保護）（Phase 24）
4. member_publicationsテーブルで複数publication_id対応のスキーマ基盤を整備（部分ユニークIndex+RLS+同期トリガー、UIは1件前提のまま）（Phase 25）
5. Playwright E2Eハーネスを構築し3 spec（login/my-teams/admin-guard）が本番隔離TEST Supabaseプロジェクトに対しgreen（E2E-01/02/03、src無変更）（Phase 26）

**Milestone audit:** `tech_debt` — 14/14 requirements satisfied, 5/5 phases, 6/6 integration flows WIRED, 0 blockers. Remaining items are verification-artifact/bookkeeping process gaps.

**Known deferred items at close: 11 (see STATE.md Deferred Items)**

**Archive:**

- `.planning/milestones/v1.6-ROADMAP.md`
- `.planning/milestones/v1.6-REQUIREMENTS.md`
- `.planning/milestones/v1.6-MILESTONE-AUDIT.md`

---

## v1.0 MVP — ✅ SHIPPED 2026-05-08

**Phases:** 1-3 | **Plans:** 6 | **Timeline:** 2026-05-08 (1 day)

**Delivered:** Substack継続仲間コミュニティ向けの記事公開頻度カレンダー可視化WebアプリをMVPとしてVercelに公開。

**Key Accomplishments:**

1. Next.js 16.2.6 App Router + rss-parser によるISRフィード取得基盤を構築
2. タイムゾーン安全な月別カレンダーUIを実装（月ナビゲーション付き）
3. hover+click両対応のArticleTooltipで記事タイトル・リンクを表示
4. 全メンバーを俯瞰するミニカレンダーグリッドダッシュボードを実装
5. 個人詳細ページ /member/[substackId] を静的生成で実装（CalendarGrid再利用）
6. 記事数による色濃度6段階、UTMパラメータなどのUX仕上げ完了

**Deployed URL:** https://keep-substack.vercel.app/

**Archive:**

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---

*See individual milestone archives for full phase details.*

---

## v1.1 Dynamic Members + Weekly View — ✅ SHIPPED 2026-05-10

**Phases:** 4-6 | **Plans:** 6 | **Timeline:** 2026-05-09〜2026-05-10 (2 days)

**Delivered:** Upstash Redis KV移行・管理画面（Basic認証）・直近7日間ヒートマップ・チームフィルターをVercel本番環境に公開。

**Key Accomplishments:**

1. Upstash Redis (@upstash/redis) でメンバーデータをCRUD管理できるKV基盤を構築
2. 直近7日間 × 全メンバーのWeeklyHeatmapGrid（50人対応・JST日付）をトップページに実装
3. hover+click対応のサムネイル付きリッチTooltipでRSS content:encodedから画像抽出
4. src/middleware.tsによるBasic認証で/adminを保護（Next.js 16のmiddleware配置を特定）
5. Server Actions + useActionStateによるメンバー追加・削除管理画面を実装
6. team-idによるチームタブUI + URLパラメータフィルタリングを実装

**Notable Bugs Fixed During UAT:**

- Next.js 16 Edge RuntimeはBuffer非対応 → btoa()で修正
- middleware.tsはsrc/配下が必要（Next.js 16の仕様）
- unstable_cache全体一括は2MB上限超過 → メンバー単位キャッシュで解決
- RSS isoDateはUTC → JST変換（+9h）が必要

**Archive:**

- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`

---

*See individual milestone archives for full phase details.*

---

## v1.3 Data Persistence + Multi-Team — ✅ SHIPPED 2026-05-12

**Phases:** 10-12.1 | **Plans:** 4 | **Timeline:** 2026-05-11〜2026-05-12 (2 days)

**Delivered:** Vercel Cron + KV累積保存で過去記事を永続化、多対多チーム所属、シークレットチーム機能、ISR + KVハイブリッドアーキテクチャで投稿後5分以内反映を実現。

**Key Accomplishments:**

1. Vercel Cron（UTC 20:00）+ KV累積保存で過去記事消失問題を解消（PERSIST-01）
2. メンバー登録時の初回フィード取得でKVに即時保存（PERSIST-02）
3. `teamNames: string[]` 多対多所属 + KV後方互換フォールバック（DBマイグレーション不要）（TEAM-01〜03）
4. シークレットチーム "chameleon" の非表示ロジック（All ビュー・タブ除外、URL直打ち・管理画面は通常表示）
5. ISR (revalidate=300) + KVハイブリッドで最大24時間 → 最大5分の反映遅延改善

**Archive:**

- `.planning/milestones/v1.3-ROADMAP.md`
- `.planning/milestones/v1.3-REQUIREMENTS.md`

---

*See individual milestone archives for full phase details.*

---

## v1.4 UI/UX Refresh — ✅ SHIPPED 2026-05-15

**Phases:** 13-16 | **Plans:** 4 | **Timeline:** 2026-05-15 (1 day)

**Delivered:** モバイルファーストを軸にファーストビュー・ヒートマップ・ポップオーバーのUIを刷新し、Substackオレンジ配色とリッチインタラクションで継続可視化を強化。

**Key Accomplishments:**

1. ヒーローバナー削除 + モバイル余白調整でファーストビューにヒートマップを表示（Phase 13）
2. HeatmapRow名前列truncate1行化・シェブロン追加・Substackオレンジタブで視認性向上（Phase 14）
3. getIntensityClass を Substackオレンジ系（/70・100%・赤）3段階に更新し点線丸・件数バッジ追加（Phase 15）
4. HeatmapTooltip を横並びサムネイルリスト・touchstart対応・×ボタン・Click Outsideで刷新（Phase 16）
5. Substack公式ライトテーマ（#fafafa背景・#363737テキスト・Loraフォント）に統一（Quick Task）

**Known deferred items at close: 4 (see STATE.md Deferred Items)**

**Archive:**

- `.planning/milestones/v1.4-ROADMAP.md`
- `.planning/milestones/v1.4-REQUIREMENTS.md`
