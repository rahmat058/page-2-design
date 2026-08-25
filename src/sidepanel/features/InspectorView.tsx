import { useEffect, useState } from 'react'
import { ArrowLeft, Code2, Copy, Download } from 'lucide-react'
import { Button } from '../components/Button'
import { Switch } from '../components/Switch'
import { sendRuntime } from '../chrome-api'
import { createRequestId } from '../../shared/messages'
import type { BoxSides, InspectedAsset, InspectedElement } from '../../shared/messages'
import { isDarkHex } from '../../normalize/colors'
import { extensionFromMimeOrUrl, sanitizeFilename } from '../../export/filename'
import { fetchAssetBytes, revokeObjectUrlLater } from '../download-asset'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

export function InspectorView() {
  const inspected = useScanStore((s) => s.inspected)
  const contextMenu = useScanStore((s) => s.inspectContextMenu)
  const setContextMenu = useScanStore((s) => s.setInspectContextMenu)
  const setInspectOn = useScanStore((s) => s.setInspectOn)
  const [showCode, setShowCode] = useState(false)

  const copy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value)
    useToastStore.getState().showToast(`${label} copied`)
  }

  const toggleContextMenu = (next: boolean) => {
    setContextMenu(next)
    const requestId = createRequestId()
    void sendRuntime({
      type: 'SET_INSPECT_CONTEXT_MENU',
      requestId,
      payload: { enabled: next },
    })
    void sendRuntime({
      type: 'SET_INSPECT_MODE',
      requestId: createRequestId(),
      payload: { enabled: true, contextMenu: next },
    })
  }

  return (
    <section className="inspector-view">
      <div className="inspector-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={() => {
            void toggleInspect(false)
            setInspectOn(false)
          }}>
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <h1>Inspector</h1>
        <Button
          variant="secondary"
          size="sm"
          icon={Code2}
          disabled={!inspected}
          onClick={() => setShowCode((open) => !open)}>
          {showCode ? 'Hide code' : 'Show code'}
        </Button>
      </div>

      <div className="inspector-body">
        <Switch checked={contextMenu} onChange={toggleContextMenu} label="Context menu while hovering" />

        {!inspected ? (
          <div className="inspector-empty">
            <p>Hover any element to inspect it live. Click an element to pin its values.</p>
          </div>
        ) : inspected.asset ? (
          <InspectedImageDetail inspected={inspected} asset={inspected.asset} showCode={showCode} onCopy={copy} />
        ) : (
          <>
            <div className="inspector-target">
              <span className="inspector-kind">{inspected.kind}</span>
              <span className="inspector-label">{inspected.label}</span>
              {inspected.locked ? <span className="inspector-pinned">Pinned</span> : null}
            </div>

            <BoxModel element={inspected} />

            {showCode ? (
              <div className="inspector-section">
                <div className="inspector-section-head">
                  <h2>Code</h2>
                  <button
                    type="button"
                    className="icon-mini"
                    aria-label="Copy code"
                    onClick={() => copy(prettyHtml(inspected.code), 'Code')}>
                    <Copy size={14} strokeWidth={2} />
                  </button>
                </div>
                <pre className="inspector-code">
                  {tokenizeHtml(prettyHtml(inspected.code)).map((token, index) => (
                    <span key={`${token.t}-${index}`} className={`code-${token.t}`}>
                      {token.v}
                    </span>
                  ))}
                </pre>
              </div>
            ) : null}

            <div className="inspector-section">
              <h2>Text properties</h2>
              <dl className="prop-grid">
                <PropRow label="Font Family" value={inspected.typography.fontFamily} />
                <PropRow label="Font Size" value={inspected.typography.fontSize} />
                <PropRow label="Line Height" value={inspected.typography.lineHeight} />
                <PropRow label="Font Weight" value={inspected.typography.fontWeight} />
                <PropRow label="Letter Spacing" value={inspected.typography.letterSpacing} />
                <PropRow
                  label="Text color"
                  value={inspected.typography.color}
                  swatch={inspected.typography.color}
                  onCopy={() => copy(inspected.typography.color, 'Text color')}
                />
              </dl>
            </div>

            <div className="inspector-section">
              <h2>Colors</h2>
              <div className="inspector-colors">
                {inspected.background ? (
                  <ColorCard
                    name="Background"
                    hex={inspected.background}
                    onCopy={() => copy(inspected.background as string, 'Background')}
                  />
                ) : null}
                <ColorCard
                  name="Text"
                  hex={inspected.typography.color}
                  onCopy={() => copy(inspected.typography.color, 'Text color')}
                />
              </div>
            </div>

            <div className="inspector-section">
              <h2>Element properties</h2>
              <dl className="prop-grid">
                <PropRow label="Width" value={`${formatNum(inspected.width)}px`} />
                <PropRow label="Height" value={`${formatNum(inspected.height)}px`} />
                <PropRow label="Border Radius" value={inspected.borderRadius} />
              </dl>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function InspectedImageDetail({
  inspected,
  asset,
  showCode,
  onCopy,
}: {
  inspected: InspectedElement
  asset: InspectedAsset
  showCode: boolean
  onCopy: (value: string, label: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(() =>
    asset.inlineSvg
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.inlineSvg)}`
      : asset.src.startsWith('http') || asset.src.startsWith('data:')
        ? asset.src
        : null,
  )
  const [byteLength, setByteLength] = useState<number | null>(() =>
    asset.inlineSvg ? new Blob([asset.inlineSvg]).size : null,
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    let revoke: string | null = null
    setPreview(
      asset.inlineSvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.inlineSvg)}`
        : asset.src.startsWith('http') || asset.src.startsWith('data:')
          ? asset.src
          : null,
    )
    setByteLength(asset.inlineSvg ? new Blob([asset.inlineSvg]).size : null)

    void (async () => {
      if (asset.inlineSvg) return
      if (!asset.src || asset.src.startsWith('inline:')) return
      try {
        const result = await fetchAssetBytes(asset.src)
        if (cancelled || !result.bytes) return
        setByteLength(result.bytes.byteLength)
        const url = URL.createObjectURL(
          new Blob([result.bytes as BlobPart], { type: result.mimeType || asset.mimeHint || 'image/png' }),
        )
        revoke = url
        setPreview(url)
      } catch {
        /* keep src preview */
      }
    })()

    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [asset])

  const dims =
    asset.intrinsicWidth && asset.intrinsicHeight
      ? `${asset.intrinsicWidth} × ${asset.intrinsicHeight} px`
      : `${asset.renderedWidth} × ${asset.renderedHeight} px`

  const download = async () => {
    setBusy(true)
    try {
      await downloadInspectedAsset(asset)
      useToastStore.getState().showToast('Asset downloaded')
    } catch (error) {
      useToastStore.getState().showToast(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="inspector-image-preview">
        {preview ? <img src={preview} alt={asset.alt || ''} /> : <span className="thumb-empty" aria-hidden="true" />}
      </div>

      <div className="inspector-target">
        <span className="inspector-kind">{inspected.kind || 'Image'}</span>
        <span className="inspector-label">{inspected.label}</span>
        {inspected.locked ? <span className="inspector-pinned">Pinned</span> : null}
      </div>

      {showCode ? (
        <div className="inspector-section">
          <div className="inspector-section-head">
            <h2>Code</h2>
            <button
              type="button"
              className="icon-mini"
              aria-label="Copy code"
              onClick={() => onCopy(prettyHtml(inspected.code), 'Code')}>
              <Copy size={14} strokeWidth={2} />
            </button>
          </div>
          <pre className="inspector-code">
            {tokenizeHtml(prettyHtml(inspected.code)).map((token, index) => (
              <span key={`${token.t}-${index}`} className={`code-${token.t}`}>
                {token.v}
              </span>
            ))}
          </pre>
        </div>
      ) : null}

      <div className="inspector-section">
        <h2>Element properties</h2>
        <dl className="prop-grid">
          <PropRow label="File size" value={byteLength != null ? formatBytes(byteLength) : '—'} />
          <PropRow label="Dimensions" value={dims} />
          {asset.alt ? <PropRow label="Alt" value={asset.alt} /> : null}
        </dl>
      </div>

      <Button icon={Download} disabled={busy} onClick={() => void download()}>
        {busy ? 'Downloading…' : 'Download Asset'}
      </Button>
    </>
  )
}

async function downloadInspectedAsset(asset: InspectedAsset): Promise<void> {
  const ext = asset.inlineSvg ? 'svg' : extensionFromMimeOrUrl(asset.mimeHint, asset.src, 'png')
  const filename = `${sanitizeFilename('inspected-asset', 'asset')}.${ext}`
  let url: string
  let revoke: string | null = null
  if (asset.inlineSvg) {
    url = URL.createObjectURL(new Blob([asset.inlineSvg], { type: 'image/svg+xml' }))
    revoke = url
  } else if (asset.src.startsWith('data:')) {
    url = asset.src
  } else {
    const result = await fetchAssetBytes(asset.src)
    if (!result.bytes) throw new Error(result.error || 'Could not fetch asset')
    url = URL.createObjectURL(
      new Blob([result.bytes as BlobPart], { type: result.mimeType || asset.mimeHint || 'image/png' }),
    )
    revoke = url
  }
  try {
    await new Promise<void>((resolve, reject) => {
      if (!chrome.downloads?.download) {
        reject(new Error('Downloads API unavailable'))
        return
      }
      chrome.downloads.download({ url, filename, saveAs: true }, (id) => {
        if (chrome.runtime.lastError || typeof id !== 'number') {
          reject(new Error(chrome.runtime.lastError?.message ?? 'Download failed'))
          return
        }
        resolve()
      })
    })
  } finally {
    if (revoke) revokeObjectUrlLater(revoke)
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function BoxModel({ element }: { element: InspectedElement }) {
  const { margin, border, padding } = element.box
  return (
    <div className="box-model" aria-label="Box model">
      <div className="bm-layer bm-margin">
        <span className="bm-caption">margin</span>
        <SideLabels sides={margin} />
        <div className="bm-layer bm-border">
          <span className="bm-caption">border</span>
          <SideLabels sides={border} />
          <div className="bm-layer bm-padding">
            <span className="bm-caption">padding</span>
            <SideLabels sides={padding} />
            <div className="bm-content">
              <span className="inspector-box-dim">
                {formatNum(element.width)} × {formatNum(element.height)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SideLabels({ sides }: { sides: BoxSides }) {
  return (
    <>
      <span className="bm-side bm-top">{formatNum(sides.top)}</span>
      <span className="bm-side bm-right">{formatNum(sides.right)}</span>
      <span className="bm-side bm-bottom">{formatNum(sides.bottom)}</span>
      <span className="bm-side bm-left">{formatNum(sides.left)}</span>
    </>
  )
}

function PropRow({
  label,
  value,
  swatch,
  onCopy,
}: {
  label: string
  value: string
  swatch?: string
  onCopy?: () => void
}) {
  return (
    <div className="prop-row">
      <dt>{label}</dt>
      <dd>
        {swatch ? <span className="prop-swatch" style={{ background: swatch }} /> : null}
        <span className="prop-value" title={value}>
          {value}
        </span>
        {onCopy ? (
          <button type="button" className="icon-mini" aria-label={`Copy ${label}`} onClick={onCopy}>
            <Copy size={13} strokeWidth={2} />
          </button>
        ) : null}
      </dd>
    </div>
  )
}

function ColorCard({ name, hex, onCopy }: { name: string; hex: string; onCopy: () => void }) {
  const dark = isDarkHex(hex)
  return (
    <div className={dark ? 'inspector-color-card is-dark' : 'inspector-color-card'} style={{ background: hex }}>
      <div className="inspector-color-meta">
        <span className="inspector-color-name">{name}</span>
        <span className="inspector-color-hex">{hex}</span>
      </div>
      <button type="button" className="icon-mini on-color" aria-label={`Copy ${name}`} onClick={onCopy}>
        <Copy size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function prettyHtml(html: string): string {
  const parts = html
    .replace(/\s*\n\s*/g, ' ')
    .split(/(<\/?[^>]+>)/g)
    .filter((part) => part.length)
  let indent = 0
  let out = ''
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1)
      out += `${'  '.repeat(indent)}${trimmed}\n`
      continue
    }
    if (trimmed.startsWith('<')) {
      out += `${'  '.repeat(indent)}${trimmed}\n`
      const name = trimmed.match(/^<\/?([A-Za-z][\w:-]*)/)?.[1]?.toLowerCase()
      const selfClosing = trimmed.endsWith('/>') || (name ? VOID_TAGS.has(name) : false) || trimmed.startsWith('<!')
      if (!selfClosing) indent += 1
      continue
    }
    out += `${'  '.repeat(indent)}${trimmed}\n`
  }
  return out.trim()
}

type CodeToken = { t: 'tag' | 'attr' | 'value' | 'punct' | 'text' | 'comment'; v: string }

function tokenizeHtml(html: string): CodeToken[] {
  const tokens: CodeToken[] = []
  let i = 0
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4)
      const next = end === -1 ? html.length : end + 3
      tokens.push({ t: 'comment', v: html.slice(i, next) })
      i = next
      continue
    }
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end === -1) {
        tokens.push({ t: 'text', v: html.slice(i) })
        break
      }
      tokens.push(...tokenizeTag(html.slice(i, end + 1)))
      i = end + 1
      continue
    }
    const next = html.indexOf('<', i)
    const end = next === -1 ? html.length : next
    tokens.push({ t: 'text', v: html.slice(i, end) })
    i = end
  }
  return tokens
}

function tokenizeTag(tag: string): CodeToken[] {
  const match = tag.match(/^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/)
  if (!match) return [{ t: 'punct', v: tag }]
  const tokens: CodeToken[] = [
    { t: 'punct', v: match[1] as string },
    { t: 'tag', v: match[2] as string },
  ]
  const body = match[3] as string
  const attrRe = /(\s+)([A-Za-z_:][\w:.-]*)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g
  let last = 0
  let found: RegExpExecArray | null
  while ((found = attrRe.exec(body))) {
    if (found.index > last) tokens.push({ t: 'text', v: body.slice(last, found.index) })
    tokens.push({ t: 'text', v: found[1] as string })
    tokens.push({ t: 'attr', v: found[2] as string })
    if (found[3]) tokens.push({ t: 'punct', v: found[3] })
    if (found[4]) tokens.push({ t: 'value', v: found[4] })
    last = found.index + found[0].length
  }
  if (last < body.length) tokens.push({ t: 'text', v: body.slice(last) })
  tokens.push({ t: 'punct', v: match[4] as string })
  return tokens
}

async function toggleInspect(enabled: boolean): Promise<void> {
  await sendRuntime({
    type: 'SET_INSPECT_MODE',
    requestId: createRequestId(),
    payload: { enabled },
  })
}
