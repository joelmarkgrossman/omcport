---
id: TASK-004
title: 'Layer C: auto-prepend env vars to Bash commands'
status: To Do
assignee: []
created_date: '2026-05-24 21:04'
labels:
  - enforcement
dependencies: []
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From HANDOFF: No Layer C (claim shim that auto-prepends env vars). Currently PreToolUse hook only emits advisory context; Claude must read it and apply manually. Layer C would rewrite the actual Bash command to include PORT_WEB=N etc. Risk: command rewriting in PreToolUse is touchy — investigate hook permissionDecision='modify' or shim approach via PATH wrapper.
<!-- SECTION:DESCRIPTION:END -->
