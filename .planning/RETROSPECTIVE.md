# Project Retrospective: Keep Substack

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-08
**Phases:** 3 | **Plans:** 6 | **Sessions:** 1日

### What Was Built
- Next.js 16.2.6 App Router + rss-parser によるISRフィード取得基盤（REVALIDATE_SECONDS環境変数制御）
- タイムゾーン安全な月別カレンダーUI（月ナビゲーション、hover+clickツールチップ）
- 全メンバー俯瞰ミニカレンダーダッシュボード（記事数による色濃度6段階）
- 個人詳細ページ /member/[substackId]（generateStaticParams静的生成）
- Vercel デプロイ完了: https://keep-substack.vercel.app/

### What Worked
- GSD フレームワークによる段階的実装（フェーズ→プラン）で迷いなく進められた
- KISS/YAGNI原則の徹底により、シンプルで保守しやすいコードに仕上がった
- Phase 1 でISRとキャッシュ基盤を確立したことで、Phase 2・3の実装がスムーズだった
- Server Componentを主体とした設計で、状態管理の複雑さを最小限に抑えた

### What Was Inefficient
- REQUIREMENTS.md のチェックボックスをプラン完了時に更新するステップが省略されていた（アーカイブ時に改めてすべてチェック）
- milestone audit を実施せずにマイルストーン完了に進んだ（要件はSUMMARYで確認済みなので実害なし）

### Patterns Established
- `force-static` + `unstable_cache` + `REVALIDATE_SECONDS` 環境変数 — Next.js ISRの可変revalidate実現パターン
- Map シリアライズ: `Array.from(map.entries())` でServer→Client渡し、Client側で `new Map()` 再構築
- CSS動的グリッド: Tailwind 動的クラスではなく `style={{ gridColumnStart }}` を使用
- `generateStaticParams` + `dynamicParams=false` — 静的生成 + 未知パス自動404の安全パターン
- ツールチップ: `onMouseEnter/Leave` の `relatedTarget` チェックで、セル→ツールチップ移動時の意図せず閉じる問題を回避

### Key Lessons
1. Next.js の `export const revalidate` はリテラル値のみ有効 — 動的な環境変数参照には `unstable_cache` の revalidate パラメータを使う
2. Tailwind JIT は動的クラス名（`col-start-${n}` など）を検知できない — CSS値を動的にする場合は `style` prop を使う
3. rss-parser の型定義は本体に同梱 — `@types/rss-parser` は存在せず不要
4. REQUIREMENTS.md のチェックボックスは各フェーズ完了時に更新しておくと、マイルストーン完了時にすんなり進める

### Cost Observations
- Model mix: Sonnet 4.6 (1M context)
- Sessions: 1日で3フェーズ完結
- Notable: MVPとして必要最小限のスコープを維持したことで、1日でデプロイまで完了できた

---

## Milestone: v1.1 — Dynamic Members + Weekly View

**Shipped:** 2026-05-10
**Phases:** 3 (4-6) | **Plans:** 6 | **Sessions:** 2日

### What Was Built
- Upstash Redis KV移行（@upstash/redis）、addMember/deleteMemberでのCRUD基盤
- 直近7日間ヒートマップ（JST日付対応、50人対応、weekly合計列）
- サムネイル付きリッチTooltip（RSS content:encodedからregex抽出）
- /admin管理画面（Basic認証・Server Actions・useActionState）
- チームタブUI + /?team=xxx URLパラメータフィルタリング

### What Worked
- discuss-phase でD-01〜D-15の実装決定をすべて事前確定 → 実装中の迷いゼロ
- Wave分割（データ層先行 → UI後続）で依存関係を明確に管理できた
- UAT中に発見したバグ（middleware配置、Buffer、キャッシュ上限、JST変換）を即時修正できた
- GSDワークフローが状態管理（STATE.md、ROADMAP.md）を自動追跡してくれた

### What Was Inefficient
- STATE.mdに「Next.js 16ではmiddleware.tsは使わない」という誤った記述があり、discuss-phaseでmiddleware.tsを採用してもUAT中まで問題が顕在化しなかった
- REQUIREMENTS.mdのチェックボックスが実行中に更新されなかった（v1.0と同じ問題）

