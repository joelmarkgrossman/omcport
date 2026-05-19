import { detect } from '../lib/detect.mjs';
import { loadRegistry } from '../lib/registry.mjs';

const SUBCOMMANDS = {
  here: cmdHere,
  ls: cmdLs,
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
