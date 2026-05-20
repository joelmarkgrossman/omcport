# omcport — Technical Handoff

## What it is

`omcport` is a file-backed port registry for Claude Code. It prevents concurrent Claude agents from colliding on ports (all reaching for 3000, 5173, etc.) by assigning each project a deterministic stride-32 range and enforcing it via hooks.

## How it works

### Port math

- Pool: 13000–17999
- Each project gets a 32-port stride (`base` — aligned to 32)
- That stride is split into 4 buckets of 8 ports each (`WORKTREE_WINDOW=8`, `MAX_BUCKET=4`)
- Each worktree (main or git-worktree) claims one bucket permanently
- Bucket 0 = main checkout, buckets 1–3 = feature worktrees
- `portFor({base, bucket, slotOffset})` = `base + bucket * 8 + slotOffset`
- Slot offsets: web=0, api=1, storybook=2, preview=3, db=4, worker=5, docs=6, admin=7

### Registry

TOML file at `~/.claude/omcport/registry.toml` (or `$OMCPORT_DIR/registry.toml`).

Structure:
```toml
[meta]
hostname = "..."
pool_start = 13000
pool_end = 17999

[slots.defaults]
web = 0
api = 1
# ...

[projects.lifeline]
root = "/Users/jgrossman/dev/lifeline"
base = 13320

[projects.lifeline.worktrees.lifeline]
path = "/Users/jgrossman/dev/lifeline"
bucket = 0
first_seen = "2026-05-18"
```

Writes are atomic (`.tmp` → `rename`). `proper-lockfile` prevents concurrent mutation.

### Hooks

Two hooks fire on every Claude session:

**SessionStart** (`hooks/session-start.mjs`): Detects CWD project, emits `additionalContext` with assigned ports. Claude sees this in every system reminder.

**PreToolUse** (`hooks/pre-tool-use.mjs`): Fires before every Bash call. Does two things:
1. Injects env vars as `additionalContext` (PORT=XXXXX etc.)
2. Blocks or rewrites commands that hardcode wrong ports — denies pool-port collisions, suggests rewrites for dev defaults (3000, 5173, 8080, etc.)

Both hooks: catch all errors, always exit 0, emit `{}` on failure. Must never crash Claude.

Kill switches: `OMCPORT_DISABLE=1` skips everything. `OMCPORT_CLAIM=1` skips the PreToolUse guard (used internally during `omcport claim`).

### Detection (`lib/detect.mjs`)

Given a CWD:
1. Walk up from CWD to find `.git` (file = worktree, dir = main checkout)
2. Canonicalize via `fs.realpath` (handles macOS `/tmp` → `/private/tmp` symlink)
3. Look up in registry by path
4. If not found, allocate new base + bucket 0, write to registry
5. Return `{project, base, bucket, ports, slotMap}`

`projectRoots()` reads `OMCPORT_PROJECT_ROOTS` env (colon-separated) or falls back to `~/dev:~/imga-dev`. Uses `realpathSync` for path comparison.

## File layout

```
bin/omcport              CLI entry (registers JSX loader, then imports src/cli.mjs)
hooks/
  pre-tool-use.mjs       PreToolUse hook
  session-start.mjs      SessionStart hook
lib/
  allocate.mjs           nextFreeBase(), nextFreeBucket() — pure functions
  detect.mjs             detect(cwd), resolveWorktreeRoot(), resolveProjectKey()
  env.mjs                computeEnv() — builds PORT_* env var object
  log.mjs                logEvent() — JSONL append to log.jsonl
  lsof.mjs               listListeningPorts() — lsof → Map<port, {pid, command}>
  paths.mjs              getPaths() — call at invocation time, honors OMCPORT_DIR
  pool.mjs               portFor(), inPool(), basesInPool(), strideIntersectsDenylist()
  registry.mjs           loadRegistry(), saveRegistry(), withRegistryLock()
src/
  cli.mjs                All CLI subcommands
  tui/
    App.jsx              Main TUI component (2s refresh, all keybindings)
    ProjectList.jsx      Table component
    AddProject.jsx       Add-project TextInput modal
    SlotMap.jsx          Slot drill-in (s key)
    WorktreePanel.jsx    Worktree drill-in (w key)
    helpers.mjs          relativeTime(), truncate()
    jsx-loader.mjs       Sucrase JSX transform for Node ESM
test/
  paths.test.mjs
  pool.test.mjs
  log.test.mjs
  registry.test.mjs
  allocate.test.mjs      (implicit via registry)
  detect.test.mjs
  hook-pretool.test.mjs
  cli.test.mjs
  integration/
    scan.test.mjs
    multi-worktree.test.mjs
```

