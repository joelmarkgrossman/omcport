#!/usr/bin/env node
// hooks/pre-tool-use.mjs
// PreToolUse hook for Claude Code. Reads JSON on stdin, writes JSON to stdout.
// MUST NEVER crash Claude — any error path returns {} and exits 0.

import { detect } from '../lib/detect.mjs';
import { computeEnv } from '../lib/env.mjs';
import { logEvent } from '../lib/log.mjs';

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

  emit({ hookSpecificOutput: { additionalContext: summary } });
}

main().catch(() => emit({}));
