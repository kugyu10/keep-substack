import Header from '@/components/Header'
import Footer from '@/components/Footer'

// サイト本体ページ用レイアウト。
// Header / Footer をここに閉じ込めることで、(auth) 配下の
// ログイン/サインインページにはヘッダー・フッターが表示されない。
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
