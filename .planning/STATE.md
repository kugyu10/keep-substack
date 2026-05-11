---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Data Persistence + Multi-Team
status: in-progress
stopped_at: ""
last_updated: "2026-05-11T09:00:00.000Z"
last_activity: 2026-05-11 -- Phase 11 Plan 01 completed
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11 for v1.3 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 11 — チーム多対多所属（完了）

## Current Position

Phase: 11-multi-team-membership
Plan: 01 (completed)
Status: Phase 11 Plan 01 complete — チーム多対多所属（teamNames: string[]）実装済み
Last activity: 2026-05-11 — Phase 11 Plan 01 complete

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 9 (v1.0: 6プラン + v1.1: 6プラン + v1.2: 3プラン)

**By Milestone:**

| Milestone | Phases | Plans | Sessions |
|-----------|--------|-------|----------|
| v1.0 MVP | 3 | 6 | 1日 |
| v1.1 Dynamic Members | 3 | 6 | 2日 |
| v1.2 UX Polish | 3 | 3 | 1日 |

## Accumulated Context

### Key Architecture Decisions (v1.3 / Phase 11)

- Member.teamName: string → teamNames: string[] に型変更（Phase 11 D-01）
- KV後方互換フォールバック: m.teamNames ?? (m.teamName ? [m.teamName] : [])（読み込み時変換、DBマイグレーション不要）
- teams生成: flatMap + Set 重複除去 / フィルタリング: includes（多対多対応）
- 管理画面はカンマ区切りテキスト入力 → Server Actions で split(',').map().filter() 変換
- 複数チーム戻りリンク: flex gap-3 横並び + encodeURIComponent

### Key Architecture Decisions (v1.3 / Phase 10)

- StoredFeed型（articles:{substackId} → { items: FeedItem[], imageUrl?: string }）でKV保存
- fetchAllFeedsCached シグネチャ維持（KV直接読み込みに内部移行 — 呼び出し元変更ゼロ）
- !cronSecret チェック先行でCRON_SECRET未設定時の認証バイパスを防止
- Promise.allSettled で1件のフィード取得失敗が全体に影響しない設計
- addMemberAction: 登録直後に fetchWithRetry + saveArticles で初回KV保存

### Key Architecture Decisions (v1.2)

- teamId→teamName リネーム（全7ファイル）+ getMembers後方互換フォールバック
- form-in-table問題回避: button onClick + closest('tr') + FormData手動構築
- <img>タグ使用でnext/image不採用（next.config.ts変更不要、KISS）
- Tailwind v4でline-clamp-2がflex内で効かないためinline styleで対応

### Key Architecture Decisions (v1.1)

- feedUrl は保存せず `https://{substackId}.substack.com/feed` で動的生成
- `@upstash/redis` を使用 (`@vercel/kv` は2024年12月廃止)
- Server Actions + `revalidateTag('members')` でAPI Routes不要
- サムネイルは RSS content:encoded からregexで取得（フェッチ時に抽出・HTML捨てる）
- Vercel環境変数: UPSTASH_REDIS_REST_URL をBuildスコープにも設定すること

### Pending Todos

1件あり:
- Supabase移行（将来）
（解決済み: 過去記事の消失問題 → Phase 10、多対多チーム所属 → Phase 11）

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-11
Stopped at: Phase 11 Plan 01 completed（human-verify approved）
Resume file: None
Next step: v1.3 マイルストーン完了。次のマイルストーン計画へ。
