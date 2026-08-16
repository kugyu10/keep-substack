# Pitfalls Research

**Domain:** Substack Notes/コメント取得 PoC（非公式エンドポイント経由 / Next.js+Supabase+Vercel への追加機能）
**Researched:** 2026-06-18
**Confidence:** MEDIUM（非公式・未文書化APIが対象のため。エンドポイント挙動は実証で確認すべき / 法務・Vercel IP の挙動は HIGH 寄り）

> **前提:** Substack には公式 Notes/コメント取得 API が存在しない（公式 Developer API は LinkedIn 連携プロフィール照会のみで、コメント・Notes は対象外）。本 PoC は `https://{publication}.substack.com/api/v1/...` 系および `https://substack.com/api/v1/...` 系の**未文書化内部エンドポイント**に依存する。これらはブラウザの DevTools Network で観測される Substack 自身の内部 API であり、いつでも予告なく変更・廃止されうる。

---

## Critical Pitfalls

### Pitfall 1: 取得可否を検証する前に要件・UI を作り込んでしまう（PoC のスパイク欠如）

**What goes wrong:**
コメント可視化 UI・Supabase スキーマ・キャッシュ層を先に設計してから「実は対象エンドポイントが認証必須だった／本番 Vercel から 403 で叩けなかった」と判明し、作った UI・DB が無駄になる。

**Why it happens:**
非公式 API は「叩けば取れるだろう」という楽観で着手されがち。実際は (a) 認証要否、(b) Vercel データセンター IP からの到達性、(c) レスポンス JSON 形状、の3点が未知。これらは机上では確定できない。

**How to avoid:**
最初のフェーズを**throwaway スパイク**にする。`curl` / 単発スクリプトで以下を順に確認してから初めて要件確定する:
1. ローカルから cookie 無しで対象 Note のコメント JSON が取れるか
2. 取れない場合、`substack.sid`（旧 `connect.sid`）cookie 付きで取れるか
3. **本番 Vercel serverless 関数から**同じリクエストが通るか（ローカル成功 ≠ 本番成功。後述 Pitfall 4）
4. レスポンス JSON の実形状（コメント本文・著者名・アバターURL・件数のフィールド名）を保存

**Warning signs:**
- スキーマ設計や React コンポーネントの議論が、生の JSON サンプルを1件も取得しないまま始まっている
- 「たぶん取れる」がドキュメントやスパイク結果ではなく希望的観測

**Phase to address:**
**Phase 1（調査/スパイク）**。PROJECT.md の方針どおり「要件定義の前に取得可否を検証」。このフェーズの成果物は動く UI ではなく**取得可否レポート + 生 JSON サンプル + 採用エンドポイント表**。

---

### Pitfall 2: 利用規約（ToS）違反のリスクを評価せずスクレイピングを既定路線にする

**What goes wrong:**
Substack の Terms of Use / Acceptable Use Policy は scraping・crawling・自動化アクセス・bulk copying を明示的に禁止している。これを認識せずに「メンバー全員の Note を定期巡回」のような自動収集を本機能に組み込むと、規約違反・アカウント/IP ブロック・コミュニティの信用毀損につながる。

**Why it happens:**
「ブラウザが叩いている内部 API を真似るだけだから合法」という言説が出回っているが、これは技術的可能性の話であり ToS 遵守とは別問題。reverse-engineering 自体がグレーで、規約は別途明文で禁止している。

**How to avoid:**
PoC のスコープを意図的に狭く保つ:
- **対象を絞る:** 機能1は admin が手入力した**特定 Note 1件**のコメントのみ。機能2は **admin 本人の** Note 一覧のみ（PROJECT.md どおり）。「全メンバー自動巡回」へは安易に広げない
- **公開データに限定:** 自分/公開データのみ。paywall 越え・他人の非公開データは触らない
- **アクセス頻度を最小化:** 機能1はキャッシュ永続化で再取得を避ける。バルク巡回しない
- **自分の認証情報を使う場合**でも、admin 本人のセッション cookie に限定し、メンバーの cookie を預かる設計は採らない
- PoC ドキュメントに「これは検証用の試作であり、本番常用・自動巡回は規約面で別途判断が必要」と明記

