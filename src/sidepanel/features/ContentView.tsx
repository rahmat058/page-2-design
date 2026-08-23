import { CopyButton, EmptyState } from '../components/CopyButton';
import { VirtualList } from '../components/VirtualList';
import { useScanStore } from '../store/useScanStore';

export function ContentView() {
  const blocks = useScanStore((s) => s.design?.content ?? []);
  if (blocks.length === 0) return <EmptyState>No content blocks yet.</EmptyState>;
  return (
    <section className="card">
      <div className="row">
        <h2>Content</h2>
        <CopyButton value={blocks.map((b) => b.text).join('\n')} label="Copy all text" />
      </div>
      <VirtualList
        count={blocks.length}
        itemHeight={76}
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

export function ImagesView() {
  return <AssetView types={['image', 'background', 'video-poster', 'other']} title="Images" />;
}

export function IconsView() {
  return <AssetView types={['icon', 'svg', 'favicon']} title="Icons & SVG" />;
}

export function AssetsView() {
  const assets = useScanStore((s) => s.design?.assets ?? []);
  const selected = useScanStore((s) => s.selectedAssetIds);
  const toggle = useScanStore((s) => s.toggleAsset);
  if (assets.length === 0) return <EmptyState>No assets captured.</EmptyState>;
  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <label key={asset.id} className={selected.includes(asset.id) ? 'asset-tile on' : 'asset-tile'}>
          <input
            type="checkbox"
            checked={selected.includes(asset.id)}
            onChange={() => toggle(asset.id)}
          />
          {asset.inlineSvg ? (
            <SafeSvg markup={asset.inlineSvg} />
          ) : (
            <img
              alt=""
              src={asset.resolvedUrl.startsWith('http') ? asset.resolvedUrl : undefined}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function AssetView({ types, title }: { types: string[]; title: string }) {
  const assets = useScanStore((s) => s.design?.assets.filter((a) => types.includes(a.type)) ?? []);
  const selected = useScanStore((s) => s.selectedAssetIds);
  const toggle = useScanStore((s) => s.toggleAsset);
  if (assets.length === 0) return <EmptyState>No {title.toLowerCase()} captured.</EmptyState>;
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="list">
        {assets.map((asset) => (
          <label key={asset.id} className="row checkbox">
            <input
              type="checkbox"
              checked={selected.includes(asset.id)}
              onChange={() => toggle(asset.id)}
            />
            {asset.inlineSvg ? (
              <SafeSvg markup={asset.inlineSvg} />
            ) : (
              <img
                className="preview"
                alt=""
                src={asset.resolvedUrl.startsWith('http') ? asset.resolvedUrl : undefined}
              />
            )}
            <div>
              <div>
                {asset.type} · {asset.renderedWidth ?? '?'}×{asset.renderedHeight ?? '?'}
              </div>
              <div className="mono">{asset.resolvedUrl}</div>
              <span className="badge">{asset.downloadStatus}</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

function SafeSvg({ markup }: { markup: string }) {
  return (
    <img
      className="preview"
      alt="Inline SVG preview"
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`}
    />
  );
}
