# Feature Research: v1.10

**Domain:** Substack Notes 領域の読み取り可視化（コメント可視化 / Note一覧取得）の PoC
**Milestone:** v1.10 Substack Notes PoC（コメント可視化 & Note一覧取得）
**Researched:** 2026-06-18
**Confidence:** MEDIUM（データ形状は複数の非公式リバースエンジニアリング情報源で一致。ただし公式 API 不在のため全機能は「取得可否」に依存 — STACK 調査参照）

> **前提（最重要）**: Substack には Notes/コメント取得の公式 API が無い。本ドキュメントの全機能は非公式エンドポイント（`substack.com/api/v1/...`）でデータが取得できることが大前提であり、**取得可否の検証は STACK/調査フェーズの責務**。ここでは「取れた場合に何を表示するのが table-stakes か」を定義する。取得不能ならフィールド・機能を落とす（degrade）前提で設計する。これが最大かつ唯一の致命的依存。

---

## 機能1: コメント可視化（永続化あり）

Note の URL/ID を手入力 → そのNoteのコメント件数・本文一覧・コメント者の名前/アイコンを表示。取得結果は Supabase にキャッシュ。

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Note URL/ID の手入力フォーム | 対象を指定する唯一の入口 | LOW | URL から ID 抽出（`/p/...` や `comment/{id}`）。パース失敗時のエラー表示が必須 |
| コメント件数の表示 | 「何件ついたか」が一目で分かる最小価値 | LOW | `children` 配列長、または `comment_count` |
| コメント本文一覧の表示 | 機能の本体。本文が見えないと意味がない | LOW | comment object の `body`（プレーンテキスト想定。リッチなら最小整形＋改行保持） |
| コメント者の表示名 | 「誰が」が分かる | LOW | comment object の `name` |
| コメント者のアイコン（avatar） | 視認性・実物忠実さ（本プロジェクトの強い要求） | MEDIUM | photo/avatar URL。**フィールド名は情報源で未確定**（要実データ確認）。欠損時はイニシャル/プレースホルダにフォールバック |
| 取得結果の Supabase キャッシュ | 要件明記（再取得回避） | MEDIUM | note_id をキーに JSON 保存。再表示はキャッシュ優先 |
| 取得失敗 / 0件 / キャッシュ無 の状態表示 | PoC でも空・失敗は必ず起きる | LOW | 「取得できませんでした」「コメントはまだありません」を明示 |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| コメント投稿日時の表示 | いつのコメントか分かり鮮度が伝わる | LOW | `date`。JST 表示（プロジェクト規約：全日時 JST 期待） |
| リアクション（いいね/ハート）数 | 反応の盛り上がりが見える | LOW | `reactions`（絵文字→件数のマップ）。集計のみ表示 |
| キャッシュ更新（手動リフレッシュ） | 古いキャッシュを意図的に取り直せる | LOW | 「再取得」ボタン1つ。自動再取得はしない（PoC） |
| コメント者の Substack プロフィールリンク | 既存の @handle リンク文化と整合 | MEDIUM | handle が取れる場合のみ。取れなければ省略 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 返信スレッドのネスト表示 | `children` が階層構造なので再現したくなる | 再帰 UI・折り畳み・インデント設計で PoC が膨張。検証目的に不要 | PoC は**フラット表示**（トップレベルのみ、または全件平坦化して時系列）。ネストは将来 |
| リアルタイム/自動ポーリング更新 | 新着コメントを追いたい | 永続化キャッシュ方針と矛盾。Vercel 負荷・非公式 API 連打のリスク | 手動「再取得」ボタンのみ |
| ページネーション/無限スクロール | コメントが多いと欲しくなる | PoC では admin の少数 Note が対象。実装コストに見合わない | 全件一括取得・一括表示（件数上限だけ設ける） |
| コメントへのリアクション/返信（書き込み） | 「コメント機能」と混同 | PROJECT Out of Scope（自前コメント機能）。本 PoC は**読み取り専用** | 表示のみ。書き込み導線を一切置かない |
| リッチテキスト/画像/埋め込みの完全再現 | 実物忠実への欲求 | コメント本文の bodyJson 構造解析は重い | プレーンテキスト抽出 + 改行保持。画像/埋め込みは将来 |

---

## 機能2: Note一覧取得（永続化なし）

