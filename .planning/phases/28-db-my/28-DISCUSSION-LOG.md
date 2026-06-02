# Phase 28: コミットスケジュール — DB + /my ページ - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 28-db-my
**Areas discussed:** 保存アクション統合, スロット入力UI, DB詳細 & 保存戦略, フォーム構造

---

## 保存アクション統合

| Option | Description | Selected |
|--------|-------------|----------|
| 独立したアクションにする | `updateCommitSlotsAction` を別途作成。コミットスケジュールは独立の「保存」ボタンで送信。責任分離でアクション設計がシンプル | ✓ |
| `updateMyProfileAction` に統合 | 既存パターンを拡張。フォーム全体を一括送信。実装しやすいが、action 内の FormData 解析が複雑になる | |

**User's choice:** 独立したアクション
**Notes:** 「独立すると簡素になる理由を詳しく教えて」という質問から始まり、FormData の複雑化・エラー状態の分離・テスト容易性の説明後に独立を選択

---

## スロット入力UI

| 質問 | Option | Selected |
|------|--------|----------|
| スロット数の変化 | 動的に増減（useState） | ✓ |
| | 4スロット固定 + disabled | |
| 頻度選択 | Select（プルダウン） | ✓ |
| | Radio（ボタン並び） | |
| 曜日選択 | セレクト（月火水木金土日） | ✓ |
| | 曜日チェックボックス（7項目） | |
| 時刻入力 | セレクト（00〜23） | ✓ |
| | number input（0-23） | |

**User's choice:** 全て推奨オプションを選択（Select + 動的増減 + 曜日セレクト + 時刻セレクト）
**Notes:** ユーザーから追加要件: 「コミットスロットはモーダル表示にする。保存するボタンではなく宣言するボタン」。これにより UI 設計が大きく変更された。
- 未設定時: 「コミットスケジュールを宣言する」ボタン
- 設定済み時: サマリーテキストをクリックして編集モーダル
- モーダルのトリガー: 「現在のスケジュールをクリックして編集」
- ボタン名: 「宣言する」（「保存する」ではない）

---

## DB詳細 & 保存戦略

| 質問 | Option | Selected |
|------|--------|----------|
| day_of_week の型 | INT (0=日〜6=土) | ✓ (with note) |
| | TEXT enum (mon/tue/wed…) | |
| day_of_week マッピング | 0=月〜6=日 | ✓ |
| | 1=月〜7=日 | |
| 保存戦略 | delete + insert | ✓ |
| | upsert (on conflict do update) | |
| 同一曜日の重複 | 許可する | |
| | UIバリデーションのみ（DB制約なし）| ✓ |

**User's choice:** INT型・0=月〜6=日・delete+insert・UIバリデーションのみ
**Notes:** 「INTで自然な表現でいいけど、週定義は月曜スタート日曜終わりなことに留意」と補足あり。同一曜日の重複については「UIの話だよね？データの持ち方はとれるけど、UIとしては禁止したい」— UIで制約、DBにはUNIQUE制約なし

---

## フォーム構造

| 質問 | Option | Selected |
|------|--------|----------|
| コンポーネント | 新規 `CommitScheduleModal.tsx` | ✓ |
| | `MyProfileForm.tsx` に結合 | |
| 開閉管理 | `CommitScheduleModal` 自身で管理 | ✓ |
| | `/my/page.tsx` で管理 | |
| 初期データ | スロット配列 + メンバー ID を props で渡す | ✓ |
| | モーダル内部で client-side fetch | |

**User's choice:** 新規独立コンポーネント、自己管理開閉、props でデータ渡し
**Notes:** シンプルな props パッシング + 自己完結型モーダルの設計

---

## Claude's Discretion

- モーダルの HTML 実装方法（`<dialog>` vs `<div role="dialog">`）
- `updateCommitSlotsAction` のエラーハンドリング（既存パターン踏襲）
- migration ファイルの timestamp 命名

## Deferred Ideas

なし — ディスカッションはフェーズスコープ内に収まった
