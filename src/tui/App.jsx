// src/tui/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import path from 'node:path';
import os from 'node:os';
import fsSync from 'node:fs';
import { loadRegistry, saveRegistry, withRegistryLock } from '../../lib/registry.mjs';
import { listListeningPorts } from '../../lib/lsof.mjs';
import { nextFreeBase } from '../../lib/allocate.mjs';
import ProjectList from './ProjectList.jsx';
import AddProject from './AddProject.jsx';
import SlotMap from './SlotMap.jsx';
import WorktreePanel from './WorktreePanel.jsx';
import { filterProjects } from './helpers.mjs';

export default function App() {
  const { exit } = useApp();
  const [registry, setRegistry] = useState(null);
  const [livePorts, setLivePorts] = useState(new Map());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('list');
  const [filter, setFilter] = useState('');

  // Visible (filtered + sorted) entries are the single source of truth for both
  // the list view and the action keybindings (f/k/s/w/r operate on selected row).
  const visibleEntries = registry
    ? filterProjects(
        Object.entries(registry.projects).sort((a, b) => a[1].base - b[1].base),
        filter,
      )
    : [];

  const refresh = async () => {
    try {
      const [r, l] = await Promise.all([loadRegistry(), listListeningPorts()]);
      setRegistry(r);
      setLivePorts(l);
      const visibleCount = filterProjects(
        Object.entries(r.projects).sort((a, b) => a[1].base - b[1].base),
        filter,
      ).length;
      setSelectedIndex(i => Math.max(0, Math.min(i, visibleCount - 1)));
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
    if (input === '/') setMode('filter');
    if (input === 'a') setMode('add');
    if (input === 'f') { await freeSelected(); await refresh(); }
    if (input === 'k') { await killSelected(); await refresh(); }
    if (input === 's') setMode('slot-map');
    if (input === 'w') setMode('worktrees');
    if (input === 'g') { await gcStaleWorktrees(); await refresh(); }
    if (input === 'r') { await reassignBaseSelected(); await refresh(); }
  });

  async function freeSelected() {
    const [key] = visibleEntries[selectedIndex] ?? [];
    if (!key) return;
    await withRegistryLock(async () => {
      const r = await loadRegistry();
      delete r.projects[key];
      await saveRegistry(r);
    });
  }

  async function killSelected() {
    const [, p] = visibleEntries[selectedIndex] ?? [];
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

  async function gcStaleWorktrees() {
    await withRegistryLock(async () => {
      const r = await loadRegistry();
      for (const p of Object.values(r.projects)) {
        for (const [k, wt] of Object.entries(p.worktrees ?? {})) {
          const real = wt.path.startsWith('~') ? path.join(os.homedir(), wt.path.slice(1)) : wt.path;
          const ok = fsSync.existsSync(real);
          if (!ok) delete p.worktrees[k];
        }
      }
      await saveRegistry(r);
    });
  }

  async function reassignBaseSelected() {
    const [key] = visibleEntries[selectedIndex] ?? [];
    if (!key) return;
    await withRegistryLock(async () => {
      const r = await loadRegistry();
      delete r.projects[key];
      const newBase = nextFreeBase(r);
      r.projects[key] = { ...r.projects[key], base: newBase };
      await saveRegistry(r);
    });
  }

  if (!registry) return <Text>loading…</Text>;

  if (mode === 'slot-map') {
    const [key, p] = visibleEntries[selectedIndex] ?? [];
    if (!key) { setMode('list'); return null; }
    return <SlotMap projectKey={key} project={p} registry={registry} livePorts={livePorts} onBack={() => setMode('list')} />;
  }
  if (mode === 'worktrees') {
    const [key, p] = visibleEntries[selectedIndex] ?? [];
    if (!key) { setMode('list'); return null; }
    return <WorktreePanel projectKey={key} project={p} onBack={() => setMode('list')} onRefresh={refresh} />;
  }
  if (mode === 'filter') {
    return (
      <Box flexDirection="column">
        <Text>Filter (project key or root path, case-insensitive). Enter to apply, Esc to clear.</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          onSubmit={() => setMode('list')}
        />
        <Box marginTop={1}><Text dimColor>[Esc] clear + back</Text></Box>
        <FilterEscHandler onEscape={() => { setFilter(''); setMode('list'); }} />
      </Box>
    );
  }

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

  const totalCount = Object.keys(registry.projects).length;
  const visibleCount = visibleEntries.length;
  const clampedIndex = Math.max(0, Math.min(selectedIndex, visibleCount - 1));
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>omcport · {visibleCount}{filter ? `/${totalCount}` : ''} projects · pool {registry.meta.pool_start}–{registry.meta.pool_end}</Text>
      </Box>
      {filter && (
        <Box marginBottom={1}>
          <Text dimColor>filter: </Text>
          <Text color="yellow">{filter}</Text>
          <Text dimColor>  ([/] edit  [Esc-in-filter] clear)</Text>
        </Box>
      )}
      <ProjectList
        projects={visibleEntries}
        slotsDefault={registry.slots?.defaults}
        livePorts={livePorts}
        selectedIndex={clampedIndex}
      />
      <Box marginTop={1}>
        <Text dimColor>[↑↓] navigate  [/] filter  [a] add  [f] free  [k] kill  [s] slot-map  [w] worktrees  [g] gc  [r] reassign  [q] quit</Text>
      </Box>
    </Box>
  );
}

// Separate component so useInput can listen for Esc independently of the
// TextInput child (which captures most keys).
function FilterEscHandler({ onEscape }) {
  useInput((_input, key) => { if (key.escape) onEscape(); });
  return null;
}
