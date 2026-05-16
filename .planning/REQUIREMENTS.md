# Requirements: Keep Substack v1.5

## Milestone Goal

Supabase完全移行・ログイン・メンバー自己管理を実現し、管理者依存を排除してメンバーが自律的に参加できるサービスにする。

---

## v1.5 Requirements

### MIGRATE — Supabase完全移行

- [ ] **MIGRATE-01**: membersテーブル・articlesテーブルをSupabase PostgreSQLで定義し、RLSポリシーを設定できる
- [ ] **MIGRATE-02**: 既存Upstash RedisのKVデータをSupabase PostgreSQLに一括マイグレーションできる
- [ ] **MIGRATE-03**: getMembers()/saveArticles()等の既存関数シグネチャを変えずに内部実装をSupabaseに差し替えられる
- [ ] **MIGRATE-04**: @upstash/redisパッケージ・kvMembers.ts・kvArticles.tsを完全削除できる

### AUTH — 認証・メンバー自己管理

- [ ] **AUTH-01**: メンバーがメールアドレスでMagic Linkログインできる
- [ ] **AUTH-02**: ログイン後の/myページで自分のSubstack URLと所属チームを登録・編集できる
- [ ] **AUTH-03**: 既存管理者登録済みメンバーがsubstackIdを入力して自分のアカウントと紐付けできる
- [ ] **AUTH-04**: /adminへのアクセスがSupabaseユーザーロール（admin role）で制御される（Basic Auth廃止）

### HISTORY — 長期記事履歴

- [ ] **HISTORY-01**: Supabase articlesテーブルにtitle・link・pubDate・imageUrl・substackIdを累積保存できる（linkで重複排除）
- [ ] **HISTORY-02**: Vercel CronがSupabase articlesテーブルに書き込める
- [ ] **HISTORY-03**: fetchAllFeedsCachedがSupabase articlesテーブルを参照できる（ISRハイブリッド継続）

### ADMIN — 管理UI改善

- [ ] **ADMIN-01**: 管理画面でメンバーの所属チームをチェックボックスUIで選択・更新できる

---

## Future Requirements (Deferred)

- 年間ヒートマップ（GitHub草型）で長期活動を可視化する — v1.6以降（HISTORY基盤が必要）
- 連続投稿日数（ストリーク）を表示する — v1.6以降
- 月間投稿数サマリーを表示する — v1.6以降
- パーソナルダッシュボード（/myで自分の統計を見る）— v1.6以降
- OAuth（GitHub/Google）ログイン — v1.6以降（Magic Linkで十分か検証後）

---

## Out of Scope

- パスワード認証 — Magic Linkで十分、KISS原則
- リアルタイム通知 — カレンダー確認で十分
- コメント・いいね機能 — Substack本体と重複
- 承認制メンバー登録（pending/approved フロー）— 信頼ベースコミュニティで不要
- 記事本文（content:encoded）の保存 — Supabase無料枠500MBを急速消費、YAGNI
- Supabase以外のRSSソース — スコープを絞る

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| MIGRATE-01 | Phase 17 | Pending |
| MIGRATE-02 | Phase 17 | Pending |
| MIGRATE-03 | Phase 18 | Pending |
| HISTORY-01 | Phase 18 | Pending |
| HISTORY-02 | Phase 18 | Pending |
| HISTORY-03 | Phase 18 | Pending |
| AUTH-01 | Phase 19 | Pending |
| AUTH-02 | Phase 19 | Pending |
| AUTH-03 | Phase 19 | Pending |
| AUTH-04 | Phase 19 | Pending |
| ADMIN-01 | Phase 20 | Pending |
| MIGRATE-04 | Phase 21 | Pending |

---

*Last updated: 2026-05-16 — v1.5フェーズ構造改訂（Phase 17-21の5フェーズ構成に変更）*