### Patterns Established
- **Next.js 16 middleware配置**: src/app配下を使う場合は`src/middleware.ts`（appDirの親を検索）
- **Edge Runtime Base64**: `Buffer.from().toString('base64')` → `btoa()`（Edge RuntimeにBufferポリフィルなし）
- **unstable_cacheサイズ管理**: 全体一括は2MB上限に引っかかる → メンバー単位など分割キャッシュ
- **RSS日付のJST変換**: `Date.parse(isoDate) + 9*3600*1000` → `new Date(ms).getUTC*()` でサーバーTZ非依存
- **Server Actions パターン**: `'use server'` + `useActionState(action, null)` + `revalidatePath()` でフォーム即時反映

### Key Lessons
1. Next.js 16はv15と内部実装が変わっている点がある（middleware配置、Edge Runtime API）。STATEに記録した技術メモが古い場合、最新ソースコードを直接確認する方が確実
2. `unstable_cache`はシリアライズサイズに2MB上限がある。contentEncodedのようなリッチフィールドを含む場合は個別キャッシュが安全
3. RSS `isoDate`はUTC。日本向けサービスはJST変換（+9h）後に日付キーを生成する必要がある
4. REQUIREMENTS.mdのチェックボックスは各フェーズ完了時に更新する（または廃止してSUMMARYで代替）

### Cost Observations
- Model mix: Sonnet 4.6 (1M context)
- Sessions: 2日で3フェーズ（UAT含む）完結
- Notable: UAT中のバグ修正4件がすべて根本原因特定+修正まで1セッションで完了

---

## Milestone: v1.2 — UX Polish + Member Edit

**Shipped:** 2026-05-11
**Phases:** 3 (7-9) | **Plans:** 3 | **Sessions:** 1日

### What Was Built
- Tooltip記事カードを一体型`<a>`ブロック化（画像クリックで記事遷移、mb-3スペース追加）
- メンバー詳細ページの戻りリンクを「← メンバー一覧」に変更、teamId条件分岐URL
- 全ページ共通フッター（「このSubstack継続可視化ツールに参加したい方はコチラ」）
- rss-parser feed.image?.urlからSubstackアイコン取得・全ビューに表示
- トップビューのレスポンシブ対応（スマホ: アイコンのみ、PC: アイコン+名前、sm:640px）
- 管理画面メンバーインライン編集（editingId state + form-in-table回避パターン）
- teamId→teamName全体リネーム + KV後方互換フォールバック

### What Worked
- 小規模フェーズ（1フェーズ1プラン）で各機能を独立して実装・検証できた
- UATで実際のUX問題（アイコンサイズ、列幅、テーブルカラー）を素早く発見・修正できた
- discuss-phaseでteamId→teamNameリネームのスコープと移行方針（後方互換フォールバック）を事前確定 → 実装がスムーズ

### What Was Inefficient
- REQUIREMENTS.mdのチェックボックスが再びアーカイブ時まで未更新（v1.0/v1.1と同じ繰り返し）
- 管理画面テーブルのカラーシステムがUAT中に数回の試行錯誤（ダークテーマ適用まで3往復）

### Patterns Established
- **rss-parser feed.image?.url**: customFields宣言不要でfeed.image.urlが標準取得可能
- **form-in-table回避**: `<form>`不使用、`button onClick + closest('tr') + querySelectorAll('input[name]')` でFormData手動構築
- **KV後方互換フォールバック**: `getMembers()`で `teamName ?? teamId ?? ''` マッピングにより無停止フィールドリネーム
- **Tailwind v4 line-clamp flex問題**: flex内でline-clamp-2が効かない → inline styleで回避（コメント記録必須）
- **管理画面ダークテーマ**: `bg-black + text-white + border-gray-700`、hover `bg-gray-800`、編集行 `bg-gray-800`

### Key Lessons
1. REQUIREMENTS.mdのチェックボックスはフェーズ完了時に更新する（3マイルストーン連続で同じ問題 → 次回はexecute-phase完了フックで自動化を検討）
2. Tailwind v4の新機能・挙動変化は実装時に直接確認が必要（line-clamp等）
3. UAT中のUI調整はユーザーフィードバックが正確 — 最初から完璧を目指さず仮実装→UAT→微調整サイクルが効率的

### Cost Observations
- Model mix: Sonnet 4.6 (1M context)
- Sessions: 1日で3フェーズ（UAT・UI調整含む）完結
- Notable: 3フェーズが各1プランの小規模構成 — UAT込みでも1日で完結

---

