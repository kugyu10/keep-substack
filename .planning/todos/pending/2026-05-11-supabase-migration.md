---
created: 2026-05-11T04:30:00Z
title: のちのちSupabase移行 — 認証・DB・Cron永続化の大マイルストーン
area: general
files:
  - src/lib/kvMembers.ts
  - src/lib/fetchFeed.ts
  - src/app/admin/
---

## Problem

現在のスタック（Upstash Redis KV）はMVPには十分だが、以下の限界がある:
- ユーザー認証なし（管理画面はBasic認証のみ）
- 自己登録不可（管理者が手動でメンバー追加）
- RSSフィードは最新30件のみ、過去データが消失する
- 1人1チームのみ（多対多に対応できない）

## Solution

Supabase（Pro $25/月）への移行:

### 技術スタック
- **DB:** Supabase Postgres（スキーマ: members, teams, memberships, articles）
- **Auth:** Supabase Auth（Email/OAuth/Magic Link）
- **Cron:** Vercel Cron → Supabase Edge Functions or GitHub Actions
- **既存KV:** Upstash Redisからのデータ移行スクリプト

### スコープ
1. **認証:** ユーザー登録・ログイン、自分でSubstackIdを登録できるUI
2. **DB設計:** members（多対多teams）、articles（Feed投稿を永続化）
3. **Cron永続化:** 登録時 + 定期（1日1回）でFeedをarticlesテーブルに蓄積
4. **KV移行:** 既存membersデータをPostgresに移行するスクリプト

### 規模感
- 1000 MAU、8GB DB以内でProプランで余裕
- 独立した大マイルストーン（v2.0相当）

### 参考
- Supabase Pro: $25/月、100,000 MAU、8GB DB
- `@supabase/ssr` でNext.js App Router対応済み
- Vercel公式インテグレーションあり
