# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- ✅ **v1.3 Data Persistence + Multi-Team** — Phases 10-12.1 (shipped 2026-05-12)
- ✅ **v1.4 UI/UX Refresh** — Phases 13-16 (shipped 2026-05-15)
- ✅ **v1.5 Member Auth + Supabase Migration** — Phases 17-21 (shipped 2026-05-17)
- ✅ **v1.6 Team Roles + Member Self-Service** — Phases 22-26 (shipped 2026-05-30)
- ✅ **v1.7 Commit & Goal View + Substack Profile Link** — Phases 27-31 (shipped 2026-06-06)
- 🔄 **v1.8 Debug, Stabilization & UI Polish** — Phases 32-36 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) — SHIPPED 2026-05-08</summary>

- [x] Phase 1: プロジェクト基盤とデータ層 (2/2 plans) — completed 2026-05-08
- [x] Phase 2: カレンダーUI (2/2 plans) — completed 2026-05-08
- [x] Phase 3: ダッシュボードとUX仕上げ (2/2 plans) — completed 2026-05-08

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Dynamic Members + Weekly View (Phases 4-6) — SHIPPED 2026-05-10</summary>

- [x] Phase 4: KVデータ層移行 (2/2 plans) — completed 2026-05-09
- [x] Phase 5: WeeklyHeatmap + リッチTooltip (2/2 plans) — completed 2026-05-09
- [x] Phase 6: 管理画面 + チームフィルター (2/2 plans) — completed 2026-05-10

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 UX Polish + Member Edit (Phases 7-9) — SHIPPED 2026-05-11</summary>

- [x] Phase 7: UI小改善バッチ（Tooltip・ナビ・フッター）(1/1 plans) — completed 2026-05-11
- [x] Phase 8: Substackアイコン + レスポンシブ対応 (1/1 plans) — completed 2026-05-11
- [x] Phase 9: 管理画面メンバー編集 (1/1 plans) — completed 2026-05-11

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Data Persistence + Multi-Team (Phases 10-12.1) — SHIPPED 2026-05-12</summary>

- [x] Phase 10: Cron + KV記事永続化 (1/1 plans) — completed 2026-05-11
- [x] Phase 11: チーム多対多所属 (1/1 plans) — completed 2026-05-11
- [x] Phase 12: chameleon-hidden-team (1/1 plans) — completed 2026-05-12
- [x] Phase 12.1: rss-isr-hybrid (1/1 plans) — completed 2026-05-12

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 UI/UX Refresh (Phases 13-16) — SHIPPED 2026-05-15</summary>

**Milestone Goal:** モバイルファーストを軸に、ファーストビュー・ヒートマップ・ポップオーバーのUIを刷新してユーザー体験を向上させる

- [x] **Phase 13: ファーストビュー + モバイルレイアウト** - ヒーローバナーを排除し開いた瞬間にデータが見えるモバイルファーストレイアウトに刷新 — completed 2026-05-15
- [x] **Phase 14: ユーザーリスト + チームタブ UI** - リスト行を1行化・シェブロン追加・アクティブタブを視認しやすく改善 — completed 2026-05-15
- [x] **Phase 15: ヒートマップ カラーリング** - Substackオレンジ濃淡・点線丸/ベタ塗りセルで継続可視化を強化 — completed 2026-05-15
- [x] **Phase 16: ポップオーバー刷新** - 横並びレイアウト・ダークモード・Click Outside・×ボタンでポップオーバーを使いやすく刷新 — completed 2026-05-15

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Member Auth + Supabase Migration (Phases 17-21) — SHIPPED 2026-05-17</summary>

- [x] **Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行** (3/3 plans) — completed 2026-05-16
- [x] **Phase 18: データレイヤー差し替え + 長期記事履歴** (3/3 plans) — completed 2026-05-16
- [x] **Phase 19: Supabase Auth + メンバー自己管理** (3/3 plans) — completed 2026-05-16
- [x] **Phase 20: 管理画面チームチェックボックス** (1/1 plans) — completed 2026-05-16
- [x] **Phase 21: Redisクリーンアップ** (1/1 plans) — completed 2026-05-16

