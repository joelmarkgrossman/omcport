// src/tui/ProjectList.jsx
import React from 'react';
import { Box, Text } from 'ink';
import { truncate } from './helpers.mjs';

export default function ProjectList({ registry, livePorts, selectedIndex }) {
  const projects = Object.entries(registry.projects).sort((a, b) => a[1].base - b[1].base);
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>  </Text>
        <Text bold>{'PROJECT'.padEnd(32)}</Text>
        <Text bold>{'BASE'.padEnd(7)}</Text>
        <Text bold>{'BUCKETS'.padEnd(28)}</Text>
        <Text bold>LIVE</Text>
      </Box>
      {projects.map(([key, p], i) => {
        const buckets = Object.entries(p.worktrees ?? {})
          .sort((a, b) => a[1].bucket - b[1].bucket)
          .map(([label, wt]) => `${wt.bucket}:${truncate(label, 18)}`)
          .join(', ');
        const slotMap = p.slots ?? registry.slots?.defaults ?? {};
        const myPorts = [];
        for (const wt of Object.values(p.worktrees ?? {})) {
          for (const [slot, off] of Object.entries(slotMap)) {
            const port = p.base + wt.bucket * 8 + off;
            const live = livePorts.get(port);
            if (live) myPorts.push(`${slot}:${port}(${live.pid})`);
          }
        }
        const liveStr = myPorts.length ? myPorts.slice(0, 2).join(' ') : '—';
        return (
          <Box key={key}>
            <Text>{i === selectedIndex ? '▸ ' : '  '}</Text>
            <Text>{truncate(key, 32).padEnd(32)}</Text>
            <Text>{String(p.base).padEnd(7)}</Text>
            <Text>{truncate(buckets, 28).padEnd(28)}</Text>
            <Text>{liveStr}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
