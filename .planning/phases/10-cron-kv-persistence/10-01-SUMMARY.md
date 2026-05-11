---
phase: 10-cron-kv-persistence
plan: "01"
subsystem: api
tags: [vercel-cron, upstash-redis, kv-persistence, rss-feed, next-js-app-router]

# Dependency graph
requires:
  - phase: 04-kv-migration
    provides: redis.ts / kvMembers.ts — Upstash KV接続基盤
  - phase: previous
    provides: fetchFeed.ts — fetchWithRetry 実装（タイムアウト5秒 + 1回リトライ）
provides:
  - Vercel Cron（1日1回 UTC 20:00）でRSS記事をKVに累積保存
  - kvArticles.ts — getArticles / saveArticles による記事KV操作
  - GET /api/cron — CRON_SECRET Bearer認証付きCronエンドポイント
  - addMemberAction 初回フィード取得・KV保存
  - fetchAllFeedsCached — unstable_cache廃止・KV直接読み込みに移行
affects: [11, page.tsx, member-page, calendar-view, heatmap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StoredFeed KVパターン: articles:{substackId} → { items: FeedItem[], imageUrl?: string }"
    - "!cronSecret チェック先行でCRON_SECRET未設定時の認証バイパスを防止"
    - "Promise.allSettled で複数メンバーのCron処理を1件失敗でも継続"
    - "article.link SetによるO(n) dedupe"

key-files:
  created:
    - src/lib/kvArticles.ts
    - src/app/api/cron/route.ts
    - vercel.json
  modified:
    - src/lib/fetchFeed.ts
    - src/app/admin/actions.ts

key-decisions:
  - "KV構造を StoredFeed（items + imageUrl）にしてSubstackアイコンURLをKVに保存 — imageUrlも引き続き表示可能"
  - "fetchAllFeedsCachedのシグネチャ維持 — page.tsx / member/[substackId]/page.tsx の変更ゼロ"
  - "fetchWithRetry 失敗時は { items: [] } を返す（例外なし）→ 登録成功・KV空のまま・次Cronで補填"
  - "article.link でdedupe（linkなしアイテムは dedupe 対象外）"

patterns-established:
  - "Pattern: Vercel Cron Bearer認証 — !cronSecret チェック先行"
  - "Pattern: KV累積保存 — Setによるlink dedupe + imageUrl最新値で上書き"

requirements-completed: [PERSIST-01, PERSIST-02, PERSIST-03]

# Metrics
duration: 12min
completed: 2026-05-11
---

# Phase 10 Plan 01: Cron + KV記事永続化 Summary

**Vercel Cron（UTC 20:00/JST翌5:00）でRSS記事をUpstash KVに累積保存し、unstable_cacheを完全廃止してKV直接読み込みに移行**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-11T08:18:34Z
- **Completed:** 2026-05-11T08:30:00Z
- **Tasks:** 5 (4 implementation + 1 build verification)
- **Files modified:** 5

## Accomplishments
- `kvArticles.ts` 新設 — `getArticles` / `saveArticles` によるKV記事操作（dedupe + imageUrl保存）
- `fetchFeed.ts` を `unstable_cache` から KV直接読み込みに完全移行（シグネチャ維持で呼び出し元変更ゼロ）
- `GET /api/cron` 新設 — CRON_SECRET Bearer認証 + Promise.allSettled による堅牢なフィード取得・KV保存
- `addMemberAction` に初回フィード取得・KV保存を追加（登録直後にKVが埋まる）
- TypeScript コンパイルエラー 0 件

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: kvArticles.ts 新設** - `96ee934` (feat)
2. **Task 2: fetchFeed.ts KV移行** - `a497830` (feat)
3. **Task 3: Cron APIルート + vercel.json 新設** - `94a8673` (feat)
4. **Task 4: addMemberAction 初回KV保存追加** - `c2ede48` (feat)
5. **Task 5: TypeScript ビルド確認** — コミットなし（エラー 0 件のため）

## Files Created/Modified
- `src/lib/kvArticles.ts` — StoredFeed型、getArticles（KV読み込み）、saveArticles（dedupe + 累積保存）
- `src/lib/fetchFeed.ts` — unstable_cache廃止、fetchWithRetry export化、fetchAllFeedsCachedをKV読み込みに変更
- `src/app/api/cron/route.ts` — GET Cronエンドポイント（Bearer認証 + Promise.allSettled）
- `vercel.json` — Cron設定（UTC 20:00、Hobbyプラン対応1日1回）
- `src/app/admin/actions.ts` — addMemberAction に fetchWithRetry + saveArticles 追加

## Decisions Made
- `imageUrl` もKVに保存（StoredFeed型）— Substackアイコンが引き続き表示される。RESEARCHのPitfall 5で「imageUrlが undefined になる」との懸念があったが、プランの設計指示（D-01）に従い imageUrl を含む StoredFeed 型に統一
- `fetchAllFeedsCached` のシグネチャ維持 — `page.tsx` および `member/[substackId]/page.tsx` の変更ゼロを実現
- `!cronSecret` チェック先行 — CRON_SECRET未設定時の認証バイパスを防止（T-10-05対応）
- `Promise.allSettled` 採用 — 1件のフィード取得失敗で全体が止まらない設計（T-10-03対応）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

### CRON_SECRET 環境変数の設定

Vercelダッシュボードで以下の設定が必要です:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. `CRON_SECRET` を追加（値: ランダムな文字列、例: `openssl rand -hex 32` で生成）
3. Environments: Production / Preview / Development すべてにチェック
4. Save

### 動作確認（curl コマンド）

```bash
# ローカル確認（開発サーバー起動後）
curl -X GET http://localhost:3000/api/cron \
  -H "Authorization: Bearer <CRON_SECRET>"
# 期待: { "ok": true, "count": N }

# 認証なしで 401 を確認
curl -X GET http://localhost:3000/api/cron
# 期待: Unauthorized (401)
```

### Substackアイコンについて

`imageUrl` は `StoredFeed` 型の一部としてKVに保存されます（`articles:{substackId}` キー）。
Cronまたは `addMemberAction` 実行時に最新の `imageUrl` がKVに書き込まれるため、
Substackアイコンは引き続き表示されます。

## Next Phase Readiness
- Vercel本番環境に `CRON_SECRET` を設定すればCronが即座に動作開始
- 初回Cron実行まではKVが空のため、管理画面でメンバーを登録し直すか手動でcurlを実行することで即座にKVを埋められる
- カレンダービュー・ヒートマップは `fetchAllFeedsCached` がKVから読み込むため、KVに記事が蓄積されれば自動的に過去記事が表示される

## Self-Check: PASSED

- FOUND: src/lib/kvArticles.ts
- FOUND: src/lib/fetchFeed.ts
- FOUND: src/app/api/cron/route.ts
- FOUND: vercel.json
- FOUND: src/app/admin/actions.ts
- FOUND: .planning/phases/10-cron-kv-persistence/10-01-SUMMARY.md
- FOUND commit 96ee934 (Task 1)
- FOUND commit a497830 (Task 2)
- FOUND commit 94a8673 (Task 3)
- FOUND commit c2ede48 (Task 4)

---
*Phase: 10-cron-kv-persistence*
*Completed: 2026-05-11*
