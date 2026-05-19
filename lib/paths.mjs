import os from 'node:os';
import path from 'node:path';

export const OMCPORT_DIR =
  process.env.OMCPORT_DIR ?? path.join(os.homedir(), '.claude', 'omcport');

export const REGISTRY_PATH = path.join(OMCPORT_DIR, 'registry.toml');
export const BACKUP_PATH   = path.join(OMCPORT_DIR, 'registry.toml.bak');
export const LOG_PATH      = path.join(OMCPORT_DIR, 'log.jsonl');
export const LOCKFILE_PATH = path.join(OMCPORT_DIR, 'lockfile');
