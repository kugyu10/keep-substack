# Phase 34: UI Polish バッチ - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

ログイン・サインインページのレイアウト整理（ヘッダー/フッター非表示・ロゴ表示・招待制注記）、フッター文言のログイン状態対応、Commit & Goal View のソート順変更、/my ページでのナビゲーションボタン制御の4領域を実装する。

**スコープ in:**
- `/login` + `/signin-51cf21389c56` ページのヘッダー・フッター非表示（Route Groups で分離）
- ログイン・サインインページへの Keep Substack ロゴ表示（フォーム直上）
- `/login` フォーム下への招待制注記追加
- フッターのログイン状態別文言3パターン
- Commit & Goal View ソート順変更（達成率→ストリーク→先週達成率→先々週達成率→登録日）
- Member 型に `hasUser` フラグを追加し未登録メンバーを最下位グループに
- /my ページ表示中のヘッダー「マイページ」ボタン非表示

**スコープ out:**
- `/my` ページ以外の認証ガード
- サムネイル優先ロジック（将来フェーズへ）
- 個人ビューURL変更（publicationId のまま）

</domain>

<decisions>
## Implementation Decisions

### UI-01: ログイン・サインインページのレイアウト分離
- **D-01:** Next.js App Router の Route Groups を使用。`src/app/(auth)/` グループを作成し `login/` と `signin-51cf21389c56/` を移動。URL は変わらない。
- **D-02:** `(auth)/layout.tsx` を新規作成。ヘッダー・フッターを含まず、Keep Substack ロゴ（UI-02）のみ配置する専用レイアウト。
- **D-03:** 既存の `src/app/layout.tsx`（ルートレイアウト）は変更なし。Header と footer はそのまま残す。

### UI-02: Keep Substack ロゴ
- **D-04:** ロゴは `(auth)/layout.tsx` ではなく、各ページコンポーネント内のフォームの直上に配置する（login/page.tsx, signin-51cf21389c56/page.tsx それぞれに追加）。
- **D-05:** スタイル: ヘッダーと同じ Georgia serif + font-black。サイズはヘッダー（text-lg）より大きく（例: text-2xl 程度）。中央配置。
- **D-06:** ロゴは Link でなく単純なテキスト（クリック不可）。

### UI-02 追記: ログイン注記
- **D-07:** `/login` ページのみ、フォームの下に注記テキストを追加:「サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます」
- **D-08:** スタイル: `text-xs text-gray-400 text-center` でフォーム直下。
- **D-09:** `/signin-51cf21389c56` には注記を追加しない（招待専用ページなのでその旨は自明）。

### UI-03: フッター文言（ログイン状態別）
- **D-10:** フッターを Server Component 化（`Footer.tsx` として `src/components/` に切り出し）。Supabase でユーザー取得 + member クエリで publicationId を取得。
- **D-11:** 文言3パターン:
  1. **未ログイン**: 「このSubstack継続可視化ツールに参加したい方はコチラ」（参加案内リンク、現状維持）
  2. **ログイン済み + member紐付けあり**: 「あなたの個人ビューはコチラ」（`/member/{publicationId}` へのリンク）
  3. **ログイン済み + member未紐付け（publication_id なし）**: 「参加登録はコチラ」（`/my` へのリンク）
- **D-12:** member 取得クエリ: `admin.from('members').select('publication_id').eq('user_id', user.id).maybeSingle()`

### UI-04: Commit & Goal View ソート順変更
- **D-13:** ソート優先順位（全5キー）:
  1. 今週の達成率（achieved slots / total slots）— 降順
  2. ストリーク週数（`consecutiveWeekStreak` 既存関数）— 降順（変更なし）
  3. 先週の達成率（last week achievement rate）— 降順
  4. 先々週の達成率（2 weeks ago achievement rate）— 降順
  5. 登録日（addedAt）— 昇順
- **D-14:** メンバーグループ分け（グループ内で上記ソートを適用）:
  - **Group A**: `hasUser === true && slots.length > 0`（コミット設定済み）— 上位
  - **Group B**: `hasUser === true && slots.length === 0`（ログイン済みだが未コミット）— 下位
  - **Group C**: `hasUser === false`（memberはいるがauth userなし = 未登録）— 最下位
