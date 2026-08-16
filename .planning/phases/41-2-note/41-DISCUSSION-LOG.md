# Phase 41: 機能2 Note一覧（永続化なし） - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 41-2-note
**Areas discussed:** user_id の供給方法, 本文プレビューの忠実度, 付随情報と表示件数, 外部リンクと失敗/0件表示

---

## user_id の供給方法

| Option | Description | Selected |
|--------|-------------|----------|
| env var に設定 | SUBSTACK_ADMIN_USER_ID 等で .env 保持。admin 1人・永続化なしPoCで最速 | ✓ |
| handle から都度導出 | @handle だけ持ち public_profile API で user_id を毎回解決 | |
| DB に admin プロフィール保存 | members 等に user_id カラム追加。複数admin/永続化見越し | |

**User's choice:** env var に設定
**Notes:** admin = 開発者本人1人・永続化なしPoC のため最小実装を選択。

---

## 本文プレビューの忠実度

| Option | Description | Selected |
|--------|-------------|----------|
| 改行保持+truncate | プレーンテキスト化し改行保持・N文字/3行で折りたたみ | |
| リンク/画像も簡易保持 | body のリンク・画像・改行を可能な限り再現 | |
| 全文そのまま | truncateせず全文表示・実装最単純 | ✓ |

**User's choice:** 全文そのまま
**Notes:** 一覧として最単純を優先。body のレンダリング方式は body 形式次第で research が確定。

---

## 付随情報と表示件数

| Option | Description | Selected |
|--------|-------------|----------|
| 最小（本文+日時）・最新ページのみ | roadmap通り本文プレビュー+投稿日時(JST)のみ・ページングなし | ✓ |
| +カウント類も表示 | children_count/reaction_count も各Noteに表示 | |
| 最小+件数を増やす | 本文+日時のみだが nextCursor で直近N件まで取得 | |

**User's choice:** 最小（本文+日時）・最新ページのみ
**Notes:** NOTE-02 スコープ通り。カウント表示・ページングはスコープ外（deferred）。

---

## 外部リンクと失敗/0件表示

| Option | Description | Selected |
|--------|-------------|----------|
| リンクあり・2状態区別 | 実Substack Noteへリンク。失敗/0件を別文言で明示 | |
| リンクなし・2状態区別 | 表示のみ。失敗/0件を別文言で明示 | ✓ |
| リンクあり・失敗時リトライ | リンクあり+失敗時 fetchFeed同様1回リトライ後エラー表示 | |

**User's choice:** リンクなし・2状態区別
**Notes:** 表示のみ。「取得失敗」と「0件」は必ず別文言で区別（NOTE-03）。

---

## Claude's Discretion

- env var 名・未設定時の扱い
- 失敗/0件の具体文言・UIレイアウト
- リトライ有無（既存 fetchFeed.ts パターン踏襲可）
- 投稿日時の JST フォーマット

## Deferred Ideas

- コメント数/リアクション数の表示（NOTE-02 スコープ外）
- nextCursor ページング・無限スクロール
- 実 Substack Note への外部リンク導線
- 複数 admin / DB 永続化
- body のリッチテキスト完全再現（画像・埋め込み等）
