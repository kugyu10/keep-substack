---
phase: quick-260611-ebu
plan: 01
subsystem: app-router-layout
tags: [next-app-router, route-group, layout, ui-fix]
requirements: [UI-01, UI-02]
provides:
  - "(main) Route Group with Header/Footer-scoped layout"
  - "Header/Footer を持たない認証ページ (/login, /signin-51cf21389c56)"
affects:
  - src/app/layout.tsx
key-files:
  created:
    - "src/app/(main)/layout.tsx"
  moved:
    - "src/app/page.tsx -> src/app/(main)/page.tsx"
    - "src/app/__tests__ -> src/app/(main)/__tests__"
    - "src/app/admin -> src/app/(main)/admin"
    - "src/app/my -> src/app/(main)/my"
    - "src/app/member -> src/app/(main)/member"
    - "src/app/daily -> src/app/(main)/daily"
  modified:
    - "src/app/layout.tsx"
decisions:
  - "ページ系を (main) Route Group に集約し Header/Footer を (main)/layout.tsx に閉じ込め、root layout は html/body + GoogleAnalytics のみに整理"
metrics:
  duration: ~5min
  completed: 2026-06-11
  tasks: 2
  files: 27 (1 created + 1 modified + 25 moved)
---

# Quick Task 260611-ebu: (main) Route Group へページ移動でログイン画面のヘッダー/フッター除去 Summary

Next.js App Router の Route Group イディオムで、本番 `/login` と `/signin-51cf21389c56` に
サイト Header / Footer が表示されてしまうバグ (UI-01 / UI-02) を修正した。ページ系ルートを
`(main)/` に移動し Header/Footer を `(main)/layout.tsx` に閉じ込めることで、認証ページの
レイアウトをサイト本体から完全に分離した。URL は一切変わらず GoogleAnalytics も全ページ維持。

## 実施内容

### Task 1: (main) Route Group の新設とページ移動・layout 分離 (commit 74e2faa)
- `src/app/(main)/` を新設し、`page.tsx` / `__tests__` / `admin` / `my` / `member` / `daily`
  を `git mv` で丸ごと移動 (全 rename 100% 検出 = 履歴保持・相対 import の親子関係維持)。
- `src/app/(main)/layout.tsx` を新規作成。`@/components/Header` と `@/components/Footer` を
  import し `<><Header />{children}<Footer /></>` を返す (root の body 内側にネストされるため Fragment)。
- root `src/app/layout.tsx` を整理: Header/Footer の import 2 行と JSX 描画を削除し `{children}` のみ残置。
  `metadata` / `globals.css` / `GoogleAnalytics` (env ガード付き) はそのまま維持 (ANLT-01)。
- root に残したもの: `api/`, `auth/`, `(auth)/`, `globals.css`, `favicon.ico`, `layout.tsx`。
- `(auth)/layout.tsx` は無変更。

### Task 2: テストとビルドによる検証 (検証のみ・コード変更なし)
- `npm test`: 24 ファイル / 168 テスト全緑。移動した各 `__tests__/` の相対 import が
  ディレクトリ丸ごと移動で維持されていることを裏付け。
- `npm run build`: 成功。Route Group `(main)` / `(auth)` の URL 衝突なし、全ルートの import 解決成功。
  ビルド出力のルート一覧で URL 不変を確認 (`/`, `/admin`, `/admin/teams`, `/daily`, `/login`,
  `/member/[publicationId]`, `/my`, `/signin-51cf21389c56`)。

## Deviations from Plan

None - プラン通りに実行。import パス修正は不要だった (interfaces の grep 結果通り、
ディレクトリ丸ごと移動で相対 import と `@/` エイリアスは追従不要)。

## 検証結果

- `src/app/(main)/layout.tsx` に Header/Footer あり (grep 一致)。
- `src/app/(auth)/layout.tsx` に Header/Footer なし (無変更)。
- `src/app/layout.tsx` に GoogleAnalytics あり、Header/Footer の import・描画なし。
- `npm test` 168 全緑、`npm run build` 成功 (Route Group 衝突なし)。
- URL 不変: ビルドのルート一覧で Route Group 化前後の全パスが同一であることを確認。
- 既存の middleware `/login` リダイレクトや Link 参照は URL 不変のため変更不要。

## 注記

- `next build` の middleware deprecation 警告 (`Please use "proxy" instead`) は本タスク以前から
  存在する事象でスコープ外。ビルド自体は成功している。

## Self-Check: PASSED

- FOUND: src/app/(main)/layout.tsx
- FOUND: src/app/(main)/page.tsx
- MISSING (期待通り削除): src/app/page.tsx
- FOUND commit: 74e2faa
