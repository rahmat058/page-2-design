const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g; // eslint-disable-line no-control-regex
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function sanitizeFilename(name: string, fallback = 'file'): string {
  const trimmed = name.trim().replace(/\s+/g, '-');
  const withoutTraversal = trimmed.replace(/\.\./g, '').replaceAll('\\', '-').replaceAll('/', '-');
  let cleaned = withoutTraversal.replace(ILLEGAL, '').replace(/^\.+/, '').replace(/\.+$/, '');
  cleaned = cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleaned || RESERVED.test(cleaned)) {
    cleaned = fallback;
  }
  return cleaned.slice(0, 80);
}

export function sanitizeHostname(hostname: string): string {
  return sanitizeFilename(hostname.replace(/^www\./i, '').toLowerCase(), 'page');
}

export function exportFolderName(hostname: string, scannedAt: string): string {
  return `${sanitizeHostname(hostname)}-${timestampSuffix(scannedAt)}-design-export`;
}

export function timestampSuffix(scannedAt: string): string {
  return scannedAt.replace(/[:.]/g, '-').replace(/Z$/, '').slice(0, 19);
}

export function zipDownloadName(hostname: string, scannedAt: string): string {
  return `${sanitizeHostname(hostname)}-${timestampSuffix(scannedAt)}.zip`;
}

export function extensionFromMimeOrUrl(
  mimeType: string | null,
  url: string,
  fallback = 'bin',
): string {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'font/woff2': 'woff2',
    'font/woff': 'woff',
    'font/ttf': 'ttf',
    'font/otf': 'otf',
  };
  if (mimeType && mimeMap[mimeType]) return mimeMap[mimeType];
  try {
    const pathname = new URL(url, 'https://example.com').pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function assetFolder(type: string): string {
  switch (type) {
    case 'svg':
      return 'assets/svg';
    case 'icon':
    case 'favicon':
      return 'assets/icons';
    case 'font':
      return 'assets/fonts';
    default:
      return 'assets/images';
  }
}

export function buildAssetPath(
  type: string,
  id: string,
  mimeType: string | null,
  url: string,
  used: Set<string>,
): string {
  const folder = assetFolder(type);
  const ext =
    type === 'svg'
      ? 'svg'
      : extensionFromMimeOrUrl(mimeType, url, type === 'font' ? 'woff2' : 'png');
  let base = `${folder}/${id}.${ext}`;
  let n = 2;
  while (used.has(base)) {
    base = `${folder}/${id}-${n}.${ext}`;
    n += 1;
  }
  used.add(base);
  return base;
}

export function assertSafeZipPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/, '');
  if (normalized.includes('..') || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error('Unsafe ZIP path');
  }
  return normalized;
}
