# omcport — User Guide

## The one-sentence version

omcport gives every project on your machine its own port numbers so multiple Claude agents never fight over the same port.

## Why you need this

You have 20+ projects. You open three Claude sessions at once — `lifeline`, `collab-editor`, `rental-house-model`. All three Claude instances try to start a dev server. All three reach for port 3000 or 5173. One wins, two fail, nobody knows why.

omcport fixes this by assigning each project a permanent slice of the port range (13000–17999) and enforcing it automatically.

## How it works (no jargon)

When you open a Claude session in a project directory:

1. **SessionStart fires** — omcport looks up the project in its registry, finds (or creates) the port assignment, and tells Claude: "this project's web port is 13320, API is 13321, etc."

2. **Every Bash command is checked** — if Claude tries to run `npm run dev -- --port 5173`, the PreToolUse hook intercepts it and says "rewrite that to 13320 — that's your project's port." If it tries to use a port belonging to *another* project, the command is blocked with a clear message.

3. **Claude just uses the right ports** — it reads the context, uses the assigned ports, no collisions.

## Daily usage

**You don't have to do anything.** The hooks run automatically. Just open Claude in any project directory and it knows its ports.

### When starting a dev server

Claude will tell you the assigned ports in its context. It should use them automatically. If it doesn't, the hook will catch the wrong port and suggest the correct one.

```bash
# Claude sees this automatically in its context:
# omcport: lifeline bucket 0 → web=13320 api=13321 storybook=13322 ...
# So instead of: npm run dev (which defaults to 5173)
# Claude should run: PORT=13320 npm run dev
# or: npm run dev -- --port 13320
```

### Temporarily disable

```bash
OMCPORT_DISABLE=1 npm run dev   # single command bypass
```

### Disable for a whole project (fixed-port apps)

Some projects need a specific port and won't work otherwise — e.g. Dropbox-backed apps, OAuth callbacks pinned to `localhost:5173`, browser extensions hardcoded to a port. Drop a marker file in the project root:

```bash
touch /path/to/project/.omcport-disable
```

Both hooks (SessionStart + PreToolUse) detect this file and skip the project entirely. The project keeps its registry entry but no port enforcement happens.

Current example: `~/dev/the_board/web/.omcport-disable` (Vite dev server pinned to 5173 for Dropbox sync).

### Tools that bring their own port (backlog.md, MailHog, etc.)

Some third-party tools manage their own port via their own config file. omcport recognizes these and won't try to redirect them.

Built-in: `backlog browser` reads its port from `backlog/config.yml` → `default_port`. When Claude runs `backlog browser`, the hook emits an advisory instead of suggesting `PORT_WEB`:

> *"omcport: backlog.md manages its own port 50000 (configured in backlog/config.yml). Run directly — do not override with PORT_WEB or PORT_API."*

If the tool's configured port happens to fall **inside** the omcport pool (13000–17999) AND belongs to another project, you'll get a warning to fix the tool's config file (not a hard block — the hook never blocks fixed-port tools).

**Add more tools** by editing `~/.claude/omcport/fixed-port-tools.json`. Schema:

```json
[
  {
    "cmd": "backlog browser",
    "config": "backlog/config.yml",
    "portKey": "default_port",
    "name": "backlog.md"
  },
  {
    "cmd": "mailhog",
    "port": 8025,
    "name": "MailHog"
  }
]
```

| Field | Purpose |
|-------|---------|
| `cmd` | substring matched against the Bash command (case-sensitive) |
| `name` | display name in messages |
| `config` + `portKey` | reads port from a project-local YAML or JSON config file |
| `port` | static port (alternative to `config` + `portKey`) |

YAML configs: flat `key: value` only (no nesting). JSON: dot-notation keys (`server.port`) supported.

### Claim an extra port (for tests, mock servers, etc.)

```bash
omcport claim --slot mock       # returns an unused port from your project's window
omcport release mock            # free it when done
```

### See what's assigned

```bash
omcport here                    # ports for current directory
omcport ls                      # all projects
omcport                         # open the TUI (interactive)
```

### TUI keyboard shortcuts

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate projects |
| `s` | Slot-map — see all 8 ports for selected project |
| `w` | Worktrees — list/free worktree buckets |
| `a` | Add project manually |
| `f` | Free (remove) selected project |
| `k` | Kill any running server on project's ports |
| `g` | GC — remove stale worktrees (paths that no longer exist) |
| `r` | Reassign base port |
| `q` | Quit |

### Add a new project

Projects are detected automatically when you open Claude in a git directory. To scan all projects at once:

```bash
omcport scan        # preview what would be added
omcport scan --yes  # apply
```

### Check health

```bash
omcport doctor      # should say "healthy"
```

## Port assignments

Each project gets a 32-port block, split into 4 groups of 8:

- Bucket 0 = main checkout
- Bucket 1–3 = git worktrees (feature branches)

Within each bucket, slots are named:

| Slot | Offset | Example (lifeline, base 13320) |
|------|--------|-------------------------------|
| web | +0 | 13320 |
| api | +1 | 13321 |
| storybook | +2 | 13322 |
| preview | +3 | 13323 |
| db | +4 | 13324 |
| worker | +5 | 13325 |
| docs | +6 | 13326 |
| admin | +7 | 13327 |

If you open a feature branch worktree, it gets bucket 1 automatically (13328–13335), so it never conflicts with the main branch running at the same time.

## Files

- Registry: `~/.claude/omcport/registry.toml`
- Logs: `~/.claude/omcport/log.jsonl` (view with `omcport tail`)
- Fixed-port tools: `~/.claude/omcport/fixed-port-tools.json`
- Code: `~/dev/omcport/`
- Backup (pre-install): `~/.claude/settings.json.bak-pre-omcport`

## Rollback

If something breaks, remove the hooks:

```bash
mv ~/.claude/settings.json.bak-pre-omcport ~/.claude/settings.json
```

omcport stops running entirely. Your projects keep their port assignments in the registry for next time.
