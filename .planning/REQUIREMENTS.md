# Requirements: Keep Substack

**Defined:** 2026-05-11
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること

## v1.3 Requirements

### 記事永続化 (Persist)

- [ ] **PERSIST-01**: Vercel Cron（1日1回）でRSSフィードを取得しKVに記事データを累積保存できる
- [ ] **PERSIST-02**: メンバー登録時に初回フィード取得を実行してKVに保存する
- [ ] **PERSIST-03**: 累積済み記事データをカレンダービュー・ヒートマップで使用できる

### チーム多対多 (Team)

- [ ] **TEAM-01**: 1人のメンバーが複数チームに所属できる（teamNames: string[]）
- [ ] **TEAM-02**: 管理画面でメンバーの所属チームをカンマ区切りで複数設定・更新できる
- [ ] **TEAM-03**: チームフィルターで複数チーム所属のメンバーがどのチームでも表示される

## Future Requirements

- Supabase移行（認証・DB・Cron永続化の大リファクタリング）— v2.0候補
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
| PERSIST-01 | Phase 10 | Pending |
| PERSIST-02 | Phase 10 | Pending |
| PERSIST-03 | Phase 10 | Pending |
| TEAM-01 | Phase 11 | Pending |
| TEAM-02 | Phase 11 | Pending |
| TEAM-03 | Phase 11 | Pending |

**Coverage:**
- v1.3 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-11*
