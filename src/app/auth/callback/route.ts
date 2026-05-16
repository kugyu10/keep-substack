import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const pid = searchParams.get('pid')
  const next = searchParams.get('next') ?? '/my'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // pid があれば自動紐付けを試みる
      if (pid) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const admin = createSupabaseAdminClient()
          const { data: member } = await admin
            .from('members')
            .select('id, user_id')
            .eq('publication_id', pid)
            .maybeSingle()
          if (member && !member.user_id) {
            await admin
              .from('members')
              .update({ user_id: user.id })
              .eq('id', member.id)
          }
        }
      }
      return NextResponse.redirect(new URL(next, origin))
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error)
  }

  return NextResponse.redirect(new URL('/', origin))
}