## CLI subcommands

| Command | What it does |
|---------|-------------|
| `omcport` (no args) | Opens Ink TUI |
| `omcport here` | Print assigned ports for CWD |
| `omcport ls` | Table of all projects (--json for JSON) |
| `omcport claim --slot NAME` | Claim a named port slot in current worktree |
| `omcport release SLOT` | Release a claimed slot |
| `omcport free PROJECT` | Remove entire project from registry |
| `omcport scan [--yes]` | Discover git repos under OMCPORT_PROJECT_ROOTS |
| `omcport doctor` | Validate registry health |
| `omcport adopt` | Re-own registry from another hostname |
| `omcport gc` | Remove stale worktree entries (missing paths) |
| `omcport tail [N]` | Last N lines of log.jsonl (default 20) |

## Install

```bash
ln -sf ~/dev/omcport ~/.claude/omcport
cd ~/.claude/omcport && npm install --omit=dev
```

Hooks are already wired in `~/.claude/settings.json`. Registry seeded with `omcport scan --yes`.

## Testing

```bash
npm test                                    # 66 tests, all pass
npx vitest run test/integration/            # integration tests only
bash test-hook.sh /path/to/project         # manual ELI5 hook test
```

All tests use `OMCPORT_DIR` env override + cache-busting `?t=${Date.now()}` dynamic imports for isolation. Never use frozen module-level imports from `paths.mjs` — always call `getPaths()` inside each function.

## Next task: MCP server for Cursor agents

**Goal:** Real port enforcement for Cursor (and any MCP-capable agent), not just soft guidance.

Cursor agents don't fire Claude Code hooks. A Cursor global rule (`~/.cursor/rules/omcport.mdc`) is already in place — it instructs agents to run `omcport here` before starting servers. But it's advisory. The MCP server makes it structural.

### Spec

Expose omcport as an MCP server with three tools:

| Tool | Input | Output |
|------|-------|--------|
| `omcport_here` | `{ cwd: string }` | `{ project, base, bucket, ports: {web,api,...} }` |
| `omcport_claim` | `{ cwd: string, slot: string }` | `{ port: number, slot: string }` |
| `omcport_release` | `{ cwd: string, slot: string }` | `{ ok: true }` |

### Implementation

- New file: `src/mcp-server.mjs` — stdio MCP server using `@modelcontextprotocol/sdk`
- Entry point: `bin/omcport-mcp` (same pattern as `bin/omcport`)
- Reuse existing lib functions: `detect()`, CLI claim/release logic from `src/cli.mjs`
- Register in `~/.cursor/mcp.json` (already exists at that path)

### Wire into Cursor

```json
// ~/.cursor/mcp.json — add entry:
{
  "mcpServers": {
    "omcport": {
      "command": "node",
      "args": ["/Users/jgrossman/dev/omcport/bin/omcport-mcp"]
    }
  }
}
```

### Testing

- Unit: mock stdin/stdout MCP exchange, verify `omcport_here` returns correct ports for a tmp registry
- Manual: open Cursor in any project, ask agent "what port should I use?" — should call `omcport_here` tool

## Known limitations / future work

- TUI `WorktreePanel`: after freeing a worktree, returns to list immediately; stale data shows until the 2s poll fires
- Search (`/`) not implemented in TUI — use `omcport ls | grep ...`
- No Layer C (claim shim that auto-prepends env vars to Bash commands)
- No cross-machine registry sync

## Rollback

```bash
mv ~/.claude/settings.json.bak-pre-omcport ~/.claude/settings.json
```
