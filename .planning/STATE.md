---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Data Persistence + Multi-Team
status: in_progress
stopped_at: Phase 12 Plan 01 checkpoint — awaiting human verification
last_updated: "2026-05-12T00:00:00.000Z"
last_activity: 2026-05-12 — Phase 12 Plan 01 tasks complete (checkpoint)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11 for v1.3 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 11 — チーム多対多所属（完了）

## Current Position

Phase: 12-chameleon-hidden-team
Plan: 01 (checkpoint — awaiting human verification)
Status: Phase 12 Plan 01 tasks complete — chameleon 非表示ロジック実装済み、ブラウザ確認待ち
Last activity: 2026-05-12 — Phase 12 Plan 01 tasks complete

Progress: [███████░░░] 75%

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

### Roadmap Evolution

- Phase 12 added: chameleon-hidden-team — シークレットチーム "chameleon" 定義（All ビュー・タブから非表示）

### Key Architecture Decisions (v1.3 / Phase 12)

- HIDDEN_TEAM = 'chameleon' 定数を src/lib/types.ts に export 定数として定義（KISS/YAGNI）
- teams フィルタ: .filter(t => t !== HIDDEN_TEAM) で chameleon タブ非表示
- filteredMembers: All ビュー時のみ !m.teamNames.includes(HIDDEN_TEAM) で除外（D-01）
- /?team=chameleon 直打ち許可・管理画面は変更なし（D-02, D-03）

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

Last session: 2026-05-12T00:00:00.000Z
Stopped at: Phase 12 Plan 01 checkpoint — ブラウザ確認待ち
Resume file: .planning/phases/12-chameleon-hidden-team/12-01-SUMMARY.md
Next step: ブラウザ確認（D-01, D-02, D-03）後、Phase 12 Plan 01 完了とする。
