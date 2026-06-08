---
created: 2026-06-06T00:47:16.937Z
title: updateCommitSlotsAction を非アトミックな delete+insert から upsert に置き換える
area: auth
resolves_phase: 33
files:
  - src/app/my/actions.ts:165-184
---

## Problem

`updateCommitSlotsAction` は既存スロットを全件 DELETE してから新しいスロットを INSERT する。
Supabase JS クライアントは DB トランザクションを直接サポートしないため、
DELETE 成功後に INSERT が失敗するとそのメンバーのスロットが空になったまま残る。

現状はエラーログで「delete は成功済み」と明示するようにしたが、ユーザー体験としては
スロットが消えた状態になるため根本対応が必要。

## Solution

`onConflict: 'member_id,day_of_week'` を使った upsert に置き換え、
送信されなかった曜日の行だけを後から DELETE する方式にする。

```ts
// 1. upsert で新しいスロットを書き込む（既存行は hour が更新される）
await admin.from('member_commit_slots').upsert(
  newSlots.map(s => ({ member_id, day_of_week: s.day_of_week, hour: s.hour })),
  { onConflict: 'member_id,day_of_week' }
)

// 2. 送信されなかった曜日だけ削除
const newDays = newSlots.map(s => s.day_of_week)
await admin.from('member_commit_slots')
  .delete()
  .eq('member_id', member.id)
  .not('day_of_week', 'in', `(${newDays.join(',')})`)
```

スロットが 0 件の場合は全件 DELETE のみでよい（upsert する行がないため）。
