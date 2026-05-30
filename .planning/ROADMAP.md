# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- ✅ **v1.3 Data Persistence + Multi-Team** — Phases 10-12.1 (shipped 2026-05-12)
- ✅ **v1.4 UI/UX Refresh** — Phases 13-16 (shipped 2026-05-15)
- ✅ **v1.5 Member Auth + Supabase Migration** — Phases 17-21 (shipped 2026-05-17)
- 🚧 **v1.6 Team Roles + Member Self-Service** — Phases 22-26 (in progress)

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

### 🚧 v1.6 Team Roles + Member Self-Service (In Progress)

**Milestone Goal:** チームステータス管理・メンバー自律参加・E2Eテストにより、コミュニティの自律性と品質を強化する

- [x] **Phase 22: チームステータス管理** - teamsテーブルにstatus（public/private/hidden）を追加し、HIDDEN_TEAM定数を廃止、管理画面で設定できるようにする (completed 2026-05-26)
- [x] **Phase 23: /myページ公開チーム参加・退出** - publicチームをチェックボックスで自由参加・退出できる自律参加フローを実装する (completed 2026-05-29)
- [x] **Phase 24: /admin/teams/{teamName} hiddenチームビュー** - 管理者がhiddenチームの週次ヒートマップをURL直接アクセスで確認できるページを追加する (completed 2026-05-30)
- [x] **Phase 25: 複数publication_idスキーマ拡張** - member_publicationsテーブルを追加し将来の複数Substack対応の基盤を整える（UI変更なし） (completed 2026-05-30)
- [ ] **Phase 26: E2Eテスト（Playwright）** - Magic Linkログイン・/my操作・/admin保護をPlaywrightでE2Eテストできる環境を構築する

## Phase Details

### Phase 22: チームステータス管理

**Goal**: teamsテーブルにstatus（public/private/hidden）カラムを追加し、HIDDEN_TEAM定数を廃止、管理画面でチームステータスを設定できるようにする
**Depends on**: Phase 21 (v1.5完了)
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04
**Success Criteria** (what must be TRUE):

  1. teamsテーブルにstatus TEXT NOT NULL DEFAULT 'public' カラムが存在する
  2. 管理画面のチーム一覧にstatusドロップダウン（public/private/hidden）が表示され変更・保存できる
  3. トップページのチームタブにstatus=publicのチームのみ表示される
  4. HIDDEN_TEAM定数のコードがなくなり、status='hidden'で同等の動作をする

**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 22-01-PLAN.md — DBマイグレーション: statusカラム追加 + Supabase適用

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 22-02-PLAN.md — Member型変更（teamNames→teams）+ getMembers()/updateMember()拡張

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 22-03-PLAN.md — page.tsx statusフィルタリング刷新 + AdminMemberList修正
- [x] 22-04-PLAN.md — /admin/teams 新設（RSC+Client Component+Server Action）+ /adminリンク追加

### Phase 23: /myページ公開チーム参加・退出

**Goal**: ログインユーザーが/myページからstatus=publicのチームをチェックボックスで自由に参加・退出できる
**Depends on**: Phase 22
**Requirements**: SELF-01, SELF-02, SELF-03
**Success Criteria** (what must be TRUE):

  1. /myページにstatus=publicのチーム一覧がチェックボックスで表示される
  2. チェックボックスをONにして保存するとmember_teamsに追加され、チームに参加できる
  3. チェックボックスをOFFにして保存するとmember_teamsから削除され、チームを退出できる
  4. status=privateのチームは/myに参加不可として表示されるか非表示になる

**Plans**: 3 plans

Plans:
**Wave 1**

- [x] 23-01-PLAN.md — updateMyProfileActionをpublicチーム限定の参加・退出に完全置き換え（SELF-02）
- [x] 23-02-PLAN.md — page.tsxでstatus付きJOIN＋全publicチーム取得、currentTeams/publicTeams props化（SELF-01, SELF-03）

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-03-PLAN.md — MyProfileFormのチーム欄をチェックボックスリストに置換、privateはreadonly表示（SELF-01, SELF-03）
**UI hint**: yes

### Phase 24: /admin/teams/{teamName} hiddenチームビュー

**Goal**: 管理者が /admin/teams/{teamName} でhiddenチームの週次ヒートマップビューを確認できる
**Depends on**: Phase 22
**Requirements**: VIEW-01, VIEW-02
**Success Criteria** (what must be TRUE):

  1. /admin/teams/{teamName} にアクセスするとそのチームの週次ヒートマップが表示される
  2. adminロール以外のユーザーが /admin/teams/{teamName} にアクセスすると / にリダイレクトされる
  3. hiddenチームのteamNameを指定するとそのhiddenチームメンバーのデータが表示される

**Plans**: 2 plans

Plans:
**Wave 1**

- [x] 24-01-PLAN.md — 動的ルート /admin/teams/[teamName] RSC 新設（teamName完全一致フィルタ→週次ヒートマップ / 空時メッセージ, VIEW-01）
- [x] 24-02-PLAN.md — proxy.ts が /admin/teams/{teamName} を既存ゲートでカバーすることの確認テスト（VIEW-02, confirm-only）

**UI hint**: yes

### Phase 25: 複数publication_idスキーマ拡張

**Goal**: member_publicationsテーブルを追加して1メンバーが複数のpublication_idを持てるDB構造を整える（アプリUIは1件前提のまま）
**Depends on**: Phase 22
**Requirements**: SCHEMA-01, SCHEMA-02
**Success Criteria** (what must be TRUE):

  1. member_publicationsテーブル（member_id FK, publication_id TEXT UNIQUE, is_primary BOOLEAN）が存在する
  2. 既存のmembers.publication_idデータがmember_publicationsに移行済みのDDL/スクリプトが存在する
  3. アプリのUIおよびデータ取得ロジックは変更なしでビルド・動作する

**Plans**: 2 plans

Plans:
**Wave 1**

- [x] 25-01-PLAN.md — member_publications マイグレーション作成（テーブル+部分ユニークIndex+RLS+バックフィル+同期トリガー）+ schema.sql へ恒久定義をミラー（SCHEMA-01, SCHEMA-02）

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 25-02-PLAN.md — [BLOCKING] Supabase SQL Editor でマイグレーション適用 + 適用後SQL検証（テーブル/RLS/バックフィル整合/トリガー）+ src/無変更確認（SCHEMA-01, SCHEMA-02）

### Phase 26: E2Eテスト（Playwright）

**Goal**: Magic Linkログインフロー・/my操作・/admin保護をPlaywrightでE2Eテストできる環境が整う
**Depends on**: Phase 23, Phase 24
**Requirements**: E2E-01, E2E-02, E2E-03
**Success Criteria** (what must be TRUE):

  1. `npx playwright test` を実行してMagic Linkログインフローのテストが通る（モックまたはテスト用アカウント使用）
  2. /myページのpublicチーム参加・退出操作のテストが通る
  3. /adminへの未認証アクセスが / にリダイレクトされることのテストが通る

**Plans**: TBD

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
| 26. E2Eテスト（Playwright） | v1.6 | 0/? | Not started | - |
