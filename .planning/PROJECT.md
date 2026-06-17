# Keep Substack

## Current State

**Shipped:** v1.9 ワンボタン Substack Note 共有 (2026-06-17)
**Building:** v1.10 Substack Notes PoC（コメント可視化 & Note一覧取得）

残課題（過去マイルストーンから繰り越し）: bookkeeping/過去繰り越し 16件（機能ギャップなし）。うち PR#5 指摘の 🔴 high 2件（admin role-check 検証 / 認証ガード二重化解消）は未消化。詳細は STATE.md Deferred Items。

<details>
<summary>Previous milestone: v1.9 ワンボタン Substack Note 共有 (shipped 2026-06-17)</summary>

- 個人カレンダー `/member/[id]` を `?ym=` 駆動の公開URL化 + `buildShareUrl` 規約ヘルパで対象4ビューの正規公開URLを1関数化（Phase 37）
- 再利用可能な `<ShareButton>`：定型文+ハッシュタグ+公開URLをコピーし Substack Notes を新規タブ起動、`lib/share.ts` 定数で文面一元管理・ログイン限定はフラグ1か所で切替（Phase 38）
- 共有URL（top/daily/member）に summary_large_image OGメタ + next/og 動的OG画像（メンバーの草/記事数/ハンドル）、本番OGはスクショ方式で安定化（Phase 39）

</details>

<details>
<summary>Previous milestone: v1.8 Debug, Stabilization & UI Polish (shipped 2026-06-11)</summary>

- 本番DBにmember_commit_slotsを適用しコミットスケジュール保存を本番稼働させた（Phase 32）
- RSS即時取得バグ（BUG-01）・Magic Linkのnextリダイレクト（BUG-02）・commitSlotsのRPCアトミック保存（DB-01）を修正（Phase 33）
- ログイン/サインインページを(main) Route Group化でヘッダー・フッターから分離、フッター文言の3ステート化、Commit & Goal Viewソート順、/myのマイページボタン制御（Phase 34）
- privateチームをトップビューのチームタブに表示（ログイン不要閲覧）+ GA4を全ページに導入（Phase 35）
- Phase 27-29のhuman UAT 6シナリオ本番検証 + VERIFICATIONギャップ解消（Phase 36）

</details>

<details>
<summary>Previous milestone: v1.7 Commit & Goal View + Substack Profile Link (shipped 2026-06-06)</summary>

- Substackハンドル（@handle）をDBに登録し、個人マンスリービューからSubstackプロフィールに直リンク
- /myページでコミットスケジュール（週1〜4回・曜日・時刻）を宣言・保存
- 新トップページにCommit & Goal View（3週分コミットGrid + 👑🔥アチーブメント）
- ログインフロー修正：/login（既存メンバー再ログイン）と/signin-51cf21389c56（招待専用）に分離

</details>

<details>
<summary>Previous milestone: v1.6 Team Roles + Member Self-Service (shipped 2026-05-30)</summary>

- チームステータス（public/private/hidden）をDBで管理し、HIDDEN_TEAM定数を廃止（Member型を `teams: {name, status}[]` に刷新）
- /myページからpublicチームをチェックボックスで自由参加・退出する自律参加フロー（private/hiddenはreadonly）
- /admin/teams/{teamName} 動的RSCでhiddenチームの週次ヒートマップを管理者がURL直アクセスで確認（既存proxy.tsゲートで保護）
- member_publicationsテーブルで複数publication_id対応のスキーマ基盤を整備（部分ユニークIndex+RLS+同期トリガー、UIは1件前提のまま）
- Playwright E2Eハーネス（login/my-teams/admin-guard 3 spec）を本番隔離TEST Supabaseプロジェクトに対しgreen化

</details>

<details>
<summary>Previous milestones</summary>

**v1.5 Member Auth + Supabase Migration (2026-05-17)**
- Supabase PostgreSQL完全移行（Upstash Redis廃止）
- Magic Linkログイン（/login-51cf21389c56/ + /auth/callback）
- /myページでメンバー自己管理（substackId紐付け・プロフィール編集）
- /adminをBasic Auth → Supabase authロール制御に移行
- 管理画面チームチェックボックスUI
- @upstash/redis完全削除・コードベースをSupabase一本化

</details>

## What This Is

