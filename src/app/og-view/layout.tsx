import { Noto_Sans_JP } from 'next/font/google'

// 撮影専用ページ用レイアウト。
//
// 重要: 本番の serverless Chromium（@sparticuz/chromium / Linux）には日本語の
// システムフォントが無いため、何もしないと日本語が豆腐（□）になる。
// ここで Noto Sans JP を next/font 経由で読み込み、撮影対象に必ず日本語グリフを
// 供給する（ライブ表示は別フォントだが、OGカードの可読性を最優先する）。
//
// (main) レイアウトの外なので Header/Footer は付かない。
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export default function OgViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={notoSansJP.className}
      style={{ background: '#ffffff', width: '1200px' }}
    >
      {children}
    </div>
  )
}