Full archive: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Team Roles + Member Self-Service (Phases 22-26) — SHIPPED 2026-05-30</summary>

**Milestone Goal:** チームステータス管理・メンバー自律参加・E2Eテストにより、コミュニティの自律性と品質を強化する

- [x] **Phase 22: チームステータス管理** (4/4 plans) — completed 2026-05-26
- [x] **Phase 23: /myページ公開チーム参加・退出** (3/3 plans) — completed 2026-05-29
- [x] **Phase 24: /admin/teams/{teamName} hiddenチームビュー** (2/2 plans) — completed 2026-05-30
- [x] **Phase 25: 複数publication_idスキーマ拡張** (2/2 plans) — completed 2026-05-30
- [x] **Phase 26: E2Eテスト（Playwright）** (3/3 plans) — completed 2026-05-30

Full archive: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.7 Commit & Goal View + Substack Profile Link (Phases 27-31) — SHIPPED 2026-06-06</summary>

**Milestone Goal:** コミットスケジュールの宣言と3週間の達成グリッドで「継続の意志と実績」を仲間に見せるトップビューを新設し、Substackプロフィールへの直リンクも追加する

- [x] **Phase 27: Substack Handle — DB + プロフィールリンク** (2/2 plans) — completed 2026-06-02
- [x] **Phase 28: コミットスケジュール — DB + /my ページ** (2/2 plans) — completed 2026-06-03
- [x] **Phase 29: Commit & Goal View — 新トップページ** (2/2 plans) — completed 2026-06-04
- [x] **Phase 30: アチーブメント（👑 / 🔥）** (2/2 plans) — completed 2026-06-04
- [x] **Phase 31: ログインフロー修正** (4/4 plans) — completed 2026-06-06

Full archive: `.planning/milestones/v1.7-ROADMAP.md`

</details>

---

## v1.8 Debug, Stabilization & UI Polish

**Milestone Goal:** 本番バグを解消・安定化しつつ、ログインフロー・ナビゲーション・分析基盤などのUI改善を積み重ねる

- [x] **Phase 32: 本番DBマイグレーション** — member_commit_slots を本番 DB に適用し schedule-save を本番で動作させる
- [ ] **Phase 33: バグ修正 + commitSlots upsert化** — RSS即時取得バグ・auth/callback リダイレクト・commitSlots アトミック保存を修正する
- [ ] **Phase 34: UI Polish バッチ** — ログインページ・フッター・マイページボタン・ソート順の小改善を一括適用する
- [ ] **Phase 35: チーム可視性拡張 + Google Analytics** — private チームをトップビューに表示し GA4 を全ページに導入する
- [ ] **Phase 36: QA・UAT・検証ギャップ解消** — Phase 27-29 の human UAT シナリオと VERIFICATION.md ギャップをすべて完了させる

## Phase Details

### Phase 32: 本番DBマイグレーション

**Goal**: 本番 Supabase DB に member_commit_slots テーブルが存在し、コミットスケジュール保存が本番環境で正常に動作する
**Depends on**: Nothing (first phase — unblocks all other phases)
**Requirements**: DB-02
**Success Criteria** (what must be TRUE):

  1. 本番 DB (xolhjcngrwwwqtklmoyk) に member_commit_slots テーブルが存在する
  2. /my ページでコミットスケジュールを保存すると、本番環境でエラーなく保存される
  3. 保存したスケジュールが /my ページをリロードしても正しく表示される

**Plans**: 1 plan
Plans:

- [x] 32-01-PLAN.md — 本番 DB マイグレーション適用 + E2E 検証（member_commit_slots CREATE TABLE + UNIQUE 制約）

### Phase 33: バグ修正 + commitSlots upsert化

