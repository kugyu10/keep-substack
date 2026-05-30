# Phase 26: E2Eテスト（Playwright） - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Playwright を導入し、以下3つのユーザーフローを `npx playwright test` でローカルE2E検証できる環境を整える:

1. **Magic Linkログインフロー** — テスト用アカウントでログイン状態を確立できる
2. **`/my` の publicチーム参加・退出** — チェックボックス操作 → 保存 → DB反映（member_teams の INSERT/DELETE）
3. **`/admin` 保護** — 未認証アクセスが `/` にリダイレクトされる

既存の vitest ユニットテストは置き換えず、E2E層を**追加**する。アプリのプロダクションコード（proxy.ts・auth/callback 等）は変更しない（テストインフラの追加のみ）。

</domain>

<decisions>
## Implementation Decisions

### 認証方法（Magic Linkのテスト扱い）
- **D-01:** service_role を使った**セッション注入方式**を採用する。admin API でテストユーザーのセッションを生成し、Playwright の `storageState` に Supabase の認証Cookieを仕込んでログイン済み状態を作る。メール往復は完全にバイパスする。
- **D-02:** proxy.ts の `getUser()` は注入したセッションを**実セッションとして検証**するため、認証ガードのテストは本物の挙動を検証できる。ROADMAP success criteria #1 の「テスト用アカウント使用」に合致。
- **D-03:** 技術的留意点 — 現行 `/auth/callback` は PKCE の `?code=` を `exchangeCodeForSession` する実装。`admin.generateLink` は `token_hash`（`verifyOtp` 用）を返すため `code` フローとは直接互換しない。本フェーズではコールバック経由（B案）を採らず、セッション注入で回避する。`/auth/callback` ルート自体のE2E網羅は対象外。

### テスト環境
- **D-04:** **専用テスト用 Supabase cloud プロジェクト**を新規作成し、既存 `supabase/migrations/` を適用してスキーマを揃える。本番データと完全分離し、テストで member_teams への INSERT/DELETE をしても安全。
- **D-05:** テスト用の接続情報（URL / anon key / service_role key）は `.env.test`（または同等の仕組み）で本番設定と切り替える。secret はコミットしない。
- **D-06:** supabase CLI のローカルDockerスタックは**採用しない**（現状未導入・Docker依存とCIコストが大きいため）。

### テストデータ（seed / cleanup）
- **D-07:** **Playwright global-setup で seed** する。admin クライアントで「テストユーザー（auth）・公開チーム・user_id 紐付け済みテストメンバー」を冪等に作成する。
- **D-08:** 静的fixture（チーム・メンバー）と可変データ（member_teams）を分けて管理する。`/my` 参加退出テストが書き込む member_teams 行は各テストの **afterEach で削除**し、テストを再実行可能（idempotent）に保つ。
- **D-09:** beforeEach での全テーブル truncate 方式は採らない（RLS / 外部キー順序の取り回しが煩雑なため）。

### CI連携
- **D-10:** 今回のスコープは **ローカル `npx playwright test` が通ること**まで。GitHub Actions への組み込みは別フェーズに切り出す（下記 Deferred Ideas）。

### Claude's Discretion
- Playwright のディレクトリ構成（`e2e/` 等）・`playwright.config.ts` の詳細設定（baseURL、webServer で `next dev`/`next start` を起動するか等）・テストファイル分割は planner/executor の裁量。
- セッション注入の具体的実装（`admin.generateLink` + `verifyOtp` でトークン交換してCookie組み立て、あるいは別手法）は research/plan で最適手段を確定する。D-01 の「service_role でログイン済み storageState を作る」という方針が満たされれば手段は問わない。
- global-setup で作るテストユーザーのメールアドレス・チーム名等の具体値は executor 裁量（衝突しない命名を推奨）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 認証・保護の実装（テスト対象）
- `src/proxy.ts` — middleware。`/admin` は admin ロール必須、`/my` はログイン必須、いずれも未充足は `/` へリダイレクト。`matcher` は `/admin`, `/admin/:path*`, `/my`, `/my/:path*`。`getUser()` 使用（`getSession` 禁止）。
- `src/app/auth/callback/route.ts` — Magic Link コールバック。`exchangeCodeForSession(code)` + `pid` による member 自動紐付け。
- `src/app/login-51cf21389c56/` — 難読化されたログインページ（`page.tsx` / `LoginForm.tsx` / `actions.ts`）。
- `src/lib/authActions.ts` — 認証アクション。

