// Phase 42-1: Note コメント取得＋キャッシュ層。
// notes.ts の parseNoteFeed と同じ型ガードスタイルを 1:1 で踏襲。
// 取得は cache:'no-store' + AbortSignal.timeout(5000) + 1秒1回リトライ。
// 鮮度判定は note_comments.fetched_at と CACHE_TTL_MS(30分) で行う。
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// RESEARCH 確定型と完全一致。reactionCount は含めない（COMMENT-07 は将来フェーズへ defer）。
export type CommentItem = {
  id: number
  name: string
  body: string
  photoUrl: string | null // 取得不可は null（COMMENT-04）
  date: string // ISO UTC, Z 付き
}

// getNoteComments の判別ユニオン（notes.ts NoteListResult 踏襲）。
export type CommentsResult =
  | { status: 'ok'; count: number; comments: CommentItem[]; fetchedAt: string; fromCache: boolean }
  | { status: 'invalid_input' } // parseNoteId が null（COMMENT-01）
  | { status: 'error' } // 取得失敗（stale フォールバックしない＝A2 / COMMENT-06）

export const CACHE_TTL_MS = 30 * 60 * 1000 // 30分（COMMENT-05）
const RETRY_DELAY_MS = 1000 // notes.ts 踏襲: リトライ前の待機時間
const TIMEOUT_MS = 5000

// ============================================================
// 純関数（fetch / supabase 非依存・テスト対象）
// ============================================================

// URL / c-付き / 裸の ID を寛容にパースし、数字 ID 文字列を返す。
// 数字が取り出せない場合は null（COMMENT-01）。
export function parseNoteId(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  // URL / パス末尾 / c- 接頭辞いずれからも「c-」付きまたは裸の数字 ID を拾う。
  // 例: https://substack.com/.../note/c-276780760 / c-276780760 / 276780760
  const match = trimmed.match(/(?:c-)?(\d+)(?!.*\d)/)
  if (!match) return null
  return match[1]
}

// reader レスポンス（item.comment.children_count）を件数として取り出す型ガード付き純関数。
// 不正 json は 0 を返し throw しない（COMMENT-02）。
export function parseComment(json: unknown): number {
  if (typeof json !== 'object' || json === null) return 0
  const item = (json as Record<string, unknown>).item
  if (typeof item !== 'object' || item === null) return 0
  const comment = (item as Record<string, unknown>).comment
  if (typeof comment !== 'object' || comment === null) return 0
  const count = (comment as Record<string, unknown>).children_count
  return typeof count === 'number' ? count : 0
}

// commentBranches[].comment をフラットな CommentItem[] に変換（COMMENT-03）。
// photo_url を string|null 正規化（COMMENT-04）。不正 json / 欠落は [] を返し throw しない。
export function parseReplies(json: unknown): CommentItem[] {
  if (typeof json !== 'object' || json === null) return []
  const branches = (json as Record<string, unknown>).commentBranches
  if (!Array.isArray(branches)) return []
  return branches.filter(isReplyBranch).map((branch) => {
    const c = branch.comment
    return {
      id: c.id,
      name: c.name,
      body: c.body,
      photoUrl: typeof c.photo_url === 'string' ? c.photo_url : null,
      date: c.date,
    }
  })
}

// commentBranches の各要素が id:number / name:string / body:string / date:string を満たすか判定。
function isReplyBranch(
  branch: unknown
): branch is { comment: { id: number; name: string; body: string; date: string; photo_url?: unknown } } {
  if (typeof branch !== 'object' || branch === null) return false
  const comment = (branch as Record<string, unknown>).comment
  if (typeof comment !== 'object' || comment === null) return false
  const c = comment as Record<string, unknown>
  return (
    typeof c.id === 'number' &&
    typeof c.name === 'string' &&
    typeof c.body === 'string' &&
    typeof c.date === 'string'
  )
}

// fetched_at 文字列を Date 化し now との差が CACHE_TTL_MS 未満なら true（COMMENT-05）。
export function isFresh(fetchedAt: string, now: number = Date.now()): boolean {
  const t = new Date(fetchedAt).getTime()
  if (Number.isNaN(t)) return false
  return now - t < CACHE_TTL_MS
}

