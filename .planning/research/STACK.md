# Stack Research

**Domain:** Substack Notes & comments データ取得（既存 Next.js + Supabase アプリへの PoC 追加・v1.10）
**Researched:** 2026-06-18
**Confidence:** MEDIUM（取得手段＝非公式エンドポイント。ライブラリ層は HIGH、Substack 側の安定性は本質的に LOW）

## フィージビリティ判定（最重要）

**取得できるか？ → YES（条件付き）。ただし「公式 API」は存在せず、非公式エンドポイントに依存する。**

| 取得対象 | 判定 | 手段 | リスク |
|----------|------|------|--------|
| 機能2: ある Substack ユーザーが投稿した Note 一覧 | **YES** | `profile.notes()`（`/api/v1` profile feed） | 中（slug 変更で 404、ページネーション仕様変動） |
| 機能1: 特定 **Post** のコメント（本文・件数・投稿者名/アイコン） | **YES** | `post.comments()`（`/api/v1/post/{id}/comments`） | 中 |
| 機能1: 特定 **Note** 自体に付いたコメント | **UNCERTAIN** | ライブラリは `Note.commentCount` を持つが、Note→コメント読み取りは Post ほど成熟していない。**PoC の調査フェーズで実物検証必須** | 高 |

**結論:** 公式 API はこの用途を一切カバーしない（公式 Developer API は「LinkedIn 連携済みクリエイターの公開プロフィール取得」だけ）。実装は Substack web アプリが内部利用する非公式 `*.substack.com/api/v1/...` エンドポイントを叩く形になり、`substack.sid` セッション cookie 認証が必要。PoC として「取れるか検証する」目的には十分到達可能だが、**Substack 側はいつでも仕様変更で壊し得る**前提を要件に明記すること。

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `substack-api` (jakub-k-slys/substack-api) | npm `substack-api` 最新（TypeScript ネイティブ・Context7 reputation High / 417 snippets） | Substack 非公式 API の型付きラッパー。Profile/Post/Note/Comment エンティティと async iterator ページネーションを提供 | 自前で `/api/v1` を逆解析せず済む。TS 製で既存 Next.js/TS スタックに自然に乗る。`profile.notes()` と `post.comments()`（author 込み）が PoC 2機能にほぼ 1:1 対応 |
| 既存 `@supabase/supabase-js` 2.x | 既存 | 機能1 のコメントキャッシュ永続化 | 新規依存ゼロ。既存パターン（service クライアント）で `comments` テーブルに upsert |
| 既存 Next.js Route Handler / Server Action | 既存（Next 16） | Substack 取得は**必ずサーバー側**で実行（cookie/token をクライアントに出さない） | 既存 `lib/` のサーバー専用フェッチ層と同じ流儀。Node ランタイム推奨 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| （なし／標準 `fetch`） | — | ライブラリが内部で fetch を使うため追加 HTTP クライアント不要 | `substack-api` を使う限り axios/got 等は不要（YAGNI） |
| `zod`（任意） | ^3 | 非公式 API レスポンスは無契約。表示前にバリデート/正規化したいなら導入 | PoC では省略可。フィールド欠損で落ちないようにしたい時のみ |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `curl` + ブラウザ DevTools | 調査フェーズで生レスポンスの実フィールド名（`photo_url` 等 snake_case）を確認 | 非公式 API は仕様書が無いため、要件定義前に 1 回だけ実レスポンスを採取し JSON 形を固定する |
| `.env`（既存方式） | `SUBSTACK_TOKEN`（= `substack.sid` cookie 値）を保管 | サーバー専用 env。`NEXT_PUBLIC_` を付けない。admin（開発者本人）の cookie を 1 つ使う PoC 前提 |

## 主要エンドポイント / API メソッド（ライブラリ経由・Context7 検証済み）

