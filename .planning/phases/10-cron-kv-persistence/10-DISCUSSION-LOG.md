# Phase 10: Cron + KV記事永続化 — Discussion Log

**Phase:** 10-cron-kv-persistence
**Date:** 2026-05-11
**Status:** Complete

## Areas Discussed

### 1. 既存ISRキャッシュとの共存方法
**Options presented:**
- KVに完全移行（ISR廃止）
- KV無ければISRフォールバック

**Selected:** KVに完全移行（ISR廃止）

**Notes:** シンプルさを優先。新規メンバーも登録時に初回取得するためフォールバック不要。

---

### 2. メンバー登録時の初回フィード取得
**Options presented:**
- addMemberAction内で同期実行
- fire-and-forget（非同期）
- 次回Cronまで待つ

**Selected:** addMemberAction内で同期実行

**Notes:** 確実性を優先。登録直後にKVにデータが入っていることが保証される。

---

### 3. Cronエンドポイントの認証
**Options presented:**
- CRON_SECRET環境変数で保護
- 無認証

**Selected:** CRON_SECRET環境変数で保護

**Notes:** Vercel推奨パターン。Authorization: Bearer ヘッダーで検証。

---

### 4. 重複記事の排除
**Options presented:**
- link URLでdedupe
- isoDateでdedupe
- 重複容認（追記のみ）

**Selected:** link URLでdedupe

**Notes:** article.linkがユニークな識別子として最適。

---

### 5. KVサイズ上限対策
**Options presented:**
- 最大件数制限（例: 1000件まで）
- 今は何もしない（YAGNI）

**Selected:** 今は何もしない（YAGNI）

**Notes:** 現状メンバーが少数のため問題なし。将来問題が起きたら対処する。

## Deferred Ideas
- KVサイズ上限（最大件数制限）
- Cron実行の監視・アラート
