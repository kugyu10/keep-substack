# Project Research Summary

**Project:** keep-substack — v1.10 Substack Notes PoC（コメント可視化 & Note一覧取得）
**Domain:** Substack Notes 領域の読み取り可視化（非公式エンドポイント経由のデータ取得）
**Researched:** 2026-06-18
**Confidence:** MEDIUM（ライブラリ／既存統合は HIGH、Substack 側の到達性・データ形状は LOW〜MEDIUM・実証必須）

## Executive Summary

これは**フィージビリティ・ゲート型の PoC** である。Substack には Notes/コメントを取得する公式 API が存在しない（公式 Developer API は LinkedIn 連携プロフィール照会のみ）。本 PoC の全機能は、Substack web アプリが内部利用する**未文書化エンドポイント** `https://{pub}.substack.com/api/v1/...` に依存し、`substack.sid`（旧 `connect.sid`）セッション cookie 認証が前提になる。技術的な「取れるかどうか」自体が最大かつ唯一の致命的依存であり、UI・DB・要件確定はすべてその後に来る。

推奨アプローチは明確で、**捨てる前提の取得スパイクを最優先する**こと。`curl`／単発スクリプトで (a) 認証要否、(b) **本番 Vercel serverless IP からの到達性**、(c) レスポンス JSON の実フィールド名（特にコメント本文・コメント者名・アバター URL・件数）を実測し、go/no-go を出す。取得が通った後にのみ、機能2（admin の Note 一覧・永続化なし・Server Component で都度 fetch）→ `note_comments` スキーマ → 機能1（Server Action による cache-aside ＋ Supabase 永続化）の順で組む。実装は既存 `fetchFeed.ts`／`articles.ts` の双子として `lib/notes.ts`／`lib/noteComments.ts` を作り、`/admin/notes` 配下（既存 middleware ガード済み）に置く。新規ライブラリは TS ネイティブの `substack-api` が第一候補だが、PoC では生 `fetch` でも成立する。

最大リスクは**「ローカルでは取れるが本番 Vercel から 403/429 で取れない」**こと（データセンター IP・TLS フィンガープリント・anti-bot）。これに対し residential proxy 等で無理に突破するのは PoC のスコープ外であり明確な over-engineering。低頻度・ブラウザ相当ヘッダー・1 req/sec で正当に取れなければ、**「取得不可」を負の結果として文書化してクローズすること自体が有効な PoC 成果**である（v1.9 の Note prefill 不可確定と同じ価値）。この negative-result fallback を要件・成功条件に明記しておくことが、UI/DB の作り込みが無駄になるのを防ぐ。

## Key Findings

### Recommended Stack

公式 API は使えないため、非公式 `/api/v1` を叩く方針に一本化。ライブラリ層は TS ネイティブの `substack-api`（`profile.notes()` と `post.comments()` が PoC 2機能にほぼ 1:1 対応、内蔵レートリミッタあり）が有力だが、PoC では標準 `fetch` でも成立する。永続化は既存 Supabase をそのまま流用。取得は**必ずサーバー側**（cookie/token をクライアントに出さない、Node ランタイム推奨）。詳細は [STACK.md](./STACK.md)。

**Core technologies:**
- `substack-api`（TS, 任意）または標準 `fetch`：Substack 非公式 API への型付き／素のアクセス — TS スタックに自然に乗り、`notes()`/`comments()` が要件に直結。PoC は生 fetch でも可
- 既存 `@supabase/supabase-js` 2.x：機能1 のコメントキャッシュ永続化 — 新規依存ゼロ、`createSupabaseAdminClient()` + upsert の既存パターン流用
- 既存 Next.js Server Action / Server Component（Node ランタイム）：サーバー専用フェッチ — `substack.sid` cookie を秘匿（env `SUBSTACK_SESSION_COOKIE`）

### Expected Features

詳細は [FEATURES.md](./FEATURES.md)。すべて「取れた場合に何を表示するか」を定義したもので、取れないフィールドは degrade（落とす）前提。

