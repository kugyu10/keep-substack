# Phase 33: バグ修正 + commitSlots upsert化 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 33-commitslots-upsert
**Areas discussed:** BUG-01 (RSS取得バグ), BUG-02 (認証フロー修正), DB-01 (upsert化)

---

## エリア選択

| Option | Selected |
|--------|----------|
| BUG-01: RSS取得バグの実態 | ✓ |
| BUG-02: next パラメータ + ログアウト先 | ✓ |
| DB-01: upsert化の戦略 | ✓ |
| その他（ユーザー追記） | ✓ |

**User's additional input:** 非ログイン時 /my を入力したらログインページにリダイレクトするようにしてほしい。/admin /signin-hoge は引き続き秘匿。

---

## BUG-01: RSS取得バグの実態

| Option | Description | Selected |
|--------|-------------|----------|
| メンバー追加後、記事データが長時間経っても表示されない | cronが小に取りにくるまで待たないと履歴が空のまま | |
| RSS取得に失敗しましたエラーが出る | 本番環境で addMemberAction の RSS fetch try/catch が失敗する | |
| cronが新規メンバーをピックアップするまで待たないと履歴が見えない | 現在の実証はその後に行われていない | |

**User's choice:** こちら解決済み。RSSに取得できなかった時にサムネ空を上書きしてしまったことがあり、スクレイピングなどで直す必要がどこかで必要
**Notes:** BUG-01は既に addMemberAction で fetchWithRetry → saveArticles を実装済み。実装済みとしてスキップ。サムネ空上書き問題は将来フェーズへ defer。

---

## BUG-02: next パラメータ + ログアウト先

### auth/callback の next パラメータ有効化

| Option | Description | Selected |
|--------|-------------|----------|
| YES — /login から next= で渡すユースケースがある | 例: /my でセッション切れ・ログイン後に元のページへ戻りたい | ✓ |
| NO — 常に /my でよい（現在のハードコードは適切） | next= の後廃変更は不要 | |

**User's choice:** YES — /login から next= で渡すユースケースがある

### ログアウト後のリダイレクト先

| Option | Description | Selected |
|--------|-------------|----------|
| /login にリダイレクト（修正） | 現在の signOutAction は /（トップページ）に | |
| / のまま（変更不要） | トップページへのリダイレクトは念のため | ✓ |

**User's choice:** / のまま（変更不要）

### 非ログイン時 /my → /login リダイレクトの実装方法

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware.ts でリダイレクト | リクエスト前でインターセプト。middleware.ts は既存（supabase/ssr 用）。シックな方法 | ✓ |
| /my の page.tsx 内で redirect('/login') | サーバーコンポーネント内で getUser() 後に redirect。シンプルだがページ単位 | |

**User's freeform reply:** 今後、ログイン必要ページは増える見込み　どっちがいい？
**Claude recommendation:** ログイン必要ページが増える見込みなら middleware.ts 一択（一か所管理）
**User's choice:** OK！middleware.ts でやる

### middleware での認証ガード方針確認

| Option | Description | Selected |
|--------|-------------|----------|
| OK！middleware.ts でやる | 一か所管理、将来ページ追加に強い | ✓ |
| 待って、追加で要件を説明したい | 護るべきパスの列挙・リダイレクト先の細分化など | |

**User's choice:** OK！middleware.ts でやる

---

## DB-01: upsert化の戦略

### 保存の原子性保証方法

| Option | Description | Selected |
|--------|-------------|----------|
| upsert + 余剰行 delete（記載の TODO 実装） | ON CONFLICT (member_id, day_of_week) DO UPDATE で新スロットを merge、その後削除された曜日だけ DELETE。DELETE 失敗時は古いスロットが残るが新規 INSERT 消失はない | |
| Supabase RPC（DBフィールド）で完全アトミック | SQL トランザクションで 1回の DB 呼び出しに集約。schema.sql に関数追加が必要 | ✓ |

**User's choice:** Supabase RPC（DBフィールド）で完全アトミック

### スロット 0 件時の処理

| Option | Description | Selected |
|--------|-------------|----------|
| 0件の時は DELETE ALL（現在のまま） | slots.length === 0 の時は単純に全削除。upsert ステップはスキップ | ✓ |
| 0件はエラー扱い（全解除不可） | 最低1件のスロット必須。UI側でも制限 | |

**User's choice:** 0件の時は DELETE ALL（現在のまま）

### RPC 関数の管理方法

| Option | Description | Selected |
|--------|-------------|----------|
| schema.sql + 新規 migration ファイルに追加 | supabase/migrations/新ファイル.sql + schema.sql に関数定義。これまでのマイグレーションパターンと一致（追分定義） | ✓ |
| schema.sql のみに追加（本番に SQL Editor で手動適用） | Phase 32 と同じパターン。migration ファイルは作らず、schema.sql を正規ソースとして更新 | |

**User's choice:** schema.sql + 新規 migration ファイルに追加

---

## Claude's Discretion

特になし。すべての主要決定にユーザーが明示的な選択をした。

## Deferred Ideas

- **RSS サムネ空上書き問題**: RSS 取得失敗時に `image_url` が null で上書きされる。スクレイピングによる補完修正が必要。将来フェーズで対応
- **追加の protected pages**: 将来ログイン必須ページが増えた場合は middleware.ts の matcher 配列に追加するだけ
