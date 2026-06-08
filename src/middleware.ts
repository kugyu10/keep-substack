import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // /my: ログイン必須。未認証の場合は /login?next=<currentPath> へリダイレクト
  if (!user) {
    const url = request.nextUrl.clone()
    const next = encodeURIComponent(request.nextUrl.pathname)
    url.pathname = '/login'
    url.search = `?next=${next}`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/my', '/my/:path*'],
}
