import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * next/og（Satori）は日本語グリフを内蔵しないため、各 opengraph-image ルートで
 * 日本語フォントを ArrayBuffer として読み込み ImageResponse の fonts に渡す。
 *
 * フォント実体は src/app/fonts/ に同梱（Noto Sans JP の Regular / Bold サブセット OTF）。
 * URL fetch ではなくローカルファイルを fs で読む next/og 標準パターン（ビルドに確実に同梱される）。
 *
 * process.cwd() はビルド/実行どちらでもリポジトリルートを指す（Next.js のサーバ実行前提）。
 */
const FONT_DIR = join(process.cwd(), 'src', 'app', 'fonts')

export type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

/**
 * ImageResponse の fonts オプションに渡す Noto Sans JP（Regular + Bold）を返す。
 * 失敗時は空配列を返し、呼び出し側はフォント無し（デフォルト sans）で描画を継続する。
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  try {
    const [regular, bold] = await Promise.all([
      readFile(join(FONT_DIR, 'NotoSansJP-Regular.otf')),
      readFile(join(FONT_DIR, 'NotoSansJP-Bold.otf')),
    ])
    return [
      { name: 'Noto Sans JP', data: toArrayBuffer(regular), weight: 400, style: 'normal' },
      { name: 'Noto Sans JP', data: toArrayBuffer(bold), weight: 700, style: 'normal' },
    ]
  } catch (e) {
    console.error('[ogFonts] failed to load JP fonts:', e)
    return []
  }
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}
