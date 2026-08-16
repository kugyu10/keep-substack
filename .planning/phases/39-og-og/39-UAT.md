---
status: complete
phase: 39-og-og
source: [39-01-SUMMARY.md]
started: 2026-06-16T09:47:24Z
updated: 2026-06-17T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[all tests complete — 6/6 pass, 0 issues]

## Tests

### 1. OG/Twitter メタタグの出力（top / daily / member）
expected: top・daily・member 各ページの <head> に og:title / og:description / og:image と twitter:card=summary_large_image が出力されている
result: pass

### 2. metadataBase が本番ドメインで絶対URL化
expected: og:image / canonical の URL が https://keep-substack.com 始まりの絶対URLになっている（旧 vercel.app ではない）
result: pass

### 3. メンバー動的OG画像の描画（/api/og 再検証）
expected: /api/og?view=member&publicationId=<id> を開くと 1200x630 の PNG で、メンバーOG画像（草/記事数/ハンドル等）が表示される
result: pass
note: 当初 blocker（本番URL撮影→networkidle timeout→FATAL OOM でdevクラッシュ）。debug session api-og-timeout-oom で根本原因（Turbopack dev リーク）を特定・修正（dev を webpack 化 + predev kill + NEXT_PUBLIC_SITE_URL=localhost）。さらに CalendarGrid 下半分クリップを scale(0.58) で解消。ユーザー再検証で表示・クラッシュなし・全週収容を確認。commit 54a3ba7

### 4. サイト共通デフォルトOG画像（top/daily, /api/og 再検証）
expected: /api/og?view=goal および /api/og?view=daily を開くと 1200x630 の PNG ブランドカードが表示される
result: pass
note: daily は丸サイズを member に揃える scale(0.67) を適用（人数次第の下端見切れは許容＝ユーザー方針）。goal は無調整で全6行表示。3ビューともクラッシュなしをユーザー確認。commit 54a3ba7

### 5. リンクデバッガでの summary_large_image 認識
expected: 本番/プレビューURLを X(Twitter) Card Validator や Facebook Sharing Debugger に貼ると、大判カード(summary_large_image)としてOG画像が認識・プレビュー表示される
result: pass
note: v1.9（PR #9）+ 本番OGスクショ修復（PR #10, commit 334b218）デプロイ後にユーザーがリンクデバッガで再検証。summary_large_image として大判カードのOG画像が認識・プレビュー表示されることを確認。

### 6. 日本語ラベル描画可否（best-effort）
expected: メンバーOG画像の日本語 name は best-effort（描画されなくてもレイアウトが崩れない）。英字/数値/草は確実に表示される
result: pass
note: og-view layout が Noto Sans JP を next/font で読み込み。debug session の PNG 目視 + ユーザー確認で 3ビューとも JP グリフ正常・レイアウト崩れなし。

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "/member/[publicationId]/opengraph-image を開くと 1200x630 の PNG（草・記事数・ハンドル）が描画される"
  status: not_a_bug
  reason: "User reported: 404"
  severity: major
  test: 3
  root_cause: "Phase 39 の opengraph-image.tsx は v1.9（コミット e697e03）でスクショ方式へ刷新時に削除済み。現行OGは /api/og?view=member&publicationId=<id> 経由。404は仕様どおりで実バグではない。UATテストケースが古い仕様に基づいていた"
  artifacts:
    - path: "src/app/(main)/member/[publicationId]/opengraph-image.tsx"
      issue: "e697e03 で削除済み（存在しない）"
    - path: "src/app/api/og/route.tsx"
      issue: "現行のOG実装（スクショ方式）"
  missing:
    - "コード修正不要。UATテストを /api/og?view=... に差し替えて再検証"
  debug_session: .planning/debug/og-image-404.md
- truth: "/api/og?view=member&publicationId=<id> が 1200x630 PNG のメンバーOG画像を返す（ローカル/本番）"
  status: resolved
  reason: "ローカル /api/og がスクショ対象を本番 https://keep-substack.com/og-view/... に解決→networkidle 25s timeout→fallback→FATAL OOM (heap ~15GB) でdevサーバークラッシュ"
  severity: blocker
  test: 3
  root_cause: "真因は Next.js 16.2.6 Turbopack dev サーバのメモリリーク（ルート配信後 RSS 無限増加→~15GB OOM）。/api/og・screenshot・origin解決はトリガではない。付随して NEXT_PUBLIC_SITE_URL 未設定でローカルが本番ドメインを撮影していた独立の軽微問題も特定"
  artifacts:
    - path: "package.json"
      issue: "dev を webpack 化 + predev で stale next dev を kill + --max-old-space-size=4096"
    - path: ".env.local"
      issue: "NEXT_PUBLIC_SITE_URL=http://localhost:3000（撮影対象をローカルへ、gitignore）"
    - path: "src/app/og-view/[view]/page.tsx"
      issue: "member scale(0.58) / daily scale(0.67) でフレーム内収容・丸径統一"
  missing: []
  debug_session: .planning/debug/resolved/api-og-timeout-oom.md
- truth: "/opengraph-image を開くとサイト共通デフォルトのブランドカード（Keep Substack + 草装飾）が描画される"
  status: not_a_bug
  reason: "User reported: 404"
  severity: major
  test: 4
  root_cause: "同上。src/app/opengraph-image.tsx も e697e03 で削除済み。現行は /api/og?view=goal 等。404は仕様どおり"
  artifacts:
    - path: "src/app/opengraph-image.tsx"
      issue: "e697e03 で削除済み（存在しない）"
  missing:
    - "コード修正不要。UATテストを /api/og?view=... に差し替えて再検証"
  debug_session: .planning/debug/og-image-404.md
