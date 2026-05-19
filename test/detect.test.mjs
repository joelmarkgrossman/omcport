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

describe('resolveProjectKey', () => {
  const HOME = os.homedir();

  it('fast path: ~/dev/<name>', async () => {
    const { resolveProjectKey } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}d`);
    const reg = { projects: {} };
    expect(resolveProjectKey(`${HOME}/dev/lifeline`, reg)).toBe('lifeline');
    expect(resolveProjectKey(`${HOME}/dev/lifeline/src/deep`, reg)).toBe('lifeline');
  });

  it('fast path: ~/imga-dev/<name>', async () => {
    const { resolveProjectKey } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}e`);
    expect(resolveProjectKey(`${HOME}/imga-dev/teamworks-schedulerator`, { projects: {} }))
      .toBe('teamworks-schedulerator');
  });

  it('registry-based path: matches existing worktree path', async () => {
    const { resolveProjectKey } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}f`);
    const reg = {
      projects: {
        odd: {
          root: '/tmp/odd-repo',
          worktrees: { odd: { path: '/tmp/odd-repo', bucket: 0 } },
        },
      },
    };
    expect(resolveProjectKey('/tmp/odd-repo', reg)).toBe('odd');
    expect(resolveProjectKey('/tmp/odd-repo/lib', reg)).toBe('odd');
  });

  it('returns null when no match', async () => {
    const { resolveProjectKey } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}g`);
    expect(resolveProjectKey('/some/random/path', { projects: {} })).toBeNull();
  });
});

describe('detect (top-level)', () => {
  let detTmpDir;
  beforeEach(async () => {
    detTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-det-int-'));
    process.env.OMCPORT_DIR = detTmpDir;
    process.env.OMCPORT_PROJECT_ROOTS = detTmpDir;
  });
  afterEach(async () => {
    await fs.rm(detTmpDir, { recursive: true, force: true });
  });

  it('auto-creates project + bucket 0 on first call', async () => {
    const repo = path.join(detTmpDir, 'fake-project');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const { detect } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}h`);
    const result = await detect(repo);
    expect(result.project).toBe('fake-project');
    expect(result.bucket).toBe(0);
    expect(result.ports.web).toBe(result.base);
    expect(result.ports.api).toBe(result.base + 1);

    const { loadRegistry } = await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}i`);
    const reg = await loadRegistry();
    expect(reg.projects['fake-project'].base).toBe(result.base);
  });

  it('returns null for cwd outside any project root', async () => {
    const { detect } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}j`);
    expect(await detect(os.tmpdir())).toBeNull();
  });

  it('persists bucket assignment across calls', async () => {
    const repo = path.join(detTmpDir, 'persistent');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const { detect } = await import(/* @vite-ignore */ `../lib/detect.mjs?t=${Date.now()}k`);
    const a = await detect(repo);
    const b = await detect(repo);
    expect(b.bucket).toBe(a.bucket);
    expect(b.ports).toEqual(a.ports);
  });
});
