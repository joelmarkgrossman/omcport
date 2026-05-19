// src/tui/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import path from 'node:path';
import os from 'node:os';
import { loadRegistry, saveRegistry, withRegistryLock } from '../../lib/registry.mjs';
import { listListeningPorts } from '../../lib/lsof.mjs';
import { nextFreeBase } from '../../lib/allocate.mjs';
import ProjectList from './ProjectList.jsx';
import AddProject from './AddProject.jsx';

export default function App() {
  const { exit } = useApp();
  const [registry, setRegistry] = useState(null);
  const [livePorts, setLivePorts] = useState(new Map());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('list');

  const refresh = async () => {
    try {
      const [r, l] = await Promise.all([loadRegistry(), listListeningPorts()]);
      setRegistry(r);
      setLivePorts(l);
      setSelectedIndex(i => Math.max(0, Math.min(i, Object.keys(r.projects).length - 1)));
    } catch { /* keep last known state */ }
  };

  useEffect(() => {
    let cancelled = false;
    const wrapped = async () => { if (!cancelled) await refresh(); };
    wrapped();
    const interval = setInterval(wrapped, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useInput(async (input, key) => {
    if (mode !== 'list' || !registry) return;
    if (input === 'q') exit();
    if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex(i => i + 1);
    if (input === 'a') setMode('add');
    if (input === 'f') { await freeSelected(); await refresh(); }
    if (input === 'k') { await killSelected(); await refresh(); }
  });

  async function freeSelected() {
    const projects = Object.entries(registry.projects).sort((a, b) => a[1].base - b[1].base);
    const [key] = projects[selectedIndex] ?? [];
    if (!key) return;
    await withRegistryLock(async () => {
      const r = await loadRegistry();
      delete r.projects[key];
      await saveRegistry(r);
    });
  }

  async function killSelected() {
    const projects = Object.entries(registry.projects).sort((a, b) => a[1].base - b[1].base);
    const [, p] = projects[selectedIndex] ?? [];
    if (!p) return;
    const slotMap = p.slots ?? registry.slots?.defaults ?? {};
    for (const wt of Object.values(p.worktrees ?? {})) {
      for (const off of Object.values(slotMap)) {
        const port = p.base + wt.bucket * 8 + off;
        const live = livePorts.get(port);
        if (live) { try { process.kill(live.pid); } catch (e) { if (e.code !== 'ESRCH') throw e; } }
      }
    }
  }

  if (!registry) return <Text>loading…</Text>;

  if (mode === 'add') {
    return (
      <AddProject
        onCancel={() => setMode('list')}
        onSubmit={async (raw) => {
          const expanded = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : raw;
          const name = path.basename(expanded);
          await withRegistryLock(async () => {
            const r = await loadRegistry();
            if (r.projects[name]) { setMode('list'); return; }
            const base = nextFreeBase(r);
            r.projects[name] = {
              root: expanded,
              base,
              worktrees: {
                [name]: { path: expanded, bucket: 0, first_seen: new Date().toISOString().slice(0, 10) },
              },
            };
            await saveRegistry(r);
          });
          setMode('list');
          await refresh();
        }}
      />
    );
  }

  const count = Object.keys(registry.projects).length;
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>omcport · {count} projects · pool {registry.meta.pool_start}–{registry.meta.pool_end}</Text>
      </Box>
      <ProjectList registry={registry} livePorts={livePorts} selectedIndex={Math.min(selectedIndex, count - 1)} />
      <Box marginTop={1}>
        <Text dimColor>[↑↓] navigate  [a] add  [f] free  [k] kill  [q] quit</Text>
      </Box>
    </Box>
  );
}
