// lib/detect.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

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
