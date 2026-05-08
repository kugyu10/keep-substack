# Phase 1: プロジェクト基盤とデータ層 - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Next.jsプロジェクトを初期化し、JSON設定ファイルによるメンバー管理、rss-parserによるRSSフィード取得・解析、ISRキャッシュ、Vercelデプロイまでを構築する。カレンダーUIはPhase 2のスコープ。

</domain>

<decisions>
## Implementation Decisions

### フィード取得戦略
- **D-01:** フィード取得失敗時は1秒待ってリトライ、それでもダメなら非表示（v1はシンプルに）
- **D-02:** 全フィードをPromise.allSettledで並列取得。個別の失敗が他に影響しない
- **D-03:** フィード取得のタイムアウトは5秒
- **D-04:** 取得する記事は直近30件まで

### ISRとデプロイ設定
- **D-05:** ISR revalidateの初期値は5分（300秒）。「書いたらすぐ確認したい」心理に対応
- **D-06:** revalidate値は環境変数で管理。Vercel管理画面から再デプロイなしで変更可能
- **D-07:** GitHub連携でVercelにデプロイ。mainブランチpushで自動デプロイ

### Claude's Discretion
- 設定ファイル（JSON）の構造・配置場所はClaude判断
- Phase 1での表示範囲（最小限のUI）はClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### プロジェクト要件
- `.planning/PROJECT.md` — プロジェクト概要、制約、技術スタック決定
- `.planning/REQUIREMENTS.md` — v1要件一覧（DATA-01〜04, DEP-01がPhase 1対象）
- `.planning/ROADMAP.md` — フェーズ定義とSuccess Criteria

### 初期構想
- `requirements.md` — 元の指示書。rss-parser使用、カレンダーUI構想の原点

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- なし（新規プロジェクト）

### Established Patterns
- なし（新規プロジェクト。Next.js App Router + Tailwind CSSで構築）

### Integration Points
- なし（Phase 1が基盤を構築する）

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-プロジェクト基盤とデータ層*
*Context gathered: 2026-05-08*