**Must have (table stakes):**
- 機能1: Note URL/ID 入力フォーム（寛容なパース）+ コメント件数 + 本文一覧（フラット）+ コメント者名 — 機能の核
- 機能1: Supabase キャッシュ（再取得回避）+ 取得失敗/0件/キャッシュ無の状態表示
- 機能1: コメント者アイコン（取れれば。欠損はイニシャル/プレースホルダにフォールバック）— 視覚忠実さの要求
- 機能2: admin の Note 一覧取得・表示（毎回取得・永続化なし）+ 本文プレビュー + 投稿日時(JST)
- 機能2: 取得失敗/0件の状態表示

**Should have (competitive):**
- コメントの投稿日時(JST)・リアクション数 — 取得フィールド確認後に追加
- Note 一覧のいいね/返信/restack 数・直リンク・取得時刻表示 — 鮮度明示
- コメント者の Substack プロフィールリンク — handle が取れる場合のみ

**Defer (v2+):**
- 返信スレッドのネスト表示（PoC はフラットで十分）
- 機能2 の対象拡張（admin→メンバー→任意ユーザー）
- リッチテキスト/画像/埋め込みの完全再現、ページネーション/全件取得

### Architecture Approach

既存 Next.js App Router / Supabase / Vercel に最小追加。Substack 取得はサーバー側固定（ブラウザ直叩きは CORS + cookie 露出で不可）。機能1 は Server Action（cache-aside + TTL + force 再取得フラグ）、機能2 は Server Component で都度 fetch（DB 非経由）。`/admin/notes` 配下に置けば既存 `middleware.ts` の認証ガードがそのまま効く。詳細は [ARCHITECTURE.md](./ARCHITECTURE.md)。

**Major components:**
1. `lib/notes.ts`（新規, `server-only`）— Substack 非公式 API へのサーバー専用 fetch + JSON 整形。`fetchFeed.ts` の双子
2. `lib/noteComments.ts`（新規）— `note_comments` の read/upsert + キャッシュ鮮度判定。`articles.ts` の双子
3. Server Action `fetchAndCacheComments` + `/admin/notes` RSC + `NoteCommentForm`/`NoteCommentList` — 表示・制御フロー
4. `note_comments` テーブル（複合 PK `note_id, comment_id`、`fetched_at` で鮮度判定、service_role 経由に閉じる）

### Critical Pitfalls

[PITFALLS.md](./PITFALLS.md) より最重要を抜粋。

1. **取得可否を検証する前に UI/DB を作り込む** — 最初を throwaway スパイクにし、生 JSON サンプル + 取得可否レポートが UI 着手前に存在することを必須にする
2. **ローカルで動いたものが本番 Vercel IP から 403/429 でブロックされる** — Phase 1 で必ず preview/本番から実リクエストを撃つ。ブラウザ相当ヘッダー + 1 req/sec。解けなければ proxy で深追いせず Fallback へ
3. **認証 cookie 要否の誤認** — 機能ごとに実測（機能1=公開コメント寄り / 機能2=admin 自身で認証必須寄り）。cookie 名は env 切替、フロント/NEXT_PUBLIC_ に絶対出さない
4. **非公式エンドポイントの不安定性（ハンドル変更404・形状変更で全壊）** — 防御的パース（optional/try-catch）、安定 ID をキーに、URL/ヘッダーを定数1か所に集約、生 JSON 保存
5. **PoC の過剰作り込み** — 成功条件を「取れるか・どう取れるかが分かること」に固定。proxy/TLS偽装/汎用化/全メンバー対応は非ゴール

## Implications for Roadmap

Based on research, suggested phase structure（取得スパイク先行が研究全体の一貫した強い推奨）:

