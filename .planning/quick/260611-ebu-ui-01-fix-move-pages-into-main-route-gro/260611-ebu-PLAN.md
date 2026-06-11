---
phase: quick-260611-ebu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/layout.tsx
  - src/app/(main)/layout.tsx
  - src/app/(main)/page.tsx
  - src/app/(main)/__tests__/page.test.tsx
  - src/app/(main)/admin/
  - src/app/(main)/my/
  - src/app/(main)/member/
  - src/app/(main)/daily/
autonomous: true
requirements: [UI-01, UI-02]

must_haves:
  truths:
    - "/login と /signin-51cf21389c56 に Header / Footer が表示されない"
    - "/, /my, /admin, /member/*, /daily には Header / Footer が表示される"
    - "全ページで GoogleAnalytics が引き続き読み込まれる (ANLT-01 維持)"
    - "URL は一切変わらない (Route Group は URL に現れない)"
    - "npm test と npm run build が通る"
  artifacts:
    - path: "src/app/(main)/layout.tsx"
      provides: "Header/Footer を描画する main route group の layout"
      contains: "Header"
    - path: "src/app/layout.tsx"
      provides: "html/body + GoogleAnalytics のみの root layout (Header/Footer なし)"
      contains: "GoogleAnalytics"
    - path: "src/app/(main)/page.tsx"
      provides: "トップページ (移動後)"
    - path: "src/app/(auth)/layout.tsx"
      provides: "認証ページ用 layout (Header/Footer なし・変更なし)"
  key_links:
    - from: "src/app/(main)/layout.tsx"
      to: "@/components/Header と @/components/Footer"
      via: "import + JSX 描画"
      pattern: "import Header"
    - from: "src/app/layout.tsx"
      to: "@next/third-parties/google"
      via: "GoogleAnalytics 描画 (Header/Footer の import/描画は削除)"
      pattern: "GoogleAnalytics"
---

<objective>
本番の `/login` と `/signin-51cf21389c56` にサイト Header / Footer が表示されてしまうバグ (UI-01 / UI-02, 監査 B-1 BLOCKER) を、Next.js App Router の Route Group イディオムで修正する。

原因: `src/app/layout.tsx` (root layout) が `<Header/>` と `<Footer/>` を全ルートに無条件描画しており、`(auth)` のネストされた layout では root layout を打ち消せない。

修正方針: ページ系ルートを `(main)/` Route Group に移動し、Header/Footer の描画を `(main)/layout.tsx` に閉じ込める。root layout は `<html><body>{children}` + GoogleAnalytics のみに整理する。`(auth)/layout.tsx` は Header/Footer を持たないので、認証ページからヘッダー・フッターが消える。

Purpose: 認証ページのレイアウトをサイト本体から分離し、本番のログイン/サインインページの表示を正す。
Output: `(main)/` Route Group と `(main)/layout.tsx` の新設、root layout の整理。
</objective>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- 移動・改修に必要な既存コードの実態。executor は探索不要。 -->

現状の src/app 構造 (移動前):
- src/app/layout.tsx          ← 改修対象 (Header/Footer の import・描画を除去)
- src/app/page.tsx            ← (main)/ へ移動
- src/app/__tests__/          ← (main)/ へ移動 (page.test.tsx は `import Home from '../page'`)
- src/app/admin/              ← (main)/ へ移動 (admin/__tests__, admin/teams を含む)
- src/app/my/                 ← (main)/ へ移動 (my/__tests__ を含む)
- src/app/member/             ← (main)/ へ移動 (member/[publicationId]/page.tsx)
- src/app/daily/              ← (main)/ へ移動 (daily/__tests__ を含む)
- src/app/(auth)/             ← 変更なし (login, signin-51cf21389c56, layout.tsx)
- src/app/api/                ← root に残す (route handler, layout 非依存)
- src/app/auth/               ← root に残す (auth/callback route handler, auth/__tests__)
- src/app/globals.css         ← root に残す
- src/app/favicon.ico         ← root に残す

