# Research Summary: v1.5 Member Auth + Supabase Migration

**Project:** keep-substack
**Domain:** Substack継続コミュニティ向けRSS活動可視化ツール
**Researched:** 2026-05-16
**Confidence:** HIGH

## Executive Summary

v1.5のコアテーマは「管理者依存の排除」と「データ基盤の刷新」の2軸を同時に進めることにある。Upstash RedisをSupabase PostgreSQLへ移行することでAuth統合・長期履歴・RLS（行レベルセキュリティ）が初めて実現し、メンバーが自律的にプロフィールを管理できるようになる。認証方式はMagic Link（メールOTP）一択とし、パスワード管理のUXコストを排除するKISS原則に合致した設計を採用する。新規追加パッケージは`@supabase/supabase-js ^2.105.4`と`@supabase/ssr ^0.10.3`の2つのみで、`@upstash/redis`を削除する。

移行戦略の最重要原則は「段階的デプロイ」である。RedisとSupabaseを並行稼働させ、データ整合性を確認しながら読み取り→書き込み→削除の順に切り替える3フェーズ移行を守ることで、ダウンタイムなしに本番環境を移行できる。既存の`getMembers`/`getArticles`等の関数シグネチャは変更せず、内部実装のみを差し替えることで呼び出し元への影響をゼロに抑える（v1.3のfetchAllFeedsCachedシグネチャ維持の教訓を踏襲する）。

最大リスクはミドルウェア移行時の認証競合とCronタイムアウトの2点である。`middleware.ts`はNext.js 16対応で`proxy.ts`に改名が必要であり、既存のBasic Auth（/admin保護）とSupabase Auth（/my保護）を同一ファイルで合成する設計が求められる。またCronの並列フィードフェッチとSupabase INSERT追加でVercel Hobby枠の10秒タイムアウトに抵触するリスクがあり、`maxDuration`設定と`Promise.allSettled`による並列化を事前に対処する必要がある。

---

## Stack Additions

### 追加するパッケージ

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | `^2.105.4` | SupabaseクライアントDB操作・Auth |
| `@supabase/ssr` | `^0.10.3` | Next.js App Router向けSSRセッション管理 |

```bash
npm install @supabase/supabase-js @supabase/ssr
npm uninstall @upstash/redis
```

### 削除するパッケージ

| Package | 理由 |
|---------|------|
| `@upstash/redis` | Supabase PostgreSQLへ完全移行するため不要 |

### 追加しない（YAGNI）

- `@supabase/auth-helpers-nextjs` — 非推奨。`@supabase/ssr`で完全代替済み
- Prisma / Drizzle ORM — Supabase JS Clientで十分
- `react-hook-form` / `zod` — 既存パターンで対応可能
- Supabase Storage / Real-time — ISR+Cronで十分

### 新規環境変数

| Variable | 公開 | 用途 |
|----------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Supabaseプロジェクトエンドポイント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | RLSで制御、公開安全 |
| `SUPABASE_SERVICE_ROLE_KEY` | NO | Cron・マイグレーション専用（RLSバイパス） |

---

## Feature Table Stakes

### Supabase Auth + メンバー自己管理（コア）

| 機能 | 理由 |
|------|------|
| Magic Linkログイン（メールOTP） | パスワードUI不要、KISS原則に合致 |
| ログイン後プロフィール編集（substackId・チーム） | 管理者依存排除の核心 |
| ログアウト機能 | セッション管理の基本 |
| 未ログインで/myにアクセス不可 | セキュリティ最低ライン |
| 公開ページ（ヒートマップ）は認証なし閲覧可 | v1.0からの要件を壊さない |
| 自分のデータのみ編集可（RLS） | 他人のプロフィール変更を防ぐ |

### 長期記事履歴

| 機能 | 理由 |
|------|------|
| 記事をappend-onlyで永続保存 | 1ヶ月以上のヒートマップ実現 |
| URLによるdeduplication | 既存ロジックをUNIQUE制約で維持 |
| Vercel Cron日次フィード取得継続 | v1.3から稼働中、書き込み先変更のみ |
| pubDateのUTC保存・JST表示 | タイムゾーン正規化 |

### 管理画面チーム管理UI

| 機能 | 理由 |
|------|------|
| チェックボックスでチーム選択 | カンマ区切りタイポ問題の根本解決 |
| 既存チーム名リストから選択 | タイポ・大文字小文字不一致を防ぐ |
| チームなし状態を許容 | `teamNames: []`が有効な状態として維持 |

