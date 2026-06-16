---
status: resolved
trigger: "Phase 39 ブロッカー: ローカルの /api/og?view=member&publicationId=<id> がスクショ対象を本番URL（https://keep-substack.com/og-view/...）に解決し、page.goto networkidle 25s タイムアウト→fallback→FATAL JS heap OOM(~15GB)でdevサーバークラッシュ"
created: 2026-06-16
updated: 2026-06-16
phase: 39-og-og
reopened: 2026-06-16  # 人手検証で「webpack でもクラッシュ」と報告→再オープン。実測で再反証。
---

# Debug Session: /api/og timeout + OOM crash

## Symptoms

- **Expected behavior:** ローカルで `/api/og?view=member&publicationId=<id>` を開くと 1200x630 の PNG（メンバーOG画像: 草/記事数/ハンドル）が返る。スクショ対象は localhost オリジンであるべき。
- **Actual behavior:** スクショ対象が本番URL `https://keep-substack.com/og-view/member?publicationId=uojun` に解決される → `page.goto` networkidle が 25000ms でタイムアウト → screenshot fallback 経路 → 直後に `FATAL ERROR: Ineffective mark-compacts near heap limit, JavaScript heap out of memory`（heap ~15GB）で dev サーバーがクラッシュ。
- **Error messages:** `page.goto ... networkidle 25000ms timeout`、`FATAL ERROR: ... JavaScript heap out of memory`
- **Timeline:** Phase 39 UAT（2026-06-16）で /api/og 再検証時に発覚。v1.9 でスクショ方式へ移行（commit e697e03）後の挙動。
- **Reproduction:** ローカル dev サーバーで `/api/og?view=member&publicationId=<id>` にアクセス。

## 推定原因（要検証）

1. **オリジン解決バグ:** `getSiteUrl` / `NEXT_PUBLIC_SITE_URL` がローカル環境でも本番ドメイン（keep-substack.com）を返している → スクショ対象が本番URLになる。
2. **リソースリーク:** `page.goto` タイムアウト/fallback 経路で Chromium browser/page が解放されず、リトライまたはメモリリークで OOM。

オリジン解決と OOM は別個の修正の可能性が高い。

## 関連ファイル

- `src/lib/screenshot.ts:99` — `page.goto` networkidle 呼び出し
- `src/app/api/og/route.tsx:106` — `screenshotOg` 呼び出し + fallback
- `getSiteUrl` / `buildOgImagePath` — オリジン解決ロジック
- `NEXT_PUBLIC_SITE_URL` 環境変数

## 参照

- UAT: `.planning/phases/39-og-og/39-UAT.md`（status: partial, test 3 blocker）
- 404 not-a-bug 調査: `.planning/debug/og-image-404.md`
- メモリ: `project-og-screenshot-method.md`（ローカルは NEXT_PUBLIC_SITE_URL + 再起動が必要、本番は Vercel Pro maxDuration）

## Current Focus
<!-- OOM 真因は RESOLVED で不変（下記 Resolution / layout_clip_addendum 参照）。
     現フォーカスは layout フォローアップ: daily の丸径を member 同等に揃える方針変更。 -->

hypothesis: |
  layout フォローアップ（OOM とは別問題）。新方針: daily(WeeklyHeatmapGrid) は全行収容を
  要件にしない。member ビューのカレンダー丸（セル径）と daily ヒートマップの丸径を揃えることが最優先。
  member は scale 0.58。実 PNG 計測で member 丸径 ≈ daily 丸径 となる daily scale を決定する。
test: webpack dev で /api/og?view=member|daily を撮影し PIL で丸の水平径(px)を実測、ratio から daily scale を逆算→再撮影で検証。
expecting: daily scale を上げると daily 丸径が member 丸径に近づく。下端見切れは許容。
next_action: 完了 — daily scale=0.67 採用で member/daily の丸径が一致（実測下記 Evidence）。

