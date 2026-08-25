export function formatCssBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))}B`
  return `${Math.round(bytes / 1024)}kb`
}

export function formatCssLoadTime(ms: number | null): string {
  if (ms == null) return '—'
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`
}
