import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function Footer() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let publicationId: string | null = null
  if (user) {
    const admin = createSupabaseAdminClient()
    const { data: member } = await admin
      .from('members')
      .select('publication_id')
      .eq('user_id', user.id)
      .maybeSingle()
    publicationId = member?.publication_id ?? null
  }

  return (
    <footer className="py-4 text-center">
      <span className="text-xs text-gray-400">
        {!user && (
          <>このSubstack継続可視化ツールに参加したい方は{' '}
            <a
              href="https://uojun.substack.com/p/8cd"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FF6719] underline"
            >
              コチラ
            </a>
          </>
        )}
        {user && publicationId && (
          <>あなたの個人ビューは{' '}
            <Link href={`/member/${publicationId}`} className="hover:text-[#FF6719] underline">
              コチラ
            </Link>
          </>
        )}
        {user && !publicationId && (
          <>参加登録は{' '}
            <Link href="/my" className="hover:text-[#FF6719] underline">
              コチラ
            </Link>
          </>
        )}
      </span>
    </footer>
  )
}
