# omcport Roadmap Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize the approved roadmap design (5 semver milestones, 5 retroactive ADRs, task tagging, ~15 new seed tasks) as concrete artifacts in `backlog/` and committed to git.

**Architecture:** All artifacts are markdown files committed to git, plus backlog.md CLI invocations for task creation/tagging. No source code changes. No tests to write. The "test" of each task is a verification command (e.g., `backlog milestone list` shows the milestone, `git status` confirms the file).

**Tech Stack:** backlog.md CLI v1.45.1, git, markdown.

**Spec reference:** `docs/superpowers/specs/2026-05-24-omcport-roadmap-design.md`

---

## File Structure

### Create

```
backlog/milestones/
  0.9.md
  1.0.md
  1.1.md
  1.2.md
  1.3.md
backlog/decisions/
  adr-001-port-pool-stride.md      (or whatever backlog auto-names — see Task 2)
  adr-002-toml-registry-atomic-write.md
  adr-003-advisory-not-rewriting.md
  adr-004-fixed-port-tools-framework.md
  adr-005-mcp-server-structural.md
```

### Modify (via backlog CLI — no direct edits)

- `backlog/tasks/task-002 - ...md` → add `milestone: 0.9`
- `backlog/tasks/task-003 - ...md` → add `milestone: 0.9`
- `backlog/tasks/task-006 - ...md` → add `milestone: 0.9`
- `backlog/tasks/task-007 - ...md` → add `milestone: 1.0`
- `backlog/tasks/task-004 - ...md` → add `milestone: 1.2`
- `backlog/tasks/task-005 - ...md` → add `milestone: 1.3`

### Seed via backlog CLI

- 10 new `task-NNN` files tagged to milestone 0.9
- 5 new `task-NNN` files tagged to milestone 1.0

---

## Task 1: Write 5 milestone files

**Files:**
- Create: `backlog/milestones/0.9.md`
- Create: `backlog/milestones/1.0.md`
- Create: `backlog/milestones/1.1.md`
- Create: `backlog/milestones/1.2.md`
- Create: `backlog/milestones/1.3.md`

- [ ] **Step 1: Write 0.9.md**

```markdown
---
id: 0.9
title: 0.9 — OSS-prep
status: In Progress
---

# Milestone 0.9 — OSS-prep

**Target:** ship-ready, pre-public-launch
**Status:** in progress

## Goal

Get the existing functionality polished and packaged so a stranger reading the README can install and use omcport without hand-holding.

## Definition of Done

- [ ] All linked tasks status: Done
- [ ] `npm test` green (84+ tests)
- [ ] LICENSE file in repo root
- [ ] README.md is the primary user entry point (HANDOFF / USER-GUIDE essentials merged in)
- [ ] CHANGELOG.md exists with retroactive 0.1 → 0.8 entries
- [ ] CI passes on every push (Node 20, macOS)
- [ ] 5 retroactive ADRs committed (`backlog/decisions/`)
- [ ] All 5 milestone files exist (`backlog/milestones/`)
- [ ] Manual smoke: fresh project, Claude Code session, hooks fire correctly
- [ ] CHANGELOG entry written for 0.9
- [ ] Git tag `v0.9.0` pushed

## Out of scope

- Linux support (1.1)
- Layer C / auto-rewrite (1.2)
- Cross-machine sync (1.3)
- npm publish (1.0)
```

- [ ] **Step 2: Write 1.0.md**

```markdown
---
id: 1.0
title: 1.0 — Public launch
status: To Do
---

# Milestone 1.0 — Public launch

**Target:** publish to npm, announce, withstand external eyes
**Status:** blocked on 0.9

## Goal

Publish omcport to npm and stand up the assets a public adopter expects (issue templates, contributing guide, semver discipline, version subcommand).

## Definition of Done

- [ ] All 0.9 DoD met
- [ ] `npm publish` workflow runs on git tag
- [ ] semver discipline documented in CONTRIBUTING.md
- [ ] Issue + PR templates in `.github/`
- [ ] 5-minute install guide in README (verified by running from a clean macOS user account)
- [ ] `omcport --version` prints package.json version
- [ ] `omcport help` lists all subcommands
- [ ] `omcport doctor` runs first-time-install self-test
- [ ] HN-ready announcement blurb drafted
- [ ] Manual smoke: install in a fresh project from npm, run `omcport here`, get expected output
- [ ] CHANGELOG entry written for 1.0
- [ ] Git tag `v1.0.0` pushed; npm release published

## Out of scope

- Linux (1.1)
- Layer C (1.2)
- Sync (1.3)
```