```typescript
import { SubstackClient } from 'substack-api';

const client = new SubstackClient({
  token: process.env.SUBSTACK_TOKEN!,        // = substack.sid cookie 値（必須）
  publicationUrl: 'xxxx.substack.com',       // 対象 publication（必須）
  // perPage: 25,              // ページサイズ（任意, default 25）
  // maxRequestsPerSecond: 25, // 内蔵レートリミッタ（任意, default 25）
});

// --- 機能2: ある Substack ユーザーが投稿した Note 一覧（永続化なし） ---
const profile = await client.profileForSlug('admin-handle'); // or profileForId(282291554)
for await (const note of profile.notes({ limit: 20 })) {
  // note.id / note.body(本文) / note.author / note.createdAt / note.commentCount / note.reactions
}

// --- 機能1: 特定 Post のコメント可視化（永続化あり） ---
const post = await client.postForId(167180194); // 数値 post ID
// post.commentCount で件数
for await (const comment of post.comments({ limit: 50 })) {
  // comment.id / comment.body / comment.createdAt
  // comment.author : Profile → name, slug, avatar/photo（投稿者名・アイコン）
}
```

**エンティティ形（Context7 検証済み）:**
- `Comment { id: string; body: string; author: Profile; post?: Post; createdAt: Date; reactions?: Reaction[] }`
- `Note { id: string; body: string; author: Profile; createdAt: Date; reactions?: Reaction[]; commentCount: number }`
- `comment.author` は `Profile`（`name`/`slug` 等）→ **投稿者名は確実、アイコン URL は Profile のアバターフィールド**（実フィールド名は調査フェーズで確認）

**裏で叩かれる生エンドポイント（参考・非公式）:**
- Notes feed: `GET https://{pub}.substack.com/api/v1/notes`（`?cursor=` でページング）
- Post コメント: `GET https://{pub}.substack.com/api/v1/post/{post_id}/comments`
- Profile: `GET .../api/v1/profile`
- 認証: `Cookie: substack.sid=<...>`（旧称 `connect.sid`）+ `Accept: application/json`

## 認証・レート制限・運用上の注意

- **認証:** API key は無い。ログイン済みセッションの `substack.sid` cookie を 1 個流用する。PoC は admin 本人の cookie で十分。公開・無認証で取れる場合もあるが、確実性のため cookie 前提で設計。
- **レート制限:** Substack は過剰リクエストで IP スロットル/ブロックあり（数値は非公開）。`substack-api` は `maxRequestsPerSecond`（default 25）の内蔵リミッタを持つ。PoC では 5〜10 程度に下げ、機能1 は Supabase キャッシュで再取得を回避（要件通り）。
- **slug 変更 = 404:** ユーザーがハンドルを変えると旧エンドポイントが 404。可能なら数値 ID（`profileForId`/`postForId`）で保持する。
- **無契約 API:** レスポンス形は予告なく変わる。`testConnectivity()` と try/catch でフォールバック表示を必ず入れる。
- **ToS:** 非公式・Substack 非公認。自分の認証セッションで自分が閲覧可能なデータを読む範囲に留める（PoC・admin スコープと整合）。

## Supabase 統合（機能1 のキャッシュ）

