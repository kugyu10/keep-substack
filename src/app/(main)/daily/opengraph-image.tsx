import { renderMembersGridOg, OG_SIZE } from '@/lib/ogMembersGrid'

// `/daily` の OG画像。top と同じ「仲間一覧風」を実データで再現する（描画は ogMembersGrid に集約）。

export const alt = 'Keep Substack — みんなのSubstack更新'
export const size = OG_SIZE
export const contentType = 'image/png'

export const revalidate = 300

export default async function DailyOpengraphImage() {
  return renderMembersGridOg('daily')
}
