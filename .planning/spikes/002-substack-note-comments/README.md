---
spike: 002-substack-note-comments
type: standard
validates: Note id で非公式エンドポイントを GET → コメント件数+本文+コメント者名/アイコンが返るか
verdict: GO
date: 2026-06-18
tags: [comments, feasibility]
---

# Spike 002 — Substack Note コメント取得

## 検証したいこと

特定 Note（`https://substack.com/@uojun/note/c-276780760` → id=`276780760`）について、コメント件数・各コメント本文・コメント者の名前/アイコンを無認証で取得できるか。取れれば機能1（コメント可視化）が成立する。

## Investigation Trail

1. `GET /api/v1/reader/comment/276780760` → HTTP 200 / 5.6KB。Note 本体（`item.comment`）+ `children_count: 4` / `reaction_count: 9` は取れるが、**返信4件は inline されない**（`children` 無し）。
2. children 取得の候補を probe:
   - `?all_comments=true` / `?include_children=true` → 5.6KB のまま（変化なし）
   - `/api/v1/post/{id}/comments` / `/api/v1/comments/{id}` / `.../descendants` → 404
   - **`GET /api/v1/reader/comment/276780760/replies` → HTTP 200 / 16KB** ✅ 返信ツリー取得成功

## Results

**確定エンドポイント（2段）:**

1. Note 本体+メタ: `GET https://substack.com/api/v1/reader/comment/{id}`
   - `item.comment`: `id`/`body`/`name`/`handle`/`photo_url`/`reaction_count`/`children_count`
2. 返信ツリー: `GET https://substack.com/api/v1/reader/comment/{id}/replies`
   ```
   {
     rootComment,
     commentBranches: [ { ...comment: { name, handle, photo_url, body, reaction_count } } ],
     moreBranches,
     nextCursor,            // ページング可
     automodHiddenBranches
   }
   ```

- `children_count: 4` に対し **返信4件すべて取得**。各返信から **名前（`name`）・アイコン（`photo_url`）・本文（`body`）・リアクション数** が取れる。
- コメント件数は `children_count`（Note 本体）で取得可能。

## Verdict: GO

機能1（コメント件数・本文・名前・アイコンの可視化）は無認証 2 エンドポイントで成立する。
※ 最終的な PoC go/no-go は spike 003（Vercel datacenter IP 到達性）に依存。

## Raw

- `raw/comment_reader.json` — Note 本体+メタ（5.6KB）
- `raw/comment_replies.json` — 返信ツリー（16KB / 4 replies）