現 root layout.tsx (src/app/layout.tsx) の中身:
```
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata: Metadata = { ... }   // metadataBase / title / description / openGraph

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
        <Footer />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
```

現 (auth)/layout.tsx (変更しない、Header/Footer を持たない):
```
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {children}
    </div>
  )
}
```

import パスの事実確認 (本タスクの前提):
- 全ページテストは相対 import (`import Home from '../page'`, `import { updateMemberAction } from '../actions'`, `import AdminTeamPage from '../[teamName]/page'` 等) と `@/` エイリアスのみを使用。
- src/app 境界をまたぐ `../../../` 相対 import は存在しない (grep 済み・0 件)。
- → ディレクトリ「丸ごと」移動すれば相対 import の親子関係は維持され、import 修正は原則不要。`@/` エイリアスも移動の影響を受けない。
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: (main) Route Group を新設しページ系ルートを移動、layout を分離する</name>
  <files>src/app/(main)/layout.tsx, src/app/(main)/page.tsx, src/app/(main)/__tests__/, src/app/(main)/admin/, src/app/(main)/my/, src/app/(main)/member/, src/app/(main)/daily/, src/app/layout.tsx</files>
  <action>
ステップ A — ディレクトリ移動 (Next.js Route Group `(main)` は URL に現れない):
  - `src/app/(main)/` を新設する。
  - `git mv` でページ系を丸ごと移動する (履歴保持・相対 import の親子関係維持のため):
    - `git mv src/app/page.tsx src/app/(main)/page.tsx`
    - `git mv src/app/__tests__ src/app/(main)/__tests__`
    - `git mv src/app/admin src/app/(main)/admin`
    - `git mv src/app/my src/app/(main)/my`
    - `git mv src/app/member src/app/(main)/member`
    - `git mv src/app/daily src/app/(main)/daily`
  - root に残すもの (移動しない): `api/`, `auth/`, `(auth)/`, `globals.css`, `favicon.ico`, `layout.tsx`。理由: `api/`・`auth/` は route handler で layout 非依存。`globals.css`・`favicon.ico` は root 所属。

ステップ B — `src/app/(main)/layout.tsx` を新規作成 (Header/Footer をここに閉じ込める):
  - `@/components/Header` と `@/components/Footer` を import する。
  - `export default function MainLayout({ children }: { children: React.ReactNode })` が `<Header />{children}<Footer />` を返す (現 root layout の本体部分を移植)。
  - `<html>`/`<body>`/`metadata`/`globals.css`/`GoogleAnalytics` は **含めない** (それらは root layout の責務として残す)。Route Group の layout は root の `<body>` の内側にネストされるため、ここでは断片 (Fragment かラッパ div) を返すだけでよい。複数要素を返すので `<>...</>` Fragment で囲む。
  - コメントは日本語 (CLAUDE.md)。

ステップ C — `src/app/layout.tsx` (root) を整理:
  - `import Header from '@/components/Header'` と `import Footer from '@/components/Footer'` の **2 行を削除**する。
  - JSX 本体を `<html lang="ja"><body>{children}{GA}</body></html>` に変更する (`<Header />` と `<Footer />` の描画を削除し、`{children}` のみ残す)。
  - `import './globals.css'`、`import type { Metadata }`、`metadata` エクスポート、`GoogleAnalytics`(`process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` ガード付き) は **そのまま残す** (ANLT-01: 全ページ計測を維持。`metadata` と globals.css は root 所属)。

ステップ D — Route Group 衝突の回避を確認:
  - `(main)/page.tsx` と `(auth)/` は同一 URL セグメントを取り合わないこと。`/` は `(main)/page.tsx` のみが解決し、`(auth)/` 配下は `login`・`signin-51cf21389c56` という固有セグメントを持つので衝突しない。`(main)` と `(auth)` は両方 root 直下の Route Group だが、解決先 URL が重複しない限り問題ない (重複時は next build がエラーになる → Task 2 で検証)。