reasoning_checkpoint:
  hypothesis: "daily の丸が member より小さく見えるのは、daily ラッパが scale 0.6 でメンバー行を詰め込もうとしているため。member(820px×0.58) と daily(960px×0.6) は元の 7 列グリッドのセル算出幅が異なり、scale 0.6 では daily セルが member セルより小さくなる。daily scale を上げれば丸径が member に一致する（全行収容は捨てる）。"
  confirming_evidence:
    - "PIL 実測(2x PNG): member 丸径 131px(=65.5px@1x), daily 丸径 117px(=58.5px@1x)。member の方が大きい→daily を拡大する必要があると数値で確認。"
    - "幾何計算と一致: member セル=(820-6*4)/7*0.58≈66px, daily セル=(960-208-40-6*4)/7*0.6≈59px。"
    - "ratio member/daily = 131/117 = 1.120 → 必要 daily scale = 0.60*1.120 ≈ 0.672。"
  falsification_test: "daily scale=0.67 で再撮影して daily 丸径が member(131px@2x) と ±5% 以内に揃わなければ本仮説（線形スケールで一致する）は誤り。"
  fix_rationale: "WeeklyHeatmapGrid は不変のまま、ラッパの transform:scale のみ 0.6→0.67 に上げる。丸径は scale に線形比例するので member と一致する。全行収容は要件から外し下端クリップを許容＝ユーザ新方針に合致。fidelity-over-approximation を維持（実コンポーネント無改変）。"
  blind_spots: "メンバー数が更に増えると下端クリップ量が増える（許容済み）。width 960px は据え置き（横幅・列ピッチは member と元々別レイアウトなので丸径一致が基準）。member(0.58)・goal は基準として不変。"

## Evidence

- timestamp: 2026-06-16
  checked: src/lib/siteUrl.ts resolveSiteUrl の優先順位と .env* の中身
  found: |
    .env.local / .env.prod / .env.test いずれにも NEXT_PUBLIC_SITE_URL の設定が無い（grep 0件）。
    ローカル next dev には VERCEL_ENV / VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL も無い。
    → resolveSiteUrl は step1〜4 を全てスキップし step5 return PROD_FALLBACK = 'https://keep-substack.com'。
  implication: |
    Issue1 確定。ローカルで getSiteUrl() が本番ドメインを返す。route.tsx:85-100 で
    origin=https://keep-substack.com、targetUrl=https://keep-substack.com/og-view/member?... となり
    撮影対象が本番URLに解決される。isAllowedOgHost も keep-substack.com を静的許可するため通過。

- timestamp: 2026-06-16
  checked: src/lib/screenshot.ts screenshotOg の browser ライフサイクル（L90-112）
  found: |
    try { browser=launch; page.goto(networkidle,25s); ...; screenshot } finally { browser.close() }。
    リトライループ無し。timeout 時は goto が throw→finally で browser.close()→route.tsx catch→fallback。
    単一呼び出しでブラウザがリークする構造ではない。
  implication: 15GB OOM は Chromium プロセスではなく Node dev サーバ heap。screenshot のリーク説は弱い。

- timestamp: 2026-06-16
  checked: 本番 old code の og-view ルート有無（feat39/v1.9 は develop のみ・main未マージ）
  found: |
    og-image-404.md/MEMORY より /og-view と /api/og は v1.9(e697e03)で新設、PR#9 未マージで本番未デプロイ。
    つまり撮影対象 https://keep-substack.com/og-view/member は本番(old code)に存在しない。
  implication: |
    本番では og-view ルートが無い→Next の 404/app shell が返る。networkidle が落ち着かず or
    画像/フォント読み込みが終わらず 25s timeout。Issue1 が Issue2 の timeout を誘発している。

- timestamp: 2026-06-16
  checked: ローカル Chromium 解決可否
  found: resolveLocalExecutablePath は playwright Chromium(/Users/.../ms-playwright/chromium-1223) を解決。システム Chrome も存在。
  implication: launch 失敗は原因ではない。timeout は到達先(本番URL)起因。

