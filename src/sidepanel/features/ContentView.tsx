import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AssetRecord, ContentBlock } from '../../shared/types'
import { uniqueVisualAssets } from '../../content/asset-scanner'
import { ScanPrompt } from '../components/CopyButton'
import {
  AriaBlockIcon,
  ButtonBlockIcon,
  CopyIcon,
  DownloadIcon,
  GridViewIcon,
  HeadingBlockIcon,
  LabelBlockIcon,
  LinkBlockIcon,
  ListBlockIcon,
  ListViewIcon,
  NavBlockIcon,
  ParagraphBlockIcon,
  PlaceholderBlockIcon,
  TableBlockIcon,
} from '../components/LucideIcons'
import { contentKindLabel, copyContentPlain, groupContentBySection, panelContentBlocks } from '../content-groups'
import {
  assetDownloadName,
  assetPreviewUrl,
  downloadSingleAsset,
  estimateAssetSize,
  objectUrlForAsset,
} from '../download-asset'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

export function ContentView() {
  const blocks = useScanStore((s) => s.design?.content ?? [])
  const sections = useScanStore((s) => s.design?.sections ?? [])
  const visible = useMemo(() => panelContentBlocks(blocks), [blocks])
  const groups = useMemo(() => groupContentBySection(visible, sections), [visible, sections])
  if (visible.length === 0) {
    return <ScanPrompt afterScan="No content blocks were captured." />
  }
  return (
    <div className="content-wrap">
      <div className="content-toolbar">
        <button type="button" className="copy-values" onClick={() => void copyAllContent(copyContentPlain(groups))}>
          <CopyIcon />
          Copy all
        </button>
      </div>
      <div className="content-scroll">
        {groups.map((group) => (
          <section key={group.id} className="content-section">
            <div className="content-section-head">
              <h2>{group.name}</h2>
              <span className="count-pill">{group.blocks.length}</span>
            </div>
            <div className="content-list">
              {group.blocks.map((block) => (
                <ContentRow key={block.id} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ContentRow({ block }: { block: ContentBlock }) {
  const label = contentKindLabel(block)
  return (
    <article className="content-row">
      <span className="content-kind" title={label} aria-hidden="true">
        {kindIcon(block.kind)}
      </span>
      <div className="content-copy">
        <span className="muted">{label}</span>
        <strong>{block.text}</strong>
        {block.href ? <span className="content-href">{block.href}</span> : null}
      </div>
      <button
        type="button"
        className="icon-btn download"
        aria-label={`Copy ${label}`}
        onClick={() => void copyBlock(block)}>
        <CopyIcon />
      </button>
    </article>
  )
}

function kindIcon(kind: ContentBlock['kind']): ReactNode {
  if (kind === 'heading') return <HeadingBlockIcon />
  if (kind === 'paragraph') return <ParagraphBlockIcon />
  if (kind === 'list' || kind === 'list-item') return <ListBlockIcon />
  if (kind === 'link') return <LinkBlockIcon />
  if (kind === 'button') return <ButtonBlockIcon />
  if (kind === 'navigation') return <NavBlockIcon />
  if (kind === 'label') return <LabelBlockIcon />
  if (kind === 'placeholder') return <PlaceholderBlockIcon />
  if (kind === 'table') return <TableBlockIcon />
  if (kind === 'aria') return <AriaBlockIcon />
  return <ParagraphBlockIcon />
}

async function copyBlock(block: ContentBlock): Promise<void> {
  const value = block.href ? `${block.text}\n${block.href}` : block.text
  await navigator.clipboard.writeText(value)
  useToastStore.getState().showToast(`${contentKindLabel(block)} copied`)
}

async function copyAllContent(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  useToastStore.getState().showToast('All content copied')
}

export function AssetsView() {
  const assets = useScanStore((s) => s.design?.assets ?? [])
  const unique = useMemo(() => uniqueVisualAssets(assets), [assets])
  const [mode, setMode] = useState<'grid' | 'list'>('grid')
  if (unique.length === 0) return <ScanPrompt afterScan="No assets were captured." />
  return (
    <div className="assets-wrap">
      <div className="segmented pill-tabs asset-tabs" role="tablist" aria-label="Asset layout">
        <button
          type="button"
          role="tab"
          className={mode === 'grid' ? 'on' : ''}
          aria-selected={mode === 'grid'}
          onClick={() => {
            if (mode === 'grid') return
            setMode('grid')
            useToastStore.getState().showToast('Grid view')
          }}>
          <GridViewIcon />
          Grid
        </button>
        <button
          type="button"
          role="tab"
          className={mode === 'list' ? 'on' : ''}
          aria-selected={mode === 'list'}
          onClick={() => {
            if (mode === 'list') return
            setMode('list')
            useToastStore.getState().showToast('List view')
          }}>
          <ListViewIcon />
          List
        </button>
      </div>
      <div key={mode} className="fade-pane asset-scroll">
        {mode === 'grid' ? (
          <div className="asset-grid">
            {unique.map((asset) => (
              <AssetTile key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="asset-list">
            {unique.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssetTile({ asset }: { asset: AssetRecord }) {
  const size = estimateAssetSize(asset)
  const name = assetDownloadName(asset)
  return (
    <div className="asset-tile">
      <AssetPreview asset={asset} />
      <div className="asset-hover">
        <button
          type="button"
          className="icon-btn download"
          aria-label={`Download ${name}`}
          onClick={() => void downloadSingleAsset(asset)}>
          <DownloadIcon />
        </button>
        <span className="asset-meta">{name}</span>
        {size ? <span className="asset-meta">{size}</span> : null}
      </div>
    </div>
  )
}

function AssetRow({ asset }: { asset: AssetRecord }) {
  const size = estimateAssetSize(asset)
  const name = assetDownloadName(asset)
  return (
    <div className="asset-row">
      <AssetPreview asset={asset} />
      <div className="asset-row-copy">
        <strong>{name}</strong>
        <span className="muted">{size ?? asset.type}</span>
      </div>
      <button
        type="button"
        className="icon-btn download"
        aria-label={`Download ${name}`}
        onClick={() => void downloadSingleAsset(asset)}>
        <DownloadIcon />
      </button>
    </div>
  )
}

function AssetPreview({ asset }: { asset: AssetRecord }) {
  const [src, setSrc] = useState<string | undefined>(() => assetPreviewUrl(asset))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    setFailed(false)
    const direct = assetPreviewUrl(asset)
    if (direct && !asset.resolvedUrl.startsWith('blob:')) {
      setSrc(direct)
      return () => undefined
    }
    void objectUrlForAsset(asset).then((url) => {
      if (cancelled || !url) return
      revoked = url.startsWith('blob:') ? url : null
      setSrc(url)
    })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [asset])

  if (!src) return <span className="thumb-empty" aria-hidden="true" />
  return (
    <img
      alt=""
      src={src}
      onError={() => {
        if (failed) {
          setSrc(undefined)
          return
        }
        setFailed(true)
        void objectUrlForAsset(asset).then((url) => {
          if (url) setSrc(url)
        })
      }}
    />
  )
}
