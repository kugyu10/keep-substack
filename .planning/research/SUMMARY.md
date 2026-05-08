# Project Research Summary

**Project:** Keep Substack — v1.1 Dynamic Members + Weekly View
**Domain:** RSS feed activity visualization — ISR静的サイト + KV動的メンバー管理
**Researched:** 2026-05-08
**Confidence:** HIGH

## Executive Summary

Keep Substack v1.1 は、v1.0 の静的な members.json 管理から脱却し、Upstash Redis による動的なメンバー管理と50人規模対応の週次ヒートマップへの移行を目的としたマイルストーンである。既存の Next.js 16.2.6 + ISR アーキテクチャは維持しつつ、`@upstash/redis`（`@vercel/kv` は 2024 年 12 月に廃止済み）によるKVストア、Server Actions による管理操作、`src/proxy.ts`（Next.js 16 で middleware.ts から改名）による Basic Auth 保護を追加する。ISR の `unstable_cache` パターンは変更せず、メンバー追加・削除時に `revalidateTag('members')` で即時キャッシュパージする設計が最もバランスが良い。

サムネイル取得においては、OGP フェッチ（50 メンバー × 7 日分の記事 = 最大 350 リクエスト / ISR サイクル）を回避し、rss-parser の `customFields` で `content:encoded` を取得して regex で最初の `<img src>` を抽出するアプローチが推奨される。`media:thumbnail` は rss-parser issue #130 で既知の未解決バグがあり利用不可。このアプローチによりサムネイル取得の追加 HTTP リクエストをゼロに抑えられる。

最大のリスクは KV 移行フェーズに集中している。`generateStaticParams` がビルド時に KV を読むため、Vercel の環境変数スコープを「Build」に設定しないと全 `/member/[substackId]` ルートが 404 になる（ビルドエラーは出ない）。また `force-static` と searchParams の共存不可という制約により、チームフィルター実装のためトップページから `export const dynamic = 'force-static'` を削除し `unstable_cache` のキャッシュ管理に委ねる必要がある。

## Key Findings

### Recommended Stack

v1.0 の既存スタック（Next.js 16.2.6, React 19.2.4, rss-parser 3.13.0, TypeScript 5, Tailwind CSS 4）はすべて維持。v1.1 で追加するパッケージは `@upstash/redis 1.37.0` のみ。

Vercel KV（`@vercel/kv`）は 2024 年 12 月に廃止されており、新規プロジェクトでの利用は不可。Vercel Marketplace 経由で Upstash for Redis を接続すると `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` が自動注入される。メンバーデータは Redis Hash と Set（`members:{id}` + `member-ids`）で管理し、`Redis.fromEnv()` で初期化する。

**Core technologies:**
- `@upstash/redis 1.37.0`: メンバーデータ KV ストア — `@vercel/kv` 廃止に伴う公式後継。REST/HTTP 基盤で Edge/Node.js 両対応。無料枠 50 万コマンド/月は 50 メンバー規模で余裕
- `src/proxy.ts`（Next.js built-in）: `/admin` への Basic Auth 保護 — Next.js 16 で middleware.ts が proxy.ts に改名。外部ライブラリ不要（KISS/YAGNI）
- `content:encoded` + regex: サムネイル抽出 — OGP フェッチの 350 リクエスト問題を回避。追加パッケージ不要

### Expected Features

**Must have（table stakes）:**
- 7 日間ヒートマップグリッド（行=メンバー、列=日付）— 50 人規模の一覧表示のコア UI
- ソート: 7 日間投稿量降順 → `added_at` 昇順 — 最もアクティブなメンバーを上位表示
- KV バックのメンバーストア — デプロイなしでメンバー追加・削除
- Admin CRUD UI（`/admin`）— メンバー追加フォーム + 削除ボタン
- Basic Auth 保護 — proxy.ts で `/admin/:path*` のみをガード
- リッチ Tooltip — サムネイル + タイトル 20 文字 + 記事リンク

