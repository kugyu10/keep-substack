---
created: 2026-06-08T11:00:00Z
title: 認証ガードロジックの二重化（middleware.ts / admin-guard.ts）を共有モジュール化する
area: auth
source: PR #5 code review（指摘2）
files:
  - src/middleware.ts
  - src/admin-guard.ts
  - src/__tests__/proxy.test.ts
  - src/middleware.test.ts
---

## Problem

`/admin`・`/my` の認証ガードロジックが 2 ファイルに手作業でコピーされて存在する:

- `src/middleware.ts` — Next.js が本番で実行する実体（matcher 付き）
- `src/admin-guard.ts` — ユニットテスト専用にエクスポートされた `proxy()` 関数

`src/__tests__/proxy.test.ts` がテストしているのは `admin-guard.ts::proxy` であって、
**本番で動く `middleware.ts` ではない**。両者は同一ロジックのコピーであり、
片方だけ修正されると drift（乖離）するリスクがある。

`middleware.test.ts` は本番 `middleware.ts` をテストしているが `/my`（BUG-02）経路のみで、
**本番 `/admin` ガード経路は未テスト**。

## Solution

1. 共有ガード関数を 1 モジュールに切り出す（例: `src/lib/auth-guard.ts` に
   `evaluateRouteGuard(user, pathname): NextResponse | null` を実装）。
2. `middleware.ts` と（テスト用に残すなら）`admin-guard.ts` の両方がそれを import する。
   理想は `admin-guard.ts` を廃止し、テストを `middleware.ts` 直接に寄せる。
3. テストを共有モジュール（または middleware 本体）に対して実行し、
   `/admin`・`/my` 両経路をカバーする。
4. [[2026-06-08-verify-admin-role-check-middleware]] の修正と同時に実施すると、
   管理者判定の正しいロジックを 1 箇所に集約できる。
