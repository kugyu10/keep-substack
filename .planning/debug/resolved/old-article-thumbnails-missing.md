---
slug: old-article-thumbnails-missing
status: resolved
trigger: "昔の記事のサムネイルが消えている　Feedは20〜30までしか保存してないので　サムネイル保存場所は？"
created: 2026-05-30
updated: 2026-05-30
---

# Debug: 古い記事のサムネイルが消えている

## Symptoms

- **Expected:** 古い記事（ヒートマップのツールチップ/記事一覧/ポップオーバー）にもサムネイル画像が表示される
- **Actual:** 古い記事のサムネイル画像が表示されない（消えている）
- **Where observed:** 記事一覧 / ヒートマップのツールチップ等のポップオーバー
- **Timeline:** 以前は表示されていた → 最近消えた（リグレッション）
- **Scope:** articlesテーブルに image_url は存在するが、古い行で NULL/空のまま残っている
- **User hypothesis:** RSS Feedは最新20〜30件しか返さないため、古い記事はFeedから落ちてサムネイルURLが取得できない。

## Current Focus

hypothesis: (確定) サムネイルは articles.image_url に永続保存される設計だが、saveArticles の upsert が ON CONFLICT (link) DO NOTHING のため既存行の image_url を二度と更新（バックフィル）しない。古い記事は live feed から落ちると DB の image_url（過去にNULL/空で保存された値）しか参照できず、サムネイルが消える。
test: スキーマ・cron永続化・fetchAllFeedsCachedのlive/DBマージ・表示経路を追跡
expecting: 既存行の image_url が更新されない経路があるはず
next_action: (done)

## Evidence

- timestamp: 2026-05-30 — supabase/schema.sql:32-39 — `articles` テーブルに `image_url TEXT` カラムが存在。サムネイルは**DBに永続化される設計**。ユーザー仮説の「保存場所が無い」は否定される。
- timestamp: 2026-05-30 — src/lib/articles.ts:6-32 — `getArticles` は `articles.image_url` を SELECT し `thumbnail` にマップして返す。永続値の読み出しは正しく機能する。
- timestamp: 2026-05-30 — src/lib/articles.ts:54-63 — `saveArticles` の upsert が `{ onConflict: 'link', ignoreDuplicates: true }`。これは `ON CONFLICT (link) DO NOTHING` 相当（コメント line 43 が明示）。**一度INSERTされた行は二度とUPDATEされず、image_url のバックフィルが行われない**。← ROOT CAUSE
- timestamp: 2026-05-30 — src/lib/fetchFeed.ts:73-79 — `fetchAllFeedsCached` は `[...live.items, ...kv.items]` を link で重複排除（live優先）。よって live feed に残っている記事は毎回新鮮な thumbnail が使われ正常表示。feed から落ちた古い記事は DB(kv) の値のみ → image_url が空だとサムネイル無し。これが「新しい記事はOK、古い記事だけ消える」症状と一致。
- timestamp: 2026-05-30 — git log 1768c3d "refactor: extract thumbnail at fetch time, drop contentEncoded from cache, remove 30-item limit" — サムネイル抽出方式が途中で変更された。この変更**前**に保存された古い行は image_url が NULL/空のまま。DO NOTHING のため新方式でも上書きされない。リグレッションのタイミングと整合。
- timestamp: 2026-05-30 — src/lib/fetchFeed.ts / articles.ts / cron route に件数 slice/limit 無し（30件制限は 1768c3d で撤去済み）。DBは全記事を蓄積するため、ユーザー仮説「20〜30件しか保存してない」は不正確 — 件数ではなく image_url のバックフィル欠如が原因。

## Eliminated

- 「サムネイルの保存場所が無い」— 否定。articles.image_url に永続化される設計。
- 「DBが20〜30件しか保持していない」— 否定。件数制限は撤去済みで全記事蓄積される。

## Resolution

root_cause: サムネイル画像URL（articles.image_url）はDBに永続化される設計だが、saveArticles の upsert が `ON CONFLICT (link) DO NOTHING`（ignoreDuplicates: true）のため、既存記事行の image_url を一切バックフィル/更新しない。サムネイル抽出方式の変更前（git 1768c3d 以前）に空で保存された古い記事は、live feed から脱落すると DB の空 image_url しか参照できず、サムネイルが表示されなくなる。

fix: saveArticles の upsert を「重複時に値を更新する」挙動へ変更する。具体的には `ignoreDuplicates: true` を外し（onConflict: 'link' で merge-duplicates）、image_url 等のカラムを更新対象にする。NULL上書きを避けるため、image_url が無い場合は既存値を保持する設計が望ましい（例: thumbnail がある時だけ image_url を含めて upsert、または COALESCE 相当のロジック）。一度この修正を入れれば、cron 実行時に live feed に残っている記事の image_url がDBへバックフィルされ、その後 feed から落ちても正しいサムネイルが残る。

fix_applied: src/lib/articles.ts の saveArticles を thumbnail 有無で2グループに分割。withThumb は `{ onConflict: 'link' }`（ignoreDuplicates なし）で image_url 込み merge-duplicates → 既存行をバックフィル。withoutThumb は `{ onConflict: 'link', ignoreDuplicates: true }` で INSERT のみ → 既存 image_url の NULL 上書きを防止。PostgREST の「省略カラムが DEFAULT にリセットされる」落とし穴は、no-thumb グループを INSERT-only に保つことで回避。
verification: src/lib/__tests__/saveArticles.test.ts を新規追加（5テスト: merge挙動 / INSERT-only / 混在2回 / link無し除外 / members.image_url更新）。`npx vitest run` 29/29 GREEN（既存24 + 新規5）。`npm run build` 成功。
files_changed: [src/lib/articles.ts, src/lib/__tests__/saveArticles.test.ts]
recovery_note: 既にlive feedから脱落済みで空保存された古い記事はRSSから復元不可。必要なら別途ワンオフ再スクレイプが要る。修正後はcron実行ごとにfeed残存記事のimage_urlが順次バックフィルされる。
