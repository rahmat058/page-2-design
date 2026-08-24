import type { ContentBlock } from '../shared/types'

export interface ContentSectionGroup {
  id: string
  name: string
  blocks: ContentBlock[]
}

export function panelContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((block) => block.kind !== 'image-alt')
}

export function groupContentBySection(
  blocks: ContentBlock[],
  sections: Array<{ id: string; name: string }>,
): ContentSectionGroup[] {
  const ordered = [...panelContentBlocks(blocks)].sort((a, b) => a.order - b.order)
  const names = new Map(sections.map((section) => [section.id, section.name]))
  const buckets = new Map<string, ContentBlock[]>()

  for (const block of ordered) {
    const key = block.sectionId && names.has(block.sectionId) ? block.sectionId : 'other'
    const list = buckets.get(key) ?? []
    list.push(block)
    buckets.set(key, list)
  }

  const groups: ContentSectionGroup[] = []
  for (const section of sections) {
    const items = buckets.get(section.id)
    if (!items?.length) continue
    groups.push({ id: section.id, name: section.name, blocks: items })
  }
  const leftover = buckets.get('other')
  if (leftover?.length) {
    groups.push({
      id: 'other',
      name: groups.length === 0 ? 'Page' : 'Other',
      blocks: leftover,
    })
  }
  return groups
}

export function contentKindLabel(block: ContentBlock): string {
  if (block.kind === 'heading') return block.level ? `Heading ${block.level}` : 'Heading'
  if (block.kind === 'paragraph') return 'Paragraph'
  if (block.kind === 'list') return 'List'
  if (block.kind === 'list-item') return 'List item'
  if (block.kind === 'link') return 'Link'
  if (block.kind === 'button') return 'Button'
  if (block.kind === 'navigation') return 'Navigation'
  if (block.kind === 'label') return 'Label'
  if (block.kind === 'placeholder') return 'Placeholder'
  if (block.kind === 'table') return 'Table'
  if (block.kind === 'aria') return 'ARIA'
  return 'Other'
}

export function copyContentPlain(groups: ContentSectionGroup[]): string {
  return groups
    .map((group) => {
      const lines = group.blocks.map((block) => {
        const href = block.href ? ` (${block.href})` : ''
        return `${contentKindLabel(block)}: ${block.text}${href}`
      })
      return [`# ${group.name}`, ...lines].join('\n')
    })
    .join('\n\n')
}
