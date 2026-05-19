// src/tui/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { loadRegistry } from '../../lib/registry.mjs';
import { listListeningPorts } from '../../lib/lsof.mjs';
import ProjectList from './ProjectList.jsx';

export default function App() {
  const { exit } = useApp();
  const [registry, setRegistry] = useState(null);
  const [livePorts, setLivePorts] = useState(new Map());
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [r, l] = await Promise.all([loadRegistry(), listListeningPorts()]);
        if (cancelled) return;
        setRegistry(r);
        setLivePorts(l);
        setSelectedIndex(i => Math.max(0, Math.min(i, Object.keys(r.projects).length - 1)));
      } catch { /* registry unavailable; keep showing last known state */ }
    }
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex(i => i + 1);
  });

  if (!registry) return <Text>loading…</Text>;
  const count = Object.keys(registry.projects).length;
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>omcport · </Text>
        <Text>{count} projects · </Text>
        <Text>pool {registry.meta.pool_start}–{registry.meta.pool_end}</Text>
      </Box>
      <ProjectList registry={registry} livePorts={livePorts} selectedIndex={Math.min(selectedIndex, count - 1)} />
      <Box marginTop={1}>
        <Text dimColor>[↑↓] navigate  [a] add  [r] reassign  [f] free  [k] kill  [s] slot-map  [w] worktrees  [g] gc  [q] quit</Text>
      </Box>
    </Box>
  );
}