**Goal**: 新規メンバー追加時の RSS 取得バグ・Magic Link 後のリダイレクト欠落・commitSlots の非アトミック保存がそれぞれ修正されている
**Depends on**: Phase 32
**Requirements**: BUG-01, BUG-02, DB-01
**Success Criteria** (what must be TRUE):

  1. 管理画面でメンバーを新規追加すると、そのメンバーの RSS フィードが即時取得されて記事データが保存される
  2. Magic Link でログインした後、ログイン前にいたページ（next パラメータ）に正しくリダイレクトされる
  3. /my ページでコミットスケジュールを保存したとき、ネットワーク遅延や再試行があっても重複・欠損なくデータが保存される（upsert による冪等性）

**Plans**: 5 plans
Plans:
**Wave 1**

- [ ] 33-01-PLAN.md — middleware.ts 新規作成 + auth/callback next 変数有効化（BUG-02 server-side）
- [ ] 33-02-PLAN.md — login page/form/action の next パラメータ対応（BUG-02 login-side）
- [ ] 33-03-PLAN.md — RPC 関数 schema.sql 追加 + updateCommitSlotsAction RPC 化（DB-01）

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 33-04-PLAN.md — migration ファイル作成 + 本番 DB RPC 関数適用（DB-01 prod push）
- [ ] 33-05-PLAN.md — updateCommitSlotsAction.test.ts RPC mock 更新 + E2E admin-guard 修正

### Phase 34: UI Polish バッチ

**Goal**: ログイン・サインインページのUIが整理され、フッター文言が改善され、/my ページのナビゲーションが適切に制御され、Commit & Goal View のソートが改善されている
**Depends on**: Phase 32
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):

  1. /login と /signin-51cf21389c56 ページを開くと、サイトヘッダーとフッターが非表示で Keep Substack ロゴのみ表示される
  2. フッターを表示したとき、ログイン中のユーザーには適切な（ログイン済みを前提とした）文言が表示される
  3. Commit & Goal View のメンバー並び順が新しいソートルールに従って表示される
  4. /my ページを表示中はサイトヘッダーの「マイページ」ボタンが表示されない

**Plans**: TBD
**UI hint**: yes

### Phase 35: チーム可視性拡張 + Google Analytics

**Goal**: private チームがトップビューのチームタブに表示されてログイン不要で閲覧でき、GA4 が本番環境の全ページでページビューをトラッキングしている
**Depends on**: Phase 32
**Requirements**: TEAM-01, ANLT-01, ANLT-02
**Success Criteria** (what must be TRUE):

  1. トップページのチームタブに private チームが表示され、未ログインユーザーがそのタブを選択してメンバーの Commit & Goal View を閲覧できる
  2. /my ページからの private チームへの参加・退出操作は引き続き不可（readonly のまま）
  3. 本番環境（Vercel production build）で全ページのページビューが GA4 プロパティに記録される
  4. ローカル開発環境（next dev）では GA4 スクリプトが読み込まれない

**Plans**: TBD
**UI hint**: yes

### Phase 36: QA・UAT・検証ギャップ解消

**Goal**: Phase 27-29 で積み残されていた human UAT シナリオと VERIFICATION.md の未検証項目がすべて完了し、v1.8 出荷判定が可能な状態になっている
**Depends on**: Phase 32, Phase 33, Phase 34, Phase 35
**Requirements**: QA-01, QA-02, QA-03, QA-04
**Success Criteria** (what must be TRUE):

  1. Phase 27 の human UAT 6 シナリオがすべて本番環境で実行・パスしている
  2. Phase 27 VERIFICATION.md の未解決ギャップが解消され、結果が記録されている
  3. Phase 28 VERIFICATION.md の未解決ギャップが解消され、結果が記録されている
  4. Phase 29 VERIFICATION.md の未解決ギャップが解消され、結果が記録されている
  5. v1.8 全フェーズの success criteria がすべて満たされており、milestone close 判定ができる

**Plans**: TBD

## Phase Details (archived)

