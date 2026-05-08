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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 6 | 初回 MVP — GSD フレームワーク初適用 |

### Top Lessons (Verified Across Milestones)

1. KISS/YAGNI原則の徹底がシンプルで保守しやすいコードにつながる
2. フェーズ完了時にREQUIREMENTS.mdを更新しておくとマイルストーン完了がスムーズ
