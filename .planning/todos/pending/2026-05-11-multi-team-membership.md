---
created: 2026-05-11T04:00:00Z
title: 1人が複数チームに所属できる多対多 — MVPでは teamNames配列化
area: general
files:
  - src/lib/types.ts
  - src/lib/kvMembers.ts
  - src/app/page.tsx
  - src/app/admin/AdminMemberList.tsx
  - src/app/admin/actions.ts
---

## Problem

現在 `Member.teamName: string` は単一文字列のため、1人1チームのみ所属可能。
複数チームにまたがるメンバー（例: チームAとチームBの両方に参加）を表現できない。

## Solution

### MVP: `teamNames: string[]` への変更（案A）

`Member` 型を変更:
```typescript
// Before
teamName: string

// After
teamNames: string[]
```

**変更箇所:**
- `types.ts`: `teamName → teamNames: string[]`
- `kvMembers.ts`: `getMembers()` に後方互換フォールバック追加
  `teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : [])`
- `page.tsx`: フィルタリングを `m.teamNames.includes(team)` に変更
- `AdminMemberList.tsx`: 複数チーム入力UI（カンマ区切りまたはタグUI）
- `actions.ts`: `teamName → teamNames` のパース処理

**マイグレーション:** KV内の既存データは `getMembers()` のフォールバックで自動変換。
追加フェッチ・バックフィル不要。

### 将来: 正規化（案B）
KVに3テーブル（members, teams, memberships）—複雑になるため今は不採用。
