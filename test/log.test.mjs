import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omcport-log-'));
  process.env.OMCPORT_DIR = tmpDir;
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('lib/log', () => {
  it('appends one JSON line per event with timestamp', async () => {
    const { logEvent } = await import(/* @vite-ignore */ `../lib/log.mjs?t=${Date.now()}`);
    await logEvent({ kind: 'claim', project: 'lifeline', port: 13008 });
    await logEvent({ kind: 'release', project: 'lifeline', port: 13008 });

    const raw = await fs.readFile(path.join(tmpDir, 'log.jsonl'), 'utf8');
    const lines = raw.trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.kind).toBe('claim');
    expect(first.project).toBe('lifeline');
    expect(first.port).toBe(13008);
    expect(new Date(first.ts).toString()).not.toBe('Invalid Date');
  });

  it('creates log dir if missing', async () => {
    const { logEvent } = await import(/* @vite-ignore */ `../lib/log.mjs?t=${Date.now()}b`);
    await logEvent({ kind: 'block', project: 'x', port: 13000 });
    const ok = await fs.access(path.join(tmpDir, 'log.jsonl')).then(() => true, () => false);
    expect(ok).toBe(true);
  });
});
