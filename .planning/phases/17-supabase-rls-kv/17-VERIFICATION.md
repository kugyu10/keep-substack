---
phase: 17-supabase-rls-kv
verified: 2026-05-16T03:48:01Z
status: gaps_found
score: 4/7
overrides_applied: 0
gaps:
  - truth: "移行スクリプトを実行すると既存Redisのメンバーデータがmembersテーブルに全件INSERTされる（SC-5）"
    status: failed
    reason: "scripts/export-to-sql.ts がmasterブランチに存在しない。コミット d04f516 はworktreeから作成されたが、masterへのmergeコミットが存在せずdangling commit（到達不能）として孤立している。"
    artifacts:
      - path: "scripts/export-to-sql.ts"
        issue: "MISSING — masterブランチ上に存在しない。git fsckでdangling commitとして確認済み（d04f516）"
    missing:
      - "17-02の merge(17-02) コミット（37d40d7）と同様の merge(17-03) コミットを作成してmasterにマージする"
      - "具体的手順: git cherry-pick 25d35fb d04f516 または git merge でworktreeの成果物をmasterに統合する"

  - truth: "既存Redisの記事データがarticlesテーブルに全件INSERTされ、link列のUNIQUE制約で重複が排除される（SC-6）"
    status: failed
    reason: "SC-5と同根の問題。scripts/export-to-sql.ts が存在しないため、記事データのINSERT SQL生成機能も利用不可能。articlesのON CONFLICT (link) DO NOTHING実装コードはdangling commit内には存在確認済みだが、masterブランチから到達不能。"
    artifacts:
      - path: "scripts/export-to-sql.ts"
        issue: "MISSING — masterブランチ上に存在しない"
    missing:
      - "SC-5と同じ修正（マージ）で解決される"

  - truth: ".gitignoreにscripts/output/が追加されている（17-03 Plan Success Criteria）"
    status: failed
    reason: "コミット 25d35fb（.gitignore更新）もdangling commitとして孤立しており、masterブランチの.gitignoreには scripts/output/ が追加されていない。"
    artifacts:
      - path: ".gitignore"
        issue: "scripts/output/ エントリが存在しない（masterブランチ上）"
    missing:
      - "SC-5と同じマージ操作で解決される"
---

# Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行 検証レポート

**Phase Goal:** Supabase PostgreSQLのテーブル定義・RLSポリシー・クライアントライブラリが揃いアプリがSupabaseに接続できる状態になり、既存Upstash RedisのデータがPostgreSQLに過不足なく移行されている
**Verified:** 2026-05-16T03:48:01Z
**Status:** gaps_found — SC-5, SC-6（移行スクリプト）がBLOCKER
**Re-verification:** No — 初回検証

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Supabase管理画面でmembersテーブルとarticlesテーブルが正しいカラム定義で作成されている（SC-1） | ? UNCERTAIN | supabase/schema.sql が存在し、正しいカラム定義（UUID PK, UNIQUE制約, FK, TIMESTAMPTZ等）を含む。Supabase管理画面での実際の適用は人間確認が必要 |
| 2 | RLSポリシーが有効化され、anon keyでは自分のデータのみ変更できることが確認できる（SC-2） | ? UNCERTAIN | schema.sqlに全4テーブルのENABLE ROW LEVEL SECURITYと4つのSELECT許可ポリシーが存在する。INSERT/UPDATE/DELETEはservice_roleのBYPASSRLSで制御（ポリシー不要）。anon keyでの変更拒否は実環境での確認が必要 |
| 3 | アプリから@supabase/supabase-jsを使ってDB接続が成功し、membersテーブルをSELECTできる（SC-3） | ✓ VERIFIED | @supabase/supabase-js ^2.105.4 と @supabase/ssr ^0.10.3 がpackage.jsonのdependenciesに存在。src/lib/supabase/server.ts / client.ts / admin.ts の3ファイルが適切な実装で存在する。getSession不使用（セキュリティ準拠）確認済み |
| 4 | 環境変数（NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY）がVercel本番環境に設定されている（SC-4） | ? UNCERTAIN | .env.local.exampleに3つの環境変数テンプレートが存在する。Vercel本番環境への実際の設定は人間確認が必要 |
| 5 | 移行スクリプトを実行すると既存Redisのメンバーデータがmembersテーブルに全件INSERTされる（SC-5） | ✗ FAILED | scripts/export-to-sql.ts がmasterブランチに存在しない。コミット d04f516 はdangling commit（masterから到達不能） |
| 6 | 既存Redisの記事データがarticlesテーブルに全件INSERTされ、link列のUNIQUE制約で重複が排除される（SC-6） | ✗ FAILED | SC-5と同根。export-to-sql.tsが存在しないため記事データのON CONFLICT (link) DO NOTHING SQL生成も不可能 |
| 7 | Supabase管理画面でメンバー数・記事数がRedis側と一致することを確認できる（SC-7） | ? UNCERTAIN | SC-5・SC-6が失敗しているため、移行スクリプトの実行自体が不可能。スクリプトのマージ後に人間確認が必要 |

