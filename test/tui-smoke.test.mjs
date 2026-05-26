// test/tui-smoke.test.mjs
// Smoke test: ensure the TUI App component mounts without throwing.
// Uses React.createElement (not JSX) so the test file doesn't need a JSX loader.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpDir;
let savedOmcportDir;
let savedRoots;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omcport-tui-smoke-'));
  savedOmcportDir = process.env.OMCPORT_DIR;
  savedRoots = process.env.OMCPORT_PROJECT_ROOTS;
  process.env.OMCPORT_DIR = tmpDir;
  process.env.OMCPORT_PROJECT_ROOTS = tmpDir;
});

afterEach(() => {
  if (savedOmcportDir === undefined) delete process.env.OMCPORT_DIR;
  else process.env.OMCPORT_DIR = savedOmcportDir;
  if (savedRoots === undefined) delete process.env.OMCPORT_PROJECT_ROOTS;
  else process.env.OMCPORT_PROJECT_ROOTS = savedRoots;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('TUI App smoke', () => {
  it('mounts and renders the initial loading frame', async () => {
    // cache-bust so each test gets a fresh module
    const { default: App } = await import(/* @vite-ignore */ `../src/tui/App.jsx?t=${Date.now()}`);
    const { lastFrame, unmount } = render(React.createElement(App));
    // Initial frame should show the loading placeholder
    expect(lastFrame()).toContain('loading');
    unmount();
  });
});
