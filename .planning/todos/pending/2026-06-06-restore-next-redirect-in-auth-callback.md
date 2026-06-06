---
created: 2026-06-06T00:47:16.937Z
title: auth/callback の next パラメータを有効化する
area: auth
files:
  - src/app/auth/callback/route.ts:10-12,57
  - src/app/signin-51cf21389c56/actions.ts:22
  - src/app/login/actions.ts:14
---

## Problem

`auth/callback/route.ts` では Open Redirect 防止付きで `next` パラメータを計算しているが、
57行目のリダイレクトが `new URL('/my', origin)` にハードコードされており `next` が完全に無視されている。

現時点では signin/login どちらのアクションも `next=` を callbackUrl に含めていないため実害はないが、
デッドコードとして残っており誤解を招く。

## Solution

`signin-51cf21389c56/actions.ts` および `login/actions.ts` が `next=` を渡す必要が生じたタイミングで、
57行目を以下に戻す:

```ts
return NextResponse.redirect(new URL(next, origin))
```

それまでの間は `nextParam` / `next` の計算ごと削除してもよい（TODO コメントを残し中間状態を明示）。
現在は TODO コメントを route.ts 10-12行目に追加済み。
