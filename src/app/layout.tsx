import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://keep-substack.vercel.app'),
  title: 'Keep Substack',
  description: 'Substackコミュニティメンバーの記事更新を確認するツール',
  openGraph: {
    title: 'Keep Substack',
    description: 'Substackコミュニティメンバーの記事更新を確認するツール',
    images: ['/keep-substack-kv.png'],
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
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
