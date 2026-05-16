# Feature Research: v1.5

**Domain:** Substack継続コミュニティ向けRSS活動可視化ツール
**Milestone:** v1.5 Member Auth + Supabase Migration
**Researched:** 2026-05-16
**Overall confidence:** HIGH (Supabase公式ドキュメント + 既存コードベース実地確認)

---

## Context: 既存アーキテクチャ (再調査不要)

v1.4時点の完成済み機能:
- `Member` 型: `{ name, substackId, teamNames: string[], addedAt }` (KV JSON配列)
- `kvMembers.ts`: `getMembers / addMember / deleteMember / updateMember`
- `kvArticles.ts`: `saveArticles / getArticles` (key=`articles:{substackId}`)
- 管理画面 `/admin`: Server Component + AdminAddForm + AdminMemberList (インライン編集)
- チーム: `teamNames: string[]` (カンマ区切りテキスト入力で設定)
- Basic Auth: `middleware.ts`（proxy.tsではなく実際にmiddleware.tsが現存）
- データ永続化: Upstash Redis（KV）

---

## Supabase Auth + Member Self-Management

### Table Stakes

メンバー自己管理を実現するために最低限必要な機能。欠けると「管理者依存から脱せない」。

| Feature | Why Expected | Complexity | 既存への依存 |
|---------|--------------|------------|------------|
| メールアドレスでのサインアップ/ログイン | パスワードレスのMagic Linkが最もFrictionが少ない。コミュニティ向けツールでパスワード管理は不要 | Med | `@supabase/ssr` 追加、middleware.ts更新 |
| ログイン後に自分のSubstack URLを登録/編集できるプロフィールページ | 自己管理の核心。管理者が手動でメンバー追加する運用を廃止する | Med | `kvMembers.updateMember` または Supabase profilesテーブルに移行 |
| ログイン後に自分のチーム所属を選択/変更できる | チーム管理の自律化。管理者の負担を直接減らす | Low-Med | 既存teamNamesフィールドの編集UIをメンバー向けに提供 |
| ログアウト機能 | セッション管理の基本。公共の場でのログアウト忘れ防止 | Low | Supabase Auth signOut |
| 未ログインユーザーはメンバー自己管理ページにアクセスできない | セキュリティの最低ライン。他人のSubstack URLを書き換えられてはならない | Low | middleware.tsのRoute保護 |
| ログインしていない状態でも公開ページ（ヒートマップ等）は閲覧できる | 公開ページの認証なし閲覧はv1.0からの要件。壊してはならない | Low | 既存ISRページは認証不要を維持 |
| 自分のデータのみ編集可能（他人のSubstack URLは変更不可） | 最小限のRow Level Security。substackIdと認証ユーザーの紐付けが必要 | Med | SupabaseのRLSポリシー or middleware側のチェック |

### Differentiators

あれば体験が向上するが、v1.5 MVPには必須でない。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| メンバー登録申請フロー（管理者承認制） | 不正メンバー登録を防ぐ。コミュニティの「閉じた感」を維持 | High | `status: pending/approved` フィールドが必要。管理者の通知フローも必要。v1.5ではスコープ外推奨 |
| Google/GitHub OAuthログイン | Magic Linkよりも手軽。ただし日本コミュニティではメールの方が馴染みやすい可能性 | Med | Supabase OAuth設定 + コールバックURL。メールMagic Linkで十分ならYAGNI |
| プロフィールページでの記事統計表示（自分の投稿数等） | ログインした自分のデータを見るモチベーション | Med | 既存ヒートマップデータの再利用 |

