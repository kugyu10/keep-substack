# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- ✅ **v1.3 Data Persistence + Multi-Team** — Phases 10-12.1 (shipped 2026-05-12)
- ✅ **v1.4 UI/UX Refresh** — Phases 13-16 (shipped 2026-05-15)
- ✅ **v1.5 Member Auth + Supabase Migration** — Phases 17-21 (shipped 2026-05-17)
- ✅ **v1.6 Team Roles + Member Self-Service** — Phases 22-26 (shipped 2026-05-30)
- 🚧 **v1.7 Commit & Goal View + Substack Profile Link** — Phases 27-30 (in progress)

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

## v1.7 Commit & Goal View + Substack Profile Link (Phases 27-30)

**Milestone Goal:** コミットスケジュールの宣言と3週間の達成グリッドで「継続の意志と実績」を仲間に見せるトップビューを新設し、Substackプロフィールへの直リンクも追加する

### Phase 27: Substack Handle — DB + プロフィールリンク

**Goal:** `members` テーブルに `substack_handle` カラムを追加し、/my ページから登録・個人マンスリービューからプロフィールリンクを実装する

**Requirements:** PROF-01, PROF-02, PROF-03

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 27-01-PLAN.md — DB migration: substack_handle TEXT NULL カラムを members テーブルに追加

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 27-02-PLAN.md — App code: /my @handle 入力・保存・pre-fill + auth callback handle 伝搬 + CalendarGrid プロフィールリンク

**Success Criteria:**

1. `members.substack_handle` が DB に存在し null 許容
2. /my ページで @handle を入力・保存・再ロード後に反映される
3. 個人マンスリービューの名前/アイコンが `substack.com/@handle` を新タブで開く
4. `/login-…/?handle=hoge` アクセス後のログインで /my の @handle 欄が `hoge` で初期表示される

**UI hint:** yes

---

### Phase 28: コミットスケジュール — DB + /my ページ ✅

**Goal:** `member_commit_slots` テーブルを作成し、/my ページでコミット頻度・曜日・時刻を設定できるようにする

**Requirements:** SCHED-01, SCHED-02, SCHED-03

**Plans:** 2 plans — completed 2026-06-03

Plans:
**Wave 1**

- [x] 28-01-PLAN.md — DB migration: member_commit_slots テーブル作成 + RLS + schema.sql 同期 + Wave 0 テスト

**Wave 2**

- [x] 28-02-PLAN.md — /my ページ: CommitScheduleModal + updateCommitSlotsAction + page.tsx 統合

**Success Criteria:**

1. `member_commit_slots` テーブルが存在し、RLS で本人のみ書き込み可
2. /my ページで週1〜4の頻度を選択できる
3. 頻度に合わせた数の曜日+時刻入力欄が動的に表示される
4. 保存後に /my を再ロードしても設定が正しく反映される

**UI hint:** yes

---

### Phase 29: Commit & Goal View — 新トップページ ✅

**Goal:** 現トップ（週次ヒートマップ）を `/weekly-stamp` に移動し、新トップにコミット＆ゴールビューを実装する

**Requirements:** VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, VIEW-07

**Plans:** 2/2 plans — completed 2026-06-05

Plans:
**Wave 1**

- [x] 29-01-PLAN.md — 基盤レイヤー: CommitSlot 型 + Member.id 拡張 + commitUtils + /weekly-stamp ルート + Wave 0 テスト — completed 2026-06-04

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 29-02-PLAN.md — UI コンポーネント: CommitGoalView + CommitGoalRow + CommitGrid + 新トップページ差し替え — completed 2026-06-04

**Success Criteria:**

1. `/weekly-stamp` で旧ヒートマップが引き続き表示される
2. `/` に Commit & Goal View が表示される
3. Grid が3週分横並びで表示される（左古→右新）
4. 週1〜4のメンバーの Grid 総横幅が同じになる
5. 投稿済みスロットにサムネイルが、未投稿スロットに曜日名が表示される
6. スマホ幅では Grid が1週表示に縮退する
7. コミット未設定メンバーはグレーの「未コミット」セルで表示される

**UI hint:** yes

---

### Phase 30: アチーブメント（👑 / 🔥）

**Goal:** 今週全コミット達成（👑）と2週以上連続達成（🔥）のアイコンを計算して CommitGoalView に表示する

**Requirements:** ACHIEV-01, ACHIEV-02

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 30-01-PLAN.md — ロジック実装（TDD）: isCurrentWeekComplete / consecutiveWeekStreak / sortMembersForCommitView D-10完全版 を commitUtils.ts に追加・更新 + テスト

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 30-02-PLAN.md — UI接続: CommitGoalRow に streak prop 追加・Column 3 👑/👑🔥/空 条件分岐 + CommitGoalView で streak 計算・ヘッダー幅同期 + CommitGoalRow.test.tsx 新規作成

**Success Criteria:**

1. 今週の全コミットスロットに投稿があるメンバーに 👑 が表示される
2. 直近2週以上連続で全スロット達成しているメンバーに 🔥 が表示される
3. 達成していないメンバーにはアイコンが表示されない

---

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
| 28. コミットスケジュール — DB + /my ページ | v1.7 | 0/2 | Pending | — |
| 29. Commit & Goal View — 新トップページ | v1.7 | 2/2 | Complete | 2026-06-04 |
| 30. アチーブメント（👑 / 🔥） | v1.7 | 2/2 | Complete    | 2026-06-04 |
