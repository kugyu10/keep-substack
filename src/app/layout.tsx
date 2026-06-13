import type { Metadata } from 'next'
import './globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { getSiteUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  // BUG3: 本番URL固定をやめ、配信中オリジン（preview/local 含む）から解決する。
  // これで preview の og:image/og:url が本番の旧画像を指さなくなる。
  metadataBase: new URL(getSiteUrl()),
  title: 'Keep Substack',
  description: 'Substackコミュニティメンバーの記事更新を確認するツール',
  openGraph: {
    title: 'Keep Substack',
    description: 'Substackコミュニティメンバーの記事更新を確認するツール',
    images: ['/keep-substack-kv.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keep Substack',
    description: 'Substackコミュニティメンバーの記事更新を確認するツール',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
