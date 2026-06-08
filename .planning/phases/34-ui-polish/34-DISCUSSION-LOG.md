# Phase 34: UI Polish バッチ - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 34-ui-polish
**Areas discussed:** UI-04 ソート順変更, UI-03 フッター文言, UI-02 ロゴ配置, UI-01+UI-05 レイアウト/ヘッダー制御, /login 招待制注記

---

## UI-04: Commit & Goal View ソート順変更

### ソート順の指定

| Option | Description | Selected |
|--------|-------------|----------|
| 達成率 → 登録日 | ストリーク削除、シンプルな2段 | |
| ストリーク → 登録日 | 達成率削除、連続性重視 | |
| 登録日のみ | コミット無視、全員平等 | |
| 別のルール | ユーザー指定 | ✓ |

**User's choice:** 今週達成率 → ストリーク週数 → 先週達成率 → 先々週達成率 → 登録日昇順（5段ソート）

---

### ストリークの詳細

| Option | Description | Selected |
|--------|-------------|----------|
| 連続達成率>0%週数 | 先週以前の達成率>0%週数を連続カウント | |
| 先週書いたか binary | コミットスロット問わず先週記事があれば加点 | |
| ストリーク変更なし | 既存の100%達成週数維持、先週達成率を別キーに | ✓ |

**User's choice:** ストリークは変更なし（100%達成週のカウント）。先週・先々週の達成率は別の3〜4番ソートキーとして追加。

---

### メンバーグループ分け

| Option | Description | Selected |
|--------|-------------|----------|
| slots.length===0 を一律最下位 | user_id 区別なし | |
| hasUser で2層に分けたい | Member型に hasUser 追加 | ✓ |

**User's choice:** Member型に `hasUser: boolean` 追加。Group A（hasUser+slots>0）、Group B（hasUser+slots=0、未コミット）、Group C（!hasUser、未登録、最下位）の3グループ。

---

## UI-03: フッター文言

| Option | Description | Selected |
|--------|-------------|----------|
| /my へのリンク | マイページへの誘導 | |
| 何も表示しない | 空フッター | |
| 別の文言を記入 | ユーザー指定 | ✓ |

**User's choice:**
- ログイン済み + member紐付けあり: 「あなたの個人ビューはコチラ」→ `/member/{publicationId}`
- ログイン済み + member未紐付け: 「参加登録はコチラ」→ `/my`

**URL確認:** `/member/{publicationId}` (既存ルートのまま)

**エッジケース:** ログイン済みだが member 未紐付けの場合は「参加登録はコチラ」（`/my`）。

---

## UI-02: ロゴ配置・スタイル

| Option | Description | Selected |
|--------|-------------|----------|
| ページ中央内容の上 | フォームの直上 | ✓ |
| ページ上部に固定 | ヘッダーバー代わり | |
| ページトップにセンター | ホテルライクな大ロゴ | |

**User's choice:** フォームの直上に配置。

| Option | Description | Selected |
|--------|-------------|----------|
| ヘッダーと同じ Georgia serif、大きく | font-black + Georgia serif | ✓ |
| テキストロゴがリンクになる | / へのリンク | |
| シンプルなテキストのみ | 非リンク | |

**User's choice:** Georgia serif + font-black、ヘッダーより大きいサイズ（text-2xl程度）、中央配置、リンクなし。

---

## UI-01: ログインページのレイアウト分離

| Option | Description | Selected |
|--------|-------------|----------|
| Route Groups で分離 | (auth)/ グループ、URL変更なし | ✓ |
| pathname 判定で条件適用 | ルートレイアウトにif文追加 | |

**User's choice:** Route Groups `(auth)/` で分離。`(auth)/layout.tsx` を新規作成（ヘッダー・フッターなし）。

---

## UI-05: マイページボタン非表示の実装

| Option | Description | Selected |
|--------|-------------|----------|
| ボタン部分だけ Client Component 化 | HeaderNav.tsx + usePathname() | ✓ |
| Header全体を Client Component 化 | 'use client' + usePathname | |

**User's choice:** Header の nav ボタン部分のみ `HeaderNav.tsx` として Client Component に切り出し、`usePathname()` で `/my` を判定。Server Component の `Header.tsx` が auth 取得して props 渡し。

---

## /login 招待制注記

**User request（フリーテキスト）:** `/login` のフォーム下に一文追加
- 文言: 「サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます」
- スタイル: `text-xs text-gray-400 text-center`
- `/signin-51cf21389c56` には追加しない

---

## Claude's Discretion

- `text-2xl` のロゴサイズは例示。実装時に視覚的なバランスで調整可能。
- `Footer.tsx` の切り出し方（props 設計等）は実装者の判断に委ねる。

## Deferred Ideas

- **Gridサムネイル優先ロジック**: 該当日に複数記事があったとき表示サムネを選ぶロジック。Phase 34 スコープ外、将来フェーズへ。
