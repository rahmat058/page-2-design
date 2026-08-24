import { build } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const watch = process.argv.includes('--watch')

const configs = ['vite.config.ts', 'vite.background.config.ts', 'vite.content.config.ts']

if (watch) {
  for (const config of configs) {
    await build({
      configFile: resolve(root, config),
      build: { watch: {} },
    })
  }
} else {
  for (const config of configs) {
    await build({ configFile: resolve(root, config) })
  }
}