### Phase 1: 取得可否スパイク（go/no-go ゲート）
**Rationale:** 全機能の根が「非公式 API で本当に取れるか」。机上では確定できない (a)認証要否 (b)本番 Vercel 到達性 (c)JSON 実形状 を実測しない限り、後続すべてが手戻りリスク。研究 4 本が口を揃えて最優先指定。
**Delivers:** 動く UI ではなく **取得可否レポート + 生 JSON サンプル + 採用エンドポイント表 + go/no-go 判断**。本番 Vercel(または preview)からの実リクエスト結果を含む。
**Addresses:** 全 table-stakes の前提検証（特にコメント本文・著者名・アバター URL・各種カウントのフィールド名確定）
**Avoids:** Pitfall 1（検証前作り込み）/ Pitfall 4（本番 IP ブロック）/ Pitfall 3（認証要否誤認）
**Includes negative-result fallback:** ここで「正当な手段では本番から取れない」と判明したら、(3)手入力フォールバックで可視化 UI のみ残す、または (4)**「取得不可」を文書化してクローズ** ＝ 有効な PoC 成果として終える分岐を用意する。

### Phase 2: 機能2（Note 一覧・永続化なし）
**Rationale:** go 判定後、DB 不要で最小。取得検証の自然な延長で、Server Component の都度 fetch だけで成立。機能1 より依存が少なく早く形になる。
**Delivers:** `/admin/notes` RSC + `lib/notes.fetchAdminNotes()` + 一覧 UI（本文プレビュー + 投稿日時 JST + 取得時刻表示）
**Uses:** `lib/notes.ts`（server-only fetch）, 既存 middleware ガード
**Implements:** Architecture Pattern 3（Ephemeral RSC fetch、`force-dynamic`、DB 非経由）

### Phase 3: コメントキャッシュ基盤
**Rationale:** 機能1 の永続化に必要な土台を、UI と分離して先に固める。schema.sql（正規ソース）追記 + 本番 SQL Editor 適用という既存運用に乗せる。
**Delivers:** `note_comments` テーブル（複合 PK・`fetched_at` 鮮度・RLS service_role 限定）+ `lib/noteComments.ts`（read/upsert + 鮮度判定）

### Phase 4: 機能1（コメント可視化・永続化あり）
**Rationale:** 最も依存が多い（取得 + キャッシュ + 表示 + フォーム）ため最後。Phase 1〜3 が揃って初めて安全に組める。
**Delivers:** Server Action `fetchAndCacheComments`（cache-aside + TTL + force 再取得）+ `NoteCommentForm` + `NoteCommentList`（件数/本文/名前/アイコン）+ `/admin` リンク追加
**Addresses:** 機能1 の全 table-stakes（アイコンは degrade 可）
**Avoids:** Pitfall 5（防御的パース・定数集約）/ Pitfall 6（素の `<img>` + onError フォールバック、remotePatterns 追加なし）/ Pitfall 7（fetched_at 表示 + 手動再取得）/ Security（cookie 秘匿・本文はエスケープ描画で XSS 防止）

### Phase Ordering Rationale

- **取得可否がすべての前提**：研究 4 本が一致して「スパイク先行・go/no-go ゲート」を要求。ここを飛ばすと最大の手戻りが発生する
- **永続化なし(機能2) → 永続化あり(機能1) の順**：依存の少ない機能2 を先に出すことで、取得層 `lib/notes.ts` を低リスクで検証・安定化してから、キャッシュ層を重ねられる
- **責務分離の厳守**：機能2 を永続化しない／機能1 のみキャッシュ、という方針を混ぜないことで検証結果が読める（Anti-Pattern 2）
- **negative-result が一級市民**：Phase 1 で no-go なら以降は設計のみで停止し、文書化してクローズする経路を最初から持つ

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1（取得可否スパイク）:** 最重要。非公式・未文書化 API のため、実 cookie での本番 Vercel 到達性とレスポンス実形状を実証する必要あり。`/gsd:plan-phase --research-phase 1` 相当の実測作業がフェーズ本体
- **Phase 4（機能1）:** アバター URL のフィールド名・Note 自体のコメント取得可否（Post コメントより未成熟・UNCERTAIN）が未確定。Phase 1 の生 JSON 結果に依存して詳細が決まる

