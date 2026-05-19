// test/detect.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-det-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('resolveWorktreeRoot', () => {
  it('returns null when no .git found walking up', async () => {
    const { resolveWorktreeRoot } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}`);
    expect(await resolveWorktreeRoot(tmpDir)).toBeNull();
  });

  it('finds .git directory ancestor', async () => {
    const repo = path.join(tmpDir, 'repo');
    const sub  = path.join(repo, 'src', 'nested');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    await fs.mkdir(sub, { recursive: true });
    const { resolveWorktreeRoot } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}a`);
    expect(await resolveWorktreeRoot(sub)).toBe(await fs.realpath(repo));
  });

  it('treats .git file (worktree pointer) as worktree root', async () => {
    const wt = path.join(tmpDir, 'worktree');
    const sub = path.join(wt, 'src');
    await fs.mkdir(sub, { recursive: true });
    await fs.writeFile(path.join(wt, '.git'), 'gitdir: /elsewhere/.git/worktrees/wt\n');
    const { resolveWorktreeRoot } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}b`);
    expect(await resolveWorktreeRoot(sub)).toBe(await fs.realpath(wt));
  });

  it('canonicalizes symlinked paths', async () => {
    const real = path.join(tmpDir, 'real-repo');
    const link = path.join(tmpDir, 'linked-repo');
    await fs.mkdir(path.join(real, '.git'), { recursive: true });
    await fs.symlink(real, link);
    const { resolveWorktreeRoot } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}c`);
    expect(await resolveWorktreeRoot(link)).toBe(await fs.realpath(real));
  });
});
