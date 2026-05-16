# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- ✅ **v1.3 Data Persistence + Multi-Team** — Phases 10-12.1 (shipped 2026-05-12)
- ✅ **v1.4 UI/UX Refresh** — Phases 13-16 (shipped 2026-05-15)
- 🚧 **v1.5 Member Auth + Supabase Migration** — Phases 17-21 (in progress)

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

### 🚧 v1.5 Member Auth + Supabase Migration (In Progress)

**Milestone Goal:** Supabase完全移行・ログイン・メンバー自己管理を実現し、管理者依存を排除してメンバーが自律的に参加できるサービスにする

- [x] **Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行** - PostgreSQLテーブル定義・RLSポリシー・Supabaseクライアント基盤を構築し、KV→SQL移行スクリプトを作成（completed 2026-05-16）
- [x] **Phase 18: データレイヤー差し替え + 長期記事履歴** - 読み書きをSupabaseに切り替え、Cronを長期累積保存に対応、proxy.tsリネーム (Plans: 18-01, 18-02, 18-03) — completed 2026-05-16
- [x] **Phase 19: Supabase Auth + メンバー自己管理** - Magic Linkログイン・/myページ・既存メンバー自己リンク・adminロール制御 — completed 2026-05-16
- [x] **Phase 20: 管理画面チームチェックボックス** - Supabase teamsテーブルを前提に、チームをカンマ区切り入力からチェックボックスUIで選択できるよう改善 (completed 2026-05-16)
- [x] **Phase 21: Redisクリーンアップ** - @upstash/redis削除・KVファイル廃止・コードベース整理 (completed 2026-05-16)

## Phase Details

### Phase 13: ファーストビュー + モバイルレイアウト
**Goal**: 開いた瞬間に継続データが目に飛び込むモバイルファーストのトップページを実現する
**Depends on**: Phase 12.1 (v1.3完了)
**Requirements**: LAYOUT-01, LAYOUT-02
**Success Criteria** (what must be TRUE):
  1. トップページを開いた瞬間（スクロールなし）にヒートマップグリッドが表示される
  2. スマートフォン（375px幅）でヒートマップが横幅に収まり快適に閲覧できる
  3. ヒーローバナーが削除または大幅縮小されており、データ領域が最大化されている
**Plans**: 13-01
**UI hint**: yes
**Status**: Complete (2026-05-15)

### Phase 14: ユーザーリスト + チームタブ UI
**Goal**: ユーザーリスト行が1行で収まり、個人ページへの導線とタブ選択状態が直感的にわかる
**Depends on**: Phase 13
**Requirements**: LIST-01, LIST-02, LIST-03
**Success Criteria** (what must be TRUE):
  1. メンバー名が長い場合もアバターと名前が1行に収まり、末尾が省略（...）で表示される
  2. 各メンバー行の右端にシェブロン（>）が表示され、個人ページに遷移できることが視覚的にわかる
  3. 選択中のチームタブが非選択タブと明確に区別できる（背景色・境界線などで一目でわかる）
**Plans**: 14-01
**UI hint**: yes
**Status**: Complete (2026-05-15)

### Phase 15: ヒートマップ カラーリング
**Goal**: Substackオレンジの濃淡でメンバーの投稿状況が一目でわかるヒートマップになる
**Depends on**: Phase 14
**Requirements**: HEATMAP-01, HEATMAP-02
**Success Criteria** (what must be TRUE):
  1. 投稿ありの日付セルがSubstackオレンジ（#FF6719系）の濃淡で表示され、投稿数が多いほど濃く見える
  2. 投稿なしの日付セルが点線丸で表示され、投稿ありはオレンジのベタ塗り丸で表示される
  3. 複数投稿がある日付セルに投稿数の数字が表示される
**Plans**: 15-01
**UI hint**: yes
**Status**: Complete (2026-05-15)

### Phase 16: ポップオーバー刷新
**Goal**: 記事ポップオーバーが横並びレイアウト・ダーク背景で読みやすく、Click Outsideや×ボタンで直感的に閉じられるようになる
**Depends on**: Phase 15
**Requirements**: POPOVER-01, POPOVER-02, POPOVER-03, POPOVER-04
**Success Criteria** (what must be TRUE):
  1. ポップオーバー内の記事一覧がサムネイル＋2行タイトルの横並びリスト形式で表示される
  2. ポップオーバーがダーク背景（zinc-800系）・白テキスト・影付きで表示され視認性が高い
  3. ポップオーバー外の領域をクリック/タップするとポップオーバーが閉じる
  4. ポップオーバー右上に×ボタンが表示され、タップするとポップオーバーが閉じる
