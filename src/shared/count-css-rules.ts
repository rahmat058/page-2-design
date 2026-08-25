/**
 * Counts top-level CSS rules in stylesheet text (mirrors cssRules.length semantics).
 */

export function countStyleRulesInCss(cssText: string): number {
  return countTopLevelCssRules(cssText)
}

/** Same as stylesheet.cssRules.length: each top-level rule counts as one, including @media. */
export function countTopLevelCssRules(cssText: string): number {
  const source = stripCssNoise(cssText)
  let i = 0
  let count = 0
  const len = source.length

  const skipWs = () => {
    while (i < len && /\s/.test(source[i]!)) i += 1
  }

  while (i < len) {
    skipWs()
    if (i >= len) break
    if (source[i] === '}') {
      i += 1
      continue
    }

    const at = source.slice(i, i + 12).toLowerCase()
    if (at.startsWith('@charset')) {
      while (i < len && source[i] !== ';') i += 1
      if (source[i] === ';') i += 1
      continue
    }
    if (at.startsWith('@import') || at.startsWith('@namespace')) {
      while (i < len && source[i] !== ';' && source[i] !== '{') i += 1
      if (source[i] === ';') {
        count += 1
        i += 1
        continue
      }
    }

    while (i < len && source[i] !== '{') i += 1
    if (source[i] !== '{') break
    let depth = 0
    for (; i < len; i += 1) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') {
        depth -= 1
        if (depth === 0) {
          i += 1
          break
        }
      }
    }
    count += 1
  }
  return count
}

function stripCssNoise(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\[\s\S]/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
}