**Should have（differentiators）:**
- チームフィルター（`?team=teamId` の URL パラメータ）— チーム別絞り込みビュー。タブ形式（6 チーム以下）かドロップダウン
- 空状態メッセージ（管理画面）— 初回利用時の UX

**Defer（v2+）:**
- 連続投稿日数（ストリーク）表示
- 月間投稿数サマリー
- 年間ヒートマップ（GitHub 草型）

**Anti-features（明示的に除外）:**
- ランキング・順位表示 — コミュニティの「ゆるさ」を壊す（PROJECT.md 明記）
- OGP フェッチによるサムネイル — 350 リクエスト/ISR サイクルのコスト問題
- `@vercel/kv` 利用 — 廃止済み

### Architecture Approach

v1.0 の `force-static` + `unstable_cache` という ISR アーキテクチャの骨格は維持しつつ、メンバーデータの読み取り先を members.json から Upstash KV に置き換える。`fetchAllFeedsCached` の内部で `getMembersFromKV()` を呼び出し、cache タグに `'members'` を追加することで管理操作後の即時パージが可能になる。管理操作は Server Actions（`/admin/actions.ts`）で実装し、`revalidateTag('members')` を呼ぶ。KV アクセスは `src/lib/kv.ts` に集約し、Server Component と Server Action からのみ呼び出す（Client Component からは禁止）。

**Major components:**
1. `src/lib/kv.ts` (NEW) — Upstash Redis CRUD 関数集約（`getMembersFromKV`, `addMemberToKV`, `removeMemberFromKV`）
2. `src/components/WeeklyHeatmap.tsx` (NEW) — 7 日間ヒートマップ Server Component（行=メンバー、列=日付、ソート・フィルタ込み）
3. `src/components/HeatmapCell.tsx` (NEW) — 1 セルの Client Component（hover ツールチップのみ Client 化）
4. `src/app/admin/page.tsx` + `actions.ts` (NEW) — 管理画面 Server Component + Server Actions
5. `src/proxy.ts` (NEW) — Basic Auth guard（Next.js 16 proxy 関数）
6. `src/lib/fetchFeed.ts` (MODIFY) — members.json import を KV 呼び出しに変更、`'members'` タグ追加
7. `src/app/page.tsx` (MODIFY) — `force-static` 削除、`searchParams` でチームフィルター受け取り

### Critical Pitfalls

1. **@vercel/kv は廃止済み** — `@upstash/redis` を使う。新規プロジェクトで Vercel KV ストアは作成不可（Pitfall V1）
2. **Vercel 環境変数の Build スコープ未設定** — `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` を Vercel Project Settings の Build スコープに設定しないと `generateStaticParams` がビルド時に KV を読めず全メンバーページが 404 になる。ビルドエラーは出ない（Pitfall V2）
3. **`force-static` と searchParams の共存不可** — チームフィルター（`?team=xxx`）を使うにはトップページから `export const dynamic = 'force-static'` を削除する必要がある。ISR は `unstable_cache` が管理するので性能劣化なし（Pitfall V5 + ARCHITECTURE.md）
4. **middleware.ts は Next.js 16 で廃止** — `src/proxy.ts` を作成し、エクスポート関数名を `proxy` にする（Pitfall implied by ARCHITECTURE.md）
5. **proxy.ts の matcher が広すぎると静的アセットに 401** — matcher は `['/admin', '/admin/:path*']` のみ。`/_next/static` などを含めると認証後も CSS/JS が壊れる（Pitfall V4）
6. **KV 移行時の ISR キャッシュ整合** — members.json のデータを KV にシード後、`members.json` を削除する順序を厳守。逆順はゼロメンバービルドを引き起こす（Pitfall V10）

## Implications for Roadmap

研究から導き出した依存関係に基づくフェーズ構造:

### Phase 1: Member 型拡張 + KV 移行

**Rationale:** 全機能の基盤。`Member` 型の拡張（`id`, `addedAt`, `teamId` 追加）なしにはソートもフィルタも実装できない。KV への移行なしには Admin UI もヒートマップの動的メンバー読み込みも実装できない。最初に固める必要がある。

