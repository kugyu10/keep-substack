import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keep Substack',
  description: 'Substackコミュニティメンバーの記事更新を確認するツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
