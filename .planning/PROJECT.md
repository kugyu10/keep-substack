# Keep Substack

## Current Milestone: v1.3 Data Persistence + Multi-Team

**Goal:** 過去記事の永続化とチーム多対多所属でデータの信頼性を高める

**Target features:**
- Vercel Cron + KV累積保存（過去記事消失の解消）
- メンバー登録時の初回フィード取得
- teamNames配列化（1人が複数チームに所属可能）

## What This Is

Substack継続仲間コミュニティ向けの、メンバーの記事公開頻度をヒートマップUIで可視化するWebアプリ。GitHubの草（コントリビューショングラフ）のように「頑張り」が一目でわかり、継続のモチベーションを支える。Next.js (App Router) + Tailwind CSS + Upstash Redisで構築し、Vercelにデプロイ済み。v1.2でSubstackアイコン表示・UX改善・管理画面メンバー編集を実装。

## Core Value

仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること。

## Requirements

### Validated

- ✓ 設定ファイル（JSON）でSubstackフィードURLとメンバー名を管理できる — v1.0
- ✓ rss-parserでサーバーサイドからRSSフィードを取得・解析できる — v1.0
- ✓ 月別カレンダーUIでメンバーごとの記事公開日を表示できる — v1.0
- ✓ 更新のある日付セルに色やマークで視覚的に区別できる — v1.0（記事数による濃度6段階）
- ✓ 日付セルのホバーで記事タイトルと元記事へのリンクを表示できる — v1.0
- ✓ メンバー全員一覧ダッシュボードで全体の活動状況を俯瞰できる — v1.0
- ✓ 個人詳細ビューにクリックで切り替えて個人の活動を確認できる — v1.0
- ✓ ISR（Incremental Static Regeneration）でデータを自動更新する — v1.0
- ✓ revalidate間隔を環境変数や設定で簡単に変更できる — v1.0
- ✓ 認証なしの公開ページとして誰でもアクセスできる — v1.0
- ✓ Vercelにデプロイして継続的に運用できる — v1.0
- ✓ メンバーデータをUpstash Redisで管理する（name, substackId, addedAt, teamName）— v1.1
- ✓ ブラウザ上でメンバーを追加・削除できる管理画面（Basic認証）— v1.1
- ✓ トップページを直近7日間ヒートマップ（50人対応）に刷新する — v1.1
- ✓ team-idでヒートマップをフィルタリングできる — v1.1
- ✓ ヒートマップのTooltipでサムネイル・タイトル表示、クリックで記事遷移 — v1.1
- ✓ Tooltip内の画像をクリックすると記事に遷移できる — v1.2
- ✓ Tooltip内の記事間にスペースがあり視認しやすい — v1.2
- ✓ メンバー詳細ページの戻りリンクが「メンバー一覧」でチームビューに戻る — v1.2
- ✓ 全ページのフッターに参加案内リンクが表示される — v1.2
- ✓ トップビューの各メンバー行にSubstackアイコンが表示される — v1.2
- ✓ メンバーカレンダーページにSubstackアイコンが表示される — v1.2
- ✓ トップビューはレスポンシブ対応（スマホ: アイコンのみ / PC: アイコン+名前）— v1.2
- ✓ 管理画面でメンバーのname・addedAt・teamNameをインライン編集・保存できる — v1.2

### Active (Future)

- [ ] 連続投稿日数（ストリーク）を表示する
- [ ] 月間投稿数サマリーを表示する
- [ ] 年間ヒートマップ（GitHub草型）で長期活動を可視化する

### Out of Scope

- ユーザー認証・ログイン機能（公開ページ） — 公開ページのため不要。管理画面はBasic認証で対応
- リアルタイム通知 — カレンダー確認で十分
- コメント・いいね機能 — Substack本体の機能と重複
- モバイルアプリ — Webアプリで十分、レスポンシブ対応済み
- ランキング・順位表示 — コミュニティの「ゆるさ」を壊す
- Substack以外のRSSソース — スコープを絞る。汎用化はYAGNI

## Context

- ネットでつながったSubstack継続仲間のゆるいコミュニティ向けツール
- メンバーは成長前提（現時点は少人数だが増える可能性あり）
- 初期段階で最大50フィード程度を想定
- Substackの記事更新頻度は1日1回程度が多い
- v1.2公開済み: https://keep-substack.vercel.app/
- コードベース: 約1,112行 TypeScript/TSX（Next.js App Router + Tailwind CSS）
- Tech Stack: Next.js 16.2.6, React 19.2.4, rss-parser 3.13.0, @upstash/redis 1.38.0, TypeScript 5, Tailwind CSS 4

## Constraints

- **Tech Stack**: Next.js (App Router) + Tailwind CSS + rss-parser
- **Deploy**: Vercel（無料枠で運用可能な範囲）
- **Data Fetching**: ISR（revalidate設定可能）。SSRは毎リクエスト取得で重い、SSGはリビルド必要で鮮度が落ちる
- **Scale**: 初期50フィード程度。Vercel無料枠でも余裕の範囲

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ISR（SSGでもSSRでもなく） | 書いたらすぐ確認したい心理に対応しつつ、パフォーマンスとフィード元への負荷を抑える | ✓ Good — REVALIDATE_SECONDS=300 で運用中 |
| revalidateを設定可能に | 開発時は短く、運用安定後は伸ばせる柔軟性 | ✓ Good — 環境変数で制御、コード変更不要 |
| カレンダー型UI（草型ではなく） | 月別カレンダーの方が日付の把握がしやすい | ✓ Good — 月ナビゲーション付きで使いやすい |
| フィード管理は設定ファイル | v1はシンプルに。将来管理画面を追加予定 | ✓ Good — members.json 編集のみでメンバー追加可能 |
| 認証なし公開ページ | コミュニティメンバーに気軽にURLを共有できる | ✓ Good — URL共有だけで使える |
| @upstash/redis採用 | @vercel/kvは2024年12月廃止。Redis互換で移行リスク低 | ✓ Good — v1.1で安定稼働 |
| メンバー単位のunstable_cache | 全体一括キャッシュは2MB上限に抵触。個別キャッシュで回避 | ✓ Good — チームフィルターとも相性よし |
| `<img>`タグ使用でnext/image不採用 | remotePatterns設定が不要でKISSに準拠 | ✓ Good — next.config.ts変更ゼロ |
| HeatmapRowはServer Componentのまま | onError不要、条件レンダリングのみでimageUrlフォールバック実装 | ✓ Good — シンプルで型安全 |
| teamId→teamNameリネーム | より意味が明確なフィールド名 | ✓ Good — KV後方互換フォールバックで無停止移行 |
| form-in-table回避（onClick+FormData手動構築） | HTML仕様上`<form>`は`<tr>`内不可 | ✓ Good — 安定動作 |
| line-clamp-2をinline styleで実装 | Tailwind v4でflex内line-clamp未対応 | ⚠ Revisit — Tailwind v4アップデート時に再確認 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-11 after v1.2 milestone*
