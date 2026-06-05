import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const pid = searchParams.get('pid')
  const handle = searchParams.get('handle')
  const nextParam = searchParams.get('next') ?? '/my'
  // Open Redirect防止: 内部パスのみ許可
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'

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
          } else if (!member) {
            // D-02: member が存在しない場合 → 新規 member を INSERT
            const insertPayload = {
              publication_id: pid,
              name: pid,
              user_id: user.id,
              substack_handle: handle || null,
            }
            const { error: insertError } = await admin
              .from('members')
              .insert(insertPayload)

            if (insertError?.code === '23505') {
              // substack_handle unique 違反 → null でフォールバック INSERT (D-05)
              await admin
                .from('members')
                .insert({ ...insertPayload, substack_handle: null })
            } else if (insertError) {
              console.error('[auth/callback] member insert:', insertError)
            }
          }
        }
      }
      // D-02: callback 時点で substack_handle は INSERT 済み。/my へ直接リダイレクト
      return NextResponse.redirect(new URL('/my', origin))
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error)
  }

  return NextResponse.redirect(new URL('/', origin))
}
