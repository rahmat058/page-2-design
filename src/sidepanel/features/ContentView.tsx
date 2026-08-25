/**
 * Content and assets tabs: section-grouped text blocks and grid/list visual assets.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AssetRecord, ContentBlock } from '../../shared/types'
import { uniqueVisualAssets } from '../../content/asset-scanner'
import { CountBadge } from '../components/CountBadge'
import { ScanPrompt } from '../components/CopyButton'
import { CollectionShell } from '../components/Segmented'
import { LazyMount, VirtualList } from '../components/VirtualList'
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
import { contentKindLabel, groupContentBySection, panelContentBlocks } from '../content-groups'
import { EMPTY_ASSETS, EMPTY_CONTENT, EMPTY_SECTIONS } from '../empty'
import {
  assetDownloadName,
  assetPreviewUrl,
  downloadSingleAsset,
  estimateAssetSize,
  objectUrlForAsset,
} from '../download-asset'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

// ---------------------------------------------------------------------------
// Content view
// ---------------------------------------------------------------------------

export function ContentView() {
  const blocks = useScanStore((s) => s.design?.content ?? EMPTY_CONTENT)
  const sections = useScanStore((s) => s.design?.sections ?? EMPTY_SECTIONS)
  const visible = useMemo(() => panelContentBlocks(blocks), [blocks])
  const groups = useMemo(() => groupContentBySection(visible, sections), [visible, sections])
  if (visible.length === 0) {
    return <ScanPrompt afterScan="No content blocks were captured." />
  }
  return (
    <div className="content-wrap">
      <div className="content-scroll">
        {groups.map((group) => (
          <section key={group.id} className="content-section">
            <div className="content-section-head">
              <h2>{group.name}</h2>
              <CountBadge value={group.blocks.length} />
            </div>
            <VirtualList
              className="content-list"
              count={group.blocks.length}
              itemHeight={64}
              maxHeight={480}
              renderItem={(index) => {
                const block = group.blocks[index]
                return block ? <ContentRow block={block} /> : null
              }}
            />
          </section>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Content row helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Assets view
// ---------------------------------------------------------------------------

const ASSET_TABS = [
  { value: 'grid', label: 'Grid', icon: <GridViewIcon /> },
  { value: 'list', label: 'List', icon: <ListViewIcon /> },
] as const

export function AssetsView() {
  const assets = useScanStore((s) => s.design?.assets ?? EMPTY_ASSETS)
  const unique = useMemo(() => uniqueVisualAssets(assets), [assets])
  const [mode, setMode] = useState<'grid' | 'list'>('grid')
  if (unique.length === 0) return <ScanPrompt afterScan="No assets were captured." />
  return (
    <CollectionShell value={mode} options={ASSET_TABS} onChange={setMode} label="Asset layout">
      {mode === 'grid' ? (
        <div className="asset-grid">
          {unique.map((asset, index) => (
            <LazyMount
              key={asset.id}
              className="asset-tile-lazy"
              placeholder={<div className="asset-tile asset-tile-placeholder" aria-hidden="true" />}>
              <AssetTile asset={asset} index={index} />
            </LazyMount>
          ))}
        </div>
      ) : (
        <VirtualList
          className="asset-list"
          count={unique.length}
          itemHeight={68}
          maxHeight={520}
          renderItem={(index) => {
            const asset = unique[index]
            return asset ? <AssetRow asset={asset} index={index} /> : null
          }}
        />
      )}
    </CollectionShell>
  )
}

// ---------------------------------------------------------------------------
// Asset tiles & previews
// ---------------------------------------------------------------------------

function AssetTile({ asset, index }: { asset: AssetRecord; index: number }) {
  const size = estimateAssetSize(asset)
  const name = assetDownloadName(asset)
  return (
    <div className="asset-tile" style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}>
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

function AssetRow({ asset, index }: { asset: AssetRecord; index: number }) {
  const size = estimateAssetSize(asset)
  const name = assetDownloadName(asset)
  return (
    <div className="asset-row" style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}>
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
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setFailed(false)

    const clearBlob = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }

    const adopt = (url: string | null | undefined) => {
      if (cancelled || !url) return
      clearBlob()
      if (url.startsWith('blob:')) blobUrlRef.current = url
      setSrc(url)
    }

    const direct = assetPreviewUrl(asset)
    if (direct && !asset.resolvedUrl.startsWith('blob:')) {
      clearBlob()
      setSrc(direct)
      return () => {
        cancelled = true
      }
    }

    void objectUrlForAsset(asset).then(adopt)
    return () => {
      cancelled = true
      clearBlob()
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
          if (!url) {
            setSrc(undefined)
            return
          }
          if (blobUrlRef.current && blobUrlRef.current !== url) {
            URL.revokeObjectURL(blobUrlRef.current)
          }
          if (url.startsWith('blob:')) blobUrlRef.current = url
          setSrc(url)
        })
      }}
    />
  )
}
