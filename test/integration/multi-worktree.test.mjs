// test/integration/multi-worktree.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-mw-'));
  process.env.OMCPORT_DIR = tmpDir;
  process.env.OMCPORT_PROJECT_ROOTS = tmpDir;
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('multi-worktree determinism', () => {
  it('two checkouts get distinct ports, deterministic across calls', async () => {
    const primary = path.join(tmpDir, 'proj');
    await fs.mkdir(path.join(primary, '.git'), { recursive: true });
    const feat = path.join(tmpDir, 'proj-feat-auth');
    await fs.mkdir(feat, { recursive: true });
    await fs.writeFile(path.join(feat, '.git'), `gitdir: ${primary}/.git/worktrees/feat-auth\n`);

    const { detect } = await import(/* @vite-ignore */ `../../lib/detect.mjs?t=${Date.now()}`);
    const a1 = await detect(primary);
    const b1 = await detect(feat);
    expect(a1.ports.web).not.toBe(b1.ports.web);

    const a2 = await detect(primary);
    const b2 = await detect(feat);
    expect(a2.bucket).toBe(a1.bucket);
    expect(b2.bucket).toBe(b1.bucket);
    expect(a2.ports).toEqual(a1.ports);
    expect(b2.ports).toEqual(b1.ports);
  });

  it('detect propagates registry parse errors to caller (hooks wrap in try/catch)', async () => {
    const repo = path.join(tmpDir, 'p');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const { detect } = await import(/* @vite-ignore */ `../../lib/detect.mjs?t=${Date.now()}b`);
    await detect(repo);
    await fs.writeFile(path.join(tmpDir, 'registry.toml'), 'NOT_VALID_TOML[[[');
    await expect(detect(repo)).rejects.toThrow();
  });
});
