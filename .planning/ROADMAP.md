# Roadmap: Keep Substack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-05-08)
- ✅ **v1.1 Dynamic Members + Weekly View** — Phases 4-6 (shipped 2026-05-10)
- 📋 **v1.2 UX Polish + Member Edit** — Phases 7-9 (planning)

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

## v1.2 Phase Details

### Phase 7: UI小改善バッチ（Tooltip・ナビ・フッター）

**Goal:** フロントエンドのみで完結する小さなUX改善を一括適用する

**Requirements:** TOOLTIP-01, TOOLTIP-02, NAV-01, NAV-02, FOOTER-01

**Success Criteria:**
1. Tooltipの記事画像をクリックすると記事ページに遷移する
2. Tooltip内で複数記事が表示された場合、記事間に明確なスペースがある
3. メンバー詳細ページの戻りリンクに「メンバー一覧」と表示される
4. チーム所属メンバーの戻りリンクが `/?team=xxx` に遷移する
5. トップページ・メンバーページのフッターに参加案内リンクが表示される

**Plans:** 1 plan

Plans:
- [x] 07-01-PLAN.md — Tooltip・ナビ・フッターのUX改善3ファイル一括適用

---

### Phase 8: Substackアイコン + レスポンシブ対応

**Goal:** channel.image.urlからSubstackアイコンを取得してUIに表示し、スマホ対応を追加する

**Requirements:** ICON-01, ICON-02, ICON-03

**Success Criteria:**
1. トップビューの各メンバー行にSubstackアイコンが表示される
2. メンバーカレンダーページのヘッダーにSubstackアイコンが表示される
3. スマホ幅でトップビューを表示するとメンバー名が非表示でアイコンのみ表示される
4. PC幅でトップビューを表示するとアイコンと名前が両方表示される
5. アイコン取得失敗時も画面が壊れない（フォールバック対応）

**Plans:** — (not started)

---

### Phase 9: 管理画面メンバー編集

**Goal:** 既存メンバーのフィールドを管理画面から直接編集できるようにする

**Requirements:** ADMIN-01

**Success Criteria:**
1. 管理画面の各メンバー行に編集UIが表示される
2. name, substackId, addedAt, teamId を変更して保存できる
3. 保存後にメンバー一覧が最新データで更新される
4. 無効な値（空のname等）でバリデーションエラーが表示される

**Plans:** — (not started)

---

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
| 8. Substackアイコン + レスポンシブ対応 | v1.2 | 0/1 | Pending | — |
| 9. 管理画面メンバー編集 | v1.2 | 0/1 | Pending | — |
