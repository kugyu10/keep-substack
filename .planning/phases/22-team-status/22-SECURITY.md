---
phase: 22
slug: team-status
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-30
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| CLI→Supabase DB | `supabase db push` でDDLを本番DBに適用 | スキーマ変更DDL/DML |
| Supabase→アプリ | getMembers() が status を含む teams データを取得 | チーム status（公開データ） |
| URLクエリ→フィルタ | `?team=` クエリパラメータがフィルタリングに渡る | チーム名（公開情報） |
| ブラウザ→Server Action | updateTeamStatusAction は adminロール認証必須 | teamId, status |
| middleware→/admin/teams | proxy.ts の `startsWith('/admin')` で認証ゲート | セッションCookie |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-22-01 | Tampering | supabase/migrations/20260517_add_team_status.sql | accept | git管理下・コードレビュー・git historyで追跡 | closed |
| T-22-02 | Denial of Service | Supabase DB schema push | accept | `IF NOT EXISTS` で冪等性確保（二重実行でも無影響） | closed |
| T-22-03 | Information Disclosure | Member.teams[].status | accept | status は公開データ（タブ制御用）、機密情報なし | closed |
| T-22-04 | Tampering | updateMember() teams参照 | accept | service_role経由のみ書込可、RLSで一般ユーザーをブロック | closed |
| T-22-05 | Information Disclosure | page.tsx team フィルタ | accept | hidden は Allビューから除外。team名直指定でのアクセスは低リスク（メンバー名は公開情報）として許容 | closed |
| T-22-06 | Tampering | AdminMemberList フォーム送信 | accept | Server Action 側で `requireAdmin()` 認証チェック済み | closed |
| T-22-07 | Elevation of Privilege | updateTeamStatusAction | mitigate | `requireAdmin()` が `app_metadata.role !== 'admin'` を検証→失敗時 '権限がありません' を返し書込ブロック（actions.ts で実装確認済み） | closed |
| T-22-08 | Tampering | status値の入力検証 | accept | 不正な status 文字列でも機能に影響なし。スキーマ制約は Phase 25 で検討 | closed |
| T-22-09 | Spoofing | /admin/teams ルート保護 | accept | proxy.ts:34 `pathname.startsWith('/admin')` でカバー済み（追加matcherは不要） | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-22-01 | T-22-01 | マイグレーションファイルは git 管理下で追跡可能 | kugyu10 | 2026-05-30 |
| R-22-02 | T-22-02 | `IF NOT EXISTS` による冪等性で二重実行無害 | kugyu10 | 2026-05-30 |
| R-22-03 | T-22-03 | team status は公開データ、機密性なし | kugyu10 | 2026-05-30 |
| R-22-04 | T-22-04 | RLS + service_role により一般ユーザー書込不可 | kugyu10 | 2026-05-30 |
| R-22-05 | T-22-05 | team名推測による hidden アクセスは低リスク（メンバー名は公開）。Phase 24 で管理者専用ビュー実装予定 | kugyu10 | 2026-05-30 |
| R-22-06 | T-22-06 | Server Action 側 `requireAdmin()` で担保 | kugyu10 | 2026-05-30 |
| R-22-08 | T-22-08 | status値検証なしでも機能影響なし。Phase 25 でスキーマ制約検討 | kugyu10 | 2026-05-30 |
| R-22-09 | T-22-09 | proxy.ts の `/admin` ゲートで既にカバー | kugyu10 | 2026-05-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-30 | 9 | 9 | 0 | gsd:secure-phase (artifact-derived, mitigations verified) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-30
