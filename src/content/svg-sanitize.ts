const UNSAFE_SVG_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
]);
const UNSAFE_ATTR = /^(on|href|xlink:href|src)$/i;

export function sanitizeSvg(markup: string): string {
  if (typeof DOMParser === 'undefined') {
    return stripSvgText(markup);
  }
  try {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) return stripSvgText(markup);
    const root = doc.documentElement;
    walk(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return stripSvgText(markup);
  }
}

function walk(node: Element): void {
  const children = [...node.children];
  for (const child of children) {
    if (UNSAFE_SVG_TAGS.has(child.tagName.toLowerCase())) {
      child.remove();
      continue;
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name;
      const value = attr.value.trim().toLowerCase();
      if (name.toLowerCase().startsWith('on')) {
        child.removeAttribute(name);
        continue;
      }
      if (
        UNSAFE_ATTR.test(name) &&
        (value.startsWith('javascript:') || value.startsWith('data:text/html'))
      ) {
        child.removeAttribute(name);
      }
    }
    walk(child);
  }
}

export function stripSvgText(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '');
}
