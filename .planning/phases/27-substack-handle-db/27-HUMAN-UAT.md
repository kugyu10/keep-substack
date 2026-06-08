---
status: passed
phase: 27-substack-handle-db
source: [27-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-08T00:00:00Z
---

## Current Test

[completed] 本番（https://keep-substack.com / Supabase prod xolhjcngrwwwqtklmoyk）で開発者自身がテスト用アカウント kugyu10@gmail.com を用いて6シナリオ #1-#6 を一巡し全 PASS（2026-06-08、Phase 36-03 手動 UAT）。検証で変更したテストアカウント行の substack_handle は最終的に NULL に復元（D-04）。他メンバー行は未接触。

## Tests

### 1. Apply SQL migration to live Supabase instances
expected: `substack_handle TEXT` column exists in `members` table; confirmed via `SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='substack_handle';`
result: [pass] — 本番（prod xolhjcngrwwwqtklmoyk）の SQL Editor で `information_schema.columns` を参照し `substack_handle` カラムが 1 行存在することを確認。`SELECT substack_handle FROM members LIMIT 5;` で既存 5 行が NULL であることも確認（本番手動、2026-06-08）。

### 2. @handle input renders on /my page
expected: An @handle input field appears below the name field when logged in at `/my`
result: [pass] — 本番 https://keep-substack.com/my にテストアカウント kugyu10@gmail.com でログインし、handle を NULL にした状態で「Substack ハンドル」入力欄が name フィールド下に描画されることを本番ブラウザで目視確認（本番手動が主、2026-06-08）。補助証拠: 36-01 の TEST project 自動 spec（e2e/27-handle.spec.ts、4 テスト green）が並行で同挙動を裏付け（D-05、自動 spec は補助レイヤーであり本番手動結果の代替ではない）。

### 3. Save @handle round-trip
expected: Saving "hoge" stores "@hoge" in DB; reloading `/my` shows "@hoge" pre-filled
result: [pass] — 本番で "hoge" を保存 → reload で `@hoge` が read-only `<p>` として表示されることを確認（Drift D-A: handle 設定後 read-only の挙動どおり。input 再編集ではなく read-only 表示で検証が追従）。本番手動が主、36-01 自動 spec が補助証拠（D-05）（2026-06-08）。

### 4. CalendarGrid shows profile link when handle set
expected: Member name/avatar on `/member/[publicationId]` is a clickable link to `https://substack.com/@handle` when `substack_handle` is non-null
result: [pass] — 本番 /member/[テストアカウントの publicationId] で名前/アイコンが `https://substack.com/@hoge` を新タブで開くリンクとして表示されることを確認。本番手動が主、36-01 自動 spec が補助証拠（D-05）（2026-06-08）。

### 5. CalendarGrid shows no link when handle null
expected: Member name/avatar is NOT a link when `substack_handle` is null
result: [pass] — handle を NULL に戻す（read-only のため UI からは戻せず、本番 SQL Editor で `UPDATE members SET substack_handle=NULL WHERE id='<自分のid>'` を実行、自分の行限定 D-04）と /member でリンクが消滅し plain 表示になることを確認。本番手動が主、36-01 自動 spec が補助証拠（D-05）（2026-06-08）。

### 6. Magic Link handle propagation
expected: Magic Link URL with `?handle=hoge` pre-fills "@hoge" in the `/my` form after successful login
result: [pass] — ⚠ テスト定義訂正（バグではなくチェックリストの取り違え）: `?handle=` を消費する入口は **signin ルート**（`src/app/(auth)/signin-51cf21389c56/page.tsx` が searchParams.handle を LoginForm に渡し、`src/app/my/page.tsx` が /my?handle= を読んで pre-fill する）。`/login` 側は handle を読まない。正しい入口 `https://keep-substack.com/signin-51cf21389c56/?handle=hoge` でメール送信 → Magic Link クリック → /my?handle=hoge 着地 → DB handle が NULL のとき input に "hoge" pre-fill を確認し PASS（2026-06-08）。**前提（D-06）:** 本番 Supabase Auth の URL Configuration（Redirect URL）で新ドメイン keep-substack.com を許可するよう開発者が事前に修正済み。これが本シナリオ成功の前提。src バグではない（チェックリストの入口記載誤りを訂正）。

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

全 6 シナリオが本番（https://keep-substack.com）で PASS。残ギャップなし。
#6 はチェックリストの入口記載誤り（`/login` ではなく signin ルートが `?handle=` を消費）を訂正のうえ PASS — src バグではない。
失敗シナリオが 0 件のため Phase 36-03 Task 4 のバグ化（D-10）は該当なし（全 pass・bug capture 不要）。
