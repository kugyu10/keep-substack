// Mint production-identical Supabase auth cookies WITHOUT hand-rolling encoding.
//
// THE critical pattern (RESEARCH Pattern 1): proxy.ts validates cookies via
// `createServerClient(...).auth.getUser()`. By driving the SAME @supabase/ssr
// library to write the cookies (in-memory getAll/setAll capture), the format is
// guaranteed compatible — cookie name `sb-<ref>-auth-token`, `base64-` prefix,
// and 3180-byte chunking (`.0`/`.1` suffixes) are all produced internally. We do
// NOT hand-write any of that encoding.
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

type Cookie = {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax'
}

export async function mintAuthCookies(email: string): Promise<Cookie[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // service_role admin client to mint tokens server-side (no email sent).
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Generate a magic-link token, then verify it server-side for a session.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr) throw linkErr

  // generateLink returns the usable token at properties.hashed_token (Pitfall 4).
  const tokenHash = link.properties?.hashed_token
  if (!tokenHash) {
    throw new Error(
      `mintAuthCookies: generateLink returned no hashed_token (got: ${JSON.stringify(
        link.properties
      )})`
    )
  }

  // magiclink verifies as type:'email' server-side.
  const { data: verified, error: vErr } = await admin.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  })
  if (vErr || !verified.session) {
    throw vErr ?? new Error('mintAuthCookies: verifyOtp returned no session')
  }
  const { access_token, refresh_token } = verified.session

  // 2. Let @supabase/ssr serialize the cookies for us via setSession.
  const captured: { name: string; value: string; options?: unknown }[] = []
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => {
        captured.push(...toSet)
      },
    },
  })
  await ssr.auth.setSession({ access_token, refresh_token })

  // 3. Map to Playwright cookie shape. The cookie must be sent to the APP host
  //    (localhost), NOT the Supabase host — Playwright matches storageState
  //    cookies by the page's domain (Pitfall 3). Never copy the Supabase host in.
  return captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain: 'localhost',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // ~1 day
    httpOnly: false, // @supabase/ssr DEFAULT_COOKIE_OPTIONS.httpOnly = false
    secure: false, // localhost http
    sameSite: 'Lax' as const, // DEFAULT_COOKIE_OPTIONS.sameSite = 'lax'
  }))
}
