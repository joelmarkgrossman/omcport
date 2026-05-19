import { detect } from '../lib/detect.mjs';
import { loadRegistry, saveRegistry, withRegistryLock } from '../lib/registry.mjs';
import { portFor, WORKTREE_WINDOW } from '../lib/pool.mjs';
import { logEvent } from '../lib/log.mjs';

const SUBCOMMANDS = {
  here: cmdHere,
  ls: cmdLs,
  claim: cmdClaim,
  release: cmdRelease,
};

export async function main(argv) {
  const [sub, ...rest] = argv;
  const fn = SUBCOMMANDS[sub] ?? cmdDefault;
  try { await fn(rest); }
  catch (err) { console.error(err.message); process.exit(1); }
}

async function cmdHere() {
  const resolved = await detect(process.cwd());
  if (!resolved) { console.log('no project at cwd'); return; }
  const portStr = Object.entries(resolved.ports).map(([s, p]) => `${s}=${p}`).join(' ');
  console.log(`${resolved.project} bucket ${resolved.bucket} → ${portStr}`);
}

async function cmdLs(args) {
  const reg = await loadRegistry();
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(reg, null, 2) + '\n');
    return;
  }
  const rows = [['PROJECT', 'BASE', 'BUCKETS']];
  for (const [key, p] of Object.entries(reg.projects).sort((a, b) => a[1].base - b[1].base)) {
    const buckets = Object.entries(p.worktrees ?? {})
      .sort((a, b) => a[1].bucket - b[1].bucket)
      .map(([label, wt]) => `${wt.bucket}:${label}`)
      .join(', ');
    rows.push([key, String(p.base), buckets || '(none)']);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
  for (const row of rows) {
    console.log(row.map((c, i) => c.padEnd(widths[i])).join('  '));
  }
}

async function cmdDefault() {
  console.log('usage: omcport <here|ls|claim|release|free|scan|doctor|adopt|gc|tail>');
}

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { out[args[i].slice(2)] = args[i + 1]; i++; }
  }
  return out;
}

function findWorktreeForBucket(project, bucket) {
  for (const [k, wt] of Object.entries(project.worktrees ?? {})) {
    if (wt.bucket === bucket) return k;
  }
  return null;
}

async function cmdClaim(args) {
  const { slot, pid, label } = parseFlags(args);
  if (!slot) throw new Error('claim requires --slot NAME');
  const resolved = await detect(process.cwd());
  if (!resolved) throw new Error('cwd is not inside any registered project');

  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    const project = reg.projects[resolved.project];
    const wtKey = findWorktreeForBucket(project, resolved.bucket);
    if (!wtKey) throw new Error('worktree row missing — registry corrupt');
    const wt = project.worktrees[wtKey];
    wt.claims = wt.claims ?? {};

    if (wt.claims[slot]) {
      console.log(wt.claims[slot].port);
      return;
    }
    const reservedOffsets = new Set(
      Object.values(wt.claims).map(c => c.offset),
    );
    let chosen = null;
    for (let off = 0; off < WORKTREE_WINDOW; off++) {
      if (!reservedOffsets.has(off)) { chosen = off; break; }
    }
    if (chosen === null) {
      throw new Error(`window exhausted for ${resolved.project} bucket ${resolved.bucket}`);
    }
    const port = portFor({ base: project.base, bucket: resolved.bucket, slotOffset: chosen });
    wt.claims[slot] = { offset: chosen, port, pid: pid ? parseInt(pid, 10) : null, label: label ?? null };
    await saveRegistry(reg);
    await logEvent({ kind: 'claim', project: resolved.project, slot, port });
    console.log(port);
  });
}

async function cmdRelease(args) {
  const { slot } = parseFlags(args);
  if (!slot) throw new Error('release requires --slot NAME');
  const resolved = await detect(process.cwd());
  if (!resolved) throw new Error('cwd is not inside any registered project');

  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    const project = reg.projects[resolved.project];
    const wtKey = findWorktreeForBucket(project, resolved.bucket);
    if (!wtKey) throw new Error('worktree row missing — registry corrupt');
    const wt = project.worktrees[wtKey];
    if (!wt.claims || !wt.claims[slot]) {
      throw new Error(`slot '${slot}' not claimed`);
    }
    await logEvent({ kind: 'release', project: resolved.project, slot, port: wt.claims[slot].port });
    delete wt.claims[slot];
    await saveRegistry(reg);
  });
}
