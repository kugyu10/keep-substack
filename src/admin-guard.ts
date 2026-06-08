import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// admin-guard.ts: /admin 認可ロジック（ユニットテスト専用モジュール）
// src/middleware.ts が Next.js の実ミドルウェアとして動作する。
// この関数は src/__tests__/proxy.test.ts から直接インポートされてテストされる。
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションをリフレッシュ（getUser() はサーバー側検証でセキュア）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /admin: admin ロール必須 (auth.users.role カラムで判定)
  if (pathname.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /my: ログイン必須
  if (pathname.startsWith('/my')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

// NOTE: proxy.ts は /admin 認可ロジックのユニットテスト専用モジュール。
// Next.js middleware は src/middleware.ts が担う（config export なし）。
