---
spike: 001-substack-notes-list
type: standard
validates: admin の user_id で非公式フィードを GET → 投稿 Note 一覧（本文+投稿日時）が返るか
verdict: GO
date: 2026-06-18
tags: [notes, feasibility]
---

# Spike 001 — Substack Note 一覧取得

## 検証したいこと

admin（@uojun / user_id=`110584954`）本人が投稿した Note の一覧を、無認証の非公式エンドポイントから取得できるか。本文・投稿日時・コメント数が取れれば機能2（`/admin/notes`）が成立する。

## Investigation Trail

1. `GET /api/v1/user/uojun/public_profile` → HTTP 200 / 143KB。`id`/`name`/`photo_url` は取れるが **Note 一覧は profile に含まれない**（残課題化）。
2. リーダーフィード系を probe:
   - `GET /api/v1/reader/feed/profile/110584954` → **HTTP 200 / 215KB** ✅
   - `GET /api/v1/reader/feed/profile/110584954?types=note` → HTTP 200 / 181KB（note のみ）

## Results

**確定エンドポイント:** `GET https://substack.com/api/v1/reader/feed/profile/{user_id}`（無認証）

レスポンス構造:

```
{
  items: [
    {
      type: "comment",
      comment: {
        id, body, body_json, date, edited_at,
        user_id, name, handle, photo_url,
        reaction_count, children_count, attachments, ...
      },
      ...
    }, ...
  ],
  nextCursor,                 // ページング可
  originalCursorTimestamp
}
```

- 11 items 取得、うち **8 件が uojun 本人投稿**（`comment.user_id == 110584954`）。
- 各 Note から本文（`comment.body`）・投稿日時（`comment.date`）・コメント数（`comment.children_count`）・リアクション数が取得できる。
- `?types=note` で note 種別に絞り込み可能。`nextCursor` で過去分ページング可能。

## Verdict: GO

機能2（Note 一覧・本文プレビュー・投稿日時 JST）は無認証フィードで成立する。
※ 最終的な PoC go/no-go は spike 003（Vercel datacenter IP 到達性）に依存。

## Raw

- `raw/profile.json` — public_profile（Note 一覧は含まず・参考）
- `raw/profile_feed.json` — reader feed（確定・215KB / 11 items）