// ============================================================
// fetch ヘルパ（非公開・notes.ts と同じ no-store + timeout + 1秒1回リトライ）
// ============================================================

// MANIFEST 確定エンドポイント（spike 002 で検証済み）。
function buildCommentUrl(noteId: string): string {
  return `https://substack.com/api/v1/reader/comment/${noteId}`
}
function buildRepliesUrl(noteId: string): string {
  return `https://substack.com/api/v1/reader/comment/${noteId}/replies`
}

// res.ok 不成立は throw（リトライ対象）。成功時 JSON を返す。
async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: 'no-store', // 永続化なし（Pitfall 4）。キャッシュは note_comments 側で管理
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 2エンドポイント（本体＝件数 / replies＝一覧）を 1回の試行でまとめて取得。
// A4: ページング非対応。件数は children_count（parseComment）を正とする。
async function fetchOnce(noteId: string): Promise<{ count: number; comments: CommentItem[] }> {
  const [commentJson, repliesJson] = await Promise.all([
    fetchJson(buildCommentUrl(noteId)),
    fetchJson(buildRepliesUrl(noteId)),
  ])
  return { count: parseComment(commentJson), comments: parseReplies(repliesJson) }
}

// notes.ts 踏襲: 1回目失敗→1秒待ち→1回リトライ→なお失敗で throw（stale フォールバックしない）。
async function fetchWithRetry(noteId: string): Promise<{ count: number; comments: CommentItem[] }> {
  try {
    return await fetchOnce(noteId)
  } catch (err) {
    console.warn('[getNoteComments] 1回目の取得に失敗:', err)
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    return await fetchOnce(noteId) // 2回目も失敗時は throw が呼び出し元へ伝播
  }
}

// ============================================================
// getNoteComments — キャッシュ hit/miss/stale/force + upsert
// ============================================================

// (1) parseNoteId→null なら invalid_input（fetch も select もしない・COMMENT-01）
// (2) note_comments を select、(3) cache hit（fresh && !force）なら fromCache:true で返す（COMMENT-05）
// (4) miss/stale/force なら 2エンドポイント fetch（失敗時 error・stale フォールバックしない＝A2/COMMENT-06）
// (5) 成功時 service_role で upsert して fromCache:false で返す
export async function getNoteComments(
  input: string,
  opts?: { force?: boolean }
): Promise<CommentsResult> {
  const noteId = parseNoteId(input)
  if (noteId === null) {
    return { status: 'invalid_input' }
  }

  const force = opts?.force === true

  // (2) キャッシュ参照（anon/public select）
  const supabase = await createSupabaseServerClient()
  const { data: cached } = await supabase
    .from('note_comments')
    .select('comment_count, comments, fetched_at')
    .eq('note_id', noteId)
    .maybeSingle()

  // (3) cache hit: fresh かつ force でない → fetch せず返す
  if (cached && !force && isFresh(cached.fetched_at)) {
    return {
      status: 'ok',
      count: cached.comment_count,
      comments: (cached.comments ?? []) as CommentItem[],
      fetchedAt: cached.fetched_at,
      fromCache: true,
    }
  }

  // (4) miss / stale / force: 外部 fetch。失敗時は error（stale を返さない＝A2）
  let fresh: { count: number; comments: CommentItem[] }
  try {
    fresh = await fetchWithRetry(noteId)
  } catch (err2) {
    console.error('[getNoteComments] 2回目の取得に失敗:', err2)
    return { status: 'error' }
  }

  // (5) service_role で upsert（note_id 衝突時 update）。fetched_at は now() で更新。
  const fetchedAt = new Date().toISOString()
  const admin = createSupabaseAdminClient()
  await admin.from('note_comments').upsert(
    {
      note_id: noteId,
      comment_count: fresh.count,
      comments: fresh.comments,
      fetched_at: fetchedAt,
    },
    { onConflict: 'note_id' }
  )

  return {
    status: 'ok',
    count: fresh.count,
    comments: fresh.comments,
    fetchedAt,
    fromCache: false,
  }
}