- [ ] **Step 3: Write 1.1.md**

```markdown
---
id: 1.1
title: 1.1 — Linux support
status: To Do
---

# Milestone 1.1 — Linux support

**Target:** runs on Linux as well as macOS
**Status:** blocked on 1.0

## Goal

Make omcport a cross-platform tool. Add Linux support without sacrificing macOS-first ergonomics. Windows (WSL bridge) is acceptable but not a goal.

## Definition of Done

- [ ] `lib/lsof.mjs` falls back to `ss` or `netstat` when `lsof` unavailable
- [ ] Path canonicalization works on Linux (no /private/tmp assumption)
- [ ] CI matrix runs on Ubuntu LTS + macOS
- [ ] All 84+ tests pass on Linux
- [ ] README documents Linux install path
- [ ] Manual smoke: fresh Ubuntu container, install, run `omcport here` in a tmp project
- [ ] CHANGELOG entry written for 1.1
- [ ] Git tag `v1.1.0` pushed; npm release published

## Out of scope

- Windows native (WSL fine, document only)
- Layer C (1.2)
- Sync (1.3)
```

- [ ] **Step 4: Write 1.2.md**

```markdown
---
id: 1.2
title: 1.2 — Layer C (auto-rewrite)
status: To Do
---

# Milestone 1.2 — Layer C (auto-rewrite)

**Target:** stronger enforcement than advisory text
**Status:** blocked on 1.1

## Goal

Move from advisory `additionalContext` to structural command modification — either via PreToolUse `modify` (if Claude Code supports it) or an `omcport-run` shim that auto-prepends `PORT_*=N` env vars to the user's command.

## Definition of Done

- [ ] task-004 (Layer C) status: Done
- [ ] ADR-006 written explaining the chosen mechanism (PreToolUse modify vs shim)
- [ ] Tests cover: shim prepends correctly; advisory still fires when shim disabled; opt-out via env var works
- [ ] HANDOFF / ARCHITECTURE updated to reflect Layer C
- [ ] Manual smoke: agent runs `npm run dev` and the dev server actually binds to the assigned port without explicit env vars
- [ ] CHANGELOG entry written for 1.2
- [ ] Git tag `v1.2.0` pushed; npm release published

## Out of scope

- Sync (1.3)
```

- [ ] **Step 5: Write 1.3.md**

```markdown
---
id: 1.3
title: 1.3 — Cross-machine sync
status: To Do
---

# Milestone 1.3 — Cross-machine sync

**Target:** registry shared across multiple machines
**Status:** blocked on 1.2

## Goal

Let one user's omcport registry follow them across Macs / Linux boxes. Hostname-aware merge so two machines can adopt projects without overwriting each other.

## Definition of Done

- [ ] task-005 (sync) status: Done
- [ ] ADR-007 written explaining the chosen sync mechanism (git-tracked vs Dropbox vs custom)
- [ ] `omcport adopt` extended to handle multi-host merges
- [ ] Tests cover: two-host edit conflict resolution; offline machine reconciliation
- [ ] HANDOFF / ARCHITECTURE updated to reflect sync model
- [ ] Manual smoke: two machines (or two `OMCPORT_DIR`s), both make changes, sync converges deterministically
- [ ] CHANGELOG entry written for 1.3
- [ ] Git tag `v1.3.0` pushed; npm release published

## Out of scope

- Multi-user (org) registry — beyond 1.3
```

- [ ] **Step 6: Verify all 5 milestones registered**

