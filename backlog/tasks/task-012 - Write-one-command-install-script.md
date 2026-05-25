---
id: TASK-012
title: Write one-command install script
status: To Do
assignee: []
created_date: '2026-05-25 19:20'
labels: []
milestone: '0.9'
dependencies: []
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision needed: 'curl | bash' (raw install script that clones, npm install, symlinks bin) OR rely on npm publish (defer to 1.0). For 0.9 default: write a clone+install script in scripts/install.sh; README points to it. Includes patching ~/.claude/settings.json hooks (with backup).
<!-- SECTION:DESCRIPTION:END -->
