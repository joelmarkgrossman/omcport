---
id: 2
title: TOML registry with atomic write and proper-lockfile
status: Accepted
date: 2026-04
---

# ADR-002 — TOML registry with atomic-write and proper-lockfile

## Context

Registry must:
- Survive concurrent writers (multiple Claude instances + the user via CLI/TUI)
- Be crash-safe (no half-written state corrupts the registry)
- Be human-readable (Joel can `cat` it and edit it directly when debugging)
- Have no operational dependencies (no database to install/manage)

## Decision

- **Format:** TOML, parsed by `@iarna/toml`
- **Path:** `~/.claude/omcport/registry.toml` (override via `OMCPORT_DIR`)
- **Atomicity:** all mutations write to `registry.toml.tmp` then `fs.rename` → `registry.toml`
- **Concurrency:** `proper-lockfile` on the omcport directory; all writers acquire lock before reading-modifying-writing
- **Backup:** prior `registry.toml.bak` kept after each write

## Consequences

**Positive:**
- Human-readable; trivially git-diffable if user wants to track it
- No DB dependency
- `fs.rename` is atomic on the same filesystem (POSIX guarantee)
- Trivial crash recovery: `.tmp` files orphaned by a crash are just ignored
- Simple to write tests against

**Negative / accepted tradeoffs:**
- Not built for high concurrency — lock is coarse (whole-registry granularity)
- Doesn't scale to thousands of projects (TOML parse cost; whole-file rewrites)
- No schema validation built-in (would have to layer it on)
- TOML is fine for flat-ish data but not great if registry grows nested

**Reversibility:** Medium-hard. Migrating registry to SQLite or similar requires a migration tool + updating every reader/writer (currently ~10 call sites in `lib/`).
