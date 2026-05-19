import { detect } from '../lib/detect.mjs';

const SUBCOMMANDS = {
  here: cmdHere,
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

async function cmdDefault() {
  console.log('usage: omcport <here|ls|claim|release|free|scan|doctor|adopt|gc|tail>');
}
