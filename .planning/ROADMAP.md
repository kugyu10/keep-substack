# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- ✅ **v1.2 UX Polish + Member Edit** — Phases 7-9 (shipped 2026-05-11)
- 📋 **v1.3 Data Persistence + Multi-Team** — Phases 10-11 (planning)

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

## v1.3 Phase Details

### Phase 10: Cron + KV記事永続化
**Goal:** Vercel Cronによる1日1回のRSS取得とKV累積保存で、過去記事が消えずカレンダー・ヒートマップに利用できる状態にする
**Depends on:** Phase 9 (v1.2完了済み)
**Requirements:** PERSIST-01, PERSIST-02, PERSIST-03
**Success Criteria** (what must be TRUE):
  1. Vercel Cronが1日1回実行され、全メンバーのRSSフィードをKVに累積保存する（既存記事を上書きせず追記できる）
  2. 管理画面でメンバーを新規登録した直後に、そのメンバーの過去記事がKVに保存されている
  3. トップページのヒートマップがリアルタイムRSS取得ではなくKV保存済みデータを参照して表示される
  4. メンバー詳細カレンダーページがKV保存済みデータを参照して過去記事を表示できる
**Plans:** 1 plan
Plans:
- [ ] 10-01-PLAN.md — kvArticles新設・fetchFeed KV移行・Cronエンドポイント・addMemberAction初回取得
**UI hint**: yes

### Phase 11: チーム多対多所属
**Goal:** 1人のメンバーが複数チームに所属でき、管理画面で設定・チームフィルターで正しく絞り込める状態にする
**Depends on:** Phase 10
**Requirements:** TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. KVに保存されるメンバーデータが `teamNames: string[]` 形式で複数チームを持てる（既存 `teamName: string` からの後方互換移行を含む）
  2. 管理画面のメンバー編集フォームでチームをカンマ区切りテキストで入力・保存でき、複数チームが正しく反映される
  3. チームタブで「チームA」を選択したとき、チームAに所属するメンバー（単一・複数所属問わず）が全員表示される
**Plans:** 1 plan
Plans:
- [ ] 11-01-PLAN.md — types/KV後方互換/page/AdminUI/actions/memberページ 全7ファイル変更
**UI hint**: yes

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
| 10. Cron + KV記事永続化 | v1.3 | 0/1 | In Progress | - |
| 11. チーム多対多所属 | v1.3 | 0/1 | Pending | - |

### Phase 12: chameleon-hidden-team

**Goal:** シークレットチーム "chameleon" を定義し、所属メンバーを All ビューおよびチームタブから非表示にする
**Depends on:** Phase 11
**Plans:** 1 plan
**UI hint**: yes

Plans:
- [ ] 12-01-PLAN.md — HIDDEN_TEAM 定数追加・teams フィルター・All ビュー filteredMembers フィルター

### Phase 12.1: rss-isr-hybrid (INSERTED)

**Goal:** RSS ISR復活 + KVのハイブリッドアーキテクチャ — 投稿後5分以内に反映されるよう、ISR（revalidate=300）でRSS直接フェッチとKV過去記事をマージして表示する
**Depends on:** Phase 11
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 12.1 to break down)
