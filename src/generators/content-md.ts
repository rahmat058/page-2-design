import type { ContentBlock } from '../shared/types';
import { escapeMarkdown } from '../normalize/markdown-escape';

export function generateContentMarkdown(blocks: ContentBlock[]): string {
  const lines = [
    '# Captured content',
    '',
    'This file lists visible and semantic text in document order. Do not invent missing copy.',
    '',
  ];
  if (blocks.length === 0) {
    lines.push('_No content blocks were captured._', '');
    return lines.join('\n');
  }
  for (const block of blocks) {
    const heading =
      block.kind === 'heading' && block.level ? '#'.repeat(Math.min(block.level + 1, 6)) : '##';
    const href = block.href ? ` ([${block.href}](${block.href}))` : '';
    lines.push(`${heading} ${block.kind} · ${block.order}`);
    lines.push('');
    lines.push(escapeMarkdown(block.text) + href);
    lines.push('');
  }
  return lines.join('\n');
}
