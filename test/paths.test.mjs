import { describe, it, expect, beforeEach } from 'vitest';

describe('lib/paths', () => {
  beforeEach(() => { delete process.env.OMCPORT_DIR; });

  it('defaults to ~/.claude/omcport', async () => {
    const { OMCPORT_DIR, REGISTRY_PATH, LOG_PATH, LOCKFILE_PATH } =
      await import(/* @vite-ignore */ `../lib/paths.mjs?cache=${Date.now()}`);
    expect(OMCPORT_DIR).toMatch(/\/\.claude\/omcport$/);
    expect(REGISTRY_PATH).toMatch(/\/registry\.toml$/);
    expect(LOG_PATH).toMatch(/\/log\.jsonl$/);
    expect(LOCKFILE_PATH).toMatch(/\/lockfile$/);
  });

  it('honors OMCPORT_DIR env override', async () => {
    process.env.OMCPORT_DIR = '/tmp/omcport-test';
    const { OMCPORT_DIR, REGISTRY_PATH } =
      await import(/* @vite-ignore */ `../lib/paths.mjs?cache=${Date.now()}b`);
    expect(OMCPORT_DIR).toBe('/tmp/omcport-test');
    expect(REGISTRY_PATH).toBe('/tmp/omcport-test/registry.toml');
  });
});
