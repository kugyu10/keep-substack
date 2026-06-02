# Keep Substack

## Current Milestone: v1.7 Commit & Goal View + Substack Profile Link

**Goal:** コミットスケジュールの宣言と3週間の達成グリッドで「継続の意志と実績」を仲間に見せるトップビューを新設し、Substackプロフィールへの直リンクも追加する

**Target features:**
- 個人マンスリービューの名前/アイコンから `https://substack.com/@{substack_handle}` へ遷移
- 新トップビュー（Commit & Goal View）— 行レイアウト: `|アイコン+名前 | コミットGrid | 👑🔥|`
- コミットGrid: 3週分横並び（左古→右新）、週1〜4で総横幅同一、達成 = サムネイル / 未達成 = 曜日名
- /my ページからコミットスケジュール設定（週N回・曜日・時刻）
- アチーブメント: 👑 今週全コミット達成 ／ 🔥 2週以上連続達成中
- 現トップ（週次ヒートマップ）を `/weekly-stamp` に移動

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

Substack継続仲間コミュニティ向けの、メンバーの記事公開頻度をヒートマップUIで可視化するWebアプリ。GitHubの草（コントリビューショングラフ）のように「頑張り」が一目でわかり、継続のモチベーションを支える。Next.js (App Router) + Tailwind CSS + Supabase PostgreSQLで構築し、Vercelにデプロイ済み。v1.5でSupabase完全移行・Magic Linkログイン・メンバー自己管理を実装し、管理者依存を排除した自律的なサービスになった。v1.6でチームステータス（public/private/hidden）のDB管理・/myページからの公開チーム自由参加・Playwright E2Eテスト基盤を追加し、コミュニティの自律性と品質を強化した。

## Core Value

仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること。

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

### Active

- [ ] 個人マンスリービューで名前/アイコンクリック → `https://substack.com/@{substack_handle}` に遷移する
- [ ] `/my` ページで Substack @handle を登録・更新できる
- [ ] `/my` ページでコミットスケジュール（週N回・曜日・時刻）を設定できる
- [ ] 新トップページにコミット＆ゴールビューを表示する（行: アイコン+名前 / コミットGrid / アチーブメント）
- [ ] コミットGridが3週分横並びで表示される（週1〜4で総横幅同一・達成=サムネイル / 未達成=曜日名）
- [ ] スマホ幅が足りない場合はGridを1週表示に縮退する
- [ ] コミット未設定メンバーは `| 未コミット |` グレー表示される
- [ ] 👑（今週全コミット達成）・🔥（2週以上連続達成）のアチーブメントアイコンを表示する
- [ ] 現トップ（週次ヒートマップ）が `/weekly-stamp` で引き続きアクセスできる

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
- 記事反映遅延: 最大5分（ISRハイブリッド継続）

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
*Last updated: 2026-06-02 after v1.7 milestone started — Commit & Goal View + Substack Profile Link*
