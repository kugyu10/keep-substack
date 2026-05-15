# Requirements: Keep Substack v1.4

## Milestone: v1.4 UI/UX Refresh

**Goal:** モバイルファーストを軸に、ファーストビュー・ヒートマップ・ポップオーバーのUIを刷新してユーザー体験を向上させる

**Source:** GitHub issue #1 — https://github.com/kugyu10/keep-substack/issues/1

---

## Active Requirements

### LAYOUT — ファーストビュー・全体レイアウト

- [ ] **LAYOUT-01**: ヒーローバナーを削除/縮小し、開いた瞬間に継続データが目に入るようにする
- [ ] **LAYOUT-02**: モバイルファーストのレイアウトで、スマホ利用を主軸に置く

### LIST — ユーザーリスト・チームタブ

- [ ] **LIST-01**: アバター＋名前を1行にスッキリ収める（長い場合はellipsis対応）
- [ ] **LIST-02**: 個人ページへの遷移をシェブロン（>）で明示する
- [ ] **LIST-03**: 選択中のチームタブを背景色との対比で一目で分かるようにする

### HEATMAP — 継続可視化グリッド

- [ ] **HEATMAP-01**: Substackオレンジ（#FF6719系）の濃淡で投稿数を表現する
- [ ] **HEATMAP-02**: 投稿なしは点線丸、投稿ありはオレンジベタ塗り（複数投稿は数字表示）

### POPOVER — ポップオーバー（記事詳細）

- [ ] **POPOVER-01**: 縦並びレイアウトを廃止し、横並びリスト（サムネイル＋2行タイトル）に刷新する
- [ ] **POPOVER-02**: ダークモード化する（zinc-800背景、白テキスト、強い影）
- [ ] **POPOVER-03**: Click Outsideでポップオーバーを閉じられるようにする
- [ ] **POPOVER-04**: 右上に「×」ボタンを配置する

---

## Future Requirements (Deferred)

- 連続投稿日数（ストリーク）を表示する
- 月間投稿数サマリーを表示する
- 年間ヒートマップ（GitHub草型）で長期活動を可視化する
- Supabase移行（認証・DB・Cron永続化）

---

## Out of Scope

- ユーザー認証・ログイン機能 — 公開ページのため不要
- リアルタイム通知 — カレンダー確認で十分
- コメント・いいね機能 — Substack本体の機能と重複
- ダークモード切り替えトグル — ポップオーバーのみダーク化、全体切替は対象外
- 新規データ機能 — 本マイルストーンはUI/UX変更のみ

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| LAYOUT-01 | Phase 13 | Pending |
| LAYOUT-02 | Phase 13 | Pending |
| LIST-01 | Phase 14 | Pending |
| LIST-02 | Phase 14 | Pending |
| LIST-03 | Phase 14 | Pending |
| HEATMAP-01 | Phase 15 | Pending |
| HEATMAP-02 | Phase 15 | Pending |
| POPOVER-01 | Phase 16 | Pending |
| POPOVER-02 | Phase 16 | Pending |
| POPOVER-03 | Phase 16 | Pending |
| POPOVER-04 | Phase 16 | Pending |
