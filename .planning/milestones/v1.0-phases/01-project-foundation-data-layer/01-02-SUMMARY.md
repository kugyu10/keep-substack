---
phase: 01-project-foundation-data-layer
plan: 02
subsystem: ui-isr
tags: [nextjs, isr, unstable_cache, vercel, tailwind]

# Dependency graph
requires:
  - 01-01 (fetchAllFeedsCached, MemberFeedResult, members.json)
provides:
  - ISR設定済みメインページ (src/app/page.tsx)
  - Vercelデプロイ済み公開URL: https://keep-substack.vercel.app/
affects: [phase-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "export const dynamic = 'force-static' + unstable_cache の組み合わせでISR（revalidate可変）を実現"
    - "REVALIDATE_SECONDS 環境変数を Vercel 管理画面で設定し、コードを変更せずrevalidate間隔を制御"

key-files:
  created:
    - .env.example
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx

key-decisions:
  - "export const revalidate はリテラルのみ有効。REVALIDATE_SECONDS を動的に読むため export const dynamic = 'force-static' を使用（RESEARCH.md §3準拠）"
  - ".gitignore の .env* パターンが .env.example も対象にするため git add --force で追加"
  - "layout.tsx はシンプルに保ち、Geist フォントや Google フォント依存を除去してボディ要素のみにする"

# Metrics
duration: 10min
completed: 2026-05-08
---

# Phase 01 Plan 02: ISR設定 + 最小表示ページ + Vercelデプロイ Summary

**fetchAllFeedsCached を呼び出す export const dynamic = 'force-static' 設定済みメインページを実装し、REVALIDATE_SECONDS=300 環境変数付きで Vercel にデプロイ、https://keep-substack.vercel.app/ を公開**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-08T09:00:00Z
- **Completed:** 2026-05-08T09:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `src/app/page.tsx` を ISR 対応ページとして実装（export const dynamic = 'force-static' + fetchAllFeedsCached）
- `src/app/layout.tsx` を更新（title: 'Keep Substack', lang: 'ja'）
- `.env.example` を作成してコミット（REVALIDATE_SECONDS のサンプル）
- Vercel に GitHub リポジトリ連携でデプロイ完了（環境変数 REVALIDATE_SECONDS=300 設定済み）
- 公開URL: https://keep-substack.vercel.app/

## Phase 1 Success Criteria — 全項目達成

1. **DATA-01**: JSON設定ファイル（`src/data/members.json`）にメンバーを追加するとフィード取得対象が増える
2. **DATA-02**: ページにアクセスすると各メンバーの記事タイトルと公開日がサーバーサイドで取得・表示される
3. **DATA-04**: 一部のフィード取得が失敗しても「記事を取得できませんでした」と表示され、他のメンバーの表示に影響しない
4. **DEP-01**: Vercel にデプロイされ、https://keep-substack.vercel.app/ で公開アクセス可能
5. **DATA-03**: ISR（Revalidate: 5m）により、REVALIDATE_SECONDS 間隔でデータが自動更新される（`npm run build` で Revalidate: 5m を確認済み）

## Task Commits

| Task | 内容 | Commit |
|------|------|--------|
| Task 1 | ISR設定済みメインページ実装 | 635b71f |
| Task 2 | Vercelデプロイ（ユーザー実行） | - |

## Files Created/Modified

- `src/app/page.tsx` — ISR設定（force-static）+ fetchAllFeedsCached 呼び出し + 記事一覧表示UI
- `src/app/layout.tsx` — title='Keep Substack', lang='ja', Geist フォント依存除去
- `.env.example` — REVALIDATE_SECONDS=300 サンプルファイル（コミット済み）
- `.env.local` — ローカル開発用（gitignore 対象、コミット対象外）

## Decisions Made

- `export const dynamic = 'force-static'` を採用（`export const revalidate` はリテラル値のみ有効なため、動的な環境変数参照には使えない）
- `.gitignore` の `.env*` パターンが `.env.example` も対象にするため `git add --force` で追加
- layout.tsx から Geist フォントおよび Google フォント依存を除去し、シンプルな構成に統一

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Config] layout.tsx のフォント依存を除去**
- **Found during:** Task 1
- **Issue:** プランの実装仕様は Geist フォントを含まないシンプルな layout.tsx だが、既存ファイルには Google Fonts 依存があった
- **Fix:** プランの仕様通り、Geist フォントなしのシンプルな layout.tsx に置き換え
- **Files modified:** src/app/layout.tsx
- **Commit:** 635b71f

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** スコープ内の修正のみ。

## Verification Results

- `npm run build` がエラーなく完了（Revalidate: 5m を確認）
- `.env.local` は `.gitignore` の `.env*` パターンで保護済み
- `.env.example` はコミット 635b71f に含まれている
- 公開URL: https://keep-substack.vercel.app/ でアクセス確認済み（ユーザー確認）

## User Setup Completed

- Vercel プロジェクト作成（GitHub リポジトリ連携）
- 環境変数 `REVALIDATE_SECONDS=300` を Vercel 管理画面で設定
- デプロイ完了・公開URL確認: https://keep-substack.vercel.app/

## Self-Check: PASSED

- [x] src/app/page.tsx 存在確認
- [x] src/app/layout.tsx 存在確認
- [x] .env.example 存在確認
- [x] コミット 635b71f 存在確認
- [x] .env.local が gitignore 対象（.env* パターン）
- [x] Phase 1 Success Criteria 全5項目達成

---
*Phase: 01-project-foundation-data-layer*
*Completed: 2026-05-08*
