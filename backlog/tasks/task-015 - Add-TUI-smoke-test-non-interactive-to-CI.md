---
id: TASK-015
title: Add TUI smoke test (non-interactive) to CI
status: To Do
assignee: []
created_date: '2026-05-25 19:20'
labels: []
milestone: '0.9'
dependencies: []
priority: low
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TUI is currently untested in CI. Use Ink testing-library or spawn the binary with TERM=dumb and assert it starts/exits cleanly. Doesn't have to test interactions - just 'does the TUI launch without crashing'.
<!-- SECTION:DESCRIPTION:END -->
