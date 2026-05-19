#!/usr/bin/env node
// hooks/pre-tool-use.mjs
// PreToolUse hook for Claude Code. Reads JSON on stdin, writes JSON to stdout.
// MUST NEVER crash Claude — any error path returns {} and exits 0.

import { detect } from '../lib/detect.mjs';
import { computeEnv } from '../lib/env.mjs';
import { logEvent } from '../lib/log.mjs';
import { inPool, projectBaseRange } from '../lib/pool.mjs';
import { loadRegistry } from '../lib/registry.mjs';

const DEV_DEFAULTS = new Set([3000, 4321, 5000, 5173, 8000, 8080, 8888]);
const PORT_FLAG_RE = /(?:--port[= ]|-p\s+|(?:VITE_|NEXT_|STORYBOOK_|NUXT_|DEV_)?PORT=)(\d{2,5})/g;
const HOST_BIND_RE = /(?<![\w.])\d{1,3}(?:\.\d{1,3}){3}:(\d{2,5})/g;

function extractPorts(cmd) {
  const found = [];
  for (const re of [PORT_FLAG_RE, HOST_BIND_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(cmd)) !== null) found.push(parseInt(m[1], 10));
  }
  return [...new Set(found)];
}

function findProjectByPort(reg, port) {
  if (!reg) return null;
  for (const [key, p] of Object.entries(reg.projects)) {
    if (port >= p.base && port <= p.base + 31) return key;
  }
  return null;
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

async function safeLog(ev) {
  try { await logEvent(ev); } catch { /* swallow */ }
}

async function main() {
  if (process.env.OMCPORT_DISABLE === '1') return emit({});
  if (process.env.OMCPORT_CLAIM === '1') return emit({});

  let payload;
  try { payload = JSON.parse(await readStdin() || '{}'); }
  catch { return emit({}); }

  if (payload.tool_name !== 'Bash') return emit({});
  const cwd = payload.cwd ?? process.cwd();

  let resolved;
  try { resolved = await detect(cwd); }
  catch { return emit({}); }

  if (!resolved) return emit({});

  const env = computeEnv({
    project: resolved.project,
    base: resolved.base,
    bucket: resolved.bucket,
    slotMap: resolved.slotMap,
  });

  const envPrefix = Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ');
  const portList = Object.entries(resolved.ports).map(([s, p]) => `${s}=${p}`).join(' ');

  const summary =
    `omcport: ${resolved.project} bucket ${resolved.bucket} → ${portList}. ` +
    `When starting a server, prepend assigned env vars (or rely on PORT being read ` +
    `by Vite/Next/Storybook): ${envPrefix} <your command>.`;

  await safeLog({ kind: 'env-context', project: resolved.project, bucket: resolved.bucket });

  const cmd = payload.tool_input?.command ?? '';
  const ports = extractPorts(cmd);
  if (ports.length === 0) {
    return emit({ hookSpecificOutput: { additionalContext: summary } });
  }

  const assignedSet = new Set(Object.values(resolved.ports));
  const reg = await loadRegistry().catch(() => null);
  const myRange = projectBaseRange(resolved.base);

  for (const N of ports) {
    if (assignedSet.has(N)) continue;
    if (inPool(N)) {
      const owner = findProjectByPort(reg, N);
      if (owner && owner !== resolved.project) {
        const suggested = cmd.replace(String(N), String(resolved.ports.web));
        await safeLog({ kind: 'block', project: resolved.project, attempted: N, owner });
        return emit({
          hookSpecificOutput: {
            permissionDecision: 'deny',
            permissionDecisionReason:
              `omcport: port ${N} belongs to ${owner}; this project (${resolved.project}) is ` +
              `${myRange.start}-${myRange.end}. Suggested: ${suggested}`,
          },
        });
      }
    } else if (DEV_DEFAULTS.has(N)) {
      const suggested = cmd.replace(String(N), String(resolved.ports.web));
      await safeLog({ kind: 'rewrite-suggestion', project: resolved.project, from: N, to: resolved.ports.web });
      return emit({
        hookSpecificOutput: {
          additionalContext:
            `omcport: rewrite ${N} → ${resolved.ports.web} (this project's web port). Use: ${suggested}`,
        },
      });
    }
  }
  return emit({ hookSpecificOutput: { additionalContext: summary } });
}

main().catch(() => emit({}));
