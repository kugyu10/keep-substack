# Phase 41: 機能2 Note一覧（永続化なし） - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

admin（開発者本人）が投稿した Substack Note の一覧を、DB を経由せずサーバー側で
都度 fetch して `/admin/notes` に読み取り専用で表示する。各 Note に本文プレビューと
投稿日時（JST）を出し、取得失敗・0件の状態を明示する。永続化・キャッシュは行わない。

Phase 40 スパイクで go 判定済み（採用エンドポイント・無認証・Vercel 到達性まで実測確定）。
コメント取得・キャッシュ・複数 admin 対応は Phase 42 以降の別スコープ。
</domain>

<decisions>
## Implementation Decisions

### user_id の供給方法
- **D-01:** admin の Substack user_id（`110584954` / @uojun）は **env var** で供給する
  （例: `SUBSTACK_ADMIN_USER_ID`）。admin は開発者本人1人・永続化なし PoC のため、
  DB カラム追加や handle→public_profile API 導出はオーバースペックと判断。
  env 命名・存在チェック方法は planner/researcher 裁量。

### 本文プレビューの忠実度
- **D-02:** Note 本文（body）は **全文そのまま表示**（truncate なし）。一覧として
  最単純な実装を優先。文字数/行数での切り詰めは行わない。
- **D-03:** body のレンダリング方式（プレーンテキスト化 / 改行保持 / リンク・画像保持）は
  **body のデータ形式に依存するため research で確定**（下記 Open Questions 参照）。
  「実物忠実さを重視する」プロジェクト方針はあるが、本フェーズは一覧表示のため
  「全文・最単純」を上位に置く。過度なリッチ再現は不要。

### 一覧に出す情報と表示件数
- **D-04:** 一覧に出すのは **本文プレビュー + 投稿日時（JST）のみ**（roadmap NOTE-02 通り最小）。
  取得済みの children_count（コメント数）/ reaction_count（リアクション数）は **表示しない**。
- **D-05:** **最新ページのみ**表示。`nextCursor` によるページング・追加取得は行わない
  （feed の先頭1レスポンス分でよい）。

### 外部リンクと失敗/0件の状態表示
- **D-06:** 各 Note から実 Substack Note（`.../note/c-{id}`）への **外部リンクは付けない**。
  表示のみ。
- **D-07:** 「**取得失敗（エラー）**」と「**0件（まだ Note なし）**」を **別文言で明示**する
  （NOTE-03）。具体文言は planner 裁量だが2状態を必ず区別すること。

### Claude's Discretion
- env var 名・読み取り/未設定時の扱い
- 失敗/0件の具体的な文言・UI（カード/リスト等のレイアウト）
- リトライ有無（既存 `fetchFeed.ts` の「1秒後1回リトライ→空フォールバック」パターン踏襲可）
- 投稿日時の JST フォーマット（既存 `calendarUtils.ts` 等の規約に合わせる）

### Open Questions for Research
- **body のデータ形式**: スパイクの raw JSON
  （`.planning/spikes/001-substack-notes-list/raw/profile.json` 等）で
  `items[].comment.body` が プレーンテキスト / HTML / ProseMirror JSON のいずれかを確認し、
  D-02「全文表示」の具体的レンダリング方法（D-03）を確定する。
- **Note 一覧フィードの正確なレスポンス構造**: `?types=note` 絞り込みの挙動、
  Note と通常コメントの判別（`item.context.type=note` 等）を raw JSON で確認。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 40 スパイク成果（採用エンドポイント・フィクスチャ）
- `.planning/spikes/MANIFEST.md` — go/no-go 判定・確定エンドポイント表・実測サマリ・
  実装フェーズへの申し送り（リスク/前提）。**最重要**。
  - Note 一覧（本フェーズ採用）: `GET /api/v1/reader/feed/profile/{user_id}?types=note`
    → `items[].comment` に id/body/date/name/handle/photo_url/children_count/reaction_count、
    `nextCursor` でページング（本フェーズは未使用）
  - フィクスチャ: user_id=`110584954`（@uojun）
- `.planning/spikes/001-substack-notes-list/raw/` — Note 一覧系の生 JSON サンプル
  （body 形式・レスポンス構造確認用）

### 要件
- `.planning/REQUIREMENTS.md` — NOTE-01 / NOTE-02 / NOTE-03
- `.planning/ROADMAP.md` §Phase 41 — Goal / Success Criteria（3項目）

### 再利用パターン
- `src/lib/fetchFeed.ts` — サーバー側 Substack fetch + リトライ + フォールバック の既存パターン
- `src/middleware.ts` — `/admin` の admin ロールガード（matcher に `/admin/:path*` を含む）
- `src/lib/authz.ts` / `src/lib/requireAdmin.ts` — admin 判定の単一ソース

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/fetchFeed.ts`: サーバー側 fetch + 1秒1回リトライ→空フォールバックの実装パターン。
  Note 取得層（新規 `lib/notes.ts` 想定）の雛形として流用可。
- `src/middleware.ts`: `/admin` 配下は middleware で admin ガード済み。`/admin/notes` も
  matcher `/admin/:path*` に含まれるため **ページ側で再ガード不要**。
- 日時 JST 整形ユーティリティ（`src/lib/calendarUtils.ts` 等）— 投稿日時 JST 表示に流用。

### Established Patterns
- App Router + Server Component（RSC）で外部データを都度 fetch して表示する構成
  （既存 admin ページ群が `src/app/(main)/admin/` 配下に存在）。
- 取得は必ずサーバー側（CORS / cookie 露出回避）。今回 cookie 不要（スパイク確認済み）。

### Integration Points
- 新規ルート: `src/app/(main)/admin/notes/page.tsx`（RSC）
- 新規取得層: `src/lib/notes.ts`（Phase 42 で安定化・再利用される前提）

</code_context>

<specifics>
## Specific Ideas

- 「全文・最小情報・リンクなし・最新ページのみ」という徹底した最小 PoC 方針。
  機能を盛るより、取得が安定して見えることを優先する。
- Note 取得層は Phase 42（コメント可視化）でも使われるため、`lib/notes.ts` として
  切り出して安定化させる（ROADMAP Phase 42 Depends-on の通り）。

</specifics>

<deferred>
## Deferred Ideas

- コメント数 / リアクション数の表示 — 取得は可能だが NOTE-02 のスコープ外。将来検討。
- `nextCursor` ページング・無限スクロール — 件数が増えたら別フェーズで。
- 実 Substack Note への外部リンク導線 — 今回は表示のみ。
- 複数 admin / DB 永続化 — Phase 42 以降のキャッシュ基盤と合わせて検討。
- body のリッチテキスト完全再現（画像・埋め込み等の忠実表示）。

</deferred>

---

*Phase: 41-2-note*
*Context gathered: 2026-06-18*
