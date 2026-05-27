# Phase 23: /myページ公開チーム参加・退出 - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

ログインユーザーが /my ページから status=public のチームをチェックボックスで自由に参加・退出できるUIを実装する。現行の「チーム名カンマ区切りテキスト入力」を廃止し、既存publicチームのみを選択できるチェックボックスUIに置き換える。Server Actionを完全置き換えし、自由入力によるチーム新規作成を禁止する。

**このフェーズで変更するもの:**
- `src/app/my/page.tsx` — 全publicチームをDBから取得するクエリを追加。teams.statusを含むJOINクエリに変更
- `src/app/my/MyProfileForm.tsx` — teamNamesテキスト入力をチェックボックスリストに置き換え。privateチームのreadonly表示を追加
- `src/app/my/actions.ts` — `updateMyProfileAction` を完全置き換え。publicCheckedTeamIds（または名前）パラメータのみ受け付け、既存publicチームのid/name照合で安全に更新

**このフェーズで作らないもの:**
- /admin/teams/{teamName} hiddenチームビュー（Phase 24）
- member_publicationsスキーマ拡張（Phase 25）

</domain>

<decisions>
## Implementation Decisions

### privateチームの表示 (SELF-03)

- **D-01:** 未参加のprivateチームは /my に**完全非表示**。publicチームのセルフサービスに特化したUIとする
- **D-02:** 管理者によってprivateチームに登録済みのユーザーは、そのチームを**readonly表示**する（チェックボックスdisabled + 「管理者が設定」等のラベル）。退出は不可

### フォーム構成

- **D-03:** 名前変更とチーム参加・退出を**同一フォーム**に統合する。既存の `useActionState` パターンを継続し、「保存する」ボタン1つでまとめて保存する

### 保存タイミング

- **D-04:** チェックボックス変更は**「保存する」ボタン押下で一括保存**する（即時保存ではない）。複数チームを一度の操作で変更できる

### 空状態のUI

- **D-05:** publicチームが1件も存在しない場合 → 「参加できる公開チームはありません」メッセージを表示（チェックボックスなし）
- **D-06:** 全publicチームに参加済みの場合 → チェックボックスが全てON + 「すべての公開チームに参加中です」メッセージを表示

### Server Action変更方針

- **D-07:** `updateMyProfileAction` を**完全置き換え**する。`publicCheckedTeamNames`（チェックされたpublicチーム名の配列）を受け取り、DBのteamsテーブルで status='public' かつ name が一致するものだけを member_teams に反映する
- **D-08:** 自由入力によるチーム名upsert（存在しないチームの新規作成）は**廃止**。送信されたチーム名がpublicチームとして存在しない場合は無視する
- **D-09:** 参加中のprivateチームは保存処理で**削除しない**（member_teamsのdelete対象をpublicチームのみに限定する）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` §SELF — SELF-01〜SELF-03（Phase 23対象要件）
- `.planning/ROADMAP.md` §Phase 23 — Goal・Success Criteria・Requirements

### 現行コード（変更対象）
- `src/app/my/page.tsx` — 現行 /my RSC（member_teamsのJOINクエリ、statusなし）
- `src/app/my/MyProfileForm.tsx` — 現行フォーム（teamNamesテキスト入力 → チェックボックスに置き換え対象）
- `src/app/my/actions.ts` — 現行Server Actions（updateMyProfileActionの完全置き換え対象）
- `src/lib/types.ts` — Member型（teams: { name: string; status: string }[]）

### Phase 22 引継ぎ
- `.planning/phases/22-team-status/22-CONTEXT.md` — D-04: status別表示ルール（public/private/hidden）、D-06: Member型変更詳細
- `src/lib/members.ts` — getMembers()のteams JOIN実装（参考）

### パターン参考
- `src/app/admin/teams/` — Server Action + Client Componentパターン（Phase 22実装）
- `src/app/my/LinkMemberForm.tsx` — /my の既存Clientコンポーネントパターン

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useActionState` (`src/app/my/MyProfileForm.tsx`) — そのまま継続。stateでエラーメッセージ表示
- `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`) — Server Actionでのチーム更新に使用
- `createSupabaseServerClient()` (`src/lib/supabase/server.ts`) — page.tsxでの認証ユーザー取得に使用

### Established Patterns
- `useActionState` + Server Action パターン — /my ページ全体で使用済み。継続する
- `revalidatePath('/my')` — 保存後のキャッシュ無効化。継続する
- 認証チェック: `supabase.auth.getUser()` → user未取得なら `redirect('/')` — 継続する

### Integration Points
- `page.tsx` のデータ取得クエリを拡張:
  - 既存: `member_teams (teams (name))` → **拡張**: `teams (name, status)` を含む形に
  - **追加**: 全publicチームを取得するクエリ `SELECT id, name FROM teams WHERE status = 'public' ORDER BY name`
- `MyProfileForm` の props 変更:
  - 既存: `{ name, publicationId, team_names: string[] }`
  - **変更後**: `{ name, publicationId, currentTeams: { name: string; status: string }[], publicTeams: { name: string }[] }` （またはそれに準じる形）
- `actions.ts` の `updateMyProfileAction`:
  - 既存: `teamNames`（カンマ区切り文字列）→ upsert でチーム自由作成
  - **変更後**: `publicCheckedTeams`（チェックされたpublicチーム名の配列）→ publicチームのみ更新、privateチーム削除禁止

</code_context>

<specifics>
## Specific Ideas

- privateチームのreadonly表示: `disabled` チェックボックス + 「管理者が設定」等の小さなラベルテキストで視覚的に区別する
- チェックボックスのフォームデータ送信: `<input type="checkbox" name="teams" value="チーム名">` を複数 → `formData.getAll('teams')` で配列取得

</specifics>

<deferred>
## Deferred Ideas

None — 議論はフェーズスコープ内に収まった

</deferred>

---

*Phase: 23-/myページ公開チーム参加・退出*
*Context gathered: 2026-05-27*
