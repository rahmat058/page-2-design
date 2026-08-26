/**
 * Windowed-list range math for VirtualList.
 */
export function visibleItemRange(
  scrollTop: number,
  viewportH: number,
  itemHeight: number,
  count: number,
  overscan: number,
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const end = Math.min(count, Math.ceil((scrollTop + viewportH) / itemHeight) + overscan)
  return { start, end }
}