Substack継続仲間コミュニティ向けの、メンバーの記事公開頻度とコミット達成状況を可視化するWebアプリ。GitHubの草（コントリビューショングラフ）のように「頑張り」が一目でわかり、継続のモチベーションを支える。Next.js (App Router) + Tailwind CSS + Supabase PostgreSQLで構築し、Vercelにデプロイ済み。v1.5でSupabase完全移行・Magic Linkログイン・メンバー自己管理を実装。v1.6でチームステータスDB管理・メンバー自律参加・Playwright E2Eテスト基盤を追加。v1.7でコミットスケジュール宣言・3週分Commit Goal View・アチーブメント（👑/🔥）・Substackプロフィール直リンクを実装し、「継続の意志と実績」を仲間に見せるコアビューが完成した。v1.8で本番DBマイグレーション適用・本番バグ群（RSS即時取得・Magic Linkリダイレクト・commitSlots RPCアトミック保存）の修正・ログイン周りのレイアウト分離・GA4導入・privateチーム公開閲覧を行い、安定化と品質を固めた。

## Core Value

仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること。

## Current Milestone: v1.10 Substack Notes PoC（コメント可視化 & Note一覧取得）

**Goal:** Substack の Note 領域（コメント・投稿一覧）のデータ取得可否を PoC で検証し、コメント可視化と Note 一覧取得の2機能を試作する。

**Target features:**
- **機能1 コメント可視化（永続化あり）**: Note の URL/ID を手入力して対象を指定 → そのNoteの「コメント件数 / コメント本文一覧 / コメントした人の名前・アイコン」を表示。取得したコメントは Supabase にキャッシュ保存（再取得を避ける）
- **機能2 Note一覧取得（永続化なし）**: いったん admin（開発者本人）が投稿した Note 一覧を取得して表示。永続化なし（毎回取得）

**Key context（v1.10 方針）:**
- 両機能とも **PoC（試作・検証）**。完成度より「取得できるか・どう取れるか」の検証が主目的
- **最大のリスク＝データ取得手段**: Substack には公式 Notes/コメント取得 API が無い。非公式エンドポイント（`substack.com/api/...`）等が使えるかは未確認 → 要件定義の前に**調査フェーズで取得可否を検証**する
- 既存スタック（Next.js / Supabase / Vercel）に追加する形。機能2の対象は段階的に admin → メンバー → 任意ユーザーへ拡張余地あり
- Out of Scope の「コメント・いいね機能」は **自前のコメント機能実装**を指す。本 PoC は Substack 上のコメントを**読み取り表示**するもので別物
- 着地点: develop→main の PR 作成・push まで（**マージは開発者が手動。Claudeはマージ禁止**）

## Requirements

### Validated

