import os from 'node:os';
import path from 'node:path';

export function getPaths() {
  const OMCPORT_DIR =
    process.env.OMCPORT_DIR ?? path.join(os.homedir(), '.claude', 'omcport');
  return {
    OMCPORT_DIR,
    REGISTRY_PATH: path.join(OMCPORT_DIR, 'registry.toml'),
    BACKUP_PATH:   path.join(OMCPORT_DIR, 'registry.toml.bak'),
    LOG_PATH:      path.join(OMCPORT_DIR, 'log.jsonl'),
    LOCKFILE_PATH:          path.join(OMCPORT_DIR, 'lockfile'),
    FIXED_PORT_TOOLS_PATH:  path.join(OMCPORT_DIR, 'fixed-port-tools.json'),
  };
}