### Anti-Features (avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| パスワード認証 | パスワード管理のUXコスト高。コミュニティツールでは不要。「パスワードを忘れた」サポートが管理者負担になる | Magic Link（メールOTP）のみ |
| 管理者権限の全機能をメンバーに開放 | 他人の削除・substackId変更等は許可してはならない | RLSで自分のデータのみ編集可能に制限 |
| 招待コードや承認フローのv1.5実装 | Complexity高。コミュニティが信頼ベースで運営されている場合は不要 | 管理者が最終的に不正ユーザーを削除できれば十分 |
| Supabase AuthとBasic Authの二重管理 | 認証システムが2つ存在すると混乱。Basic Authは管理者専用に限定すべき | `/admin`はBasic Auth継続、メンバー自己管理は Supabase Auth |
| メンバー自己削除機能 | コミュニティからの脱退はコミュニティ管理の問題。自動削除するとデータが消える | 管理者が削除する運用を維持 |

### 依存関係と実装上の注意点

```
Supabase Auth (Magic Link)
  → @supabase/ssr パッケージ追加
  → middleware.ts: /member/settings/* ルート保護
  → 認証ユーザー ↔ substackId の紐付けテーブル（Supabase profiles）
  → プロフィール編集ページ /member/settings（新規）
  → 既存管理者向け /admin は Basic Auth を継続

データの紐付け方針（重要）:
  - Supabase profilesテーブルに substackId を保持
  - メンバーリスト（KV or Supabase members table）との整合性が必要
  - v1.5スコープ: Supabase Authだけ先に導入し、membersデータはKVのまま可
  - または Supabase完全移行（members → PostgreSQL table）と同時実施
```

**複雑度サマリー:** 全体としてMedium-High。Supabase Authの設定自体はLow-Medだが、KVとの整合性管理がボトルネック。

---

## Long-term Article History

### Table Stakes

1ヶ月以上の累積記事履歴を保存するための必須機能。欠けると「ヒートマップが直近7日しか見れない」問題が継続する。

| Feature | Why Expected | Complexity | 既存への依存 |
|---------|--------------|------------|------------|
| 記事データを日付付きで永続保存（append-only） | 現在のKV（`articles:{substackId}`）はすでにこのパターン。Supabase移行後も維持が必要 | Med | `kvArticles.saveArticles` のSupabase版実装 |
| 同一記事のURLによるdeduplication | 既存KV実装で解決済み（`existingLinks` SetでURL一致チェック）。PostgreSQLでもUNIQUE制約で対応 | Low | PostgreSQL UNIQUE(substackId, articleUrl) |
| Vercel Cronによる日次フィード取得継続 | v1.3から稼働中。移行後も日次でRSSを取得してDBに追記する仕組みを維持 | Low | Cron APIルートのDB書き込み先変更のみ |
| 月間・年間ビューの表示対応（ヒートマップ期間拡張） | 蓄積データがあれば過去1ヶ月のヒートマップが初めて実現する | Med | calendarUtils.ts の期間計算拡張 |
| 記事の公開日時（pubDate）の保存と時刻正規化 | 日本時間でのヒートマップ表示のため、タイムゾーン正規化が必要 | Low | 既存FeedItem.isoDateを使用、DBはUTC保存・表示時JST変換 |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 年間ヒートマップ（GitHub草型） | 長期継続の可視化。PROJECT.mdの "Active (Future)" 要件として記載済み | High | 365日分のデータが必要。UIコンポーネントも新規 |
| 月間・週次の投稿数トレンドグラフ | 個人の成長が時系列で見える | Med | recharts等のライブラリが必要 |
| 記事タイトル全文保存（現在はKVに保存済み） | 過去記事の検索・一覧表示に必要 | Low | 現行`FeedItem.title`をDBカラムに移行するだけ |
| ストリーク（連続投稿日数）計算と表示 | PROJECT.mdの "Active (Future)" 要件。蓄積データがあれば計算可能 | Med | 日単位の投稿有無フラグが必要。記事の日付データから算出 |

