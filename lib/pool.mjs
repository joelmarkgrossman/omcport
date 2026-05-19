export const POOL_START = 13000;
export const POOL_END   = 17999;
export const STRIDE = 32;
export const WORKTREE_WINDOW = 8;
export const MAX_BUCKET = Math.floor(STRIDE / WORKTREE_WINDOW);

export function portFor({ base, bucket, slotOffset }) {
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= MAX_BUCKET) {
    throw new RangeError(`bucket out of range: ${bucket} (0..${MAX_BUCKET - 1})`);
  }
  if (!Number.isInteger(slotOffset) || slotOffset < 0 || slotOffset >= WORKTREE_WINDOW) {
    throw new RangeError(`slotOffset out of range: ${slotOffset} (0..${WORKTREE_WINDOW - 1})`);
  }
  return base + bucket * WORKTREE_WINDOW + slotOffset;
}

export function inPool(port) {
  return port >= POOL_START && port <= POOL_END;
}

export function projectBaseRange(base) {
  return { start: base, end: base + STRIDE - 1 };
}

export function* basesInPool() {
  for (let b = POOL_START; b + STRIDE - 1 <= POOL_END; b += STRIDE) {
    yield b;
  }
}

export function strideIntersectsDenylist(base, denylist) {
  const { start, end } = projectBaseRange(base);
  return denylist.some(p => p >= start && p <= end);
}
