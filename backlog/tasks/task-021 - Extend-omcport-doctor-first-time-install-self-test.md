---
id: TASK-021
title: 'Extend omcport doctor: first-time-install self-test'
status: To Do
assignee: []
created_date: '2026-05-25 19:21'
labels:
  - doctor
milestone: '1.0'
dependencies: []
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When 'omcport doctor' detects a fresh install (empty registry, no hooks patched), output a checklist: (1) Are hooks in ~/.claude/settings.json? (2) Is omcport in PATH? (3) Run 'omcport scan' to seed registry. (4) Open a Claude session and verify context line appears.
<!-- SECTION:DESCRIPTION:END -->
