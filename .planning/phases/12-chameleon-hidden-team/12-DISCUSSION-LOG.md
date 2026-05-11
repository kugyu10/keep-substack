# Phase 12: chameleon-hidden-team - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 12-chameleon-hidden-team
**Areas discussed:** 複数チーム所属時, URL直打ち保護, 管理画面の扱い

---

## 複数チーム所属時

| Option | Description | Selected |
|--------|-------------|----------|
| 表示される | chameleon は All のみ隠れる。他チームタブには出る（チームアクティビティとして認識される） | ✓ |
| 隠れる（完全ステルス） | chameleon はどのビューにも表示されない（完全隠蔽） | |

**User's choice:** 表示される（chameleon は All ビューのみ除外、他チームタブでは表示）
**Notes:** `teamNames: ['teamA', 'chameleon']` のメンバーは `/?team=teamA` で表示される。

---

## URL直打ち保護

| Option | Description | Selected |
|--------|-------------|----------|
| / にリダイレクト | メンバーが表示されず、All ビューに戻る | |
| タブなしで表示 | chameleon メンバーが表示される（タブには出ない）。URL 知っている人は確認可能 | ✓ |
| 空リスト表示 | ページは表示するがメンバーは 0 人表示（chameleon を存在しないチームのように扱う） | |

**User's choice:** タブなしで表示
**Notes:** `/?team=chameleon` は有効なページ。タブには出ないがURLを知っていれば閲覧可能。

---

## 管理画面の扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 全共表示（推奨） | 管理者には全表示。teamNames に 'chameleon' と指定されていることが見える | ✓ |
| [chameleon]マーク付き表示 | 管理画面では表示し、名前の横に「Hidden」等のバッジを付ける | |

**User's choice:** 全共表示（推奨）
**Notes:** AdminMemberList は変更なし。管理者はいつでも chameleon メンバーを確認・編集可能。

---

## Claude's Discretion

- "chameleon" のハードコード方法（定数として定義するか inline か）
- 大文字小文字の扱い（完全一致で十分と判断）

## Deferred Ideas

None.
