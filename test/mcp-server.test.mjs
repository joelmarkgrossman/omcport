// test/mcp-server.test.mjs
// Smoke + functional test: spawn bin/omcport-mcp, exchange JSON-RPC over stdio.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'omcport-mcp');

let tmpHome;
let tmpProject;
let tmpRoots;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'omcport-mcp-home-'));
  tmpRoots = fs.mkdtempSync(path.join(os.tmpdir(), 'omcport-mcp-roots-'));
  tmpProject = path.join(tmpRoots, 'demo');
  fs.mkdirSync(tmpProject);
  fs.mkdirSync(path.join(tmpProject, '.git')); // make it a "project"
});

afterEach(() => {
  for (const d of [tmpHome, tmpRoots]) fs.rmSync(d, { recursive: true, force: true });
});

function rpc(id, method, params) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
}

async function exchange(messages) {
  // Send messages sequentially: wait for each id's response before sending the
  // next request. Tool handlers run concurrently in the MCP SDK, so parallel
  // sends produce out-of-order completion under load.
  const env = {
    ...process.env,
    OMCPORT_DIR: tmpHome,
    OMCPORT_PROJECT_ROOTS: tmpRoots,
  };
  const child = spawn('node', [BIN], { env, stdio: ['pipe', 'pipe', 'pipe'] });

  let buf = '';
  let stderr = '';
  const lines = [];
  const pending = new Map(); // id -> { resolve }

  child.stdout.on('data', (b) => {
    buf += b.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const raw = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!raw) continue;
      const msg = JSON.parse(raw);
      lines.push(msg);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      }
    }
  });
  child.stderr.on('data', (b) => { stderr += b.toString(); });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    for (const { reject } of pending.values()) {
      reject(new Error(`timeout. stderr=${stderr} lines=${JSON.stringify(lines)}`));
    }
  }, 5000);

  function send(id, method, params) {
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(rpc(id, method, params));
    });
  }

  try {
    await send(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    for (const [id, method, params] of messages) {
      await send(id, method, params);
    }
  } finally {
    clearTimeout(timeout);
    child.stdin.end();
    await new Promise((r) => child.on('close', r));
  }

  return { lines, stderr };
}

describe('mcp-server', () => {
  it('responds to tools/list with three omcport tools', async () => {
    const { lines } = await exchange([[2, 'tools/list', {}]]);
    const listResp = lines.find((m) => m.id === 2);
    expect(listResp).toBeDefined();
    const names = listResp.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['omcport_claim', 'omcport_here', 'omcport_release']);
  });

  it('omcport_here returns project + ports for a known project', async () => {
    const { lines } = await exchange([
      [3, 'tools/call', { name: 'omcport_here', arguments: { cwd: tmpProject } }],
    ]);
    const resp = lines.find((m) => m.id === 3);
    expect(resp).toBeDefined();
    expect(resp.result.isError).toBeFalsy();
    const payload = JSON.parse(resp.result.content[0].text);
    expect(payload.project).toBe('demo');
    expect(typeof payload.base).toBe('number');
    expect(payload.bucket).toBe(0);
    expect(payload.ports.web).toBe(payload.base);
  });

  it('omcport_here returns an error for an unknown cwd', async () => {
    const { lines } = await exchange([
      [4, 'tools/call', { name: 'omcport_here', arguments: { cwd: '/nonexistent/path' } }],
    ]);
    const resp = lines.find((m) => m.id === 4);
    expect(resp.result.isError).toBe(true);
    expect(resp.result.content[0].text).toMatch(/no omcport project/);
  });

  it('omcport_claim returns a port and omcport_release frees it', async () => {
    const result = await exchange([
      [5, 'tools/call', { name: 'omcport_claim', arguments: { cwd: tmpProject, slot: 'mock' } }],
      [6, 'tools/call', { name: 'omcport_release', arguments: { cwd: tmpProject, slot: 'mock' } }],
    ]);
    const { lines, stderr } = result;
    const claimResp = lines.find((m) => m.id === 5);
    const releaseResp = lines.find((m) => m.id === 6);

    if (!claimResp || claimResp.result?.isError || !releaseResp || releaseResp.result?.isError) {
      throw new Error(
        `claim/release failed.\n` +
        `  claimResp: ${JSON.stringify(claimResp)}\n` +
        `  releaseResp: ${JSON.stringify(releaseResp)}\n` +
        `  stderr: ${stderr}\n` +
        `  all lines: ${JSON.stringify(lines)}`
      );
    }

    const claimed = JSON.parse(claimResp.result.content[0].text);
    expect(typeof claimed.port).toBe('number');
    expect(claimed.slot).toBe('mock');

    const released = JSON.parse(releaseResp.result.content[0].text);
    expect(released.ok).toBe(true);
  });
});
