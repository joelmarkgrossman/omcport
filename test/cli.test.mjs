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

describe('omcport ls', () => {
  it('lists projects as a table', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    await run(['here'], { cwd: repo });
    const { code, stdout } = await run(['ls']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/PROJECT/);
    expect(stdout).toMatch(/lifeline/);
    expect(stdout).toMatch(/13000/);
  });

  it('emits JSON with --json', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    await run(['here'], { cwd: repo });
    const { stdout } = await run(['ls', '--json']);
    const data = JSON.parse(stdout);
    expect(data.projects.lifeline.base).toBe(13000);
  });
});

describe('omcport free', () => {
  it('removes a project from the registry', async () => {
    const repo = path.join(tmpDir, 'doomed');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    await run(['here'], { cwd: repo });
    const before = JSON.parse((await run(['ls', '--json'])).stdout);
    expect(before.projects.doomed).toBeDefined();

    const f = await run(['free', 'doomed']);
    expect(f.code).toBe(0);

    const after = JSON.parse((await run(['ls', '--json'])).stdout);
    expect(after.projects.doomed).toBeUndefined();
  });
});

describe('omcport claim / release', () => {
  it('claim returns a port, release frees it, re-claim reuses', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const c1 = await run(['claim', '--slot', 'mock-stripe'], { cwd: repo });
    expect(c1.code).toBe(0);
    const port1 = parseInt(c1.stdout.trim(), 10);
    expect(port1).toBeGreaterThanOrEqual(13000);
    expect(port1).toBeLessThanOrEqual(13007);

    const c2 = await run(['claim', '--slot', 'mock-stripe'], { cwd: repo });
    expect(parseInt(c2.stdout.trim(), 10)).toBe(port1);

    const c3 = await run(['claim', '--slot', 'mock-twilio'], { cwd: repo });
    const port3 = parseInt(c3.stdout.trim(), 10);
    expect(port3).not.toBe(port1);

    const rel = await run(['release', '--slot', 'mock-stripe'], { cwd: repo });
    expect(rel.code).toBe(0);

    const c4 = await run(['claim', '--slot', 'mock-stripe'], { cwd: repo });
    expect(parseInt(c4.stdout.trim(), 10)).toBe(port1);
  });
});