## Milestone: v1.3 — Data Persistence + Multi-Team

**Shipped:** 2026-05-12
**Phases:** 4 (10-12.1) | **Plans:** 4 | **Sessions:** 2日

### What Was Built
- Vercel Cron（UTC 20:00）+ kvArticles.ts でRSS記事をKVに累積保存（過去記事消失解消）
- addMemberAction 登録直後に初回フィード取得・KV保存（即時閲覧可能）
- Member.teamNames: string[] 多対多所属 + KV後方互換フォールバック（DBマイグレーション不要）
- シークレットチーム "chameleon" の非表示ロジック（HIDDEN_TEAM 定数パターン）
- ISR (revalidate=300) + ライブRSSとKVのハイブリッドフェッチで最大5分以内反映

### What Worked
- fetchAllFeedsCached シグネチャを3フェーズ（10→12.1）で維持したことで呼び出し元変更ゼロ
- KV後方互換フォールバック（getMembers内のmap変換）でDBマイグレーション不要の移行を3回実施
- HIDDEN_TEAM 定数パターンでシークレットチーム機能を2ファイル変更のみで実装（KISS徹底）
- Phase 12.1 でISR + KVハイブリッドを「fetchAllFeedsCached の内部実装変更のみ」で実現

### What Was Inefficient
- REQUIREMENTS.mdのチェックボックスが今回もアーカイブ時まで未更新（4マイルストーン連続の同じ問題 → 解決が必要）
- plan-checker が RESEARCH.md のコードサンプルとPLAN.mdのactionに矛盾を発見（BLOCKER）→ 修正後に再検証が必要だった

### Patterns Established
- **StoredFeed KVパターン**: `articles:{substackId}` → `{ items: FeedItem[], imageUrl?: string }` — imageUrl も KV に保存して即時表示
- **Vercel Cron Bearer認証**: `!cronSecret` チェック先行 → CRON_SECRET未設定時の認証バイパスを防止
- **HIDDEN_TEAM 定数パターン**: 予約チーム名を types.ts に export 定数で定義 → page.tsx から import して使用（inline 定数より再利用性あり）
- **ISR + KV ハイブリッド**: `Promise.allSettled` 二重並列（外側:メンバー、内側:RSS/KV）+ link dedupe（undefined link は除外しない）+ isoDate 降順ソート

### Key Lessons
1. REQUIREMENTS.mdのチェックボックスは依然として自動更新されていない — execute-phase フックか discuss-phase テンプレートに組み込むべき（5マイルストーン目の課題にしない）
2. RESEARCH.md のコードサンプルと PLAN.md のタスク action は同じロジックを独立して記述するため矛盾しやすい — plan-checker が有効に機能した
3. fetchAllFeedsCached シグネチャを変えないという決定（D-04）が Phase 10→12.1 の全フェーズで一貫して効いた — 初期決定の価値
4. `Set.has(undefined)` は true を返す — link が undefined の記事を dedupe キーにする際は `if (item.link && ...)` ガードが必須

### Cost Observations
- Model mix: Sonnet 4.6 (1M context)
- Sessions: 2日で4フェーズ（bonus phase 2本含む）完結
- Notable: Phase 12 と 12.1 は当初スコープ外だったが、シンプルな実装で素早く追加できた

---

## Milestone: v1.6 — Team Roles + Member Self-Service

**Shipped:** 2026-05-30
**Phases:** 5 (22-26) | **Plans:** 14 | **Sessions:** ~5日

### What Was Built
- teams.status カラム（public/private/hidden）+ HIDDEN_TEAM定数廃止 + Member型を `teams: {name, status}[]` に破壊的変更
- /myページの公開チーム自由参加フロー（public-only scoped delete-then-insert、private/hiddenはreadonly）
- /admin/teams/[teamName] 動的RSCでhiddenチームの週次ヒートマップ（既存proxy.tsゲートで保護）
- member_publications additive テーブル（部分ユニークIndex + RLS + 同期トリガー、app code無変更）
- Playwright E2Eハーネス + 本番隔離TEST Supabaseプロジェクト、3 spec（login/my-teams/admin-guard）green

