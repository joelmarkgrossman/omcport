#!/usr/bin/env node
// scripts/install.mjs
// Idempotent installer for omcport. Run from the omcport repo root.
// Usage:
//   node scripts/install.mjs              # apply
//   node scripts/install.mjs --dry-run    # show what would happen, no changes

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const HOME = os.homedir();
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CLAUDE_DIR = path.join(HOME, '.claude');
const OMCPORT_LINK = path.join(CLAUDE_DIR, 'omcport');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const FIXED_PORT_DEFAULT = path.join(REPO_ROOT, 'examples', 'fixed-port-tools.json');
const FIXED_PORT_RUNTIME = path.join(CLAUDE_DIR, 'omcport', 'fixed-port-tools.json');
const BIN_SRC = path.join(REPO_ROOT, 'bin', 'omcport');
const BIN_LINK_DIRS = [path.join(HOME, 'bin'), '/usr/local/bin'];

const SESSION_HOOK_CMD = `node "${OMCPORT_LINK}/hooks/session-start.mjs"`;
const PRETOOL_HOOK_CMD = `node "${OMCPORT_LINK}/hooks/pre-tool-use.mjs"`;

let changed = 0;
const log = (msg) => process.stdout.write(`${DRY ? '[dry-run] ' : ''}${msg}\n`);
const skip = (msg) => process.stdout.write(`  skip: ${msg}\n`);

function ensureSymlink(target, linkPath) {
  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink() && fs.readlinkSync(linkPath) === target) {
      return skip(`${linkPath} -> ${target} (already correct)`);
    }
    log(`WARN: ${linkPath} exists and is not the expected symlink — leaving alone`);
    return;
  }
  log(`symlink ${linkPath} -> ${target}`);
  if (!DRY) {
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.symlinkSync(target, linkPath);
    changed++;
  }
}

function pickBinLinkDir() {
  for (const dir of BIN_LINK_DIRS) {
    try {
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch { /* not writable; try next */ }
  }
  return null;
}

function backupFile(p) {
  if (!fs.existsSync(p)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${p}.bak-pre-omcport-${ts}`;
  log(`backup ${p} -> ${dest}`);
  if (!DRY) fs.copyFileSync(p, dest);
  return dest;
}

function hasOmcportHook(arr, needle) {
  if (!Array.isArray(arr)) return false;
  for (const entry of arr) {
    const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
    for (const h of hooks) {
      if (typeof h?.command === 'string' && h.command.includes(needle)) return true;
    }
  }
  return false;
}

function patchSettings() {
  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch (e) {
      log(`ERROR: ${SETTINGS} is not valid JSON: ${e.message}`);
      log(`Refusing to patch. Fix the file or move it aside and re-run.`);
      process.exit(1);
    }
  }

  settings.hooks ??= {};
  settings.hooks.SessionStart ??= [];
  settings.hooks.PreToolUse ??= [];

  let touched = false;

  // SessionStart: add omcport hook if not present
  if (!hasOmcportHook(settings.hooks.SessionStart, 'omcport/hooks/session-start')) {
    settings.hooks.SessionStart.push({
      hooks: [{
        type: 'command',
        command: SESSION_HOOK_CMD,
        timeout: 3,
        statusMessage: 'omcport: resolving project ports...',
      }],
    });
    touched = true;
    log('patch SessionStart: add omcport hook');
  } else {
    skip('SessionStart already has an omcport hook');
  }

  // PreToolUse: find matcher: "Bash" entry; append our hook OR add new entry
  const bashEntry = settings.hooks.PreToolUse.find((e) => e?.matcher === 'Bash');
  if (bashEntry) {
    bashEntry.hooks ??= [];
    if (!bashEntry.hooks.some((h) => typeof h?.command === 'string' && h.command.includes('omcport/hooks/pre-tool-use'))) {
      bashEntry.hooks.push({ type: 'command', command: PRETOOL_HOOK_CMD, timeout: 3 });
      touched = true;
      log('patch PreToolUse[Bash]: append omcport hook');
    } else {
      skip('PreToolUse[Bash] already has an omcport hook');
    }
  } else {
    settings.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: PRETOOL_HOOK_CMD, timeout: 3 }],
    });
    touched = true;
    log('patch PreToolUse: add Bash matcher with omcport hook');
  }

  if (!touched) {
    skip('settings.json already configured');
    return;
  }

  backupFile(SETTINGS);
  log(`write ${SETTINGS}`);
  if (!DRY) {
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
    changed++;
  }
}

function seedFixedPortTools() {
  if (!fs.existsSync(FIXED_PORT_DEFAULT)) {
    log(`WARN: ${FIXED_PORT_DEFAULT} missing — skipping fixed-port-tools seed`);
    return;
  }
  if (fs.existsSync(FIXED_PORT_RUNTIME)) {
    return skip(`${FIXED_PORT_RUNTIME} already exists`);
  }
  log(`seed ${FIXED_PORT_RUNTIME} from examples/`);
  if (!DRY) {
    fs.mkdirSync(path.dirname(FIXED_PORT_RUNTIME), { recursive: true });
    fs.copyFileSync(FIXED_PORT_DEFAULT, FIXED_PORT_RUNTIME);
    changed++;
  }
}

function smokeTest() {
  if (DRY) return;
  log('smoke: omcport --help');
  try {
    const out = execSync(`node "${BIN_SRC}" help 2>&1 || node "${BIN_SRC}" --help 2>&1`, {
      encoding: 'utf8', timeout: 5000,
    });
    log(`  ok: ${out.split('\n')[0]}`);
  } catch (e) {
    log(`  WARN: smoke failed: ${e.message}`);
  }
}

function main() {
  log(`omcport install ${DRY ? '(dry-run)' : ''}`);
  log(`  repo root: ${REPO_ROOT}`);
  log(`  claude dir: ${CLAUDE_DIR}`);

  ensureSymlink(REPO_ROOT, OMCPORT_LINK);

  const binDir = pickBinLinkDir();
  if (binDir) ensureSymlink(BIN_SRC, path.join(binDir, 'omcport'));
  else log(`WARN: no writable dir in ${BIN_LINK_DIRS.join(', ')} — symlink omcport manually`);

  patchSettings();
  seedFixedPortTools();
  smokeTest();

  log('');
  log(DRY ? `(dry-run) ${changed} changes would be applied` : `done. ${changed} changes applied.`);
  if (!DRY && changed > 0) {
    log('');
    log('Next: `omcport scan --yes` to seed the registry from your existing projects.');
    log('Then open Claude Code in any project; you should see an `omcport:` line in the context.');
  }
}

main();