Run:
```bash
cd ~/dev/omcport && backlog milestone list
```

Expected: shows 5 active milestones (0.9, 1.0, 1.1, 1.2, 1.3) with task counts.

- [ ] **Step 7: Commit**

```bash
cd ~/dev/omcport
git add backlog/milestones/
git commit -m "chore(backlog): add 5 milestone files (0.9 → 1.3)

Each milestone has explicit Definition of Done + out-of-scope list.
Maps to the roadmap design in docs/superpowers/specs/2026-05-24-omcport-roadmap-design.md."
```

---

## Task 2: Write 5 ADRs

**Files:**
- Create: `backlog/decisions/adr-001-port-pool-stride.md`
- Create: `backlog/decisions/adr-002-toml-registry-atomic-write.md`
- Create: `backlog/decisions/adr-003-advisory-not-rewriting.md`
- Create: `backlog/decisions/adr-004-fixed-port-tools-framework.md`
- Create: `backlog/decisions/adr-005-mcp-server-structural.md`

For each ADR: use `backlog decision create "<title>" --status Accepted` to scaffold the file, then overwrite with the full content below. (The CLI generates the file at the right path; we replace its contents.)

- [ ] **Step 1: Scaffold + write ADR-001**

```bash
cd ~/dev/omcport && backlog decision create "Port pool 13000-17999, stride 32, 4x8 layout" --status Accepted
```

Then overwrite the generated file with:

```markdown
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
```

- [ ] **Step 2: Scaffold + write ADR-002**

```bash
cd ~/dev/omcport && backlog decision create "TOML registry with atomic write and proper-lockfile" --status Accepted
```

Overwrite with:

```markdown
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
```

- [ ] **Step 3: Scaffold + write ADR-003**

```bash
cd ~/dev/omcport && backlog decision create "Hooks emit additionalContext only - no command rewriting in 0.x/1.0" --status Accepted
```

Overwrite with:

```markdown
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
```

- [ ] **Step 4: Scaffold + write ADR-004**

```bash
cd ~/dev/omcport && backlog decision create "Fixed-port tools framework - user-editable JSON config" --status Accepted
```

Overwrite with:

```markdown
---
id: 4
title: Fixed-port tools framework - user-editable JSON config
status: Accepted
date: 2026-05
---

# ADR-004 — Fixed-port tools framework (user-editable JSON config)

## Context

Some tools manage their own port via their own config file:
- `backlog.md` reads `default_port` from `backlog/config.yml`
- `mailhog` is hardcoded to 8025
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
- **Default config:** ships with one entry for `backlog browser`.

## Consequences

**Positive:**
- Extensible without code changes — users add their own tools by editing one JSON file
- Supports both static-port tools and config-driven tools
- Hook reads the JSON every invocation — no cache invalidation needed
- No new dep added (no YAML lib; we parse what we need)

**Negative / accepted tradeoffs:**
- Hook does an extra file read per invocation (~ms; acceptable)
- Substring match is naive — could false-positive on commands containing the substring in unexpected places (e.g., a script literally named `backlog browser`)
- YAML reader is regex-based, won't handle nested keys (acceptable for the kinds of configs these tools have)
- User-edited JSON has no schema validation (planned for 1.0 via `omcport doctor` — task-007)

**Reversibility:** Easy. Default list shipped with installation; can ship more entries via update without breaking anything.
```

- [ ] **Step 5: Scaffold + write ADR-005**

```bash
cd ~/dev/omcport && backlog decision create "MCP server for structural Cursor enforcement" --status Accepted
```

Overwrite with:

```markdown
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
```

- [ ] **Step 6: Verify all 5 ADRs registered**

Run:
```bash
cd ~/dev/omcport && ls -la backlog/decisions/ && echo "---" && backlog decision list 2>&1 | head -10
```

Expected: 5 ADR files present; if `decision list` exists, lists 5 entries.

- [ ] **Step 7: Commit**

