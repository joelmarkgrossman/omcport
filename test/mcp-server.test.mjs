// test/mcp-server.test.mjs
//
// Spawns src/mcp-server.mjs as a child process, exchanges JSON-RPC frames
// over stdio (newline-delimited) and asserts the three tools work:
//   - omcport_here, omcport_claim, omcport_release
//
// Follows the spawn pattern from test/cli.test.mjs and stdin/stdout pattern
// from test/hook-pretool.test.mjs. Registry isolated via OMCPORT_DIR per test.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-mcp-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// JSON-RPC client over stdio. Each request gets a fresh id; we wait for the
// matching response. Newline-delimited JSON per the MCP stdio transport.
function startServer(env = {}) {
  const child = spawn(
    'node',
    [path.resolve('src/mcp-server.mjs')],
    {
      env: {
        ...process.env,
        OMCPORT_DIR: tmpDir,
        OMCPORT_PROJECT_ROOTS: tmpDir,
        ...env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  let buf = '';
  const pending = new Map(); // id -> {resolve, reject}
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        p.resolve(msg);
      }
    }
  });
  // Capture stderr but do not crash on it.
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  let nextId = 1;
  function rpc(method, params) {
    const id = nextId++;
    const frame = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(frame);
    });
  }

  function close() {
    return new Promise((resolve) => {
      child.on('close', () => resolve({ stderr }));
      child.stdin.end();
    });
  }

  return { rpc, close, child, get stderr() { return stderr; } };
}

async function initialize(server) {
  // Minimal MCP initialize handshake.
  return server.rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcp-test', version: '0.0.0' },
  });
}

describe('mcp-server: protocol surface', () => {
  it('responds to initialize and tools/list with three tools', async () => {
    const s = startServer();
    try {
      const init = await initialize(s);
      expect(init.result).toBeDefined();
      expect(init.result.serverInfo?.name).toMatch(/omcport/i);

      const list = await s.rpc('tools/list', {});
      expect(list.result).toBeDefined();
      const names = list.result.tools.map((t) => t.name).sort();
      expect(names).toEqual(['omcport_claim', 'omcport_here', 'omcport_release']);
    } finally {
      await s.close();
    }
  });
});

// Helper: parse the structured payload from a tools/call result.
// Prefers structuredContent (newer SDK) but falls back to JSON-encoded text.
function payload(result) {
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('no text content');
  return JSON.parse(text);
}

describe('mcp-server: omcport_here', () => {
  it('returns ports for a project at a given cwd', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const s = startServer();
    try {
      await initialize(s);
      const res = await s.rpc('tools/call', {
        name: 'omcport_here',
        arguments: { cwd: repo },
      });
      expect(res.result).toBeDefined();
      expect(res.result.isError).toBeFalsy();
      const data = payload(res.result);
      expect(data.project).toBe('lifeline');
      expect(data.bucket).toBe(0);
      expect(data.base).toBe(13000);
      expect(data.ports.web).toBe(13000);
      expect(data.ports.api).toBe(13001);
    } finally {
      await s.close();
    }
  });

  it('returns an MCP error when cwd is outside any project root', async () => {
    const s = startServer();
    try {
      await initialize(s);
      const res = await s.rpc('tools/call', {
        name: 'omcport_here',
        arguments: { cwd: os.tmpdir() },
      });
      expect(res.result).toBeDefined();
      expect(res.result.isError).toBe(true);
    } finally {
      await s.close();
    }
  });
});

describe('mcp-server: omcport_claim and omcport_release', () => {
  it('claims a port, updates registry, then releases it', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const s = startServer();
    try {
      await initialize(s);

      const c1 = await s.rpc('tools/call', {
        name: 'omcport_claim',
        arguments: { cwd: repo, slot: 'mock-stripe' },
      });
      expect(c1.result.isError).toBeFalsy();
      const d1 = payload(c1.result);
      expect(d1.slot).toBe('mock-stripe');
      expect(d1.port).toBeGreaterThanOrEqual(13000);
      expect(d1.port).toBeLessThanOrEqual(13007);

      // Re-claim same slot returns same port (idempotent).
      const c2 = await s.rpc('tools/call', {
        name: 'omcport_claim',
        arguments: { cwd: repo, slot: 'mock-stripe' },
      });
      expect(payload(c2.result).port).toBe(d1.port);

      // Claim a different slot gets a different port.
      const c3 = await s.rpc('tools/call', {
        name: 'omcport_claim',
        arguments: { cwd: repo, slot: 'mock-twilio' },
      });
      expect(payload(c3.result).port).not.toBe(d1.port);

      // Release frees the slot.
      const r1 = await s.rpc('tools/call', {
        name: 'omcport_release',
        arguments: { cwd: repo, slot: 'mock-stripe' },
      });
      expect(r1.result.isError).toBeFalsy();
      expect(payload(r1.result)).toEqual({ ok: true });

      // Re-claim after release returns the same port (offset reuse).
      const c4 = await s.rpc('tools/call', {
        name: 'omcport_claim',
        arguments: { cwd: repo, slot: 'mock-stripe' },
      });
      expect(payload(c4.result).port).toBe(d1.port);
    } finally {
      await s.close();
    }
  });

  it('returns an MCP error when releasing an unclaimed slot', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const s = startServer();
    try {
      await initialize(s);
      const res = await s.rpc('tools/call', {
        name: 'omcport_release',
        arguments: { cwd: repo, slot: 'never-claimed' },
      });
      expect(res.result).toBeDefined();
      expect(res.result.isError).toBe(true);
    } finally {
      await s.close();
    }
  });
});

describe('mcp-server: invalid input', () => {
  it('returns an MCP error (no crash) when omcport_claim is missing slot', async () => {
    const repo = path.join(tmpDir, 'lifeline');
    await fs.mkdir(path.join(repo, '.git'), { recursive: true });

    const s = startServer();
    try {
      await initialize(s);
      const res = await s.rpc('tools/call', {
        name: 'omcport_claim',
        arguments: { cwd: repo }, // no slot
      });
      // Either an MCP tool-result with isError or a JSON-RPC error: both are
      // acceptable "did not crash" outcomes. We require one of the two.
      const hadError =
        res.error !== undefined ||
        res.result?.isError === true;
      expect(hadError).toBe(true);

      // Server still alive: a follow-up call must succeed.
      const ping = await s.rpc('tools/list', {});
      expect(ping.result?.tools?.length).toBe(3);
    } finally {
      await s.close();
    }
  });
});
