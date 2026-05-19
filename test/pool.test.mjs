import { describe, it, expect } from 'vitest';
import {
  POOL_START, POOL_END, STRIDE, WORKTREE_WINDOW, MAX_BUCKET,
  portFor, inPool, projectBaseRange, basesInPool,
  strideIntersectsDenylist,
} from '../lib/pool.mjs';

describe('lib/pool constants', () => {
  it('uses canonical pool', () => {
    expect(POOL_START).toBe(13000);
    expect(POOL_END).toBe(17999);
    expect(STRIDE).toBe(32);
    expect(WORKTREE_WINDOW).toBe(8);
    expect(MAX_BUCKET).toBe(4);
  });
});

describe('portFor', () => {
  it('computes lifeline bucket 1 api', () => {
    expect(portFor({ base: 13000, bucket: 1, slotOffset: 1 })).toBe(13009);
  });
  it('rejects invalid bucket', () => {
    expect(() => portFor({ base: 13000, bucket: 4, slotOffset: 0 })).toThrow(/bucket/);
  });
  it('rejects invalid slotOffset', () => {
    expect(() => portFor({ base: 13000, bucket: 0, slotOffset: 8 })).toThrow(/slot/);
  });
});

describe('inPool / projectBaseRange', () => {
  it('detects pool membership', () => {
    expect(inPool(13000)).toBe(true);
    expect(inPool(17999)).toBe(true);
    expect(inPool(12999)).toBe(false);
    expect(inPool(18000)).toBe(false);
  });
  it('returns full stride range', () => {
    expect(projectBaseRange(13000)).toEqual({ start: 13000, end: 13031 });
  });
});

describe('basesInPool', () => {
  it('enumerates aligned bases inside the pool', () => {
    const bases = [...basesInPool()];
    expect(bases[0]).toBe(13000);
    expect(bases.at(-1)).toBe(17960);
    expect(bases.length).toBe(156);
  });
});

describe('strideIntersectsDenylist', () => {
  it('detects intersection', () => {
    expect(strideIntersectsDenylist(13000, [13010])).toBe(true);
    expect(strideIntersectsDenylist(13000, [13032])).toBe(false);
    expect(strideIntersectsDenylist(13000, [])).toBe(false);
  });
});
