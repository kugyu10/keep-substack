---
phase: 37-url-url
verified: 2026-06-14T01:12:00Z
status: human_needed
score: 6/6 must-haves code-verified (3 require human-UAT for live browser behavior)
overrides_applied: 0
human_verification:
  - test: "未ログインブラウザ（別プロファイル/シークレット）で本番相当の /member/<実在publicationId>?ym=2026-05 を開く"
    expected: "ログイン要求されず2026年5月のカレンダーが表示される。リロード/別タブで貼り直しても同じ5月が維持される。月送り（＜ ＞）を押すとURLの ym= が前月/翌月に更新される。"
    why_human: "未ログインアクセス可否・リロード後の状態維持・ライブな月ナビのURL更新はブラウザ実挙動でしか確認できない（grep/build では Server Component の searchParams 受領と next/link href 生成までしか確認できない）"
  - test: "/ （トップ Commit&Goal）でチームタブを切り替える"
    expected: "URLに ?team=<チーム名> が付与され、別タブで同URLを開くと同じチームが選択された状態で表示される。未ログインでもアクセスできる。"
    why_human: "タブ切替→URL反映→別タブ復元の一連はブラウザ実挙動。コードは a href=?team= 生成と team searchParam フィルタまで確認済み"
  - test: "/daily?team=<チーム名> を未ログインで開く"
    expected: "指定チームでフィルタされた daily ビューが表示され、ログイン要求されない。"
    why_human: "未ログインアクセス可否と team フィルタ反映の実挙動確認"
---

# Phase 37: 共有URLの状態保持（公開URL化）Verification Report

**Phase Goal:** 対象4ビュー（トップ Commit&Goal `/`、`/daily`、個人カレンダー `/member/[publicationId]`、チーム選択中ビュー `?team=`）が、状態（チームフィルタ・カレンダー表示月）を含む復元可能な公開URLを持つ。未ログインでアクセス可能。Phase38/39 が消費する正規URL取得規約を備える。route param は publicationId。
**Verified:** 2026-06-14T01:12:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 未ログイン訪問者が `/member/[publicationId]?ym=YYYY-MM` を開くとその月が復元表示される | ✓ VERIFIED (code) / ? human-UAT (live) | `member/[publicationId]/page.tsx:16-20` が `searchParams: Promise<{ym?:string}>` を await し `parseYmParam(ym)` → `{year,month}` を CalendarGrid に渡す。`middleware.ts:57` の matcher は `/admin` `/my` のみで member は非ゲート（未ログイン可）。build で `ƒ /member/[publicationId]` = Dynamic 確認 |
| 2 | 個人カレンダーで月送りボタンを押すとURLの ym が更新され、リロード/別タブでも同じ月 | ✓ VERIFIED (code) / ? human-UAT (live) | `CalendarGrid.tsx:22-28,66-82` が prev/next を `next/link` の `<Link href=buildShareUrl({type:'member',publicationId,ym})>` で生成。useState/setMonth/setYear 0件（grep確認）。実ブラウザの遷移は human-UAT |
| 3 | ym 未指定/不正値のとき現在月（JST）へフォールバック | ✓ VERIFIED | `shareUrl.ts:22-41` 正規表現 `^(\d{4})-(\d{2})$` + year 2000-2100 + month 1-12 検証を通らない値は `currentJstYearMonth()`（`Date.now()+9h` UTC）へ。`shareUrl.test.ts` で undefined/null/空/13月/00月/abc/ゼロ詰めなし/`../`/年域外を網羅、198テスト全pass |
| 4 | トップでチームタブ切替が ?team= に反映、リロード/別タブで同チーム | ✓ VERIFIED (code) / ? human-UAT (live) | `(main)/page.tsx:14-15,67` が `team` を await し `<a href="/?team=${encodeURIComponent(t)}">` を出力、`team` で `filteredMembers` をフィルタ。非ゲート公開ページ |
| 5 | /daily でチームフィルタが ?team= に反映、未ログインで同表示にアクセス可能 | ✓ VERIFIED (code) / ? human-UAT (live) | `(main)/daily/page.tsx:13-14,48` 同パターン。`<a href="/daily?team=...">`、`team` フィルタ。middleware 非ゲート |
| 6 | 対象4ビューの正規公開URLを buildShareUrl 1関数で取得でき Phase 38 が参照可 | ✓ VERIFIED | `shareUrl.ts:64-80` `buildShareUrl(view: 'goal'\|'daily'\|'member')` が4ビュー（goal±team / daily±team / member±ym）の相対公開URLを返す。encodeURIComponent 適用、ym は parse→format でラウンドトリップ正準化。CalendarGrid が実消費。`shareUrl.test.ts` で全分岐検証 |

