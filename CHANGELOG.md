# Changelog

All notable changes to omcport are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 0.1 → 0.7 are **retroactively grouped** — the project was developed on `main` without tagged releases. Bucketing was reconstructed from git history (`git log`) during 0.9 OSS-prep.

---

## [Unreleased] — milestone 0.9 (OSS-prep)

Working toward a public-launch-ready 1.0. See `backlog/milestones/0.9.md` for the full Definition of Done.

### Added

- `LICENSE` (MIT), `package.json` `license` field (task-008)
- GitHub Actions CI: Node 20 on macOS, runs `npm test` on push and pull_request (task-011)
- `README.md` as primary user entry point (absorbs former `USER-GUIDE.md`) with CI badge, install steps, daily usage, TUI shortcuts, `.omcport-disable` docs, fixed-port-tools docs, port layout (task-009)
- GitHub issue templates: `bug_report`, `feature_request`, `question`. PR template with backlog-task / milestone / ADR fields (task-013)
- `examples/fixed-port-tools.json` shipping default fixed-port tools (backlog.md, MailHog, MailPit) (task-006, task-016)
- TUI: `/` key opens substring filter over project key + root path; Enter applies, Esc clears (task-002)
- `filterProjects()` helper with 12-test suite covering filter + truncate + relativeTime (task-002)
- TUI smoke test via `ink-testing-library` — App mounts without throwing (task-015)
- `ink-testing-library` devDependency

### Changed

- `HANDOFF.md` renamed to `ARCHITECTURE.md` (task-014) — README is now the user doc, ARCHITECTURE is the contributor doc
- `ProjectList` component now takes pre-filtered `projects` array + `slotsDefault` instead of computing from the full registry; App owns filtering + sorting
- `.gitignore` runtime-data entries scoped to repo root (`/registry.toml`, `/log.jsonl`, etc.) so `examples/fixed-port-tools.json` can be tracked

### Fixed

- TUI `WorktreePanel`: after freeing a worktree bucket, the panel awaits the parent's refresh before returning to the list view, so stale data no longer shows for up to 2s (task-003)

---

## [0.7] — 2026-05-24

Roadmap planning artifacts. No runtime behavior changes.

### Added

- `docs/superpowers/specs/2026-05-24-omcport-roadmap-design.md` — 5-milestone semver roadmap (0.9 → 1.3), 5 retroactive ADRs, task tagging design
- `docs/superpowers/plans/2026-05-24-omcport-roadmap-rollout.md` — implementation plan for the artifact rollout
- 5 milestone files in `backlog/milestones/` (0.9 OSS-prep, 1.0 public launch, 1.1 Linux, 1.2 Layer C, 1.3 cross-machine sync) — each with Definition of Done + out-of-scope list
- 5 retroactive ADRs in `backlog/decisions/`: port pool, TOML registry, advisory-not-rewriting, fixed-port framework, MCP server
- Existing tasks (002–007) re-tagged to milestones; 15 new tasks seeded for 0.9 (10) and 1.0 (5)

---

## [0.6] — 2026-05-24

MCP server for Cursor and any MCP-capable agent.

### Added

- `src/mcp-server.mjs` — stdio MCP server using `@modelcontextprotocol/sdk` with three tools:
  - `omcport_here({ cwd }) → { project, base, bucket, ports }`
  - `omcport_claim({ cwd, slot }) → { port, slot }`
  - `omcport_release({ cwd, slot }) → { ok: true }`
- `bin/omcport-mcp` entry point
- `test/mcp-server.test.mjs` — 4 tests (tools/list, here happy + error path, claim/release roundtrip)
- Cursor wiring: entry added to `~/.cursor/mcp.json` (backup at `.bak-pre-omcport`)
- Dependencies: `@modelcontextprotocol/sdk`, `zod`

### Changed

- Extracted `claim` / `release` logic into `lib/claim.mjs` so CLI and MCP server share the same implementation

---

## [0.5] — 2026-05-24

Fixed-port tools framework. Third-party tools (backlog.md, MailHog) can declare they manage their own port; the hook emits a different advisory instead of trying to redirect them.

### Added

