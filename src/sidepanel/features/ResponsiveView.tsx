/**
 * Responsive: device list in the extension panel, live preview card to its left.
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus, RefreshCw, RotateCw, Search, Smartphone, Tablet, Monitor } from 'lucide-react'
import type { DeviceCategory, DeviceOrientation, DevicePreset } from '../../shared/device-presets'
import {
  DEVICE_CATEGORIES,
  DEVICE_PRESETS,
  categoryLabel,
  defaultOrientation,
  devicesInCategory,
  filterDevices,
  formatDpr,
  formatViewport,
  orientedSize,
  previewFrame,
} from '../../shared/device-presets'
import { OVERLAY_PREVIEW_MIN } from '../../shared/constants'
import { useScanStore } from '../store/useScanStore'

const CATEGORY_ICON: Record<DeviceCategory, typeof Smartphone> = {
  responsive: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
}

export function ResponsiveDeviceList({
  selected,
  orientation,
  onPick,
}: {
  selected: DevicePreset | null
  orientation: DeviceOrientation
  onPick: (device: DevicePreset) => void
}) {
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<DeviceCategory, boolean>>({
    responsive: true,
    phone: false,
    tablet: false,
    desktop: false,
  })
  const matches = useMemo(() => filterDevices(DEVICE_PRESETS, query), [query])

  useEffect(() => {
    if (!query.trim()) return
    setOpen((current) => {
      const next = { ...current }
      for (const category of DEVICE_CATEGORIES) {
        next[category.id] = devicesInCategory(matches, category.id).length > 0
      }
      return next
    })
  }, [query, matches])

  return (
    <div className="rsp-list-panel">
      {tabRestricted ? <p className="muted rsp-note">Open an http(s) page to preview breakpoints.</p> : null}
      <label className="rsp-search">
        <Search size={14} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Search devices..."
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="rsp-flyout-body">
        {DEVICE_CATEGORIES.map((category) => {
          const items = devicesInCategory(matches, category.id)
          if (items.length === 0) return null
          const Icon = CATEGORY_ICON[category.id]
          const expanded = open[category.id]
          return (
            <section key={category.id} className={expanded ? 'rsp-group open' : 'rsp-group'}>
              <button
                type="button"
                className="rsp-group-head"
                aria-expanded={expanded}
                onClick={() => setOpen((current) => ({ ...current, [category.id]: !current[category.id] }))}>
                <Icon size={14} strokeWidth={2} aria-hidden="true" />
                <strong>{category.label}</strong>
                <span>{items.length}</span>
                <ChevronDown size={14} strokeWidth={2} className="rsp-chevron" aria-hidden="true" />
              </button>
              {expanded ? (
                <ul className="rsp-list">
                  {items.map((device) => {
                    const nextOrientation = device.id === selected?.id ? orientation : defaultOrientation(device)
                    const itemSize = orientedSize(device, nextOrientation)
                    const on = selected?.id === device.id
                    return (
                      <li key={device.id}>
                        <button
                          type="button"
                          className={on ? 'rsp-item is-on' : 'rsp-item'}
                          onClick={() => onPick(device)}>
                          <span className="rsp-item-copy">
                            <strong>{device.name}</strong>
                            <span>
                              {formatDpr(device.dpr)} · {categoryLabel(device.category)}
                            </span>
                          </span>
                          <span className="rsp-item-size">{formatViewport(itemSize.width, itemSize.height)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function ResponsivePreviewCard({
  selected,
  orientation,
  zoom,
  previewKey,
  onClose,
  onRotate,
  onZoom,
  onReload,
}: {
  selected: DevicePreset | null
  orientation: DeviceOrientation
  zoom: number
  previewKey: number
  onClose: () => void
  onRotate: () => void
  onZoom: (next: number) => void
  onReload: () => void
}) {
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const url = useScanStore((s) => s.url)
  const size = selected ? orientedSize(selected, orientation) : { width: 800, height: 600 }
  const windowSize = previewFrame(selected, size, selected ? zoom : 1)
  const cardWidth = selected ? Math.max(OVERLAY_PREVIEW_MIN, windowSize.width) : OVERLAY_PREVIEW_MIN

  return (
    <aside className="rsp-mac" style={{ width: cardWidth }} aria-label="Responsive preview">
      <header className="rsp-mac-bar">
        <span className="rsp-traffic" aria-hidden="true">
          <button type="button" className="rsp-tl close" aria-label="Close responsive" onClick={onClose} />
          <span className="rsp-tl min" />
          <span className="rsp-tl max" />
        </span>
        <p className="rsp-mac-title">
          {selected ? selected.name : 'Responsive'}
          <span>
            {formatViewport(size.width, size.height)} {formatDpr(selected?.dpr ?? 1)}
          </span>
        </p>
        <span className="rsp-mac-tools">
          <button type="button" className="rsp-mac-btn" aria-label="Reload preview" onClick={onReload}>
            <RefreshCw size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="rsp-mac-btn"
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() => onZoom(Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10))}>
            <Minus size={13} strokeWidth={2} />
          </button>
          <span className="rsp-zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rsp-mac-btn"
            aria-label="Zoom in"
            disabled={zoom >= 1.5}
            onClick={() => onZoom(Math.min(1.5, Math.round((zoom + 0.1) * 10) / 10))}>
            <Plus size={13} strokeWidth={2} />
          </button>
          <button type="button" className="rsp-mac-btn" aria-label="Rotate viewport" onClick={onRotate}>
            <RotateCw size={13} strokeWidth={2} />
          </button>
        </span>
      </header>
      {selected ? (
        <BreakpointPreview
          url={tabRestricted ? null : url}
          size={size}
          windowSize={windowSize}
          title={selected.name}
          reloadKey={previewKey}
        />
      ) : (
        <div className="rsp-mac-empty">Pick a device to preview this breakpoint.</div>
      )}
    </aside>
  )
}

function BreakpointPreview({
  url,
  size,
  windowSize,
  title,
  reloadKey,
}: {
  url: string | null
  size: { width: number; height: number }
  windowSize: { width: number; height: number; scale: number }
  title: string
  reloadKey: number
}) {
  return (
    <div className="rsp-mac-body" style={{ width: windowSize.width, height: windowSize.height }}>
      {url ? (
        <iframe
          key={`${reloadKey}-${size.width}x${size.height}`}
          className="rsp-preview-frame"
          title={`${title} preview`}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${windowSize.scale})`,
          }}
        />
      ) : (
        <div className="rsp-preview-empty">{formatViewport(size.width, size.height)}</div>
      )}
    </div>
  )
}
