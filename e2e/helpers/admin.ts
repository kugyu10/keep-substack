// service_role admin client for E2E tests — verbatim clone of
// src/lib/supabase/admin.ts (renamed createTestAdmin). Cloned rather than
// imported via @/ because e2e/ lives outside src/ and loads env from .env.test.
// service_role BYPASSES RLS — required for seed, token minting, and member_teams
// cleanup. NEVER expose this to the browser/client bundle.
import { createClient } from '@supabase/supabase-js'

export function createTestAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
