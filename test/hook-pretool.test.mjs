// test/hook-pretool.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-hook-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function runHook(payload, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [path.resolve('hooks/pre-tool-use.mjs')],
      {
        env: {
          ...process.env,
          OMCPORT_DIR: tmpDir,
          OMCPORT_PROJECT_ROOTS: tmpDir,
          ...env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    let stdout = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.on('close', (code) => resolve({ code, stdout }));
    child.stdin.end(JSON.stringify(payload));
  });
}

describe('hooks/pre-tool-use env-context injection', () => {
  it('returns additionalContext naming PORT for a Bash command in a project', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const res = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'npm run dev' },
      cwd: repo,
    });
    expect(res.code).toBe(0);
    const reply = JSON.parse(res.stdout);
    const ctx = reply.hookSpecificOutput?.additionalContext ?? reply.additionalContext ?? '';
    expect(ctx).toMatch(/omcport: lifeline bucket 0/);
    expect(ctx).toMatch(/PORT=13000/);
  });

  it('no-ops silently for cwd outside any project root', async () => {
    const res = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'echo hi' },
      cwd: os.tmpdir(),
    });
    expect(JSON.parse(res.stdout || '{}')).toEqual({});
  });

  it('no-ops when tool is not Bash', async () => {
    const res = await runHook({
      tool_name: 'Read',
      tool_input: { file_path: '/foo' },
      cwd: tmpDir,
    });
    expect(JSON.parse(res.stdout || '{}')).toEqual({});
  });

  it('no-ops when OMCPORT_DISABLE=1', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const res = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'npm run dev' }, cwd: repo },
      { OMCPORT_DISABLE: '1' }
    );
    expect(JSON.parse(res.stdout || '{}')).toEqual({});
  });

  it('no-ops when OMCPORT_CLAIM=1', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const res = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'npm run dev' }, cwd: repo },
      { OMCPORT_CLAIM: '1' }
    );
    expect(JSON.parse(res.stdout || '{}')).toEqual({});
  });

  it('no-ops when detect throws (OMCPORT_DIR is a file, not a dir)', async () => {
    const badOmcDir = path.join(tmpDir, 'not-a-dir');
    await fs.writeFile(badOmcDir, 'x');
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const res = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'npm run dev' }, cwd: repo },
      { OMCPORT_DIR: badOmcDir }
    );
    expect(JSON.parse(res.stdout || '{}')).toEqual({});
  });
});

describe('hooks/pre-tool-use port-flag enforcement', () => {
  it('blocks port belonging to a different project', async () => {
    const repoA = path.join(tmpDir, 'a');
    const repoB = path.join(tmpDir, 'b');
    await fs.mkdir(path.join(repoA, '.git'), { recursive: true });
    await fs.mkdir(path.join(repoB, '.git'), { recursive: true });
    await runHook({ tool_name: 'Bash', tool_input: { command: 'pwd' }, cwd: repoA });
    await runHook({ tool_name: 'Bash', tool_input: { command: 'pwd' }, cwd: repoB });

    const res = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'vite --port 13032' },
      cwd: repoA,
    });
    const reply = JSON.parse(res.stdout || '{}');
    const decision = reply.hookSpecificOutput?.permissionDecision ?? reply.permissionDecision;
    expect(decision).toBe('deny');
    const reason = reply.hookSpecificOutput?.permissionDecisionReason ?? reply.permissionDecisionReason ?? '';
    expect(reason).toMatch(/belongs to b/);
    expect(reason).toMatch(/Suggested:/);
  });

  it('emits rewrite suggestion for known dev-default port', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const res = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'vite --port 5173' },
      cwd: repo,
    });
    const reply = JSON.parse(res.stdout || '{}');
    const ctx = reply.hookSpecificOutput?.additionalContext ?? reply.additionalContext ?? '';
    expect(ctx).toMatch(/rewrite.*5173.*13000/i);
  });

  it('allows when port matches an assigned port', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });
    const res = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'vite --port 13000' },
      cwd: repo,
    });
    const reply = JSON.parse(res.stdout || '{}');
    expect(reply.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });
});