import パスについて: 全ディレクトリを丸ごと移動したため、相対 import (`../page` 等) と `@/` エイリアスは追従不要。もし `next build` / `vitest` で解決エラーが出た場合のみ、当該ファイルの相対 import を移動後パスに合わせて修正する (interfaces の grep 結果上は発生しない見込み)。
  </action>
  <verify>
    <automated>cd /Users/kugyu10/work/keep-substack && test -f "src/app/(main)/layout.tsx" && test -f "src/app/(main)/page.tsx" && test ! -f "src/app/page.tsx" && grep -q "Header" "src/app/(main)/layout.tsx" && grep -q "Footer" "src/app/(main)/layout.tsx" && ! grep -q "components/Header" src/app/layout.tsx && grep -q "GoogleAnalytics" src/app/layout.tsx && echo STRUCTURE_OK</automated>
  </verify>
  <done>
`(main)/layout.tsx` が Header/Footer を描画し、root `layout.tsx` から Header/Footer の import・描画が消え GoogleAnalytics は残る。ページ系ディレクトリが `(main)/` 配下に移動済み。`(auth)/layout.tsx` は無変更。STRUCTURE_OK が出力される。
  </done>
</task>

<task type="auto">
  <name>Task 2: テストとビルドで Route Group の正しさを検証する</name>
  <files>(検証のみ — 失敗時は Task 1 の対象ファイルを修正)</files>
  <action>
  - `npm test` (vitest run) を実行し、全テストが緑であることを確認する。移動した各 `__tests__/` の相対 import (`../page`, `../actions`, `../[teamName]/page` 等) がディレクトリ丸ごと移動で維持されていることが、テスト解決成功で裏付けられる。失敗が出た場合は当該テストの相対 import を移動後パスに合わせて修正する (interfaces の grep では発生しない見込み)。
  - `npm run build` (next build) を実行し、成功することを確認する。ビルド成功は (1) Route Group `(main)`/`(auth)` が同一 URL に衝突していないこと、(2) 全ルートの import 解決が壊れていないこと、を同時に保証する。`(main)` と `(auth)` が `/` 等を取り合う場合 next build は "You cannot have two parallel pages that resolve to the same path" 系のエラーを出すため、ビルド成功でこの衝突がないことが確定する。
  - 失敗した場合は Task 1 のステップに戻り、移動漏れ・import パス・layout の重複描画を修正してから再実行する。
  </action>
  <verify>
    <automated>cd /Users/kugyu10/work/keep-substack && npm test && npm run build</automated>
  </verify>
  <done>
`npm test` が全テスト緑、`npm run build` が成功 (Route Group 衝突なし・import 解決成功)。URL は不変 (Route Group は URL に現れない) なので middleware の `/login` リダイレクトや各 Link の参照は変更不要。
  </done>
</task>

</tasks>

<verification>
- `src/app/(main)/layout.tsx` に Header/Footer がある (`grep Header`/`grep Footer`)。
- `src/app/(auth)/layout.tsx` に Header/Footer がない (無変更)。
- `src/app/layout.tsx` に GoogleAnalytics のみ (Header/Footer の import・描画なし、`grep -v components/Header` 成立、`grep GoogleAnalytics` 成立)。
- `npm test` 緑、`npm run build` 成功。
- URL 不変: `/`, `/my`, `/admin`, `/member/*`, `/daily` のパスは Route Group 化前後で同一。
</verification>

<success_criteria>
- /login と /signin-51cf21389c56 のレンダリングツリーに Header/Footer が含まれない (コードレベル: `(auth)/layout.tsx` + 整理後の root layout のどちらにも Header/Footer がない)。
- /, /my, /admin, /member/*, /daily に Header/Footer が表示される ((main)/layout.tsx 経由)。
- GoogleAnalytics が全ページで読み込まれる (root layout に残置, ANLT-01 維持)。
- npm test 全緑かつ npm run build 成功。
- 既存 URL とリダイレクト先 (/login) が一切変わらない。
</success_criteria>

<output>
Create `.planning/quick/260611-ebu-ui-01-fix-move-pages-into-main-route-gro/260611-ebu-SUMMARY.md` when done
</output>
