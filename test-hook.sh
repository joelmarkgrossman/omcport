#!/usr/bin/env bash
# ELI5 hook tester: feed fake Claude payloads to pre-tool-use.mjs and see what it does.
# Usage: bash test-hook.sh [project-dir]
#
# Think of it as: pretend you're Claude about to run a Bash command,
# and ask omcport "is this OK?"

PROJECT_DIR="${1:-$PWD}"
HOOK="$(cd "$(dirname "$0")" && pwd)/hooks/pre-tool-use.mjs"

run() {
  local label="$1"
  local cmd="$2"
  local payload
  payload=$(printf '{"tool_name":"Bash","cwd":"%s","tool_input":{"command":"%s"}}' \
    "$PROJECT_DIR" "$cmd")
  printf '\n\033[1;34m=== %s ===\033[0m\n' "$label"
  printf '\033[2mcommand: %s\033[0m\n' "$cmd"
  echo "$payload" | node "$HOOK" | python3 -m json.tool 2>/dev/null || \
    echo "$payload" | node "$HOOK"
}

# 1. No port in command — should get env context injected
run "No port (ls)" "ls -la"

# 2. Dev default port 5173 — should suggest rewrite to assigned port
run "Vite default (5173)" "npm run dev -- --port 5173"

# 3. Another dev default
run "Next.js default (3000)" "next dev -p 3000"

# 4. A port already in omcport pool but not yours (force collision)
#    Change 13032 to a base used by a different project if you want a real deny
run "Pool port (might block)" "node server.js --port 13032"

# 5. OMCPORT_DISABLE bypass
run "Disabled (OMCPORT_DISABLE=1)" "npm run dev"
# ^ won't actually set the env for the hook call below, just labeling intent:
printf '\n\033[2mFor real disable test: OMCPORT_DISABLE=1 node %s <<< '"'"'{"tool_name":"Bash","cwd":"%s","tool_input":{"command":"npm run dev"}}'"'"'\033[0m\n' \
  "$HOOK" "$PROJECT_DIR"
