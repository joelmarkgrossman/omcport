import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpDir;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omcport-fpt-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function imp() {
  // cache-bust so each test gets a fresh module
  return import(/* @vite-ignore */ `../lib/fixed-port-tools.mjs?t=${Date.now()}`);
}

// ── loadFixedPortTools ────────────────────────────────────────────────────────

describe('loadFixedPortTools', () => {
  it('returns [] for missing file', async () => {
    const { loadFixedPortTools } = await imp();
    expect(loadFixedPortTools('/nonexistent/path.json')).toEqual([]);
  });

  it('returns [] for invalid JSON', async () => {
    const { loadFixedPortTools } = await imp();
    const p = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(p, '{ not json }');
    expect(loadFixedPortTools(p)).toEqual([]);
  });

  it('returns [] when JSON is not an array', async () => {
    const { loadFixedPortTools } = await imp();
    const p = path.join(tmpDir, 'obj.json');
    fs.writeFileSync(p, '{"cmd":"foo"}');
    expect(loadFixedPortTools(p)).toEqual([]);
  });

  it('returns array of tools from valid file', async () => {
    const { loadFixedPortTools } = await imp();
    const tools = [{ cmd: 'backlog browser', name: 'backlog.md', config: 'backlog/config.yml', portKey: 'default_port' }];
    const p = path.join(tmpDir, 'tools.json');
    fs.writeFileSync(p, JSON.stringify(tools));
    expect(loadFixedPortTools(p)).toEqual(tools);
  });
});

// ── matchFixedPortTool ────────────────────────────────────────────────────────

describe('matchFixedPortTool', () => {
  it('returns null when no tools', async () => {
    const { matchFixedPortTool } = await imp();
    expect(matchFixedPortTool([], 'backlog browser')).toBeNull();
  });

  it('returns null when no match', async () => {
    const { matchFixedPortTool } = await imp();
    const tools = [{ cmd: 'backlog browser', name: 'backlog.md' }];
    expect(matchFixedPortTool(tools, 'npm run dev')).toBeNull();
  });

  it('matches substring in command', async () => {
    const { matchFixedPortTool } = await imp();
    const tool = { cmd: 'backlog browser', name: 'backlog.md' };
    expect(matchFixedPortTool([tool], 'backlog browser')).toBe(tool);
    expect(matchFixedPortTool([tool], 'npx backlog browser --open')).toBe(tool);
  });

  it('returns first match when multiple tools defined', async () => {
    const { matchFixedPortTool } = await imp();
    const t1 = { cmd: 'mailhog', name: 'MailHog' };
    const t2 = { cmd: 'backlog browser', name: 'backlog.md' };
    expect(matchFixedPortTool([t1, t2], 'backlog browser')).toBe(t2);
    expect(matchFixedPortTool([t1, t2], 'mailhog')).toBe(t1);
  });
});

// ── resolveFixedPort ──────────────────────────────────────────────────────────

describe('resolveFixedPort', () => {
  it('returns static port directly', async () => {
    const { resolveFixedPort } = await imp();
    expect(resolveFixedPort({ cmd: 'mailhog', port: 8025, name: 'MailHog' }, tmpDir)).toBe(8025);
  });

  it('returns null when no port and no config', async () => {
    const { resolveFixedPort } = await imp();
    expect(resolveFixedPort({ cmd: 'foo', name: 'foo' }, tmpDir)).toBeNull();
  });

  it('returns null when config file missing', async () => {
    const { resolveFixedPort } = await imp();
    const tool = { cmd: 'backlog browser', name: 'backlog.md', config: 'backlog/config.yml', portKey: 'default_port' };
    expect(resolveFixedPort(tool, tmpDir)).toBeNull();
  });

  it('reads port from YAML config', async () => {
    const { resolveFixedPort } = await imp();
    fs.mkdirSync(path.join(tmpDir, 'backlog'));
    fs.writeFileSync(path.join(tmpDir, 'backlog', 'config.yml'), [
      'project_name: "test-proj"',
      'default_port: 50000',
      'auto_open_browser: true',
    ].join('\n'));
    const tool = { cmd: 'backlog browser', name: 'backlog.md', config: 'backlog/config.yml', portKey: 'default_port' };
    expect(resolveFixedPort(tool, tmpDir)).toBe(50000);
  });

  it('reads port from JSON config (dot-notation key)', async () => {
    const { resolveFixedPort } = await imp();
    fs.writeFileSync(path.join(tmpDir, 'app.json'), JSON.stringify({ server: { port: 9000 } }));
    const tool = { cmd: 'myapp start', name: 'myapp', config: 'app.json', portKey: 'server.port' };
    expect(resolveFixedPort(tool, tmpDir)).toBe(9000);
  });

  it('returns null for JSON config with missing key', async () => {
    const { resolveFixedPort } = await imp();
    fs.writeFileSync(path.join(tmpDir, 'app.json'), JSON.stringify({ other: 123 }));
    const tool = { cmd: 'myapp start', name: 'myapp', config: 'app.json', portKey: 'server.port' };
    expect(resolveFixedPort(tool, tmpDir)).toBeNull();
  });
});
