// test/integration/scan.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir, devRoot;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-scan-'));
  devRoot = path.join(tmpDir, 'fake-dev');
  await fs.mkdir(devRoot, { recursive: true });
  for (const name of ['alpha', 'beta', 'gamma']) {
    await fs.mkdir(path.join(devRoot, name, '.git'), { recursive: true });
  }
  await fs.mkdir(path.join(devRoot, 'not-a-repo'), { recursive: true });
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function run(args) {
  return new Promise((resolve) => {
    const child = spawn('node', [path.resolve('bin/omcport'), ...args], {
      env: { ...process.env, OMCPORT_DIR: tmpDir, OMCPORT_PROJECT_ROOTS: devRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.on('close', code => resolve({ code, stdout }));
  });
}

describe('omcport scan', () => {
  it('dry-run lists new projects without writing', async () => {
    const { stdout } = await run(['scan']);
    expect(stdout).toMatch(/alpha/);
    expect(stdout).toMatch(/beta/);
    expect(stdout).toMatch(/gamma/);
    expect(stdout).not.toMatch(/not-a-repo/);
    const ls = JSON.parse((await run(['ls', '--json'])).stdout);
    expect(Object.keys(ls.projects)).toEqual([]);
  });

  it('--yes writes assignments', async () => {
    await run(['scan', '--yes']);
    const ls = JSON.parse((await run(['ls', '--json'])).stdout);
    const names = Object.keys(ls.projects).sort();
    expect(names).toEqual(['alpha', 'beta', 'gamma']);
    const bases = Object.values(ls.projects).map(p => p.base).sort((a, b) => a - b);
    expect(bases).toEqual([13000, 13032, 13064]);
  });
});