### What Worked
- 破壊的型変更（teamNames→teams）を getMembers() の JOIN拡張で全リーダーに一括伝播 — status直接参照でフィルタ簡潔化
- session-injection E2E（@supabase/ssr setSession）で実Magic Linkフローを避けつつ決定論的に実DB契約を検証、src無変更
- member_publications を additive surrogate-PK テーブルで追加 — app/UI無変更でスキーマ拡張（SCHEMA-01/02をリスクなく達成）
- 同一セッション内の再監査で gaps_found(10/14) → tech_debt(14/14) へ是正（traceability 3-source cross-ref + Phase 22 UAT/SECURITY/VALIDATION完了 + 6/6 integration）

### What Was Inefficient
- SUMMARY frontmatter の requirements-completed 記入漏れ（TEAM-02・SCHEMA-01/02 が `[]` のまま）— 機能完了とbookkeepingが乖離（v1.3から続く課題）
- Phase 22 が verifier VERIFICATION.md ではなく UAT path で検証され、アーカイブ形式が不統一
- supabase/migrations/ が空DBをbootstrapできず Phase 26 で schema.sql 適用に切替（DEVIATION）— migrations/が増分専用という前提が当初不明瞭
- Phase 24 human UAT が partial のまま（VIEW-01 live browser render 未確認、VIEW-02はPhase 26 E2E-03でカバー）

### Patterns Established
- **status-driven team visibility**: チーム可視性をコード定数（HIDDEN_TEAM）ではなくDB列で管理 → 管理画面から変更可能
- **public-only scoped reconcile**: 自己管理の delete-then-insert を status='public' に限定し private/hidden 所属を絶対に触らない
- **additive surrogate-PK schema extension**: 既存列を壊さず新テーブル+同期トリガーで拡張、app code無変更
- **session-injection E2E**: 実認証フローを避け setSession round-trip + 本番隔離TEST project で実DB検証
- **schema.sql = fresh-DB bootstrap の正**: migrations/ は増分diff専用、新規プロビジョニングは schema.sql（durable mirror）

### Key Lessons
1. supabase migrations/ は増分diff専用 — 新規/空DBの起動は schema.sql が正（Phase 26 で確認、[[supabase-schema-provisioning]]）
2. E2Eは実Magic Linkを避け session-injection で決定論化し、本番から隔離したTEST projectで実DB契約を検証する
3. 破壊的型変更（Member.teams）は JOIN で一括取得すれば全リーダーへの伝播が自然に閉じる
4. SUMMARY frontmatter の requirements-completed は依然手動記入漏れが発生 — 監査の3-source cross-referenceで吸収できたが理想は自動化
5. 同一セッション内の再監査（traceability fix → 検証アーティファクト完成 → integration確認）で gaps_found を tech_debt に是正できた

### Cost Observations
- Model mix: Opus 4.8 (1M context) 中心
- Sessions: ~5日で5フェーズ14プラン（91コミット）
- Notable: Phase 25/26 は src無変更（DBスキーマ + テストハーネスのみ）で基盤を安全に拡張

---

## Milestone: v1.7 — Commit & Goal View + Substack Profile Link

**Shipped:** 2026-06-06
**Phases:** 5 (27-31) | **Plans:** 12 | **Sessions:** 4日

### What Was Built
- members.substack_handle カラム追加 + /my @handle 入力・保存・CalendarGridプロフィールリンク（Phase 27）
- member_commit_slots テーブル（RLS付き）+ CommitScheduleModal + updateCommitSlotsAction（Phase 28）
- CommitGoalView / CommitGrid / CommitGoalRow + commitUtils.ts（JST週計算・streak・sort）+ /weekly-stamp（Phase 29）
- 👑🔥アチーブメント計算（isCurrentWeekComplete / consecutiveWeekStreak / sortMembersForCommitView TDD）（Phase 30）
- ログインフロー修正：/login（既存メンバー）/ /signin-51cf21389c56（招待）分離 + substack_handle UNIQUE制約（Phase 31）

### What Worked
- commitUtils.ts を TDD で実装（Phase 30）— ロジックをUIから完全分離し再利用性と証明可能性を両立
- sortMembersForCommitView で per-member データを比較前に一括事前計算（pre-compute）— 比較関数内でのO(n)再計算を回避
- PR #3 コードレビューでの誤指摘を追調査で是正（admin role check は意図的変更と確認、null-pid ガードは既存コードで対処済み）
- home page の slotsError を throw → console.error + フォールバックに修正し、DBエラーで全体500を防止
- 本番/dev DB の制約差分を information_schema SQL + PostgREST API 経由で比較できた（2件の未適用マイグレーション発見）

