# Phase 4: KVデータ層移行 - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Upstash RedisでメンバーデータをCRUD管理できる基盤を確立し、既存members.jsonの全データをKVに移行する。
アプリが `@upstash/redis` 経由でメンバー一覧を取得してページが正常にレンダリングされること、および移行スクリプトが存在することがゴール。

</domain>

<decisions>
## Implementation Decisions

### KVキー設計
- **D-01:** `members` という単一キーにMember配列をJSON格納する — `redis.set('members', members)` / `redis.get('members')`
- **D-02:** `@upstash/redis` の自動シリアライズ（set/get）を使用する — `redis.json.*` は使わない
- **D-03:** KVスキーマ: `{ name: string, substackId: string, teamId: string, addedAt: string }` — feedUrlはコードベースに存在しない

### members.jsonの扱い
- **D-04:** 移行スクリプト成功後に `src/data/members.json` を手動削除する
- **D-05:** members.jsonのimportをコードから取り除く（page.tsxのimport文含む）

### Phase 4の変更範囲
- **D-06:** データ取得層のみKVに切り替える — `fetchFeed.ts` の関数署名（`fetchAllFeedsCached`）は変更しない
- **D-07:** `src/lib/types.ts` の `Member` 型を新スキーマに更新する（`substackId`, `teamId`, `addedAt` 追加、`feedUrl` 削除）
- **D-08:** `feedUrl` は `https://{substackId}.substack.com/feed` で動的生成 — コードベースにfeedUrlのハードコードは残さない
- **D-09:** 移行スクリプトは `scripts/seed-kv.ts` として作成し、`npx tsx scripts/seed-kv.ts` で実行する（一度だけ実行する前提）
- **D-10:** KVからメンバーを取得する関数 `getMembers(): Promise<Member[]>` を `src/lib/kvMembers.ts` に新設し、page.tsxはそこから取得する

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — KV-01, KV-02の詳細要件
- `.planning/ROADMAP.md` — Phase 4のSuccess Criteria（4項目）

### 既存実装
- `src/lib/types.ts` — 現在のMember型（変更対象）
- `src/lib/fetchFeed.ts` — フィード取得関数（署名は変更しない）
- `src/app/page.tsx` — members.jsonのimportを削除してKV取得に切り替える対象
- `src/data/members.json` — 移行元データ（移行後削除）

### プロジェクト全体
- `.planning/PROJECT.md` — プロジェクト概要とv1.1目標

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/fetchFeed.ts:fetchAllFeedsCached` — 署名 `(members: Member[])` を維持したまま呼び出し側（page.tsx）からKV取得メンバーを渡せばよい
- `src/lib/calendarUtils.ts:extractSubstackId` — 現在feedUrlからsubstackIdを抽出している。KV移行後はMember.substackIdを直接使えるので不要になる可能性あり（Phase 4スコープでは削除しない）

### Established Patterns
- KISS原則: 単一キー + JSON配列が最もシンプル。50人規模ではパフォーマンス問題なし
- YAGNI: Phase 4は「基盤確立」のみ。管理UIはPhase 6、ヒートマップはPhase 5

### Integration Points
- `page.tsx` の `import members from '@/data/members.json'` → `getMembers()` 呼び出しに置き換え
- `fetchAllFeedsCached(members as Member[])` の引数型がKV新スキーマのMemberに一致するよう types.ts を更新

</code_context>

<specifics>
## Specific Ideas

- feedUrlの動的生成パターン: `https://${member.substackId}.substack.com/feed`
- 移行スクリプトはmembers.jsonのデータを読み込み、substackIdをfeedUrlから抽出して新スキーマに変換後にKVへset する

</specifics>

<deferred>
## Deferred Ideas

- members.jsonの削除はスクリプト成功確認後に手動で行う（スクリプトによる自動削除はしない）
- KV個別CRUD（add/delete API）はPhase 6（管理画面）で実装
- team-idフィルタリングはPhase 6で実装
- extractSubstackId関数の削除・整理は将来フェーズで検討

</deferred>

---

*Phase: 4-KVデータ層移行*
*Context gathered: 2026-05-09*
