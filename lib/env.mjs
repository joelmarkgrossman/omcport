import { portFor } from './pool.mjs';

const WEB_ALIASES = ['VITE_PORT', 'NEXT_PORT', 'NUXT_PORT', 'DEV_PORT'];
const SLOT_ALIASES = {
  storybook: ['STORYBOOK_PORT'],
};

export function computeEnv({ project, base, bucket, slotMap }) {
  const env = {
    OMCPORT_PROJECT: project,
    OMCPORT_BUCKET: String(bucket),
  };
  for (const [slot, offset] of Object.entries(slotMap)) {
    const port = String(portFor({ base, bucket, slotOffset: offset }));
    env[`PORT_${slot.toUpperCase()}`] = port;
    if (slot === 'web') {
      env.PORT = port;
      for (const alias of WEB_ALIASES) env[alias] = port;
    }
    for (const alias of (SLOT_ALIASES[slot] ?? [])) env[alias] = port;
  }
  return env;
}
