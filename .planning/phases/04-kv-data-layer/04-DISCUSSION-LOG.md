# Phase 4: KVデータ層移行 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 4-KVデータ層移行
**Areas discussed:** KVキー設計, members.jsonの扱い, Phase 4の変更範囲

---

## KVキー設計

| Option | Description | Selected |
|--------|-------------|----------|
| 単一JSONリスト | `members` キーにJSON配列を丸ごと保存。redis.set/get で1コマンド。50人規模なら十分。 | ✓ |
| メンバーごとHash + インデックス | `member:{substackId}` でHash保存 + `members:index` でSet管理。個別CRUD向き。 | |

**User's choice:** 単一JSONリスト（`redis.set / redis.get`）
**Notes:** `redis.json.*` は使わない。@upstash/redis の自動シリアライズを活用。

---

## members.jsonの扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 削除する | KVがストアになるので不要。コードからimportも削除。 | ✓ |
| KV空時のフォールバックとして残す | KVが空の場合にmembers.jsonを読む。開発時のデバッグは楽だが不要なロジックが増える。 | |
| バックアップとして残す | リポジトリに残すがアプリからは使わない。緊急時参照用。 | |

**User's choice:** 削除する（移行スクリプト成功後に手動削除）
**Notes:** スクリプトで自動削除はしない。KVにデータが入ったことを確認してから手動で削除する。

---

## Phase 4の変更範囲

### page.tsx と fetchFeed.ts の対応範囲

| Option | Description | Selected |
|--------|-------------|----------|
| データ取得層のみ切り替え | KVからmembersを取得する関数を作り、page.tsxのimportを置き換える。fetchFeed.tsの署名変更なし。 | ✓ |
| fetchFeed.ts も全面書き替え | fetchFeed.ts内で直接KVを呼び、Member型のname/feedUrl属性をsubstackId/addedAtに変更。 | |

**User's choice:** データ取得層のみ切り替え

### Member型の変更タイミング

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4で型も変更する | types.tsのMember型を新スキーマに合わせる。KVのデータ構造とコードが一致して詐欺を防ぐ。 | ✓ |
| Phase 5以降に延期 | Phase 4はKV基盤のみ、型変更はheatmap実装時にまとめて行う。 | |

**User's choice:** Phase 4で型も変更する

### 移行スクリプトの形式

| Option | Description | Selected |
|--------|-------------|----------|
| Node.jsスクリプト (tsx) | `scripts/seed-kv.ts` を作成、`npx tsx scripts/seed-kv.ts` で実行。ローカルから一度だけ実行する趣旨が分かりやすい。 | ✓ |
| API Route経由 | `/api/seed` エンドポイントを作り、Vercelデプロイ後にGETで移行。辺りを解さないと誰でも呼べるリスクがある。 | |

**User's choice:** Node.jsスクリプト (tsx) — `scripts/seed-kv.ts`

---

## Claude's Discretion

- 特になし（すべてユーザーが選択）

## Deferred Ideas

- KV個別CRUD（add/delete API）— Phase 6（管理画面）で実装
- team-idフィルタリング — Phase 6で実装
- extractSubstackId関数の整理 — 将来フェーズで検討
