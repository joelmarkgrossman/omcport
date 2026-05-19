// lib/detect.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

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
    return process.env.OMCPORT_PROJECT_ROOTS.split(':').map(p => path.resolve(p));
  }
  return [path.join(HOME, 'dev'), path.join(HOME, 'imga-dev')];
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
