# Phase 7: UI小改善バッチ（Tooltip・ナビ・フッター） - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 7-UI小改善バッチ（Tooltip・ナビ・フッター）
**Areas discussed:** Tooltip記事カードの構造, フッターのデザイン

---

## Tooltip記事カードの構造（TOOLTIP-01+02）

### 画像のクリック動作

| Option | Description | Selected |
|--------|-------------|----------|
| 画像+タイトル一体型リンク | 画像とタイトルを1つの`<a>`ブロックで囲む。どこをクリックしても記事に遷移するカード型。 | ✓ |
| 画像だけに別リンク追加 | 既存の`<a>`タイトルはそのままに、画像だけ別の`<a>`で囲む。コード変更量最小だが、ダブルリンク構造になる。 | |

**User's choice:** 画像+タイトル一体型リンク（カード型）
**Notes:** なし

### 記事間スペース

| Option | Description | Selected |
|--------|-------------|----------|
| mb-3 | 余裕のある間隔。画像+タイトルのペアが明確に区切られ視認しやすい。 | ✓ |
| mb-2 | やや広め。コンパクトさを保ちつつ区切り感あり。 | |
| Claude任せ | 視覚的にバランスよく判断してもらう。 | |

**User's choice:** mb-3
**Notes:** なし

---

## フッターのデザイン（FOOTER-01）

### 配置場所

| Option | Description | Selected |
|--------|-------------|----------|
| layout.tsxに共通追加 | 全ページ共通フッター。FOOTER-01の「全ページ」要件に準拠。変更1ファイルのみ。 | ✓ |
| 各ページ別に追加 | page.tsxなどに個別追加。管理画面はフッター不要にできるが、重複が発生する。 | |

**User's choice:** layout.tsxに共通追加
**Notes:** なし

### スタイル

| Option | Description | Selected |
|--------|-------------|----------|
| シンプル（1行テキストリンク） | ボーダーなし、グレー小文字テキストリンクのみ。YAGNI原則に合致。 | ✓ |
| ボーダー付きフッター | 上線（border-t）+説明テキスト+リンク。リッチな印象。 | |

**User's choice:** シンプル（1行テキストリンク）
**Notes:** `py-4 text-center`、`text-xs text-gray-400 hover:text-gray-600`

---

## Claude's Discretion

- **NAV-01+02（戻りリンク）** — 要件通りに実装。ラベル「← メンバー一覧」固定、URLはteamIdがあれば `/?team=${teamId}` なければ `/`。ユーザーが話し合いのエリアとして選択せず、Claude判断で実装する。
- Tailwind CSSクラスの微調整（hover効果等）
- フッターリンクへのUTMパラメータ付与（Claude判断）

## Deferred Ideas

なし — 議論はフェーズスコープ内に収まった。