```bash
cd ~/dev/omcport
git add backlog/decisions/
git commit -m "docs(adr): 5 retroactive ADRs for load-bearing architectural decisions

ADR-001 Port pool 13000-17999, stride 32, 4x8 layout
ADR-002 TOML registry with atomic write + proper-lockfile
ADR-003 Hooks emit additionalContext only (no command rewriting in 0.x/1.0)
ADR-004 Fixed-port tools framework (user-editable JSON config)
ADR-005 MCP server for structural Cursor enforcement

Captures the why behind decisions a new contributor would question."
```

---

## Task 3: Re-tag existing tasks (002–007) to milestones

**Files:** modify (via CLI) `backlog/tasks/task-002 - ...md` through `task-007 - ...md`.

- [ ] **Step 1: Tag tasks**

```bash
cd ~/dev/omcport
backlog task edit task-002 -m 0.9
backlog task edit task-003 -m 0.9
backlog task edit task-006 -m 0.9
backlog task edit task-007 -m 1.0
backlog task edit task-004 -m 1.2
backlog task edit task-005 -m 1.3
```

- [ ] **Step 2: Verify**

```bash
backlog milestone list
```

Expected output should show:
- 0.9: 4+ tasks (task-002, task-003, task-006 + any seed tasks already created)
- 1.0: 1+ tasks (task-007)
- 1.2: 1 task (task-004)
- 1.3: 1 task (task-005)
- 1.1: 0 tasks initially

- [ ] **Step 3: Commit**

```bash
cd ~/dev/omcport
git add backlog/tasks/
git commit -m "chore(backlog): tag existing tasks (002-007) to milestones

task-002, task-003, task-006 -> 0.9 (OSS-prep stragglers)
task-007 -> 1.0 (adopter-protection feature)
task-004 -> 1.2 (Layer C)
task-005 -> 1.3 (cross-machine sync)"
```

---

## Task 4: Seed 10 new tasks for milestone 0.9

**Files:** create 10 new `backlog/tasks/task-NNN - ...md` files via CLI. Each invocation creates one task file and updates the index.

- [ ] **Step 1: Pick a LICENSE — task**

```bash
cd ~/dev/omcport
backlog task create "Pick + add LICENSE file (MIT or Apache-2.0)" \
  -m 0.9 \
  --priority high \
  --description "Pick MIT (permissive, common in JS ecosystem) or Apache-2.0 (patent grant). Add LICENSE file in repo root. Update package.json 'license' field. Mention in README. Default recommendation: MIT for ecosystem alignment."
```

- [ ] **Step 2: README rewrite — task**

```bash
backlog task create "Rewrite README as primary user entry point" \
  -m 0.9 \
  --priority high \
  --description "Currently README is implicit (no file). Merge essentials from USER-GUIDE.md (ELI5 install + daily use). HANDOFF.md stays as architecture/contributor doc — consider renaming to ARCHITECTURE.md. README sections: tagline, why (collision problem), install (1 command), quickstart, link to ARCHITECTURE for contributors."
```

- [ ] **Step 3: CHANGELOG — task**

```bash
backlog task create "Write CHANGELOG.md with retroactive 0.1 -> 0.8 entries" \
  -m 0.9 \
  --priority medium \
  --description "Use Keep-A-Changelog format. Walk git log; bucket commits into 0.1 (initial registry + hooks), 0.2 (TUI), 0.3 (Cursor support), 0.4 (.omcport-disable), 0.5 (fixed-port framework), 0.6 (MCP server). Header: '## [Unreleased]' for current main."
```

- [ ] **Step 4: CI workflow — task**

```bash
backlog task create "Add GitHub Actions CI (.github/workflows/test.yml)" \
  -m 0.9 \
  --priority high \
  --description "Node 20 on macos-latest. Steps: checkout, setup-node, npm ci, npm test. Run on push to main + pull_request. Status badge in README." \
  --labels ci
```

- [ ] **Step 5: Install script — task**

