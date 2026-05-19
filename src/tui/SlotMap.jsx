// src/tui/SlotMap.jsx
import React from 'react';
import { Box, Text, useInput } from 'ink';

export default function SlotMap({ project, projectKey, registry, livePorts, onBack }) {
  useInput((input, key) => {
    if (key.escape || input === 'b') onBack();
  });
  const slotMap = project.slots ?? registry.slots?.defaults ?? {};
  const rows = [];
  for (const [wtKey, wt] of Object.entries(project.worktrees ?? {})) {
    for (let off = 0; off < 8; off++) {
      const port = project.base + wt.bucket * 8 + off;
      const slot = Object.entries(slotMap).find(([, o]) => o === off)?.[0];
      const claim = wt.claims && Object.values(wt.claims).find(c => c.offset === off);
      const live = livePorts.get(port);
      rows.push({
        wtKey, bucket: wt.bucket, off, port,
        slot: slot ?? (claim ? `claim:${claim.label ?? '?'}` : ''),
        live: live ? `${live.command}(${live.pid})` : '',
      });
    }
  }
  return (
    <Box flexDirection="column">
      <Text bold>{projectKey} slot-map (base {project.base})</Text>
      <Box marginTop={1}>
        <Text bold>{'WORKTREE'.padEnd(28)}{'BUCKET'.padEnd(8)}{'OFF'.padEnd(5)}{'PORT'.padEnd(8)}{'SLOT'.padEnd(20)}LIVE</Text>
      </Box>
      {rows.map((r, i) => (
        <Box key={i}>
          <Text>{r.wtKey.padEnd(28)}{String(r.bucket).padEnd(8)}{String(r.off).padEnd(5)}{String(r.port).padEnd(8)}{r.slot.padEnd(20)}{r.live}</Text>
        </Box>
      ))}
      <Box marginTop={1}><Text dimColor>[Esc/b] back</Text></Box>
    </Box>
  );
}