### Anti-Features (avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 記事本文（content:encoded）のフル保存 | データ量が膨大。Supabase無料枠（500MB）をすぐに消費する | タイトル・URL・pubDate・サムネURLのみ保存 |
| リアルタイム同期（WebSocket/Realtime） | ISR + Cronで十分。コミュニティツールに「今まさに書いた」の即時反映は不要 | Vercel Cron日次 + ISR 5分が継続 |
| 記事の全文検索インデックス | PostgreSQLのfull-text searchはYAGNI。ヒートマップは日付ベースの可視化であり検索は不要 | 日付インデックスのみ（pubDate列にINDEX） |
| Supabase Realtimeサブスクリプション | Vercel Cronとの二重管理になる。YAGNI | Cronが日次でbatchinsertする設計を維持 |
| 記事データの履歴削除機能 | append-onlyがこの機能の価値。削除すると過去ヒートマップが壊れる | 削除は管理者がメンバーごとDBを直接操作（運用対応） |

### データスキーマ（参考）

```sql
-- Supabase PostgreSQL想定スキーマ
CREATE TABLE articles (
  id           BIGSERIAL PRIMARY KEY,
  substack_id  TEXT NOT NULL,          -- 例: "careerkoumei"
  title        TEXT,
  link         TEXT NOT NULL,
  pub_date     TIMESTAMPTZ NOT NULL,   -- UTC保存。表示時にJSTへ変換
  thumbnail    TEXT,                   -- content:encodedから抽出済みのURL
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX articles_link_idx ON articles(link);  -- dedup用
CREATE INDEX articles_substack_pubdate_idx ON articles(substack_id, pub_date DESC);
```

**既存KVとの移行方針:** `kvArticles.getArticles` の全データをPostgreSQLに一括インポート後、KVを廃止。移行スクリプトは一回限りの実行。

---

## Admin UI Team Management

### Table Stakes

チーム管理UIのカンマ区切りテキスト → チェックボックス化。管理者の操作ミスを減らす。

| Feature | Why Expected | Complexity | 既存への依存 |
|---------|--------------|------------|------------|
| 既存チーム一覧をチェックボックスで表示 | チーム名のタイポが操作ミスの主因。選択式にすると根本解決 | Low | `getTeams()`（全メンバーからteamNamesをdedupe抽出）が必要 |
| メンバー編集画面で複数チームをチェックボックスで選択 | `teamNames: string[]` の多対多を直感的に扱える | Low | AdminMemberList.tsx のEditモード更新 |
| 現在の所属チームが編集開始時にチェック済みで表示 | 現在状態を正しく反映。チェックボックスのdefaultCheckedをmemberのteamNamesで初期化 | Low | `defaultChecked={m.teamNames.includes(team)}` |
| チェックなし（チームなし）の状態を許容 | チームに属さないメンバーが存在できる。`teamNames: []`が有効な状態として維持 | Low | 既存スキーマは `string[]` なので変更不要 |

### Anti-Features (avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| カンマ区切りテキスト入力のUI継続 | チーム名のタイポ・大文字小文字の不一致が発生する。v1.3から既知の問題 | 既存チーム名リストから選択するチェックボックスUIに置換 |
| 新チーム名をここで新規作成する機能 | チーム名管理が複雑になる。YAGNI | チーム名は既存メンバーのteamNamesから自動収集。新チームは最初の1件を管理者がテキスト入力で作成し、以降はチェックボックスで選択 |
| 動的なチェックボックスUI（全メンバーの変更を即時反映） | 管理画面はAdmin専用の内部ツール。リアルタイム同期はYAGNI | ページリロードで最新チーム一覧を反映すれば十分 |
| チームの独立管理画面（CRUD）作成 | スコープ過剰。YAGNI | チームはメンバーのteamNamesから自動導出。専用テーブルは不要 |

### 実装の詳細

```
既存フロー（カンマ区切りテキスト）:
  AdminMemberList.tsx（editingId === m.substackId の場合）
  → <input name="teamNames" defaultValue={m.teamNames.join(', ')} />
  → updateMemberAction → teamNames.split(',').map(s => s.trim()).filter(Boolean)

変更後フロー（チェックボックス）:
  → 全チーム一覧を getTeams() で取得（page.tsx or AdminMemberList props）
  → <input type="checkbox" name="teamNames" value={team} defaultChecked={...} />
  → HTML checkboxの formDataは同名複数値をサポート → getAll('teamNames') で string[] 取得
  → updateMemberAction の型変更不要（teamNames: string[] のまま）
```