- **D-15:** `Member` 型に `hasUser: boolean` フラグを追加。
- **D-16:** `page.tsx` の members クエリに `user_id` を追加し、`user_id IS NOT NULL` で `hasUser` を判定。
- **D-17:** `sortMembersForCommitView` 関数を更新し、先週・先々週の達成率を追加ソートキーとして使用。`achievementRate` 関数を week offset 対応にする（現在は今週のみ）。
- **D-18:** `consecutiveWeekStreak` の定義変更なし（100% 達成週のカウントのまま）。ストリークは従来通り。先週・先々週の達成率はあくまで追加ソートキーとして別途計算する。

### UI-05: /my ページでのヘッダー「マイページ」ボタン制御
- **D-19:** `Header.tsx` の「マイページ」/「ログイン」ボタン部分のみを `HeaderNav.tsx`（Client Component）として切り出し。
- **D-20:** `HeaderNav.tsx` で `usePathname()` を使い、`pathname === '/my'` のとき「マイページ」リンクを非表示にする。「ログイン」リンクは影響なし。
- **D-21:** `Header.tsx`（Server Component）はユーザー情報を取得し `<HeaderNav user={user} />` に props として渡す。クライアント側で追加の auth コールは不要。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル
- `src/app/layout.tsx` — ルートレイアウト（Footer切り出しで変更）
- `src/app/login/page.tsx` — ロゴ追加、招待制注記追加
- `src/app/signin-51cf21389c56/page.tsx` — ロゴ追加
- `src/components/Header.tsx` — HeaderNav 切り出しで変更
- `src/lib/types.ts` — Member型に hasUser: boolean 追加
- `src/lib/commitUtils.ts` — sortMembersForCommitView / achievementRate 更新
- `src/app/page.tsx` — members クエリに user_id 追加

### 新規作成
- `src/app/(auth)/layout.tsx` — 認証ページ専用レイアウト（ヘッダー・フッターなし）
- `src/app/(auth)/` — login/ と signin-51cf21389c56/ を移動
- `src/components/Footer.tsx` — フッターを Server Component として切り出し
- `src/components/HeaderNav.tsx` — ヘッダーナビゲーションの Client Component

### 要件定義
- `.planning/REQUIREMENTS.md` — UI-01〜UI-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Header.tsx`: Georgia serif ロゴのスタイル（`font-black`, `style={{ fontFamily: 'Georgia, serif' }}`）— UI-02 のロゴに同じスタイルを適用
- `createSupabaseServerClient()` / `createSupabaseAdminClient()` — Footer.tsx での auth + member クエリに使用
- `achievementRate()` in `commitUtils.ts:158` — week offset 対応に拡張して先週・先々週の達成率を計算
- `consecutiveWeekStreak()` in `commitUtils.ts:134` — 変更なし、ソートキー②として継続使用

### Established Patterns
- Supabase Server Component パターン: `createSupabaseServerClient()` で auth 取得、`createSupabaseAdminClient()` で member クエリ（Footer.tsx でも同様）
- Client Component 分離パターン: `'use client'` + `usePathname()` は既存コードでも使用例あり
- Route Groups (`(group-name)/`): URL に影響しない Next.js App Router のディレクトリ分離機能

### Integration Points
- `(auth)/layout.tsx` ↔ `login/page.tsx` + `signin-51cf21389c56/page.tsx`: Route Group レイアウトがページをラップ
- `Header.tsx` ↔ `HeaderNav.tsx`: Server Component がユーザー情報を取得し Client Component に props 渡し
- `sortMembersForCommitView` ↔ `Member.hasUser` + `CommitSlot[]`: グループ分け + 多段ソートに使用
- `Footer.tsx` ↔ `layout.tsx`: ルートレイアウトの inline footer を `<Footer />` に置き換え

</code_context>

<specifics>
## Specific Notes

- `/login` 招待制注記の文言: 「サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます」
- フッターリンク文言（ログイン済み+member有）: 「あなたの個人ビューはコチラ」（/member/{publicationId}）
- フッターリンク文言（ログイン済み+member無）: 「参加登録はコチラ」（/my）
- ロゴテキスト: 「Keep Substack」（ヘッダーと同一）、Georgia serif、font-black、text-2xl 程度、中央配置

</specifics>

<deferred>
## Deferred Ideas

- **Gridサムネイル優先ロジック**: 該当日に複数記事があったときどれを表示するかの優先ロジック — 新機能、将来フェーズで対応

</deferred>

---

*Phase: 34-ui-polish*
*Context gathered: 2026-06-08*
