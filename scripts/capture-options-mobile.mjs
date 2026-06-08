/**
 * Captura pantallazos móviles de /options para validación visual pre-deploy.
 * Requiere build con VITE_VISUAL_PREVIEW=1 (solo capturas; no usar en producción).
 * Uso: node scripts/capture-options-mobile.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'screenshots', 'options-mobile')
const PREVIEW_PORT = 4321
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/options`

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      env,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed (${code})`))
    })
  })
}

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    let ready = false
    const onData = (chunk) => {
      const text = chunk.toString()
      if (!ready && /Local:\s+http/.test(text)) {
        ready = true
        resolve(child)
      }
    }

    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('error', reject)
    child.on('exit', (code) => {
      if (!ready) reject(new Error(`preview exited early (${code})`))
    })

    setTimeout(() => {
      if (!ready) reject(new Error('preview server timeout'))
    }, 30000)
  })
}

async function waitForOptionsReady(page) {
  if (page.url().includes('/login')) {
    throw new Error(`Redirigió a login (${page.url()}). Rebuild con VITE_VISUAL_PREVIEW=1.`)
  }

  await page.evaluate(() => {
    const splash = document.getElementById('static-splash')
    if (splash) splash.remove()
  })

  await page.waitForSelector('#ranking-hero-title', { timeout: 45000 })
  await page.waitForFunction(() => {
    const hero = document.querySelector('#ranking-hero-title')
    return hero && !document.body.textContent.includes('Cargando ranking')
  }, { timeout: 45000 })
  await sleep(600)
}

async function resetOptionsScroll(page) {
  await page.evaluate(() => {
    const hero = document.getElementById('ranking-hero-title')
    const scroller = hero?.closest('.overflow-y-auto')
    if (scroller) {
      scroller.scrollTop = 0
      return
    }
    window.scrollTo(0, 0)
  })
  await sleep(300)
}

async function scrollTo(page, y) {
  await page.evaluate((targetY) => {
    const hero = document.getElementById('ranking-hero-title')
    const scroller = hero?.closest('.overflow-y-auto')
    if (scroller) {
      scroller.scrollTop = targetY
      return
    }
    window.scrollTo(0, targetY)
  }, y)
  await sleep(400)
}

function findScrollContainer(page) {
  return page.evaluate(() => {
    const hero = document.getElementById('ranking-hero-title')
    const scrollEl = hero?.closest('.overflow-y-auto') ?? document.documentElement

    return {
      scrollHeight: scrollEl.scrollHeight,
      clientHeight: scrollEl.clientHeight,
      scrollTop: scrollEl.scrollTop,
      pathname: window.location.pathname,
    }
  })
}

async function captureScreenshots(page) {
  await mkdir(OUT_DIR, { recursive: true })

  const metrics = await findScrollContainer(page)
  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight)
  const midScroll = Math.round(maxScroll * 0.45)
  const bottomScroll = maxScroll

  await scrollTo(page, 0)
  await resetOptionsScroll(page)
  await page.screenshot({
    path: path.join(OUT_DIR, '01-top-hero.png'),
    fullPage: false,
  })

  await scrollTo(page, midScroll)
  await page.screenshot({
    path: path.join(OUT_DIR, '02-mid-scroll.png'),
    fullPage: false,
  })

  await scrollTo(page, bottomScroll)
  await page.screenshot({
    path: path.join(OUT_DIR, '03-bottom.png'),
    fullPage: false,
  })

  await writeFile(
    path.join(OUT_DIR, 'metrics.json'),
    JSON.stringify({ ...metrics, maxScroll, midScroll, bottomScroll }, null, 2),
  )

  return { maxScroll, midScroll, metrics }
}

async function main() {
  let preview = null
  let browser = null

  try {
    console.log('Building preview bundle with VITE_VISUAL_PREVIEW=1…')
    await runCommand('npm', ['run', 'build'], {
      ...process.env,
      VITE_VISUAL_PREVIEW: '1',
    })

    preview = await startPreviewServer()
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      locale: 'es-AR',
    })
    const page = await context.newPage()

    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await waitForOptionsReady(page)
    const result = await captureScreenshots(page)

    console.log('Screenshots guardados en:', OUT_DIR)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0]
      if (page) {
        await mkdir(OUT_DIR, { recursive: true })
        await page.screenshot({ path: path.join(OUT_DIR, 'debug-failure.png'), fullPage: true })
        console.error('URL al fallar:', page.url())
      }
    }
    throw error
  } finally {
    if (browser) await browser.close()
    if (preview) preview.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
