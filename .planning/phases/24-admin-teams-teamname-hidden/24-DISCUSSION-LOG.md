# Phase 24: /admin/teams/{teamName} hiddenチームビュー - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 24-/admin/teams/{teamName} hiddenチームビュー
**Areas discussed:** 無効/空チームの扱い, ページの見た目, 表示できるチームの範囲

---

## 無効/空チームの扱い

| Option | Description | Selected |
|--------|-------------|----------|
| notFound()で404 | 存在しないteamNameは notFound() で404、メンバー0人は「メンバーがいません」表示 | |
| メッセージ表示(200) | 存在しない・空どちらも「該当チームはありません」等を200で表示。404にしない | ✓ |
| 空グリッド表示 | メンバー0人でもヒートマップ枠だけ表示し、存在しないteamNameのみ404 | |

**User's choice:** メッセージ表示(200)
**Notes:** 存在しないチーム・メンバー0人いずれも200でメッセージ表示し、404にはしない。

---

## ページの見た目

| Option | Description | Selected |
|--------|-------------|----------|
| 管理用の簡素ビュー | チーム名見出し + /admin戻りリンク + WeeklyHeatmapGrid。タブ・PrBannerなし | ✓ |
| トップレイアウト流用 | トップページと同じ h1・PrBannerあり。チームタブはなし | |
| グリッドのみ最小 | WeeklyHeatmapGridだけ。見出しや戻りリンクなし | |

**User's choice:** 管理用の簡素ビュー
**Notes:** 管理者専用ビューとしてチームタブ・参加案内バナー（PrBanner）は出さない。

---

## 表示できるチームの範囲

| Option | Description | Selected |
|--------|-------------|----------|
| 任意のチーム全部 | public/private/hidden問わず任意のteamNameを表示。実装シンプル | ✓ |
| hiddenのみに限定 | status=hiddenのチームだけ表示、他はnotFound() | |

**User's choice:** 任意のチーム全部
**Notes:** ルート名はhidden用途だが、管理者が全チームをURL直接で確認できるようにする。フィルタはteamName完全一致のみ（status条件なし）。

---

## Claude's Discretion

- 見出しへの status バッジ併記の有無
- teamName のURLデコード処理（日本語・特殊文字対応）
- トップページのレイアウトスタイル（max-w-[600px]等）の踏襲
- revalidate値の設定

## Deferred Ideas

None — 議論はフェーズスコープ内に収まった。