### Defer（v1.5スコープ外）

- 年間ヒートマップ（GitHub草型） — データ蓄積1ヶ月以上が前提
- 承認制メンバー登録フロー — 信頼ベースコミュニティで当面不要
- ストリーク表示 — データ蓄積後にv1.6で対応

---

## Architecture Notes

### Key Integration Patterns

**Supabaseクライアント3種類の使い分け:**

| ファイル | クライアント種別 | 用途 |
|---------|----------------|------|
| `src/lib/supabase/server.ts` | `createServerClient`（anon key） | Server Component・Server Action |
| `src/lib/supabase/client.ts` | `createBrowserClient`（anon key） | Client Component（ログインUIなど） |
| `src/lib/supabase/admin.ts` | `createClient`（service role key） | Cron・マイグレーションのみ |

**重要ルール:**
- Server Componentでのユーザー確認は必ず`getUser()`を使う（`getSession()`はセキュリティホール）
- `SUPABASE_SERVICE_ROLE_KEY`はClient Componentに絶対インポートしない
- 公開ISRページ（`/`、`/member/[substackId]`）ではSupabase Authクライアントを使わない

**認証ルートと公開ルートの完全分離:**

```
/                       ISR（revalidate=300）— 認証なし
/member/[substackId]    ISR — 認証なし
/my/*                   force-dynamic — Supabase Auth保護
/admin/*                Basic Auth継続
/login                  Static — ログインフォーム
/auth/callback          Route Handler — PKCEコード交換
```

**メンバー自己リンクフロー（KISS選択）:**
1. メンバーがMagic Linkでログイン
2. `/my`ページで自分の`substackId`を入力してプロフィールを紐付け
3. `members.user_id = auth.users.id`が確立される
4. 以降は`user_id`でRLSが自分のデータのみ編集を許可

**Next.js 16対応（必須変更）:**
- `src/middleware.ts` → `src/proxy.ts`（`middleware()`→`proxy()`）にリネーム
- Edge Runtimeは`proxy.ts`で非サポート（Node.js固定）→ Supabase SSRが正常動作

### Build Order Recommendation

依存関係に基づく実装順序（5フェーズ）:

1. **Supabase Setup + Schema** — プロジェクト作成・テーブル定義・RLS・環境変数設定
2. **Data Migration（Redis→Supabase）** — 移行スクリプト実行・デュアルライト1Cronサイクル検証
3. **Data Layer Swap** — 読み取りをSupabaseに切り替え・確認後にRedisを廃止・proxy.tsリネーム
4. **Supabase Auth** — Magic Linkログイン・`/my`ページ・メンバー自己リンク
5. **Admin UI Checkbox + Cleanup** — チェックボックスUI・Redisパッケージ削除・不要ファイル削除

Admin UI Team Checkboxは既存KVのままでも実施可能なため、最序盤（Phase 1前）に先行実装するとリスク分散になる。

---

## Watch Out For

### 1. デュアルライトなしの一括切り替え（最大リスク）

**何が起きるか:** Redis→Supabaseを一括切り替えするとデプロイ瞬間にデータが空になる。ISRキャッシュが古いデータを返し続けるため一見動作するが、再ビルドで全404になる。

**対策:** 必ず段階デプロイを守る。Supabaseデータ投入→読み取り先切替→書き込み先切替→Redis削除の順番を崩さない。少なくとも2Cronサイクル後にRedisを削除する。

### 2. `getSession()`をサーバーサイドで使用（セキュリティホール）

**何が起きるか:** `getSession()`はCookieを無検証で信頼する。攻撃者が偽造Cookieで認証済みのふりができる。

**対策:** サーバーサイドでのユーザー確認は必ず`supabase.auth.getUser()`を使う。`getSession()`はClient Componentでの表示確認用のみ。

### 3. ISRページにAuth処理が混入→CDNセッション漏洩

**何が起きるか:** ISRページでセッションrefreshが起きると`Set-Cookie`ヘッダーがVercel CDNにキャッシュされ、別ユーザーのセッションが漏洩する。

**対策:** 公開ページ（`/`、`/member/*`）ではSupabase Authクライアントを一切使わない。認証が必要なページには`export const dynamic = 'force-dynamic'`を設定する。

### 4. middleware競合（Basic Auth + Supabase Auth）

**何が起きるか:** Supabase推奨の広域matcherに書き換えると既存のBasic Authロジックが消えるか、無限リダイレクトループが発生する。

