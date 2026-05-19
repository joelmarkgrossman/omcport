import fs from 'node:fs/promises';
import os from 'node:os';
import TOML from '@iarna/toml';
import lockfile from 'proper-lockfile';
import { getPaths } from './paths.mjs';
import { POOL_START, POOL_END, STRIDE, WORKTREE_WINDOW } from './pool.mjs';

export const EMPTY_REGISTRY = () => ({
  meta: {
    schema: 1,
    hostname: os.hostname(),
    pool_start: POOL_START,
    pool_end: POOL_END,
    stride: STRIDE,
    worktree_window: WORKTREE_WINDOW,
    strict: false,
    denylist: [],
  },
  slots: {
    defaults: {
      web: 0, api: 1, storybook: 2, preview: 3,
      db: 4, worker: 5, docs: 6, admin: 7,
    },
  },
  projects: {},
});

export async function loadRegistry() {
  const { OMCPORT_DIR, REGISTRY_PATH } = getPaths();
  await fs.mkdir(OMCPORT_DIR, { recursive: true });
  let raw;
  try { raw = await fs.readFile(REGISTRY_PATH, 'utf8'); }
  catch (err) {
    if (err.code === 'ENOENT') return EMPTY_REGISTRY();
    throw err;
  }
  try { return mergeWithDefaults(TOML.parse(raw)); }
  catch (err) {
    const e = new Error(`registry parse error: ${err.message}`);
    e.code = 'EREGPARSE';
    throw e;
  }
}

function mergeWithDefaults(parsed) {
  const empty = EMPTY_REGISTRY();
  return {
    meta: { ...empty.meta, ...(parsed.meta ?? {}) },
    slots: { defaults: { ...empty.slots.defaults, ...(parsed.slots?.defaults ?? {}) } },
    projects: parsed.projects ?? {},
  };
}

export async function saveRegistry(reg) {
  const { OMCPORT_DIR, REGISTRY_PATH, BACKUP_PATH } = getPaths();
  await fs.mkdir(OMCPORT_DIR, { recursive: true });
  try { await fs.copyFile(REGISTRY_PATH, BACKUP_PATH); }
  catch (err) { if (err.code !== 'ENOENT') throw err; }
  const body = TOML.stringify(reg);
  await fs.writeFile(REGISTRY_PATH + '.tmp', body, 'utf8');
  await fs.rename(REGISTRY_PATH + '.tmp', REGISTRY_PATH);
}

export async function withRegistryLock(fn) {
  const { OMCPORT_DIR, LOCKFILE_PATH } = getPaths();
  await fs.mkdir(OMCPORT_DIR, { recursive: true });
  const release = await lockfile.lock(OMCPORT_DIR, {
    lockfilePath: LOCKFILE_PATH,
    stale: 5000,
    retries: { retries: 10, factor: 1.3, minTimeout: 30, maxTimeout: 500 },
  });
  try { return await fn(); }
  finally { await release(); }
}

export function hostnameMatches(reg) {
  return reg.meta.hostname === os.hostname();
}
