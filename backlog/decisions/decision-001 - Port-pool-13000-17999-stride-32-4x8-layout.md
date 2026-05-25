---
id: 1
title: Port pool 13000-17999, stride 32, 4x8 layout
status: Accepted
date: 2026-04
---

# ADR-001 — Port pool 13000–17999, stride 32, 4×8 layout

## Context

Multiple Claude agents on the same host concurrently want common dev ports (3000, 5173, 8080). The collision problem omcport was built to solve. Needs a deterministic allocation that:

- Scales to dozens of projects (Joel has 20+)
- Supports git worktrees (each branch is effectively a new project copy)
- Has named slots so agents can predict (e.g., "the web port") without negotiating
- Sits in a port range high enough to not collide with anything system-managed or commonly used

## Decision

- **Pool:** 13000–17999 (5000 ports total)
- **Stride per project:** 32 ports
- **Per-stride layout:** 4 buckets × 8 slots
- **Bucket 0:** main checkout. Buckets 1–3: git worktrees.
- **Named slots (offsets within bucket):** web=0, api=1, storybook=2, preview=3, db=4, worker=5, docs=6, admin=7
- **Capacity:** 5000 / 32 = 156 projects, each with up to 4 worktrees and 8 named services

## Consequences

**Positive:**
- Fully deterministic, no per-allocation negotiation
- Agents can predict port from project + slot without looking it up
- Supports 156 projects × 4 worktrees × 8 services
- Fixed-port external tools (backlog.md, MailHog) live outside the pool, no conflict

**Negative / accepted tradeoffs:**
- Hard cap of 8 named services per worktree (rare to need more)
- Wastes ports when a project uses < 8 services (most projects)
- "Named slot" abstraction may not fit every stack (e.g., microservices with 12+ ports)
- 13000-range is non-standard; some firewalls block it (acceptable for dev)

**Reversibility:** Medium. Pool boundaries + stride encoded in `lib/pool.mjs`. Changing requires registry migration. Single source of truth so feasible but not free.
