# Project Research Summary

**Project:** Keep Substack
**Domain:** RSS feed activity visualization calendar app
**Researched:** 2026-05-08
**Confidence:** HIGH

## Executive Summary

Keep Substackは、Substackコミュニティメンバーの記事公開頻度をカレンダーUIで可視化するWebアプリである。この種のアプリケーションは、サーバーサイドでRSSフィードを取得し、ISR（Incremental Static Regeneration）でキャッシュした静的ページとして配信するのが定石である。データベースは不要で、RSSフィード自体がデータソースとなる。Next.js 15.5.x (App Router) + Tailwind CSS v4 + rss-parser + date-fnsという軽量スタックで、Vercel無料枠内での運用が十分に可能である。

推奨アプローチは、Server Componentsでのデータフェッチを基本とし、Client Componentsはホバーツールチップなどのインタラクション要素のみに限定する構成である。50フィードの並列取得はPromise.allSettledで個別のフィード障害に耐性を持たせ、AbortControllerで個別タイムアウトを設定する。カレンダーUIはライブラリを使わず、date-fnsの日付計算とTailwind CSSの7列グリッドで自前構築する（KISS原則）。

主要リスクは3つ: (1) rss-parserのタイムアウト未設定によるISR再生成失敗、(2) ISRのstale-while-revalidate挙動への誤解（「書いたのに反映されない」問題）、(3) Client Componentの肥大化によるバンドルサイズ増大。いずれも初期設計段階で対処可能であり、本ドキュメントの各フェーズ提案に防止策を組み込んでいる。

## Key Findings

### Recommended Stack

Next.js 15.5.x（v16はbreaking changesが多くオーバー）、Tailwind CSS v4（設定ファイル不要でシンプル）、rss-parser 3.13.0（530K weekly downloads、安定）、date-fns 4.x（ツリーシェイク対応、カレンダー計算に最適）という構成。ツールチップはCSSネイティブで十分（YAGNI）。

**Core technologies:**
- **Next.js 15.5.x**: フルスタックフレームワーク -- ISRネイティブ対応、Vercel最適化
- **Tailwind CSS v4**: ユーティリティCSS -- 設定ファイル不要、ビルド5倍高速
- **rss-parser 3.13.0**: RSSフィード解析 -- 安定、TypeScript型付き
- **date-fns 4.x**: 日付計算 -- ツリーシェイク対応、カレンダーグリッド構築に必要な関数群

### Expected Features

**Must have (table stakes):**
- 月別カレンダー表示 + 記事公開日のハイライト -- コア価値
- ホバーツールチップ（記事タイトル + 元記事リンク） -- ユーザビリティ
- 全メンバーダッシュボード -- 全体俯瞰
- 個人詳細ビュー -- 個別確認
- レスポンシブデザイン -- モバイル対応
- ISR自動更新 -- データ鮮度

**Should have (differentiators):**
- 連続投稿（ストリーク）表示 -- モチベーション向上
- 月間投稿数サマリー -- 活動量の定量化
- 前月/翌月ナビゲーション -- 過去の活動確認
- アクティビティヒートマップ（色の濃淡） -- GitHub草風の視覚表現

**Defer (v2+):**
- メンバーランキング -- コミュニティの雰囲気次第で逆効果の可能性あり、要確認
- フィード管理UI -- v1は設定ファイルで十分
- 認証機能 -- 公開ページとして設計

### Architecture Approach

サーバーサイドRSSフェッチ + ISRキャッシュのシンプルなアーキテクチャ。データベース不要、API Routes不要、クライアントサイドフェッチ不要。JSON設定ファイル -> Server Component -> rss-parser -> データ変換 -> カレンダーUIという一方向のデータフローである。

**Major components:**
1. **config/members.json** -- メンバー名とフィードURLの管理
2. **lib/feed.ts** -- RSS取得・解析（Promise.allSettled + AbortController）
3. **lib/calendar.ts** -- フィードデータからカレンダーデータ構造への変換
4. **app/page.tsx** -- ダッシュボード（Server Component、ISR対応）
5. **app/member/[slug]/page.tsx** -- 個人詳細ビュー
6. **components/DayCell.tsx** -- 唯一のClient Component（ホバーツールチップ用）

### Critical Pitfalls

1. **rss-parserタイムアウト未設定** -- AbortControllerで5秒タイムアウトを設定し、Promise.allSettledで個別障害を隔離する
2. **ISR鮮度の誤解** -- 「最終更新」タイムスタンプをページに表示し、stale-while-revalidateの挙動をコミュニティに説明する
3. **Client Componentの肥大化** -- DayCellのみを'use client'にし、Calendar/Dashboard/データ取得はServer Componentに保つ
4. **カレンダーの日付ズレ** -- date-fnsで全日付計算を統一、UTCに正規化する
5. **SubstackのRSSフィード上限（~20件）** -- v1ではこの制約を受け入れ、「最近の活動」として表示する

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Data Layer
**Rationale:** 全ての機能がRSSデータに依存する。まずプロジェクト骨格とデータ取得基盤を固める
**Delivers:** Next.js 15プロジェクト骨格、JSON設定ファイル、RSS取得・解析機能、データ変換レイヤー
**Addresses:** 設定ファイル管理、RSSフィード取得・解析（table stakes）
**Avoids:** Pitfall 1（タイムアウト）、Pitfall 4（URL正規化）、Pitfall 7（個別エラーハンドリング）を初期段階で対処

