/**
 * Overview tab: page intro, scan progress/options, coverage, palette, and CSS stats.
 */
import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'
import type { AssetRecord, ColorToken } from '../../shared/types'
import { CountBadge } from '../components/CountBadge'
import { coverageSummary } from '../../validation/coverage'
import { EmptyState } from '../components/CopyButton'
import { contrastPairs, parseColor, colorDistance } from '../../normalize/colors'
import { emptyCssInformation, hasCssData } from '../../shared/types'
import { formatCssBytes, formatCssLoadTime } from '../../shared/css-format'
import { objectUrlForAsset } from '../download-asset'
import { useLiveCssInfo } from '../hooks'

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function OverviewView() {
  const design = useScanStore((s) => s.design)
  const scanId = useScanStore((s) => s.scanId)
  const phase = useScanStore((s) => s.phase)
  const progressMessage = useScanStore((s) => s.progressMessage)
  const completedChunks = useScanStore((s) => s.completedChunks)
  const totalChunks = useScanStore((s) => s.totalChunks)
  const error = useScanStore((s) => s.error)
  const options = useScanStore((s) => s.options)
  const setOptions = useScanStore((s) => s.setOptions)
  const liveCss = useLiveCssInfo(phase, scanId)

  const width =
    totalChunks && totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : phase === 'ready' ? 100 : 0

  const headingFont = primaryFont(
    design?.tokens.typography.find((token) => /heading|h1|display/i.test(token.name))?.fontFamily ??
      design?.tokens.typography[0]?.fontFamily,
  )
  const bodyFont = primaryFont(
    design?.tokens.typography.find((token) => /body|paragraph/i.test(token.name))?.fontFamily ??
      design?.tokens.typography[1]?.fontFamily,
  )
  const css = liveCss && hasCssData(liveCss) ? liveCss : (design?.cssInformation ?? emptyCssInformation())

  return (
    <>
      {phase !== 'idle' && phase !== 'ready' && phase !== 'complete' ? (
        <section className="scan-strip">
          <span>{progressMessage || phase}</span>
          <div className="progress" aria-label="Scan progress">
            <span style={{ width: `${width}%` }} />
          </div>
        </section>
      ) : null}
      {error ? <p className="badge error">{error}</p> : null}

      <OverviewIntro />

      {design ? (
        <>
          <section className="overview-block lead">
            <h2>Typography</h2>
            <div className="type-pair stacked">
              <div>
                <span className="muted">Headings</span>
                <strong>{headingFont}</strong>
              </div>
              <div>
                <span className="muted">Body</span>
                <strong>{bodyFont}</strong>
              </div>
            </div>
          </section>
          <section className="overview-block">
            <div className="row">
              <h2>Color Palette</h2>
              <button type="button" className="link" onClick={() => useScanStore.getState().setView('colors')}>
                Show all
              </button>
            </div>
            <div className="swatch-row">
              {overviewSwatches(design.tokens.colors).map((color) => (
                <span
                  key={color.id}
                  className={isLightHex(color.hex) ? 'swatch light' : 'swatch'}
                  style={{ background: color.kind === 'gradient' ? color.css : color.hex }}
                  title={color.kind === 'gradient' ? color.name : color.hex}
                />
              ))}
            </div>
          </section>
          <section className="overview-block">
            <div className="row">
              <h2>Contrast Scanner</h2>
              <CountBadge value={contrastPairs(design.tokens.colors).length} />
            </div>
            <div className="list compact contrast-list">
              {contrastPairs(design.tokens.colors)
                .slice(0, 6)
                .map((item) => (
                  <div key={`${item.fg}-${item.bg}`} className="contrast-row card-row">
                    <span className="contrast-preview" style={{ color: item.fg, background: item.bg }}>
                      Aa
                    </span>
                    <span className="contrast-ratio">{item.ratio.toFixed(2)} : 1</span>
                    <span className={`badge ${item.tone}`}>{item.label}</span>
                  </div>
                ))}
            </div>
          </section>
          <section className="overview-block">
            <h2>CSS Information</h2>
            <div className="css-info-grid">
              <div>
                <span>Style Rules</span>
                <strong>{css.styleRules.toLocaleString()}</strong>
              </div>
              <div>
                <span>CSS file</span>
                <strong>{formatCssBytes(css.cssBytes)}</strong>
              </div>
              <div>
                <span>Stylesheets</span>
                <strong>{css.stylesheetCount.toLocaleString()}</strong>
              </div>
              <div>
                <span>Load Time</span>
                <strong>{formatCssLoadTime(css.loadTimeMs)}</strong>
              </div>
            </div>
          </section>
        </>
      ) : (
        <EmptyState>
          {phase === 'idle' ? 'Opening this page…' : 'Scanning this page for fonts, colors, and assets.'}
        </EmptyState>
      )}

      <details className="more-details">
        <summary>Scan options</summary>
        <div className="scan-options">
          <Checkbox
            checked={options.loadLazyContent}
            onChange={(e) => setOptions({ loadLazyContent: e.target.checked })}
            label="Load lazy content"
          />
          <Checkbox
            checked={options.includeNavigationAndFooter}
            onChange={(e) => setOptions({ includeNavigationAndFooter: e.target.checked })}
            label="Include nav and footer"
          />
          <Checkbox
            checked={options.includeHiddenStructural}
            onChange={(e) => setOptions({ includeHiddenStructural: e.target.checked })}
            label="Include hidden structure"
          />
          <Checkbox
            checked={options.captureExtraViewports}
            onChange={(e) => setOptions({ captureExtraViewports: e.target.checked })}
            label="Record tablet and mobile breakpoints without resizing"
          />
        </div>
        {design ? (
          <div className="scan-coverage">
            <p>{coverageSummary(design.coverage)}</p>
            <Button
              variant="primary"
              size="sm"
              icon={Copy}
              onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify(design.coverage, null, 2))
                useToastStore.getState().showToast('Coverage JSON copied')
              }}>
              Copy coverage JSON
            </Button>
          </div>
        ) : null}
      </details>
    </>
  )
}

