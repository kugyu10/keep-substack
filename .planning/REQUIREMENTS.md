# Requirements: Keep Substack v1.1

**Milestone:** v1.1 — Dynamic Members + Weekly View
**Status:** Active
**Created:** 2026-05-09

---

## v1.1 Requirements

### KV — データ層（Upstash Redis移行）

- [ ] **KV-01**: Member データを Upstash Redis で管理できる（`{name, substackId, teamId, addedAt}`）— feedUrl は `https://{substackId}.substack.com/feed` で動的生成
- [ ] **KV-02**: アプリ起動時、members.json の既存データを KV にシードできる移行スクリプトがある

### ADM — 管理画面

- [ ] **ADM-01**: `/admin` でメンバーを追加できる（name + substackId + teamId）
- [ ] **ADM-02**: `/admin` でメンバーを削除できる
- [ ] **ADM-03**: `/admin` は Basic 認証（ENV パスワード）で保護されている

### HEAT — WeeklyHeatmap

- [ ] **HEAT-01**: トップページに直近7日間 × 全メンバーのヒートマップを表示できる
- [ ] **HEAT-02**: ヒートマップ左端列にメンバー名を表示し、クリックで `/member/{substackId}` へ遷移できる
- [ ] **HEAT-03**: ヒートマップは 7日間投稿量降順・同数の場合は addedAt 昇順でソートされる
- [ ] **HEAT-04**: team-id でヒートマップ行をフィルタリングできる（URL param `?team=teamId`）

### TIP — リッチ Tooltip

- [ ] **TIP-01**: ヒートマップの記事ありセルに Tooltip を表示できる（記事タイトル 20 文字・サムネイル）
- [ ] **TIP-02**: Tooltip クリックで記事ページへ遷移できる
- [ ] **TIP-03**: サムネイルは RSS `content:encoded` から取得し、未取得時はフォールバック（プレースホルダー）表示

### UX — レイアウト・デザイン

- [ ] **UX-01**: ビジュアル・レイアウトを 50 人規模対応にリファクタリングする

---

## Future Requirements

- 連続投稿日数（ストリーク）を表示する
- 月間投稿数サマリーを表示する
- 年間ヒートマップ（GitHub草型）で長期活動を可視化する

---

## Out of Scope (v1.1)

- feedUrl の手動入力 — `https://{substackId}.substack.com/feed` で固定生成するため不要
- OGP スクレイピングによるサムネイル取得 — RSS `content:encoded` で代替（350 req/ISR サイクルを回避）
- API Routes — Server Actions + `revalidateTag` で代替（YAGNI）
- ドラッグ＆ドロップによる並び替え — ソートは投稿量・addedAt の自動順で十分

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| KV-01 | Phase 4 | TBD |
| KV-02 | Phase 4 | TBD |
| ADM-01 | Phase 6 | TBD |
| ADM-02 | Phase 6 | TBD |
| ADM-03 | Phase 6 | TBD |
| HEAT-01 | Phase 5 | TBD |
| HEAT-02 | Phase 5 | TBD |
| HEAT-03 | Phase 5 | TBD |
| HEAT-04 | Phase 6 | TBD |
| TIP-01 | Phase 5 | TBD |
| TIP-02 | Phase 5 | TBD |
| TIP-03 | Phase 5 | TBD |
| UX-01 | Phase 5 | TBD |
