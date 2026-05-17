# Requirements: Keep Substack v1.6

## Milestone Goal

チームステータス管理・メンバー自律参加・E2Eテストにより、コミュニティの自律性と品質を強化する。

---

## v1.6 Requirements

### TEAM — チームステータス管理

- [ ] **TEAM-01**: teamsテーブルにstatus（public/private/hidden）カラムを追加できる
- [ ] **TEAM-02**: 管理画面でチームのstatusを設定・変更できる
- [ ] **TEAM-03**: publicチームのみがトップページのチームタブに表示される（privateもhiddenも非表示）
- [ ] **TEAM-04**: HIDDEN_TEAM定数を廃止し、teams.status='hidden'で同等の動作を実現できる

### SELF — メンバー自律参加

- [ ] **SELF-01**: /myページにstatus=publicのチーム一覧がチェックボックスで表示される
- [ ] **SELF-02**: チェックボックスを操作してpublicチームへの参加・退出ができる
- [ ] **SELF-03**: status=privateのチームは/myに参加不可として表示される（または非表示）

### VIEW — 管理者hiddenチームビュー

- [ ] **VIEW-01**: /admin/teams/{teamName} でhiddenチームの週次ヒートマップビューが表示される
- [ ] **VIEW-02**: /admin/teams/{teamName} はadminロールのユーザーのみアクセスできる（proxy.tsで制御）

### SCHEMA — スキーマ拡張

- [ ] **SCHEMA-01**: member_publicationsテーブルを追加し、1メンバーが複数publication_idを持てる構造にできる
- [ ] **SCHEMA-02**: 既存のmembers.publication_idをmember_publicationsに移行するスクリプトまたはDDLを用意できる（アプリUIは1件前提のまま）

### E2E — テスト

- [ ] **E2E-01**: Magic Linkログインフロー（メール送信→/auth/callback→/myリダイレクト）をPlaywrightでテストできる
- [ ] **E2E-02**: /myページのメンバー操作（publicチーム参加・退出）をPlaywrightでテストできる
- [ ] **E2E-03**: /adminが未認証ユーザーおよび非adminユーザーからブロックされることをPlaywrightでテストできる

---

## Future Requirements (Deferred)

- 連続投稿日数（ストリーク）を表示する — v1.7以降
- 月間投稿数サマリーを表示する — v1.7以降
- 年間ヒートマップ（GitHub草型）で長期活動を可視化する — v1.7以降
- privateチームへの参加申請フロー（pending/approved）— 信頼ベースコミュニティで現状不要
- member_publicationsを使った複数フィード表示UI — SCHEMA-01/02完了後に検討

---

## Out of Scope

- チームステータスの追加（4種類以上）— 将来の拡張余地はあるがv1.6はpublic/private/hiddenの3種
- メンバーランキング・順位表示 — コミュニティの「ゆるさ」を壊す
- Substack以外のRSSソース — スコープを絞る
- モバイルアプリ — Webで十分

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TEAM-01 | Phase 22 | Pending |
| TEAM-02 | Phase 22 | Pending |
| TEAM-03 | Phase 22 | Pending |
| TEAM-04 | Phase 22 | Pending |
| SELF-01 | Phase 23 | Pending |
| SELF-02 | Phase 23 | Pending |
| SELF-03 | Phase 23 | Pending |
| VIEW-01 | Phase 24 | Pending |
| VIEW-02 | Phase 24 | Pending |
| SCHEMA-01 | Phase 25 | Pending |
| SCHEMA-02 | Phase 25 | Pending |
| E2E-01 | Phase 26 | Pending |
| E2E-02 | Phase 26 | Pending |
| E2E-03 | Phase 26 | Pending |

---

*Last updated: 2026-05-17 — v1.6 Team Roles + Member Self-Service*
