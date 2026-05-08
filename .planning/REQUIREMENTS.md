# Requirements: Keep Substack

**Defined:** 2026-05-08
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data

- [ ] **DATA-01**: JSON設定ファイルでメンバー名とSubstackフィードURLを管理できる
- [ ] **DATA-02**: rss-parserでサーバーサイドからRSSフィードを取得・解析できる
- [ ] **DATA-03**: ISR（revalidate設定可能）でデータを自動更新できる
- [ ] **DATA-04**: 一部のフィード取得が失敗しても他のメンバーは正常に表示される

### Calendar

- [ ] **CAL-01**: 月別カレンダーグリッドでメンバーの記事公開日を表示できる
- [ ] **CAL-02**: 記事公開日のセルに色やマークで視覚的に区別できる
- [ ] **CAL-03**: 日付セルのホバーで記事タイトルと元記事リンクを表示できる
- [ ] **CAL-04**: 前月/次月ナビゲーションで過去の活動も確認できる

### Dashboard

- [ ] **DASH-01**: メンバー全員のカレンダーを一覧表示するダッシュボードがある
- [ ] **DASH-02**: メンバーをクリックして個人詳細ビューに切り替えられる
- [ ] **DASH-03**: モバイルでも見やすいレスポンシブデザインで表示される

### Deploy

- [ ] **DEP-01**: Vercelにデプロイして継続的に運用できる

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Motivation

- **MOT-01**: 連続投稿日数（ストリーク）を表示する
- **MOT-02**: 月間投稿数サマリーを表示する
- **MOT-03**: 年間ヒートマップ（GitHub草型）で長期活動を可視化する

### Management

- **MGT-01**: ブラウザ上でフィードURLを追加・削除できる管理画面

## Out of Scope

| Feature | Reason |
|---------|--------|
| ユーザー認証・ログイン | 公開ページのため不要。URL共有で十分 |
| コメント・いいね機能 | Substack本体の機能と重複 |
| リアルタイム通知 | カレンダー確認で十分。Substackにも通知あり |
| ランキング・順位表示 | 競争原理はコミュニティの「ゆるさ」を壊す |
| データベース | 50フィード規模ではISRキャッシュで十分 |
| Substack以外のRSSソース | スコープを絞る。汎用化はYAGNI |
| モバイルアプリ | レスポンシブWebで十分 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| CAL-01 | TBD | Pending |
| CAL-02 | TBD | Pending |
| CAL-03 | TBD | Pending |
| CAL-04 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DEP-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 after initial definition*
