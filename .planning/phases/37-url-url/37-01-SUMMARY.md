---
phase: 37
plan: 01
subsystem: 公開URL / 共有
tags: [url, share, calendar, searchparam, server-component]
requires:
  - src/lib/calendarUtils.ts (buildDayGrid)
  - src/components/HeatmapTooltip.tsx
provides:
  - src/lib/shareUrl.ts (buildShareUrl / parseYmParam / formatYmParam) — Phase 38 の共有ボタンが参照する正規URL取得規約
  - 個人カレンダーの ?ym=YYYY-MM URL駆動表示月
affects:
  - src/app/(main)/member/[publicationId]/page.tsx
  - src/components/CalendarGrid.tsx
tech-stack:
  added: []
  patterns:
    - searchParam 規約（?team= / ?ym=）で表示状態を公開URLに反映する Server Component パターン
    - 信頼できない searchParam 入力は parse 関数側でバリデーション＋フォールバック（T-37-01）
key-files:
  created:
    - src/lib/shareUrl.ts
    - src/lib/__tests__/shareUrl.test.ts
  modified:
    - src/app/(main)/member/[publicationId]/page.tsx
    - src/components/CalendarGrid.tsx
    - src/components/__tests__/CalendarGrid.test.tsx
decisions:
  - 月ナビ href は formatYmParam ベースで生成（KISS）。buildShareUrl は Phase 38 向けの正規URL取得規約として別途用意。
  - CalendarGrid は状態撤去後も HeatmapTooltip が client のため明示的な Server Component 化はせず、'use client' を外すだけの最小変更とした。
metrics:
  duration: 約8分
  completed: 2026-06-14
---

# Phase 37 Plan 01: 共有URLの状態保持（公開URL化）Summary

個人カレンダーの表示月を client `useState` から `?ym=YYYY-MM` searchParam 駆動へ移行し、対象4ビューの正規公開URLを取得する `buildShareUrl` ヘルパ（Phase 38 基盤）を `src/lib/shareUrl.ts` に新設した。

## What changed

### Task 1: shareUrl ヘルパ（TDD）
- `src/lib/shareUrl.ts` を新規作成し、`parseYmParam` / `formatYmParam` / `buildShareUrl` を export。
  - `parseYmParam(ym)`: `^(\d{4})-(\d{2})$` ＋ month 1〜12 検証を通過した値のみ採用、それ以外（未指定/域外/非数値/ゼロ詰めなし/パストラバーサル）は現在JST年月へフォールバック。JST換算は `Date.now() + 9h` の UTC 値で算出（`calendarUtils.isoToJSTDateKey` と同規約）。
  - `formatYmParam(year, month)`: `String(month).padStart(2,'0')` でゼロ詰め整形。
  - `buildShareUrl(view)`: discriminated union（goal/daily/member）。クエリ値・パスセグメントは `encodeURIComponent` でエンコード。
- `src/lib/__tests__/shareUrl.test.ts`: 22 ケース。RED（module not found）→ GREEN を確認。

### Task 2: 個人カレンダーの ym URL駆動化
- `member/[publicationId]/page.tsx`: `searchParams: Promise<{ ym?: string }>` を追加して await、`parseYmParam(ym)` で `{ year, month }` を算出し CalendarGrid に渡す。フォールバックは parseYmParam に委譲。
- `CalendarGrid.tsx`: `'use client'` と `useState`（year/month）/`prevMonth`/`nextMonth` の setState を撤去。Props に `year` / `month` / `publicationId` を追加。月送りボタンを `next/link` の `Link` に置換し、href は `formatYmParam` で前月/翌月の ym を生成（桁上げ込み: month===1→前年12月 / month===12→翌年1月）。
- `CalendarGrid.test.tsx`: 各呼び出しに `year:2026, month:6, publicationId:'test-pub'` を追加、不要になった `vi.mock('react')` useState モックを削除、`next/link` を素の `<a>` 相当へスタブ。3 it 全て pass。
- top `/` と `/daily` は既に `?team=` searchParam 反映済みのため変更なし（grep / build / test で回帰確認）。

## Verification

- `npm test`: 25 ファイル / 190 テスト全 pass（shareUrl 22 含む、既存無破壊）。
- `npm run build`: 成功（TypeScript エラーなし、`/member/[publicationId]` は ƒ Dynamic）。
- grep 検証: shareUrl 3 export / member page で parseYmParam 使用 / CalendarGrid に setMonth・setYear 0 件 / CalendarGrid に `ym=` href / `vi.mock('react')` 0 件。

## Deviations from Plan

None - plan executed exactly as written.

## Threat surface

- T-37-01（ym 不正値の Tampering）は `parseYmParam` の正規表現＋月域検証＋フォールバックで mitigate 済み（テストで網羅）。
- 新規パッケージ導入なし（`next/link` は既存）。新たな攻撃面の追加なし。

## Out of scope (確認)

- 共有ボタン UI（Phase 38）、OG メタタグ/動的OG画像（Phase 39）には一切手を付けていない。

## Self-Check: PASSED

- FOUND: src/lib/shareUrl.ts
- FOUND: src/lib/__tests__/shareUrl.test.ts
- FOUND commit 5816014 (test RED), b221b07 (feat shareUrl), f82d9d7 (feat member ym)
