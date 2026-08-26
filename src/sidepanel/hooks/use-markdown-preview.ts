/**
 * Deferred markdown/JSON preview generation with per-scan cache.
 */
import { useEffect, useRef, useState, startTransition } from 'react'
import type { NormalizedDesign, PageScan } from '../../shared/types'

interface Pack {
  design: NormalizedDesign
  raw: PageScan | null
}

interface PreviewFile {
  id: string
  build: (pack: Pack) => string
  path: string
}

export function useMarkdownPreview(args: {
  design: NormalizedDesign | null
  raw: PageScan | null
  scanId: string | null
  selected: PreviewFile
}): { markdown: string; generating: boolean } {
  const { design, raw, scanId, selected } = args
  const [markdown, setMarkdown] = useState('Refreshing from the page…')
  const [generating, setGenerating] = useState(false)
  const cacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    cacheRef.current.clear()
  }, [scanId, design?.metadata.scannedAt])

  useEffect(() => {
    if (!design) {
      setMarkdown('Refreshing from the page…')
      setGenerating(false)
      return
    }
    const key = `${scanId ?? design.metadata.scannedAt}:${selected.id}`
    const cached = cacheRef.current.get(key)
    if (cached) {
      setMarkdown(cached)
      setGenerating(false)
      return
    }
    setGenerating(true)
    setMarkdown('Generating preview…')
    const pack: Pack = { design, raw }
    const file = selected
    let cancelled = false
    const timer = window.setTimeout(() => {
      startTransition(() => {
        if (cancelled) return
        let text: string
        try {
          text = file.build(pack)
        } catch (error) {
          const detail = error instanceof Error ? error.stack || error.message : String(error)
          text = `# Could not generate ${file.path}\n\n${detail}\n`
        }
        cacheRef.current.set(key, text)
        setMarkdown(text)
        setGenerating(false)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [design, raw, selected, scanId])

  return { markdown, generating }
}
