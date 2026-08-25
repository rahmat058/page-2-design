/**
 * Generates CONTENT.md with exact captured copy grouped by page region.
 */
import type { ContentBlock, NormalizedSection } from '../shared/types'
import { escapeMarkdown } from '../normalize/markdown-escape'
import { sectionComposition } from '../normalize/layout-pattern'

export function generateContentMarkdown(blocks: ContentBlock[], sections: NormalizedSection[] = []): string {
  const lines = [
    '# Captured content',
    '',
    'Place this copy inside the matching region from `docs/DESIGN.md`. Do not invent missing copy. Do not move copy into a different section.',
    '',
  ]
  if (blocks.length === 0) {
    lines.push('_No content blocks were captured._', '')
    return lines.join('\n')
  }

  const grouped = groupBySection(blocks, sections)
  for (const group of grouped) {
    lines.push(`## ${group.title}`)
    lines.push('')
    if (group.role) {
      lines.push(`_Region role \`${group.role}\`, pattern \`${group.pattern}\`._`)
      lines.push('')
    }
    for (const block of group.blocks) {
      const heading = block.kind === 'heading' && block.level ? '#'.repeat(Math.min(block.level + 2, 6)) : '###'
      const href = block.href ? ` ([${block.href}](${block.href}))` : ''
      lines.push(`${heading} ${block.kind} · ${block.order}`)
      lines.push('')
      lines.push(escapeMarkdown(block.text ?? '') + href)
      lines.push('')
    }
  }
  return lines.join('\n')
}

function groupBySection(blocks: ContentBlock[], sections: NormalizedSection[]) {
  const byId = new Map(sections.map((section) => [section.id, section]))
  const buckets = new Map<string, ContentBlock[]>()
  for (const block of blocks) {
    const key = block.sectionId || 'ungrouped'
    const list = buckets.get(key) ?? []
    list.push(block)
    buckets.set(key, list)
  }

  const orderedKeys = [
    ...sections.map((section) => section.id),
    ...[...buckets.keys()].filter((key) => key !== 'ungrouped' && !byId.has(key)),
    ...(buckets.has('ungrouped') ? ['ungrouped'] : []),
  ]

  return orderedKeys
    .filter((key) => buckets.has(key))
    .map((key) => {
      const section = byId.get(key)
      const composition = section ? sectionComposition(section) : null
      return {
        title: section ? `${section.name} (${composition?.role ?? 'band'})` : key === 'ungrouped' ? 'Ungrouped' : key,
        role: composition?.role ?? '',
        pattern: composition?.pattern ?? '',
        blocks: buckets.get(key) ?? [],
      }
    })
}
