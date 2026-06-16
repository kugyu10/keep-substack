/**
 * ヘッドレス Chromium で URL を開き 1200x630 を撮影する（v1.9 OG画像）。
 *
 * 環境ごとに実行可能ファイル/起動方法を切り替える:
 *   - 本番/preview（Vercel, serverless）: `@sparticuz/chromium` の executablePath()。
 *     フル puppeteer/playwright は 250MB の関数バンドル上限を超えるため、
 *     `playwright-core`（ブラウザ非同梱）+ @sparticuz の最小 Chromium を使う。
 *   - ローカル: 既に入っている Playwright Chromium（`playwright` の executablePath）
 *     か、システムの Google Chrome を使う。これにより @sparticuz が無い/動かない
 *     環境でもローカル検証できる。
 *
 * 失敗時は呼び出し側（/api/og）でフォールバック PNG を返すため、ここは throw する。
 */

import { chromium as pwChromium, type Browser } from 'playwright-core'
import { OG_WIDTH, OG_HEIGHT } from './ogScreenshotUrl'

// Vercel 実行時の判定。VERCEL は本番/preview/dev のいずれでも 1 になる。
function isServerless(): boolean {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
}

// ローカルの実行可能ファイルを解決する。
//   1) 明示の PUPPETEER/PLAYWRIGHT 実行パス env
//   2) `playwright`（フル）が入っていればその executablePath()
//   3) よくある OS 既定の Chrome パス
async function resolveLocalExecutablePath(): Promise<string | undefined> {
  const fromEnv =
    process.env.CHROME_EXECUTABLE_PATH ||
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH
  if (fromEnv) return fromEnv

  // 既にインストール済みの Playwright Chromium を使う（E2E ハーネス由来）。
  try {
    // 動的 import で本番バンドルに `playwright` を引き込まない。
    const pw = (await import('playwright').catch(() => null)) as
      | { chromium?: { executablePath?: () => string } }
      | null
    const p = pw?.chromium?.executablePath?.()
    if (p) return p
  } catch {
    // ignore
  }

  // OS 既定の Chrome/Chromium パス（最後の砦）。
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ]
  const { existsSync } = await import('node:fs')
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c
    } catch {
      // ignore
    }
  }
  return undefined
}

async function launchBrowser(): Promise<Browser> {
  if (isServerless()) {
    // @sparticuz/chromium は ESM default export（Chromium クラス）。
    // 本番バンドルにのみ含めるため動的 import。
    const mod = await import('@sparticuz/chromium')
    const chromium = mod.default
    const executablePath = await chromium.executablePath()
    return pwChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    })
  }

  const executablePath = await resolveLocalExecutablePath()
  return pwChromium.launch({
    executablePath, // undefined の場合は playwright-core が自動解決を試みる
    headless: true,
  })
}

/**
 * `url` を開き、左上 1200x630 を PNG で撮影して返す。
 * 画像/フォントの読み込みを待ってから撮る（カバー画像が欠けないように）。
 */
export async function screenshotOg(url: string): Promise<Buffer> {
  let browser: Browser | null = null
  try {
    browser = await launchBrowser()
    const page = await browser.newPage({
      viewport: { width: OG_WIDTH, height: OG_HEIGHT },
      deviceScaleFactor: 2, // 高解像度（網膜）で文字をくっきり
    })
    // ネットワークが落ち着くまで待つ（Substack カバー画像の読み込み込み）。
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 })
    // Web フォント確定を待つ。
    await page.evaluate(() => (document as Document).fonts?.ready).catch(() => {})
    // 念のため遅延読み込み画像の余韻。
    await page.waitForTimeout(400)

    const png = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
    })
    return png as Buffer
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