**Warning signs:**
- 「メンバー全員の Note/コメントを cron で毎日巡回」のような自動・大量・継続アクセスが要件に紛れ込む
- メンバーの Substack cookie をアプリに保存して代理取得する設計案

**Phase to address:**
**Phase 1（調査）でリスク明記 → 全フェーズでスコープを狭く維持**。要件定義時に「自動巡回はしない／対象は admin・特定Noteのみ」を制約として固定。

---

### Pitfall 3: 認証（セッション cookie）要否を見誤る

**What goes wrong:**
公開エンドポイントだと思って実装したら認証必須で本番で空配列/401 が返る。逆に、不要なのに cookie を持たせる設計にしてセキュリティ・運用負荷を増やす。

**Why it happens:**
Substack 内部 API は**エンドポイントごとに認証要否が異なる**。公開記事のコメント取得は cookie 無しで取れることが多い一方、「自分のプロフィール」「自分が投稿した Notes フィード」「subscriber-only」は `substack.sid`（旧 `connect.sid`）cookie が必須。機能2（admin 自身の Note 一覧）は認証側に倒れる可能性が高い。

**How to avoid:**
- Phase 1 スパイクで**機能ごとに**認証要否を実測（機能1=公開コメント、機能2=admin 自身の Note）
- cookie が必要なら: admin 本人が DevTools (Application→Cookies→substack.com) から取得した `substack.sid` を **Supabase の admin 専用 secret / Vercel 環境変数**に保管。クライアントには絶対出さない（サーバー専用 fetch）
- cookie 名は `connect.sid`→`substack.sid` に変わった実績あり。**ハードコードせず env で切替可能**にする
- cookie は失効する → 401 を検知したら「再設定が必要」と admin に分かる UI/ログを用意

**Warning signs:**
- 401 / 空 JSON が返るのにヘッダー・cookie を疑わず別の原因を探している
- cookie 値をフロントエンドの JS / NEXT_PUBLIC_ 変数に置いている（重大な漏洩）

**Phase to address:**
**Phase 1（要否判定）→ 認証が必要なら機能2 実装フェーズで cookie のサーバー専用保管を設計**。

---

### Pitfall 4: ローカルで動いたものが本番 Vercel serverless IP からブロックされる（403/429/チャレンジ）

**What goes wrong:**
ローカル開発機（住宅 IP）では取得できるが、本番 Vercel の serverless 関数から叩くと 403 Forbidden / bot チャレンジ / 429 で取れない。PoC が「ローカルでは成功」のまま本番で機能しない。

**Why it happens:**
Vercel serverless はデータセンター IP で、しかも実行ごとに IP が変わる。anti-bot（Cloudflare 等）はデータセンター IP・非ブラウザ User-Agent・TLS(JA3/JA4) フィンガープリント不一致を検知して 403 を返す。住宅 IP のローカルとは前提が違う。さらに Vercel 自身の DDoS/bot 緩和が 403 を返すケースもある。

**How to avoid:**
- **Phase 1 スパイクで必ず本番 Vercel 環境（または preview）から実リクエストを撃つ。** ローカル成功で満足しない
- ブラウザ相当ヘッダーを付与: `User-Agent: Mozilla/5.0...`, `Accept: application/json`, `Origin`/`Referer: https://substack.com/...`
- レート: **1 req/sec 以下**に保つ。429/403 で指数バックオフ、`Retry-After` 尊重
- それでも 403 が継続するなら（TLS フィンガープリント検知の可能性）、PoC では**深追いせず Fallback（後述）へ切替**。residential proxy 導入は PoC の範囲を超える over-engineering
- 403 の発生源を切り分け（対象の Cloudflare か Vercel 自身の緩和か）

**Warning signs:**
- 「ローカルで動いたので OK」として本番検証をスキップ
- preview/本番デプロイ後に初めて 403 を見て慌てる
- 連続リクエストで途中から 403/429 に変わる（IP レピュテーション/レート）

**Phase to address:**
**Phase 1（調査）で本番到達性を必ず確認**。ここが PoC の go/no-go 判断点。

---

### Pitfall 5: 非公式エンドポイントの不安定性に脆い実装（ハンドル変更404・形状変更で全壊）

