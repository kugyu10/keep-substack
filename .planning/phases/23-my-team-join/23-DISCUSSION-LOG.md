# Phase 23: /myページ公開チーム参加・退出 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 23-/myページ公開チーム参加・退出
**Areas discussed:** privateチームの表示, フォーム構成, 保存タイミング, 空状態のUI, Server Action変更方針

---

## privateチームの表示 (SELF-03)

### 未参加privateチームの扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 完全非表示 | /myはpublicチームのセルフサービスに特化。privateチームの存在をユーザーに見せない。クエリが単純（status='public'のみ取得） | ✓ |
| グレーアウト表示 | privateチームも一覧に出るがdisabled。チームの存在は伝わるがUXが複雑になる | |

**User's choice:** 完全非表示
**Notes:** シンプルさを優先。/myはpublicチームのセルフサービスページという役割を明確にする

---

### 参加中privateチームの扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 見えない（一貫） | /myはpublic専用と徹底する。private管理は管理者のみ | |
| 参加中のprivateチームは表示 | 自分が属するprivateチームは確認できる（readonly、退出不可） | ✓ |

**User's choice:** 参加中のprivateチームは表示（readonly）
**Notes:** 管理者に追加されたチームを本人が確認できることに価値がある

---

## フォーム構成

| Option | Description | Selected |
|--------|-------------|----------|
| 同一フォーム | 名前変更とチーム選択を同じ「保存する」ボタンでまとめる。既存useActionStateパターンを継続（KISS） | ✓ |
| 分離フォーム | チーム操作を別アクションに分離。保存タイミングを将来独立させられるが、新規コンポーネント追加が必要 | |

**User's choice:** 同一フォーム
**Notes:** 既存MyProfileFormパターンを活かす。将来分離が必要になったらその時に対応

---

## 保存タイミング

| Option | Description | Selected |
|--------|-------------|----------|
| 保存ボタンで一括 | 「保存する」ボタン押下で名前・チームをまとめて保存。既存useActionStateパターンと一致 | ✓ |
| 即時保存 | チェックボックス変更ごとに自動保存。UX良いが実装複雑（毎回Server Action呼び出し） | |

**User's choice:** 保存ボタンで一括
**Notes:** シンプルさと既存パターン維持を優先

---

## 空状態のUI

| Option | Description | Selected |
|--------|-------------|----------|
| メッセージ表示 | 「参加できる公開チームはありません」テキスト表示。コンテンツが空の理由がわかる | ✓ |
| セクション非表示 | publicチームがない場合はチームセクションごと非表示。シンプルだが空ページに見える可能性 | |

**User's choice:** メッセージ表示

---

### 全publicチーム参加済みの場合

| Option | Description | Selected |
|--------|-------------|----------|
| 同じメッセージでOK | 「参加できる公開チームはありません」で統一。少し残念だがシンプル | |
| 別メッセージにする | 「すべての公開チームに参加中です」と正確に伝える。チェックボックスが全てON状態で表示 | ✓ |

**User's choice:** 別メッセージにする
**Notes:** 全参加済みの場合もチェックボックスは全ON表示し、追加メッセージを出す

---

## Server Action変更方針

| Option | Description | Selected |
|--------|-------------|----------|
| 完全置き換え | 同じactions.tsに `publicCheckedTeamNames` パラメータを追加。既存publicチームIDのみ許可。テキスト入力値は無視 | ✓ |
| 別Action新設 | `updateTeamMembershipsAction` を新設。名前変更用と分離できるが、ファイルが増える | |

**User's choice:** 完全置き換え
**Notes:** 現行のupdateMyProfileActionはチーム名の自由入力でupsert（存在しないチームも作成！）してしまうため完全置き換えが必要。publicチームIDのみ許可することでセキュリティも向上

---

## Claude's Discretion

なし — 全エリアでユーザーが明示的に選択した

## Deferred Ideas

なし — 議論はフェーズスコープ内に収まった