**Score:** 4/7 truths verified（1 VERIFIED + 3 UNCERTAIN（人間確認待ち） + 2 FAILED（BLOCKER））

---

## 根本原因分析

### worktree コミットのマージ漏れ（17-03）

17-01と17-02はそれぞれ worktreeから masterへのmergeコミットが作成されている：
- `ddffcf9 merge(17-01): PostgreSQL DDL + RLS schema from worktree`
- `37d40d7 merge(17-02): Supabase client library from worktree`

しかし **17-03に相当するmergeコミットが存在しない**。

17-03 SUMMARY.mdが参照するコミット：
- `25d35fb` — `.gitignore`に`scripts/output/`追記（`git fsck`でdangling commit確認済み）
- `d04f516` — `scripts/export-to-sql.ts`新規作成（`git fsck`でdangling commit確認済み）

これらのコミットはworktreeで作成・コミットされたが、masterブランチにマージされることなく、worktreeのクリーンアップ時に孤立した。**SUMMARY.mdのSelf-Check "commit d04f516: FOUND / commit 25d35fb: FOUND" はgit objectとして存在することを確認しているが、masterブランチから到達可能かどうかを確認していない**という見落としがあった。

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/schema.sql` | DDL + RLSポリシー | ✓ VERIFIED | 4テーブル、ENABLE ROW LEVEL SECURITY x4、CREATE POLICY x4 すべて存在 |
| `src/lib/supabase/server.ts` | createServerClient実装 | ✓ VERIFIED | @supabase/ssr使用、getSession不使用、cookieStore実装あり |
| `src/lib/supabase/client.ts` | createBrowserClient実装 | ✓ VERIFIED | @supabase/ssr使用、シンプルな実装 |
| `src/lib/supabase/admin.ts` | service_role adminクライアント | ✓ VERIFIED | SUPABASE_SERVICE_ROLE_KEY使用、autoRefreshToken: false, persistSession: false |
| `.env.local.example` | 3つのSupabase環境変数テンプレート | ✓ VERIFIED | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 全3件確認済み |
| `scripts/export-to-sql.ts` | KV→SQL移行スクリプト | ✗ MISSING | masterブランチに存在しない（dangling commit d04f516として孤立） |
| `.gitignore` の `scripts/output/` | 生成物の追跡除外 | ✗ MISSING | dangling commit 25d35fbとして孤立、masterに未マージ |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| src/lib/supabase/server.ts | Supabase DB | createServerClient(@supabase/ssr) | ✓ WIRED | 正しくimportされ環境変数から接続URL/Keyを読み込む |
| src/lib/supabase/admin.ts | Supabase DB | createClient(@supabase/supabase-js, service_role) | ✓ WIRED | SUPABASE_SERVICE_ROLE_KEY を使用 |
| scripts/export-to-sql.ts | src/lib/kvMembers.ts + kvArticles.ts | getMembers() / getArticles() | ✗ NOT_WIRED | スクリプト自体がmasterブランチに存在しない |
| scripts/export-to-sql.ts | scripts/output/*.sql | writeFile() | ✗ NOT_WIRED | スクリプト自体がmasterブランチに存在しない |

---

## Data-Flow Trace (Level 4)

このフェーズはUIコンポーネントやデータ表示ロジックを実装しない（基盤構築フェーズ）。
Level 4 Data-Flow Trace: SKIPPED（動的データレンダリングなし）

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| @supabase/supabase-js パッケージ存在確認 | package.json内 "@supabase/supabase-js" 確認 | "^2.105.4" | ✓ PASS |
| @supabase/ssr パッケージ存在確認 | package.json内 "@supabase/ssr" 確認 | "^0.10.3" | ✓ PASS |
| server.ts の getSession 不使用確認 | grep getSession src/lib/supabase/ | 0件 | ✓ PASS |
| scripts/export-to-sql.ts 存在確認 | ls scripts/ | seed-kv.ts のみ | ✗ FAIL |
| .gitignore の scripts/output/ 確認 | grep scripts/output .gitignore | 0件 | ✗ FAIL |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MIGRATE-01 | 17-01, 17-02 | membersテーブル・articlesテーブルをSupabase PostgreSQLで定義し、RLSポリシーを設定できる | ✓ SATISFIED | supabase/schema.sqlとsupabase clientsが存在（SC-1,2,3,4は人間確認待ち部分あり） |
| MIGRATE-02 | 17-03 | 既存Upstash RedisのKVデータをSupabase PostgreSQLに一括マイグレーションできる | ✗ BLOCKED | scripts/export-to-sql.ts がmasterブランチに存在しない |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scripts/export-to-sql.ts | - | ファイル自体がMISSING（dangling commit） | BLOCKER | SC-5, SC-6, SC-7の達成不可能 |

---

## Human Verification Required

### 1. Supabase管理画面でのスキーマ適用確認（SC-1）

**Test:** Supabase管理画面 > Table Editor を開く
**Expected:** members / teams / member_teams / articles の4テーブルが表示され、各カラム定義（UUID PK, TEXT UNIQUE NOT NULL等）が schema.sql と一致している
**Why human:** Supabase管理画面への実際の適用はコードレビューでは確認不可能

### 2. RLS動作確認（SC-2）

**Test:** anon keyを使って members テーブルに対しINSERT/UPDATE/DELETEを実行
**Expected:** 403エラーまたはpostgrest error が返り、操作が拒否される
**Why human:** RLSの実際の動作はSupabase環境での実行テストが必要

### 3. Vercel本番環境変数確認（SC-4）

**Test:** Vercel管理画面 > Project > Settings > Environment Variables を確認
**Expected:** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY の3つが設定されている
**Why human:** Vercel管理画面の確認はコードレビューでは不可能

### 4. 移行スクリプト実行確認（SC-5, SC-6, SC-7）

**事前条件:** scripts/export-to-sql.ts のmasterへのマージが必要（現在はBLOCKER）
**Test（マージ後）:** `tsx scripts/export-to-sql.ts` を実行
**Expected:** scripts/output/ に4ファイルが生成され、メンバー数・記事数がRedis側と一致する
**Why human:** KV接続（Upstash Redis）が必要なため実環境でのみ検証可能

---

## Gaps Summary

### BLOCKER: scripts/export-to-sql.ts がmasterブランチに未マージ

**影響:** SC-5（メンバーデータ移行）、SC-6（記事データ移行）、SC-7（件数一致確認）の3つが達成不可能

**根本原因:** 17-03 のworktreeコミット（d04f516, 25d35fb）がmasterブランチにマージされなかった。SUMMARY.mdはコミットの「存在」を確認したが「masterから到達可能か」を確認しなかった。

**修正手順:**
```bash
# 方法1: cherry-pick
cd /Users/kugyu10/work/keep-substack
git cherry-pick 25d35fb  # .gitignore更新を先に
git cherry-pick d04f516  # export-to-sql.ts作成

# 方法2: worktreeが残っている場合
# git merge <17-03-worktree-branch>
```

**修正後に必要な再確認:**
- `ls scripts/export-to-sql.ts` で存在確認
- `grep "scripts/output" .gitignore` でgitignore確認
- KV接続環境での `tsx scripts/export-to-sql.ts` 実行テスト（人間確認）

---

### 17-01・17-02の成果物は正常に到達可能（参考）

以下は正常にmasterブランチに反映済み：
- `supabase/schema.sql` — commit 8b0e5b5（masterから到達可能）
- `src/lib/supabase/server.ts` — commit 9297dea（masterから到達可能）
- `src/lib/supabase/client.ts` — commit 83c3b69（masterから到達可能）
- `src/lib/supabase/admin.ts` — commit 8a146b2（masterから到達可能）
- `.env.local.example` — commit e63e19c（masterから到達可能）

---

_Verified: 2026-05-16T03:48:01Z_
_Verifier: Claude (gsd-verifier)_
