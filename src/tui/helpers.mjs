// src/tui/helpers.mjs
export function relativeTime(iso) {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
export function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// Substring filter (case-insensitive) over project entries by key OR root path.
// entries: Array<[projectKey, projectData]>. Returns the same shape, filtered.
export function filterProjects(entries, filter) {
  if (!filter) return entries;
  const needle = filter.toLowerCase();
  return entries.filter(([key, p]) => {
    if (key.toLowerCase().includes(needle)) return true;
    const root = (p && p.root) ? String(p.root).toLowerCase() : '';
    return root.includes(needle);
  });
}
