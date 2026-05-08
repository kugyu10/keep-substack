# Keep Substack

## What This Is

Substack継続仲間コミュニティ向けの、メンバーの記事公開頻度をカレンダーUIで可視化するWebアプリ。GitHubの草（コントリビューショングラフ）のように「頑張り」が一目でわかり、継続のモチベーションを支える。Next.js (App Router) + Tailwind CSSで構築し、Vercelにデプロイする。

## Core Value

仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 設定ファイル（JSON）でSubstackフィードURLとメンバー名を管理できる
- [ ] rss-parserでサーバーサイドからRSSフィードを取得・解析できる
- [ ] 月別カレンダーUIでメンバーごとの記事公開日を表示できる
- [ ] 更新のある日付セルに色やマークで視覚的に区別できる
- [ ] 日付セルのホバーで記事タイトルと元記事へのリンクを表示できる
- [ ] メンバー全員一覧ダッシュボードで全体の活動状況を俯瞰できる
- [ ] 個人詳細ビューにクリックで切り替えて個人の活動を確認できる
- [ ] ISR（Incremental Static Regeneration）でデータを自動更新する
- [ ] revalidate間隔を環境変数や設定で簡単に変更できる
- [ ] 認証なしの公開ページとして誰でもアクセスできる
- [ ] Vercelにデプロイして継続的に運用できる

### Out of Scope

- ユーザー認証・ログイン機能 — 公開ページのため不要
- フィード管理UI（管理画面） — v1は設定ファイルで管理、将来追加予定
- リアルタイム通知 — カレンダー確認で十分
- コメント・いいね機能 — Substack本体の機能と重複
- モバイルアプリ — Webアプリで十分、レスポンシブ対応で対応

## Context

- ネットでつながったSubstack継続仲間のゆるいコミュニティ向けツール
- メンバーは成長前提（現時点は少人数だが増える可能性あり）
- 初期段階で最大50フィード程度を想定
- Substackの記事更新頻度は1日1回程度が多い
- 「書いたら反映を確認したい」という初心者心理を考慮し、ISRのrevalidateは短め（デフォルト5分）を想定
- 既存の `requirements.md` に初期構想あり

## Constraints

- **Tech Stack**: Next.js (App Router) + Tailwind CSS + rss-parser
- **Deploy**: Vercel（無料枠で運用可能な範囲）
- **Data Fetching**: ISR（revalidate設定可能）。SSRは毎リクエスト取得で重い、SSGはリビルド必要で鮮度が落ちる
- **Scale**: 初期50フィード程度。Vercel無料枠でも余裕の範囲

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ISR（SSGでもSSRでもなく） | 書いたらすぐ確認したい心理に対応しつつ、パフォーマンスとフィード元への負荷を抑える | -- Pending |
| revalidateを設定可能に | 開発時は短く、運用安定後は伸ばせる柔軟性 | -- Pending |
| カレンダー型UI（草型ではなく） | 月別カレンダーの方が日付の把握がしやすい | -- Pending |
| フィード管理は設定ファイル | v1はシンプルに。将来管理画面を追加予定 | -- Pending |
| 認証なし公開ページ | コミュニティメンバーに気軽にURLを共有できる | -- Pending |

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
*Last updated: 2026-05-08 after initialization*
