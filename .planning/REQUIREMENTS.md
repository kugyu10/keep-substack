# Requirements: Keep Substack

**Defined:** 2026-05-11
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること

## v1.2 Requirements

### 管理画面 (Admin)

- [x] **ADMIN-01**: 管理者が既存メンバーの各フィールド（name, addedAt, teamName）を編集・更新できる

### アイコン表示 (Icon)

- [x] **ICON-01**: トップビューのヒートマップ行にSubstackアイコン（channel.image.url）を表示できる
- [x] **ICON-02**: メンバーカレンダーページにSubstackアイコンを表示できる
- [x] **ICON-03**: トップビューはレスポンシブ対応（スマホ幅: アイコンのみ / PC幅: アイコン+名前）

### ナビゲーション (Nav)

- [x] **NAV-01**: メンバー詳細ページの戻りリンクのラベルが「メンバー一覧」と表示される
- [x] **NAV-02**: 戻りリンクの遷移先はメンバーの所属チームビュー（/?team=xxx、未所属は/）

### Tooltip (Tooltip)

- [x] **TOOLTIP-01**: Tooltip内の画像をクリックすると記事に遷移できる（hrefが画像にも付与される）
- [x] **TOOLTIP-02**: Tooltip内の記事と記事の間にスペースがあり、タイトルと画像の対応が視認しやすい

### フッター (Footer)

- [x] **FOOTER-01**: 全ページのフッターに参加案内リンク（https://uojun.substack.com/p/5d4）が表示される

## Future Requirements

- 連続投稿日数（ストリーク）を表示する
- 月間投稿数サマリーを表示する
- 年間ヒートマップ（GitHub草型）で長期活動を可視化する

## Out of Scope

| Feature | Reason |
|---------|--------|
| ユーザー認証・ログイン | 公開ページのため不要。管理画面はBasic認証で対応 |
| リアルタイム通知 | カレンダー確認で十分 |
| コメント・いいね機能 | Substack本体の機能と重複 |
| モバイルアプリ | Webアプリで十分、レスポンシブ対応済み |
| ランキング・順位表示 | コミュニティの「ゆるさ」を壊す |
| Substack以外のRSSソース | スコープを絞る。汎用化はYAGNI |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOLTIP-01 | Phase 7 | Complete |
| TOOLTIP-02 | Phase 7 | Complete |
| NAV-01 | Phase 7 | Complete |
| NAV-02 | Phase 7 | Complete |
| FOOTER-01 | Phase 7 | Complete |
| ICON-01 | Phase 8 | Complete |
| ICON-02 | Phase 8 | Complete |
| ICON-03 | Phase 8 | Complete |
| ADMIN-01 | Phase 9 | Complete |

**Coverage:**
- v1.2 requirements: 9 total
- Completed: 9 ✓

---
*Requirements defined: 2026-05-11*
*Last updated: 2026-05-11 — v1.2 all requirements complete*