**What goes wrong:**
ユーザーがハンドルを変更すると旧エンドポイントが 404 を返す（実証済みの破壊パターン）。また JSON フィールド名・構造が予告なく変わり、パース処理が例外で全面停止する。

**Why it happens:**
未文書化 API は SLA も後方互換保証も無い。「APIs may change without notice」が公式ライブラリの Limitations にも明記されている。

**How to avoid:**
- パースを**防御的**に: 期待フィールドが無くても throw せず、欠損は null/空として表示。生 JSON を Supabase に保存しておけば後から再パースできる
- ハンドルではなく**安定 ID（post_slug / note id）**をキーにする。手入力は URL/ID を受ける（PROJECT.md どおり）
- エンドポイント URL・cookie 名・必要ヘッダーを**1か所の定数/設定**に集約（散らさない）。変更時の修正を局所化
- 取得失敗時に「Substack 側仕様変更の可能性」と分かるエラー表示・ログ
- PoC として「壊れたら直す前提」を受け入れ、自動巡回など壊れて困る運用に組み込まない

**Warning signs:**
- パースが optional chaining 無しの直アクセスで、1フィールド欠損で 500
- エンドポイント文字列がコード各所にハードコードされ散在
- 404 をハンドル変更と紐付けて理解していない

**Phase to address:**
**機能1・機能2 の実装フェーズ**（防御的パース・定数集約）。Phase 1 で「壊れやすさ」を前提として明記。

---

### Pitfall 6: アバター/画像のホットリンク・CORS・混在コンテンツで表示が壊れる

**What goes wrong:**
コメント著者のアバター画像 URL（Substack CDN: `substackcdn.com` / `bucketeer-*` 等）をそのまま `<img>` で表示しようとして、ホットリンク制限・参照元チェックで表示されない、または next/image で remotePatterns 未設定エラーになる。

**Why it happens:**
他ドメインの画像を扱うと CDN 側の制約に当たる場合がある。本プロジェクトは既に「`<img>` タグ採用（next/image 不採用）」の決定があり（Key Decisions）、remotePatterns 設定不要の方針。新たな外部画像ドメインで齟齬が出やすい。

**How to avoid:**
- 既存方針どおり**素の `<img>`** で読む（CORS は単純な画像表示には通常無関係。`crossorigin` 属性を付けない限り表示はできる）。next/image を新規採用しない（KISS 維持）
- `onError` または Server Component の条件分岐で**フォールバック（イニシャル/デフォルトアイコン）**を必ず用意（既存 HeatmapRow のフォールバックパターン踏襲）
- アバター URL も生 JSON と共に Supabase キャッシュに保存し、毎回取得しない
- 画像をプロキシ/再ホストする必要は PoC では基本不要（over-engineering）。表示崩れが致命的でなければフォールバックで済ます

**Warning signs:**
- アバターが割れアイコンになる／コンソールに mixed-content・403 (image)
- next.config.ts に remotePatterns を足し始めている（既存決定からの逸脱）

**Phase to address:**
**機能1（コメント可視化）の表示実装フェーズ**。

---

### Pitfall 7: キャッシュの陳腐化と「保存しすぎ/しなさすぎ」の設計ミス

**What goes wrong:**
機能1はコメントを Supabase に永続化するが、(a) 再取得しないため**コメントが古いまま**（新規コメント・削除が反映されない）、または (b) キャッシュキー設計が雑で取り違え・重複が起きる。機能2は永続化なしの方針なのに誤ってキャッシュしてしまう/逆に機能1で毎回取得して規約・レート面で不利になる。

**Why it happens:**
「キャッシュ＝速い」だけ見て鮮度・無効化を設計しないため。本プロジェクトは ISR/unstable_cache の経験はあるが、外部書き込み系データの鮮度設計は新しい。

**How to avoid:**
- 機能1: **Note ID をキー**に保存。`fetched_at` を持ち、明示的「再取得」ボタン or TTL（例: 取得から N 分）で更新。PoC では「手動再取得」で十分（自動巡回は規約面で避ける、Pitfall 2）
- 機能2: PROJECT.md どおり**永続化なし（毎回取得）**を厳守。ただしレート配慮で本番では薄い ISR/メモリキャッシュ（数分）を検討してよい
- キャッシュは「古い可能性がある」旨を UI に小さく明示（取得時刻表示）
- 既存の Supabase テーブル設計（RLS・サロゲートPK）と整合させる

