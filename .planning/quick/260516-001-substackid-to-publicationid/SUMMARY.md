# substackId → publicationId リネーム SUMMARY

**実施日:** 2026-05-16
**コミット数:** 3

## 概要

`substackId` (camelCase) および `substack_id` (snake_case) を全コードベースで `publicationId` / `publication_id` へリネームした。

## 変更ファイル一覧

### src/ (TypeScript/TSX)

| ファイル | 変更内容 |
|---|---|
| `src/lib/types.ts` | `Member.substackId` → `Member.publicationId` |
| `src/lib/members.ts` | DB クエリの `.eq('substack_id', ...)` → `.eq('publication_id', ...)`, INSERT フィールド名, 変数名, エラーメッセージ |
| `src/lib/articles.ts` | DB クエリの `.eq('substack_id', ...)` → `.eq('publication_id', ...)`, INSERT フィールド名, 変数名 |
| `src/lib/fetchFeed.ts` | `member.substackId` → `member.publicationId` |
| `src/lib/__tests__/fetchFeed.test.ts` | `makeMember` 関数の引数名 |
| `src/lib/calendarUtils.ts` | JSDoc コメント内の表記 |
| `src/app/admin/actions.ts` | formData フィールド名, 変数名, エラーメッセージ |
| `src/app/admin/AdminAddForm.tsx` | `name="substackId"` → `name="publicationId"`, placeholder |
| `src/app/admin/AdminMemberList.tsx` | テーブルヘッダー, キー属性, ハンドラ引数名 |
| `src/app/my/actions.ts` | formData フィールド名, DB クエリ, エラーメッセージ（日本語含む） |
| `src/app/my/LinkMemberForm.tsx` | form field name, label, id |
| `src/app/my/MyProfileForm.tsx` | Props 型 `substack_id` → `publicationId`, 表示箇所 |
| `src/app/my/page.tsx` | MyProfileForm へ渡す prop |
| `src/app/member/[substackId]/` → `src/app/member/[publicationId]/` | git mv によるルートディレクトリリネーム |
| `src/app/member/[publicationId]/page.tsx` | params 型と変数名 |
| `src/app/api/cron/route.ts` | `m.substackId` → `m.publicationId` |
| `src/components/HeatmapRow.tsx` | `member.substackId` → `member.publicationId` |
| `src/components/WeeklyHeatmapGrid.tsx` | `member.substackId` → `member.publicationId` |

### scripts/

| ファイル | 変更内容 |
|---|---|
| `scripts/export-to-sql.ts` | SQL カラム名 (`substack_id` → `publication_id`), 変数名 |
| `scripts/seed-kv.ts` | フィールド名, ログ出力, コメント |

### supabase/

| ファイル | 変更内容 |
|---|---|
| `supabase/schema.sql` | members/articles テーブルの `substack_id` → `publication_id` |
| `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` | 新規作成: DB マイグレーション SQL |

## コミット

| ハッシュ | メッセージ |
|---|---|
| `53c33e4` | refactor: rename substackId → publicationId in src/ (TS/TSX files) |
| `7b23cc3` | refactor: rename substack_id → publication_id in supabase/schema.sql and migration |
| `2e85688` | refactor: rename substackId → publicationId in scripts/ |

## 成功基準チェック

- [x] `grep -r "substackId\|substack_id" src/ --include="*.ts" --include="*.tsx"` → 0 件
- [x] TypeScript コンパイル成功（`Compiled successfully`）
- [x] `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` 作成済み

## 注意事項

- ビルド時に `/admin` プリレンダリングエラーが発生するが、これは Supabase DB のカラム名がまだ `substack_id` のままであることが原因。コードの正しさの問題ではない。
- **DB マイグレーションをデプロイ前に実行すること:** `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` を Supabase SQL Editor で実行してからコードをデプロイする。

## 除外ファイル

- `scripts/output/` 配下のレガシーマイグレーション成果物は変更なし（指示に従い除外）
