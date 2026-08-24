import { useState } from 'react'
import { isDarkHex, parseColor, pagePaletteGroups } from '../../normalize/colors'
import { createRequestId } from '../../shared/messages'
import type { ColorToken, TypographyToken } from '../../shared/types'
import { sendRuntime } from '../chrome-api'
import { Copy } from 'lucide-react'
import { Button } from '../components/Button'
import { CopyButton, ScanPrompt } from '../components/CopyButton'
import { InspectIcon, CopyIcon } from '../components/LucideIcons'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

export function ColorsView() {
  const colors = useScanStore((s) => s.design?.tokens.colors ?? [])
  const [tab, setTab] = useState<'palette' | 'categories'>('palette')
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  if (colors.length === 0) return <ScanPrompt afterScan="No colors were captured." />
  const grouped = pagePaletteGroups(colors)
  return (
    <div className="colors-wrap">
      <div className="segmented pill-tabs" role="tablist" aria-label="Color views">
        <button
          type="button"
          role="tab"
          className={tab === 'palette' ? 'on' : ''}
          aria-selected={tab === 'palette'}
          onClick={() => {
            if (tab === 'palette') return
            setTab('palette')
            useToastStore.getState().showToast('Palette')
          }}>
          Palette
        </button>
        <button
          type="button"
          role="tab"
          className={tab === 'categories' ? 'on' : ''}
          aria-selected={tab === 'categories'}
          onClick={() => {
            if (tab === 'categories') return
            setTab('categories')
            useToastStore.getState().showToast('Categories')
          }}>
          Categories
        </button>
      </div>
      <div key={tab} className="fade-pane colors-scroll">
        {tab === 'palette' ? (
          <div className="palette peeper-palette">
            {colors.map((color) => (
              <ColorCard
                key={color.id}
                color={color}
                inspecting={inspectingId === color.id}
                onInspect={() => void cycleInspectColor(color, setInspectingId)}
              />
            ))}
          </div>
        ) : (
          <div className="category-list">
            {grouped.map((group) => (
              <section key={group.key} className="category-block">
                <h3>{group.title}</h3>
                <div className="peeper-palette">
                  {group.ids.map((id) => {
                    const color = colors.find((item) => item.id === id)
                    if (!color) return null
                    return (
                      <ColorCard
                        key={color.id}
                        color={color}
                        inspecting={inspectingId === color.id}
                        onInspect={() => void cycleInspectColor(color, setInspectingId)}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ColorCard({
  color,
  inspecting,
  onInspect,
}: {
  color: ColorToken
  inspecting: boolean
  onInspect: () => void
}) {
  const gradient = color.kind === 'gradient'
  const fill = color.css || color.rgba || color.hex
  const ink = isDarkHex(color.hex) ? '#fff' : '#111'
  const parsed = parseColor(color.hex)
  const translucent = !gradient && Boolean(parsed && parsed.a < 0.96)
  const copyValue = gradient ? color.css : color.hex
  const label = gradient ? color.name : color.hex
  return (
    <div
      className={[
        'palette-card peeper-card',
        translucent ? 'checker' : '',
        isLightSwatch(color.hex) ? 'light-swatch' : '',
        inspecting ? 'inspecting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: fill, color: ink, ['--swatch' as string]: color.rgba }}>
      <div className="peeper-copy">
        <strong>{label}</strong>
        <span>
          {color.count} {color.count === 1 ? 'instance' : 'instances'}
        </span>
      </div>
      <div className="peeper-actions">
        <button
          type="button"
          className={inspecting ? 'swatch-action on' : 'swatch-action'}
          aria-label={`Inspect ${label} on the page`}
          aria-pressed={inspecting}
          onClick={onInspect}>
          <InspectIcon />
        </button>
        <button
          type="button"
          className="swatch-action"
          aria-label={`Copy ${label}`}
          onClick={() => void copyColor(copyValue, label)}>
          <CopyIcon />
        </button>
      </div>
    </div>
  )
}

function isLightSwatch(hex: string): boolean {
  const parsed = parseColor(hex)
  if (!parsed) return false
  const luminance = (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255
  return luminance > 0.9
}

async function copyColor(value: string, label: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  useToastStore.getState().showToast(`${label} copied`)
}

async function cycleInspectColor(color: ColorToken, setInspectingId: (id: string | null) => void): Promise<void> {
  const response = await sendRuntime({
    type: 'HIGHLIGHT_COLOR',
    requestId: createRequestId(),
    payload: { hex: color.hex, css: color.css ?? color.hex },
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
  setInspectingId(color.id)
  const label = color.kind === 'gradient' ? color.name : color.hex
  useToastStore.getState().showToast(`${label} · ${response.payload.index + 1} of ${response.payload.total}`)
}

export function TypographyView() {
  const tokens = useScanStore((s) => s.design?.tokens.typography ?? [])
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  if (tokens.length === 0) return <ScanPrompt afterScan="No typography was captured." />
  const sections = groupTypographySections(tokens)
  return (
    <div className="type-list">
      {sections.map((section) => (
        <section key={section.key} className="type-section">
          <div className="type-section-head">
            <h2>{section.title}</h2>
            <span className="count-pill">{section.tokens.length}</span>
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

export function LayoutView() {
  const design = useScanStore((s) => s.design)
  if (!design) return <ScanPrompt afterScan="No layout data was captured." />
  return (
    <>
      <section className="card">
        <h2>Sections</h2>
        <div className="list">
          {design.sections.map((section) => (
            <div key={section.id}>
              <strong>{section.name}</strong>
              <div className="muted">
                {section.provenance} · confidence {section.confidence} · {section.bounds.width}×{section.bounds.height}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Spacing / radius / shadow</h2>
        {[...design.tokens.spacing, ...design.tokens.radii, ...design.tokens.shadows].map((token) => (
          <div key={token.id} className="row">
            <span>
              {token.name}: {token.value}
            </span>
            <CopyButton value={token.value} label="Copy" />
          </div>
        ))}
      </section>
    </>
  )
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
