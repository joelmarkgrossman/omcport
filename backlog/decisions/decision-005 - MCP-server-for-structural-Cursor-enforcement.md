---
id: 5
title: MCP server for structural Cursor enforcement
status: Accepted
date: 2026-05
---

# ADR-005 — MCP server for structural Cursor enforcement (vs advisory rule only)

## Context

Cursor agents don't fire Claude Code hooks. The original enforcement for Cursor was a global rule (`~/.cursor/rules/omcport.mdc` with `alwaysApply: true`) that told the agent to call `omcport here` before starting a dev server. But rules are advisory: an agent that ignores them just uses the wrong port. Need a structural mechanism — something the agent literally calls as part of a tool, not text it reads.

## Decision

- Build a stdio MCP server: `src/mcp-server.mjs`, launched via `bin/omcport-mcp`
- Expose three tools via `@modelcontextprotocol/sdk`:
  - `omcport_here({ cwd }) → { project, base, bucket, ports }`
  - `omcport_claim({ cwd, slot }) → { port, slot }`
  - `omcport_release({ cwd, slot }) → { ok: true }`
- Wire into `~/.cursor/mcp.json`
- **Keep the `.mdc` advisory rule** — it nudges the agent toward calling `omcport_here`
- Reuse `detect()` from `lib/detect.mjs` and `claim`/`release` from `lib/claim.mjs` — CLI and MCP share the same lib functions

## Consequences

**Positive:**
- Agent has an actual API call to make rather than text to read — much more reliable
- MCP is a standard; future MCP-capable agents (Cline, Continue, etc.) get this for free
- No logic duplication — same code paths as CLI
- Backup taken before editing `~/.cursor/mcp.json`

**Negative / accepted tradeoffs:**
- Two new deps: `@modelcontextprotocol/sdk` (large), `zod` (small but new)
- Per-Cursor-session: another Node process running in the background
- Cursor must be restarted after `mcp.json` changes
- The `.mdc` rule and the MCP server both exist; agent behavior depends on which it picks up

**Reversibility:** Easy. Removing the entry from `~/.cursor/mcp.json` disables it. Removing the deps + files is straightforward.
