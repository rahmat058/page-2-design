/**
 * Typography result tab for scanned design tokens.
 */
import { useState } from 'react'
import { createRequestId } from '../../shared/messages'
import type { TypographyToken } from '../../shared/types'
import { sendRuntime } from '../chrome-api'
import { Copy } from 'lucide-react'
import { Button } from '../components/Button'
import { CountBadge } from '../components/CountBadge'
import { ScanPrompt } from '../components/CopyButton'
import { InspectIcon } from '../components/LucideIcons'
import { EMPTY_TYPOGRAPHY } from '../empty'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

export function TypographyView() {
  const tokens = useScanStore((s) => s.design?.tokens.typography ?? EMPTY_TYPOGRAPHY)
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  if (tokens.length === 0) return <ScanPrompt afterScan="No typography was captured." />
  const sections = groupTypographySections(tokens)
  return (
    <div className="type-list">
      {sections.map((section) => (
        <section key={section.key} className="type-section">
          <div className="type-section-head">
            <h2>{section.title}</h2>
            <CountBadge value={section.tokens.length} />
          </div>
          {section.tokens.map((token) => {
            const values = `${token.fontFamily}; ${token.fontSize}; ${token.fontWeight}; ${token.lineHeight}`
            const title = prettyTypeName(token.name)
            return (
              <article key={token.id} className="type-card">
                <div className="type-card-head">
                  <h3>{title}</h3>
                  <div className="type-card-meta">
                    <span className="muted">
                      {token.count} {token.count === 1 ? 'instance' : 'instances'}
                    </span>
                    <button
                      type="button"
                      className={inspectingId === token.id ? 'type-inspect on' : 'type-inspect'}
                      aria-label={`Inspect ${title} on the page`}
                      aria-pressed={inspectingId === token.id}
                      onClick={() => void cycleInspectType(token, title, setInspectingId)}>
                      <InspectIcon />
                      Inspect
                    </button>
                  </div>
                </div>
                <p
                  className="type-preview"
                  style={{
                    fontFamily: token.fontFamily,
                    fontSize: previewSize(token.fontSize),
                    fontWeight: token.fontWeight as never,
                    lineHeight: 1.35,
                  }}>
                  AaBbCc
                </p>
                <div className="type-specs">
                  <span>{primaryFont(token.fontFamily)}</span>
                  <span>{token.fontSize}</span>
                  <span>{token.lineHeight}</span>
                  <span>{token.fontWeight}</span>
                </div>
                <div className="type-card-actions">
                  {token.licenseReviewRequired ? <span className="badge warning">Font license review</span> : null}
                  <Button size="sm" icon={Copy} onClick={() => void copyTypeValues(values, title)}>
                    Copy values
                  </Button>
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function previewSize(size: string): string {
  const n = Number.parseFloat(size)
  if (!Number.isFinite(n)) return '22px'
  return `${Math.min(Math.max(n, 16), 28)}px`
}

async function copyTypeValues(value: string, name: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  useToastStore.getState().showToast(`${name} values copied`)
}

async function cycleInspectType(
  token: TypographyToken,
  title: string,
  setInspectingId: (id: string | null) => void,
): Promise<void> {
  const response = await sendRuntime({
    type: 'HIGHLIGHT_COLOR',
    requestId: createRequestId(),
    payload: {
      typography: {
        fontFamily: token.fontFamily,
        fontSize: token.fontSize,
        fontWeight: token.fontWeight,
        lineHeight: token.lineHeight,
      },
    },
  })
  if (response?.type !== 'HIGHLIGHT_COLOR_RESULT' || response.payload.done || response.payload.total === 0) {
    setInspectingId(null)
    useToastStore
      .getState()
      .showToast(
        response?.type === 'HIGHLIGHT_COLOR_RESULT' && response.payload.total === 0
          ? 'No matches on the page'
          : 'Inspect off',
      )
    return
  }
  setInspectingId(token.id)
  useToastStore.getState().showToast(`${title} · ${response.payload.index + 1} of ${response.payload.total}`)
}

function groupTypographySections(tokens: TypographyToken[]): Array<{
  key: string
  title: string
  tokens: TypographyToken[]
}> {
  const buckets = new Map<string, { title: string; order: number; tokens: TypographyToken[] }>()
  for (const token of tokens) {
    const section = typeSection(token)
    const bucket = buckets.get(section.key) ?? { title: section.title, order: section.order, tokens: [] }
    bucket.tokens.push(token)
    buckets.set(section.key, bucket)
  }
  return [...buckets.values()]
    .sort((a, b) => a.order - b.order)
    .map((bucket) => ({ key: bucket.title, title: bucket.title, tokens: bucket.tokens }))
}

function typeSection(token: TypographyToken): { key: string; title: string; order: number } {
  const size = Number.parseFloat(token.fontSize)
  const name = token.name
  if (/display/i.test(name) || size >= 40) return { key: 'display', title: 'Display', order: 0 }
  if (/h1|heading-1/i.test(name) || size >= 28) return { key: 'h1', title: 'Heading 1', order: 1 }
  if (/h2|heading-2/i.test(name) || size >= 22) return { key: 'h2', title: 'Heading 2', order: 2 }
  if (/h3|heading-3/i.test(name) || size >= 18) return { key: 'h3', title: 'Heading 3', order: 3 }
  if (/caption|label/i.test(name) || size <= 13) return { key: 'caption', title: 'Captions', order: 5 }
  return { key: 'body', title: 'Paragraphs', order: 4 }
}

function prettyTypeName(name: string): string {
  if (/h1|heading-1|display/i.test(name)) return 'Heading 1'
  if (/h2|heading-2/i.test(name)) return 'Heading 2'
  if (/h3|heading-3/i.test(name)) return 'Heading 3'
  if (/body|paragraph|text/i.test(name)) return 'Paragraph'
  return name.replace(/[-_]/g, ' ')
}

function primaryFont(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack
}
