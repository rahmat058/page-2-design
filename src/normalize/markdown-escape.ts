/**
 * Escapes Markdown special characters and builds pipe tables for generated docs.
 */
export function escapeMarkdown(text: string): string {
  return String(text ?? '').replace(/[\\`*_{}[\]()#+\-.!|<>]/g, (ch) => `\\${ch}`)
}

export function escapeTableCell(text: string): string {
  return String(text ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

export function mdTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `_${headers.join(', ')}: none captured._`
  }
  const head = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.map((c) => escapeTableCell(c)).join(' | ')} |`).join('\n')
  return `${head}\n${sep}\n${body}`
}
