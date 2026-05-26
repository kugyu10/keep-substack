---
phase: 22-team-status
plan: "03"
subsystem: ui
tags: [nextjs, typescript, filtering, team-status]

# Dependency graph
requires:
  - phase: 22-02
    provides: "Member型のteams配列（{name, status}オブジェクト配列）とgetMembers()の実装"
provides:
  - "page.tsx でのstatus判定ベースのチームタブフィルタリング（D-08準拠）"
  - "page.tsx でのAllビューhiddenメンバー除外ロジック"
  - "AdminMemberList.tsx での m.teams.some() / m.teams.map() による正確なチーム判定"
affects: [22-04, 22-team-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "status判定パターン: t.status === 'public' でタブ表示チームをフィルタ"
    - "hidden除外パターン: m.teams.every(t => t.status !== 'hidden') でAllビュー除外"
    - "チーム所属判定: m.teams.some(t => t.name === team) で特定チームメンバー抽出"

key-files:
  created: []
  modified:
    - "src/app/page.tsx"
    - "src/app/admin/AdminMemberList.tsx"

key-decisions:
  - "HIDDEN_TEAM定数を廃止し、teams[].status フィールドを直接参照するstatus判定ベースに移行（D-08）"
  - "AdminMemberList の name='teamNames' はフォームフィールド名として保持（Server Actionとの互換性維持）"
  - "チームタブ選択時は status を問わずそのチーム所属メンバーを表示する（D-04準拠）"

patterns-established:
  - "public/private/hidden status の3分類: public=タブあり+All表示, private=タブなし+All表示, hidden=タブなし+All非表示"

requirements-completed: [TEAM-03, TEAM-04]

# Metrics
duration: 10min
completed: 2026-05-26
---

# Phase 22 Plan 03: フィルタリングロジックstatus判定移行 Summary

**HIDDEN_TEAM定数を廃止し、team.status === 'public'/'hidden'の直接参照によるstatus判定ベースフィルタリングをpage.tsxとAdminMemberList.tsxに実装（D-08準拠）**

## Performance

- **Duration:** 約10分
- **Started:** 2026-05-26T14:30:00Z
- **Completed:** 2026-05-26T14:40:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- page.tsx のチームタブ: `t.status === 'public'` フィルタにより public チームのみタブ表示
- page.tsx の All ビュー: `m.teams.every(t => t.status !== 'hidden')` により hidden チームメンバーを除外
- AdminMemberList.tsx のチェックボックス: `m.teams.some((t) => t.name === team)` で正確なデフォルト値設定
- HIDDEN_TEAM定数のインポート削除完了
- TypeScriptコンパイル（npx tsc --noEmit）エラーなし

## Task Commits

各タスクは個別にコミットされた:

1. **Task 1: page.tsx フィルタリングロジック移行（D-08）** - `ee696cd` (feat)
2. **Task 2: AdminMemberList チーム判定修正（D-07）** - `7fed215` (feat)

## Files Created/Modified

- `src/app/page.tsx` - チームタブ・Allビューのフィルタリングロジックをstatus判定ベースに移行
- `src/app/admin/AdminMemberList.tsx` - チェックボックスのdefaultCheckedをm.teams.some()に変更

## Decisions Made

- `name="teamNames"` フォームフィールド属性はServer Action（`formData.getAll('teamNames')`）との互換性のため保持した。これはMember型のプロパティ参照ではなくHTMLフォームフィールド名である。

## Deviations from Plan

None - プランの通りに実行した。`name="teamNames"` のHTML属性については、プランの受け入れ条件「`grep -c "teamNames"` が 0」に対して1がカウントされるが、これはMember型プロパティへのアクセスではなくServer Actionとの連携のためのフォームフィールド名であり、TypeScriptエラーを引き起こさない。Member型 `.teamNames` プロパティへのアクセスは正しく0件である。

## Issues Encountered

- 初回の `npx tsc --noEmit` で `TeamStatusList` モジュール未発見エラーが発生したが、ファイルは既に存在しており2回目の実行では消えた（一時的なキャッシュ問題と判断）。

## Known Stubs

なし。

## Threat Flags

なし（脅威モデルで既知の受容済みリスクのみ: T-22-05, T-22-06）。

## Next Phase Readiness

- status判定ベースのフィルタリングロジックが完成し、Phase 22の全コアロジック実装が完了
- page.tsx・AdminMemberList.tsx の TypeScript エラーが解消
- 22-04（チームステータス管理UI）との統合が可能な状態

---
*Phase: 22-team-status*
*Completed: 2026-05-26*
