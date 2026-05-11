---
status: complete
phase: 08-substack-icon-responsive
source: [08-01-SUMMARY.md]
started: 2026-05-11T01:00:00Z
updated: 2026-05-11T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. トップビュー — Substackアイコン表示
expected: トップページ（`/`）のヒートマップで、各メンバー行の左端にSubstackアイコン（丸形）が表示される。アイコンがないメンバーの場合はグレーの円形プレースホルダーが表示される。
result: pass
note: "アイコンサイズをw-10 h-10（40px）に修正済み"

### 2. トップビュー — レスポンシブ（スマホ幅）
expected: ブラウザ幅を640px未満に縮小すると、メンバー名が非表示になりアイコンのみが表示される。ヒートマップのグリッド列と日付ヘッダーがズレていない。
result: pass

### 3. トップビュー — レスポンシブ（PC幅）
expected: ブラウザ幅を640px以上にすると、アイコンとメンバー名の両方が横並びで表示される。
result: pass

### 4. メンバーカレンダーページ — アイコン表示
expected: 任意のメンバー詳細ページ（`/member/{substackId}`）のヘッダー部分に、Substackアイコン（丸形・大きめ）とメンバー名が横並びで表示される。
result: pass

### 5. フォールバック — 画面崩れなし
expected: アイコンが取得できないメンバーでも画面が崩れない。グレーの円形プレースホルダーが同サイズで表示され、レイアウトが他のメンバーと揃っている。
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
