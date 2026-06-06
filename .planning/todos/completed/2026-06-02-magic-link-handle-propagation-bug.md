---
created: 2026-06-02T14:00:05.269Z
title: マジックリンクの ?handle= 伝搬バグを修正
area: auth
files:
  - src/app/login-51cf21389c56/actions.ts
  - src/app/auth/callback/route.ts
  - src/app/my/page.tsx
---

## Problem

Phase 27 UAT で発覚。`/login-…/?handle=hoge` でログインしても `/my` ページの @handle 欄に `hoge` が pre-fill されない。

具体的な問題点として以下が疑われる：
1. `sendMagicLinkAction`（`actions.ts`）が `emailRedirectTo` に `?handle=` を付加しているが、そのURLに `publication-id` が含まれていない可能性がある
2. auth callback（`route.ts`）が `?handle=` を `/my?handle=…` に転送する処理はあるが、実際のマジックリンクフローでパラメータが引き継がれていない
3. Supabase の auth コールバック URL 経由でクエリパラメータが保持されるかどうかの検証が不十分

Phase 27 の要件 PROF-03「`/login-…/?handle=hoge` アクセス後のログインで /my の @handle 欄が `hoge` で初期表示される」に該当。

## Solution

1. ログインページ（`/login-51cf21389c56/page.tsx`）で `?handle=` を受け取り、フォームに渡しているかを確認
2. `sendMagicLinkAction` で `emailRedirectTo` に `handle` パラメータが正しく付加されているかをデバッグ
3. Supabase auth callback 後にクエリパラメータが保持される仕様を確認（Supabase は `emailRedirectTo` の完全な URL を保持する）
4. E2E で実際にマジックリンクを送信して動作確認

同一マイルストーン（v1.7）内の別フェーズ/タスクとして対応する。