Phases with standard patterns (skip research-phase):
- **Phase 2（機能2）:** 既存 `fetchFeed.ts` の RSC fetch パターンの踏襲で、統合点は HIGH confidence
- **Phase 3（キャッシュ基盤）:** 既存 `articles.ts` + Supabase upsert + schema.sql 運用の確立パターン

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | ライブラリ層（`substack-api`）は Context7 検証で HIGH。Substack 側の安定性・認証は本質的に LOW |
| Features | MEDIUM | データ形状は複数の逆解析情報源で一致。ただし全機能が「取得可否」に依存、アバター等フィールド名は未確定 |
| Architecture | HIGH / MEDIUM | 既存コードベース統合点は HIGH（実コード参照）。Substack 非公式エンドポイント仕様は MEDIUM |
| Pitfalls | MEDIUM | 非公式 API 挙動は要実証。法務（ToS）・Vercel IP の anti-bot は HIGH 寄りの確度 |

**Overall confidence:** MEDIUM（PoC 自体が「不確実性を解消する」ことを目的にしているため、この MEDIUM は想定どおり）

### Gaps to Address

- **本番 Vercel からの到達性（最大ギャップ）:** ローカル成功 ≠ 本番成功。Phase 1 で preview/prod から実リクエストを撃って解消。解けなければ negative-result fallback で確定
- **コメント者アバター URL の実フィールド名（`photo_url` 等）:** 情報源で未確定。Phase 1 の生 JSON 採取で確定。それまで欠損前提（プレースホルダ）で設計
- **Note 自体のコメント取得可否:** Post コメントより未成熟・UNCERTAIN。取れなければ機能1 のスコープを「Post のコメント可視化」に読み替える分岐を要件で用意
- **認証 cookie の機能別要否と失効運用:** Phase 1 で機能ごとに実測。失効時の 401 検知 UI を Phase 4 で用意

## Sources

### Primary (HIGH confidence)
- Context7 `/jakub-k-slys/substack-api` — SubstackClient 設定、`profileForSlug`/`postForId`、`profile.notes()`/`post.comments()`、Comment/Note エンティティ定義
- 既存コードベース — `src/lib/fetchFeed.ts`, `src/lib/articles.ts`, `src/app/(main)/admin/page.tsx`, `supabase/schema.sql`, `src/middleware.ts`
- [Substack Developer API — support.substack.com](https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API) — 公式 API は LinkedIn 連携プロフィールのみ＝Notes/コメント非対応
- [Substack Terms of Use](https://substack.com/tos) — scraping/crawling/automated access/bulk copying を禁止

### Secondary (MEDIUM confidence)
- [No official API? How I reverse-engineered Substack API — slys.dev](https://iam.slys.dev/p/no-official-api-no-problem-how-i) — 生エンドポイント、cookie 認証、推奨ヘッダー、~1req/sec
- [Developing a Custom Substack Front-end — Matt Hagy](https://matthagy.substack.com/p/developing-a-custom-substack-front) — comment object フィールド（id/body/name/date/reactions/children）
- [NHagar/substack_api (Python)](https://github.com/NHagar/substack_api) — Limitations: API 予告なく変更/レート制限/ハンドル変更で旧エンドポイント404
- [Why Serverless Functions Get Challenged by Cloudflare](https://medium.com/@ceamkrier/why-serverless-functions-get-challenged-by-cloudflare-581181433d67) — serverless データセンター IP が anti-bot に検知される
- [403 Forbidden Web Scraping — Scrapfly](https://scrapfly.io/blog/posts/403-forbidden-web-scraping) — datacenter IP/JA3 TLS フィンガープリント/ヘッダーによる 403

### Tertiary (LOW confidence)
- WebSearch 集約: profile feed の各 item が `comment` object を内包し reactions/restacks/reply を持つ（要実測）
- コメント author の avatar 実フィールド名（`photo_url` 等）は未確定 — Phase 1 で生レスポンス採取が必要
- 内部メモリ: reference-substack-note-no-prefill — 不可能の確定自体が価値という前例（v1.9）

---
*Research completed: 2026-06-18*
*Ready for roadmap: yes*
