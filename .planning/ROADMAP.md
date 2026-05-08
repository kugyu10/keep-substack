# Roadmap: Keep Substack

## Overview

SubstackコミュニティメンバーのRSSフィードをサーバーサイドで取得・解析するデータ基盤を構築し、月別カレンダーUIでの記事公開日可視化、そしてメンバー全員を俯瞰するダッシュボードへと段階的に進む。3フェーズでMVPを完成させ、Vercelにデプロイして運用開始する。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: プロジェクト基盤とデータ層** - Next.jsプロジェクト初期化、JSON設定ファイル、RSSフィード取得・解析、ISR設定、Vercelデプロイ
- [ ] **Phase 2: カレンダーUI** - 月別カレンダーグリッド、記事公開日ハイライト、ホバーツールチップ、月ナビゲーション
- [ ] **Phase 3: ダッシュボードとUX仕上げ** - メンバー一覧ダッシュボード、個人詳細ビュー、レスポンシブデザイン

## Phase Details

### Phase 1: プロジェクト基盤とデータ層
**Goal**: RSSフィードからメンバーの記事データを取得・解析し、ISRでキャッシュされたページとしてVercelで配信できる状態にする
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DEP-01
**Success Criteria** (what must be TRUE):
  1. JSON設定ファイルにメンバー名とフィードURLを追加すると、そのメンバーのフィードが取得対象になる
  2. ページにアクセスすると、各メンバーの記事タイトルと公開日がサーバーサイドで取得・表示される
  3. 一部のフィード取得が失敗しても、他のメンバーのデータは正常に表示される
  4. Vercelにデプロイされ、公開URLでアクセスできる
  5. ISRにより、revalidate間隔で自動的にデータが更新される
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Next.jsプロジェクト初期化 + メンバー設定JSON + RSS取得ロジック（D-01〜D-04, D-06）
- [ ] 01-02-PLAN.md — ISR設定 + 最小表示ページ + Vercelデプロイ（D-05, D-07）

### Phase 2: カレンダーUI
**Goal**: メンバーの記事公開日を月別カレンダーグリッドで視覚的に確認でき、記事の詳細にもアクセスできる
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04
**Success Criteria** (what must be TRUE):
  1. 月別カレンダーグリッドに記事公開日が色付きセルで表示される
  2. 色付きセルにホバーすると記事タイトルと元記事へのリンクが表示される
  3. 前月/次月ボタンで過去の活動月に遷移できる
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: ダッシュボードとUX仕上げ
**Goal**: メンバー全員の活動を一覧で俯瞰でき、個人の詳細も確認でき、モバイルでも快適に使える
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. ダッシュボードで全メンバーのミニカレンダーが一覧表示される
  2. メンバーをクリックすると個人詳細ビューに切り替わり、そのメンバーのカレンダーが大きく表示される
  3. スマートフォンでもカレンダーとダッシュボードが見やすく表示される
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. プロジェクト基盤とデータ層 | 1/2 | In progress | - |
| 2. カレンダーUI | 0/2 | Not started | - |
| 3. ダッシュボードとUX仕上げ | 0/2 | Not started | - |
