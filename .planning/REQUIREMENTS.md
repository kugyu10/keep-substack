# Requirements: Keep Substack

**Defined:** 2026-06-02
**Milestone:** v1.7 Commit & Goal View + Substack Profile Link
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること

## v1.7 Requirements

### Profile & Identity (PROF)

- [x] **PROF-01**: User can register and update Substack @handle from /my page
- [x] **PROF-02**: User can click name/icon on personal monthly view to open `https://substack.com/@{handle}` in a new tab
- [x] **PROF-03**: Login URL accepts `?handle=hoge` query param; after Magic Link login, /my page pre-fills the @handle input with that value

### Commit Schedule (SCHED)

- [ ] **SCHED-01**: User can set weekly commit frequency (1, 2, 3, or 4 times) from /my page
- [ ] **SCHED-02**: User can set day-of-week and hour (00–23, minutes fixed at :00) for each commit slot
- [ ] **SCHED-03**: Commit schedule is persisted in DB (`member_commit_slots` table: member_id, day_of_week, hour)

### Commit & Goal View (VIEW)

- [ ] **VIEW-01**: Current home page (weekly heatmap) is accessible at `/weekly-stamp`
- [ ] **VIEW-02**: New home page (`/`) displays Commit & Goal View with one row per member
- [ ] **VIEW-03**: Each row layout: `| avatar + name | Commit Grid | Achievement icons |`
- [ ] **VIEW-04**: Commit Grid spans 3 weeks horizontally (left = oldest, right = current week); total width is the same for 1–4 weekly commits (cell width scales inversely with frequency)
- [ ] **VIEW-05**: Posted committed-day cells show the article thumbnail; unposted committed-day cells show the day name
- [ ] **VIEW-06**: Members with no commit setup show a grey `| 未コミット |` cell in the Grid column
- [ ] **VIEW-07**: On narrow mobile viewports, Grid collapses to 1-week display

### Achievements (ACHIEV)

- [x] **ACHIEV-01**: 👑 icon is shown when all commit slots for the current week have at least one article posted
- [x] **ACHIEV-02**: 🔥 icon is shown when the member has achieved full-slot completion in 2 or more consecutive weeks

## Future Requirements

### Visualisation

- 月間投稿数サマリーを表示する
- 年間ヒートマップ（GitHub草型）で長期活動を可視化する

## Out of Scope

| Feature | Reason |
|---------|--------|
| コミット未達成の通知・リマインダー | スコープ外。ゆるいコミュニティの空気を壊す |
| コミットスケジュールの公開/非公開設定 | v1.7はシンプルに全員表示。将来検討 |
| 複数Substack対応 UI (member_publications) | スキーマ基盤はv1.6実装済み。UIはYAGNI |
| 達成バッジのレアリティ段階 | v1.7はシンプルに👑と🔥のみ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | Phase 27 | Complete |
| PROF-02 | Phase 27 | Complete |
| PROF-03 | Phase 27 | Complete |
| SCHED-01 | Phase 28 | Pending |
| SCHED-02 | Phase 28 | Pending |
| SCHED-03 | Phase 28 | Pending |
| VIEW-01 | Phase 29 | Pending |
| VIEW-02 | Phase 29 | Pending |
| VIEW-03 | Phase 29 | Pending |
| VIEW-04 | Phase 29 | Pending |
| VIEW-05 | Phase 29 | Pending |
| VIEW-06 | Phase 29 | Pending |
| VIEW-07 | Phase 29 | Pending |
| ACHIEV-01 | Phase 30 | Complete |
| ACHIEV-02 | Phase 30 | Complete |

**Coverage:**
- v1.7 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-02 after initial definition*
