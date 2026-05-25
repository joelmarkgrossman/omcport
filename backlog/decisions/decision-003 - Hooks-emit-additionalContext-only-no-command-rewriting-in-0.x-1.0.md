---
id: 3
title: Hooks emit additionalContext only - no command rewriting in 0.x/1.0
status: Accepted
date: 2026-05
---

# ADR-003 — Hooks emit additionalContext only (no command rewriting in 0.x/1.0)

## Context

Claude Code's `PreToolUse` hook supports several outputs:
- `additionalContext`: text shown to Claude as guidance (advisory)
- `permissionDecision: 'deny'`: blocks the command (hard stop)
- (Hypothetical command-rewriting mechanism — not formally documented as a stable API)

Need to decide how aggressive omcport's enforcement should be. Tradeoff: aggressive rewriting catches mistakes structurally but risks breaking legitimate commands; pure advisory relies on the agent reading and following.

## Decision

- **Default:** emit `additionalContext` with the assigned port range and an env-prefix suggestion. The agent reads this and chooses to follow.
- **Hard block:** `permissionDecision: 'deny'` only when the user attempts a port inside the omcport pool that belongs to **a different project**. (Genuine collision — must not proceed.)
- **No command modification** in 0.x or 1.0. Layer C (auto-rewrite or wrapper shim) is explicitly deferred to milestone 1.2.

## Consequences

**Positive:**
- Low-risk: no command-string mutations means no surprises ("why did my command get changed?")
- Trivial rollback: unset the hook and omcport stops affecting anything
- Compatible with any tool that reads `PORT` env var (Vite, Next, Storybook, Express w/ default)
- No sandbox / sudo / shim-PATH requirements

**Negative / accepted tradeoffs:**
- Weak enforcement: agent that ignores advisory text uses wrong port
- Humans typing commands manually bypass the hook entirely
- Required Claude Code to be configured to actually call hooks (default-on, but disable-able)

**Reversibility:** Easy. Layer C is planned (1.2). When 1.2 ships, this ADR will be amended to note Layer C as the structural-mode option.
