---
spike: 003-vercel-reachability
type: standard
validates: 001/002 のエンドポイントを deployed Vercel Function（datacenter IP）から呼び 403/ブロックされないか
verdict: GO
date: 2026-06-18
tags: [vercel, cloudflare]
---

# Spike 003 — Vercel datacenter IP 到達性

## 検証したいこと

001/002 で確定したエンドポイントはローカル（住宅 IP）では 200 だが、Substack は Cloudflare 配下。**Vercel の datacenter IP からだと Cloudflare に 403/challenge でブロックされる**ケースが実在する。本番想定の Vercel Function（サーバー側 fetch）から呼んで実際に通るかが PoC の最終ゲート。

## 方法

- 捨てブランチ `spike/040-vercel-probe` に throwaway API route `GET /api/spike-probe` を作成（`src/app/api/spike-probe/route.ts`、runtime=nodejs）。
- push → GitHub 連携で Vercel が自動プレビュー deploy。
- プレビューに Deployment Protection（401）がかかっていたため `vercel curl`（自動 bypass token 生成）で関数を起動。
- 関数内で 3 エンドポイントをサーバー側 fetch し、status / bytes / JSON 妥当性 / `server` / `cf-ray` / `cf-mitigated` ヘッダを記録。

## Results

実行環境: **region=`iad1`, env=`preview`**（Vercel datacenter IP）

| endpoint | status | bytes | jsonOk | server | cf-mitigated | ms |
|----------|--------|-------|--------|--------|--------------|-----|
| 001 profile feed | 200 | 187,240 | ✅ true | cloudflare | none | 185 |
| 002a comment | 200 | 4,508 | ✅ true | cloudflare | none | 55 |
| 002b replies | 200 | 13,582 | ✅ true | cloudflare | none | 69 |

- 全て **HTTP 200・有効な JSON**。`cf-mitigated` 無し＝Cloudflare の challenge/ブロック発動なし。
- レイテンシ 55–185ms と良好。datacenter IP でのブロックは観測されず。

## Verdict: GO

Vercel datacenter IP から無認証で 3 エンドポイントとも問題なく取得可能。PoC（機能1/機能2）はサーバー側 fetch で成立する。

## 留意点（実装フェーズへの申し送り）

- 今回は無認証・低頻度・単発。**本番の頻度/同時実行が上がるとレート制限や IP 評価でブロックされる可能性は残る** → キャッシュ（機能1の `note_comments` Supabase キャッシュ・鮮度判定）と低頻度化が重要。
- 非公式エンドポイントのため**予告なき仕様変更リスク**あり。エラーハンドリング＋負の結果時のフォールバック表示を機能側で持つ。
- `vercel curl` が project レベルの **deployment protection bypass token** を生成した（`prj_cVwsNS8YXUfifPbmwFjd8npxFCU7`）。気になる場合は Vercel ダッシュボードで無効化可能。
- `?types=note` で note 種別に絞り込み可（001）。返信は `nextCursor`/`moreBranches` でページング（002）。

## Raw

- `raw/vercel_probe.json` — Vercel preview（iad1）からの probe 結果