**Warning signs:**
- コメント件数が実物とずれているのに気づけない（取得時刻表示が無い）
- 機能2 に永続化テーブルが生えている（方針逸脱）

**Phase to address:**
**機能1 実装フェーズ（永続化・鮮度設計）**。機能2 は「永続化しない」を success criteria に明記。

---

### Pitfall 8: PoC の過剰作り込み（over-engineering）

**What goes wrong:**
検証が主目的なのに、residential proxy・リトライ無限ループ・汎用 Substack API クライアント・全メンバー対応 UI・凝った状態管理まで作り、取得可否が出る前に工数を溶かす。

**Why it happens:**
「ついでにちゃんと作る」誘惑。非公式 API 相手は不確実性が高く、作り込んだ分が仕様変更で無駄になりやすい。

**How to avoid:**
- PoC の合格条件を「**取れるか・どう取れるかが分かること**」に固定（PROJECT.md 明記）。完成度・汎用性は非ゴール
- 対象は admin・特定 Note・特定 admin の Note 一覧に限定。メンバー/任意ユーザー拡張は「余地」に留め実装しない
- proxy・TLS フィンガープリント偽装・専用スクレイピングサービスは PoC スコープ外。403 が解けないなら Fallback で「負の結果」を確定させる方が PoC として正しい
- 既存スタック（Next.js Route Handler + Supabase）に最小追加。新規ライブラリ追加は慎重に（substack-api 等の採用も依存・保守リスクを評価）

**Warning signs:**
- 取得可否レポートが出る前に UI/抽象化レイヤーの議論が肥大
- 「将来メンバー全員対応するなら」を理由に汎用化を始めている（YAGNI）

**Phase to address:**
**全フェーズ横断**。各フェーズの success criteria を「検証できた」で止める。

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| エンドポイントURL/ヘッダーをコードに直書き | すぐ動く | 仕様変更時に全置換、漏れで全壊 | never（最初から定数1か所に集約） |
| 防御的パース無しで JSON 直アクセス | コード短い | 1フィールド欠損で 500、ハンドル変更404で停止 | never（PoC でも optional/try-catch） |
| admin の substack.sid を env に手置き | proxy 不要で認証突破 | cookie 失効で都度差し替え、漏洩リスク | PoC では可（サーバー専用・admin限定・漏洩防止前提） |
| 生 JSON を Supabase に丸ごと保存 | 再パース・デバッグが楽 | 容量・他者PII（コメント者名/アイコン）保持 | 機能1では推奨（鮮度・再現性に有用）。保持範囲は最小に |
| 機能2 を毎回取得（キャッシュ無し） | 鮮度最大・実装単純 | レート/規約で不利、遅い | 方針どおり可。本番化時のみ薄いキャッシュ検討 |
| residential proxy / TLS偽装で 403 突破 | 取得継続できる | 規約逸脱・運用複雑・保守地獄 | never（PoC では Fallback を選ぶ） |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Substack 内部 API | 全エンドポイント公開と仮定 | エンドポイント毎に認証要否を実測（公開コメント vs admin自身のNotes） |
| Substack 内部 API | ローカル成功＝本番OKと判断 | preview/本番 Vercel から到達性を必ず検証（データセンターIP問題） |
| Substack cookie | `connect.sid` をハードコード | `substack.sid`（新）/`connect.sid`（旧）を env 切替、失効検知 |
| Substack CDN 画像 | next/image で remotePatterns 必須化 | 既存方針どおり素の `<img>` + onError フォールバック |
| Vercel serverless | 長時間/大量リクエスト前提 | maxDuration 制限・実行毎IP変動を前提に、単発・低頻度・短時間で設計 |
| Supabase | コメント著者名/アイコン（他者PII）を無防備保存 | PoC の必要最小限のみ保存、RLS で保護、保持理由を明記 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 連続リクエストでレート超過 | 途中から 429/403 | 1 req/sec 以下・バックオフ・キャッシュで再取得回避 | 数十件を連続取得した時点 |
| コメント多数 Note の全件取得 | タイムアウト・maxDuration 超過 | ページネーション（cursor）対応 or 件数上限、PoC では上限で十分 | コメント数百件規模 |
| 機能2 を ISR 無しで毎回ライブ取得 | ページ表示が遅い・レート不利 | 本番化時は薄い ISR/メモリキャッシュ（数分） | アクセス頻度が上がった時 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `substack.sid` を NEXT_PUBLIC_ / フロントに露出 | admin の Substack アカウント乗っ取り級漏洩 | サーバー専用（Route Handler内）でのみ使用、env 秘匿 |
| メンバーの Substack cookie を預かる設計 | 重大な信用・法務リスク | 採らない。取得は公開データ or admin 本人 cookie のみ |
| 取得 JSON をそのまま dangerouslySetInnerHTML 等で描画 | XSS（コメント本文は外部入力） | テキストとしてエスケープ描画、HTML は混入させない |
| 内部 API レスポンスを無検証で信頼 | 想定外データで例外/誤表示 | 形状バリデーション・防御的パース |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 取得失敗時に白画面/無言エラー | 何が起きたか分からない | 「Substack 側仕様変更/未取得の可能性」明示 + 再取得導線 |
| キャッシュ表示が古い旨の表示なし | 古い件数を最新と誤認 | 取得時刻（fetched_at）を小さく表示 |
| アバター取得失敗で割れアイコン | 見栄え悪化 | デフォルトアイコン/イニシャルにフォールバック |
| Note URL/ID 入力フォーマットが厳格すぎ | 手入力が通らない | URL でも ID でも受ける寛容なパース |

