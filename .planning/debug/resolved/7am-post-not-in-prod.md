---
status: resolved
trigger: 朝7時の投稿が本番に反映されない
created: 2026-05-12
updated: 2026-05-12
---

# Debug Session: 7am-post-not-in-prod

## Symptoms

- **Expected:** 投稿後5分以内にヒートマップに反映される
- **Actual:** 当日中に完全に表示されない
- **Errors:** なし（ページは正常表示、記事データだけ出ない）
- **Timeline:** Phase 10 (Cron+KV) デプロイ後から発生
- **Reproduction:** 常に発生

## Current Focus

hypothesis: KVはCronでしか更新されず、Cronは1日1回（UTC 18:00 = JST 03:00）のみ実行される。朝7時の投稿は翌JST 03:00まで約20時間反映されない設計になっている。これはPhase 10で意図的に変更された仕様だが「5分以内に反映」という期待との乖離が問題。
test: vercel.jsonのscheduleを確認 → "0 18 * * *" = UTC 18:00 = JST 03:00 の1日1回実行を確認
expecting: Cronのスケジュールを増やすか、On-demand ISR（revalidatePath）をCron内で呼ぶことで解決できる
next_action: 修正案を実装する

## Evidence

- timestamp: 2026-05-12
  file: vercel.json
  finding: Cron schedule は "0 18 * * *" = UTC 18:00 = JST 03:00。1日1回のみ。

- timestamp: 2026-05-12
  file: src/lib/kvArticles.ts
  finding: getArticles() はKVから直接読み込むのみ。Cronが実行されるまでKVは更新されない。

- timestamp: 2026-05-12
  file: src/lib/fetchFeed.ts
  finding: fetchAllFeedsCached() は getArticles() を呼ぶだけ。RSS直接取得なし。

- timestamp: 2026-05-12
  file: src/app/page.tsx
  finding: export const revalidate や dynamic 設定なし。Next.js デフォルトの静的キャッシュが適用される可能性がある。

- timestamp: 2026-05-12
  file: src/app/api/cron/route.ts
  finding: Cronは fetchWithRetry → saveArticles の流れでKVを更新。revalidatePath の呼び出しなし。

## Eliminated

- ISRの問題: Phase 10でISRは廃止済み。現在はKV直接読み込みのみ。
- エラーによる失敗: ページは正常表示、エラーなし。

## Resolution

root_cause: Phase 10で ISR + RSS直接フェッチ を廃止してKV一択にしたため、KVはCron（UTC 18:00 = JST 03:00）でしか更新されない。投稿後最大20時間反映されない。
fix: RSS ISR復活 + KVのハイブリッドアーキテクチャ。fetchAllFeedsCached でRSS直接フェッチ（最新30件）とKV（過去記事）をマージ。page.tsx に revalidate=300 を追加。Phase 12.1 として実装予定。
verification: Phase 12.1 実装後にVercelでテスト
files_changed: src/lib/fetchFeed.ts, src/app/page.tsx, src/app/member/[substackId]/page.tsx
