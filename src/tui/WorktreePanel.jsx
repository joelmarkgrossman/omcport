// src/tui/WorktreePanel.jsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { withRegistryLock, loadRegistry, saveRegistry } from '../../lib/registry.mjs';

export default function WorktreePanel({ projectKey, project, onBack, onRefresh }) {
  const [idx, setIdx] = useState(0);
  const entries = Object.entries(project.worktrees ?? {}).sort((a, b) => a[1].bucket - b[1].bucket);

  useInput(async (input, key) => {
    if (key.escape || input === 'b') return onBack();
    if (key.upArrow) setIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setIdx(i => Math.min(entries.length - 1, i + 1));
    if (input === 'f') {
      const [wtKey] = entries[idx] ?? [];
      if (!wtKey) return;
      await withRegistryLock(async () => {
        const r = await loadRegistry();
        delete r.projects[projectKey].worktrees[wtKey];
        await saveRegistry(r);
      });
      // Refresh parent state before returning so the list view doesn't show
      // the freed worktree until the 2s poll fires.
      if (onRefresh) await onRefresh();
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{projectKey} worktrees</Text>
      {entries.map(([k, wt], i) => (
        <Box key={k}>
          <Text>{i === idx ? '▸ ' : '  '}bucket {wt.bucket}: {k} ({wt.path})</Text>
        </Box>
      ))}
      <Box marginTop={1}><Text dimColor>[↑↓] navigate  [f] free bucket  [Esc] back</Text></Box>
    </Box>
  );
}