### What Was Inefficient
- REQUIREMENTS.md のトレーサビリティ表が Phase 28/29 完了後も Pending のまま放置 — マイルストーン close 時に手動修正が必要だった
- Phase 27 human UAT が 6 シナリオ未完のままマイルストーン close まで繰り越し — UAT 完了を phase completion の必須ゲートにすべきだった
- 本番 DB への `supabase db push` という誤誘導（config.toml なし、SQL Editor が正道）— PR description の警告が不完全
- quick tasks の status: missing が 6 件 — 完了したタスクの状態更新漏れが累積

### Patterns Established
- **commitUtils.ts 純粋関数分離**: JST日付計算・週達成判定・ストリーク計算・ソートをUIから独立させTDDで保証
- **pre-compute before sort**: comparator 内で重複計算せず、Map で事前にメトリクスを計算してからソート
- **graceful degradation over throw**: ページ全体に影響する補助データ（スロット）のfetchエラーは throw せず fallback
- **本番/dev スキーマ比較手順**: PostgREST OpenAPI spec（カラム一致確認）+ Dashboard SQL Editor（制約確認）の2段階

### Key Lessons
1. PRレビューでの Critical 指摘は追調査必須 — 「user.role vs app_metadata.role」はコードコメントと一貫したテストで意図的変更と確認できた
2. REQUIREMENTS.md のトレーサビリティは phase 完了時に即座に更新する（milestone close で大量修正が発生する）
3. 本番 DB マイグレーション適用は SQL Editor 経由（supabase db push は config.toml 必須）— PR description に明記だけでは不十分
4. human UAT ギャップは「次マイルストールで」として繰り越すよりも、シナリオを削減してでも完了させた方がよい

### Cost Observations
- Model mix: Sonnet 4.6 (1M context) 中心
- Sessions: 4日で5フェーズ12プラン（164コミット）
- Notable: Phase 31 は計画外のギャップクローズ（Plan 04）で G-01（既存メンバー再ログイン不可）を発見・修正

---

## Milestone: v1.8 — Debug, Stabilization & UI Polish

**Shipped:** 2026-06-11
**Phases:** 5 (32-36) | **Plans:** 18 | **Sessions:** 〜4日

### What Was Built
- 本番 Supabase DB に member_commit_slots を適用しコミットスケジュール保存を本番稼働（Phase 32、コード変更ゼロの運用フェーズ）
- middleware.ts による /my・/admin 認証ガード + Magic Link の open-redirect 安全な next 伝搬（BUG-02）、RSS即時取得修正（BUG-01）、replace_member_commit_slots RPC でのアトミック保存（DB-01）（Phase 33）
- (auth)/(main) Route Group 分離、Footer 3ステート、HeaderNav、ソート順変更（Phase 34）
- private チームのトップビュー公開表示（TEAM-01）+ @next/third-parties GoogleAnalytics（ANLT-01/02）（Phase 35）
- Phase 27 本番 UAT 6/6 PASS + 27/28/29 VERIFICATION を verified に解消（Phase 36）

### What Worked
- マイルストーン監査（/gsd:audit-milestone）が UI-01 の本番レンダリング欠陥を捕捉 — Phase 34 VERIFICATION が「(auth)/layout.tsx に Header/Footer がない」という存在レベル確認で PASSED と誤判定していたのを、統合チェッカーが root layout のネスト構造まで追って本番 curl で実証
- UI-01 修正を /gsd:quick で局所的に処理 — (main) Route Group 化、168テスト全緑 + build 成功で衝突なしを保証、import 修正不要
- Phase 32 を「コード変更ゼロの運用フェーズ」として Nyquist manual-only 認定 — 本番DB状態は inherent-manual と判断し、被覆を兄弟フェーズ 28/33 に帰属
- 検証ギャップの resolved-by-reference（28#1 → Phase 32）で再検証の重複を回避

### What Was Inefficient
- Phase 34 の VERIFICATION が PASSED (25/25) を出したが UI-01 は本番で壊れていた — レイアウト系は「ファイル存在」ではなく「描画ツリー全体」を検証すべきだった。監査がなければ壊れたまま出荷していた
- PROJECT.md の Active 要件チェックボックスが phase transition 時に更新されず、close 時に全件手動移動（v1.7 と同じ轍）
- 本番手動確認（Phase 33/35）が partial のまま close まで繰り越し — 本番外部サービス依存で inherent-manual だが、デプロイ前提のゲート設計が曖昧だった
- 完了済み todo（restore-next-redirect / upsert-commit-slots）のファイル削除漏れが audit のオープン項目を水増し

