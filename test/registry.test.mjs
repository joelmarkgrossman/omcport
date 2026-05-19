// test/registry.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-reg-'));
  process.env.OMCPORT_DIR = tmpDir;
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('lib/registry', () => {
  it('returns empty default when file missing', async () => {
    const { loadRegistry } = await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}`);
    const reg = await loadRegistry();
    expect(reg.meta.schema).toBe(1);
    expect(reg.meta.pool_start).toBe(13000);
    expect(reg.projects).toEqual({});
    expect(reg.slots.defaults.web).toBe(0);
  });

  it('round-trips a registry', async () => {
    const { loadRegistry, saveRegistry } = await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}b`);
    const reg = await loadRegistry();
    reg.projects.lifeline = {
      root: '~/dev/lifeline',
      base: 13000,
      worktrees: { lifeline: { path: '~/dev/lifeline', bucket: 0, first_seen: '2026-05-18' } },
    };
    await saveRegistry(reg);

    const reloaded = await (await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}c`)).loadRegistry();
    expect(reloaded.projects.lifeline.base).toBe(13000);
    expect(reloaded.projects.lifeline.worktrees.lifeline.bucket).toBe(0);
  });

  it('writes a backup on save when file pre-exists', async () => {
    const { loadRegistry, saveRegistry } = await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}d`);
    const reg = await loadRegistry();
    await saveRegistry(reg);
    reg.projects.foo = { root: '~/dev/foo', base: 13032, worktrees: {} };
    await saveRegistry(reg);

    const ok = await fs.access(path.join(tmpDir, 'registry.toml.bak')).then(() => true, () => false);
    expect(ok).toBe(true);
  });

  it('hostnameMatches returns true for current host, false for other', async () => {
    const { hostnameMatches, EMPTY_REGISTRY } = await import(/* @vite-ignore */ `../lib/registry.mjs?t=${Date.now()}e`);
    const reg = EMPTY_REGISTRY();
    expect(hostnameMatches(reg)).toBe(true);
    reg.meta.hostname = 'some-other-host';
    expect(hostnameMatches(reg)).toBe(false);
  });
});
