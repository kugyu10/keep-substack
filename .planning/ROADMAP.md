# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- 🚧 **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) — SHIPPED 2026-05-08</summary>

- [x] Phase 1: プロジェクト基盤とデータ層 (2/2 plans) — completed 2026-05-08
- [x] Phase 2: カレンダーUI (2/2 plans) — completed 2026-05-08
- [x] Phase 3: ダッシュボードとUX仕上げ (2/2 plans) — completed 2026-05-08

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Dynamic Members + Weekly View (In Progress)

**Milestone Goal:** メンバー管理をUpstash Redisへ移行し、ブラウザから追加・削除できる管理画面と、50人規模対応の直近7日間ヒートマップを実装する。

- [ ] **Phase 4: KVデータ層移行** — Upstash Redisでメンバーデータを管理する基盤を確立する
- [ ] **Phase 5: WeeklyHeatmap + リッチTooltip** — トップページをヒートマップUIに刷新し、記事サムネイル付きTooltipを実装する
- [ ] **Phase 6: 管理画面 + チームフィルター** — Basic認証付き管理UIとteam-idフィルタリングを実装して運用可能な状態にする

## Phase Details

### Phase 4: KVデータ層移行
**Goal**: Upstash RedisでメンバーデータをCRUD管理できる基盤が整い、既存members.jsonのデータがKVに移行済みである
**Depends on**: Phase 3 (v1.0完了)
**Requirements**: KV-01, KV-02
**Success Criteria** (what must be TRUE):
  1. アプリが `@upstash/redis` 経由でメンバー一覧を取得でき、ページが正常にレンダリングされる
  2. 移行スクリプトを実行すると、members.jsonの全メンバーがUpstash KVに登録される
  3. KVから取得したメンバーデータに name, substackId, teamId, addedAt が含まれる
  4. feedUrl は substackId から動的生成され、コードベースにfeedUrlのハードコードが存在しない
**Plans**: 2 plans
Plans:
- [ ] 04-01-PLAN.md — KVデータ層基盤（依存インストール + types.ts更新 + redis.ts/kvMembers.ts新設）
- [ ] 04-02-PLAN.md — アプリ切り替えとシードスクリプト（fetchFeed.ts/page.tsx更新 + seed-kv.ts新設）

### Phase 5: WeeklyHeatmap + リッチTooltip
**Goal**: トップページが直近7日間 x 全メンバーのヒートマップに刷新され、記事ありセルにサムネイル付きTooltipが表示される
**Depends on**: Phase 4
**Requirements**: HEAT-01, HEAT-02, HEAT-03, TIP-01, TIP-02, TIP-03, UX-01
**Success Criteria** (what must be TRUE):
  1. トップページに直近7日間 x 全メンバーのグリッドが表示され、50人でもレイアウトが崩れない
  2. ヒートマップは7日間投稿量降順・同数はaddedAt昇順でソートされている
  3. 左端列のメンバー名をクリックすると `/member/{substackId}` に遷移できる
  4. 記事ありセルにホバーするとTooltip（タイトル20文字以内 + サムネイル）が表示される
  5. Tooltipをクリックすると該当記事ページへ遷移でき、サムネイルなしの場合はプレースホルダーが表示される
**Plans**: TBD
**UI hint**: yes

### Phase 6: 管理画面 + チームフィルター
**Goal**: Basic認証で保護された `/admin` でメンバーの追加・削除ができ、team-idでヒートマップを絞り込めるURLパラメータが機能する
**Depends on**: Phase 4
**Requirements**: ADM-01, ADM-02, ADM-03, HEAT-04
**Success Criteria** (what must be TRUE):
  1. `/admin` にアクセスするとBasic認証ダイアログが表示され、ENV設定のパスワード以外では入れない
  2. `/admin` でname + substackId + teamIdを入力してメンバーを追加できる
  3. `/admin` でメンバーを削除でき、削除後すぐにKVから消える
  4. `/?team=teamId` でアクセスするとそのteamに属するメンバーのみのヒートマップが表示される
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. プロジェクト基盤とデータ層 | v1.0 | 2/2 | Complete | 2026-05-08 |
| 2. カレンダーUI | v1.0 | 2/2 | Complete | 2026-05-08 |
| 3. ダッシュボードとUX仕上げ | v1.0 | 2/2 | Complete | 2026-05-08 |
| 4. KVデータ層移行 | v1.1 | 0/2 | Planned | - |
| 5. WeeklyHeatmap + リッチTooltip | v1.1 | 0/? | Not started | - |
| 6. 管理画面 + チームフィルター | v1.1 | 0/? | Not started | - |
