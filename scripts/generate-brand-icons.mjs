#!/usr/bin/env node
/**
 * Regenera favicon, PWA, Apple Touch y OG desde scripts/assets/favicom.png
 * Uso: node scripts/generate-brand-icons.mjs
 */
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = join(__dirname, 'assets', 'favicom.png')
const publicDir = join(root, 'public')

const SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'pwa-192.png' },
  { size: 512, name: 'pwa-512.png' },
  { size: 1024, name: 'og-image.png' },
]

function resizePng(size, name) {
  const out = join(publicDir, name)
  execSync(`sips -z ${size} ${size} "${source}" --out "${out}"`, { stdio: 'pipe' })
  console.log('wrote', name)
}

function main() {
  if (!existsSync(source)) {
    console.error('Missing source:', source)
    process.exit(1)
  }

  mkdirSync(publicDir, { recursive: true })
  copyFileSync(source, join(publicDir, 'favicom.png'))

  for (const { size, name } of SIZES) {
    resizePng(size, name)
  }

  copyFileSync(join(publicDir, 'favicon-32x32.png'), join(publicDir, 'favicon.png'))

  try {
    const ico = execSync(
      `npx --yes png-to-ico "${join(publicDir, 'favicon-16x16.png')}" "${join(publicDir, 'favicon-32x32.png')}" "${join(publicDir, 'favicon-48x48.png')}"`,
      { encoding: 'buffer', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    writeFileSync(join(publicDir, 'favicon.ico'), ico)
    console.log('wrote favicon.ico')
  } catch {
    console.warn('favicon.ico skipped (png-to-ico unavailable); PNG favicons are enough')
  }

  console.log('Done — icons in public/')
}

main()
