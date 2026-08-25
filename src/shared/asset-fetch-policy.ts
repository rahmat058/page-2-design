/** Allow same-origin, same-site brand hosts, and data/blob URLs. Block unrelated third parties. */
export function isAllowedAssetFetchUrl(assetUrl: string, pageUrl: string): boolean {
  const trimmed = assetUrl.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('inline:')) return true
  try {
    const asset = new URL(trimmed, pageUrl)
    const page = new URL(pageUrl)
    if (asset.protocol !== 'http:' && asset.protocol !== 'https:') return false
    if (asset.origin === page.origin) return true

    const pageHost = page.hostname.toLowerCase()
    const assetHost = asset.hostname.toLowerCase()
    if (assetHost === pageHost) return true
    if (assetHost.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${assetHost}`)) return true

    const pageBare = pageHost.replace(/^www\./, '')
    if (assetHost === pageBare || assetHost.endsWith(`.${pageBare}`)) return true

    const pageBrand = siteBrandToken(pageHost)
    const assetBrand = siteBrandToken(assetHost)
    return Boolean(pageBrand && assetBrand && pageBrand === assetBrand && pageBrand.length >= 3)
  } catch {
    return false
  }
}

/** Rough brand label (e.g. www.rokomari.com → rokomari, cdn.rokbucket.rokomari.io → rokomari). */
function siteBrandToken(hostname: string): string | null {
  const labels = hostname.toLowerCase().split('.').filter(Boolean)
  const start = labels[0] === 'www' ? 1 : 0
  const parts = labels.slice(start)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0] ?? null
  return parts[parts.length - 2] ?? null
}