```bash
backlog task create "Write one-command install script" \
  -m 0.9 \
  --priority medium \
  --description "Decision needed: 'curl | bash' (raw install script that clones, npm install, symlinks bin) OR rely on npm publish (defer to 1.0). For 0.9 default: write a clone+install script in scripts/install.sh; README points to it. Includes patching ~/.claude/settings.json hooks (with backup)."
```

- [ ] **Step 6: Issue + PR templates — task**

```bash
backlog task create "Add .github/ issue and PR templates" \
  -m 0.9 \
  --priority low \
  --description ".github/ISSUE_TEMPLATE/bug_report.md + feature_request.md + question.md. PULL_REQUEST_TEMPLATE.md with: what / why / tests run / breaking-change checkbox."
```

- [ ] **Step 7: Rename HANDOFF.md -> ARCHITECTURE.md — task**

```bash
backlog task create "Rename HANDOFF.md to ARCHITECTURE.md" \
  -m 0.9 \
  --priority low \
  --description "After README is rewritten as primary user doc, HANDOFF becomes the contributor/architecture doc. Rename for clarity. Update all internal references (in tests, in USER-GUIDE if it survives, in scripts)."
```

- [ ] **Step 8: TUI smoke test in CI — task**

```bash
backlog task create "Add TUI smoke test (non-interactive) to CI" \
  -m 0.9 \
  --priority low \
  --description "TUI is currently untested in CI. Use Ink testing-library or spawn the binary with TERM=dumb and assert it starts/exits cleanly. Doesn't have to test interactions — just 'does the TUI launch without crashing'."
```

- [ ] **Step 9: Documentation: writing-new-fixed-port-tool — task**

```bash
backlog task create "Document how to add a new fixed-port tool" \
  -m 0.9 \
  --priority low \
  --description "Section in README or new docs/fixed-port-tools.md showing the schema of fixed-port-tools.json, with 2-3 worked examples (backlog.md, MailHog, hypothetical Storybook variant)." \
  --labels fixed-port
```

- [ ] **Step 10: Documentation: install-walkthrough verification — task**

```bash
backlog task create "Verify install walkthrough on a clean macOS user account" \
  -m 0.9 \
  --priority medium \
  --description "Create a fresh user account on macOS (or use a clean VM). Follow README install instructions verbatim. Confirm hooks fire, omcport here works, TUI launches. Note any friction points. Required for 0.9 -> 1.0 transition."
```

- [ ] **Step 11: Verify all 10 created**

```bash
cd ~/dev/omcport && backlog task list -m 0.9 2>&1 | head -25
```

Expected: shows ~13 tasks tagged to 0.9 (10 new + task-002 + task-003 + task-006).

- [ ] **Step 12: Commit**

```bash
cd ~/dev/omcport
git add backlog/tasks/
git commit -m "chore(backlog): seed 10 tasks for milestone 0.9 (OSS-prep)

LICENSE, README rewrite, CHANGELOG, CI, install script,
issue/PR templates, ARCHITECTURE rename, TUI smoke,
docs (fixed-port-tools), install walkthrough verification."
```

---

## Task 5: Seed 5 new tasks for milestone 1.0

- [ ] **Step 1: npm publish workflow — task**

```bash
cd ~/dev/omcport
backlog task create "Add GitHub Actions npm publish workflow on git tag" \
  -m 1.0 \
  --priority high \
  --description ".github/workflows/release.yml. On push of tag v*, run tests then npm publish. Requires NPM_TOKEN secret. semver must match package.json version. Optional: also create GitHub release with CHANGELOG entry as body." \
  --labels ci
```

- [ ] **Step 2: 5-min install guide — task**

```bash
backlog task create "Write 5-minute install guide for README" \
  -m 1.0 \
  --priority high \
  --description "Optimized for a stranger arriving from HN. Steps: npm install -g omcport, omcport setup (writes hooks to ~/.claude/settings.json), open Claude Code in any project, observe the omcport context line. No more than 5 commands; readable in 2 minutes."
```

- [ ] **Step 3: omcport --version + omcport help polish — task**

