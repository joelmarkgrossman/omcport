// lib/fixed-port-tools.mjs
// Fixed-port tool registry — tracks third-party tools (backlog.md, mailhog, etc.)
// that manage their own port config and should not be redirected by omcport.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Read an integer value from a flat YAML or JSON config file.
 * YAML: matches `key: 12345` (no nesting). JSON: dot-notation keys.
 */
function readConfigPort(filePath, portKey) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return null; }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    try {
      let v = JSON.parse(text);
      for (const k of portKey.split('.')) v = v?.[k];
      return Number.isInteger(v) ? v : null;
    } catch { return null; }
  }

  // YAML / flat "key: value" format
  const escaped = portKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^\\s*${escaped}:\\s*(\\d+)`, 'm').exec(text);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Load fixed-port-tools.json from the given path.
 * Returns [] on any error — always safe to call.
 *
 * Schema (each entry):
 *   { cmd: string,      // substring match against the Bash command
 *     name: string,     // display name for messages
 *     config?: string,  // path relative to project CWD to config file
 *     portKey?: string, // key in config file (dot-notation for JSON)
 *     port?: number     // static port (alternative to config+portKey)
 *   }
 */
export function loadFixedPortTools(toolsPath) {
  try {
    const raw = fs.readFileSync(toolsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Return the first tool whose cmd string appears in the shell command, or null.
 */
export function matchFixedPortTool(tools, cmd) {
  for (const tool of tools) {
    if (typeof tool.cmd === 'string' && cmd.includes(tool.cmd)) return tool;
  }
  return null;
}

/**
 * Resolve the port a tool will actually use.
 * Returns a number or null (config file missing / key not found).
 */
export function resolveFixedPort(tool, cwd) {
  if (typeof tool.port === 'number') return tool.port;
  if (tool.config && tool.portKey) {
    return readConfigPort(path.join(cwd, tool.config), tool.portKey);
  }
  return null;
}
