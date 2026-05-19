import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { render } from 'ink';
import { detect } from '../lib/detect.mjs';
import { loadRegistry, saveRegistry, withRegistryLock, hostnameMatches } from '../lib/registry.mjs';
import { portFor, WORKTREE_WINDOW, inPool, strideIntersectsDenylist } from '../lib/pool.mjs';
import { logEvent } from '../lib/log.mjs';
import { nextFreeBase } from '../lib/allocate.mjs';
import { getPaths } from '../lib/paths.mjs';
import App from './tui/App.jsx';

const SUBCOMMANDS = {
  here: cmdHere,
  ls: cmdLs,
  claim: cmdClaim,
  release: cmdRelease,
  free: cmdFree,
  scan: cmdScan,
  doctor: cmdDoctor,
  adopt: cmdAdopt,
  gc: cmdGc,
  tail: cmdTail,
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
  render(React.createElement(App));
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

async function cmdFree([name]) {
  if (!name) throw new Error('free requires a project name');
  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    if (!reg.projects[name]) throw new Error(`no project: ${name}`);
    delete reg.projects[name];
    await saveRegistry(reg);
    await logEvent({ kind: 'free', project: name });
  });
}

async function cmdScan(args) {
  const apply = args.includes('--yes');
  const roots = (process.env.OMCPORT_PROJECT_ROOTS
    ? process.env.OMCPORT_PROJECT_ROOTS.split(':')
    : [`${os.homedir()}/dev`, `${os.homedir()}/imga-dev`])
    .map(p => path.resolve(p));

  const candidates = [];
  for (const root of roots) {
    let entries;
    try { entries = await fs.readdir(root, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const repo = path.join(root, ent.name);
      const ok = await fs.stat(path.join(repo, '.git')).then(() => true, () => false);
      if (ok) candidates.push({ name: ent.name, path: repo });
    }
  }

  if (!apply) {
    console.log('Would add:');
    for (const c of candidates) console.log(`  ${c.name}  ${c.path}`);
    console.log(`\nRe-run with --yes to apply.`);
    return;
  }

  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    for (const c of candidates) {
      if (reg.projects[c.name]) continue;
      const base = nextFreeBase(reg);
      const tilde = c.path.startsWith(os.homedir())
        ? '~' + c.path.slice(os.homedir().length)
        : c.path;
      reg.projects[c.name] = {
        root: tilde,
        base,
        worktrees: {
          [c.name]: { path: tilde, bucket: 0, first_seen: new Date().toISOString().slice(0, 10) },
        },
      };
    }
    await saveRegistry(reg);
  });
  console.log(`scanned ${candidates.length} candidates`);
}

async function cmdDoctor() {
  const reg = await loadRegistry();
  const issues = [];

  if (!hostnameMatches(reg)) {
    issues.push(`hostname mismatch: registry=${reg.meta.hostname} machine=${os.hostname()}`);
  }
  const baseOwners = new Map();
  for (const [k, p] of Object.entries(reg.projects)) {
    baseOwners.set(p.base, (baseOwners.get(p.base) ?? []).concat(k));
    if (!inPool(p.base)) issues.push(`project ${k} base ${p.base} outside pool`);
    if (strideIntersectsDenylist(p.base, reg.meta.denylist ?? [])) {
      issues.push(`project ${k} base ${p.base} stride intersects denylist`);
    }
    for (const [wtKey, wt] of Object.entries(p.worktrees ?? {})) {
      const real = wt.path.startsWith('~')
        ? path.join(os.homedir(), wt.path.slice(1))
        : wt.path;
      const ok = await fs.stat(real).then(() => true, () => false);
      if (!ok) issues.push(`project ${k} worktree ${wtKey} path missing: ${wt.path}`);
    }
  }
  for (const [base, owners] of baseOwners) {
    if (owners.length > 1) issues.push(`duplicate base ${base}: ${owners.join(', ')}`);
  }

  if (issues.length === 0) { console.log('healthy'); return; }
  for (const i of issues) console.log(`- ${i}`);
  process.exit(2);
}

async function cmdAdopt() {
  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    reg.meta.hostname = os.hostname();
    await saveRegistry(reg);
  });
  console.log(`adopted as ${os.hostname()}`);
}

async function cmdGc() {
  let removed = 0;
  await withRegistryLock(async () => {
    const reg = await loadRegistry();
    for (const p of Object.values(reg.projects)) {
      for (const [wtKey, wt] of Object.entries(p.worktrees ?? {})) {
        const real = wt.path.startsWith('~')
          ? path.join(os.homedir(), wt.path.slice(1))
          : wt.path;
        const ok = await fs.stat(real).then(() => true, () => false);
        if (!ok) { delete p.worktrees[wtKey]; removed++; }
      }
    }
    await saveRegistry(reg);
  });
  console.log(`removed ${removed} stale worktree entries`);
}

async function cmdTail(args) {
  const { LOG_PATH } = getPaths();
  const n = parseInt(args[0] ?? '20', 10);
  let raw;
  try { raw = await fs.readFile(LOG_PATH, 'utf8'); }
  catch { console.log('(no log yet)'); return; }
  const lines = raw.trim().split('\n').slice(-n);
  for (const line of lines) console.log(line);
}