**Score:** 6/6 truths code-verified. 3 truths (1,2,4,5 の live 部分) はブラウザ実挙動につき human-UAT で最終確認が必要。

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/shareUrl.ts` | buildShareUrl + parseYmParam + formatYmParam | ✓ VERIFIED | 3関数 export、90行、実装substantive、CalendarGrid/member page が import 利用 |
| `src/lib/__tests__/shareUrl.test.ts` | 3関数の単体テスト | ✓ VERIFIED | 26 it（parse 15 / format 3 / roundtrip 1 / build 11 相当）全pass |
| `src/app/(main)/member/[publicationId]/page.tsx` | ym 読取→CalendarGrid に表示月 | ✓ VERIFIED | searchParams await + parseYmParam 使用、year/month を props 渡し |
| `src/components/CalendarGrid.tsx` | URL駆動月ナビ（useState廃止、next/link） | ✓ VERIFIED | useState/setMonth/setYear 0件、'use client' 撤去、Link href に buildShareUrl |
| `src/components/__tests__/CalendarGrid.test.tsx` | 新Props対応 | ✓ VERIFIED | year/month/publicationId 追加、react useState モック削除、next/link スタブ、3 it pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| member page.tsx | shareUrl.ts | `parseYmParam(ym)` | ✓ WIRED | import line 7、line 20 で呼び {year,month} を CalendarGrid へ |
| CalendarGrid.tsx | URL (?ym=) | next/link href = buildShareUrl | ✓ WIRED | import line 3、prevHref/nextHref を Link href に設定 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| member page | year/month | `parseYmParam(await searchParams)` | Yes（URL→検証済み値、フォールバック現在月） | ✓ FLOWING |
| CalendarGrid | articleMap | `buildHeatmapArticleMap(memberResult.items)`（page側、フィード実データ） | Yes | ✓ FLOWING |
| CalendarGrid | prevHref/nextHref | buildShareUrl(year±1月) | Yes（year/month から算出、桁上げ込み） | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| shareUrl 3関数の挙動 | `npm test`（shareUrl 含む） | 25ファイル198テスト全pass | ✓ PASS |
| 型整合・ビルド | `npm run build` | Compiled successfully, TypeScript OK, `/member/[publicationId]` = ƒ Dynamic | ✓ PASS |
| member 公開（非ゲート） | middleware matcher 確認 | matcher=['/admin','/admin/:path*','/my','/my/:path*'] のみ | ✓ PASS |

### Probe Execution

該当なし（このフェーズは probe ベースの検証規約を持たない。npm test / npm run build で代替）。

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| URL-01 | 37-01-PLAN | 状態を含む復元可能な公開URL（4ビュー）+ buildShareUrl 規約 | ✓ SATISFIED (code) / human-UAT (live) | Truths 1-6 参照。REQUIREMENTS.md は当該マイルストーン分が削除済み（commit 32c8cb7）のため記述参照不可だが、PLAN frontmatter requirements:[URL-01] と success_criteria で網羅 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | TODO/FIXME/XXX/TBD/placeholder | — | 0件（modified 3ファイルでクリーン） |

### Human Verification Required

検証コンテキストの明示指示どおり、ブラウザ実挙動（未ログインアクセス可否・リロード状態維持・ライブな月ナビ/タブ切替のURL更新）は human-UAT 項目として分類（FAIL ではない）。コード側の配線・型・テストは全て VERIFIED。

1. **個人カレンダー ?ym 復元（未ログイン）** — 別プロファイルで `/member/<実在publicationId>?ym=2026-05` を開く。期待: ログイン不要で5月表示、リロードで維持、月送りで ym= 更新。
2. **トップ team タブ復元** — `/` でチームタブ切替。期待: ?team= 付与、別タブで同チーム復元、未ログイン可。
3. **/daily team フィルタ（未ログイン）** — `/daily?team=X`。期待: フィルタ表示、ログイン不要。

### Gaps Summary

ギャップなし。フェーズ目標である「状態を含む復元可能な公開URL（4ビュー）」「未ログインアクセス」「Phase 38 が消費する正規URL取得規約 buildShareUrl」は、コードベース上で実体・配線・データフロー・テストすべてが確認できた。route param は publicationId で goal どおり。残るのはブラウザ実挙動の最終目視（human-UAT 3件）のみで、これは自動検証不能なため human_needed として上申する。npm test 198 pass / npm run build 成功。

---

_Verified: 2026-06-14T01:12:00Z_
_Verifier: Claude (gsd-verifier)_
