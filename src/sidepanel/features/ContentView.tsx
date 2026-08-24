import { useEffect, useState } from 'react';
import type { AssetRecord } from '../../shared/types';
import { CopyButton, ScanPrompt } from '../components/CopyButton';
import { DownloadIcon, GridViewIcon, ListViewIcon } from '../components/LucideIcons';
import { VirtualList } from '../components/VirtualList';
import {
  assetDownloadName,
  assetPreviewUrl,
  downloadSingleAsset,
  estimateAssetSize,
  objectUrlForAsset,
} from '../download-asset';
import { useScanStore } from '../store/useScanStore';
import { useToastStore } from '../toast';

export function ContentView() {
  const blocks = useScanStore((s) => s.design?.content ?? []);
  if (blocks.length === 0) {
    return <ScanPrompt afterScan="No content blocks were captured." />;
  }
  return (
    <section className="card">
      <div className="row">
        <h2>Content</h2>
        <CopyButton value={blocks.map((block) => block.text).join('\n')} label="Copy all text" />
      </div>
      <VirtualList
        count={blocks.length}
        itemHeight={64}
        renderItem={(index) => {
          const block = blocks[index];
          if (!block) return null;
          return (
            <div>
              <div className="row">
                <strong>
                  {block.kind}
                  {block.level ? ` h${block.level}` : ''}
                </strong>
                <CopyButton value={block.text} label="Copy" />
              </div>
              <div>{block.text}</div>
            </div>
          );
        }}
      />
    </section>
  );
}

export function AssetsView() {
  const assets = useScanStore((s) => s.design?.assets ?? []);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  if (assets.length === 0) return <ScanPrompt afterScan="No assets were captured." />;
  return (
    <div className="assets-wrap">
      <div className="segmented pill-tabs asset-tabs" role="tablist" aria-label="Asset layout">
        <button
          type="button"
          role="tab"
          className={mode === 'grid' ? 'on' : ''}
          aria-selected={mode === 'grid'}
          onClick={() => {
            if (mode === 'grid') return;
            setMode('grid');
            useToastStore.getState().showToast('Grid view');
          }}
        >
          <GridViewIcon />
          Grid
        </button>
        <button
          type="button"
          role="tab"
          className={mode === 'list' ? 'on' : ''}
          aria-selected={mode === 'list'}
          onClick={() => {
            if (mode === 'list') return;
            setMode('list');
            useToastStore.getState().showToast('List view');
          }}
        >
          <ListViewIcon />
          List
        </button>
      </div>
      <div key={mode} className="fade-pane asset-scroll">
        {mode === 'grid' ? (
          <div className="asset-grid">
            {assets.map((asset) => (
              <AssetTile key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="asset-list">
            {assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetTile({ asset }: { asset: AssetRecord }) {
  const size = estimateAssetSize(asset);
  const name = assetDownloadName(asset);
  return (
    <div className="asset-tile">
      <AssetPreview asset={asset} />
      <div className="asset-hover">
        <button
          type="button"
          className="icon-btn download"
          aria-label={`Download ${name}`}
          onClick={() => void downloadSingleAsset(asset)}
        >
          <DownloadIcon />
        </button>
        <span className="asset-meta">{name}</span>
        {size ? <span className="asset-meta">{size}</span> : null}
      </div>
    </div>
  );
}

function AssetRow({ asset }: { asset: AssetRecord }) {
  const size = estimateAssetSize(asset);
  const name = assetDownloadName(asset);
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
        onClick={() => void downloadSingleAsset(asset)}
      >
        <DownloadIcon />
      </button>
    </div>
  );
}

function AssetPreview({ asset }: { asset: AssetRecord }) {
  const [src, setSrc] = useState<string | undefined>(() => assetPreviewUrl(asset));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setFailed(false);
    const direct = assetPreviewUrl(asset);
    if (direct && !asset.resolvedUrl.startsWith('blob:')) {
      setSrc(direct);
      return () => undefined;
    }
    void objectUrlForAsset(asset).then((url) => {
      if (cancelled || !url) return;
      revoked = url.startsWith('blob:') ? url : null;
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [asset]);

  if (!src) return <span className="thumb-empty" aria-hidden="true" />;
  return (
    <img
      alt=""
      src={src}
      onError={() => {
        if (failed) {
          setSrc(undefined);
          return;
        }
        setFailed(true);
        void objectUrlForAsset(asset).then((url) => {
          if (url) setSrc(url);
        });
      }}
    />
  );
}
