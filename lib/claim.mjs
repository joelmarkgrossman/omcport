// lib/claim.mjs
//
// Shared claim/release logic used by both the CLI (src/cli.mjs) and the
// MCP server (src/mcp-server.mjs). Pure data in / data out — no console
// writes. Callers are responsible for printing or framing the result.
//
// claim() and release() both mutate the registry under withRegistryLock and
// emit a JSONL event via logEvent (kind: 'claim' | 'release').
//
// claim() is idempotent: re-claiming the same slot in the same worktree
// returns the existing port without allocating a new one.
//
// All errors are thrown as plain Error subclasses with .code populated where
// useful (callers may distinguish e.g. 'EWORKTREE' vs 'EWINDOWFULL').

import { detect } from './detect.mjs';
import { loadRegistry, saveRegistry, withRegistryLock } from './registry.mjs';
import { portFor, WORKTREE_WINDOW } from './pool.mjs';
import { logEvent } from './log.mjs';

function findWorktreeForBucket(project, bucket) {
  for (const [k, wt] of Object.entries(project.worktrees ?? {})) {
    if (wt.bucket === bucket) return k;
  }
  return null;
}

/**
 * Claim a named port slot for the worktree containing `cwd`.
 * Idempotent for the same (worktree, slot) pair.
 *
 * @param {{cwd: string, slot: string, pid?: number|null, label?: string|null}} args
 * @returns {Promise<{port: number, slot: string, project: string, bucket: number, reused: boolean}>}
 */
export async function claim({ cwd, slot, pid = null, label = null }) {
  if (!slot || typeof slot !== 'string') {
    const e = new Error('claim requires slot (string)');
    e.code = 'EARG';
    throw e;
  }
  const resolved = await detect(cwd);
  if (!resolved) {
    const e = new Error('cwd is not inside any registered project');
    e.code = 'ENOPROJECT';
    throw e;
  }

  return withRegistryLock(async () => {
    const reg = await loadRegistry();
    const project = reg.projects[resolved.project];
    const wtKey = findWorktreeForBucket(project, resolved.bucket);
    if (!wtKey) {
      const e = new Error('worktree row missing — registry corrupt');
      e.code = 'EWORKTREE';
      throw e;
    }
    const wt = project.worktrees[wtKey];
    wt.claims = wt.claims ?? {};

    if (wt.claims[slot]) {
      return {
        port: wt.claims[slot].port,
        slot,
        project: resolved.project,
        bucket: resolved.bucket,
        reused: true,
      };
    }
    const reservedOffsets = new Set(Object.values(wt.claims).map((c) => c.offset));
    let chosen = null;
    for (let off = 0; off < WORKTREE_WINDOW; off++) {
      if (!reservedOffsets.has(off)) { chosen = off; break; }
    }
    if (chosen === null) {
      const e = new Error(
        `window exhausted for ${resolved.project} bucket ${resolved.bucket}`,
      );
      e.code = 'EWINDOWFULL';
      throw e;
    }
    const port = portFor({
      base: project.base,
      bucket: resolved.bucket,
      slotOffset: chosen,
    });
    wt.claims[slot] = { offset: chosen, port, pid: pid ?? null, label: label ?? null };
    await saveRegistry(reg);
    await logEvent({ kind: 'claim', project: resolved.project, slot, port });
    return {
      port,
      slot,
      project: resolved.project,
      bucket: resolved.bucket,
      reused: false,
    };
  });
}

/**
 * Release a previously-claimed slot.
 *
 * @param {{cwd: string, slot: string}} args
 * @returns {Promise<{ok: true, port: number, slot: string, project: string}>}
 */
export async function release({ cwd, slot }) {
  if (!slot || typeof slot !== 'string') {
    const e = new Error('release requires slot (string)');
    e.code = 'EARG';
    throw e;
  }
  const resolved = await detect(cwd);
  if (!resolved) {
    const e = new Error('cwd is not inside any registered project');
    e.code = 'ENOPROJECT';
    throw e;
  }

  return withRegistryLock(async () => {
    const reg = await loadRegistry();
    const project = reg.projects[resolved.project];
    const wtKey = findWorktreeForBucket(project, resolved.bucket);
    if (!wtKey) {
      const e = new Error('worktree row missing — registry corrupt');
      e.code = 'EWORKTREE';
      throw e;
    }
    const wt = project.worktrees[wtKey];
    if (!wt.claims || !wt.claims[slot]) {
      const e = new Error(`slot '${slot}' not claimed`);
      e.code = 'ENOSLOT';
      throw e;
    }
    const port = wt.claims[slot].port;
    await logEvent({ kind: 'release', project: resolved.project, slot, port });
    delete wt.claims[slot];
    await saveRegistry(reg);
    return { ok: true, port, slot, project: resolved.project };
  });
}
