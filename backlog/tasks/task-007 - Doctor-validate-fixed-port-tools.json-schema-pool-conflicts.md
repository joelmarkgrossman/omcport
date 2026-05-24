---
id: TASK-007
title: 'Doctor: validate fixed-port-tools.json schema + pool conflicts'
status: To Do
assignee: []
created_date: '2026-05-24 21:04'
labels:
  - doctor
  - fixed-port
dependencies: []
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend 'omcport doctor' to: (1) parse fixed-port-tools.json and report invalid entries, (2) cross-reference each tool's resolved port across known projects with omcport-assigned ranges, (3) warn if any tool's port falls inside the omcport pool AND collides with a project base+range.
<!-- SECTION:DESCRIPTION:END -->
