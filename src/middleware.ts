import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/authz'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Do not add code between createServerClient and getUser()
  // getUser() contacts the Auth server every call (server-side validation, secure)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /admin: admin ロール必須。判定は isAdmin() に集約（M-2）。
  if (pathname.startsWith('/admin')) {
    if (!isAdmin(user)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /my: ログイン必須。未認証の場合は /login?next=<currentPath> へリダイレクト
  // /notes: 同上。未認証で叩けると substack.com への外向き fetch と
  //         note_comments への行挿入を第三者が無制限に誘発できてしまうため
  //         （?force=1 はキャッシュを丸ごとバイパスする）。
  if (pathname.startsWith('/my') || pathname.startsWith('/notes')) {
    if (!user) {
      const url = request.nextUrl.clone()
      const next = encodeURIComponent(pathname)
      url.pathname = '/login'
      url.search = `?next=${next}`
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*', '/notes', '/notes/:path*'],
}
