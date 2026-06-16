---
status: diagnosed
trigger: "Phase 39 UAT 2件の404: /member/[publicationId]/opengraph-image と /opengraph-image"
created: 2026-06-16
updated: 2026-06-16
---

## Current Focus

hypothesis: opengraph-image ルートは後続コミットで削除済み（スクショ方式に移行）
test: git log で opengraph-image.tsx の存在と削除コミットを追跡
expecting: 削除コミット特定で「現行コードに当該ルート無し→404は正常」確定
next_action: 診断返却（修正不要、UAT期待URLが旧仕様）

## Symptoms

expected:
  - Gap1(test3): /member/[publicationId]/opengraph-image が 1200x630 PNG を返す
  - Gap2(test4): /opengraph-image がサイト共通デフォルトのブランドカードを返す
actual: 両URLとも 404
errors: 404 のみ
reproduction: UAT test 3 / 4
started: Phase 39 UAT 時点

## Eliminated

- hypothesis: main 未デプロイが原因
  evidence: develop の作業ツリー自体に opengraph-image.tsx が存在しないので本番有無以前の問題
  timestamp: 2026-06-16
- hypothesis: ハッシュサフィックス付きURL規約で直アクセスが404になるだけ
  evidence: そもそも当該ファイルが削除済みでルート自体がビルドされない
  timestamp: 2026-06-16

## Evidence

- checked: 作業ツリーの opengraph-image ファイル
  found: src/app/opengraph-image.tsx も (main)/member/[publicationId]/opengraph-image.tsx も存在しない。代わりに src/app/og-view/ と api/og/ がある
  implication: Next.js ファイル規約の OG ルートは現存しない

- checked: git log --follow opengraph-image / OGP-02 コミット 93d23aa
  found: feat(39) OGP-02 で 3ファイル（top/daily/member の opengraph-image.tsx）を追加した
  implication: Phase 39 時点では確かに規約ルートが存在し、UATの期待URLはこの時点のもの

- checked: コミット e697e03 "feat(v1.9): screenshot-based OG images" の stat
  found: opengraph-image.tsx x3（top/daily/member）を明示削除し、api/og/route.tsx + og-view/[view]/page.tsx + og-view/layout.tsx を新設。旧 ImageResponse 一式（ogMembersGrid, ogFonts, ogImageData）も削除
  implication: OG画像は /api/og?view=... のスクショ方式に全面移行。opengraph-image URL は規約上もう存在しない→直アクセス404は正常挙動

- checked: 現行 og:image メタ出力源
  found: member/page.tsx は buildOgImagePath/OG_WIDTH を import し openGraph.images に /api/og?view=... を出力。layout.tsx も openGraph 設定あり
  implication: 実際の og:image は /api/og 経由で配信。opengraph-image を見る必要はない

- checked: feat(39) コミットのブランチ所在
  found: feat(39) は develop のみ、main に無し（main未マージ）。ただし develop でも既に削除済みなので本番未デプロイは404の原因ではない
  implication: 仮にmainマージ＆本番デプロイしても opengraph-image URL は404のまま（仕様）

## Resolution

root_cause: |
  両Gapとも「実バグではない」。Phase 39 (feat39 OGP-02) で追加された Next.js 規約
  ファイル opengraph-image.tsx (top/member/daily) は、後続の v1.9 作業コミット
  e697e03 でスクリーンショット方式（/api/og + /og-view）へ全面移行する際に
  意図的に削除された。よって /opengraph-image および /member/<id>/opengraph-image
  という URL は現行コードのルートマップに存在せず、直アクセス404は正常な挙動。
  UAT test3/4 の期待URL自体が、移行前(Phase39時点)の古い仕様に基づいている。
  実際の og:image は generateMetadata 経由で /api/og?view=... を指している。
fix: 修正不要（コードは現行設計どおり正しい）
verification: ""
files_changed: []
