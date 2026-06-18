import { getNoteComments } from '@/lib/comments'

// fetch の no-store と二重で永続化なしを担保（admin/notes/page.tsx 踏襲・Pitfall 4）
export const dynamic = 'force-dynamic'

// D-公開ルート: middleware matcher は /admin・/my のみのため /notes は素通り
// （認証ガード不要・LogoutButton も置かない）。
// Next.js 16 では searchParams は Promise なので await する。
type Props = {
  searchParams: Promise<{ id?: string; force?: string }>
}

// 名前の先頭1文字を取り出す（イニシャル fallback 用・COMMENT-04）。
function initial(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?'
}

export default async function NotesPage({ searchParams }: Props) {
  const { id, force } = await searchParams
  const trimmedId = id?.trim() ?? ''

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Note コメント</h1>
        <p className="text-sm text-gray-600 mt-1">
          Note の URL または ID を入力すると、コメント件数と一覧を表示します。
        </p>
      </div>

      {/* 入力フォーム（method なし＝GET）。COMMENT-01 */}
      <form method="get" className="mb-8 flex gap-2">
        <input
          type="text"
          name="id"
          defaultValue={trimmedId}
          placeholder="https://substack.com/.../note/c-276780760 または 276780760"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700"
        >
          表示
        </button>
      </form>

      {/* (0) 未入力（キャッシュ無/未入力状態）: getNoteComments を呼ばない。COMMENT-06 */}
      {trimmedId === '' ? (
        <p className="text-sm text-gray-600">Note の URL または ID を入力してください。</p>
      ) : (
        // id 指定時のみ取得して描画
        await renderComments(trimmedId, force === '1')
      )}
    </main>
  )
}

// id 指定時のコメント取得 + 3状態分岐描画（COMMENT-02/03/04/05/06）。
async function renderComments(id: string, force: boolean) {
  const result = await getNoteComments(id, { force })

  // (a) 未入力以外の異常系: invalid_input / error を別文言で描画（COMMENT-06）
  if (result.status === 'invalid_input') {
    return (
      <p className="text-sm text-red-600">
        URL/ID を認識できませんでした。Note の URL または数字 ID を入力してください。
      </p>
    )
  }
  if (result.status === 'error') {
    return (
      <p className="text-sm text-red-600">
        コメントの取得に失敗しました。時間をおいて再読み込みしてください。
      </p>
    )
  }

  // (b) status === 'ok'
  return (
    <div>
      {/* 件数（COMMENT-02） */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-medium text-gray-900">コメント {result.count} 件</p>
        {/* force 再取得（COMMENT-05）: 現在の id を保持して force=1 で GET */}
        <a
          href={`/notes?id=${encodeURIComponent(id)}&force=1`}
          className="text-blue-600 hover:underline text-sm"
        >
          再取得
        </a>
      </div>

      {/* キャッシュ注記（軽い情報表示） */}
      <p className="text-xs text-gray-400 mb-4">
        {result.fromCache ? 'キャッシュ済み' : '最新を取得'}（
        {new Date(result.fetchedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} JST）
      </p>

      {result.comments.length === 0 ? (
        // 0件: error と別文言（COMMENT-06）
        <p className="text-sm text-gray-600">まだコメントがありません。</p>
      ) : (
        // フラットなコメント一覧（COMMENT-03）
        <ul className="space-y-4">
          {result.comments.map((c) => (
            <li key={c.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center gap-3 mb-2">
                {/* アイコン: photoUrl があれば plain <img>、null/空ならイニシャル（COMMENT-04） */}
                {c.photoUrl ? (
                  // next/image は使わない（外部任意ドメイン・PoC）
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="w-8 h-8 rounded-full object-cover bg-gray-100"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-medium">
                    {initial(c.name)}
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900">{c.name}</span>
              </div>
              {/* 本文は whitespace-pre-wrap で改行保持。テキストノード描画で XSS 安全（T-42-05） */}
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{c.body}</p>
              {/* 投稿日時は JST 整形（admin/notes/page.tsx 規約踏襲） */}
              <p className="text-xs text-gray-500 mt-2">
                {new Date(c.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
