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
- ✅ **v1.8 Debug, Stabilization & UI Polish** — Phases 32-36 (shipped 2026-06-11)
- 🚧 **v1.9 ワンボタン Substack Note 共有** — Phases 37-39 (in progress)

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

<details>
<summary>✅ v1.8 Debug, Stabilization & UI Polish (Phases 32-36) — SHIPPED 2026-06-11</summary>

**Milestone Goal:** 本番バグを解消・安定化しつつ、ログインフロー・ナビゲーション・分析基盤などのUI改善を積み重ねる

- [x] **Phase 32: 本番DBマイグレーション** (1/1 plans) — completed 2026-06-07
- [x] **Phase 33: バグ修正 + commitSlots upsert化** (5/5 plans) — completed 2026-06-08
- [x] **Phase 34: UI Polish バッチ** (5/5 plans) — completed 2026-06-08
- [x] **Phase 35: チーム可視性拡張 + Google Analytics** (3/3 plans) — completed 2026-06-08
- [x] **Phase 36: QA・UAT・検証ギャップ解消** (4/4 plans) — completed 2026-06-08

Full archive: `.planning/milestones/v1.8-ROADMAP.md`

</details>

---

## Phases — v1.9 (active)

**Milestone Goal:** ログイン済みユーザーが、見ているビューを1ボタンで自分の Substack Note に共有でき、「自慢」と Substack 内バイラル拡散を促進する。

- [ ] **Phase 37: 共有URLの状態保持（公開URL化）** - 各対象ビューがチームフィルタ等の状態を含む復元可能な公開URLを持つ
- [ ] **Phase 38: ワンボタン共有（クリップボード + Substack Notes 起動）** - 共有ボタンで定型文+URLをコピーしNotesを新規タブで開く
- [ ] **Phase 39: リンクプレビュー（OGメタタグ + 動的OG画像）** - 共有リンクに草/実績が見える動的OGプレビューを出力する

### Phase 37: 共有URLの状態保持（公開URL化）
**Goal**: 各対象ビュー（トップ Commit&Goal / `/daily` / 個人カレンダー `/member/[id]` / チーム選択中ビュー）が、現在の表示状態（チームフィルタ等）をURLに反映し、そのURLから同じ表示を復元できる。共有テキストが指す先が「今見ている画面」と一致する土台を作る。
**Depends on**: Phase 36（v1.8 完了, 既存トップ/`/daily`/`/member/[id]`/チームタブ）
**Requirements**: URL-01
**Success Criteria** (what must be TRUE):
  1. トップ Commit&Goal でチームタブを切り替えるとURLにそのチーム状態が反映される（リロード・別タブで貼り直しても同じチームが選択された状態で開く）
  2. `/daily` と 個人カレンダー `/member/[id]` が、状態を含む公開URLで誰でも（未ログインでも）同じ表示にアクセスできる
  3. 対象4ビューすべてについて「現在表示中の状態を表す正規の公開URL」を1関数/規約で取得でき、Phase 38 の共有ボタンが参照できる
**Plans**: 1 plan
- [ ] 37-01-PLAN.md — 個人カレンダーを ?ym= 駆動URL化 + buildShareUrl 規約ヘルパ（top/daily は ?team= 既存確認）
**UI hint**: yes

### Phase 38: ワンボタン共有（クリップボード + Substack Notes 起動）
**Goal**: ログイン済みユーザーが対象ビューの共有ボタンを押すと、定型文+ハッシュタグ+公開URLがクリップボードにコピーされ、Substack Notes コンポーザーが新規タブで開き、「貼り付けて投稿してください」のフィードバックが表示される。共有文は編集しやすい定数で一元管理する。
**Depends on**: Phase 37（共有先の公開URLを参照するため）
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06
**Success Criteria** (what must be TRUE):
  1. 対象4ビューに再利用可能な `<ShareButton>` が表示され、配置を1行差し替えで移動できる（SHARE-01）
  2. 共有ボタンを押すと、定型文+ハッシュタグ+対象ビューの公開URLがクリップボードにコピーされ、続けて `https://substack.com/notes` が新規タブで開く（SHARE-02/03）
  3. コピー完了とともに「貼り付けて投稿してください」を伝える toast 等のフィードバックが表示される（SHARE-04）
  4. 共有テキストの定型文・ハッシュタグが `lib/share.ts` 等の定数として一元管理され、文面変更がそこ1か所で完結する（SHARE-05）
  5. 共有ボタンは既定でログイン済みユーザーのみ表示され、全員表示へはフラグ1か所の変更で切り替えられる（SHARE-06）
**Plans**: TBD
**UI hint**: yes

### Phase 39: リンクプレビュー（OGメタタグ + 動的OG画像）
**Goal**: 共有された公開URLを Substack Notes / SNS に貼ると、その人の草・実績が見えるリッチなリンクプレビューが表示される。OGメタタグと Next.js `ImageResponse` による動的OG画像を出力する。
**Depends on**: Phase 37（プレビュー対象となる公開URL）。Phase 38 と並行可だが、共有体験の総仕上げとして最後に置く。
**Requirements**: OGP-01, OGP-02
**Success Criteria** (what must be TRUE):
  1. 共有対象ルートに `og:title` / `og:description` / `og:image` / Twitter Card が出力され、リンクデバッガ等でプレビューカードが正しく認識される（OGP-01）
  2. 共有対象ルートに、対象メンバー/ビューの草・実績が見える動的OG画像が Next.js `ImageResponse`（`opengraph-image`）で生成され、`og:image` として配信される（OGP-02）
  3. 個人ビュー `/member/[id]` を共有したとき、そのメンバー固有の内容を反映したOG画像がプレビューに表示される
**Plans**: TBD
**UI hint**: yes

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
| 28. コミットスケジュール — DB + /my ページ | v1.7 | 2/2 | Complete | 2026-06-03 |
| 29. Commit & Goal View — 新トップページ | v1.7 | 2/2 | Complete | 2026-06-04 |
| 30. アチーブメント（👑 / 🔥） | v1.7 | 2/2 | Complete    | 2026-06-04 |
| 31. ログインフロー修正 | v1.7 | 4/4 | Complete | 2026-06-06 |
| 32. 本番DBマイグレーション | v1.8 | 1/1 | Complete    | 2026-06-07 |
| 33. バグ修正 + commitSlots upsert化 | v1.8 | 5/5 | Complete    | 2026-06-08 |
| 34. UI Polish バッチ | v1.8 | 5/5 | Complete    | 2026-06-08 |
| 35. チーム可視性拡張 + Google Analytics | v1.8 | 3/3 | Complete    | 2026-06-08 |
| 36. QA・UAT・検証ギャップ解消 | v1.8 | 4/4 | Complete    | 2026-06-08 |
| 37. 共有URLの状態保持（公開URL化） | v1.9 | 0/0 | Not started | - |
| 38. ワンボタン共有（クリップボード + Substack Notes 起動） | v1.9 | 0/0 | Not started | - |
| 39. リンクプレビュー（OGメタタグ + 動的OG画像） | v1.9 | 0/0 | Not started | - |