### Patterns Established
- **Route Group でのレイアウト分離**: root layout は html/body + 全ページ共通要素（GA）のみ。ページ固有のシェル（Header/Footer）は (main) など下位グループの layout に置く。(auth) は別グループで共通シェルを継承しない
- **運用フェーズの Nyquist manual-only 認定**: コード変更ゼロのフェーズは自動テストを捏造せず、本番状態を manual-only として記録し被覆を兄弟フェーズに帰属
- **監査での描画ツリー検証**: レイアウト要件は単体ファイルの存在ではなく、本番 HTML（curl）でネスト後の最終出力を確認

### Key Lessons
1. レイアウト/シェルの「非表示」要件は、コンポーネント単体ではなく App Router のネスト解決後の最終描画で検証する（存在レベル確認は false PASS を生む）
2. milestone audit はマイルストーン close 前の最後の砦 — phase VERIFICATION の PASSED を鵜呑みにせず統合チェッカーで本番実証する価値がある
3. inherent-manual な本番確認は「next milestone へ繰り越し」を前提に、コードレベル検証で要件 Complete を判定してよい（外部サービス依存をゲートにすると永遠に close できない）
4. PROJECT.md トレーサビリティとtodoクリーンアップは phase 完了時に即座に（v1.7 の learning が再発 — 仕組み化が必要）

### Cost Observations
- Model mix: Sonnet 4.6 / Opus 4.8 混在（close フェーズは Opus）
- Sessions: 〜4日で5フェーズ18プラン
- Notable: UI-01 は監査で発見され close 直前に quick task で修正 — 監査を挟まなければ見逃していた構造的欠陥

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 6 | 初回 MVP — GSD フレームワーク初適用 |
| v1.1 | 3 | 6 | KV移行 + ヒートマップUI刷新 — UAT中バグ4件を即時修正 |
| v1.2 | 3 | 3 | UX改善・アイコン・管理画面編集 — 1フェーズ1プランの小規模構成で1日完結 |
| v1.3 | 4 | 4 | KV永続化・多対多チーム・ISRハイブリッド — bonus phase 2本を含む |
| v1.4 | 4 | 4 | UI/UX刷新（ファーストビュー・ヒートマップ配色・ポップオーバー）— モバイルファースト |
| v1.5 | 5 | 11 | Supabase完全移行 + Magic Link認証 + /my自己管理 — 最大規模のマイルストーン |
| v1.6 | 5 | 14 | チームステータスDB管理・/my自由参加・Playwright E2E基盤 — schema.sql bootstrap確立 |

### Top Lessons (Verified Across Milestones)

1. KISS/YAGNI原則の徹底がシンプルで保守しやすいコードにつながる
2. フェーズ完了時にREQUIREMENTS.mdを更新しておくとマイルストーン完了がスムーズ（4回連続で同じ問題 → 次回は必ず解決）
3. フレームワークのメジャーバージョン変更点（v15→v16等）は実装前にソースコードで直接確認する
4. キャッシュエントリのサイズを意識した設計（全体一括 vs 個別）が重要
5. UAT → 素早いフィードバックループが品質向上に最も効果的。完璧な初回実装より仮実装→UAT→微調整サイクルが効率的
6. 関数シグネチャを変えないという初期決定が複数フェーズにわたって呼び出し元への影響をゼロに保つ（fetchAllFeedsCached: 3フェーズ連続で内部実装変更・シグネチャ維持）
7. plan-checker による RESEARCH.md vs PLAN.md の矛盾検出は有効 — 同じロジックを2箇所に記述する際は必ずチェックを通す
8. additive surrogate-PK テーブル + 同期トリガーで、既存スキーマを壊さず app code 無変更のままDB拡張できる（v1.6 member_publications）
9. fresh/空のSupabase DBの起動は schema.sql（durable mirror）が正。migrations/ は増分diff専用で空DBをbootstrapできない（v1.6 Phase 26で確認）
10. E2Eは実Magic Linkを避け session-injection（setSession）+ 本番隔離TEST project で決定論的に実DB契約を検証する（v1.6 Phase 26）
