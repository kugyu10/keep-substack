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
| 001 | substack-notes-list | standard | admin の user_id で非公式フィードを GET → 投稿 Note 一覧（本文+投稿日時）が返るか | ✅ GO | notes, feasibility |
| 002 | substack-note-comments | standard | Note id で非公式エンドポイントを GET → コメント件数+本文+コメント者名/アイコンが返るか | ✅ GO | comments, feasibility |
| 003 | vercel-reachability | standard | 001/002 のエンドポイントを deployed Vercel Function（datacenter IP）から呼び 403/ブロックされないか | ✅ GO | vercel, cloudflare |

## Early Findings (2026-06-18, 無認証ローカル probe)

**強い go シグナル — 主要 2 エンドポイントが無認証で HTTP 200。**

- **001 profile probe**: `GET https://substack.com/api/v1/user/uojun/public_profile` → HTTP 200 / 143KB。`id=110584954`, `name`, `photo_url`, `bio`, `hasPosts`, `hasActivity` 取得。⚠ Note 一覧は profile 内に無い → 別フィード（`/api/v1/reader/feed/profile/{user_id}` 等）の特定が残課題。raw: `001-substack-notes-list/raw/profile.json`
- **002 comment probe**: `GET https://substack.com/api/v1/reader/comment/276780760` → HTTP 200 / 5.6KB。Note 本体（`item.type=comment`, `item.context.type=note`, `item.comment.body`）+ `children_count: 4`, `reaction_count: 9` を確認。⚠ 返信4件は本応答に inline されず（`children`=空配列）→ children 取得エンドポイント/パラメータの特定が残課題。raw: `002-substack-note-comments/raw/comment_reader.json`

### 次セッションの残課題（fresh context で実走）

1. **002**: Note の children（実コメント = 名前/アイコン/本文）を返すエンドポイント特定。候補: `comment/{id}` の query param、`/api/v1/post/{id}/comments`、reader feed の comment ツリー展開。
2. **001**: user_id `110584954` の Note 一覧フィード特定。候補: `/api/v1/reader/feed/profile/{user_id}`, `/api/v1/notes`。
3. **003**: 1/2 確定後、Vercel preview Function から実呼び出しして datacenter IP ブロック（Cloudflare 403）有無を検証。
4. 各 spike の README（frontmatter + Investigation Trail + Results）整備、verdict 確定、go/no-go レポート作成。

---

## go/no-go 判定（2026-06-18 確定）

### 判定: ✅ **GO**

3 スパイクすべて GO。無認証の非公式エンドポイントで機能1（コメント可視化）・機能2（Note 一覧）の取得が成立し、Vercel datacenter IP（iad1）からも Cloudflare ブロックなく 200 を確認。v1.10 PoC を Phase 41/42 へ進める。

### 確定エンドポイント表（すべて無認証・サーバー側 fetch）

| 用途 | メソッド/URL | 取れるもの |
|------|--------------|-----------|
| Note 一覧（機能2） | `GET /api/v1/reader/feed/profile/{user_id}` | `items[].comment`: id/body/date/name/handle/photo_url/children_count/reaction_count。`?types=note` で絞り込み、`nextCursor` でページング |
| Note 本体+件数（機能1） | `GET /api/v1/reader/comment/{id}` | `item.comment`: body/name/photo_url/`children_count`（=コメント件数）/reaction_count |
| コメント返信ツリー（機能1） | `GET /api/v1/reader/comment/{id}/replies` | `commentBranches[].comment`: name/handle/photo_url/body/reaction_count。`moreBranches`/`nextCursor` でページング |

**フィクスチャ:** user_id=`110584954`（@uojun）/ テスト Note id=`276780760`（URL の `c-` prefix 除去）

### 実測サマリ（Vercel iad1 / preview）

| endpoint | status | jsonOk | cf-mitigated | ms |
|----------|--------|--------|--------------|-----|
| profile feed | 200 | ✅ | none | 185 |
| comment | 200 | ✅ | none | 55 |
| replies | 200 | ✅ | none | 69 |

### 実装フェーズへの申し送り（リスク/前提）

- 非公式 API のため**予告なき仕様変更**あり → エラーハンドリング＋負の結果時フォールバック表示を機能側に。
- 今回は低頻度・単発。**頻度/同時実行が増えるとレート制限や IP 評価でのブロック懸念** → 機能1の Supabase キャッシュ（`note_comments` 鮮度判定+force再取得）と低頻度化が重要（Phase 42 設計どおり）。
- 取得は必ずサーバー側（CORS+cookie 露出回避）。今回は cookie 不要だった。
- throwaway probe（`spike/040-vercel-probe` ブランチ + `src/app/api/spike-probe/route.ts`）は捨てコード。verdict 確定後に削除する。
- `vercel curl` が生成した deployment protection bypass token（`prj_cVwsNS8YXUfifPbmwFjd8npxFCU7`）が残存。不要なら Vercel ダッシュボードで無効化可能。