## "Looks Done But Isn't" Checklist

- [ ] **取得機能:** ローカルだけでなく**本番 Vercel から**取得成功を確認したか — preview/prod で実リクエスト検証
- [ ] **認証:** 機能1/機能2 それぞれの cookie 要否を実測で確定したか — 401/空配列の挙動を確認
- [ ] **エラー処理:** 403/429/404/JSON形状変更で**500 にならず**フォールバック表示するか — 異常系を意図的に発生させて確認
- [ ] **キャッシュ鮮度:** コメントの取得時刻が表示され、再取得手段があるか — 機能1
- [ ] **永続化方針:** 機能2 が永続化していないか — テーブル/保存処理が無いことを確認
- [ ] **秘匿:** `substack.sid` がフロント/NEXT_PUBLIC_/ログに漏れていないか — grep で確認
- [ ] **スコープ:** 自動巡回・全メンバー取得を実装していないか（規約逸脱防止）
- [ ] **PoC 結論:** 「取れた/取れなかった/条件付きで取れた」が文書化されているか

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 本番 Vercel から 403 で取得不可 | MEDIUM | ヘッダー/レート調整 → 解けなければ Fallback（後述）へ。proxy 導入は PoC では不採用 |
| エンドポイント仕様変更で全壊 | LOW（局所化済みなら） | 定数1か所のURL/形状を更新。保存済み生JSONで再パース |
| cookie 失効で 401 | LOW | admin が DevTools から `substack.sid` を再取得し env 更新、401検知UIで気づく |
| キャッシュが古い | LOW | fetched_at 表示 + 手動再取得ボタン |
| 取得が原理的に不可（認証/IP/ToS で詰み） | LOW | **PoC の負の結果として確定・文書化**（後述 Fallback Plan） |

## Fallback Plan — 取得が現実的に不可能だった場合（重要・downstream 要求）

PoC の本質は「取れるか／どう取れるか」の検証。取得が困難な場合の段階的フォールバック（上から優先）:

1. **ヘッダー/レート/認証の調整で再挑戦**（Phase 1 内）— ブラウザ相当ヘッダー、1req/sec、admin cookie 付与。これで本番 Vercel から取れれば go。
2. **JSON 内部 API がダメなら HTML スクレイピング**を1段だけ試す — Note ページの HTML から件数/本文を抽出。ただし JS レンダリング依存だと取れない可能性が高く、規約面も同等にグレー。深追いしない。
3. **手入力フォールバック（機能の意義は残す）** — コメント件数・主要コメントを admin が手入力して可視化。「自動取得は不可だが可視化 UI は成立する」という部分的成果を残す。
4. **負の結果としての確定（PoC の正しい終わり方）** — 「Substack Notes/コメントは公式 API 無し・本番 Vercel IP からは anti-bot で取得不可（または認証/ToS 上常用不可）」と**明確に文書化して PoC をクローズ**。これは失敗ではなく**有効な検証結果**。v1.9 の「Note prefill 不可能」確定と同じく、不可能の確定自体が価値（memory: reference-substack-note-no-prefill 参照）。

