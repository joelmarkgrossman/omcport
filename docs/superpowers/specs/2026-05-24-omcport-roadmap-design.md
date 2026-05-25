# omcport — Roadmap Design

**Status:** Pending user review (2026-05-24)
**Audience:** Public OSS, 1.0 target, HN-installable.
**Open pick-later items (defer to writing-plans):** LICENSE choice (MIT vs Apache-2.0); install mechanism (`curl | bash` vs `npm install -g`).

---

## Section 1 — Milestone roadmap (5 releases) ✅

| Milestone | Theme | Status | Key contents |
|---|---|---|---|
| **0.9 — OSS-prep** | Get the existing thing ship-ready | next | LICENSE, README rewrite, CHANGELOG, install script, CI (lint+test), close stragglers (task-002 TUI search, task-003 worktree refresh) |
| **1.0 — Public launch** | Publish to npm + announce | after 0.9 | npm publish, semver discipline, issue/PR templates, 5-min install guide for HN reader, basic docs site (or polished README) |
| **1.1 — Linux** | Cross-platform | post-launch | Replace lsof w/ ss/netstat fallback, Linux path canonicalization, CI matrix macOS+Linux |
| **1.2 — Auto-rewrite (Layer C)** | Stronger enforcement | task-004 | PreToolUse command rewriting OR `omcport-run` shim that auto-prepends PORT env vars |
| **1.3 — Cross-machine sync** | Multi-host registry | task-005 | git-tracked / Dropbox-synced registry w/ hostname-aware merge |

### DoD pattern (uniform across milestones)

- Every task tagged to the milestone is `Done`
- `npm test` green
- Manual smoke pass (one Claude session + one Cursor session in a fresh project)
- CHANGELOG entry written
- Git tag pushed

---

## Section 2 — ADRs (decision records to capture retroactively) ✅

5 most load-bearing past decisions. Standard format (Status / Context / Decision / Consequences), 1 page each.

| ADR | Decision | Why it matters |
|---|---|---|
| **ADR-001** | Port pool 13000–17999, stride 32, 4 buckets × 8 slots | Defines the math behind every port assignment. Future contributor will ask "why 32? why not 16 or 64?" |
| **ADR-002** | TOML registry + atomic `.tmp→rename` + `proper-lockfile` | Storage layer. Future will ask "why not SQLite? why not JSON?" |
| **ADR-003** | Hooks emit `additionalContext` only — no command rewriting in 0.x/1.0 | Soft-enforcement stance. Layer C is deliberately deferred to 1.2. |
| **ADR-004** | Fixed-port tools = user-editable JSON config (not hardcoded) | Backlog.md / MailHog pattern. Extensibility model. |
| **ADR-005** | MCP server for structural Cursor enforcement (vs advisory rule only) | Why MCP exists alongside the Cursor `.mdc` rule. |

### Going forward

New ADR per non-trivial decision as they arise (sync model, Layer C mechanism, npm namespace, etc.).

### Dropped from this list (capture only if contested later)

- `.omcport-disable` marker — small surface, self-explanatory
- "single-host registry in 0.x" — implicit non-goal, becomes ADR when 1.3 sync lands

---

## Section 3 — Task tagging ✅

### Existing tasks → milestones

| Task | Title | Milestone | Notes |
|---|---|---|---|
| `task-002` | TUI: implement search shortcut | **0.9** | Quality-of-life, lands before public launch |
| `task-003` | TUI: refresh WorktreePanel | **0.9** | Bug, fix before launch |
| `task-006` | Expand default fixed-port-tools.json | **0.9** | Add MailHog/MailPit; nice to ship pre-launch |
| `task-007` | Doctor: validate fixed-port-tools.json schema | **1.0** | Adopter-protection feature; matters once public |
| `task-004` | Layer C: auto-prepend env vars | **1.2** | Already mapped 1:1 to milestone |
| `task-005` | Cross-machine registry sync | **1.3** | Already mapped 1:1 to milestone |

### New tasks to create during writing-plans phase

**For 0.9 (OSS-prep):**
- LICENSE file (pick: MIT vs Apache-2.0)
- README rewrite (move HANDOFF/USER-GUIDE essentials into one README; keep HANDOFF as contributor doc)
- CHANGELOG.md (retroactive 0.1 → 0.8 entries from git log)
- CI workflow (`.github/workflows/test.yml` — Node 20, run `npm test` on push)
- Install script (single `curl | bash` or `npm install -g`)
- Issue + PR templates
- Write 5 ADRs (ADR-001..005)
- Write 5 milestone files (`backlog/milestones/0.9.md` etc.)

**For 1.0 (Public launch):**
- `npm publish` workflow (semver tag → publish)
- 5-min install guide (in README)
- HN-ready blurb / announcement draft
- `omcport doctor` self-test for new installers
- `omcport --version` + `omcport help` polish

---

## Section 4 — Artifact templates + location ✅

### Where things live

| Artifact | Path | Format |
|---|---|---|
| Roadmap design (this doc) | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Markdown, brainstorm output |
| Milestone files | `backlog/milestones/<version>.md` | Markdown |
| ADR files | `backlog/decisions/adr-NNN-<slug>.md` | Markdown, standard ADR template |
| Future RFCs / design docs | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Same pattern as this doc |
| Implementation plans | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | Markdown, writing-plans output |
| Contributor doc | `HANDOFF.md` (rename to `ARCHITECTURE.md` at 0.9) | Existing |
| User doc | `README.md` (rewrite at 0.9 from `USER-GUIDE.md`) | Existing |

### Milestone file template

```markdown
# Milestone 0.9 — OSS-prep

**Target:** ship-ready, pre-public-launch
**Status:** in progress
**Tasks:** task-002, task-003, task-006, [+new tasks]

## Goal

[1-2 sentence purpose]

## Definition of Done

- [ ] All linked tasks status: Done
- [ ] `npm test` green (84+ tests)
- [ ] Manual smoke: fresh project, Claude session, hooks fire correctly
- [ ] Manual smoke: fresh project, Cursor session, MCP tools callable
- [ ] CHANGELOG entry written
- [ ] Git tag `v0.9.0` pushed

## Out of scope

- [explicit non-goals to prevent scope creep]
```

### ADR template

```markdown
# ADR-001 — Port pool 13000–17999, stride 32, 4×8 layout

**Status:** Accepted
**Date:** 2026-04-XX (retroactive write 2026-05-24)

## Context

[Why was this decision needed? What pressures shaped it?]

## Decision

[The actual choice, in 1-3 sentences. Specific numbers, names, structures.]

## Consequences

**Positive:**
- [...]

**Negative / accepted tradeoffs:**
- [...]

**Reversibility:** [easy / medium / hard — how painful to change later?]
```

---

## Summary — what the implementation phase will produce

1. **5 milestone files** in `backlog/milestones/0.9.md` through `1.3.md`
2. **5 ADRs** in `backlog/decisions/adr-001..005.md`
3. **Re-tagged existing tasks** (task-002..007) with their milestones via `backlog task edit --milestone`
4. **~10 new tasks** seeded into milestone 0.9 (LICENSE, README, CHANGELOG, CI, install, templates, ADR-writing itself, etc.)
5. **~5 new tasks** seeded into milestone 1.0 (npm publish workflow, install guide, etc.)
6. **`HANDOFF.md` → `ARCHITECTURE.md`** rename (at 0.9, not now)

The implementation plan from `writing-plans` will break each of those into TDD-friendly steps where applicable (e.g., CI workflow gets a verification step; ADR writing is mechanical and doesn't).
