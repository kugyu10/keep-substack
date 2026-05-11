# Phase 12: chameleon-hidden-team - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

"chameleon" という予約済みチーム名を定義する。このチームに所属するメンバーは：
- All ビュー（チーム未選択）に表示されない
- チームタブの一覧に "chameleon" が表示されない
- `/?team=chameleon` の URL 直打ちでは表示される（タブには出ない）
- 管理画面 (AdminMemberList) には通常通り表示される（管理者は操作可能）
- 他チームとの複数所属（例: `teamNames: ['teamA', 'chameleon']`）の場合、`/?team=teamA` では表示される

</domain>

<decisions>
## Implementation Decisions

### 複数チーム所属時の挙動
- **D-01:** chameleon は "All ビューのみ" から除外する。他チームタブ（`/?team=teamA`）では、teamA との複数所属なら表示される。

### URL直打ち保護
- **D-02:** `/?team=chameleon` を URL に直打ちした場合、chameleon メンバーが表示される（タブには出ない）。ブロックやリダイレクトは不要。

### 管理画面の扱い
- **D-03:** AdminMemberList では chameleon メンバーを全共表示する。管理者はいつでも確認・編集可能。

### Claude's Discretion
- "chameleon" のハードコード方法：`const HIDDEN_TEAM = 'chameleon'` のような定数として `src/lib/types.ts` か `src/lib/kvMembers.ts` に定義する（KISS 原則 — 設定化は YAGNI）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### メインロジック
- `src/app/page.tsx` — All ビュー・チームタブの生成ロジック（teams / filteredMembers）。変更の中心。
- `src/lib/types.ts` — Member 型定義（`teamNames: string[]`）。HIDDEN_TEAM 定数の候補置き場。

### データ層
- `src/lib/kvMembers.ts` — `getMembers()` でメンバーを取得。この関数から chameleon フィルタリングを行う選択肢もある。

### 管理画面（変更不要）
- `src/app/admin/AdminMemberList.tsx` — 管理者向けリスト。変更なし（全表示を維持）。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `allMembers.flatMap((m) => m.teamNames).filter(Boolean)` — teams 生成ロジック。ここに `.filter(t => t !== HIDDEN_TEAM)` を追加するだけでタブが消える。
- `team ? allMembers.filter(...) : allMembers` — filteredMembers ロジック。Allビュー時（`!team`）に chameleon メンバーを除外するフィルタを追加する。

### Established Patterns
- `teamNames: string[]` の多対多フィルタリングパターン（Phase 11 確立済み）
- KISS 原則 — 最小変更で実装。`page.tsx` の2箇所（teams生成 + filteredMembers）の修正で完結する可能性が高い。

### Integration Points
- `src/app/page.tsx` の `teams` 生成と `filteredMembers` フィルタリングが変更箇所の中心
- HIDDEN_TEAM 定数は `src/lib/types.ts` または inline 定数として `page.tsx` に定義

</code_context>

<specifics>
## Specific Ideas

- "chameleon" は小文字の予約名として扱う（大文字小文字を区別するか？ → 特に指定なければ完全一致で問題ない）
- チームタブから "chameleon" を消すには teams 生成時に `.filter(t => t !== 'chameleon')` を追加するだけ
- All ビューからメンバーを消すには `const filteredMembers = team ? ... : allMembers.filter(m => !m.teamNames.includes('chameleon'))` のように変更

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-chameleon-hidden-team*
*Context gathered: 2026-05-12*
