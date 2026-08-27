/**
 * Design System accordion: colors, typography, components, tokens, and export.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Box, ChevronDown, Copy, Download, FileJson, Palette, Ruler, Sparkles, Type, Wind } from 'lucide-react'
import { isDarkHex } from '../../normalize/colors'
import type { NormalizedDesign } from '../../shared/types'
import { Button } from '../components/Button'
import { revokeObjectUrlLater } from '../download-asset'
import {
  buildDesignSystem,
  exportDesignSystem,
  exportFilename,
  typeScaleToken,
  type DesignExportFormat,
  type DesignSystemModel,
} from '../lib/design-system'
import { useToastStore } from '../toast'

const EXPORT_TABS: Array<{ id: DesignExportFormat; label: string }> = [
  { id: 'css', label: 'CSS' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
  { id: 'design-md', label: 'Design.md' },
]

const MODERN_FORMATS: Array<{
  id: DesignExportFormat
  title: string
  description: string
  tone: 'tailwind' | 'shadcn' | 'tokens'
  icon: typeof Wind
}> = [
  { id: 'tailwind', title: 'Tailwind v4', description: 'Drop into globals.css', tone: 'tailwind', icon: Wind },
  { id: 'shadcn', title: 'shadcn/ui', description: 'Ready for components', tone: 'shadcn', icon: Box },
  { id: 'json', title: 'Design Tokens', description: 'For Figma & Style Dictionary', tone: 'tokens', icon: FileJson },
]

export function DesignSystemPanel({ design }: { design: NormalizedDesign }) {
  const model = useMemo(() => buildDesignSystem(design), [design])
  const siteName = design.metadata.ogTitle || design.metadata.title || design.metadata.hostname || 'Page2Design'
  const [open, setOpen] = useState({
    colors: true,
    typography: true,
    components: false,
    tokens: false,
    export: true,
  })

  return (
    <div className="ds-panel">
      <DsSection
        title="Colors"
        icon={<Palette size={15} strokeWidth={2} aria-hidden="true" />}
        open={open.colors}
        onToggle={() => setOpen((s) => ({ ...s, colors: !s.colors }))}>
        <ColorsBlock model={model} />
      </DsSection>

      <DsSection
        title="Typography"
        icon={<Type size={15} strokeWidth={2} aria-hidden="true" />}
        open={open.typography}
        onToggle={() => setOpen((s) => ({ ...s, typography: !s.typography }))}>
        <TypographyBlock model={model} />
      </DsSection>

      <DsSection
        title="Components"
        icon={<Sparkles size={15} strokeWidth={2} aria-hidden="true" />}
        open={open.components}
        onToggle={() => setOpen((s) => ({ ...s, components: !s.components }))}>
        <ComponentsBlock model={model} />
      </DsSection>

      <DsSection
        title="Tokens"
        icon={<Ruler size={15} strokeWidth={2} aria-hidden="true" />}
        open={open.tokens}
        onToggle={() => setOpen((s) => ({ ...s, tokens: !s.tokens }))}>
        <TokensBlock model={model} />
      </DsSection>

      <DsSection
        title="Export"
        icon={<Download size={15} strokeWidth={2} aria-hidden="true" />}
        open={open.export}
        onToggle={() => setOpen((s) => ({ ...s, export: !s.export }))}>
        <ExportBlock model={model} siteName={siteName} />
      </DsSection>
    </div>
  )
}

function DsSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className={open ? 'ds-section open' : 'ds-section'}>
      <button type="button" className="ds-section-head" aria-expanded={open} onClick={onToggle}>
        <ChevronDown size={14} strokeWidth={2} className="ds-chevron" aria-hidden="true" />
        {icon}
        <strong>{title}</strong>
      </button>
      {open ? <div className="ds-section-body">{children}</div> : null}
    </section>
  )
}

function ColorsBlock({ model }: { model: DesignSystemModel }) {
  return (
    <div className="ds-stack">
      {model.scales.map((scale) => (
        <div key={scale.id} className="ds-scale-row">
          <div className="ds-scale-meta">
            <strong>{scale.name}</strong>
            <code>{scale.baseHex}</code>
          </div>
          <div className="ds-scale-swatches">
            {scale.steps.map((step) => (
              <button
                key={step.step}
                type="button"
                className="ds-scale-swatch"
                style={{ background: step.hex }}
                title={`${scale.name} ${step.step}: ${step.hex}`}
                aria-label={`Copy ${scale.name} ${step.step} ${step.hex}`}
                onClick={() => void copyText(step.hex, step.hex)}
              />
            ))}
          </div>
        </div>
      ))}

      {model.semantic.length ? (
        <div
          className="ds-semantic"
          style={{ gridTemplateColumns: `repeat(${Math.min(3, model.semantic.length)}, minmax(0, 1fr))` }}>
          {model.semantic.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ds-semantic-card"
              onClick={() => void copyText(item.hex, item.hex)}>
              <span className="ds-semantic-swatch" style={{ background: item.hex }} />
              <span>
                <strong>{item.name}</strong>
                <code>{item.hex}</code>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {model.gradients.length ? (
        <div className="ds-grad-block">
          <p className="ds-kicker">Gradients</p>
          <div className="ds-grad-list">
            {model.gradients.map((grad, index) => {
              const label = gradientLabel(grad.name, index)
              return (
                <button
                  key={grad.id}
                  type="button"
                  className="ds-grad-card"
                  onClick={() => void copyText(grad.css || grad.hex, label)}>
                  <span className="ds-grad-preview" style={{ background: grad.css || grad.hex }} />
                  <span>
                    <strong>{label}</strong>
                    <code title={grad.css}>{truncate(grad.css || grad.hex, 48)}</code>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TypographyBlock({ model }: { model: DesignSystemModel }) {
  return (
    <div className="ds-stack">
      <div className="ds-type-cards">
        <div className="ds-type-card">
          <p className="ds-kicker">Body</p>
          <strong style={{ fontFamily: model.bodyFont }}>{model.bodyFont}</strong>
        </div>
        <div className="ds-type-card">
          <p className="ds-kicker">Headings</p>
          <strong style={{ fontFamily: model.headingFont }}>{model.headingFont}</strong>
        </div>
      </div>

      <div className="ds-pair">
        <p className="ds-kicker">Pair preview</p>
        <h3 style={{ fontFamily: model.headingFont }}>The quick brown fox</h3>
        <p style={{ fontFamily: model.bodyFont }}>
          Heading and body fonts from this page, paired for a quick readability check.
        </p>
      </div>

      {model.typeScale.length ? (
        <div className="ds-type-scale">
          <p className="ds-kicker">Type scale</p>
          {model.typeScale.map((row) => {
            const token = typeScaleToken(row.label, row.rem)
            return (
              <button
                key={row.id}
                type="button"
                className="ds-type-scale-row"
                aria-label={`Copy ${token}`}
                onClick={() => void copyText(token, token)}>
                <span className="ds-type-label">{row.label}</span>
                <span className="ds-type-sample" style={{ fontFamily: model.headingFont, fontSize: row.size }}>
                  {row.sample}
                </span>
                <code>{row.rem}</code>
                <span className="ds-type-copy" aria-hidden="true">
                  <Copy size={13} strokeWidth={2} />
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ComponentsBlock({ model }: { model: DesignSystemModel }) {
  const style = {
    ['--ds-primary' as string]: model.primary,
    ['--ds-secondary' as string]: model.secondary,
    ['--ds-accent' as string]: model.accent,
    ['--ds-neutral' as string]: model.neutral,
    ['--ds-primary-ink' as string]: inkOn(model.primary),
    ['--ds-secondary-ink' as string]: inkOn(model.secondary),
    ['--ds-accent-ink' as string]: inkOn(model.accent),
    ['--ds-neutral-ink' as string]: inkOn(model.neutral),
    ['--ds-radius' as string]: model.radius,
    ['--ds-font' as string]: model.bodyFont,
    ['--ds-font-display' as string]: model.headingFont,
  }
  return (
    <div className="ds-components" style={style}>
      <p className="ds-kicker">Buttons</p>
      <div className="ds-demo-row">
        <button type="button" className="ds-demo-btn primary">
          Primary
        </button>
        <button type="button" className="ds-demo-btn secondary">
          Secondary
        </button>
        <button type="button" className="ds-demo-btn accent">
          Accent
        </button>
        <button type="button" className="ds-demo-btn neutral">
          Neutral
        </button>
      </div>
      <div className="ds-demo-row">
        <button type="button" className="ds-demo-btn outline">
          Outline
        </button>
        <button type="button" className="ds-demo-btn ghost">
          Ghost
        </button>
      </div>

      <p className="ds-kicker">Badges</p>
      <div className="ds-demo-row">
        <span className="ds-demo-badge primary">Primary</span>
        <span className="ds-demo-badge secondary">Secondary</span>
        <span className="ds-demo-badge accent">Accent</span>
        <span className="ds-demo-badge neutral">Neutral</span>
      </div>

      <p className="ds-kicker">Input</p>
      <input className="ds-demo-input" placeholder="Enter your email…" readOnly />

      <p className="ds-kicker">Card</p>
      <div className="ds-demo-card">
        <strong>Card title</strong>
        <p>Sample card using this page’s primary, radius, and typography tokens.</p>
      </div>
    </div>
  )
}

function inkOn(hex: string): string {
  return isDarkHex(hex) ? '#ffffff' : '#111111'
}

function TokensBlock({ model }: { model: DesignSystemModel }) {
  const { spacing, radii, shadows } = model.tokenRows
  return (
    <div className="ds-stack">
      {spacing.length ? (
        <div>
          <p className="ds-kicker">Spacing</p>
          <div className="ds-space-list">
            {spacing.map((row) => (
              <button
                key={row.id}
                type="button"
                className="ds-space-row"
                aria-label={`Copy ${row.tw}`}
                onClick={() => void copyText(row.tw, row.label)}>
                <span className="ds-token-label">{row.label}</span>
                <span className="ds-space-bar" style={{ width: `${Math.min(112, Math.max(8, row.px * 1.6))}px` }} />
                <span className="ds-token-meta">
                  <code>{row.value}</code>
                  <span className="ds-tw">{row.tw}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {radii.length ? (
        <div>
          <p className="ds-kicker">Border radius</p>
          <div className="ds-radius-list">
            {radii.map((row) => (
              <button
                key={row.id}
                type="button"
                className="ds-radius-row-item"
                aria-label={`Copy ${row.tw}`}
                onClick={() => void copyText(row.tw, row.label)}>
                <span className="ds-radius-preview" style={{ borderRadius: row.value }} />
                <span className="ds-token-meta">
                  <strong>{row.label}</strong>
                  <code>{row.value}</code>
                  <span className="ds-tw">{row.tw}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {shadows.length ? (
        <div>
          <p className="ds-kicker">Shadows</p>
          <div className="ds-shadow-list">
            {shadows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="ds-shadow-row"
                onClick={() => void copyText(row.tw, row.label)}>
                <span className="ds-shadow-preview" style={{ boxShadow: row.value }} />
                <span className="ds-token-meta">
                  <strong>{row.label}</strong>
                  <span className="ds-tw">{row.tw}</span>
                  <code title={row.value}>{truncate(row.value, 42)}</code>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!spacing.length && !radii.length && !shadows.length ? (
        <p className="muted">No spacing, radius, or shadow tokens on this scan.</p>
      ) : null}
    </div>
  )
}

function ExportBlock({ model, siteName }: { model: DesignSystemModel; siteName: string }) {
  const [format, setFormat] = useState<DesignExportFormat>('css')
  const text = useMemo(() => exportDesignSystem(model, format, siteName), [model, format, siteName])

  return (
    <div className="ds-export">
      <div className="ds-export-tabs" role="tablist" aria-label="Export format">
        {EXPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={format === tab.id ? 'on' : ''}
            aria-selected={format === tab.id}
            onClick={() => setFormat(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="ds-export-preview">{text}</pre>
      <div className="ds-export-actions">
        <Button
          variant="secondary"
          size="sm"
          icon={Copy}
          onClick={() => void copyText(text, EXPORT_TABS.find((t) => t.id === format)?.label ?? 'Export')}>
          Copy
        </Button>
        <Button size="sm" icon={Download} onClick={() => void downloadText(text, exportFilename(format))}>
          Download
        </Button>
      </div>
      <ModernFormatsBlock model={model} siteName={siteName} />
    </div>
  )
}

function ModernFormatsBlock({ model, siteName }: { model: DesignSystemModel; siteName: string }) {
  return (
    <div className="ds-modern">
      <header className="ds-modern-head">
        <p className="ds-kicker">
          <Sparkles size={12} strokeWidth={2} aria-hidden="true" /> Modern formats
        </p>
        <p className="muted">Production-ready output for today’s design tools</p>
      </header>
      <ul className="ds-modern-list">
        {MODERN_FORMATS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              <button
                type="button"
                className="ds-modern-card"
                onClick={() =>
                  void downloadText(exportDesignSystem(model, item.id, siteName), exportFilename(item.id))
                }>
                <span className={`ds-modern-icon ${item.tone}`} aria-hidden="true">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <span className="ds-modern-copy">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <Download size={16} strokeWidth={2} className="ds-modern-dl" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

async function copyText(value: string, label: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  useToastStore.getState().showToast(`${label} copied`)
}

async function downloadText(text: string, filename: string): Promise<void> {
  const type = filename.endsWith('.json')
    ? 'application/json'
    : filename.endsWith('.md')
      ? 'text/markdown;charset=utf-8'
      : 'text/plain;charset=utf-8'
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  await chrome.downloads.download({ url, filename, saveAs: true })
  revokeObjectUrlLater(url)
  useToastStore.getState().showToast(`${filename} downloaded`)
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

function gradientLabel(name: string, index: number): string {
  if (!name || /^(radial|linear|conic)\s*gradient$/i.test(name.trim())) return `Brand ${index + 1}`
  return name
}
