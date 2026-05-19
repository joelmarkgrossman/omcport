// lib/lsof.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const runFile = promisify(execFile);

export function parseLsofOutput(stdout) {
  const map = new Map();
  for (const line of stdout.split('\n')) {
    if (!line || line.startsWith('COMMAND')) continue;
    const cols = line.trim().split(/\s+/);
    if (cols.length < 9) continue;
    const command = cols[0];
    const pid = parseInt(cols[1], 10);
    const name = cols.slice(8).join(' ');
    const m = name.match(/:(\d+)\s*\(LISTEN\)/);
    if (!m) continue;
    map.set(parseInt(m[1], 10), { pid, command });
  }
  return map;
}

export async function listListeningPorts() {
  try {
    const { stdout } = await runFile('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeout: 2000 });
    return parseLsofOutput(stdout);
  } catch {
    return new Map();
  }
}
