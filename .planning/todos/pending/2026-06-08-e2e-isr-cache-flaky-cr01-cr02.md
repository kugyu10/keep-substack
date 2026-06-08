---
status: pending
created: 2026-06-08
source: 36-REVIEW.md (CR-01, CR-02)
priority: medium
---

# E2E ISR キャッシュ起因の flaky 対策（CR-01 / CR-02）

Phase 36 code review で検出。go/no-go 判定で backlog 退避（CR-03 のみ即修正済み f7d13d9）。

## 問題
`/member/[publicationId]`・`/`・`/daily` は `export const revalidate = 300` の静的 ISR で dynamic API 非使用のため、本番ビルド（`npm run build && npm run start`）で静的キャッシュされる。以下の spec は admin クライアントで DB 直書き → `revalidatePath` を呼ばずに同ルートへ `goto` するため、キャッシュ窓内で書き込みが反映されず非決定的になりうる:
- `e2e/27-handle.spec.ts` #4 / #5（プロフィールリンク有無）
- `e2e/29-mobile.spec.ts`

`/my` は `auth.getUser()` で動的化されるため #3・28 は安全。

## 対応案
- 書き込み後にキャッシュを無効化する経路を spec に持たせる（revalidate を待つ／キャッシュバスター付き goto／`?` クエリで動的化）
- または対象ルートの ISR をテスト時のみ無効化する仕組み
- 詳細・修正スニペットは `.planning/phases/36-qa-uat/36-REVIEW.md` CR-01/CR-02 参照

## 関連
WR-01..05 / IN-01..02 も同 REVIEW.md に記録（弱いクラスセレクタ依存、admin 直書き error 未チェック、resolveTestMemberId 3重複 等）。
