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
