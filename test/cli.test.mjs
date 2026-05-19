import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-cli-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function run(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [path.resolve('bin/omcport'), ...args],
      {
        env: { ...process.env, OMCPORT_DIR: tmpDir, OMCPORT_PROJECT_ROOTS: tmpDir },
        cwd: opts.cwd ?? process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

describe('omcport here', () => {
  it('prints a one-line summary for cwd inside a project', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const { code, stdout } = await run(['here'], { cwd: repo });
    expect(code).toBe(0);
    expect(stdout).toMatch(/lifeline.*bucket 0.*web=13000/);
  });

  it('prints "no project" when cwd is outside known roots', async () => {
    const { code, stdout } = await run(['here'], { cwd: os.tmpdir() });
    expect(code).toBe(0);
    expect(stdout).toMatch(/no project/i);
  });
});
