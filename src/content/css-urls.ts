export function extractCssUrls(value: string): string[] {
  const urls: string[] = [];
  const re = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const raw = (match[2] ?? '').trim();
    if (!raw || raw.startsWith('data:') || raw.startsWith('#') || raw.toLowerCase() === 'none') {
      continue;
    }
    urls.push(raw);
  }
  return urls;
}

export function isCssNone(value: string): boolean {
  return !value || value === 'none' || value === 'normal';
}
