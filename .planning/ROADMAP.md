# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- ✅ **v1.3 Data Persistence + Multi-Team** — Phases 10-12.1 (shipped 2026-05-12)
- ✅ **v1.4 UI/UX Refresh** — Phases 13-16 (shipped 2026-05-15)

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
