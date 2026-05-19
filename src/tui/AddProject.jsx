// src/tui/AddProject.jsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export default function AddProject({ onSubmit, onCancel }) {
  const [pathInput, setPathInput] = useState('');
  return (
    <Box flexDirection="column">
      <Text>Add project — enter absolute or ~-prefixed path (Enter to confirm, empty Enter to cancel):</Text>
      <TextInput
        value={pathInput}
        onChange={setPathInput}
        onSubmit={() => pathInput ? onSubmit(pathInput) : onCancel()}
      />
    </Box>
  );
}
