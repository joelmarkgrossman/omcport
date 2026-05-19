// lib/detect.mjs
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadRegistry, saveRegistry, withRegistryLock } from './registry.mjs';
import { nextFreeBase, nextFreeBucket } from './allocate.mjs';
import { portFor } from './pool.mjs';

export async function resolveWorktreeRoot(cwd) {
  let dir;
  try { dir = await fs.realpath(cwd); }
  catch { return null; }

  while (true) {
    const dotgit = path.join(dir, '.git');
    let stat;
    try { stat = await fs.stat(dotgit); }
    catch { stat = null; }

    if (stat) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const HOME = os.homedir();

function projectRoots() {
  if (process.env.OMCPORT_PROJECT_ROOTS) {
    return process.env.OMCPORT_PROJECT_ROOTS.split(':').map(p => {
      const resolved = path.resolve(p);
      try { return fsSync.realpathSync(resolved); } catch { return resolved; }
    });
  }
  const devDir = path.join(HOME, 'dev');
  const imgaDir = path.join(HOME, 'imga-dev');
  return [devDir, imgaDir].map(p => { try { return fsSync.realpathSync(p); } catch { return p; } });
}

function expandTilde(p) {
  return p.startsWith('~') ? path.join(HOME, p.slice(1).replace(/^[/\\]/, '')) : p;
}

export function resolveProjectKey(gitroot, registry) {
  for (const root of projectRoots()) {
    if (gitroot === root) continue;
    if (gitroot.startsWith(root + path.sep)) {
      return gitroot.slice(root.length + 1).split(path.sep)[0];
    }
  }
  for (const [key, project] of Object.entries(registry.projects ?? {})) {
    for (const wt of Object.values(project.worktrees ?? {})) {
      const wpath = expandTilde(wt.path);
      if (gitroot === wpath || gitroot.startsWith(wpath + path.sep)) return key;
    }
  }
  return null;
}

export { expandTilde, projectRoots };

export async function detect(cwd) {
  const gitroot = await resolveWorktreeRoot(cwd);
  if (!gitroot) return null;

  let reg = await loadRegistry();
  let key = resolveProjectKey(gitroot, reg);
  if (key) {
    const project = reg.projects[key];
    if (project) {
      const wtKey = findWorktreeByPath(project, gitroot);
      if (wtKey !== null) return buildResult(reg, key, project, project.worktrees[wtKey].bucket);
    }
  }

  return withRegistryLock(async () => {
    reg = await loadRegistry();
    key = resolveProjectKey(gitroot, reg);

    let project;
    if (key) {
      project = reg.projects[key];
    }
    if (!project) {
      if (!key) key = pickKeyForUnregistered(gitroot);
      if (!key) return null;
      project = {
        root: tildeify(gitroot),
        base: nextFreeBase(reg),
        worktrees: {},
      };
      reg.projects[key] = project;
    }

    let wtKey = findWorktreeByPath(project, gitroot);
    if (wtKey === null) {
      const bucket = nextFreeBucket(project);
      wtKey = uniqueWorktreeLabel(project, path.basename(gitroot));
      project.worktrees[wtKey] = {
        path: tildeify(gitroot),
        bucket,
        first_seen: new Date().toISOString().slice(0, 10),
      };
    }

    await saveRegistry(reg);
    return buildResult(reg, key, project, project.worktrees[wtKey].bucket);
  });
}

function pickKeyForUnregistered(gitroot) {
  for (const root of projectRoots()) {
    if (gitroot.startsWith(root + path.sep)) {
      return gitroot.slice(root.length + 1).split(path.sep)[0];
    }
  }
  return null;
}

function findWorktreeByPath(project, gitroot) {
  for (const [k, wt] of Object.entries(project.worktrees ?? {})) {
    if (expandTilde(wt.path) === gitroot) return k;
  }
  return null;
}

function uniqueWorktreeLabel(project, base) {
  if (!project.worktrees[base]) return base;
  let i = 2;
  while (project.worktrees[`${base}-${i}`]) i++;
  return `${base}-${i}`;
}

function tildeify(p) {
  let resolved = p;
  try { resolved = fsSync.realpathSync(p); } catch { /* keep original if path not yet accessible */ }
  return resolved.startsWith(HOME) ? '~' + resolved.slice(HOME.length) : resolved;
}

function buildResult(reg, key, projectEntry, bucket) {
  const slotMap = projectEntry.slots ?? reg.slots.defaults;
  const ports = {};
  for (const [slot, offset] of Object.entries(slotMap)) {
    ports[slot] = portFor({ base: projectEntry.base, bucket, slotOffset: offset });
  }
  return {
    project: key,
    base: projectEntry.base,
    bucket,
    ports,
    slotMap,
    gitroot: expandTilde(projectEntry.root),
  };
}