// ---------------------------------------------------------------------------
// Intro & OG image
// ---------------------------------------------------------------------------

function OverviewIntro() {
  const design = useScanStore((s) => s.design)
  const tabTitle = useScanStore((s) => s.title)
  const tabUrl = useScanStore((s) => s.url)
  const hostname = useScanStore((s) => s.hostname)
  const meta = design?.metadata
  const title = meta?.ogTitle || meta?.title || tabTitle || hostname || 'Open a website, then scan'
  const href = meta?.ogUrl || meta?.url || tabUrl || ''
  const image = meta?.ogImage || ''
  const asset = image
    ? design?.assets.find((item) => item.resolvedUrl === image || item.sourceUrl === image)
    : undefined

  return (
    <section className="overview-intro">
      {image ? <OgImage src={image} asset={asset} /> : null}
      <h2 className="overview-intro-title">{title}</h2>
      {href ? (
        <a className="overview-intro-link" href={href} target="_blank" rel="noreferrer">
          {href}
        </a>
      ) : null}
    </section>
  )
}

function OgImage({ src, asset }: { src: string; asset?: AssetRecord }) {
  const [url, setUrl] = useState(src)
  const [hidden, setHidden] = useState(false)
  const triedAsset = useRef(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setUrl(src)
    setHidden(false)
    triedAsset.current = false
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [src])

  if (hidden) return null
  return (
    <img
      className="overview-intro-image"
      src={url}
      alt=""
      onError={() => {
        if (!triedAsset.current && asset) {
          triedAsset.current = true
          void objectUrlForAsset(asset).then((next) => {
            if (!next) {
              setHidden(true)
              return
            }
            if (blobUrlRef.current && blobUrlRef.current !== next) {
              URL.revokeObjectURL(blobUrlRef.current)
            }
            if (next.startsWith('blob:')) blobUrlRef.current = next
            setUrl(next)
          })
          return
        }
        setHidden(true)
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Palette & typography helpers
// ---------------------------------------------------------------------------

function primaryFont(stack: string | undefined): string {
  if (!stack) return '—'
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack
}

function overviewSwatches(colors: ColorToken[]): ColorToken[] {
  const picked: ColorToken[] = []
  for (const color of colors.filter((item) => item.kind !== 'gradient')) {
    if (picked.length >= 9) break
    const parsed = parseColor(color.hex)
    if (!parsed) continue
    const duplicate = picked.some((item) => {
      const other = parseColor(item.hex)
      return other ? colorDistance(parsed, other) < 24 : false
    })
    if (duplicate) continue
    picked.push(color)
  }
  return picked
}

function isLightHex(hex: string): boolean {
  const parsed = parseColor(hex)
  if (!parsed) return false
  return (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255 > 0.9
}
