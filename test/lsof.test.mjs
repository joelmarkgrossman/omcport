// test/lsof.test.mjs
import { describe, it, expect } from 'vitest';
import { parseLsofOutput } from '../lib/lsof.mjs';

const sample = `COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node       5907 jgrossman   13u  IPv6 0xd40c6bcf9d6eb3d2      0t0  TCP [::1]:5173 (LISTEN)
node      12340 jgrossman   18u  IPv4 0x21b1e44134591f28      0t0  TCP *:13008 (LISTEN)
ControlCe  1061 jgrossman   11u  IPv4 0x21b1e44134591f28      0t0  TCP *:5000 (LISTEN)
`;

describe('parseLsofOutput', () => {
  it('extracts port → {pid, command} map', () => {
    const map = parseLsofOutput(sample);
    expect(map.get(5173)).toEqual({ pid: 5907, command: 'node' });
    expect(map.get(13008)).toEqual({ pid: 12340, command: 'node' });
    expect(map.get(5000)).toEqual({ pid: 1061, command: 'ControlCe' });
  });

  it('returns empty map on empty input', () => {
    expect(parseLsofOutput('').size).toBe(0);
    expect(parseLsofOutput('COMMAND PID USER\n').size).toBe(0);
  });
});
