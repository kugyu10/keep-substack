# Phase 1: プロジェクト基盤とデータ層 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 1-プロジェクト基盤とデータ層
**Areas discussed:** フィード取得戦略, ISRとデプロイ設定

---

## フィード取得戦略

### 失敗時の表示

| Option | Description | Selected |
|--------|-------------|----------|
| スキップ（推奨） | 失敗メンバーを非表示にし、成功したメンバーのみ表示 | |
| エラー表示 | メンバー名は表示しつつ「取得失敗」と明示 | |
| サイレント+ログ | ユーザーには非表示、サーバーログにのみ記録 | |

**User's choice:** 非表示（1秒待ってリトライ、それでもダメなら非表示。v1はシンプルに）
**Notes:** ユーザーが選択肢提示前に直接方針を伝えた

### 並列取得

| Option | Description | Selected |
|--------|-------------|----------|
| Promise.allSettled（推奨） | 全フィードを並列取得。個別の失敗が他に影響しない | ✓ |
| 逐次取得 | 1件ずつ順番に取得。シンプルだが50件だと遅い | |
| Claudeにおまかせ | 実装時に最適な方法を判断 | |

**User's choice:** Promise.allSettled（推奨）
**Notes:** なし

### タイムアウト

| Option | Description | Selected |
|--------|-------------|----------|
| 5秒（推奨） | SubstackのRSS応答は通常高速。5秒あれば十分余裕 | ✓ |
| 10秒 | より安全側。回線が遅いサーバーにも対応 | |
| Claudeにおまかせ | 実装時に判断 | |

**User's choice:** 5秒（推奨）
**Notes:** なし

### 記事範囲

| Option | Description | Selected |
|--------|-------------|----------|
| フィード全件（推奨） | SubstackのRSSは通常最新10-20件程度。フィルタ不要 | |
| 直近30件まで | 上限を設けて安全側に | ✓ |
| Claudeにおまかせ | 実装時に判断 | |

**User's choice:** 直近30件まで
**Notes:** なし

---

## ISRとデプロイ設定

### revalidate初期値

| Option | Description | Selected |
|--------|-------------|----------|
| 5分（300秒） | PROJECT.mdの想定通り。「書いたらすぐ確認したい」心理に対応 | ✓ |
| 1時間（3600秒） | 記事更新は1日1回程度なので実用上は十分 | |
| Claudeにおまかせ | 実装時に判断 | |

**User's choice:** 5分（300秒）
**Notes:** なし

### revalidate設定方法

| Option | Description | Selected |
|--------|-------------|----------|
| 環境変数（推奨） | Vercel管理画面から再デプロイなしで変更可能 | ✓ |
| JSON設定ファイル | メンバー設定と同じファイルで管理。変更時にデプロイ必要 | |
| Claudeにおまかせ | 実装時に判断 | |

**User's choice:** 環境変数（推奨）
**Notes:** なし

### デプロイ方法

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub連携（推奨） | GitHubリポジトリをVercelに接続、mainブランチpushで自動デプロイ | ✓ |
| Vercel CLI | vercel deployで手動デプロイ | |
| Claudeにおまかせ | 実装時に判断 | |

**User's choice:** GitHub連携（推奨）
**Notes:** なし

---

## Claude's Discretion

- 設定ファイル（JSON）の構造・配置場所
- Phase 1での表示範囲（最小限のUI）

## Deferred Ideas

なし — 議論はフェーズスコープ内に収まった
