# Phase 6: 管理画面 + チームフィルター - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 6-管理画面 + チームフィルター
**Areas discussed:** Basic認証のENV設計, 管理UIの表示と削除確認, チームフィルターのUI, Server Actions後のデータ更新

---

## Basic認証のENV設計

| Option | Description | Selected |
|--------|-------------|----------|
| ユーザー名+パスワード | ADMIN_USER + ADMIN_PASSWORD の2変数 | |
| パスワードのみ | ADMIN_PASSWORD の1変数のみ | ✓ |

**User's choice:** パスワードのみ（ADMIN_PASSWORD）

| Option | Description | Selected |
|--------|-------------|----------|
| middleware.ts | Next.js Edge Middlewareで/adminをインターセプト | ✓ |
| layout.tsx内でServer側チェック | Server ComponentでHeadersを読んで401を返す | |

**User's choice:** middleware.ts

| Option | Description | Selected |
|--------|-------------|----------|
| 401を返し再入力を促す | WWW-Authenticateヘッダーを返す標準動作 | ✓ |
| 401とエラーページを返す | カスタムエラーHTMLを表示 | |

**User's choice:** 401を返し再入力を促す（標準動作）

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN_PASSWORDでOK | シンプルでわかりやすい | ✓ |
| 別の変数名にする | — | |

**User's choice:** ADMIN_PASSWORD

---

## 管理UIの表示と削除確認

| Option | Description | Selected |
|--------|-------------|----------|
| 一覧表示する | KVからメンバーリストを表示 | ✓ |
| 追加フォームのみ | 最小UI | |

**User's choice:** 一覧表示する

| Option | Description | Selected |
|--------|-------------|----------|
| 確認ダイアログなし | 削除ボタンをクリックすると即実行 | |
| 確認ダイアログあり | window.confirm()またはUIダイアログ | ✓ |

**User's choice:** 確認ダイアログあり

| Option | Description | Selected |
|--------|-------------|----------|
| ページを再レンダリング | revalidatePath('/admin')で自動反映 | ✓ |
| 成功メッセージ+再レンダリング | トーストなど追加UI付き | |

**User's choice:** ページを再レンダリング（revalidatePath）

| Option | Description | Selected |
|--------|-------------|----------|
| テキスト自由入力 | teamIdをテキストで直接入力 | ✓ |
| 既存チームIDから選択 | KVから動的生成したselect | |

**User's choice:** テキスト自由入力

| Option | Description | Selected |
|--------|-------------|----------|
| window.confirm() | ブラウザネイティブのダイアログ | ✓ |
| UIダイアログ（カスタム） | モーダルコンポーネント | |

**User's choice:** window.confirm()

**Notes:** 一覧の表示フィールドについて、ユーザーから「name, substackId, teamId, addedAt どれも編集可能に」というノートがあった。議論の結果、編集機能（Update）はPhase 6に含めず「削除して再追加」で対応することを確認。

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 6に含める | インライン編集を実装 | |
| 削除して再追加で対応 | シンプルに保つ（YAGNI） | ✓ |
| 後連フェーズに延期 | — | |

**User's choice:** 削除して再追加で対応

---

## チームフィルターのUI

| Option | Description | Selected |
|--------|-------------|----------|
| URLパラメータのみ | /?team=xxx で直接アクセス | |
| ページ上にフィルターUIも置く | タブ/ドロップダウン追加 | ✓ |

**User's choice:** ページ上にフィルターUIも置く

| Option | Description | Selected |
|--------|-------------|----------|
| Server Component側（page.tsx） | searchParamsでtreamIdを取得してfilter | ✓ |
| Client Component側 | useSearchParams()を使用 | |

**User's choice:** Server Component側（page.tsx）

| Option | Description | Selected |
|--------|-------------|----------|
| タブUI（All + 各チーム） | コンパクトなタブ形式 | ✓ |
| ドロップダウン | selectメニュー | |

**User's choice:** タブUI（All + 各チーム）

| Option | Description | Selected |
|--------|-------------|----------|
| <a href>リンク | 各タブは/?team=xxxへのリンク | ✓ |
| router.push()（useRouter） | Client Componentで動的URL更新 | |

**User's choice:** `<a href>` リンク

---

## Server Actions後のデータ更新

| Option | Description | Selected |
|--------|-------------|----------|
| revalidatePath('/admin') | Server Action内でrevalidatePathを呼ぶ | ✓ |
| revalidatePath + revalidateTag | タグベースの細かいキャッシュ無効化 | |

**User's choice:** revalidatePath('/admin')

| Option | Description | Selected |
|--------|-------------|----------|
| エラー時は簡易メッセージ | useActionStateでエラー文字列を返す | ✓ |
| throwしてerror.tsxで表示 | エラーバウンダリに処理させる | |

**User's choice:** エラー時は簡易メッセージ（useActionState）

---

## Claude's Discretion

- 管理画面のレイアウト（テーブル構造、ボタン配置）: TailwindでシンプルなTable/buttonを実装
- Server Actionsのファイル構成（`src/app/admin/actions.ts`など）: Claude判断
- タブUIのスタイリング（アクティブタブの強調）: TailwindでClaude判断

## Deferred Ideas

- メンバー編集機能（Update）— YAGNI、削除して再追加で対応
- チームフィルターのドロップダウンUI — チーム数が増えた場合の将来対応
- 管理画面でのチーム管理（作成・削除）— 将来の要件があれば別フェーズ
