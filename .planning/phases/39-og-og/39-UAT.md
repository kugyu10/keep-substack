---
status: complete
phase: 39-og-og
source: [39-01-SUMMARY.md]
started: 2026-06-16T09:47:24Z
updated: 2026-06-16T09:52:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. OG/Twitter メタタグの出力（top / daily / member）
expected: top・daily・member 各ページの <head> に og:title / og:description / og:image と twitter:card=summary_large_image が出力されている
result: pass

### 2. metadataBase が本番ドメインで絶対URL化
expected: og:image / canonical の URL が https://keep-substack.com 始まりの絶対URLになっている（旧 vercel.app ではない）
result: pass

### 3. メンバー動的OG画像の描画
expected: /member/[publicationId]/opengraph-image を開くと 1200x630 の PNG で、草ストリップ（12週×7日, 濃淡あり）・記事数・@handle・"Keep Substack"・#FF6719 ブランドカラーが見える
result: issue
reported: "404"
severity: major

### 4. サイト共通デフォルトOG画像（top/daily）
expected: /opengraph-image を開くと "Keep Substack" + 英字タグライン + 草装飾のブランドカードが 1200x630 で表示される
result: issue
reported: "404"
severity: major

### 5. リンクデバッガでの summary_large_image 認識
expected: 本番/プレビューURLを X(Twitter) Card Validator や Facebook Sharing Debugger に貼ると、大判カード(summary_large_image)としてOG画像が認識・プレビュー表示される
result: skipped
reason: OG画像ルートが404（テスト3・4）のため検証不可。OG画像修正後に再検証する

### 6. 日本語ラベル描画可否（best-effort）
expected: メンバーOG画像の日本語 name は best-effort（描画されなくてもレイアウトが崩れない）。英字/数値/草は確実に表示される
result: skipped
reason: OG画像ルートが404（テスト3・4）のため検証不可。OG画像修正後に再検証する

## Summary

total: 6
passed: 2
issues: 2
pending: 0
skipped: 2
blocked: 0

## Gaps

- truth: "/member/[publicationId]/opengraph-image を開くと 1200x630 の PNG（草・記事数・ハンドル）が描画される"
  status: failed
  reason: "User reported: 404"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "/opengraph-image を開くとサイト共通デフォルトのブランドカード（Keep Substack + 草装飾）が描画される"
  status: failed
  reason: "User reported: 404"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
