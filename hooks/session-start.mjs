#!/usr/bin/env node
// hooks/session-start.mjs
import { detect } from '../lib/detect.mjs';

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); process.exit(0); }

async function main() {
  if (process.env.OMCPORT_DISABLE === '1') return emit({});

  let payload = {};
  try { payload = JSON.parse(await readStdin() || '{}'); } catch {}
  const cwd = payload.cwd ?? process.cwd();

  let resolved;
  try { resolved = await detect(cwd); } catch { return emit({}); }
  if (!resolved) return emit({});

  const portList = Object.entries(resolved.ports).map(([s, p]) => `${s}=${p}`).join(' ');
  emit({
    hookSpecificOutput: {
      additionalContext:
        `omcport: ${resolved.project} bucket ${resolved.bucket} → ${portList}. ` +
        `These ports are reserved for this project + worktree. Use them instead of framework defaults. ` +
        `Run \`omcport claim --slot NAME\` if you need an additional port.`,
    },
  });
}

main().catch(() => emit({}));