**対策:** `proxy.ts`内でパスを明示的に分岐。`/admin`はBasic Auth、`/my`はSupabase Authセッション確認を合成する構造にする。matcherは広域を採用し内部でルート分岐させる。

### 5. Cron 10秒タイムアウト（Vercel Hobby枠）

**何が起きるか:** 50人フィードの逐次フェッチ（約10秒）にSupabase INSERT追加でVercel Hobby枠の10秒タイムアウトを超過する。

**対策:** `export const maxDuration = 60`を`cron/route.ts`に設定し、フィードフェッチを`Promise.allSettled`で並列化する。Supabase接続枯渇との兼ね合いでTransaction Pooler（port 6543）必須。

---

## Open Questions

実装開始前に決定が必要な未解決事項。

| 質問 | 影響範囲 | 推奨アクション |
|------|---------|---------------|
| メンバー自己リンクの「なりすまし」対策をどこまで行うか | `/my/actions.ts`の`linkMemberAccount` | `user_id is null`チェックのみで十分か検討。悪意ある上書きは管理者が手動削除で対応する方針なら実装シンプル化可 |
| `proxy.ts`のNext.js 16移行タイミング | Phase 3 or Phase 4 | Auth追加前（Phase 3）に済ませると混乱が少ない。ARCHITECTURE.mdもPhase 3同時実施を推奨 |
| Supabase Free Tier「7日間停止」をどう保証するか | Supabaseプロジェクト継続性 | Cronが毎日DB書き込みすれば自動回避。Cronが停止した場合のGitHub Actions ping設定を検討する |
| Vercel `maxDuration = 60`はHobbyプランで機能するか | Cronタイムアウト対策 | Vercel Hobbyは最大60秒まで設定可能とされるが、Vercelダッシュボードで実際に確認する |
| Magic Linkレート制限（3通/時間・60秒間隔）のUI告知 | `/login`ページ | ログインフォームに説明文を入れるだけでよい。実装コスト低 |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm確認済み（2026-05-16）。バージョン確定。非推奨パッケージの特定完了 |
| Features | HIGH | 既存コードベース実地確認 + Supabase公式ドキュメント。優先順位明確 |
| Architecture | HIGH | Next.js 16公式・Supabase SSR Context7・公式ドキュメントで検証済み |
| Pitfalls | HIGH | Supabase公式・Vercel公式・GitHub Discussion実例まで確認済み |

**Overall confidence:** HIGH

### Gaps to Address

- **`maxDuration = 60`のHobbyプラン有効性:** Vercelダッシュボードで実際の設定値を確認する（Phase 1開始時）
- **RLSポリシーの詳細設計:** スキーマ概要は確定しているが、自己リンクフロー中の権限遷移（user_id = null → user_id設定）のポリシー実装詳細は実装時に確認が必要
- **Supabase Auth Emailレート制限（3通/時間）の体験影響:** ローンチ時に複数人が同時サインアップした場合の対応策（OAuth追加など）を要検討

---

## Sources

### Primary（HIGH confidence）

- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.105.4確認済み（2026-05-16）
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) — v0.10.3確認済み（2026-05-16）
- [Supabase SSR Context7](https://context7.com/supabase/ssr/llms.txt) — Next.js App Router統合パターン
- [Supabase Auth Server-Side Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — getUser()必須の根拠、middleware設定
- [Supabase Auth Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless) — signInWithOtp仕様、レート制限
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — middleware→proxy、revalidateTag変更（2026-05-13更新）
- [Supabase Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — Supavisor Transaction Mode、port 6543
- [Supabase RLS GitHub](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx) — auth.uid()ポリシーパターン

### Secondary（MEDIUM confidence）

- [Supabase Free Tier Limits 2026](https://aiagencyplus.com/supabase-free-tier-limits/) — 接続数上限25〜30直接/200プーラー
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — Hobby 10秒タイムアウト
- [GitHub Discussion #81445](https://github.com/vercel/next.js/discussions/81445) — cookies()非同期問題（未解決報告あり）
- [Supabase Discussion #18986](https://github.com/orgs/supabase/discussions/18986) — 接続枯渇実例
- [Supabase Troubleshooting Next.js Auth](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) — ISRキャッシュ漏洩、CDNセッション問題

### Tertiary（LOW confidence）

- [Prevent Supabase Free Tier Pausing](https://shadhujan.medium.com/how-to-keep-supabase-free-tier-projects-active-d60fd4a17263) — 7日間停止回避策（実装時に公式で再確認推奨）

---

*Research completed: 2026-05-16*
*Ready for roadmap: yes*
