---
id: TASK-018
title: Add GitHub Actions npm publish workflow on git tag
status: To Do
assignee: []
created_date: '2026-05-25 19:21'
labels:
  - ci
milestone: '1.0'
dependencies: []
priority: high
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
.github/workflows/release.yml. On push of tag v*, run tests then npm publish. Requires NPM_TOKEN secret. semver must match package.json version. Optional: also create GitHub release with CHANGELOG entry as body.
<!-- SECTION:DESCRIPTION:END -->
