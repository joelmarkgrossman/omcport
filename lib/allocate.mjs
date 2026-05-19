// lib/allocate.mjs
import { basesInPool, MAX_BUCKET, strideIntersectsDenylist } from './pool.mjs';

export function nextFreeBase(reg) {
  const taken = new Set(Object.values(reg.projects).map(p => p.base));
  const denylist = reg.meta.denylist ?? [];
  for (const b of basesInPool()) {
    if (taken.has(b)) continue;
    if (strideIntersectsDenylist(b, denylist)) continue;
    return b;
  }
  throw new Error('pool exhausted: expand meta.pool_end or free a project base');
}

export function nextFreeBucket(project) {
  const used = new Set(Object.values(project.worktrees ?? {}).map(w => w.bucket));
  for (let b = 0; b < MAX_BUCKET; b++) {
    if (!used.has(b)) return b;
  }
  throw new Error(`window exhausted: project at base ${project.base} has 4 worktrees`);
}
