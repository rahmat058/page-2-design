import { useState } from 'react'
import { sendRuntime } from '../chrome-api'
import { createRequestId, createScanId } from '../../shared/messages'
import { downloadAssets, dataUrlToBytes } from '../../export/asset-downloader'
import { buildExportZip } from '../../export/zip-exporter'
import { calculateCoverage } from '../../validation/coverage'
import { useScanStore } from '../store/useScanStore'
import { uniqueVisualAssets } from '../../content/asset-scanner'
import { Archive, Ban, ListChecks } from 'lucide-react'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { EmptyState } from '../components/CopyButton'
import { revokeObjectUrlLater } from '../download-asset'

export function ExportView() {
  const design = useScanStore((s) => s.design)
  const raw = useScanStore((s) => s.raw)
  const selectedAssetIds = useScanStore((s) => s.selectedAssetIds)
  const setSelectedAssets = useScanStore((s) => s.setSelectedAssets)
  const setPhase = useScanStore((s) => s.setPhase)
  const phase = useScanStore((s) => s.phase)
  const [status, setStatus] = useState('')
  const [includeFailed, setIncludeFailed] = useState(true)

  if (!design || !raw) return <EmptyState>Export is available after a usable scan.</EmptyState>

  const uniqueAssets = uniqueVisualAssets(design.assets)

  const exportZip = async () => {
    setPhase('exporting')
    setStatus('Capturing viewport and full-page screenshots…')
    try {
      const shot = await sendRuntime({
        type: 'CAPTURE_SCREENSHOT',
        requestId: createRequestId(),
        scanId: useScanStore.getState().scanId ?? createScanId(),
      })
      const screenshotBytes =
        shot?.type === 'SCREENSHOT_RESULT' && shot.payload.dataUrl ? dataUrlToBytes(shot.payload.dataUrl) : null
      const fullPageBytes =
        shot?.type === 'SCREENSHOT_RESULT' && shot.payload.fullPageDataUrl
          ? dataUrlToBytes(shot.payload.fullPageDataUrl)
          : null

      setStatus('Downloading selected assets…')
      const chosen = uniqueAssets.filter((asset) => selectedAssetIds.includes(asset.id))
      const toExport = chosen.length > 0 ? chosen : uniqueAssets
      const { assets, files } = await downloadAssets(
        toExport,
        new Set(toExport.map((asset) => asset.id)),
        async (url) => {
          try {
            const response = await fetch(url, { credentials: 'include' })
            if (response.ok) {
              const buffer = new Uint8Array(await response.arrayBuffer())
              return { bytes: buffer, mimeType: response.headers.get('content-type'), error: null }
            }
          } catch {
            /* try the service worker next */
          }
          const viaWorker = await sendRuntime({
            type: 'FETCH_ASSET',
            requestId: createRequestId(),
            payload: { url },
          })
          if (viaWorker?.type === 'ASSET_BYTES' && viaWorker.payload.base64) {
            const binary = atob(viaWorker.payload.base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
            return { bytes, mimeType: viaWorker.payload.mimeType, error: null }
          }
          return {
            bytes: null,
            mimeType: null,
            error: viaWorker?.type === 'ASSET_BYTES' ? viaWorker.payload.error : 'Fetch failed',
          }
        },
      )

      const nextDesign = {
        ...design,
        assets,
        coverage: calculateCoverage(raw, {
          screenshotAvailable: Boolean(screenshotBytes),
          downloadedAssets: assets.filter((a) => a.downloadStatus === 'downloaded').length,
        }),
      }
      if (!screenshotBytes) {
        nextDesign.limitations = [
          ...nextDesign.limitations,
          {
            code: 'MISSING_SCREENSHOT',
            message: 'Viewport screenshot was not captured.',
            severity: 'warning',
          },
        ]
      } else {
        nextDesign.coverage.screenshotAvailable = true
      }
      if (!fullPageBytes) {
        nextDesign.limitations = [
          ...nextDesign.limitations,
          {
            code: 'MISSING_FULL_PAGE',
            message: 'Full-page screenshot could not be stitched.',
            severity: 'warning',
          },
        ]
      } else if (shot?.type === 'SCREENSHOT_RESULT' && shot.payload.fullPageTruncated) {
        nextDesign.limitations = [
          ...nextDesign.limitations,
          {
            code: 'FULL_PAGE_TRUNCATED',
            message: 'Full-page screenshot stopped at the configured maximum page height.',
            severity: 'info',
          },
        ]
      }

      const exportableFiles = new Map(files)
      if (!includeFailed) {
        for (const asset of assets) {
          if (asset.downloadStatus === 'failed') exportableFiles.delete(asset.localPath)
        }
      }

      setStatus('Building ZIP…')
      const zip = await buildExportZip({
        raw,
        design: nextDesign,
        assetFiles: exportableFiles,
        screenshot: { viewport: screenshotBytes, fullPage: fullPageBytes },
      })
      const url = URL.createObjectURL(zip.blob)
      await chrome.downloads.download({ url, filename: zip.filename, saveAs: true })
      revokeObjectUrlLater(url)
      setPhase('complete')
      setStatus(`Downloaded ${zip.filename}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed')
      setPhase('ready')
    }
  }

  return (
    <section className="card">
      <h2>Export</h2>
      <p>
        {uniqueAssets.length} unique images ready to export. {selectedAssetIds.length} selected. The ZIP keeps{' '}
        <code>AGENTS.md</code> and <code>assets/</code> at the root; specs go under <code>docs/</code>. Copy{' '}
        <code>assets/</code> into the app <code>public/</code> folder after unzipping.
      </p>
      <Checkbox
        checked={includeFailed}
        onChange={(e) => setIncludeFailed(e.target.checked)}
        label="Allow export if some assets failed"
      />
      <div className="actions">
        <Button
          variant="secondary"
          icon={ListChecks}
          onClick={() => setSelectedAssets(uniqueAssets.map((asset) => asset.id))}>
          Select all assets
        </Button>
        <Button variant="secondary" icon={Ban} onClick={() => setSelectedAssets([])}>
          Select none
        </Button>
        <Button icon={Archive} disabled={phase === 'exporting'} onClick={() => void exportZip()}>
          Download ZIP
        </Button>
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </section>
  )
}
