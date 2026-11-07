# Cloudflare 移行 フェーズ0: 判断材料と確定記録

Issue #18 / 計画 `docs/cloudflare-migration-plan.md` §8 の残り5論点について、選択肢・おすすめ・開発者の回答（#16 コメント 2026-11-07）をまとめる。本書はドキュメントのみ。実環境の操作は含まない。

| # | 論点 | 開発者の回答 | 本書のおすすめ |
|---|---|---|---|
| 1 | 月額上限 | $20 未満なら許容 | 上限 $20 未満で確定。目標は $5〜10 |
| 2 | D1 クエリ層 | おまかせ | **Drizzle ORM（D1 ドライバ）** |
| 3 | OG 画像 | 簡素化できれば簡素化 | **`next/og` に簡素化。R2 は使わず Cache API** |
| 4 | 期限・切り戻し | 11/10 まで（できれば 11/8 中）。旧環境は既に完全停止中で切り戻しなし | 期限了解。切り戻し無し前提の手順に組み替える（下記） |
| 5 | NS 移管 | 11/7 本日中 | 実施。チェックリストを下記に用意 |

## 1. 月額上限

- 現行 $40（Supabase $20 + Vercel $20）。
- 移行後の見立て: Workers Paid $5 + D1/R2/Browser Rendering の従量。小規模（1日1回 cron、数十〜百人）では D1 の込み枠（計画 §4）に収まり、$5〜10 の見込み。
- OG を簡素化すれば Browser Rendering の従量（$0.09/時間超過分）が消え、上限超過リスクはほぼ無い。
- 提案: 上限 $20 未満で確定。Cloudflare の請求通知（Billing の通知設定）を $10 で設定しておく。
- 使用量確認 SQL は末尾の付録 A（開発者が Supabase SQL Editor で実行）。

## 2. D1 クエリ層

### 実コードの規模（`src` を調査）

- `supabase-js` の `.from()` が 51 箇所、`.rpc()` が 1 箇所（`replace_member_commit_slots`）。生 SQL は無い。
- 利用メソッドは `select` 33 / `eq` 32 / `update` 9 / `maybeSingle` 9 / `order` 8 / `insert` 7 / `single` 6 / `upsert` 5 / `in` 5 / `delete` 4。`or` `ilike` 等の複雑な条件は無い。
- 結合は埋め込み select のみ。`members → member_teams → teams` の入れ子取得が `src/lib/members.ts` と `my/page.tsx` の 2 箇所。
- 呼び出しファイルは 16。うち `Footer.tsx` はサーバーコンポーネントで DB を直接読む。

### 選択肢

| 案 | 長所 | 短所 |
|---|---|---|
| A. 素の SQL（`env.DB.prepare().bind()`） | 依存ゼロ・バンドル最小・D1 の挙動がそのまま見える | 51 箇所を全て手書き。入れ子結果の組み立てが自前。型が付かない。`upsert` 5 箇所は `ON CONFLICT` を手書き |
| B. Drizzle ORM | スキーマが TS で型の正になる。`db.query.members.findMany({ with: { memberTeams: { with: { team: true } } } })` が現行の埋め込み select にほぼ 1:1 で対応。`onConflictDoUpdate` で upsert。`db.batch()` で RPC のアトミック置換を表現可能。Better Auth に Drizzle アダプタがある（Better Auth 側の D1 対応は PoC #19 で確認） | 依存が増える。スキーマ定義と SQL マイグレーションの二重管理に注意（drizzle-kit に一本化すれば解消） |
| C. Kysely | 型付き SQL ビルダー。Better Auth も Kysely を内部利用 | 入れ子取得の糖衣が無く、現行コードの置換が A に近い手間 |

### おすすめ: B（Drizzle）

- 現行の使い方は単純な CRUD と 2 箇所の入れ子取得で、Drizzle の relational query と `insert/update/delete` でほぼ機械的に置換できる。
- 型が付くので、7 テーブル・16 ファイルの書き換えでの取りこぼしをコンパイルで検出できる。開発者が 1 人でレビュー者がいない点でも効く。
- Better Auth と同じ層（Drizzle）に揃えると、auth テーブルと業務テーブルのマイグレーションを drizzle-kit に一本化できる。
- 落とし穴: トリガー `sync_member_publications` と RPC は SQL に残せず、アプリ側（`db.batch()`）に移す。これは A でも B でも同じ。
- 前提確認: #19 PoC で「Workers 上で Drizzle + D1 + Better Auth が動く」ことを確認する。動かなければ A に落とす（入れ替えコストは小さい。呼び出しを `src/lib/` のデータ関数に閉じ込めておけば影響範囲が限定される）。
- 実装方針: `.from()` の直書きを減らすため、移行時に `src/lib/` 側へ関数を寄せる必要はない（スコープ外）。置換は 1 対 1 で行う。

## 3. OG 画像

| 案 | 長所 | 短所 |
|---|---|---|
| A. 実ページ撮影を維持（Browser Rendering + `@cloudflare/playwright` + R2/Cache） | 見た目が現行と同一。「忠実さ優先」の方針に合う | 構成要素が最多（Browser Rendering・R2・自己到達経路）。撮影 1 回ごとに全 RSS fetch が走る（`/og-view/*` が `fetchAllFeedsCached` を呼ぶ）。従量課金が出うる。PoC が必要 |
| B. `next/og` の `ImageResponse` に簡素化 | 現行のフォールバック実装が既にある。最安・最速・Chromium 不要。移行の最大の不確実要素が消える | 見た目が実ページと変わる（ヒートマップ等の再現度が落ちる） |

