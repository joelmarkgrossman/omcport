---
id: TASK-001
title: Build MCP server for Cursor agents
status: Done
assignee:
  - claude
created_date: '2026-05-24 20:59'
updated_date: '2026-05-25 02:36'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Real port enforcement for Cursor + MCP-capable agents. Spec lives in HANDOFF.md. Three tools: omcport_here, omcport_claim, omcport_release. New files: src/mcp-server.mjs (@modelcontextprotocol/sdk stdio), bin/omcport-mcp. Reuse detect() and CLI claim/release. Wire into ~/.cursor/mcp.json.
<!-- SECTION:DESCRIPTION:END -->