- ✓ Supabase完全移行（PostgreSQL 4テーブル + RLS + Magic Link Auth）— v1.5
- ✓ メンバー自己管理（/myページ・substackId紐付け・チーム選択）— v1.5
- ✓ /adminをBasic Auth → Supabase authロール制御に移行 — v1.5
- ✓ @upstash/redis完全廃止、コードベースをSupabase一本化 — v1.5
- ✓ 設定ファイル（JSON）でSubstackフィードURLとメンバー名を管理できる — v1.0
- ✓ rss-parserでサーバーサイドからRSSフィードを取得・解析できる — v1.0
- ✓ 月別カレンダーUIでメンバーごとの記事公開日を表示できる — v1.0
- ✓ 更新のある日付セルに色やマークで視覚的に区別できる — v1.0（記事数による濃度6段階）
- ✓ 日付セルのホバーで記事タイトルと元記事へのリンクを表示できる — v1.0
- ✓ メンバー全員一覧ダッシュボードで全体の活動状況を俯瞰できる — v1.0
- ✓ 個人詳細ビューにクリックで切り替えて個人の活動を確認できる — v1.0
- ✓ ISR（Incremental Static Regeneration）でデータを自動更新する — v1.0
- ✓ revalidate間隔を環境変数や設定で簡単に変更できる — v1.0
- ✓ 認証なしの公開ページとして誰でもアクセスできる — v1.0
- ✓ Vercelにデプロイして継続的に運用できる — v1.0
- ✓ メンバーデータをUpstash Redisで管理する（name, substackId, addedAt, teamName）— v1.1
- ✓ ブラウザ上でメンバーを追加・削除できる管理画面（Basic認証）— v1.1
- ✓ トップページを直近7日間ヒートマップ（50人対応）に刷新する — v1.1
- ✓ team-idでヒートマップをフィルタリングできる — v1.1
- ✓ ヒートマップのTooltipでサムネイル・タイトル表示、クリックで記事遷移 — v1.1
- ✓ Tooltip内の画像をクリックすると記事に遷移できる — v1.2
- ✓ Tooltip内の記事間にスペースがあり視認しやすい — v1.2
- ✓ メンバー詳細ページの戻りリンクが「メンバー一覧」でチームビューに戻る — v1.2
- ✓ 全ページのフッターに参加案内リンクが表示される — v1.2
- ✓ トップビューの各メンバー行にSubstackアイコンが表示される — v1.2
- ✓ メンバーカレンダーページにSubstackアイコンが表示される — v1.2
- ✓ トップビューはレスポンシブ対応（スマホ: アイコンのみ / PC: アイコン+名前）— v1.2
- ✓ 管理画面でメンバーのname・addedAt・teamNameをインライン編集・保存できる — v1.2
- ✓ Vercel Cron（1日1回）でRSSフィードを取得しKVに記事データを累積保存できる — v1.3
- ✓ メンバー登録時に初回フィード取得を実行してKVに保存する — v1.3
- ✓ 1人のメンバーが複数チームに所属できる（teamNames: string[]） — v1.3
- ✓ 管理画面でメンバーの所属チームをカンマ区切りで複数設定・更新できる — v1.3
- ✓ チームフィルターで複数チーム所属のメンバーがどのチームでも表示される — v1.3
- ✓ ISR (revalidate=300) + KVハイブリッドで投稿後5分以内に反映される — v1.3
- ✓ ヒーローバナーを削除しファーストビューにヒートマップを表示する — v1.4
- ✓ モバイルファーストレイアウト（px-3 余白最適化）— v1.4
- ✓ メンバー名1行truncate + シェブロン + Substackオレンジタブ — v1.4
- ✓ Substackオレンジ（#FF6719）濃淡ヒートマップ + 点線丸 + 件数バッジ — v1.4
- ✓ HeatmapTooltip 横並びリスト・Click Outside・×ボタン・touchstart対応 — v1.4
- ✓ チームステータス（public/private/hidden）をDBで管理し、HIDDEN_TEAM定数を廃止する — v1.6 (Validated in Phase 22)
- ✓ /myページからpublicチームをチェックボックスで自由参加・退出できる（private/hiddenはreadonly）— v1.6 (Validated in Phase 23)
- ✓ /admin/teams/{teamName} でhiddenチームの週次ビューを表示する — v1.6 (Validated in Phase 24)
- ✓ メンバーが複数のpublication_idを持てるスキーマにする（member_publicationsテーブル、UIは1件前提のまま）— v1.6 (Validated in Phase 25)
- ✓ Magic Linkログインフローと/admin保護をPlaywrightでE2Eテストできる — v1.6 (Validated in Phase 26)
- ✓ 個人マンスリービューで名前/アイコンクリック → `https://substack.com/@{substack_handle}` に遷移する — v1.7 (Validated in Phase 27)
- ✓ `/my` ページで Substack @handle を登録・更新できる — v1.7 (Validated in Phase 27)
- ✓ 👑（今週全コミット達成）・🔥（2週以上連続達成）のアチーブメントアイコンを CommitGoalView に表示する — v1.7 (Validated in Phase 30)

### Validated (v1.7)

- ✓ `/my` ページでコミットスケジュール（週N回・曜日・時刻）を設定できる — v1.7 (Phase 28)
- ✓ 新トップページにコミット＆ゴールビューを表示する（行: アイコン+名前 / コミットGrid / アチーブメント）— v1.7 (Phase 29)
- ✓ コミットGridが3週分横並びで表示される（週1〜4で総横幅同一・達成=サムネイル / 未達成=曜日名）— v1.7 (Phase 29)
- ✓ スマホ幅が足りない場合はGridを1週表示に縮退する — v1.7 (Phase 29)
- ✓ コミット未設定メンバーは `| 未コミット |` グレー表示される — v1.7 (Phase 29)
- ✓ 現トップ（週次ヒートマップ）が `/weekly-stamp` で引き続きアクセスできる — v1.7 (Phase 29)
- ✓ Magic Link ログインフロー修正（/login 既存メンバー / /signin-51cf21389c56 招待専用に分離）— v1.7 (Phase 31)

### Validated (v1.8)

