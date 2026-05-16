# Milestones: Keep Substack

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
