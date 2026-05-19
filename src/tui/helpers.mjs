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