### Phase 2: Calendar UI and Dashboard
**Rationale:** データ層が安定した上でUI構築。カレンダーとダッシュボードはコア価値そのもの
**Delivers:** 月別カレンダーグリッド、日付セルハイライト、全メンバーダッシュボード、個人詳細ビュー
**Addresses:** カレンダー表示、ハイライト、ダッシュボード、個人ビュー（table stakes全体）
**Avoids:** Pitfall 3（Client Component最小化）、Pitfall 5（date-fnsで日付計算統一）

### Phase 3: Interactivity and UX Polish
**Rationale:** 基本表示ができた上で、ユーザー操作性を向上させる
**Delivers:** ホバーツールチップ、元記事リンク、前月/翌月ナビゲーション、レスポンシブ対応
**Addresses:** ツールチップ、記事リンク、ナビゲーション（table stakes + differentiator）
**Avoids:** Pitfall 10（モバイルでのツールチップ位置調整）

### Phase 4: ISR and Deployment
**Rationale:** 機能完成後にデプロイと運用設定を整える。ISRのrevalidate値は実際のフェッチ時間を見て調整する
**Delivers:** ISR設定（revalidate間隔の環境変数化）、Vercelデプロイ、「最終更新」タイムスタンプ表示
**Addresses:** ISR自動更新、Vercelデプロイ（table stakes）
**Avoids:** Pitfall 2（ISR挙動の明示）、Pitfall 8（Vercel無料枠の実行時間監視）

### Phase 5: Differentiators (Optional)
**Rationale:** コア機能が安定してからの追加価値。全てPhase 1のデータ構造に依存するのみ
**Delivers:** ストリーク表示、月間投稿数サマリー、ヒートマップ（色の濃淡）
**Addresses:** differentiator機能群

### Phase Ordering Rationale

- **データ層 -> UI -> インタラクション -> デプロイ** の順は、FEATURES.mdの依存グラフに従っている（RSS解析 -> カレンダー表示 -> ツールチップ）
- Phase 1でPitfall 1/4/7を潰すことで、Phase 2以降でデータ品質を前提としたUI開発ができる
- Phase 4をUI完成後に置くことで、ISRのrevalidate値を実際のフェッチ時間を見て調整できる
- Phase 5のdifferentiatorは全てPhase 1のデータ構造に依存するのみで、Phase 1が安定すればいつでも追加可能

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** rss-parserのAbortController統合の具体的な実装パターン、SubstackのRSSフィード仕様（フィールド名、ページネーション）の実物確認が必要
- **Phase 3:** モバイルでのツールチップUXパターン（CSS vs Floating UI の判断ポイント）

Phases with standard patterns (skip research-phase):
- **Phase 2:** Next.js Server ComponentsでのカレンダーUI構築は標準的なパターン
- **Phase 4:** ISR + Vercelデプロイは公式ドキュメントが充実
- **Phase 5:** 単純なデータ集計処理、特別な調査不要

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 公式ドキュメント、npmデータで検証済み。Next.js 15/Tailwind v4/rss-parserは全て安定版 |
| Features | HIGH | PROJECT.mdの要件と一致。GitHub草グラフという明確なUI参考あり |
| Architecture | HIGH | Standard Next.js App Router pattern。50フィード規模での実績は十分 |
| Pitfalls | MEDIUM | ISRの挙動やrss-parserのタイムアウトは公式ドキュメントで確認済み。Substack固有のエッジケースは実測が必要 |

**Overall confidence:** HIGH

### Gaps to Address

- **SubstackのRSS上限件数**: ~20件とされるが、実際のフィードで確認が必要。Phase 1の実装時に検証する
- **SubstackのCORS/レートリミット**: サーバーサイドfetchなのでCORSは問題ないが、レートリミットの有無は未確認
- **50フィード並列取得の実行時間**: 理論上2-3秒だが、Vercel無料枠での実測が必要。Phase 4で検証する
- **rss-parser 3.13.0のESM互換性**: Next.js 15 Server Components環境での動作確認が必要
- **モバイルでのカレンダーUI**: 50メンバーのミニカレンダーをモバイルで表示する際のレイアウト戦略。Phase 3で具体化する

## Sources

### Primary (HIGH confidence)
- [Next.js ISR Documentation (Context7)](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/incremental-static-regeneration.mdx) -- ISRパターン、revalidate設定
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- v16のbreaking changes確認、v15選択の根拠
- [Tailwind CSS v4 Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) -- 公式セットアップ手順
- [rss-parser on npm](https://www.npmjs.com/package/rss-parser) -- バージョン、ダウンロード数

### Secondary (MEDIUM confidence)
- [tailwindcss on npm](https://www.npmjs.com/package/tailwindcss) -- v4.2.4確認
- [Floating UI](https://floating-ui.com/) -- ツールチップ代替案の調査
- [Next.js endoflife.date](https://endoflife.date/nextjs) -- バージョンライフサイクル
- PROJECT.md -- 要件定義、スケール制約、ユーザー心理

### Tertiary (LOW confidence)
- SubstackのRSSフィード上限（~20件） -- 実測による検証が望ましい

---
*Research completed: 2026-05-08*
*Ready for roadmap: yes*