**Delivers:**
- `src/lib/types.ts` の Member 型拡張（`substackId`, `addedAt`, `teamId` 追加）
- `src/lib/kv.ts` の作成（KV CRUD 関数: getMembersFromKV, addMemberToKV, removeMemberFromKV）
- `src/lib/fetchFeed.ts` の KV 読み取りへの切り替えと `'members'` タグ追加
- members.json からのデータ移行スクリプト（one-shot 実行後に削除）
- `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` の Vercel 環境変数設定（Build スコープ含む）

**Addresses:** KV バックのメンバーストア（table stakes）
**Avoids:** Pitfall V1（@vercel/kv 廃止）、Pitfall V2（generateStaticParams env scope）、Pitfall V10（移行時のキャッシュ整合）

---

### Phase 2: WeeklyHeatmap コンポーネント + ソート

**Rationale:** Phase 1 の Member 型と KV 読み取りが確立したあとに実装できる。トップページの核心的 UI で、Phase 1 なしには正しいデータ構造で開発できない。

**Delivers:**
- `src/components/WeeklyHeatmap.tsx`（Server Component）
- `src/components/HeatmapCell.tsx`（Client Component、hover tooltip）
- `src/app/page.tsx` の `force-static` 削除と WeeklyHeatmap 組み込み
- ソートロジック（7 日間投稿量降順 → addedAt 昇順）
- `content:encoded` regex によるサムネイル取得（rss-parser customFields 設定）
- リッチ Tooltip（サムネイル + タイトル 20 文字）
- `next.config.ts` への `substackcdn.com` remotePatterns 追加

**Addresses:** 7 日間ヒートマップ、ソート、リッチ Tooltip（table stakes）
**Avoids:** Pitfall V5（force-static と searchParams 共存不可の対処）、Pitfall V9（OGP の blocking render 回避）、Pitfall V13（next/image ドメイン許可リスト）

---

### Phase 3: Admin UI + proxy.ts Basic Auth

**Rationale:** Phase 1 の KV 層があって初めて Admin CRUD が実装できる。proxy.ts は Admin UI と同時実装が自然。Phase 2 の UI とは独立しており並行も可能だが、KV 層への依存上 Phase 1 後に行う。

**Delivers:**
- `src/proxy.ts`（Basic Auth guard、matcher は `/admin/:path*` のみ）
- `src/app/admin/page.tsx`（Server Component、メンバー一覧 + 追加フォーム）
- `src/app/admin/actions.ts`（Server Actions: addMember, removeMember + `revalidateTag('members')`）
- `ADMIN_USER`/`ADMIN_PASSWORD` 環境変数設定
- 管理画面の空状態メッセージ

**Addresses:** Admin CRUD UI、Basic Auth 保護（table stakes）
**Avoids:** Pitfall V3（CVE-2025-29927、Next.js 16.2.6 で対応済みを確認）、Pitfall V4（matcher の過剰マッチング）、Pitfall V6（KV 書き込み後のキャッシュ未パージ）

---

### Phase 4: チームフィルター + UX 仕上げ

**Rationale:** Phase 2 で WeeklyHeatmap が動作し、Phase 1 で teamId が Member 型に存在して初めて実装できる。URL パラメータ（`?team=teamId`）と searchParams の接続は Phase 2 で force-static を外した後でないと動かない。

**Delivers:**
- `?team=teamId` URL パラメータによるフィルタリング
- セグメントタブ（6 チーム以下）またはドロップダウン（7 チーム以上）
- 「All」タブの常時表示
- ナビゲーション改善・50 人対応レイアウトの最終調整

**Addresses:** チームフィルター（differentiator）、ビジュアル・UX 刷新
**Avoids:** force-static 削除済みであることの確認（Phase 2 で対処済み）

---

### Phase Ordering Rationale

