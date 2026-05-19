import { describe, it, expect, beforeEach } from 'vitest';
import { getPaths } from '../lib/paths.mjs';

describe('lib/paths.getPaths', () => {
  beforeEach(() => { delete process.env.OMCPORT_DIR; });

  it('defaults to ~/.claude/omcport', () => {
    const { OMCPORT_DIR, REGISTRY_PATH, LOG_PATH, LOCKFILE_PATH, BACKUP_PATH } = getPaths();
    expect(OMCPORT_DIR).toMatch(/\/\.claude\/omcport$/);
    expect(REGISTRY_PATH).toMatch(/\/registry\.toml$/);
    expect(BACKUP_PATH).toMatch(/\/registry\.toml\.bak$/);
    expect(LOG_PATH).toMatch(/\/log\.jsonl$/);
    expect(LOCKFILE_PATH).toMatch(/\/lockfile$/);
  });

  it('honors OMCPORT_DIR env override at call time', () => {
    process.env.OMCPORT_DIR = '/tmp/omcport-test';
    const { OMCPORT_DIR, REGISTRY_PATH } = getPaths();
    expect(OMCPORT_DIR).toBe('/tmp/omcport-test');
    expect(REGISTRY_PATH).toBe('/tmp/omcport-test/registry.toml');
  });

  it('re-resolves on every call (no frozen state)', () => {
    process.env.OMCPORT_DIR = '/tmp/a';
    expect(getPaths().OMCPORT_DIR).toBe('/tmp/a');
    process.env.OMCPORT_DIR = '/tmp/b';
    expect(getPaths().OMCPORT_DIR).toBe('/tmp/b');
  });
});