- timestamp: 2026-06-16
  checked: |
    制御リプロ tmp-og-repro.mjs で screenshotOg 相当（playwright-core launch +
    page.goto(https://keep-substack.com/og-view/member?publicationId=uojun, networkidle 25s)）を素の node で実行
  found: |
    goto は即 OK（timeout せず）。heap は終始 ~50MB、rss ~150MB で増加なし。close も正常。
    つまり本番URL https://keep-substack.com/og-view/member?publicationId=uojun は
    実際には存在し networkidle に素早く到達する（404/重ページではない）。
  implication: |
    重要な反証。「本番URLが timeout を誘発し OOM」という当初の Issue2 機構は素の node では再現しない。
    timeout/OOM は next dev 実行コンテキスト固有。route の動的 import('@/lib/screenshot') が
    next dev で playwright-core をオンデマンドコンパイル/バンドルする際の挙動を疑う。次は dev サーバ実機で観測。

- timestamp: 2026-06-16
  checked: 実 dev サーバ(:3000, PID2501, Turbopack)で /api/og?view=member&publicationId=uojun を1回 curl、RSSを毎秒監視
  found: |
    レスポンスは HTTP 200 / 3.7s / 有効な PNG 2400x1260(=1200x630@2x, 20519B)。timeout しない。
    ところが curl 返却(3.7s)後も RSS が増え続ける: 1.6GB→2.6GB(20s)→4.5GB(60s)→6GB(70s) と
    新規リクエスト・ログ出力・Chromium プロセス無しで単調増加（pgrep chrome=0件）。
    放置すれば ~15GB に達し FATAL OOM でクラッシュ＝報告症状に一致。
  implication: |
    OOM 確定再現。リークは「レスポンス送出後も継続」「Chromium 不在」「Node heap/RSS」。
    リーク主体は Node プロセス内（detached な何か）で、ブラウザプロセスのリークではない。

- timestamp: 2026-06-16
  checked: tmp-og-repro2.mjs で screenshotOg と同等(launch→goto networkidle→screenshot clip→close)を3回+idle20s、素 node で実行
  found: |
    3回とも screenshot 成功(20519B)、RSS は終始 ~140-156MB で平坦。close 後も idle 中も増えず、
    GC で 138MB まで下がる。external/arrayBuffers も 0-4MB で安定。リーク無し。
  implication: |
    決定的。screenshot.ts のコード（launch/goto/screenshot/close ライフサイクル）自体はクリーンでリークしない。
    リークは Next.js dev サーバ(Turbopack)実行コンテキスト固有。route の
    await import('@/lib/screenshot')（さらにその中の await import('playwright') / 'playwright-core' /
    '@sparticuz/chromium' 動的 import）が dev バンドラ上で巨大パッケージをオンデマンド処理する
    挙動が runaway の候補。次: route から playwright 依存を外した最小ケースで切り分ける。

- timestamp: 2026-06-16
  checked: 対照実験 — fresh dev サーバ(:3943, Turbopack)で screenshot を一切使わない /daily（fetchAllFeedsCached を使う通常ページ）を1回 curl
  found: |
    /daily も HTTP 200 後に RSS が 1.35GB→2.5GB と単調増加（/api/og と同じリーク挙動）。
    screenshot も playwright も /api/og も通っていない。
  implication: |
    決定的な再フレーム。OOM は /api/og 固有ではない。Next.js 16.2.6 Turbopack dev サーバの
    一般的なメモリリークで、fetch 系の重いサーバ処理を伴うルート配信で発現する。
    origin 解決(Issue1)と screenshot(Issue2当初説)は OOM の原因ではない＝別問題。
  - timestamp: 2026-06-16
    checked: sample(マクロ) で leaking next-server プロセスの稼働スタック
    found: |
      メインスレッドが MicrotaskQueue::RunMicrotasks→AsyncWrap::WeakCallback→GC を旋回。
      別スレッドに notify-rs fsevents loop / fsevents.node（Next dev のファイル監視）。
      --max-old-space-size=2048 でも落ちず RSS(ネイティブ)主体で増加→V8 旧領域 heap 主因ではない。
    implication: AsyncWrap ハンドルの暴走生成（async リソースが解放されず蓄積）。dev watcher/HMR との相互作用が疑わしい。

  # ===== 再オープン後（人手検証で「webpack でもクラッシュ」報告を受けて）=====
  - timestamp: 2026-06-16 (reopen)
    checked: prior fix が実際に適用済みか — package.json dev スクリプト・.env.local・実行中プロセス
    found: |
      package.json dev="next dev --webpack"、.env.local に NEXT_PUBLIC_SITE_URL=http://localhost:3000 あり。
      実行中の next-server(PID41324) の親は PID41323=`next dev --webpack`。.next/dev/package.json={"type":"commonjs"}、
      .next/dev/lock に webpack PID。=prior fix は確かに適用され、ユーザは webpack を起動していた（と本人は認識）。
    implication: investigation direction#1 の前半クリア。次は「webpack 自体が OOM するか」を実機で検証する。

  - timestamp: 2026-06-16 (reopen)
    checked: 稼働中 webpack サーバ(PID41324)で /api/og?view=member を駆動、RSS を毎秒45s 監視
    found: |
      HTTP 200 / 4.9s / 有効PNG 2400x1260(96548B, Issue1解消の大サイズ=ローカル撮影)。
      RSS: 768→960MB ピーク→900MB へ GC→45s時点 1058MB で plateau。runaway なし。残留Chromium 0。
    implication: webpack は単発リクエストで安定。prior 自己検証(711MB)と一致。OOM 再現せず。

  - timestamp: 2026-06-16 (reopen)
    checked: webpack 耐久 — 24連続(member/goal/daily ×8) + 6並行 + HMR recompile×5 interleave
    found: |
      24連続: 968→~1120MB で頭打ち→settle で 1005MB。6並行: 1169MB ピーク→1030MB。
      HMR(ogScreenshotUrl.ts touch)×5+og: 1030→1231MB を 5round で plateau(約+40MB/round の通常 dev 増)。
      全パターンで単調暴走せず・FATAL/timeout 0・残留Chromium 0。
    implication: 決定的反証。webpack は単発でも高負荷でも OOM しない。「webpack でもクラッシュ」は webpack 起因ではない。

  - timestamp: 2026-06-16 (reopen)
    checked: |
      port 3999 で `next dev --turbopack` を起動しようとした（webpack は3000で稼働中）
    found: |
      "✓ Ready in 279ms" 直後に「⨯ Another next dev server is already running. - PID: 41324
      - Dir: /Users/kugyu10/work/keep-substack ... Run kill 41324 to stop it.」と表示し起動拒否・即終了。
      Next.js 16 は 1ディレクトリ=1 dev サーバを強制する（ポートが違っても同一 Dir なら拒否）。
    implication: |
      ★決定的。ユーザの『webpack でもクラッシュ』の機構を説明: 前セッションの stale Turbopack プロセスが
      port 3000 を掴んだまま生きていると、新しい `npm run dev`(webpack) は起動拒否され、旧 Turbopack が
      配信し続ける。ユーザは webpack に切替えたつもりでも実体は Turbopack のままで OOM した、と強く推定。

  - timestamp: 2026-06-16 (reopen)
    checked: webpack を停止→Turbopack をクリーンに port3000 で起動→/api/og 1発、RSS 50s 監視
    found: |
      next-server(turbopack) RSS: 1430→4845MB と50sで単調増加し上昇継続(放置で~15GBへ=FATAL OOM)。
      HTTP は 4.4s で 200 返却済みなのにレスポンス後もメモリが伸び続ける。webpack の同条件(960MBで安定)と対照的。
    implication: |
      ★スモーキングガン。バンドラが唯一の決定変数。Turbopack=暴走、webpack=安定 を同一マシン同一リクエストで再現。
      prior Resolution(真因=Turbopack リーク、修正=webpack)は反証されず、むしろ強化された。
      （計測後ただちに Turbopack を kill して webpack を再起動・健全性確認済み: og 200/PNG/RSS 811MB 安定。）

  - timestamp: 2026-06-16 (reopen)
    checked: upstream 既知 issue の裏取り（WebSearch）
    found: |
      vercel/next.js #81161「Turbopack dev: localhost開くだけで~2000MB、15ルートで~8000MB(webpackは~2500MB)、
      hard reload毎に+30MBでOOMまで再現可能」、#85914「Node22+fetch+Next16 leak（GC後もheapが恒久増）」、
      #88603「Next16.1 OOM」。Turbopack dev の RAM 暴走は既知の upstream 問題。
    implication: 真因は Turbopack(upstream) であり本プロジェクトコードではない。webpack 回避＋安全ネットが妥当な対処。

  - timestamp: 2026-06-16 (layout-clip — OOM とは別問題)
    checked: |
      OOM 解決後に新規浮上した**レイアウトクリップ**問題。/api/og?view=member&publicationId=uojun を
      webpack dev (npm run dev) で撮影し PNG を目視。OOM(メモリ/Turbopack)とは無関係な純粋な CSS レイアウト欠陥。
    found: |
      [修正前 /tmp/og-member-before.png] カレンダーが 1〜15日(第3週)までしか表示されず、第4〜5週(21〜30日)が
      Frame の overflow:hidden で下端クリップされる（報告症状を再現）。
      機構: MemberView は CalendarGrid を width:820px の div で描画。CalendarGrid のセルは aspect-square のため
      820px 幅では 1 列 ≈116px → 1 行 ≈116px。weekday ヘッダー1行+最大6週=7行で grid 高さ ≈812px+gap、
      さらに上部(avatar/name+月送りnav)≈96px。合計自然高さ ≈870px。一方 Frame 内側の利用可能高さは
      630-56(縦padding)-Brand(~70px) ≈ 504px しかなく、約 366px ぶんの下半分がクリップされていた。
    implication: |
      実コンポーネント(CalendarGrid)は変更不可（fidelity-over-approximation）。820px 幅レイアウトを
      transform: scale で等比縮小して Frame 内に収めるのが最小・忠実な修正。

  - timestamp: 2026-06-16 (layout-clip 修正検証)
    checked: |
      MemberView の CalendarGrid ラッパ div に transform: scale(0.58) + transformOrigin: 'top center' を付与。
      width:820px は維持（CalendarGrid の内部レイアウト・比率は不変）。HMR recompile 後に再撮影し目視。
    found: |
      [修正後 /tmp/og-member-after.png] 1〜30日の全5週(1-6/7-13/14-20/21-27/28-30)＋weekday ヘッダー＋
      アバター/氏名(うおじゅん)＋月送り(2026年6月)が 1200x630 フレーム内に完全収容。下端クリップ解消・
      下部に白余白あり。JP グリフ(日月火水木金土・うおじゅん・年月)正常。
      820px×0.58 ≈ 476px 幅・870px×0.58 ≈ 505px 高さで Frame 内側(~504px)に収まる計算と一致。
      goal/daily ビュー(/tmp/og-goal.png, /tmp/og-daily.png)も撮影確認: goal は全7メンバー収容・問題なし。
      daily は最終行が僅かに下端に半分覗く軽微クリップ（同 Frame 由来・既存挙動で本修正の影響外。MemberView のみ変更）。
    implication: member カレンダークリップは解消。CalendarGrid 不変で忠実性を維持。

## Eliminated

- hypothesis: ローカル Chromium が起動できず launch 失敗で異常終了
  evidence: playwright Chromium とシステム Chrome の両方が存在し executablePath が解決される
  timestamp: 2026-06-16
- hypothesis: screenshotOg の単一呼び出しでブラウザ/ページがリークして OOM
  evidence: try/finally で browser.close() が必ず走る・リトライループ無し。15GB は Node heap で Chromium ではない
  timestamp: 2026-06-16
- hypothesis: resolveLocalExecutablePath の import('playwright')（フルパッケージ、serverExternalPackages 未登録）を Turbopack が dev でバンドルしようとして runaway
  evidence: |
    CHROME_EXECUTABLE_PATH を env で設定し import('playwright') を通らない経路で dev サーバを起動・/api/og を叩いても
    RSS は 1.4GB→3.4GB と同様に単調増加。import('playwright') の有無でリーク挙動が変わらない→このバンドルは原因ではない。
  timestamp: 2026-06-16
- hypothesis: 本番URL(keep-substack.com/og-view)への遷移が networkidle timeout を誘発し fallback ループで OOM
  evidence: 素 node で本番URLへ goto→即 networkidle OK。dev でも /api/og は HTTP 200 で実 PNG を返し timeout しない。timeout は再現せず＝症状当初の timeout 記述は環境差（過去の状態）由来。
  timestamp: 2026-06-16
- hypothesis: fetchAllFeedsCached 等アプリのフィード取得が async リソースをリークさせ OOM
  evidence: webpack dev では同じ fetch を伴うルートでもリークしない。リークは bundler 差(Turbopack)で決まりアプリコードに非依存。
  timestamp: 2026-06-16
- hypothesis: 「webpack dev に切替えても依然 OOM する」（人手検証フィードバック）＝prior Resolution は誤り
  evidence: |
    再オープン後の実機計測で反証。稼働中 webpack(PID41324)で /api/og を単発・24連続・6並行・HMR interleave の
    全パターン駆動しても RSS は ~1.2GB で plateau し runaway せず、クラッシュ 0。一方 Turbopack は同条件・単発で
    1.4→4.8GB と暴走。Next16 は1ディレクトリ1devサーバ強制で、stale Turbopack が生きていると新 webpack は起動拒否
    される（"Another next dev server is already running"）。→ ユーザの失敗 run は実体 Turbopack だったと推定。
    webpack 起因の OOM ではない。
  timestamp: 2026-06-16 (reopen)

## Resolution

root_cause: |
  OOM の真因は Next.js 16.2.6 の **Turbopack dev サーバのメモリリーク**であり、/api/og・
  ヘッドレス Chromium スクショ・origin 解決は原因ではない（再オープン後の実機対照で再確認）。
  Turbopack dev サーバはルート配信後にメモリを無限確保し続け、~15GB で
  `FATAL ERROR: ... JavaScript heap out of memory` でクラッシュする。upstream 既知問題
  （vercel/next.js #81161「Turbopack dev ~2000MB起動・15ルートで~8000MB vs webpack~2500MB」、
  #85914「Node22+fetch+Next16 leak」、#88603）。
  - 再オープン後の対照実測: Turbopack は /api/og 単発で RSS 1430→4845MB(50s)と上昇継続。
    webpack は単発960MBピーク→GCで811MB安定。24連続/6並行/HMR でも ~1.2GB plateau で runaway せず。
  - screenshot.ts は単発でブラウザを launch→close する素直な構造でリークしない（素 node 反復で平坦）。

  ★再オープンで判明した「webpack でもクラッシュ」の機構:
  Next.js 16 は **1 プロジェクトディレクトリ = 1 dev サーバ**を強制する。前セッションの
  stale な Turbopack `next dev` が port 3000 を掴んだまま生き残っていると、新しい
  `npm run dev`(webpack) は「Another next dev server is already running」で**起動拒否**され、
  **古い Turbopack が配信し続ける**。ユーザは webpack に切替えたつもりでも、実体は Turbopack の
  ままだったため OOM した、と強く推定（同一マシンで起動拒否・即終了を実証）。

  付随する Issue1（origin 解決）: ローカルで NEXT_PUBLIC_SITE_URL が無いと getSiteUrl() が
  PROD_FALLBACK=https://keep-substack.com を返しスクショ対象が本番URLになる（OOM とは独立・軽微）。
fix: |
  prior fix(dev=webpack + .env.local NEXT_PUBLIC_SITE_URL=http://localhost:3000)は方向として正しく
  webpack 自体は安定。再オープンで見つかった運用上の穴（stale Turbopack が生き残ると webpack へ
  切り替わらない）を package.json でハードニング:
  1. "predev": "pkill -f 'next dev' 2>/dev/null; sleep 1; exit 0"
     → `npm run dev` の前に既存の next dev（webpack/turbopack 問わず）を必ず落とす。
       これで stale Turbopack が配信し続けるトラップを根絶。
  2. "dev": "NODE_OPTIONS=--max-old-space-size=4096 next dev --webpack"
     → 既定 Turbopack を避け webpack 実行（本番ビルド無影響）＋万一の暴走時の V8 上限を明示し安全ネット。
  3. .env.local の NEXT_PUBLIC_SITE_URL=http://localhost:3000 は維持（Issue1 解消）。
verification: |
  ハードニング適用後、`npm run dev` で実測再検証（自己検証パス）:
  - predev が稼働中サーバ(PID47462)を kill→新サーバを単一インスタンスで起動。
    dev ログに "Another next dev server is already running" は出ず、(webpack) バナーを確認。
  - /api/og?view=member&publicationId=uojun → HTTP 200・PNG 2400x1260・96546B（ローカル撮影）。
    リクエスト後 RSS 893→827MB で GC 安定、runaway/FATAL/timeout なし、残留 Chromium 0。
  - 別途 webpack 耐久検証: 24連続(3ビュー×8)/6並行/HMR×5 interleave いずれも ~1.2GB plateau で安定。
  - 対照: Turbopack を同条件で起動すると単発で 1430→4845MB と暴走（=報告症状を再現）。
  原症状（~15GB OOM クラッシュ）は webpack では再現せず。
  → ユーザーによる実ワークフローでの最終確認待ち。**今後は必ず `npm run dev` で起動し、
    既存ターミナルの古い dev を残さない**こと（predev が自動で落とすが、別ディレクトリ起動などは要注意）。
files_changed:
  - package.json（predev で stale next dev を kill + dev に NODE_OPTIONS メモリ上限）
  - .env.local（NEXT_PUBLIC_SITE_URL=http://localhost:3000 — prior fix のまま維持）

# ============================================================================
# 追補: レイアウトクリップ修正（OOM とは別問題 / 上の OOM Resolution は不変）
# ============================================================================
layout_clip_addendum:
  root_cause: |
    OOM とは独立した CSS レイアウト欠陥。MemberView が CalendarGrid を width:820px で描画すると、
    セルが aspect-square のため自然高さ ≈870px(weekday+最大6週=7行 ≈812px + 上部 avatar/nav ≈96px)に
    なり、Frame 内側の利用可能高さ ≈504px(630-縦padding56-Brand~70)を超過。Frame の overflow:hidden で
    第4〜5週(21〜30日)が下端クリップされていた。
  fix: |
    src/app/og-view/[view]/page.tsx の MemberView で CalendarGrid ラッパ div に
    transform: scale(0.58) + transformOrigin: 'top center' を付与。width:820px は維持し、
    実コンポーネント CalendarGrid は一切変更しない（比率・配置・グリフを保持＝fidelity-over-approximation）。
    820px×0.58≈476px 幅・870px×0.58≈505px 高さで Frame 内(~504px)に収まる。
    フォローアップで DailyView の WeeklyHeatmapGrid ラッパにも同手法を適用（width:960px×scale 0.6）。
  verification: |
    webpack dev(npm run dev)で /api/og?view=member&publicationId=uojun を再撮影し目視:
    全5週(1-30日)＋weekday ヘッダー＋アバター/氏名＋月送りが 1200x630 に完全収容、下端非クリップ、
    JP グリフ正常（/tmp/og-member-after.png）。goal/daily も同 Frame で撮影確認: goal 問題なし、
    daily は最終行が僅かに下端クリップ（既存挙動・後続フォローアップで対応）。

    ★フォローアップ(2026-06-16): daily ビューの下端クリップを同手法で修正。
    DailyView の WeeklyHeatmapGrid ラッパに transform: scale + transformOrigin:'top center' を付与。
    member は 820px×0.58 だったが daily は幅 960px・メンバー数ぶんの行(7行)＋週送り/曜日ヘッダーで
    内容量が異なるため scale 値を実 PNG から経験的に決定:
      - scale=0.7 → 最終2行(e2e-test-member/kugyu100)が下端クリップ（過大）。
      - scale=0.52 → 全7行収容するが下部に余白過多。
      - scale=0.6 → 全7行(うおじゅん…kugyu100)完全収容・下端非クリップ・小さな白余白のみ＝採用。
    3ビュー目視確認(webpack dev, npm run dev 稼働中サーバ再利用):
      - daily(scale 0.6, /tmp/og-daily-after.png): 全7メンバー行可視・下端非クリップ・JP グリフ正常。
      - member(scale 0.58, /tmp/og-member-recheck.png): 全週(1-30日)収容・非クリップ・JP グリフ正常。
      - goal(/tmp/og-goal-recheck.png): 全6行収容・非クリップ・JP グリフ正常。
    WeeklyHeatmapGrid コンポーネント自体は不変（fidelity-over-approximation）。
  files_changed:
    - src/app/og-view/[view]/page.tsx（MemberView: CalendarGrid ラッパに transform:scale(0.58) / transformOrigin:top center）
    - src/app/og-view/[view]/page.tsx（DailyView: WeeklyHeatmapGrid ラッパに transform:scale(0.6→0.67) / transformOrigin:top center）

  # ----------------------------------------------------------------------------
  # 方針変更フォローアップ(2026-06-16 後続): daily は「全行収容」ではなく
  # 「member 同等の丸径」を狙う方針へ変更（ユーザ directive）
  # ----------------------------------------------------------------------------
  layout_circle_match_followup:
    policy_change: |
      ユーザ指示「daily は人数によってはどうしても見切れる。member くらいの丸の大きさを目指して」。
      daily(WeeklyHeatmapGrid) はメンバー増で行が増え、1200x630 に全行は構造的に入りきらない。
      → 全行収容を要件から外し（人数次第で下端見切れ許容）、最優先を「daily の丸（ヒートマップ
      セル/ドット）径を member カレンダーの丸/セル径と揃える」ことに変更。基準は member(scale 0.58)
      で不変。
    measurement: |
      webpack dev(npm run dev)で /api/og を撮影し PIL で丸の水平径を実測（PNG は 2x DPR = 2400x1260）。
        - member(scale 0.58): 丸径 131px @2x (= 65.5px @1x)  /tmp/og-member-baseline.png, og-member-recheck.png
        - daily(scale 0.60, 変更前): 丸径 117px @2x (= 58.5px @1x)  /tmp/og-daily-baseline.png
        → ratio member/daily = 131/117 = 1.120 → 必要 daily scale = 0.60 × 1.120 ≈ 0.672
      幾何計算とも一致: member セル=(820-6*4)/7*0.58≈66px, daily セル=(960-208-40-6*4)/7*0.6≈59px。
    adopted: |
      daily scale を 0.60 → 0.67 に変更（width 960px は据え置き）。
      WeeklyHeatmapGrid コンポーネント自体は不変（fidelity-over-approximation、ラッパの transform のみ）。
    verification: |
      再撮影 /tmp/og-daily-scale067.png を PIL 計測:
        - daily(scale 0.67): 丸径 131px @2x (= 65.5px @1x) → member 131px と完全一致（差 0px / 0.0%）。
      目視(/tmp/og-daily-scale067.png vs /tmp/og-member-recheck.png):
        - daily の丸が拡大し、member カレンダーの丸と同径に見える＝ゴール達成。
        - 全7メンバー行(うおじゅん…kugyu100)は今回データ量では下端非クリップで収まった
          （白余白が縮んだだけ）。今後メンバーが増えれば下端見切れが起こりうるが新方針で許容。
        - member(0.58)・goal は基準として未変更・現状維持。JP グリフ正常。