Full phase details for shipped milestones live in their archives under `.planning/milestones/`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. プロジェクト基盤とデータ層 | v1.0 | 2/2 | Complete | 2026-05-08 |
| 2. カレンダーUI | v1.0 | 2/2 | Complete | 2026-05-08 |
| 3. ダッシュボードとUX仕上げ | v1.0 | 2/2 | Complete | 2026-05-08 |
| 4. KVデータ層移行 | v1.1 | 2/2 | Complete | 2026-05-09 |
| 5. WeeklyHeatmap + リッチTooltip | v1.1 | 2/2 | Complete | 2026-05-09 |
| 6. 管理画面 + チームフィルター | v1.1 | 2/2 | Complete | 2026-05-10 |
| 7. UI小改善バッチ（Tooltip・ナビ・フッター） | v1.2 | 1/1 | Complete | 2026-05-11 |
| 8. Substackアイコン + レスポンシブ対応 | v1.2 | 1/1 | Complete | 2026-05-11 |
| 9. 管理画面メンバー編集 | v1.2 | 1/1 | Complete | 2026-05-11 |
| 10. Cron + KV記事永続化 | v1.3 | 1/1 | Complete | 2026-05-11 |
| 11. チーム多対多所属 | v1.3 | 1/1 | Complete | 2026-05-11 |
| 12. chameleon-hidden-team | v1.3 | 1/1 | Complete | 2026-05-12 |
| 12.1. rss-isr-hybrid | v1.3 | 1/1 | Complete | 2026-05-12 |
| 13. ファーストビュー + モバイルレイアウト | v1.4 | 1/1 | Complete | 2026-05-15 |
| 14. ユーザーリスト + チームタブ UI | v1.4 | 1/1 | Complete | 2026-05-15 |
| 15. ヒートマップ カラーリング | v1.4 | 1/1 | Complete | 2026-05-15 |
| 16. ポップオーバー刷新 | v1.4 | 1/1 | Complete | 2026-05-15 |
| 17. Supabaseスキーマ + RLS設定 + KVデータ移行 | v1.5 | 3/3 | Complete | 2026-05-16 |
| 18. データレイヤー差し替え + 長期記事履歴 | v1.5 | 3/3 | Complete | 2026-05-16 |
| 19. Supabase Auth + メンバー自己管理 | v1.5 | 3/3 | Complete | 2026-05-16 |
| 20. 管理画面チームチェックボックス | v1.5 | 1/1 | Complete | 2026-05-16 |
| 21. Redisクリーンアップ | v1.5 | 1/1 | Complete | 2026-05-16 |
| 22. チームステータス管理 | v1.6 | 4/4 | Complete   | 2026-05-26 |
| 23. /myページ公開チーム参加・退出 | v1.6 | 3/3 | Complete   | 2026-05-29 |
| 24. /admin/teams/{teamName} hiddenチームビュー | v1.6 | 2/2 | Complete    | 2026-05-30 |
| 25. 複数publication_idスキーマ拡張 | v1.6 | 2/2 | Complete    | 2026-05-30 |
| 26. E2Eテスト（Playwright） | v1.6 | 3/3 | Complete    | 2026-05-30 |
| 27. Substack Handle — DB + プロフィールリンク | v1.7 | 2/2 | Complete    | 2026-06-02 |
| 28. コミットスケジュール — DB + /my ページ | v1.7 | 2/2 | Complete | 2026-06-03 |
| 29. Commit & Goal View — 新トップページ | v1.7 | 2/2 | Complete | 2026-06-04 |
| 30. アチーブメント（👑 / 🔥） | v1.7 | 2/2 | Complete    | 2026-06-04 |
| 31. ログインフロー修正 | v1.7 | 4/4 | Complete | 2026-06-06 |
| 32. 本番DBマイグレーション | v1.8 | 1/1 | Complete    | 2026-06-07 |
| 33. バグ修正 + commitSlots upsert化 | v1.8 | 0/5 | Not started | - |
| 34. UI Polish バッチ | v1.8 | 0/? | Not started | - |
| 35. チーム可視性拡張 + Google Analytics | v1.8 | 0/? | Not started | - |
| 36. QA・UAT・検証ギャップ解消 | v1.8 | 0/? | Not started | - |
