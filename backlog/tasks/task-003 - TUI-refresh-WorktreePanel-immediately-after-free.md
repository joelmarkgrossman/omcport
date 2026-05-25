---
id: TASK-003
title: 'TUI: refresh WorktreePanel immediately after free'
status: To Do
assignee: []
created_date: '2026-05-24 21:04'
updated_date: '2026-05-25 19:19'
labels:
  - tui
milestone: '0.9'
dependencies: []
priority: low
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From HANDOFF: WorktreePanel returns to list immediately after freeing a worktree but stale data shows until next 2s poll. Fix: call refresh() inline after the free completes, or have WorktreePanel manage its own re-read.
<!-- SECTION:DESCRIPTION:END -->