- `lib/fixed-port-tools.mjs` — `loadFixedPortTools`, `matchFixedPortTool`, `resolveFixedPort`. Reads YAML (flat `key: value`) or JSON (dot-notation) per-project config files
- `~/.claude/omcport/fixed-port-tools.json` user-editable config (default ships with `backlog browser` entry)
- 14 new tests in `test/fixed-port-tools.test.mjs`
- `FIXED_PORT_TOOLS_PATH` to `lib/paths.mjs`

### Changed

- `hooks/pre-tool-use.mjs` now matches fixed-port tools before generic port analysis. Match → advisory. Match + pool conflict → warning (not block)
- `~/.gitignore` to exclude runtime data files

---

## [0.4] — 2026-05-19

Per-project opt-out for apps that need a specific port.

### Added

- `.omcport-disable` marker file: both `hooks/pre-tool-use.mjs` and `hooks/session-start.mjs` skip the project entirely when this file exists in the project root
- Example use: `~/dev/the_board/web` is pinned to Vite's `5173` for Dropbox sync

---

## [0.3] — 2026-05-19

Cursor support via global advisory rule.

### Added

- `~/.cursor/rules/omcport.mdc` (global Cursor rule, `alwaysApply: true`) instructing Cursor agents to run `omcport here` before starting dev servers, use assigned `PORT_WEB`, and use `omcport claim --slot` for extra ports
- MCP server design spec written into `HANDOFF.md` as the next major task (later shipped in 0.6)

---

## [0.2] — 2026-05-19

Ink-based TUI for browsing + managing the registry interactively.

### Added

- `bin/omcport` opens the TUI when called with no args; `src/cli.mjs` retains all subcommands
- `src/tui/` with `App.jsx`, `ProjectList.jsx`, `AddProject.jsx`, `SlotMap.jsx`, `WorktreePanel.jsx`, and `helpers.mjs`
- Sucrase JSX loader (`src/tui/jsx-loader.mjs`) registered at bin entry
- TUI keybindings: `[↑↓]` navigate, `[a]` add, `[f]` free, `[k]` kill, `[s]` slot-map, `[w]` worktrees, `[g]` gc, `[r]` reassign base, `[q]` quit
- 2-second poll for live `lsof` data; live ports shown inline
- Dependencies: `react`, `ink`, `ink-text-input`, `sucrase`

### Fixed

- `selectedIndex` clamping when project count shrinks
- `refresh()` no longer unhandled-rejection crashes
- `registry.slots` null guard
- Add-project stores expanded path (not raw `~`-prefixed input)
- `process.kill` catch narrowed to ESRCH (was swallowing EPERM)
- `reassignBaseSelected` uses fresh registry data, not stale React closure

---

## [0.1] — 2026-05-18

Initial registry + hooks + CLI. Solves the original problem: multiple agents colliding on common dev ports (3000, 5173, 8080).

### Added

- Port pool `13000–17999`, 32-port stride per project, 4 buckets × 8 slots (web/api/storybook/preview/db/worker/docs/admin)
- TOML registry at `~/.claude/omcport/registry.toml` with atomic `.tmp → rename` writes and `proper-lockfile` concurrency control
- `lib/`: `pool.mjs` (math), `paths.mjs` (env-overridable paths), `log.mjs` (JSONL append), `registry.mjs` (load/save/lock), `allocate.mjs` (next-free base + bucket), `lsof.mjs` (listening-ports map), `env.mjs` (PORT_* env var builder), `detect.mjs` (cwd → project + bucket + ports)
- Symlink canonicalization (`fs.realpath`) for macOS `/tmp → /private/tmp`
- `hooks/pre-tool-use.mjs` — env-context injection for every Bash call; blocks pool collisions belonging to another project; suggests rewrites for dev defaults (3000, 5173, 8080, etc.)
- `hooks/session-start.mjs` — assigned-ports summary line for every Claude session
- `OMCPORT_DISABLE=1` and `OMCPORT_CLAIM=1` kill switches
- CLI subcommands: `here`, `ls` (table + `--json`), `claim --slot`, `release`, `free`, `scan [--yes]`, `doctor`, `adopt`, `gc`, `tail`
- 66 tests covering pool math, allocator, paths, log, registry, detect, env, lsof, both hooks, CLI subcommands, scan integration, multi-worktree determinism, corrupt-registry handling
- Dependencies: `@iarna/toml`, `proper-lockfile`
