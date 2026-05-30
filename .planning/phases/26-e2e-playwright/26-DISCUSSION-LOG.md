# Phase 26: E2Eテスト（Playwright） - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 26-e2e-playwright
**Areas discussed:** Magic Link認証のテスト方法, テスト対象のSupabase環境, テストデータのseed/cleanup, CI連携の範囲

---

## Magic Link認証のテスト方法

| Option | Description | Selected |
|--------|-------------|----------|
| A) service_roleでセッション注入 | admin APIでテストユーザーのセッションを生成し、storageStateに認証Cookieを仕込んでログイン済み状態を作る。メール往復不要・高速・安定。 | ✓ |
| B) 実/auth/callbackを経由 | generateLinkで取得したトークンで実コールバック経路を通す。最も忠実だがPKCE/token_hash不一致回避の追加実装が必要。 | |
| C) ローカルメールキャッチャー | supabase CLIのローカルDockerスタック（Inbucket等）を新規導入し実メール受信してリンククリック。セットアップコスト大。 | |

**User's choice:** A) service_roleでセッション注入（推奨）
**Notes:** 現行 `/auth/callback` はPKCEの `?code=` を `exchangeCodeForSession` する実装で、`generateLink` の `token_hash` とは直接互換しない点を技術補足として提示。セッション注入により回避する。

---

## テスト対象のSupabase環境

| Option | Description | Selected |
|--------|-------------|----------|
| 専用テスト用cloudプロジェクト | 新規Supabaseプロジェクト + 既存migrations適用。本番と完全分離しINSERT/DELETEしても安全。 | ✓ |
| 既存dev・本番 + テスト専用データ | 今のプロジェクトにe2e_プレフィックスのテスト専用データを作る。セットアップ最小だが本番データを触るリスク。 | |
| supabase CLIでローカルDocker | ローカルPostgres+Authスタックを起動。完全隔離だがDocker依存・CIコスト大。 | |

**User's choice:** 専用テスト用cloudプロジェクト（推奨）
**Notes:** `/my` テストが member_teams へINSERT/DELETEを伴うためデータ汚染リスクを重視。

---

## テストデータのseed/cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| global-setupでseed + afterEachでcleanup | adminクライアントでテストユーザー・公開チーム・紐付けメンバーを冪等作成。可変なmember_teams行はafterEachで削除し再実行可能に保つ。 | ✓ |
| SQL seedスクリプト一括適用 | seed-e2e.sqlを宣言的に記述しスイート前に適用。差分リセットは別途必要。 | |
| 各テストでbeforeEach完全リセット | beforeEachでtruncate+再投入。分離性高いがRLS/外部キー順序が煩雑。 | |

**User's choice:** global-setupでseed + afterEachでcleanup（推奨）
**Notes:** 静的fixtureと可変データを分離管理する方針。

---

## CI連携の範囲

| Option | Description | Selected |
|--------|-------------|----------|
| ローカル実行のみ | 今回は `npx playwright test` がローカルで通るところまで。GitHub Actionsは別フェーズに切り出し。 | ✓ |
| GitHub Actionsも今回やる | PR/push時にPlaywrightを走らせるworkflow追加。Secrets登録・ブラウザinstall等の考慮が必要。 | |

**User's choice:** ローカル実行のみ（推奨）
**Notes:** success criteriaに忠実。CI組み込みはDeferred Ideasに記録。

---

## Claude's Discretion

- Playwright のディレクトリ構成・`playwright.config.ts` の詳細（baseURL・webServer起動方法）・テストファイル分割。
- セッション注入の具体的実装手段（D-01 の方針が満たされれば手法は問わない）。
- global-setup で作るテストユーザー/チームの具体値。

## Deferred Ideas

- GitHub Actions への CI 組み込み（別フェーズ）。
- `/auth/callback` ルート自体のE2E網羅（実コールバック経由のcode交換・pid自動紐付け）。
- supabase CLI ローカルスタック導入（完全ローカルE2Eが必要になった場合）。
