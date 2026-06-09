import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { isValidPublicationId, parseSubstackHandle } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const pid = searchParams.get('pid')
  const handle = searchParams.get('handle')
  const next = safeRedirectPath(searchParams.get('next'), '/my')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // pid があれば自動紐付けを試みる。
      // H-1/M-3: pid は外部 fetch の URL に埋め込まれるため形式を厳格に検証し、
      // 不正な値は紐付け・INSERT を行わずスキップ（SSRF と不正 member 作成を防止）。
      if (pid && isValidPublicationId(pid)) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // M-3: handle もフォームと同じ検証を適用（不正なら null として扱う）
          const parsedHandle = parseSubstackHandle(handle)
          const safeHandle = parsedHandle.ok ? parsedHandle.value : null

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
            // H-2: claim を監査ログに記録
            console.info(`[audit] member claim: user=${user.id} publication_id=${pid} via=auth/callback`)
          } else if (!member) {
            // D-02: member が存在しない場合 → 新規 member を INSERT
            // H-2: 自動作成も監査ログに記録
            console.info(`[audit] member auto-create: user=${user.id} publication_id=${pid} via=auth/callback`)
            const insertPayload = {
              publication_id: pid,
              name: pid,
              user_id: user.id,
              substack_handle: safeHandle,
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
      // D-02: callback 時点で substack_handle は INSERT 済み。next パラメータ先へリダイレクト
      return NextResponse.redirect(new URL(next, origin))
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error)
  }

  return NextResponse.redirect(new URL('/', origin))
}
