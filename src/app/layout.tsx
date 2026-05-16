import type { Metadata } from 'next'
import './globals.css'

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
        {children}
        <footer className="py-4 text-center">
          <span className="text-xs text-gray-400">
            このSubstack継続可視化ツールに参加したい方は{' '}
            <a
              href="https://uojun.substack.com/p/5d4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FF6719] underline"
            >
              コチラ
            </a>
          </span>
        </footer>
      </body>
    </html>
  )
}
