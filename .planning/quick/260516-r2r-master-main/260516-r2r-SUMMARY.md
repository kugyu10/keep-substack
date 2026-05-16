---
phase: quick
plan: 260516-r2r
subsystem: git
tags: [git, branch-rename, housekeeping]
dependency_graph:
  requires: []
  provides: [main-branch]
  affects: []
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified: []
decisions:
  - "GitHubデフォルトブランチをmasterからmainに変更（GitHub慣例に合わせた統一）"
metrics:
  duration: "約5分"
  completed: "2026-05-16"
---

# Quick 260516-r2r: デフォルトブランチ master → main 変更 Summary

**One-liner:** `git branch -m master main` + `gh repo edit --default-branch main` でローカル・リモートともにmainブランチへ統一完了

## What Was Done

### Task 1: ローカルブランチリネーム＆リモートへの反映

以下の手順を順番に実行した。

1. **ローカルブランチをリネーム**
   ```
   git branch -m master main
   ```

2. **mainをoriginにpushし、upstream追跡を設定**
   ```
   git push -u origin main
   ```
   - `branch 'main' set up to track 'origin/main'` を確認

3. **GitHubのデフォルトブランチをmainに変更**
   ```
   gh repo edit kugyu10/keep-substack --default-branch main
   ```

4. **リモートのmasterブランチを削除**
   ```
   git push origin --delete master
   ```

## Success Criteria Verification

| 条件 | 結果 |
|------|------|
| ローカルブランチが `main` | `git branch --show-current` → `main` |
| `remotes/origin/main` が存在 | `git branch -a` に `remotes/origin/main` あり |
| `remotes/origin/master` が存在しない | `git branch -a` に master なし |
| GitHub HEAD branch が `main` | `git remote show origin` → `HEAD branch: main` |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- ローカルブランチ: `main` のみ（masterは存在しない）
- リモート: `origin/main` のみ（`origin/master` は削除済み）
- GitHub デフォルトブランチ: `main`
- upstream 追跡: `main → origin/main`
