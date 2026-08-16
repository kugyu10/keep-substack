// 機能2（Note 一覧）取得層。Phase 42（コメント可視化）でも再利用される安定 API。
// DB・キャッシュ・永続化なし（NOTE-01）。fetch は cache:'no-store'、ページは force-dynamic で二重担保。

// src/lib/notes.ts が export する型（Phase 42 で再利用される安定 API）
export type NoteItem = {
  id: number // item.comment.id（一意キー）
  body: string // item.comment.body（plain text, \n 含む。pre-wrap で描画）
  date: string // item.comment.date（ISO UTC, Z 付き。描画側で JST 整形）
}

export type NoteListResult =
  | { status: 'ok'; notes: NoteItem[] } // notes.length===0 が「0件」
  | { status: 'error' } // 取得失敗 / env 未設定

const RETRY_DELAY_MS = 1000 // fetchFeed.ts 踏襲: リトライ前の待機時間
const TIMEOUT_MS = 5000

// item.context.type === 'note' かつ comment.id/body/date が型整合する item のみ通す型ガード。
// post_restack は comment=null のため自然に除外される（D-04 判別）。
function isNoteItem(item: unknown): item is { comment: { id: number; body: string; date: string } } {
  if (typeof item !== 'object' || item === null) return false
  const it = item as Record<string, unknown>
  const context = it.context
  if (typeof context !== 'object' || context === null) return false
  if ((context as Record<string, unknown>).type !== 'note') return false
  const comment = it.comment
  if (typeof comment !== 'object' || comment === null) return false
  const c = comment as Record<string, unknown>
  return typeof c.id === 'number' && typeof c.body === 'string' && typeof c.date === 'string'
}

// 純関数（fetch 非依存・テスト対象）。不正/空入力でも throw せず空配列を返す（RESEARCH 型ガード思想）。
export function parseNoteFeed(json: unknown): NoteItem[] {
  if (typeof json !== 'object' || json === null) return []
  const items = (json as Record<string, unknown>).items
  if (!Array.isArray(items)) return []
  return items.filter(isNoteItem).map((item) => ({
    id: item.comment.id,
    body: item.comment.body,
    date: item.comment.date,
  }))
}

// MANIFEST 確定エンドポイント
function buildFeedUrl(userId: string): string {
  return `https://substack.com/api/v1/reader/feed/profile/${userId}?types=note`
}

// res.ok 不成立は throw（リトライ対象）。成功時 JSON を返す。
async function fetchNotesJson(userId: string): Promise<unknown> {
  const res = await fetch(buildFeedUrl(userId), {
    cache: 'no-store', // 永続化なし（NOTE-01 / Pitfall 4）
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 判別ユニオンを返す。env 未設定→error（fetch しない）。
// 1回目失敗→1秒待ち→1回リトライ→なお失敗で error（空配列フォールバックしない＝NOTE-03 / Pitfall 1）。
export async function fetchAdminNotes(): Promise<NoteListResult> {
  const userId = process.env.SUBSTACK_ADMIN_USER_ID
  if (!userId) {
    console.error('[fetchAdminNotes] SUBSTACK_ADMIN_USER_ID が未設定です')
    return { status: 'error' }
  }

  try {
    const json = await fetchNotesJson(userId)
    return { status: 'ok', notes: parseNoteFeed(json) }
  } catch (err) {
    console.warn('[fetchAdminNotes] 1回目の取得に失敗:', err)
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const json = await fetchNotesJson(userId)
      return { status: 'ok', notes: parseNoteFeed(json) }
    } catch (err2) {
      console.error('[fetchAdminNotes] 2回目の取得に失敗:', err2)
      return { status: 'error' }
    }
  }
}
