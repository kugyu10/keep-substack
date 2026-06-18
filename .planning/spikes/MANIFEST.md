# Spike Manifest

## Idea

Phase 40 取得可否スパイク（go/no-go ゲート）。Substack には公式 Notes/コメント取得 API が無い。非公式エンドポイント（`substack.com/api/v1/...`）から (a) admin 本人が投稿した Note 一覧、(b) 特定 Note のコメント（件数・本文・コメント者の名前/アイコン）を取得できるかを実測し、v1.10 PoC（機能1コメント可視化・機能2 Note一覧）の go/no-go を出す捨てスパイク。取得不可なら負の結果を文書化してクローズ＝有効な PoC 成果（SPIKE-01, SPIKE-02）。

## Requirements

- 取得は必ずサーバー側（CORS + cookie 露出回避）。クライアント直叩きは不可。
- クレデンシャル（`substack.sid` 等）は `.env.local` に置きコミットしない。raw JSON サンプルに cookie を含めない。
- PoC は最小表示で十分（リッチテキスト完全再現・全件ページネーションは scope 外）。
- residential proxy / TLS フィンガープリント偽装は scope 外。正当な低頻度リクエストで取れなければ Fallback/負の結果で終える。

## Test Fixtures (operator 提供 2026-06-18)

- admin handle / profile: `uojun` → `https://substack.com/@uojun`
- user_id: `110584954`（profile API より取得済み）
- テスト対象 Note: `https://substack.com/@uojun/note/c-276780760` → note/comment id = `276780760`（`c-` prefix を除去）

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | substack-notes-list | standard | admin の user_id で非公式フィードを GET → 投稿 Note 一覧（本文+投稿日時）が返るか | ⚠ PARTIAL | notes, feasibility |
| 002 | substack-note-comments | standard | Note id で非公式エンドポイントを GET → コメント件数+本文+コメント者名/アイコンが返るか | ⚠ PARTIAL | comments, feasibility |
| 003 | vercel-reachability | standard | 001/002 のエンドポイントを deployed Vercel Function（datacenter IP）から呼び 403/ブロックされないか | ○ PENDING | vercel, cloudflare |

## Early Findings (2026-06-18, 無認証ローカル probe)

**強い go シグナル — 主要 2 エンドポイントが無認証で HTTP 200。**

- **001 profile probe**: `GET https://substack.com/api/v1/user/uojun/public_profile` → HTTP 200 / 143KB。`id=110584954`, `name`, `photo_url`, `bio`, `hasPosts`, `hasActivity` 取得。⚠ Note 一覧は profile 内に無い → 別フィード（`/api/v1/reader/feed/profile/{user_id}` 等）の特定が残課題。raw: `001-substack-notes-list/raw/profile.json`
- **002 comment probe**: `GET https://substack.com/api/v1/reader/comment/276780760` → HTTP 200 / 5.6KB。Note 本体（`item.type=comment`, `item.context.type=note`, `item.comment.body`）+ `children_count: 4`, `reaction_count: 9` を確認。⚠ 返信4件は本応答に inline されず（`children`=空配列）→ children 取得エンドポイント/パラメータの特定が残課題。raw: `002-substack-note-comments/raw/comment_reader.json`

### 次セッションの残課題（fresh context で実走）

1. **002**: Note の children（実コメント = 名前/アイコン/本文）を返すエンドポイント特定。候補: `comment/{id}` の query param、`/api/v1/post/{id}/comments`、reader feed の comment ツリー展開。
2. **001**: user_id `110584954` の Note 一覧フィード特定。候補: `/api/v1/reader/feed/profile/{user_id}`, `/api/v1/notes`。
3. **003**: 1/2 確定後、Vercel preview Function から実呼び出しして datacenter IP ブロック（Cloudflare 403）有無を検証。
4. 各 spike の README（frontmatter + Investigation Trail + Results）整備、verdict 確定、go/no-go レポート作成。
