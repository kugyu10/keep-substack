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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 6 | 初回 MVP — GSD フレームワーク初適用 |
| v1.1 | 3 | 6 | KV移行 + ヒートマップUI刷新 — UAT中バグ4件を即時修正 |

### Top Lessons (Verified Across Milestones)

1. KISS/YAGNI原則の徹底がシンプルで保守しやすいコードにつながる
2. フェーズ完了時にREQUIREMENTS.mdを更新しておくとマイルストーン完了がスムーズ
3. フレームワークのメジャーバージョン変更点（v15→v16等）は実装前にソースコードで直接確認する
4. キャッシュエントリのサイズを意識した設計（全体一括 vs 個別）が重要
