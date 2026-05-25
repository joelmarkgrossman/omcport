---
id: 4
title: Fixed-port tools framework - user-editable JSON config
status: Accepted
date: 2026-05
---

# ADR-004 — Fixed-port tools framework (user-editable JSON config)

## Context

Some tools manage their own port via their own config file:
- backlog.md reads `default_port` from `backlog/config.yml`
- mailhog is hardcoded to 8025
- Future tools we haven't anticipated

The `PreToolUse` hook should recognize these commands and emit a different advisory ("don't redirect — this tool manages its own port") instead of suggesting `PORT_WEB=N`. Hardcoding the list in `hooks/pre-tool-use.mjs` is closed-ended: every new tool requires a release.

## Decision

- **Config file:** `~/.claude/omcport/fixed-port-tools.json`, user-editable
- **Schema (per entry):**
  - `cmd` (string): substring match against the Bash command
  - `name` (string): display name for messages
  - Either `port` (number, static), OR `config` + `portKey` (read from project-local YAML/JSON config file)
- **Hook behavior on match:**
  - Resolves the tool's actual port (static or from config)
  - If that port falls inside the omcport pool AND belongs to a different project → warn (not block)
  - Otherwise → emit advisory "manages its own port, run directly"
- **YAML/JSON parsing:** simple regex-based for YAML (flat `key: value` only); JSON via `JSON.parse` + dot-notation keys. No third-party YAML dep.
- **Default config:** ships with one entry for the `backlog browser` substring.

## Consequences

**Positive:**
- Extensible without code changes — users add their own tools by editing one JSON file
- Supports both static-port tools and config-driven tools
- Hook reads the JSON every invocation — no cache invalidation needed
- No new dep added (no YAML lib; we parse what we need)

**Negative / accepted tradeoffs:**
- Hook does an extra file read per invocation (~ms; acceptable)
- Substring match is naive — could false-positive on commands containing the substring in unexpected places
- YAML reader is regex-based, won't handle nested keys (acceptable for the kinds of configs these tools have)
- User-edited JSON has no schema validation (planned for 1.0 via `omcport doctor` — task-007)

**Reversibility:** Easy. Default list shipped with installation; can ship more entries via update without breaking anything.
