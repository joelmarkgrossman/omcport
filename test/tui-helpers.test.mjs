import { describe, it, expect } from 'vitest';
import { filterProjects, truncate, relativeTime } from '../src/tui/helpers.mjs';

describe('filterProjects', () => {
  const entries = [
    ['lifeline', { root: '/Users/joel/dev/lifeline', base: 13320 }],
    ['the_board', { root: '/Users/joel/dev/the_board', base: 13352 }],
    ['cio-lt-agenda', { root: '/Users/joel/imga-dev/cio-lt-agenda', base: 13960 }],
  ];

  it('returns all entries when filter is empty', () => {
    expect(filterProjects(entries, '')).toEqual(entries);
  });

  it('returns all entries when filter is null/undefined', () => {
    expect(filterProjects(entries, null)).toEqual(entries);
    expect(filterProjects(entries, undefined)).toEqual(entries);
  });

  it('filters by project key (case-insensitive)', () => {
    expect(filterProjects(entries, 'life').map(([k]) => k)).toEqual(['lifeline']);
    expect(filterProjects(entries, 'LIFE').map(([k]) => k)).toEqual(['lifeline']);
  });

  it('filters by root path substring', () => {
    expect(filterProjects(entries, 'imga-dev').map(([k]) => k)).toEqual(['cio-lt-agenda']);
  });

  it('returns multiple matches', () => {
    // /dev/ matches lifeline + the_board roots; cio-lt-agenda is under /imga-dev/
    expect(filterProjects(entries, '/dev/').map(([k]) => k))
      .toEqual(['lifeline', 'the_board']);
  });

  it('returns empty when no match', () => {
    expect(filterProjects(entries, 'nothing-matches')).toEqual([]);
  });

  it('handles entries with missing root', () => {
    const withMissing = [...entries, ['orphan', { base: 14000 }]];
    expect(filterProjects(withMissing, 'orphan').map(([k]) => k)).toEqual(['orphan']);
  });
});

describe('truncate', () => {
  it('returns unchanged when shorter than limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('appends ellipsis when longer', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('handles exact length boundary', () => {
    expect(truncate('abcdef', 6)).toBe('abcdef');
  });
});

describe('relativeTime', () => {
  it('returns em-dash for falsy input', () => {
    expect(relativeTime(null)).toBe('—');
    expect(relativeTime('')).toBe('—');
    expect(relativeTime(undefined)).toBe('—');
  });

  it('returns "now" for very recent timestamps', () => {
    const recent = new Date(Date.now() - 1000).toISOString();
    expect(relativeTime(recent)).toBe('now');
  });
});
