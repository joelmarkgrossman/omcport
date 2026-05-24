---
id: TASK-006
title: Expand default fixed-port-tools.json
status: To Do
assignee: []
created_date: '2026-05-24 21:04'
labels:
  - fixed-port
dependencies: []
priority: low
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seed common tools that have known fixed ports so users don't have to add them manually. Candidates: MailHog (8025), MailPit (8025), Storybook with custom port file, Adminer (8080 — but in DEV_DEFAULTS so already handled differently), Postgres (5432), Redis (6379). Decide which to include in default — too many adds noise; too few defeats the purpose.
<!-- SECTION:DESCRIPTION:END -->
