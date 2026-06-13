import { renderMembersGridOg, OG_SIZE } from '@/lib/ogMembersGrid'

// サイト共通（top `/`）OG画像。CommitGoalView 同等の「仲間一覧風」を実データで再現する。
// 描画ロジックは ogMembersGrid に集約（`/daily` と共有）。ルートは薄く保つ。

export const alt = 'Keep Substack — コミット&ゴール（みんなのSubstack継続）'
export const size = OG_SIZE
export const contentType = 'image/png'

// page.tsx の ISR（revalidate = 300）に合わせる。
export const revalidate = 300

export default async function OpengraphImage() {
  return renderMembersGridOg('goal')
}