- **依存関係の順序:** Member 型 → KV → Admin/Heatmap → Filter の順で、下位レイヤーが固まってから上位を実装する
- **リスク前倒し:** 最もリスクが高い KV 移行（環境変数スコープ問題、generateStaticParams 問題）を Phase 1 で解決することで、後続フェーズのリスクを低減する
- **独立性の活用:** Phase 3（Admin UI）は Phase 2（Heatmap）と機能的に独立しているため、順序を入れ替えても技術的には成立する

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1（KV 移行）:** Upstash Redis 接続手順と Vercel Marketplace 連携の実際の操作手順を計画時に確認推奨。ローカル開発時の `.env.local` 設定手順も明確化が必要
- **Phase 2（Heatmap + thumbnail）:** Substack の実際の RSS フィードでの `content:encoded` 内 `<img>` タグの存在確認が必要。研究は anecdotal 確認のみで直接インスペクションではない

Phases with standard patterns (skip research-phase):
- **Phase 3（Admin + Basic Auth）:** Next.js Server Actions + proxy.ts のパターンは十分確立。実装コードも ARCHITECTURE.md に詳述
- **Phase 4（チームフィルター）:** URL パラメータ + searchParams パターンは Next.js 標準。タブ/ドロップダウン実装は Tailwind CSS で十分

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | @vercel/kv 廃止・@upstash/redis 推奨は Vercel 公式ドキュメントで確認。Next.js 16 の proxy.ts リネームも Next.js 公式ドキュメントで確認 |
| Features | HIGH | PROJECT.md の要件と完全に整合。table stakes は明確。チームフィルターのタブ vs ドロップダウン閾値（6 チーム）は UX リサーチベースで妥当 |
| Architecture | HIGH | Next.js App Router + unstable_cache + Server Actions のパターンは v1.0 で実証済み。KV 層の追加は標準パターン |
| Pitfalls | HIGH（一部 MEDIUM） | KV 廃止・環境変数スコープ・proxy.ts リネームは HIGH。OGP フェッチの Upstash コマンド消費試算は MEDIUM（推定値） |

**Overall confidence:** HIGH

### Gaps to Address

- **`content:encoded` 内のサムネイル存在確認:** Substack の実際の RSS フィードで `<img>` タグが `content:encoded` に含まれるかを実際のフィードで確認する。もし存在しない場合はフォールバック戦略（メンバーイニシャル表示）を即採用
- **Upstash コマンド数の実測:** v1.1 リリース後、Upstash ダッシュボードでコマンド数を監視。OGP を `unstable_cache` に収めることで KV 消費を抑えているが、実際のトラフィックで確認が必要
- **Next.js 16 の proxy.ts 実際の挙動:** ARCHITECTURE.md はドキュメント確認済みだが、実際に Next.js 16.2.6 で proxy.ts として動作するかローカルで早期確認を推奨

## Sources

### Primary (HIGH confidence)

- Vercel Redis docs — `@vercel/kv` 廃止確認、Upstash Redis 推奨
- vercel/storage README (Context7) — `@vercel/kv` deprecation 確認
- Upstash Redis Next.js App Router Quickstart — セットアップ手順
- Next.js 16.2.6 proxy.ts docs — middleware.ts から proxy.ts へのリネーム確認
- Next.js generateStaticParams docs — ビルド時 KV 実行の可否
- Next.js unstable_cache docs — revalidateTag パターン
- CVE-2025-29927 (NVD) — Next.js middleware bypass、v16.2.6 で対応済みを確認
- rss-parser GitHub issue #130 — `media:thumbnail` の既知バグ確認

### Secondary (MEDIUM confidence)

- rss-parser GitHub issues — `content:encoded` カスタムフィールドのパターン
- Substack RSS image extraction via content:encoded — `/<img[^>]+src="([^"]+)"/i` パターン
- Filter UX Design Patterns (LogRocket, UX Movement) — タブ vs ドロップダウンの閾値基準
- Upstash Pricing docs（2025 年 3 月更新）— 500K コマンド/月 無料枠

### Tertiary (LOW confidence)

- Substack RSS フィードの `content:encoded` 内 `<img>` タグの存在 — anecdotal 確認のみ、直接インスペクション未実施

---
*Research completed: 2026-05-08*
*Ready for roadmap: yes*