- ✓ commitSlots 保存を非アトミックな delete+insert から upsert(RPC) に置き換える — v1.8 (Phase 33, DB-01)
- ✓ rss-not-fetched-on-user-add バグの根本原因を特定・修正する — v1.8 (Phase 33, BUG-01)
- ✓ auth/callback の next パラメータを有効化する（Magic Link後に元ページへ復帰）— v1.8 (Phase 33, BUG-02)
- ✓ 本番 DB に member_commit_slots マイグレーションを適用する（schedule-save-fails-production 根本解消）— v1.8 (Phase 32, DB-02)
- ✓ Phase 27-29 の human UAT・verification ギャップを解消する — v1.8 (Phase 36: 本番 UAT 6/6 PASS + 27/28/29 VERIFICATION verified)
- ✓ ログイン・サインインページのフッターを非表示にする（(main) Route Group分離）— v1.8 (Phase 34 + quick 260611-ebu, UI-01)
- ✓ ログイン・サインインページに Keep Substack ロゴを表示する（ヘッダーなし）— v1.8 (Phase 34, UI-02)
- ✓ フッターのログイン状態で文言を変える（3ステート）— v1.8 (Phase 34, UI-03)
- ✓ コミット＆ゴールビューのソート順を変更する — v1.8 (Phase 34, UI-04)
- ✓ /my ページ表示中はヘッダーの「マイページ」ボタンを非表示にする — v1.8 (Phase 34, UI-05)
- ✓ Google Analytics(GA4) を全ページに導入する — v1.8 (Phase 35, ANLT-01/02)
- ✓ private チームをトップビューのチームタブに表示し、ログイン不要で閲覧できるようにする — v1.8 (Phase 35, TEAM-01)

### Validated (v1.9)

- ✓ 各ビューに再利用可能な共有ボタン `<ShareButton>` を表示する（位置差し替え容易）— v1.9 (Phase 38, SHARE-01)
- ✓ 共有ボタンで共有テキスト(定型文＋URL)をクリップボードにコピーし Substack Notes を新規タブで開く — v1.9 (Phase 38, SHARE-02/03)
- ✓ コピー完了フィードバック（インライン）を表示する — v1.9 (Phase 38, SHARE-04)
- ✓ 共有先ビューの状態（チームフィルタ・ym等）をURLに保持して公開URLで復元できる — v1.9 (Phase 37, URL-01)
- ✓ 共有対象ルートに動的OG画像（草／実績ビジュアル）とOGメタタグを生成する — v1.9 (Phase 39, OGP-01/02)
- ✓ 共有テキストの定型文・ハッシュタグを編集しやすい定数（`lib/share.ts`）として管理する — v1.9 (Phase 38, SHARE-05)
- ✓ 共有ボタンの表示対象をログイン済みのみ既定とし、全員表示へ切替容易にする — v1.9 (Phase 38, SHARE-06)

### Active (Future)

- [ ] 月間投稿数サマリーを表示する
- [ ] 年間ヒートマップ（GitHub草型）で長期活動を可視化する

### Out of Scope

- ユーザー認証・ログイン機能（公開ページ） — ✓ v1.5でMagic Link実装済み（/myページのみ認証必須）
- リアルタイム通知 — カレンダー確認で十分
- コメント・いいね機能 — Substack本体の機能と重複
- モバイルアプリ — Webアプリで十分、レスポンシブ対応済み
- ランキング・順位表示 — コミュニティの「ゆるさ」を壊す
- Substack以外のRSSソース — スコープを絞る。汎用化はYAGNI

## Context

- ネットでつながったSubstack継続仲間のゆるいコミュニティ向けツール
- メンバーは成長前提（現時点は少人数だが増える可能性あり）
- 初期段階で最大50フィード程度を想定
- Substackの記事更新頻度は1日1回程度が多い
- v1.6公開済み: https://keep-substack.vercel.app/
- コードベース: 約3,500行 src TypeScript/TSX（+ E2E/テストハーネス・supabase schema/migrations）
- Tech Stack: Next.js 16.2.6, React 19.2.4, rss-parser 3.13.0, @supabase/supabase-js 2.x, @supabase/ssr 0.10.x, TypeScript 5, Tailwind CSS 4, Lora (Google Fonts), Playwright 1.60 + Vitest
- v1.5追加: Supabase PostgreSQL（4テーブル + RLS）、Magic Linkログイン、/myページ、adminロール制御
- v1.6追加: teams.status カラム（public/private/hidden）、member_publications テーブル、Playwright E2Eハーネス + 本番隔離TEST Supabaseプロジェクト
- v1.7追加: member_commit_slots テーブル（RLS付き）、CommitGoalView / CommitGrid / CommitGoalRow コンポーネント群、commitUtils.ts（JST週計算・streak・sort）、/login と /signin-51cf21389c56 分離、substack_handle UNIQUE制約
- コードベース: 約6,757行 src TypeScript/TSX（v1.7で+3,355行）
- v1.8追加: src/middleware.ts（/my・/admin認証ガード）、(auth)/(main) Route Group分離、Footer.tsx（3ステート）/HeaderNav.tsx、replace_member_commit_slots RPC（atomic upsert）、@next/third-parties GoogleAnalytics、Playwright spec拡充（27/28/29 + mobile-375 viewport）
- 本番/開発 Supabase 分離: prod=xolhjcngrwwwqtklmoyk / dev+E2E=otydhiumsdsyxepnjqjp
- 記事反映遅延: 最大5分（ISRハイブリッド継続）
- 本番ドメイン: https://keep-substack.com（旧 vercel.app から移行済み）

