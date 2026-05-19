import { describe, it, expect } from 'vitest';
import { computeEnv } from '../lib/env.mjs';

describe('computeEnv', () => {
  it('emits PORT, framework aliases, and PORT_<SLOT> for each slot', () => {
    const env = computeEnv({
      project: 'lifeline',
      base: 13000,
      bucket: 1,
      slotMap: { web: 0, api: 1, storybook: 2 },
    });
    expect(env.PORT).toBe('13008');
    expect(env.VITE_PORT).toBe('13008');
    expect(env.NEXT_PORT).toBe('13008');
    expect(env.NUXT_PORT).toBe('13008');
    expect(env.DEV_PORT).toBe('13008');
    expect(env.PORT_WEB).toBe('13008');
    expect(env.PORT_API).toBe('13009');
    expect(env.PORT_STORYBOOK).toBe('13010');
    expect(env.STORYBOOK_PORT).toBe('13010');
    expect(env.OMCPORT_PROJECT).toBe('lifeline');
    expect(env.OMCPORT_BUCKET).toBe('1');
  });

  it('omits storybook alias when slot missing', () => {
    const env = computeEnv({
      project: 'foo', base: 13000, bucket: 0, slotMap: { web: 0 },
    });
    expect(env.STORYBOOK_PORT).toBeUndefined();
    expect(env.PORT_STORYBOOK).toBeUndefined();
    expect(env.PORT_WEB).toBe('13000');
  });
});