```bash
backlog task create "Polish omcport --version and omcport help output" \
  -m 1.0 \
  --priority medium \
  --description "--version reads package.json version, not hardcoded. help lists all subcommands with one-line descriptions (now that we have many). Run 'omcport' with no args -> TUI; 'omcport help' or 'omcport --help' -> CLI help. Test both paths."
```

- [ ] **Step 4: omcport doctor self-test for new installers — task**

```bash
backlog task create "Extend omcport doctor: first-time-install self-test" \
  -m 1.0 \
  --priority medium \
  --description "When 'omcport doctor' detects a fresh install (empty registry, no hooks patched), output a checklist: (1) Are hooks in ~/.claude/settings.json? (2) Is omcport in PATH? (3) Run 'omcport scan' to seed registry. (4) Open a Claude session and verify context line appears." \
  --labels doctor
```

- [ ] **Step 5: HN announcement blurb — task**

```bash
backlog task create "Draft HN / Twitter / blog announcement for 1.0" \
  -m 1.0 \
  --priority low \
  --description "Tagline (1 sentence: 'every project gets its own port'). Problem (multiple agents competing for 3000/5173). Solution (deterministic per-project port range, structural enforcement via hooks + MCP). Install (1 command). Link to repo. Length: 200-400 words. Joel reviews before posting."
```

- [ ] **Step 6: Verify all 5 created**

```bash
cd ~/dev/omcport && backlog task list -m 1.0 2>&1 | head -15
```

Expected: 6 tasks (5 new + task-007).

- [ ] **Step 7: Commit**

```bash
cd ~/dev/omcport
git add backlog/tasks/
git commit -m "chore(backlog): seed 5 tasks for milestone 1.0 (public launch)

npm publish workflow, install guide, --version/help polish,
doctor self-test, HN announcement draft."
```

---

## Task 6: Verify all artifacts + push

- [ ] **Step 1: Verify milestone status**

```bash
cd ~/dev/omcport && backlog milestone list
```

Expected: 5 active milestones (0.9, 1.0, 1.1, 1.2, 1.3). Counts roughly:
- 0.9: 13 tasks (10 seed + task-002, 003, 006)
- 1.0: 6 tasks (5 seed + task-007)
- 1.1: 0 tasks
- 1.2: 1 task (task-004)
- 1.3: 1 task (task-005)

- [ ] **Step 2: Verify ADR list**

```bash
ls ~/dev/omcport/backlog/decisions/ | wc -l
```

Expected: 5 files.

- [ ] **Step 3: Verify board**

```bash
cd ~/dev/omcport && backlog board 2>&1 | head -40
```

Expected: To Do / In Progress / Done columns populated with the tagged tasks.

- [ ] **Step 4: Verify tests still pass (nothing broke)**

```bash
cd ~/dev/omcport && npm test 2>&1 | tail -5
```

Expected: `Tests  84 passed (84)`. (No code changes, but smoke check.)

- [ ] **Step 5: Push**

```bash
cd ~/dev/omcport && git push
```

Expected: pushes 5 new commits (milestones, ADRs, retag, 0.9 seed, 1.0 seed) to `origin/main`.

- [ ] **Step 6: Open backlog board in Joel's pane**

(Manual.) Joel already has `backlog board` running in another pane — confirm visible milestones + populated columns.

---

## Notes on execution

- **No tests to write** — this plan is artifact creation, not coding. The "test" of each step is a verification command (`backlog milestone list`, `git status`, `npm test`).
- **Each backlog CLI invocation auto-commits the file change inside backlog/.** That's why each Task ends with a single `git add backlog/...` + `git commit` covering the whole task's worth of work, not a commit per step.
- **If `backlog decision create` doesn't accept `--status`:** check `backlog decision create --help` and adjust. Worst case: hand-write the markdown file directly under `backlog/decisions/`.
- **If `backlog milestone list` doesn't show a milestone:** create + tag a throwaway task with `-m <ver>`; that auto-creates the milestone (verified during planning).
- **Idempotency:** if a task ID conflict occurs (e.g., task-009 already exists), backlog will skip or error — adjust IDs as needed.
