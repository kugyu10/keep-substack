import type { User } from '@supabase/supabase-js'

// admin 判定の単一ソース（M-2）。
// 本番 Supabase で対象ユーザーの auth.users.role='admin' を設定済みである前提。
// middleware（edge）/ proxy / server action から共通利用する。
// 型のみの import なのでランタイム依存はなく、edge ランタイムでも安全。
export function isAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return !!user && user.role === 'admin'
}
