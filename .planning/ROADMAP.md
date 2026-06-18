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
- ✅ **v1.9 ワンボタン Substack Note 共有** — Phases 37-39 (shipped 2026-06-17)
- 🚧 **v1.10 Substack Notes PoC** — Phases 40-42 (in progress)

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

<details>
<summary>✅ v1.9 ワンボタン Substack Note 共有 (Phases 37-39) — SHIPPED 2026-06-17</summary>

**Milestone Goal:** ログイン済みユーザーが、見ているビューを1ボタンで自分の Substack Note に共有でき、「自慢」と Substack 内バイラル拡散を促進する。

- [x] **Phase 37: 共有URLの状態保持（公開URL化）** - `/member/[id]` を `?ym=` 駆動公開URL化 + `buildShareUrl` 規約ヘルパ（URL-01）— completed 2026-06-16
- [x] **Phase 38: ワンボタン共有（クリップボード + Substack Notes 起動）** - `<ShareButton>` ×4ビュー / コピー + Notes起動 + フィードバック / `lib/share.ts` 定数管理（SHARE-01..06）— completed 2026-06-14
- [x] **Phase 39: リンクプレビュー（OGメタタグ + 動的OG画像）** - summary_large_image OGメタ + next/og 動的画像（メンバー草/記事数/ハンドル）（OGP-01..02）— completed 2026-06-14

Full archive: `.planning/milestones/v1.9-ROADMAP.md`

</details>

---

## 🚧 v1.10 Substack Notes PoC (Phases 40-42) — IN PROGRESS

**Milestone Goal:** Substack の Note 領域（コメント・投稿一覧）のデータ取得可否を PoC で検証し、コメント可視化と Note 一覧取得の2機能を試作する。フィージビリティ・ゲート型 PoC — Phase 40 で取得可否を実測し go/no-go を判定する。

- [ ] **Phase 40: 取得可否スパイク（go/no-go ゲート）** - 非公式エンドポイントから admin Note 一覧・特定 Note コメントを取得できるかを本番/preview Vercel から実測。取得可否レポート + 生 JSON サンプル + 採用エンドポイント表を成果物とする捨てスパイク。取得不可の負の結果も有効なクローズ（SPIKE-01, SPIKE-02）
- [x] **Phase 41: 機能2 Note一覧（永続化なし）** - `/admin/notes` の Server Component で admin の Note 一覧を都度 fetch し表示（本文プレビュー + 投稿日時 JST、永続化なし、失敗/0件状態表示）（NOTE-01..03） (completed 2026-06-18)
- [ ] **Phase 42: 機能1 コメント可視化（キャッシュ基盤 + 永続化）** - Note URL/ID 入力フォーム → コメント件数/本文/名前/アイコンを表示し、`note_comments` テーブルに Supabase キャッシュ（鮮度判定 + 手動 force 再取得、失敗/0件/キャッシュ無の状態表示）（COMMENT-01..06）

### Phase 40: 取得可否スパイク（go/no-go ゲート）
**Goal**: 非公式 Substack エンドポイントで「(a)admin の Note 一覧 (b)特定 Note のコメント が、本番/preview Vercel から正当な手段で取得できるか・どう取れるか」を実測し、go/no-go を判定する。動く UI ではなく検証成果物を出す捨てスパイク。
**Depends on**: Phase 39 (v1.9 完了)
**Requirements**: SPIKE-01, SPIKE-02
**Success Criteria** (what must be TRUE):
  1. 開発者は、admin Note 一覧 / 特定 Note コメントそれぞれについて、認証要否・**本番（または preview）Vercel からの到達性**・レスポンス JSON の実フィールド名（コメント本文・コメント者名・アバター URL・各種カウント）を記載した取得可否レポートを参照できる
  2. 開発者は、実取得した生 JSON サンプルと採用エンドポイント表（URL・必要ヘッダー・cookie 要否）を成果物として参照できる
  3. レポートに go（取得可・後続フェーズへ）/ no-go（取得不可）の明確な判断が記録されている
  4. no-go の場合でも、不可の理由と試した手段が文書化され、PoC が**有効な成果としてクローズ**できる（負の結果が失敗ではなく正当な完了として扱われる）
**Plans**: TBD

### Phase 41: 機能2 Note一覧（永続化なし）
**Goal**: go 判定後、admin（開発者本人）が投稿した Substack Note の一覧を、DB を経由せずサーバー側で都度取得して画面に表示できる。
**Depends on**: Phase 40 (go 判定)
**Requirements**: NOTE-01, NOTE-02, NOTE-03
**Success Criteria** (what must be TRUE):
  1. admin は `/admin/notes` で自分が投稿した Note の一覧を取得・表示できる（毎回サーバー側 fetch・永続化なし）
  2. 各 Note に本文プレビューと投稿日時（JST）が表示される
  3. 取得失敗・0件の状態が画面に明示される
**Plans**: 1 plan
- [x] 41-01-PLAN.md — 取得層 lib/notes.ts（fetchAdminNotes/parseNoteFeed・判別ユニオン）+ /admin/notes RSC ページ + env 設定
**UI hint**: yes

### Phase 42: 機能1 コメント可視化（キャッシュ基盤 + 永続化）
**Goal**: ユーザーが Note の URL/ID を指定すると、その Note のコメント件数・本文一覧・コメント者の名前/アイコンが表示され、取得結果が Supabase にキャッシュされて再取得を避けられる。
**Depends on**: Phase 40 (go 判定), Phase 41 (取得層 `lib/notes.ts` の安定化)
**Requirements**: COMMENT-01, COMMENT-02, COMMENT-03, COMMENT-04, COMMENT-05, COMMENT-06
**Success Criteria** (what must be TRUE):
  1. ユーザーは Note の URL/ID を入力フォームで指定でき（寛容なパース）、指定 Note のコメント件数が表示される
  2. コメント本文の一覧（フラット）が、各コメント者の名前とアイコン付きで表示される（アイコン取得不可時はイニシャル/プレースホルダにフォールバック）
  3. 取得したコメントが `note_comments` テーブルに Supabase キャッシュ保存され、`fetched_at` 鮮度判定で再取得が回避され、手動 force 再取得もできる
  4. 取得失敗・0件・キャッシュ無の状態が画面に明示される
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
| 37. 共有URLの状態保持（公開URL化） | v1.9 | 1/1 | Complete | 2026-06-16 |
| 38. ワンボタン共有（クリップボード + Substack Notes 起動） | v1.9 | 1/1 | Complete | 2026-06-14 |
| 39. リンクプレビュー（OGメタタグ + 動的OG画像） | v1.9 | 1/1 | Complete | 2026-06-14 |
| 40. 取得可否スパイク（go/no-go ゲート） | v1.10 | 0/0 | Not started | - |
| 41. 機能2 Note一覧（永続化なし） | v1.10 | 1/1 | Complete   | 2026-06-18 |
| 42. 機能1 コメント可視化（キャッシュ基盤 + 永続化） | v1.10 | 0/0 | Not started | - |
