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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 6 | 初回 MVP — GSD フレームワーク初適用 |
| v1.1 | 3 | 6 | KV移行 + ヒートマップUI刷新 — UAT中バグ4件を即時修正 |
| v1.2 | 3 | 3 | UX改善・アイコン・管理画面編集 — 1フェーズ1プランの小規模構成で1日完結 |
| v1.3 | 4 | 4 | KV永続化・多対多チーム・ISRハイブリッド — bonus phase 2本を含む |

### Top Lessons (Verified Across Milestones)

1. KISS/YAGNI原則の徹底がシンプルで保守しやすいコードにつながる
2. フェーズ完了時にREQUIREMENTS.mdを更新しておくとマイルストーン完了がスムーズ（4回連続で同じ問題 → 次回は必ず解決）
3. フレームワークのメジャーバージョン変更点（v15→v16等）は実装前にソースコードで直接確認する
4. キャッシュエントリのサイズを意識した設計（全体一括 vs 個別）が重要
5. UAT → 素早いフィードバックループが品質向上に最も効果的。完璧な初回実装より仮実装→UAT→微調整サイクルが効率的
6. 関数シグネチャを変えないという初期決定が複数フェーズにわたって呼び出し元への影響をゼロに保つ（fetchAllFeedsCached: 3フェーズ連続で内部実装変更・シグネチャ維持）
7. plan-checker による RESEARCH.md vs PLAN.md の矛盾検出は有効 — 同じロジックを2箇所に記述する際は必ずチェックを通す
