# Phase 31: ログインフロー修正 - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Magic Link サインインフローの不具合修正と、メンバーのプロフィールフィールド（substack_handle / publication_id）の権限制御を整備する。具体的には4つの問題を解決する：

1. `pid` URLパラメータで対応メンバーが見つからない場合に新規メンバーを自動作成する
2. `/my` ページで `substack_handle` を「未設定なら一度だけ設定可能、設定済みなら読み取り専用」にする
3. admin が `substack_handle` と `publication_id` を編集できるようにする
4. `substack_handle` のユニーク制約エラーをグレースフルに処理する

</domain>

<decisions>
## Implementation Decisions

### D-01: ログイン URL の必須パラメータ（根本的な仕様）
- サインイン Magic Link は **`pid` と `handle` の両方が必須**。片方だけのリンクは不完全とみなす
- ログイン URL 形式: `/login-51cf21389c56?pid=xxx&handle=@yyy`
- `LoginForm` は両方を hidden input で保持 → `sendMagicLinkAction` → callback URL に両方を付与
- `sendMagicLinkAction` で `pid` または `handle` が空の場合はエラーを返す（「登録リンクが不正です」）

### D-02: auth/callback での member 作成・紐付け
- `pid` に一致するメンバーが **存在する** → `user_id` を紐付け（既存の動作）
- `pid` に一致するメンバーが **存在しない** → `publication_id=pid, substack_handle=handle` で新規 member を INSERT し `user_id` を設定
  - `substack_handle` の unique 違反（既存 member が同じ handle を持つ）の場合 → `substack_handle=null` でフォールバック INSERT
- `name` は `publication_id` 値で仮置き — ユーザーが `/my` から後で変更可能

### D-03: substack_handle の /my ページでの扱い
- `substack_handle` は callback で登録時に設定されるため、通常は `/my` 初回アクセス時点で設定済み
- `substack_handle` が設定済み → publicationId と同様に `<p>` タグで読み取り専用表示（「変更できません」メッセージ付き）
- `substack_handle` が `null`（例外的なフォールバックケース）→ 入力フィールドを表示し一度だけ設定可能

### D-04: admin による publication_id / substack_handle 編集
- admin の `updateMemberAction` に `substack_handle` と `publication_id` を追加
- `publication_id` 変更は FK が連鎖しているため CASCADE UPDATE が必要。以下のテーブルが影響を受ける：
  - `member_teams` (member_id FK → members.id … id は UUID なので直接関係なし)
  - `articles` (publication_id FK)
  - `member_publications` (publication_id FK)
  - DB スキーマを確認して適切な UPDATE 方法を選択（ON UPDATE CASCADE が設定されているか確認）
- `AdminMemberList.tsx` の編集行に `substack_handle` と `publication_id` の入力フィールドを追加

### D-05: substack_handle のユニーク制約エラー処理
- INSERT / UPDATE 時に `error.code === '23505'` (unique violation) が返った場合 → ユーザーに「このハンドルはすでに使用されています」エラーを表示
- コールバックでの新規メンバー作成時は `substack_handle=null` でフォールバック（サイレント）

### Claude's Discretion
- admin フォームの `publication_id` 変更に対する確認ダイアログの有無（リスクが高いのでリコメンド: 表示する）
- `/my` での substack_handle 未設定時のバリデーション（`@` プレフィックスの自動付与はそのまま維持）

</decisions>

<specifics>
## Specific Notes

- `substack_handle` の unique constraint は DB に既に存在する（v1.7 Phase 27 で追加済み）
- `sendMagicLinkAction` の `origin` 取得は `headers().get('origin')` — Vercel 環境では問題ないが空の場合はフォールバック必要か確認
- `publication_id` を primary key として使っているか UUID(id) を使っているかで CASCADE の影響範囲が変わる → `schema.sql` で確認要

</specifics>

<canonical_refs>
## Canonical References

- `src/app/auth/callback/route.ts` — 認証コールバック（新規作成ロジック追加対象）
- `src/app/login-51cf21389c56/actions.ts` — Magic Link 送信アクション
- `src/app/login-51cf21389c56/LoginForm.tsx` — ログインフォーム（pid/handle hidden input）
- `src/app/my/MyProfileForm.tsx` — /my ページフォーム（substack_handle 読み取り専用化対象）
- `src/app/my/actions.ts` — /my 更新アクション
- `src/app/admin/AdminMemberList.tsx` — admin メンバーリスト（編集フォーム拡張対象）
- `src/app/admin/actions.ts` — admin 更新アクション（publication_id / handle 追加対象）
- `supabase/schema.sql` — members テーブルと FK 制約の確認

</canonical_refs>
