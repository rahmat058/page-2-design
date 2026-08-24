export interface ViewportPreset {
  name: string
  width: number
  height: number
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

export function extraViewportsToCapture(
  currentWidth: number,
  presets: ViewportPreset[] = VIEWPORT_PRESETS,
): ViewportPreset[] {
  return presets.filter((preset) => Math.abs(preset.width - currentWidth) >= 48)
}

/** Evaluate min/max-width media queries at a target CSS pixel width. */
export function mediaQueryMatchesWidth(query: string, width: number): boolean {
  const constraints = [...query.matchAll(/\(\s*(min|max)-width\s*:\s*([0-9.]+)\s*(px|em|rem)?\s*\)/gi)]
  if (constraints.length === 0) return false
  return constraints.every((match) => {
    const kind = match[1]?.toLowerCase()
    let value = Number(match[2])
    const unit = (match[3] || 'px').toLowerCase()
    if (!kind || Number.isNaN(value)) return false
    if (unit === 'em' || unit === 'rem') value *= 16
    return kind === 'min' ? width >= value : width <= value
  })
}

export function matchingMediaAtWidth(queries: string[], width: number): string[] {
  return [...new Set(queries.filter((query) => mediaQueryMatchesWidth(query, width)))].slice(0, 40)
}

export function scrollPositions(documentHeight: number, viewportHeight: number, maxHeight: number): number[] {
  const height = Math.min(Math.max(documentHeight, 0), maxHeight)
  const view = Math.max(viewportHeight, 1)
  if (height <= view) return [0]
  const positions: number[] = []
  for (let y = 0; y + view < height; y += view) {
    positions.push(y)
  }
  const last = Math.max(0, height - view)
  if (!positions.includes(last)) positions.push(last)
  return positions
}

export function stitchCanvasSize(
  cssWidth: number,
  documentHeight: number,
  devicePixelRatio: number,
  maxHeight: number,
): { width: number; height: number; truncated: boolean } {
  const truncated = documentHeight > maxHeight
  const dpr = devicePixelRatio || 1
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(Math.min(documentHeight, maxHeight) * dpr)),
    truncated,
  }
}