admin（開発者本人）が投稿した Note 一覧を取得して表示。永続化なし（毎回取得）。

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| admin の Note 一覧取得・表示 | 機能の本体 | MEDIUM | プロフィール feed エンドポイント（`api/v1/reader/feed/profile/{userId}` 等）。各 item が `comment` object を内包する形 |
| 各 Note の本文（テキスト/プレビュー） | 「何を書いたか」が分かる最小価値 | LOW | note item 内 `body`。長文は冒頭プレビューに truncate |
| 各 Note の投稿日時 | いつ投稿したか | LOW | `date`。JST 表示 |
| 取得失敗 / 0件の状態表示 | 取得不能・無投稿は必ず起きる | LOW | 「取得できませんでした」「Note がありません」 |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| いいね（リアクション）数 | エンゲージメントが見える | LOW | `reactions` / `reaction_count` |
| 返信・コメント数 | 反応の規模が見える | LOW | reply/comment count（フィールド名は要実データ確認） |
| リスタック（restack）数 | Note 特有の拡散指標 | LOW | `restacks`。取れれば差別化価値高 |
| Note への直リンク（URL） | クリックで実物へ飛べる | LOW | item から canonical URL を構築。実物確認の導線 |
| 取得時刻の表示 | 永続化なし＝鮮度を明示する意味 | LOW | 「YYYY-MM-DD HH:mm 時点」表示で「毎回取得」を伝える |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Supabase 等への永続化 | キャッシュしたくなる | 要件で**永続化なし**と明記。機能1との責務分離が崩れる | 毎回フェッチ。キャッシュは機能1のみ |
| 任意ユーザー/メンバー全員の Note 一覧 | 横展開したくなる | userId 解決・認証・スケールの未検証要素が増え PoC が散漫に | PoC は **admin 1人固定**。段階拡張（admin→メンバー→任意）は将来 |
| ページネーション/cursor 全取得 | 全 Note を漏れなく取りたい | feed は cursor ページング。全件巡回は非公式 API 連打リスク | 最新 N 件（1ページ分）のみ。検証には十分 |
| Note 本文のリッチ再現（画像/引用/埋め込み） | 実物忠実 | bodyJson 解析が重く PoC スコープ外 | テキスト + 改行のみ。リンクは URL で代替 |
| Note の作成/投稿/編集 | 「Notes 連携」と混同 | 読み取り PoC のスコープ外。書き込みは別物 | 表示専用 |

---

## Feature Dependencies Map

```
[非公式 API でのデータ取得可否]  ← 全機能の根（STACK 調査で検証）
    ├──requires──> [機能1: コメント可視化]
    │                   ├── Note URL/ID パース ──> コメント取得 ──> Supabase キャッシュ
    │                   └── avatar/handle 表示（取得フィールド次第で degrade）
    └──requires──> [機能2: Note一覧取得]
                        └── admin userId 解決 ──> profile feed 取得（永続化なし）

[機能2 の userId 解決ロジック] ──enhances──> [機能1]（コメント者→プロフィール解決の再利用余地）
[永続化あり(機能1)] ──conflicts──> [永続化なし(機能2)]（責務を混ぜない）

依存関係（実装順序の制約）:
  - 両機能とも「取得可否の検証フェーズ」が先行（STACK 調査の成否がゲート）
  - 機能1 と 機能2 は独立実装可能（共通の取得基盤を共有しうるが PoC では無理に共通化しない）
  - 取得できないフィールドは機能から落とす設計（avatar→プレースホルダ等）を前提にする
```

### Dependency Notes

- **両機能 requires データ取得可否**: 公式 API が無いため、非公式エンドポイントが (a) 認証なし or cookie 認証で叩けるか、(b) 必要フィールド（特に avatar/handle/各種カウント）を返すかが未確定。**これが最大かつ唯一の致命的依存**。
- **機能2 の userId 解決 enhances 機能1**: コメント者のプロフィール解決と admin の userId 解決は同じ仕組みを使い回せる可能性。ただし PoC では無理に共通化しない（YAGNI）。
- **永続化あり/なしは意図的に分離**: 機能1=キャッシュで再取得回避、機能2=毎回取得で鮮度。混ぜると検証結果が読めなくなるので別実装に保つ。

---

## MVP Definition

### Launch With (v1.10 PoC)

