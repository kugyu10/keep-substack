---
status: resolved
phase: 29-commit-goal-view
source: [29-VERIFICATION.md]
started: 2026-06-04T00:00:00Z
updated: 2026-06-05T00:00:00Z
---

## Current Test

approved

## Tests

### 1. Mobile grid collapse (VIEW-07 runtime)
expected: `hidden sm:flex` on week-0/1 columns causes them to be hidden at 375px viewport width; only current week column is visible on mobile
result: passed

### 2. Three-column row visual layout (VIEW-03)
expected: Each CommitGoalRow shows three columns — avatar+name / CommitGrid / achievement placeholder — aligned horizontally across all rows
result: passed

### 3. /weekly-stamp tab navigation
expected: Clicking the "週次" tab navigates to /weekly-stamp and shows the old heatmap; clicking "コミット" tab returns to /
result: passed

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