### Supabase クライアント
- `src/lib/supabase/server.ts` — `createSupabaseServerClient`（SSR用）
- `src/lib/supabase/admin.ts` — `createSupabaseAdminClient`（service_role。E2E の seed / セッション注入で使用）
- `src/lib/supabase/client.ts` — ブラウザ用（推定。scout で確認）

### テスト対象ページ
- `src/app/my/page.tsx` / `MyProfileForm.tsx` / `LinkMemberForm.tsx` — `/my` の publicチーム参加退出UI
- `src/app/admin/` — 管理画面（保護リダイレクトのテスト対象）

### スキーマ・環境
- `supabase/migrations/` — テスト用プロジェクトへ適用するスキーマ（member_teams / teams(status) / members / member_publications を含む）
- `supabase/schema.sql` — スキーマ全体像
- `.env.example` — 必要な環境変数（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`）

### 既存テストの参考パターン
- `src/__tests__/proxy.test.ts` — proxy 保護のユニットテスト（E2Eと役割分担）
- `src/app/my/__tests__/` — `/my` のユニットテスト
- `src/app/admin/teams/__tests__/teamPage.test.tsx` — 管理画面テスト
- `package.json` — 現行テストランナーは vitest（`test: "vitest run"`）。Playwright を別スクリプトで追加する。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createSupabaseAdminClient`（`src/lib/supabase/admin.ts`）: service_role クライアント。global-setup の seed とセッション注入の両方で再利用できる。
- 既存 migrations 一式: テスト用プロジェクトのスキーマ構築にそのまま適用可能。
- vitest 既存テスト: E2Eと重複しない単体検証として併存（E2Eは結合フローに集中）。

### Established Patterns
- `getUser()` 必須・`getSession` 禁止（セキュリティ方針）。注入セッションも `getUser()` で検証される前提で設計する。
- Supabaseクライアント3種分離（server / client / admin）。テストコードでも admin は service_role 用途に限定する。
- ログインURL難読化 `/login-51cf21389c56/`。テストでこのパスを直接参照する場合は定数化を検討。

### Integration Points
- `proxy.ts` の `matcher` に列挙された `/admin`・`/my` 配下が保護テストの境界。
- `/my` の保存アクション → `member_teams` テーブル。afterEach cleanup はこのテーブルのテストユーザー行を対象にする。
- `next dev` または `next start` で起動したアプリに Playwright が接続（playwright.config の webServer で制御）。

</code_context>

<specifics>
## Specific Ideas

- ROADMAP success criteria（3つ）がそのまま受け入れ基準:
  1. `npx playwright test` で Magic Linkログインフローのテストが通る（モックまたはテスト用アカウント使用）
  2. `/my` の publicチーム参加・退出操作のテストが通る
  3. `/admin` への未認証アクセスが `/` にリダイレクトされることのテストが通る
- 認証は「メールを送らずテスト用アカウントでログイン済み状態を作る」方針で確定（D-01）。

</specifics>

<deferred>
## Deferred Ideas

- **GitHub Actions への CI 組み込み** — PR/push 時に Playwright を自動実行（secret 管理・ブラウザ install・テスト用Supabase接続をCIに用意）。本フェーズはローカル実行までとし、別フェーズで対応（D-10）。
- **`/auth/callback` ルート自体のE2E網羅**（実コールバック経由の `code` 交換・`pid` 自動紐付け検証）— セッション注入方式では通らない経路。必要なら別途。
- **supabase CLI ローカルスタック導入** — 完全ローカル/オフラインE2Eが必要になった場合の選択肢として保留（D-06）。

### Reviewed Todos (not folded)
- `1人が複数チームに所属できる多対多 — teamNames配列化`（2026-05-11）— 既に v1.3 で出荷済み。E2Eスコープ外のためfoldせず。
- `のちのちSupabase移行`（2026-05-11）— 既に v1.5 で出荷済み。キーワード一致による誤マッチ。foldせず。

</deferred>

---

*Phase: 26-e2e-playwright*
*Context gathered: 2026-05-30*
