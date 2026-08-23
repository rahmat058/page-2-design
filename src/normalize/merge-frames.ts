import type { AssetRecord, CompactFrameScan, PageScan } from '../shared/types';

export function mergeFrameScan(parent: PageScan, frame: CompactFrameScan, index: number): PageScan {
  const prefix = `frame${index + 1}_`;
  const remap = (id: string) => `${prefix}${id}`;
  const elements = frame.elements.map((el) => ({
    ...el,
    id: remap(el.id),
    parentId: el.parentId ? remap(el.parentId) : null,
    sectionId: el.sectionId ? remap(el.sectionId) : null,
    assetIds: el.assetIds.map(remap),
  }));
  const content = frame.content.map((block, order) => ({
    ...block,
    id: remap(block.id),
    elementId: remap(block.elementId),
    sectionId: block.sectionId ? remap(block.sectionId) : null,
    order: parent.content.length + order,
    text: `[iframe ${frame.href}] ${block.text}`,
  }));
  const assets = frame.assets.map((asset) => ({
    ...asset,
    id: remap(asset.id),
    elementIds: asset.elementIds.map(remap),
    sectionIds: asset.sectionIds.map(remap),
  }));
  const colors = frame.colors.map((color) => ({
    ...color,
    elementIds: color.elementIds.map(remap),
  }));
  const typography = frame.typography.map((item) => ({
    ...item,
    elementIds: item.elementIds.map(remap),
  }));

  return {
    ...parent,
    elements: [...parent.elements, ...elements],
    content: [...parent.content, ...content],
    assets: mergeAssetRecords([...parent.assets, ...assets]),
    colors: [...parent.colors, ...colors],
    typography: [...parent.typography, ...typography],
    limitations: [
      ...parent.limitations,
      ...frame.limitations,
      {
        code: 'IFRAME_MERGED',
        message: `Merged ${elements.length} elements from iframe ${frame.href}.`,
        severity: 'info',
      },
    ],
  };
}

function mergeAssetRecords(list: AssetRecord[]): AssetRecord[] {
  const map = new Map<string, AssetRecord>();
  for (const asset of list) {
    const existing = map.get(asset.id);
    if (!existing) {
      map.set(asset.id, { ...asset, elementIds: [...asset.elementIds] });
      continue;
    }
    existing.elementIds = [...new Set([...existing.elementIds, ...asset.elementIds])];
  }
  return [...map.values()];
}