おすすめ: B。開発者の回答（簡素化できれば簡素化）と一致する。
- 既存フォールバックを本採用にし、`playwright-core` / `@sparticuz/chromium` 依存と `vercel.json` の `/api/og` 設定を撤去する。
- キャッシュは R2 ではなく `Cache-Control`（現行 `revalidate=300` 相当）と Cloudflare CDN で足りる。R2 は不要。
- 見た目の差は UAT で確認してもらう。許容できなければ A を後から足せる（B が A のフォールバックになるため、順序としても安全）。
- `/og-view/*` ページは B 採用後は不要になる可能性が高い。削除は別 Issue で扱う（本移行のスコープ外）。

## 4. 期限と切り戻し

- 期限: 11/10 まで、できれば 11/8 中（開発者回答）。
- 前提の変化: 現行環境は既に完全停止しており、**切り戻しは行わない**。計画 §6.5「切り戻し期限 1〜2 週間・旧 Supabase を読み取り専用で保持」は適用しない。
- 影響:
  - 切り戻しが無い代わりに、旧データの唯一の正は Supabase 上のデータ（prod=xolhjcngrwwwqtklmoyk）と `pg_dump`。**D1 投入前に必ずバックアップを取り、検証が済むまで Supabase プロジェクトを削除・停止解除しない**（読み出しのため）。
  - 計画 §6 手順 7（突き合わせ）で差分が出たら、中止ではなく「D1 側を直して再投入」に倒す。再投入できるよう変換・投入スクリプトは冪等にする（D1 を空にして再実行可能）。
  - 本番切替後の逆変換スクリプト（§6.5）は不要。作らない。
- スケジュール案（11/8 中を狙う場合）:
  1. 11/7: NS 移管、アカウント準備、#19 PoC 着手
  2. 11/8: アプリ移植・DB 投入・突き合わせ → Custom Domain 割当
  3. 11/9〜10: 予備日（不具合対応・UAT）
- リスク: 期間が極めて短く、Auth 差し替え（Better Auth）が最大の不確実要素。PoC #19 の結果が出た時点で、11/10 に間に合うかを再判断する。

## 5. keep-substack.com の NS 移管

- 開発者回答: 11/7 本日中に実施。計画 §5.1 の 1 段階目（zone 移管のみ）に当たる。
- 手順の要点（開発者の手作業）:
  1. Cloudflare で zone を追加。自動取り込みされた DNS レコードを現行の Vercel 設定と突き合わせる（A/CNAME、MX、TXT。メール関連の取りこぼしに注意）。
  2. 取り込んだレコードは **Vercel 向けのまま**にする。プロキシ（オレンジ雲）は Vercel 向けでは OFF（DNS only）にしておくと挙動が変わらない。
  3. レジストラでネームサーバを Cloudflare 指定のものに変更。伝播は最大 24〜48 時間かかりうる（TLD 側の TTL）。
  4. 既に Vercel が停止しているため、現状サイトは落ちている。そのため段階 2（Custom Domain 割当）は NS 反映後すぐに進めてよい。
- 付随: Magic Link のリダイレクト URL は新環境の URL で設定する（旧は不要）。

## 付録 A: 使用量確認 SQL（読み取り専用・開発者が実行）

Supabase prod の SQL Editor で実行する。SELECT のみ。

```sql
-- テーブル別の件数
SELECT 'members' AS t, count(*) FROM members
UNION ALL SELECT 'teams', count(*) FROM teams
UNION ALL SELECT 'member_teams', count(*) FROM member_teams
UNION ALL SELECT 'articles', count(*) FROM articles
UNION ALL SELECT 'member_publications', count(*) FROM member_publications
UNION ALL SELECT 'member_commit_slots', count(*) FROM member_commit_slots
UNION ALL SELECT 'note_comments', count(*) FROM note_comments;

-- ログイン済みメンバー数（user_id あり）と管理者数
SELECT count(*) FILTER (WHERE user_id IS NOT NULL) AS claimed_members,
       count(*) AS all_members
FROM members;
SELECT count(*) AS admin_users FROM auth.users WHERE role = 'admin';

-- テーブルサイズ（D1 の容量見積り用）
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

月間 PV は SQL では取れない。Vercel Analytics（または Usage）の画面で直近 30 日のリクエスト数を確認する。

目安: `articles` が数万行以下、DB 全体が 100MB 未満なら D1 の込み枠（計画 §4）に十分収まる。

## 付録 B: Cloudflare アカウント準備チェックリスト（開発者の手作業）

- [ ] Cloudflare アカウントにログイン、2FA 有効化
- [ ] **Workers Paid プラン（$5/月）に加入**（請求は本人のみ）
- [ ] Billing の通知（使用量アラート）を $10 付近で設定
- [ ] zone `keep-substack.com` を追加（上記 §5）
- [ ] Workers & Pages が有効なこと（workers.dev サブドメインの登録）
- [ ] D1 データベースを作成（名前例 `keep-substack`）。ロケーションヒントは日本に近い地域（APAC）
- [ ] メール送信手段の決定（Magic Link 用）: Cloudflare Email Service（Email Sending）が使えるか。使えない場合の代替は #16 / PoC #19 で判断
- [ ] API トークン作成（Workers Scripts 編集・D1 編集・DNS 編集の最小権限）。CI 用。トークンはリポジトリに置かない
- [ ] 環境変数・シークレットの棚卸し（`wrangler secret put` で投入する対象: Better Auth のシークレット、`CRON_SECRET` を残す場合はその値、Substack 関連）
- [ ] （OG を A 案にする場合のみ）Browser Rendering の有効化