**既存の `updateMemberAction` への影響:** Server ActionのFormData解析部分を `formData.get('teamNames')` から `formData.getAll('teamNames')` に変更するのみ。KISS原則に合致した最小変更。

---

## Feature Dependencies Map

```
Supabase Auth (Magic Link)
  → Supabase プロジェクト作成（SupabaseダッシュボードでOAuth設定）
  → @supabase/ssr インストール
  → middleware.ts 拡張（Basic Auth継続 + Supabase Authによる/member/settings/*保護）
  → /member/settings ページ新規作成（プロフィール編集UI）
  → Supabase profiles テーブル（auth.users.id ↔ substackId の紐付け）

Long-term Article History
  → Supabase PostgreSQL articles テーブル（↑とセットで同一プロジェクト）
  → kvArticles.ts の Supabase版実装（saveArticles → upsertArticles to Supabase）
  → Vercel Cron APIルートの書き込み先変更
  → 既存KVデータの一括マイグレーションスクリプト（one-shot）
  → calendarUtils.ts の期間拡張（7日間 → 任意期間）

Admin UI Team Checkbox
  → AdminMemberList.tsx のEditモード更新（テキスト入力 → チェックボックス）
  → getTeams() ユーティリティ関数追加（全メンバーのteamNamesをdedupe）
  → actions.ts の FormData解析を getAll('teamNames') に変更

依存関係（実装順序の制約）:
  Supabase Auth は Supabase PostgreSQL と同一プロジェクトを使う → 同時セットアップ推奨
  Long-term Article History は Supabase DBが存在してから → Auth後またはAuth同時
  Admin UI Team Checkbox は既存KVのまま実施可能 → 独立して先行実装できる（最も低リスク）
```

---

## MVP Prioritization for v1.5

**優先度高（先に実装すべき）:**

1. Admin UI Team Checkbox — 既存KVで完結、依存なし、リスク最低。ユーザー体験の即時改善
2. Supabase Auth + Member Self-Management — コアバリュー「管理者依存排除」の実現
3. Long-term Article History + Supabase PostgreSQL — SupabaseプロジェクトはAuth導入時に同時作成するため、DBも同時に構築する

**defer（v1.5スコープ外推奨）:**
- 年間ヒートマップ: 蓄積データが溜まってから（最低1ヶ月以上必要）
- 承認制メンバー登録フロー: 信頼ベースのコミュニティ運用で当面不要
- ストリーク表示: データ蓄積後にv1.6で

---

## Sources

- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs) — @supabase/ssrパッケージ、Server Components対応、Middleware設定
- [Supabase Passwordless Email (Magic Link)](https://supabase.com/docs/guides/auth/auth-email-passwordless) — Magic Link設定、60秒レート制限、1時間有効期限
- [Supabase User Management Tutorial with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) — profiles テーブルパターン、RLS設定
- [NN/g Checkboxes Design Guidelines](https://www.nngroup.com/articles/checkboxes-design-guidelines/) — チェックボックスはオプション数が少ない（<10）場合に最適
- [Multi-select Input Pattern — UX Patterns](https://uxpatterns.dev/patterns/forms/multi-select-input) — タグ/テキスト入力 vs チェックボックスの使い分け
- [Supabase TimescaleDB Extension](https://supabase.com/docs/guides/database/extensions/timescaledb) — 時系列データ保存（v1.5では標準PostgreSQLで十分）
- 既存コードベース: `src/lib/kvArticles.ts`, `src/lib/kvMembers.ts`, `src/app/admin/AdminMemberList.tsx`, `src/lib/types.ts`
- PROJECT.md — 要件履歴、制約、Out of Scope判断
