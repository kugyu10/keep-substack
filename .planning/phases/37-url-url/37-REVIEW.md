---
phase: 37-url-url
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/shareUrl.ts
  - src/lib/__tests__/shareUrl.test.ts
  - src/app/(main)/member/[publicationId]/page.tsx
  - src/components/CalendarGrid.tsx
  - src/components/__tests__/CalendarGrid.test.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 37: Code Review Report

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 37 で個人カレンダーの表示月を client `useState` から `?ym=YYYY-MM` の searchParam 駆動へ移行し、Phase 38 が消費する `buildShareUrl` / `parseYmParam` / `formatYmParam` を新設した。

中核の脅威面（信頼できない `ym` の Tampering / path traversal）は `parseYmParam` の `^(\d{4})-(\d{2})$` 正規表現＋月域チェック＋フォールバックで適切に mitigate されており、テストも path traversal・非数値・域外月・ゼロ詰めなしを網羅している。Server Component 化も `HeatmapTooltip`（client）/`next/link` の組合せとして整合し、client-only API がサーバ文脈で呼ばれる箇所はない。Critical な欠陥は検出されなかった。

ただし、(1) `CalendarGrid` の月送り href が `publicationId` を `encodeURIComponent` せず `buildShareUrl` のエンコード規約と非対称、(2) `parseYmParam` の年に上下限がなく `0000-06` のような実在しない年を採用してしまう入力検証の抜け、(3) `searchParams` の型が `string` 固定で `string[]` の実行時形を表現していない、の3点が品質・堅牢性の懸念として残る。

## Warnings

### WR-01: 月送り href が publicationId をエンコードしない（buildShareUrl と規約が非対称）

**File:** `src/components/CalendarGrid.tsx:26-27`
**Issue:** `buildShareUrl`（shareUrl.ts:58）は member URL で `encodeURIComponent(view.publicationId)` を必須としているのに対し、CalendarGrid の前月/翌月リンクは `` `/member/${publicationId}?ym=${prevYm}` `` と生のまま埋め込んでいる。同じ「正規公開URL」を生成するコードで規約が分裂しており、Phase 38 が `buildShareUrl` 経由で作る URL と、ページ内ナビが作る URL が `publicationId` に特殊文字（スペース・`?`・`#`・`%` 等）を含む場合に食い違う。`publicationId` は Substack サブドメイン由来で通常は英数字＋ハイフンのため実害は低いが、`map.get(dateKey)` のキー一致や将来のID仕様変更で壊れる潜在バグ。さらに `?ym=` 直前のパスセグメントが未エンコードだと、不正なIDで URL 構造そのものが崩れうる。
**Fix:**
```tsx
import { formatYmParam, buildShareUrl } from '@/lib/shareUrl'
// ...
const prevHref = buildShareUrl({ type: 'member', publicationId, ym: prevYm })
const nextHref = buildShareUrl({ type: 'member', publicationId, ym: nextYm })
```
これで shareUrl.ts に規約を一元化でき、エンコード非対称が解消する。

### WR-02: parseYmParam に年の上下限がなく非現実的な年を採用する

**File:** `src/lib/shareUrl.ts:20-26`
**Issue:** 正規表現 `^(\d{4})-(\d{2})$` は `0000`〜`9999` を全て通すため、`?ym=0000-06` や `?ym=9999-12` がそのまま `{ year, month }` として採用される。`year:0` の場合 `buildDayGrid(0, month)` 内の `new Date(0, month-1, 1)` は JavaScript の2桁年補正で1900年扱いとなり、表示が `0年6月` なのにグリッドは1900年6月の曜日配置という不整合を生む（クラッシュはしないが意味不明な復元結果）。信頼できない外部入力に対する検証としては月域だけでなく年域も妥当範囲に絞るのが望ましい。
**Fix:**
```ts
if (m) {
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  // 妥当な年範囲（例: 2000〜2100）かつ月 1〜12 のときのみ採用
  if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
    return { year, month }
  }
}
```
範囲は本プロジェクトの運用想定に合わせて調整。少なくとも `year > 0` の下限は入れる。

### WR-03: buildShareUrl の member ym を未検証のまま受け入れる

**File:** `src/lib/shareUrl.ts:57-60`
**Issue:** `buildShareUrl({ type:'member', ym })` は `ym` を `encodeURIComponent` するだけで形式検証しない。Phase 38 が誤って未整形の値（例: `formatYmParam` を通さない `"2026/6"` 等）を渡しても、そのままエンコードされて `?ym=2026%2F6` のような、自身の `parseYmParam` では復元できない（フォールバックされる）非正準URLを「正規URL」として返してしまう。生成と解釈で対称性が崩れ、Phase 38/39 の消費側でラウンドトリップ不整合の温床になる。
**Fix:** 呼び出し側に `formatYmParam` 経由を強制する規約をコメント明記するか、`buildShareUrl` 内で `ym` を `parseYmParam`→`formatYmParam` で正準化してから埋め込む（不正値はクエリ省略にフォールバック）。少なくとも shareUrl.ts に「ym は formatYmParam の出力のみを渡すこと」を JSDoc で明示する。

## Info

### IN-01: searchParams の型が string 固定で string[] の実行時形を表現していない

**File:** `src/app/(main)/member/[publicationId]/page.tsx:16`
**Issue:** Next.js の searchParams は同名キー重複時（`?ym=a&ym=b`）に `string[]` を返しうるが、型は `Promise<{ ym?: string }>`。実行時に配列が来ると `parseYmParam` の `typeof ym === 'string'` で弾かれ安全にフォールバックするため挙動上のバグはないが、型が実態を表していない。
**Fix:** `searchParams: Promise<{ ym?: string | string[] }>` とし、`parseYmParam` の引数型（現状 `string | undefined | null`）と整合させる。

### IN-02: dateKey 生成ロジックが formatYmParam と重複

**File:** `src/components/CalendarGrid.tsx:95`
**Issue:** `` `${year}-${String(month).padStart(2, '0')}-...` `` の月ゼロ詰めが `formatYmParam` と同じ規約をインラインで再実装しており、ゼロ詰め規約が複数箇所に分散している（WR-01 と同根の「規約の二重実装」）。
**Fix:** `formatYmParam(year, month)` を再利用して `` `${formatYmParam(year, month)}-${String(day.date).padStart(2, '0')}` `` とすると規約が一元化する。

### IN-03: next/link テストスタブが実 React 要素でない

**File:** `src/components/__tests__/CalendarGrid.test.tsx:12-17`
**Issue:** `next/link` モックが `{ type:'a', props }` のプレーンオブジェクトを返しており、`$$typeof` を持つ実 React 要素ではない。本テストのツリーウォーカー（`isElement`）は `type`/`props` の存在のみで判定するため動作するが、将来 RTL 等で実レンダリングに移行すると破綻する。テスト専用かつ現状 pass のため Info 扱い。
**Fix:** 必要になった時点で `vi.mock('next/link', () => ({ default: (p) => <a {...p} /> }))` のような実要素を返すスタブへ移行。

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
