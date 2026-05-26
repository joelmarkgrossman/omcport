---
id: TASK-006
title: Expand default fixed-port-tools.json
status: Done
assignee:
  - claude
created_date: '2026-05-24 21:04'
updated_date: '2026-05-26 17:53'
labels:
  - fixed-port
milestone: '0.9'
dependencies: []
priority: low
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seed common tools that have known fixed ports so users don't have to add them manually. Candidates: MailHog (8025), MailPit (8025), Storybook with custom port file, Adminer (8080 — but in DEV_DEFAULTS so already handled differently), Postgres (5432), Redis (6379). Decide which to include in default — too many adds noise; too few defeats the purpose.
<!-- SECTION:DESCRIPTION:END -->
