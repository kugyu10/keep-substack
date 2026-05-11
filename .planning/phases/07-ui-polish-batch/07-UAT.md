---
status: complete
phase: 07-ui-polish-batch
source: [07-01-SUMMARY.md]
started: 2026-05-11T00:20:00Z
updated: 2026-05-11T00:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tooltip — サムネイル画像クリックで記事遷移
expected: ヒートマップのセルをホバーするとTooltipが表示される。Tooltip内のサムネイル画像部分をクリックすると、記事ページ（Substack）に遷移する。
result: pass

### 2. Tooltip — 記事間スペース
expected: Tooltipに複数記事が表示された場合、記事と記事の間に以前より広いスペース（mb-3）がある。記事が詰まって見えない。
result: pass

### 3. メンバー詳細ページ — 戻りリンクラベル
expected: `/member/{substackId}` ページを開くと、「← メンバー一覧」という戻りリンクが左上に表示される（旧ラベル「← ダッシュボードに戻る」ではない）。
result: pass

### 4. メンバー詳細ページ — teamId条件分岐URL
expected: チーム所属のメンバー詳細ページで「← メンバー一覧」をクリックすると `/?team=xxx` に遷移する。チーム未所属メンバーの場合は `/` に戻る。
result: pass

### 5. 全ページ共通フッター
expected: トップページ（`/`）とメンバー詳細ページ（`/member/{substackId}`）の両方でページ下部に「コミュニティに参加する」リンクが表示される。クリックするとSubstackページが別タブで開く。
result: issue
reported: "文言を変えて　このSubstack継続可視化ツールに参加したい方は [コチラ](リンク)"
severity: minor

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "フッターのテキストが「このSubstack継続可視化ツールに参加したい方は コチラ」の形式で表示される"
  status: failed
  reason: "User reported: 文言を変えて　このSubstack継続可視化ツールに参加したい方は [コチラ](リンク)"
  severity: minor
  test: 5
  root_cause: "layout.tsxのフッターテキストが「コミュニティに参加する」のみで、要望の文言と異なる"
  artifacts:
    - path: "src/app/layout.tsx"
      issue: "フッターのリンクテキストを変更する必要がある"
  missing:
    - "「このSubstack継続可視化ツールに参加したい方は」というテキストと「コチラ」リンクの組み合わせに変更"
