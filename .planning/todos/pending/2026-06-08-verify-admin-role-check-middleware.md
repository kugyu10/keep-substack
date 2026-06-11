---
created: 2026-06-08T11:00:00Z
title: middleware の /admin 認可（user.role !== 'admin'）が本番で機能しているか検証する
area: auth
source: PR #5 code review（指摘1）
files:
  - src/middleware.ts:34-38
  - src/admin-guard.ts:36-38
---

## Problem

`src/middleware.ts`（および同一ロジックの `admin-guard.ts`）の `/admin` ガードは
`if (!user || user.role !== 'admin')` で判定している。

しかし Supabase の `auth.getUser()` が返す `user.role` は **JWT の role クレーム**であり、
通常の認証ユーザーでは `"authenticated"` が入る（アプリレベルの管理者フラグではない）。
このままだと **全ユーザーが `/admin` から `/` へリダイレクトされる**可能性がある。

PR #5 で middleware が matcher 経由で本番稼働するようになったため、影響が顕在化し得る。

## Solution

1. まず本番（https://keep-substack.com）で管理者ユーザーが実際に `/admin` にアクセスできるか確認する。
   - アクセスできている → 別経路（admin ページ側の guard 等）で認可されており middleware の条件は事実上 no-op。
     その場合は誤解を招く dead-condition なので整理する。
   - アクセスできない（弾かれる）→ 管理者判定ロジックの修正が必要。
2. 管理者判定の正しいソースを確定する（`app_metadata.role` / `members` テーブルのフラグ / Postgres role のいずれか）。
   - `app_metadata` 由来なら `user.app_metadata?.role === 'admin'` 等に修正。
3. 修正は [[2026-06-08-dedupe-auth-guard-middleware-admin-guard]] と同時に行うと二重修正を避けられる。

## Notes

- 既存 `admin-guard.ts` からコピーされた条件であり、PR #5 で新規導入されたものではないが、
  middleware 本番稼働により実害リスクが上がった。
