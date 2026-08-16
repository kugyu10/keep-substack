import { fetchAdminNotes } from '@/lib/notes'
import LogoutButton from '@/components/LogoutButton'

// fetch の no-store と二重で永続化なしを担保（NOTE-01 / Pitfall 4）
export const dynamic = 'force-dynamic'

// admin ガードは middleware の /admin/:path* matcher で済んでいるため page 側で再ガードしない
export default async function AdminNotesPage() {
  const result = await fetchAdminNotes()

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Note 一覧</h1>
        <LogoutButton />
      </div>
      <div className="mb-6">
        <a href="/admin" className="text-blue-600 hover:underline text-sm">
          管理画面へ戻る
        </a>
      </div>

      {result.status === 'error' ? (
        // (a) 取得失敗 / env 未設定（NOTE-03 / D-07 — 0件とは別文言）
        <p className="text-sm text-red-600">
          Note の取得に失敗しました。時間をおいて再読み込みしてください。
        </p>
      ) : result.notes.length === 0 ? (
        // (b) 取得成功・0件（D-07 — 失敗とは別文言）
        <p className="text-sm text-gray-600">まだ Note がありません。</p>
      ) : (
        // (c) 一覧（NOTE-02）
        <ul className="space-y-4">
          {result.notes.map((n) => (
            <li key={n.id} className="border border-gray-200 rounded-md p-4">
              {/* 本文は whitespace-pre-wrap で改行保持（D-02/D-03）。テキストノード描画で XSS 安全 */}
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{n.body}</p>
              {/* 投稿日時は JST 整形（既存 AdminMemberList 規約踏襲・Pitfall 6） */}
              <p className="text-xs text-gray-500 mt-2">
                {new Date(n.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
