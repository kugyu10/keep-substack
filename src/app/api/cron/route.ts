import type { NextRequest } from 'next/server'
import { getMembers } from '@/lib/members'
import { fetchWithRetry } from '@/lib/fetchFeed'
import { saveArticles } from '@/lib/articles'

// D-04: CRON_SECRET Bearer認証（nullチェック先行でバイパス防止）
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const members = await getMembers()

  // Promise.allSettled: 1件の失敗で全体を止めない
  await Promise.allSettled(
    members.map(async (m) => {
      const { items, imageUrl } = await fetchWithRetry(
        `https://${m.publicationId}.substack.com/feed`
      )
      await saveArticles(m.publicationId, items, imageUrl)
    })
  )

  return Response.json({ ok: true, count: members.length })
}
