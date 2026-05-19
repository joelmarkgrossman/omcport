// test/allocate.test.mjs
import { describe, it, expect } from 'vitest';
import { EMPTY_REGISTRY } from '../lib/registry.mjs';
import { nextFreeBase, nextFreeBucket } from '../lib/allocate.mjs';
import { MAX_BUCKET } from '../lib/pool.mjs';

describe('nextFreeBase', () => {
  it('returns POOL_START on empty registry', () => {
    expect(nextFreeBase(EMPTY_REGISTRY())).toBe(13000);
  });
  it('skips bases already taken', () => {
    const reg = EMPTY_REGISTRY();
    reg.projects.a = { base: 13000, root: '~/dev/a', worktrees: {} };
    reg.projects.b = { base: 13032, root: '~/dev/b', worktrees: {} };
    expect(nextFreeBase(reg)).toBe(13064);
  });
  it('skips bases whose stride intersects denylist', () => {
    const reg = EMPTY_REGISTRY();
    reg.meta.denylist = [13010];
    expect(nextFreeBase(reg)).toBe(13032);
  });
  it('throws on pool exhaustion', () => {
    const reg = EMPTY_REGISTRY();
    let i = 0;
    for (let b = 13000; b + 31 <= 17999; b += 32) {
      reg.projects[`p${i++}`] = { base: b, root: `~/dev/p${i}`, worktrees: {} };
    }
    expect(() => nextFreeBase(reg)).toThrow(/pool exhausted/);
  });
});

describe('nextFreeBucket', () => {
  it('returns 0 for new project', () => {
    expect(nextFreeBucket({ base: 13000, worktrees: {} })).toBe(0);
  });
  it('returns lowest free bucket (fills holes)', () => {
    const project = { base: 13000, worktrees: { a: { bucket: 0 }, c: { bucket: 2 } } };
    expect(nextFreeBucket(project)).toBe(1);
  });
  it('throws when window exhausted', () => {
    const project = {
      base: 13000,
      worktrees: { a:{bucket:0}, b:{bucket:1}, c:{bucket:2}, d:{bucket:3} },
    };
    expect(() => nextFreeBucket(project)).toThrow(/window exhausted/);
  });
});
