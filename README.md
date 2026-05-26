# omcport

> Every project on your machine gets its own port range. Multiple Claude Code / Cursor agents stop colliding on 3000, 5173, 8080.

[![test](https://github.com/joelmarkgrossman/omcport/actions/workflows/test.yml/badge.svg)](https://github.com/joelmarkgrossman/omcport/actions/workflows/test.yml)

## The problem

You have 20+ projects. You open three agent sessions at once — say `lifeline`, `collab-editor`, `rental-house-model`. All three try to start a dev server. All three reach for port 3000 or 5173. One wins, two fail, nobody knows why.

## What omcport does

Assigns each project a permanent 32-port range out of `13000–17999` and enforces it automatically via Claude Code hooks (for Claude Code) and an MCP server (for Cursor and other MCP-capable agents).

Every project gets:
- A deterministic base port (e.g. `lifeline → 13320`)
- 4 worktree buckets × 8 named slots each (`web`, `api`, `storybook`, `preview`, `db`, `worker`, `docs`, `admin`)
- Main checkout = bucket 0; git worktrees auto-claim bucket 1–3

When an agent runs `npm run dev`, omcport tells it which port to use. When an agent tries to use a port belonging to another project, omcport blocks the command with a clear message.

## Install

> macOS only for 0.x. Linux support is milestone 1.1.

```bash
git clone https://github.com/joelmarkgrossman/omcport ~/dev/omcport
cd ~/dev/omcport
npm install --omit=dev
ln -sf ~/dev/omcport ~/.claude/omcport
ln -sf ~/dev/omcport/bin/omcport ~/bin/omcport   # or anywhere on PATH
```

Then wire the hooks into `~/.claude/settings.json` (an install script is task-012; for now copy from `ARCHITECTURE.md`).

For Cursor, add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "omcport": {
      "command": "node",
      "args": ["/Users/<you>/dev/omcport/bin/omcport-mcp"]
    }
  }
}
```

Seed the registry from your existing projects:

```bash
omcport scan --yes
```

## Daily usage

You don't have to do anything. Hooks run automatically when an agent opens any project directory.

### See what's assigned

```bash
omcport here                # ports for current directory
omcport ls                  # all projects (add --json for JSON)
omcport                     # open the interactive TUI
```

### Claim an extra port

```bash
omcport claim --slot mock   # returns an unused port from this project's window
omcport release mock        # free it when done
```

### TUI keyboard shortcuts

| Key | Action |
|---|---|
| ↑ / ↓ | Navigate projects |
| `s` | Slot-map (8 ports for selected project) |
| `w` | Worktrees (list / free buckets) |
| `a` | Add project manually |
| `f` | Free selected project |
| `k` | Kill any running server on project's ports |
| `g` | GC (remove stale worktrees) |
| `r` | Reassign base port |
| `q` | Quit |

### Disable for one command

```bash
OMCPORT_DISABLE=1 npm run dev
```

### Disable for a whole project (fixed-port apps)

Some projects need a specific port (Dropbox-backed apps, OAuth callbacks, browser extensions). Drop a marker file in the project root:

```bash
touch /path/to/project/.omcport-disable
```

Both hooks skip the project entirely.

### Tools that bring their own port

Tools like `backlog.md` and `MailHog` manage their own port via their own config. omcport recognizes them and won't try to redirect. Add new ones by editing `~/.claude/omcport/fixed-port-tools.json`:

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

## Port layout

Each project gets a 32-port block, split into 4 buckets of 8:

| Bucket | Use | Range (example, base 13320) |
|---|---|---|
| 0 | main checkout | 13320–13327 |
| 1 | git worktree | 13328–13335 |
| 2 | git worktree | 13336–13343 |
| 3 | git worktree | 13344–13351 |

Within each bucket:

| Slot | Offset | Example (bucket 0, base 13320) |
|---|---|---|
| web | +0 | 13320 |
| api | +1 | 13321 |
| storybook | +2 | 13322 |
| preview | +3 | 13323 |
| db | +4 | 13324 |
| worker | +5 | 13325 |
| docs | +6 | 13326 |
| admin | +7 | 13327 |

## Files

- Registry: `~/.claude/omcport/registry.toml`
- Logs: `~/.claude/omcport/log.jsonl` (view with `omcport tail`)
- Fixed-port tools: `~/.claude/omcport/fixed-port-tools.json`
- Code: `~/dev/omcport/`
- Backup (pre-install): `~/.claude/settings.json.bak-pre-omcport`

## Rollback

```bash
mv ~/.claude/settings.json.bak-pre-omcport ~/.claude/settings.json
```

omcport stops running entirely. Your projects keep their port assignments in the registry for next time.

## Status

`0.x` — working toward `1.0` (npm publish). See `backlog/milestones/` for the roadmap. 84 tests, all passing on macOS.

## Contributors

- Architecture / design: `ARCHITECTURE.md`
- Decision records: `backlog/decisions/`
- Roadmap: `backlog/milestones/`
- Implementation plans: `docs/superpowers/plans/`
- Design specs: `docs/superpowers/specs/`

## License

MIT — see `LICENSE`.
