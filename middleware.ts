import { NextRequest, NextResponse } from 'next/server'

// D-01: ADMIN_PASSWORD のみで認証（ユーザー名不要）
// D-02: Next.js Edge Middleware で /admin をインターセプト
// D-03: 認証失敗時は 401 + WWW-Authenticate ヘッダー
export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const encoded = Buffer.from(`:${adminPassword}`).toString('base64')

  if (authHeader !== `Basic ${encoded}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