**Plans**: 16-01
**UI hint**: yes
**Status**: Complete (2026-05-15)

### Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行
**Goal**: Supabase PostgreSQLのテーブル定義・RLSポリシー・クライアントライブラリが揃いアプリがSupabaseに接続できる状態になり、既存Upstash RedisのデータがPostgreSQLに過不足なく移行されている
**Depends on**: Phase 16 (v1.4完了)
**Requirements**: MIGRATE-01, MIGRATE-02
**Success Criteria** (what must be TRUE):
  1. Supabase管理画面でmembersテーブルとarticlesテーブルが正しいカラム定義で作成されている
  2. RLSポリシーが有効化され、anon keyでは自分のデータのみ変更できることが確認できる
  3. アプリから`@supabase/supabase-js`を使ってDB接続が成功し、membersテーブルをSELECTできる
  4. 環境変数（NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY）がVercel本番環境に設定されている
  5. 移行スクリプトを実行すると既存Redisのメンバーデータがmembersテーブルに全件INSERTされる
  6. 既存Redisの記事データがarticlesテーブルに全件INSERTされ、link列のUNIQUE制約で重複が排除される
  7. Supabase管理画面でメンバー数・記事数がRedis側と一致することを確認できる
**Plans**: 17-01, 17-02, 17-03

### Phase 18: データレイヤー差し替え + 長期記事履歴
**Goal**: アプリの読み書きが完全にSupabaseを参照し、Cronが長期記事を累積保存できる状態になる
**Depends on**: Phase 17
**Requirements**: MIGRATE-03, HISTORY-01, HISTORY-02, HISTORY-03
**Success Criteria** (what must be TRUE):
  1. トップページと個人ページがSupabase articlesテーブルから記事データを取得して正常に表示される
  2. Vercel Cronが実行されるとSupabase articlesテーブルに記事が書き込まれ、重複はlink列UNIQUE制約で自動排除される
  3. getMembers()/saveArticles()等の関数シグネチャが変わらず、呼び出し元のpage.tsxに変更が不要なことを確認できる
  4. 1ヶ月以上前の記事がarticlesテーブルに蓄積されており、ヒートマップに反映される
**Plans**: 18-01, 18-02, 18-03

### Phase 19: Supabase Auth + メンバー自己管理
**Goal**: メンバーがMagic Linkでログインして自分のプロフィールを自己管理でき、管理者への依頼なしに参加登録できる
**Depends on**: Phase 18
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. /loginページでメールアドレスを入力してMagic Linkを送信できる
  2. メール内のリンクをクリックするとログイン状態になり/myページにリダイレクトされる
  3. /myページで自分のSubstack URLと所属チームを登録・更新して保存できる
  4. 既存管理者登録済みメンバーがsubstackIdを入力すると自分のアカウントと紐付けられる
  5. /adminへのアクセスがSupabaseユーザーロール（admin role）で制御され、Basic Authが不要になる
**Plans**: 19-01, 19-02, 19-03
**UI hint**: yes

### Phase 20: 管理画面チームチェックボックス
**Goal**: 管理者がメンバーのチーム所属をタイポなしでチェックボックスから選択・更新できる（Phase 17で構築したSupabase teamsテーブルを利用）
**Depends on**: Phase 19 (Supabase teamsテーブルがPhase 17で作成済みであること前提)
**Requirements**: ADMIN-01
**Success Criteria** (what must be TRUE):
  1. 管理画面のメンバー編集欄にSupabase teamsテーブルから取得した既存チーム名の一覧がチェックボックスで表示される
  2. チェックボックスを切り替えてチームを選択し保存すると、所属チームが正しく更新される
  3. カンマ区切りテキスト入力が不要になり、タイポによるチーム名不一致が起きなくなる
**Plans**: 20-01
**UI hint**: yes

### Phase 21: Redisクリーンアップ
**Goal**: Upstash Redis関連のコード・パッケージが完全に削除され、コードベースがSupabaseのみで動作する
**Depends on**: Phase 20
**Requirements**: MIGRATE-04
**Success Criteria** (what must be TRUE):
  1. `@upstash/redis`パッケージがpackage.jsonから削除されており、`npm install`でインストールされない
  2. kvMembers.ts・kvArticles.tsファイルが削除されており、これらを参照するimportが存在しない
  3. アプリが本番環境でビルド・デプロイに成功し、全機能が正常に動作する
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
| 20. 管理画面チームチェックボックス | v1.5 | 1/1 | Complete   | 2026-05-16 |
| 21. Redisクリーンアップ | v1.5 | 1/1 | Complete   | 2026-05-16 |