## Constraints

- **Tech Stack**: Next.js (App Router) + Tailwind CSS + rss-parser
- **Deploy**: Vercel（無料枠で運用可能な範囲）
- **Data Fetching**: ISR（revalidate設定可能）。SSRは毎リクエスト取得で重い、SSGはリビルド必要で鮮度が落ちる
- **Scale**: 初期50フィード程度。Vercel無料枠でも余裕の範囲

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ISR（SSGでもSSRでもなく） | 書いたらすぐ確認したい心理に対応しつつ、パフォーマンスとフィード元への負荷を抑える | ✓ Good — REVALIDATE_SECONDS=300 で運用中 |
| revalidateを設定可能に | 開発時は短く、運用安定後は伸ばせる柔軟性 | ✓ Good — 環境変数で制御、コード変更不要 |
| カレンダー型UI（草型ではなく） | 月別カレンダーの方が日付の把握がしやすい | ✓ Good — 月ナビゲーション付きで使いやすい |
| フィード管理は設定ファイル | v1はシンプルに。将来管理画面を追加予定 | ✓ Good — members.json 編集のみでメンバー追加可能 |
| 認証なし公開ページ | コミュニティメンバーに気軽にURLを共有できる | ✓ Good — URL共有だけで使える |
| @upstash/redis採用 | @vercel/kvは2024年12月廃止。Redis互換で移行リスク低 | ✓ Good — v1.1で安定稼働 |
| メンバー単位のunstable_cache | 全体一括キャッシュは2MB上限に抵触。個別キャッシュで回避 | ✓ Good — チームフィルターとも相性よし |
| `<img>`タグ使用でnext/image不採用 | remotePatterns設定が不要でKISSに準拠 | ✓ Good — next.config.ts変更ゼロ |
| HeatmapRowはServer Componentのまま | onError不要、条件レンダリングのみでimageUrlフォールバック実装 | ✓ Good — シンプルで型安全 |
| teamId→teamNameリネーム | より意味が明確なフィールド名 | ✓ Good — KV後方互換フォールバックで無停止移行 |
| form-in-table回避（onClick+FormData手動構築） | HTML仕様上`<form>`は`<tr>`内不可 | ✓ Good — 安定動作 |
| line-clamp-2をinline styleで実装 | Tailwind v4でflex内line-clamp未対応 | ⚠ Revisit — Tailwind v4アップデート時に再確認 |
| StoredFeed KVパターン（articles:{substackId}） | KV構造を型付きで管理、imageUrlも保存 | ✓ Good — Cron・初回登録・ISRハイブリッドで共用 |
| fetchAllFeedsCached シグネチャ維持 | 呼び出し元（page.tsx等）の変更をゼロに抑える | ✓ Good — Phase 10→12.1 で3回内部実装変更したがゼロ影響 |
| KV後方互換フォールバック（getMembers内） | DBマイグレーション不要でKV旧フォーマット対応 | ✓ Good — teamName→teamNames 無停止移行成功 |
| HIDDEN_TEAM 定数を types.ts に export | KISS — inline 定数より再利用性あり | ✓ Good — page.tsx から import で使用 |
| ISR + KVハイブリッドフェッチ | ライブRSS(5分キャッシュ) + KV過去記事のマージ | ✓ Good — CronとISRが補完しあう設計 |
| Substackブランドカラー #FF6719 を CSS変数 --color-primary として定数化 | KISS — inline色より再利用性あり | ✓ Good — opacity modifier(/70等)が使えて濃淡表現が容易 |
| Rippleエフェクトを純CSSで実装 | ライブラリ不要、YAGNI | ✓ Good — 軽量でタッチフィードバック向上 |
| ポップオーバーをclick+hover両対応 | デスクトップ・モバイル共通操作 | ✓ Good — touchstart + Click Outside で安定 |
| Supabaseクライアント3種類（server/client/admin）| SSR・ブラウザ・service_roleを明確に分離 | ✓ Good — getSession禁止でセキュア |
| ログインURL難読化（/login-51cf21389c56/）| Bot・スキャン対策 | ✓ Good — Supabase Redirect URLsに登録済み |
| proxy.tsでgetUser()使用（getSession禁止）| セキュリティホール回避（Supabase公式推奨）| ✓ Good — サーバー側検証で安全 |
| Transaction Pooler URL (port 6543) | 接続枯渇防止（Vercel Serverless環境）| ✓ Good — .env.local.exampleに明記 |
| kvMembers→members/kvArticles→articlesリネーム | Supabase移行完了後の命名整合性 | ✓ Good — Phase 21でimport全更新済み |
| teams.status カラム（public/private/hidden）でHIDDEN_TEAM定数を置換 | チーム可視性をコード定数ではなくDB駆動に | ✓ Good — v1.6 Phase 22、管理画面から設定変更可能 |
| Member型を `teamNames: string[]` → `teams: {name, status}[]` に破壊的変更 | status情報を全リーダーに伝播させる | ✓ Good — JOINで一括取得、フィルタはstatus直接参照 |
| /myの公開チーム参加は delete-then-insert を public-only にscope | private/hidden所属を絶対に触らない安全な自己管理 | ✓ Good — v1.6 Phase 23、6-caseユニットテストで保証 |
| member_publications を additive surrogate-PKテーブルとして追加 | 既存members.publication_idを壊さず将来の複数Substack対応 | ✓ Good — v1.6 Phase 25、UI/app code無変更、同期トリガーで整合 |
| E2Eは session-injection（@supabase/ssr setSession）+ 本番隔離TEST project | Magic Link実フローを避けつつ実DB契約を検証 | ✓ Good — v1.6 Phase 26、3 spec green、src無変更 |
| fresh DBのbootstrapは schema.sql（migrations/ではない） | migrations/は増分diffで空DBを起動できない | ✓ Good — v1.6 Phase 26で確認、schema.sqlがdurableミラー |
| commitSlots保存を delete+insert → replace_member_commit_slots RPC に置換 | 部分失敗による不整合を排除しアトミック化 | ✓ Good — v1.8 Phase 33、DB側トランザクションで冪等 |
| 認証ガードを middleware.ts に集約（/my・/admin） | proxy.tsはユニットテスト専用維持、実ガードはmiddlewareへ | ✓ Good — v1.8 Phase 33、ただし二重化解消はbacklog |
| Header/Footerを (main) Route Group の layout に分離 | root layoutは全ルートをラップするため、(auth)ページからHeader/Footerを外すにはRoute Group分割が必須 | ✓ Good — v1.8 quick 260611-ebu、URL不変・GAはrootに残しANLT-01維持 |
| GA4はenv varガード（NODE_ENVチェック不使用） | NEXT_PUBLIC_GA_MEASUREMENT_ID未設定でdev自動無効、ビルド時インライン | ✓ Good — v1.8 Phase 35、ユーザー決定（D-10） |
| 共有URLの絶対化はクライアント `window.location.origin`（ベースURL env 不使用） | ベースURL env が未定義、本番 keep-substack.com / dev を自動反映 | ✓ Good — v1.9 Phase 38、URL生成は Phase 37 `buildShareUrl` に委譲し重複なし |
| 共有文面・ログインゲートを `lib/share.ts` 定数で一元管理 | 文面変更・全員表示切替をフラグ1か所に集約（SHARE-05/06） | ✓ Good — v1.9 Phase 38 |
| 共有フィードバックは toast ライブラリ不使用・インライン表示 | KISS、新規依存ゼロ | ✓ Good — v1.9 Phase 38 |
| OG画像は最終的にスクリーンショット方式（next/og 動的画像から転換） | 本番で next/og 動的画像が不安定 → スクショ方式で実物忠実なプレビューを安定化 | ✓ Good — v1.9 Phase 39（PR#10）、近似より実物忠実を優先 |
| 共有URLビューは getUser() 参照で動的レンダリングへ移行 | ログイン依存の共有ボタン表示のため ISR キャッシュ無効化は妥当 | ⚠ Revisit — トラフィック増時にキャッシュ戦略を再検討 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-18 after starting v1.10 milestone*