> **判断点:** Phase 1（調査スパイク）の終わりで go/no-go を出す。本番 Vercel から低頻度・正当な手段で取れないなら、residential proxy 等で無理に突破せず、上記 3 または 4 へ。これにより UI/DB の作り込みが無駄になるのを防ぐ。

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. 検証前の作り込み | Phase 1（調査/スパイク） | 生 JSON サンプル + 取得可否レポートが UI 着手前に存在 |
| 2. ToS 違反 | Phase 1 明記 → 全フェーズ | 自動巡回/全メンバー取得が無い、対象が admin・特定Noteに限定 |
| 3. 認証要否の誤認 | Phase 1（要否判定）→ 機能2実装 | 機能毎の cookie 要否が実測で確定、cookie はサーバー専用 |
| 4. Vercel IP ブロック | Phase 1（本番到達性検証） | preview/prod から実リクエスト成功（or Fallback 決定） |
| 5. エンドポイント不安定性 | 機能1/2 実装 | 防御的パース、URL/形状の定数集約、404/形状変更で500にならない |
| 6. アバター/CORS/画像 | 機能1 表示実装 | `<img>`+onError フォールバック、remotePatterns 追加なし |
| 7. キャッシュ陳腐化 | 機能1 永続化設計 | fetched_at 表示+再取得、機能2は永続化なし |
| 8. 過剰作り込み | 全フェーズ横断 | 各 success criteria が「検証できた」で止まる、proxy/汎用化なし |

## Sources

- [No official API? How I reverse-engineered Substack API — slys.dev](https://iam.slys.dev/p/no-official-api-no-problem-how-i)（エンドポイント発見手法、認証 cookie 要否、推奨ヘッダー、~1req/sec）
- [NHagar/substack_api (Python, unofficial)](https://github.com/NHagar/substack_api)（Limitations: APIは予告なく変更/レート制限あり/ハンドル変更で旧エンドポイント404）
- [jakub-k-slys/substack-api (TypeScript, unofficial)](https://github.com/jakub-k-slys/substack-api)（profile.notes()/post.comments()、`substack.sid`（旧`connect.sid`）cookie 必須、401=認証失敗）
- [How to reverse engineer the Substack web API — ignorance.ai](https://www.ignorance.ai/p/how-to-reverse-engineer-the-substack-api)（DevTools Network での内部API観測手法）
- [SubstackExplorer API docs](https://www.substackexplorer.com/api-docs)（`{publication}.substack.com/api/v1/posts/{slug}` で likes/comments/restacks）
- [Substack Developer API — support.substack.com](https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API)（公式APIはLinkedIn連携プロフィール照会のみ。コメント/Notes非対応）
- [Substack Terms of Use](https://substack.com/tos)（scraping/crawling/automated access/bulk copying を Acceptable Use Policy で禁止）
- [Why Serverless Functions Get Challenged by Cloudflare — Medium](https://medium.com/@ceamkrier/why-serverless-functions-get-challenged-by-cloudflare-581181433d67)（serverless データセンターIP・IP変動が anti-bot に検知される）
- [403 Forbidden Web Scraping — Scrapfly](https://scrapfly.io/blog/posts/403-forbidden-web-scraping)（datacenter IP/JA3 TLS フィンガープリント/ヘッダーによる403、residential proxy）
- [False Positive DDoS Mitigation Blocking (HTTP 403) — Vercel Community](https://community.vercel.com/t/false-positive-ddos-mitigation-blocking-legitimate-requests-http-403/40466)（Vercel 自身の bot 緩和が 403 を返す事例）
- 内部メモリ: reference-substack-note-no-prefill（Substack Note は認証セッション必須・公式 prefill API 無し。不可能の確定自体が価値という前例）

---
*Pitfalls research for: Substack Notes/コメント取得 PoC（非公式エンドポイント / Next.js+Supabase+Vercel）*
*Researched: 2026-06-18*
