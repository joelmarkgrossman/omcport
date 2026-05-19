import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function resolvePaths() {
  const dir = process.env.OMCPORT_DIR ?? path.join(os.homedir(), '.claude', 'omcport');
  return { dir, logPath: path.join(dir, 'log.jsonl') };
}

export async function logEvent(event) {
  const { dir, logPath } = resolvePaths();
  await fs.mkdir(dir, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  await fs.appendFile(logPath, line, 'utf8');
}
