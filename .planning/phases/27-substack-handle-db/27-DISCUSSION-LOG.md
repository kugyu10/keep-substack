# Phase 27: Substack Handle — DB + プロフィールリンク - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 27-substack-handle-db
**Areas discussed:** @handle 入力 UI, ?handle= pre-fill 方式, handle バリデーション

---

## @handle 入力 UI

| Option | Description | Selected |
|--------|-------------|----------|
| MyProfileForm 内に追加 | 既存の name + teams フォーム内、name の下に @handle 入力欄を追加。updateMyProfileAction を拡張するだけで済む | ✓ |
| @handle 専用の別セクション | MyProfileForm の外側に「Substack プロフィール」セクションを作り、専用のサーバーアクションで保存 | |

**User's choice:** MyProfileForm 内に追加（推奨）

### @handle の @ プレフィックス

| Option | Description | Selected |
|--------|-------------|----------|
| DB には @ なしで保存，入力欄に placeholder「@yourhandle」 | DB に「hoge」で保存。リンク生成時に「substack.com/@hoge」と連結 | |
| @ 記号を入力欄内に固定表示 | 入力欄の左に「@」を固定テキストとして表示（input prefix UI）。DB には @ なしで保存 | |
| DB に @ 込みで保存（ユーザー希望） | DB に「@hoge」で保存。URL 生成時は `https://substack.com/${handle}` で正しい URL になる。保存前に先頭 @ を自動付与する正規化が必要 | ✓ |

**User's choice:** DB に @ 込みで保存（「問題ありそうなら教えて」と補足）
**Notes:** `?handle=hoge`（@ なし）からの pre-fill 時に自動 @ 付与が必要な点を説明し、問題ないと確認済み

### 保存タイミング

| Option | Description | Selected |
|--------|-------------|----------|
| name + teams + handle を一度に保存 | updateMyProfileAction に handle フィールドを追加。ボタン 1 回で全項目保存 | ✓ |
| handle は別ボタンで保存 | 名前+チームの「保存する」とは分離した handle 専用ボタンを別途用意 | |

**User's choice:** name + teams + handle を一度に保存（推奨）

---

## ?handle= pre-fill 方式

| Option | Description | Selected |
|--------|-------------|----------|
| /my?handle=hoge へリダイレクト | auth/callback の redirect 先を /my?handle=hoge にする。/my page.tsx が searchParams で読んで MyProfileForm に渡す。シンプルで cookie 不要 | ✓ |
| cookie に一時保存 | auth/callback で httpOnly cookie に handle を保存、/my で読んで cookie を削除 | |
| DB に即保存（メンバー紐付け済みの場合） | auth/callback でメンバー紐付け済みなら handle を DB に即自動保存 | |

**User's choice:** /my?handle=hoge へリダイレクト（推奨）

### DB 値と searchParams の優先順位

**User's clarification:** 選択肢 1（DB 優先）と 3（DB 空の場合のみ URL を使う）の違いが分からないとのコメントがあったため整理。どちらも「DB に値があれば DB 優先、DB が空なら searchParams の値を defaultValue として使う」という同じ挙動であることを確認。

**Decision:** DB に handle があれば DB 値を表示；DB が null の場合のみ searchParams の handle 値を defaultValue として使う

---

## handle バリデーション

| Option | Description | Selected |
|--------|-------------|----------|
| 最低限のバリデーション | @ 記号を除いた handle 部分が空白でないかだけ。handle 自体は空でも OK（null 許容→リンクなし） | ✓ |
| 英数字+アンダースコアの正規表現バリデーション | /^@[a-zA-Z0-9_]+$/ のようなパターンで完全指定。Substack 実際のハンドル形式に合わせるが将来の形式変更に弱い | |
| バリデーションなし | DB TEXT 制約のみ。入力値をそのまま保存 | |

**User's choice:** 最低限のバリデーション（推奨）

### バリデーションの実施場所

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action のみ | updateMyProfileAction 内で trim + @ 正規化。クライアントバリデーションは追加しない | ✓ |
| Server Action + リアルタイム UI フィードバック | form 内で入力中に即時エラー表示（Client Component 追加が必要） | |

**User's choice:** Server Action のみ（推奨）

---

## Claude's Discretion

- **CalendarGrid の substackHandle prop 追加と PROF-02 実装方針:** ユーザーは「プロフィールリンク配置」エリアを選択しなかったため、コードベース分析から実装方針を導出。`CalendarGrid.tsx` 行 44-57 の avatar+name ヘッダーを、handle がある場合に `<a>` で囲む。`substackHandle?: string` prop を追加
- **`getMembers()` の拡張:** `src/lib/members.ts` の SELECT に `substack_handle` を追加し、`Member` 型にも追加する必要がある
- **URL 生成:** DB 保存値 `@hoge` に対して `https://substack.com/${handle}` で正しい URL になる

## Deferred Ideas

なし — ディスカッションはフェーズのスコープ内に留まった