- 既存スタックに `comments` キャッシュテーブルを 1 つ追加（例: `post_id`, `comment_id`(PK), `body`, `author_name`, `author_avatar_url`, `created_at`, `fetched_at`）。
- 取得は Server Action / Route Handler → `substack-api` → 正規化 → `upsert`。表示は既存 Supabase 読み出しパターン。
- schema.sql（正規ソース）に追記し、本番は SQL Editor 経由で適用（既存運用ルール）。

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `substack-api`（TS） | `substack_api`（NHagar, Python） | Python サービスを別途持つ場合のみ。本プロジェクトは TS 単一なので不適 |
| `substack-api`（TS） | `substack-sdk`（alvarolorentedev） | Notes 書き込み中心の用途向け。読み取り＋comments author が主目的なので `substack-api` が上 |
| `substack-api`（TS） | 生 `fetch` で `/api/v1` 自前実装 | ライブラリが想定外に壊れた時の最終手段。PoC では逆解析コストが無駄（ライブラリで足りる） |
| `substack-api`（TS） | Apify / Stackhooks 等の有償スクレイピング SaaS | 大量・継続スクレイピングや法人運用時。PoC・小規模・コスト重視なので不要 |
| 非公式 API | RSS フィード（既存 rss-parser） | RSS は**記事のみ**。Notes もコメントも RSS に出ない → 本 PoC では使えない |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| 公式 Substack Developer API | Notes/コメントを一切返さない（LinkedIn 連携クリエイターの公開プロフィールのみ） | 非公式 `/api/v1` + `substack-api` |
| 既存 `rss-parser` を Notes/コメントに流用 | RSS には Notes もコメントも含まれない | `substack-api` の `notes()`/`comments()` |
| クライアント側（ブラウザ）から Substack を直接 fetch | `substack.sid` 露出 + CORS + token 漏洩 | Next.js サーバー側（Route Handler / Server Action） |
| Note のコメントを Post と同一視して即実装 | Note→コメント読み取りはライブラリでも未成熟・UNCERTAIN | 調査フェーズで実物検証してから機能1 のスコープ確定 |
| 大量・常時ポーリング | IP ブロックリスク | 手入力トリガー + Supabase キャッシュ + 低 RPS |

## Stack Patterns by Variant

**機能2（Note 一覧・永続化なし）:**
- `profileForSlug(adminHandle).notes({ limit })` を Server Action で都度取得し、そのまま表示。DB 不要。

**機能1（コメント・永続化あり）:**
- URL/ID 入力 → `postForId(id).comments()` → 正規化 → Supabase upsert → 表示。再表示はキャッシュ読み。

**もし Note 自体のコメントが取れないと判明したら:**
- 機能1 のスコープを「Post のコメント可視化」に読み替える（PoC として価値は維持）か、入力を Post ID/URL に限定する。要件定義で分岐を用意。

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `substack-api`（TS） | Next.js 16 / Node 18+ / TS 5 | TS ネイティブ。サーバーランタイムで使用（Edge ではなく Node ランタイム推奨：cookie ヘッダ・長め fetch のため） |
| `substack-api` | `@supabase/supabase-js` 2.x | 直接の依存関係なし。取得結果を渡すだけ |

## Sources

- Context7 `/jakub-k-slys/substack-api` — SubstackClient 設定（token=`substack.sid`, urlPrefix=`api/v1`, perPage, maxRequestsPerSecond）, `profileForSlug`/`profileForId`/`postForId`, `profile.notes()`, `post.comments()`, Comment/Note エンティティ定義（**HIGH**）
- https://iam.slys.dev/p/no-official-api-no-problem-how-i — 生エンドポイント `/api/v1/notes`（`?cursor=`）, `/api/v1/profile`, posts/comments、`Cookie: connect.sid` 認証（**MEDIUM**, 単一著者の逆解析記録）
- https://github.com/NHagar/substack_api / PyPI `substack-api` — Python 版で同型 API の存在を裏付け、slug 変更で 404 の挙動（**MEDIUM**）
- https://www.npmjs.com/package/substack-sdk, https://substack-api.readthedocs.io/ — 代替ライブラリの存在と cookie 認証前提（**MEDIUM**, WebFetch 403 のため検索要約由来）
- https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API — 公式 API は LinkedIn 連携プロフィールのみ＝Notes/コメント非対応（**MEDIUM**, 直 fetch 403 のため検索結果要約由来。実装前に再確認推奨）
- コメント author の avatar 実フィールド名（`photo_url` 等）は**未確定** → 調査フェーズで生レスポンス採取が必要（**LOW**）

---
*Stack research for: Substack Notes & comments PoC（既存 Next.js + Supabase アプリ追加・v1.10）*
*Researched: 2026-06-18*
