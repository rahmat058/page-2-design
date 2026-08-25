import { readFileSync, writeFileSync } from 'node:fs'

/** Keep in sync with commitlint.config.ts TYPE_ENUM emojis. */
const TYPE_EMOJI = {
  feat: '✨ ',
  fix: '🐛 ',
  docs: '📚 ',
  style: '💎 ',
  refactor: '📦 ',
  perf: '🚀 ',
  test: '🚨 ',
  build: '🛠️ ',
  ci: '⚙️ ',
  chore: '♻️ ',
  revert: '🗑️ ',
}

const file = process.argv[2]
if (!file) {
  process.exit(0)
}

const message = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const lines = message.split('\n')
const header = (lines[0] ?? '').trimEnd()

// Already has a type emoji, or not a conventional header — leave as-is.
const plain = header.match(/^(\w+)(\([^)]*\))?!?: (.+)$/)
if (!plain) {
  process.exit(0)
}

const type = plain[1]
const emoji = TYPE_EMOJI[type]
if (!emoji) {
  process.exit(0)
}

lines[0] = `${emoji}${header}`
writeFileSync(file, lines.join('\n'), 'utf8')
