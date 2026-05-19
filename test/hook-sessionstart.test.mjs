import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-sst-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function run(payload, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [path.resolve('hooks/session-start.mjs')], {
      env: { ...process.env, OMCPORT_DIR: tmpDir, OMCPORT_PROJECT_ROOTS: tmpDir, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.on('close', () => resolve({ stdout }));
    child.stdin.end(JSON.stringify(payload));
  });
}

describe('hooks/session-start', () => {
  it('emits additionalContext naming the project ports', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const { stdout } = await run({ cwd: repo });
    const reply = JSON.parse(stdout || '{}');
    const ctx = reply.hookSpecificOutput?.additionalContext ?? reply.additionalContext ?? '';
    expect(ctx).toMatch(/omcport: lifeline/);
    expect(ctx).toMatch(/web=13000/);
  });

  it('no-ops outside any project', async () => {
    const { stdout } = await run({ cwd: os.tmpdir() });
    expect(JSON.parse(stdout || '{}')).toEqual({});
  });
});
