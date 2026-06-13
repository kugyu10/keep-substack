---
phase: 37
title: 共有URLの状態保持（公開URL化）
requirement: URL-01
discuss: skipped (workflow.skip_discuss=true)
---

# Phase 37 — 共有URLの状態保持（公開URL化）

## Spec (phase goal as spec)

対象4ビューが、現在の表示状態（特にチームフィルタ・カレンダー表示月）を反映し、
そのURLから同じ表示を未ログインでも復元できる「正規の公開URL」を持つ。
Phase 38（共有ボタン）と Phase 39（OGP）が消費する基盤。

route param は `publicationId`（`id` ではない）。

## 対象4ビューと現状（コードベース調査結果）

1. **トップ Commit&Goal** `src/app/(main)/page.tsx` + `src/components/CommitGoalView.tsx`
   - チームフィルタは既に `?team=` searchParam（Server Component）で URL 反映済み。✓
2. **`/daily`** `src/app/(main)/daily/page.tsx`
   - チームフィルタは既に `?team=` searchParam で URL 反映済み。✓
3. **個人カレンダー** `src/app/(main)/member/[publicationId]/page.tsx` + `src/components/CalendarGrid.tsx`
   - **GAP**: 表示月（year/month）が `CalendarGrid` 内の client `useState`。
     共有・リロード・別タブで貼り直すと「今月」に戻り、状態が復元できない。
4. **チーム選択中ビュー** = `/?team=X` / `/daily?team=X`
   - 上記 1/2 の searchParam で表現済み。✓

## 主要ギャップ

- 個人カレンダーの表示月が URL に反映されていない（client useState）。
  これが URL-01 の「状態を含む復元可能な公開URL」を満たさない唯一の箇所。

## 正規URL取得の規約（成功基準3）

対象4ビューの「現在表示中の状態を表す正規の公開URL」を 1関数/規約で取得でき、
Phase 38 の共有ボタンが参照できるようにする。`lib/` に薄いヘルパ
（例: `lib/shareUrl.ts` の `buildShareUrl(...)`）を置くか、各ビューが
searchParam 規約で表現する形を Claude の裁量で決定する。

## 実装方針（Claude裁量、KISS / simplicity-first / PROJECT.md v1.9 ロック決定に従う）

- 既存の searchParam 規約（`?team=`）を踏襲する。
- 個人カレンダーの月を `?ym=YYYY-MM`（または同等）の searchParam 化し、
  client useState → URL 駆動へ移行（KISS な最小変更）。
- 未ログインでアクセス可能であること（既存の公開ページ性質を維持）。
- 共有ボタン・OGP は本フェーズのスコープ外（Phase 38/39）。

## Success Criteria（ROADMAP）

1. トップ Commit&Goal でチームタブ切替がURLに反映され、リロード/別タブで同じチームで開く。
2. `/daily` と個人カレンダーが、状態を含む公開URLで未ログインでも同じ表示にアクセスできる。
3. 対象4ビューの正規公開URLを 1関数/規約で取得でき、Phase 38 が参照できる。

## Out of scope

- 共有ボタン UI（Phase 38）
- OG メタタグ / 動的OG画像（Phase 39）
