import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { mkdir, writeFile } from 'fs/promises'
import { getMembers } from '../src/lib/kvMembers'
import { getArticles } from '../src/lib/kvArticles'

const OUTPUT_DIR = 'scripts/output'

function escapeSql(val: string | null | undefined): string {
  if (val == null) return 'NULL'
  return `'${val.replace(/'/g, "''")}'`
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const members = await getMembers()
  console.log(`メンバー数: ${members.length}`)

  // --- members.sql ---
  const membersLines = members.map((m) => {
    const name = escapeSql(m.name)
    const publicationId = escapeSql(m.substackId)
    const addedAt = escapeSql(m.addedAt)
    // imageUrlはarticlesフェッチ後に更新するためNULLで初期挿入
    return `  (gen_random_uuid(), ${name}, ${publicationId}, NULL, ${addedAt})`
  })
  const membersSql = [
    '-- members INSERT（Supabase SQL Editor で実行: 1番目）',
    'INSERT INTO members (id, name, publication_id, image_url, added_at) VALUES',
    membersLines.join(',\n'),
    'ON CONFLICT (publication_id) DO NOTHING;',
  ].join('\n')
  await writeFile(`${OUTPUT_DIR}/members.sql`, membersSql)
  console.log('members.sql を生成しました')

  // --- teams.sql ---
  const allTeamNames = [...new Set(members.flatMap((m) => m.teamNames))].sort()
  console.log(`チーム数: ${allTeamNames.length}`)
  const teamsLines = allTeamNames.map((t) => `  (gen_random_uuid(), ${escapeSql(t)})`)
  const teamsSql = [
    '-- teams INSERT（Supabase SQL Editor で実行: 2番目）',
    'INSERT INTO teams (id, name) VALUES',
    teamsLines.join(',\n'),
    'ON CONFLICT (name) DO NOTHING;',
  ].join('\n')
  await writeFile(`${OUTPUT_DIR}/teams.sql`, teamsSql)
  console.log('teams.sql を生成しました')

  // --- member_teams.sql ---
  const memberTeamsLines: string[] = []
  for (const m of members) {
    for (const teamName of m.teamNames) {
      memberTeamsLines.push(
        `INSERT INTO member_teams (member_id, team_id)\n` +
        `  SELECT m.id, t.id FROM members m, teams t\n` +
        `  WHERE m.publication_id = ${escapeSql(m.substackId)} AND t.name = ${escapeSql(teamName)}\n` +
        `  ON CONFLICT DO NOTHING;`
      )
    }
  }
  const memberTeamsSql = [
    '-- member_teams INSERT（Supabase SQL Editor で実行: 3番目）',
    memberTeamsLines.join('\n'),
  ].join('\n')
  await writeFile(`${OUTPUT_DIR}/member_teams.sql`, memberTeamsSql)
  console.log('member_teams.sql を生成しました')

  // --- articles.sql + members.image_url 更新 ---
  const articlesLines: string[] = []
  const imageUrlUpdates: string[] = []

  for (const m of members) {
    const feed = await getArticles(m.substackId)

    // imageUrlをmembers.image_urlに反映（UPDATEで後追い）
    if (feed.imageUrl) {
      imageUrlUpdates.push(
        `UPDATE members SET image_url = ${escapeSql(feed.imageUrl)}\n` +
        `  WHERE publication_id = ${escapeSql(m.substackId)};`
      )
    }

    for (const item of feed.items) {
      if (!item.link) continue
      const publicationId = escapeSql(m.substackId)
      const title = escapeSql(item.title)
      const link = escapeSql(item.link)
      const pubDate = item.isoDate
        ? `'${item.isoDate}'::TIMESTAMPTZ`
        : item.pubDate
          ? escapeSql(item.pubDate)
          : 'NULL'
      articlesLines.push(
        `  (gen_random_uuid(), ${publicationId}, ${title}, ${link}, ${pubDate})`
      )
    }
  }

  const articlesSql = [
    '-- articles INSERT（Supabase SQL Editor で実行: 4番目）',
    ...(imageUrlUpdates.length > 0
      ? ['-- members.image_url の更新', ...imageUrlUpdates, '']
      : []),
    'INSERT INTO articles (id, publication_id, title, link, pub_date) VALUES',
    articlesLines.join(',\n'),
    'ON CONFLICT (link) DO NOTHING;',
  ].join('\n')
  await writeFile(`${OUTPUT_DIR}/articles.sql`, articlesSql)

  console.log(`articles.sql を生成しました（${articlesLines.length} 件）`)
  console.log('\n完了。実行順序: members.sql → teams.sql → member_teams.sql → articles.sql')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
