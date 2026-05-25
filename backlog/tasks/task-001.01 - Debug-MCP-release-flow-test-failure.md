---
id: TASK-001.01
title: Debug MCP release-flow test failure
status: Done
assignee:
  - claude
created_date: '2026-05-25 02:28'
updated_date: '2026-05-25 02:31'
labels: []
dependencies: []
parent_task_id: TASK-001
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
test/mcp-server.test.mjs > omcport_claim returns a port and omcport_release frees it — release returns isError:true. Claim works, release doesn't. Need to capture content text from release response to see actual error message. Likely registry-lock or stale-detect issue when claim+release happen in same child process.
<!-- SECTION:DESCRIPTION:END -->
