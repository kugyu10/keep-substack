// 入力検証の単一ソース（H-1 / H-2 / M-3）。
// publication_id は外部 fetch の URL に埋め込まれるため（src/lib/fetchFeed.ts）、
// SSRF を防ぐ目的で Substack サブドメイン仕様（小文字英数字＋ハイフン）に厳格化する。
// substack_handle のバリデーションも各入口（フォーム・auth callback）で共通化する。

export const PUBLICATION_ID_ERROR =
  'パブリケーションIDの形式が不正です（小文字英数字とハイフンのみ、先頭は英数字）'

// Substack サブドメイン: 小文字英数字＋ハイフン、先頭は英数字、最大63文字。
const PUBLICATION_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/

export function isValidPublicationId(pid: string | null | undefined): boolean {
  return typeof pid === 'string' && PUBLICATION_ID_RE.test(pid)
}

export const SUBSTACK_HANDLE_ERROR =
  'ハンドルに使用できない文字が含まれています（英数字・_・- のみ使用可）'

// ハンドル本体: 英数字＋アンダースコア＋ハイフン、先頭は英数字、最大50文字。
const SUBSTACK_HANDLE_BODY_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/

// 入力ハンドルを正規化（先頭 @ を一度だけ付与）。
// - 空文字 → { ok: true, value: null }
// - 不正文字 → { ok: false }
// - 正常 → { ok: true, value: '@<body>' }
export function parseSubstackHandle(
  raw: string | null | undefined
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = (raw ?? '').trim()
  const body = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (body === '') return { ok: true, value: null }
  if (!SUBSTACK_HANDLE_BODY_RE.test(body)) {
    return { ok: false, error: SUBSTACK_HANDLE_ERROR }
  }
  return { ok: true, value: '@' + body }
}