機能1:
- [ ] Note URL/ID 入力フォーム — 対象指定の唯一の入口
- [ ] コメント件数 + 本文一覧（フラット）+ コメント者名 — 機能の核
- [ ] コメント者アイコン（取得できれば。欠損はプレースホルダ）— 視覚忠実さの要求
- [ ] Supabase キャッシュ + 「再取得」ボタン — 要件（永続化あり）
- [ ] 失敗/0件/キャッシュ無の状態表示 — PoC でも必須

機能2:
- [ ] admin の Note 一覧取得・表示（毎回取得）— 機能の核
- [ ] 各 Note の本文プレビュー + 投稿日時(JST) — 最小価値
- [ ] 取得失敗/0件の状態表示 — 必須

### Add After Validation (取得可否が確認できたら)

- [ ] コメントのリアクション数・投稿日時表示 — フィールドが取れると確認後
- [ ] Note 一覧のいいね/返信/restack 数・直リンク — 同上
- [ ] コメント者の Substack プロフィールリンク — handle が取れる場合

### Future Consideration (PoC 後 / v2+)

- [ ] 返信スレッドのネスト表示 — PoC ではフラットで十分、UI 設計コスト大
- [ ] 機能2 の対象拡張（admin→メンバー→任意ユーザー）— userId 解決・認証の検証後
- [ ] リッチテキスト/画像/埋め込みの再現 — bodyJson 解析が重い
- [ ] ページネーション/全件取得 — 非公式 API 連打リスク、PoC に不要

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 機能1: URL入力→コメント本文/件数/名前表示 | HIGH | LOW | P1 |
| 機能1: Supabase キャッシュ | MEDIUM | MEDIUM | P1 |
| 機能1: コメント者アイコン | HIGH | MEDIUM | P1（degrade 可） |
| 機能1: リアクション数/日時 | MEDIUM | LOW | P2 |
| 機能2: admin Note 一覧 + 本文/日時 | HIGH | MEDIUM | P1 |
| 機能2: いいね/返信/restack 数 + 直リンク | MEDIUM | LOW | P2 |
| 返信ネスト表示（両機能） | LOW | HIGH | P3 |
| 機能2 対象拡張 | MEDIUM | HIGH | P3 |

**Priority key:** P1=Must have for PoC / P2=取得確認後に追加 / P3=将来

---

## データフィールド期待（非公式情報源の合意。要実データ確認）

**コメント object**（comment endpoint / note の `children`）:
- `id`, `body`（本文）, `name`（表示名）, `user_id`, `post_id`, `date`, `edited_at`, `reactions`（絵文字→件数）, `reaction`（自分の）, `children`（ネスト配列）
- avatar/photo URL: **存在するがフィールド名が情報源で未確定**（要 DevTools 実測）→ 欠損前提で設計

**Note 一覧（profile feed）item**:
- 各 item が `comment` object を内包。`id`, `body`, `date`, `reactions` / `reaction_count`, `restacks`, reply/comment count、canonical URL 構築要素
- ページングは `cursor`（PoC では使わず最新1ページ）

> いずれも非公式・予告なく変更され得る。handle 変更で旧 ID が 404 になる既知挙動あり。**フィールド名・有無は実レスポンスで確定すること**（STACK/調査フェーズ）。

## Sources

- [No official API? How I reverse-engineered Substack API — iam.slys.dev](https://iam.slys.dev/p/no-official-api-no-problem-how-i) — notes は comment エンドポイント経由、cookie(`connect.sid`) 認証、bodyJson 構造（MEDIUM）
- [Developing a Custom Substack Front-end — Matt Hagy](https://matthagy.substack.com/p/developing-a-custom-substack-front) — comment object フィールド（id/body/name/date/reactions/children）、post/archive フィールド（MEDIUM-HIGH for field names）
- [NHagar/substack_api (Python)](https://github.com/NHagar/substack_api) — 非公式ラッパー（MEDIUM）
- [substack-api (TypeScript) docs](https://substack-api.readthedocs.io/api-reference/) — Post/Comment 型、comments() の AsyncIterable + ページング（MEDIUM）
- WebSearch 集約: profile feed の各 item が `comment` object を内包し reactions/restacks/reply を持つ（LOW、要実測）
- 既存: .planning/PROJECT.md — v1.10 方針、Out of Scope（自前コメント機能）、JST 規約、視覚忠実さ要求

---
*Feature research for: Substack Notes 読み取り可視化 PoC*
*Researched: 2026-06-18*
