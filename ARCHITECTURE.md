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

### Fixed-port tools (`lib/fixed-port-tools.mjs`)

Third-party tools (backlog.md, MailHog, etc.) manage their own port config and must not be redirected by omcport's PORT_WEB advisory.

**Config file:** `~/.claude/omcport/fixed-port-tools.json` (user-editable, no code change needed to add new tools).

```json
[
  {
    "cmd": "backlog browser",      // substring matched against the Bash command
    "config": "backlog/config.yml", // path relative to project CWD
    "portKey": "default_port",     // key in config file (dot-notation for JSON)
    "name": "backlog.md"           // display name in messages
  },
  {
    "cmd": "mailhog",
    "port": 8025,                  // static port (alternative to config+portKey)
    "name": "MailHog"
  }
]
```

**PreToolUse behavior when a command matches:**
- Port outside pool or no conflict → advisory: "manages its own port, run directly"
- Port inside pool, owned by another project → warning to fix the tool's config file
- Never blocks; always exits 0

**YAML parsing:** simple regex `key: value` (no nesting). JSON: dot-notation key traversal. Both handled in `readConfigPort()` — no third-party YAML dep needed.

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
bin/omcport-mcp          MCP stdio server entry (used by Cursor + MCP-capable agents)
hooks/
  pre-tool-use.mjs       PreToolUse hook
  session-start.mjs      SessionStart hook
lib/
  allocate.mjs           nextFreeBase(), nextFreeBucket() — pure functions
  detect.mjs             detect(cwd), resolveWorktreeRoot(), resolveProjectKey()
  env.mjs                computeEnv() — builds PORT_* env var object
  log.mjs                logEvent() — JSONL append to log.jsonl
  lsof.mjs               listListeningPorts() — lsof → Map<port, {pid, command}>
  fixed-port-tools.mjs   loadFixedPortTools(), matchFixedPortTool(), resolveFixedPort()
  paths.mjs              getPaths() — call at invocation time, honors OMCPORT_DIR
  pool.mjs               portFor(), inPool(), basesInPool(), strideIntersectsDenylist()
  registry.mjs           loadRegistry(), saveRegistry(), withRegistryLock()
src/
  cli.mjs                All CLI subcommands
  mcp-server.mjs         McpServer w/ stdio transport — omcport_here/_claim/_release tools
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
npm test                                    # 84 tests, all pass
npx vitest run test/integration/            # integration tests only
bash test-hook.sh /path/to/project         # manual ELI5 hook test
```

All tests use `OMCPORT_DIR` env override + cache-busting `?t=${Date.now()}` dynamic imports for isolation. Never use frozen module-level imports from `paths.mjs` — always call `getPaths()` inside each function.

## MCP server (Cursor + MCP-capable agents)

Cursor agents don't fire Claude Code hooks. A Cursor global rule (`~/.cursor/rules/omcport.mdc`) tells agents to run `omcport here` before starting servers — but it's advisory. The MCP server (`src/mcp-server.mjs`) exposes three structural tools.

### Tools

| Tool | Input | Output |
|------|-------|--------|
| `omcport_here` | `{ cwd: string }` | `{ project, base, bucket, ports: {web,api,...} }` |
| `omcport_claim` | `{ cwd: string, slot: string }` | `{ port: number, slot: string }` |
| `omcport_release` | `{ cwd: string, slot: string }` | `{ ok: true }` |

All tools return MCP error responses (`isError: true`) for bad input — never crash the server.

### Wiring

- Entry: `bin/omcport-mcp` (Node ESM, dynamic-imports `src/mcp-server.mjs`)
- Cursor: `~/.cursor/mcp.json` → `mcpServers.omcport = { command: 'node', args: ['<abs-path>/bin/omcport-mcp'] }`
- Backup taken before edit: `~/.cursor/mcp.json.bak-pre-omcport`

### Implementation notes

- Stdio transport via `@modelcontextprotocol/sdk/server/stdio.js`
- Input schemas: zod
- Reuses `detect()` from `lib/detect.mjs` + `claim`/`release` from `lib/claim.mjs` (no logic duplication; CLI and MCP server share the same lib functions)
- Server writes nothing to stdout except MCP protocol frames; errors logged to stderr only
- Tool handlers run concurrently in the SDK — clients (and tests) must await each response before sending the next request

## Known limitations / future work

- TUI `WorktreePanel`: after freeing a worktree, returns to list immediately; stale data shows until the 2s poll fires
- Search (`/`) not implemented in TUI — use `omcport ls | grep ...`
- No Layer C (claim shim that auto-prepends env vars to Bash commands)
- No cross-machine registry sync

## Rollback

```bash
mv ~/.claude/settings.json.bak-pre-omcport ~/.claude/settings.json
```
