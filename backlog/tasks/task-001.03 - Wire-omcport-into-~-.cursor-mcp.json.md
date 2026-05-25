---
id: TASK-001.03
title: Wire omcport into ~/.cursor/mcp.json
status: Done
assignee:
  - claude
created_date: '2026-05-25 02:28'
updated_date: '2026-05-25 02:32'
labels: []
dependencies: []
parent_task_id: TASK-001
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add entry to ~/.cursor/mcp.json: { mcpServers: { omcport: { command: 'node', args: ['/Users/jgrossman/dev/omcport/bin/omcport-mcp'] } } }. Preserve any existing entries.
<!-- SECTION:DESCRIPTION:END -->
