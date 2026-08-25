/**
 * Parses HTML srcset strings and picks the highest-resolution candidate URL.
 */
export interface SrcsetCandidate {
  url: string
  descriptor: string
}

export function parseSrcset(srcset: string): SrcsetCandidate[] {
  if (!srcset.trim()) return []
  return srcset
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split(/\s+/)
      const url = pieces[0] ?? ''
      const descriptor = pieces.slice(1).join(' ') || '1x'
      return { url, descriptor }
    })
    .filter((c) => c.url.length > 0)
}

export function pickBestSrcsetUrl(srcset: string): string | null {
  const candidates = parseSrcset(srcset)
  if (candidates.length === 0) return null
  const sorted = [...candidates].sort((a, b) => descriptorScore(b.descriptor) - descriptorScore(a.descriptor))
  return sorted[0]?.url ?? null
}

function descriptorScore(descriptor: string): number {
  if (descriptor.endsWith('w')) {
    return Number.parseFloat(descriptor) || 0
  }
  if (descriptor.endsWith('x')) {
    return (Number.parseFloat(descriptor) || 1) * 1000
  }
  return 1
}
