# Requirements: Keep Substack — v1.10 Substack Notes PoC

**Defined:** 2026-06-18
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Milestone Goal:** Substack の Note 領域（コメント・投稿一覧）のデータ取得可否を PoC で検証し、コメント可視化と Note 一覧取得の2機能を試作する。

> **PoC 性質:** 本マイルストーンは**フィージビリティ・ゲート型 PoC**。Substack に公式 Notes/コメント API は無く、全機能が非公式エンドポイント（`{pub}.substack.com/api/v1/...` + `substack.sid` cookie）への到達性に依存する。完成度より「取得できるか・どう取れるか」の検証が主目的。

## v1 Requirements

### 取得可否検証 (SPIKE)

<!-- 全機能の前提。捨て前提の取得スパイクで go/no-go を出す -->

- [ ] **SPIKE-01**: 開発者は、非公式エンドポイントから (a)admin の Note 一覧 (b)特定 Note のコメント を取得できるか（認証要否・**本番/preview Vercel からの到達性**・JSON 実フィールド名）を実測した go/no-go レポートと生 JSON サンプルを得られる
- [ ] **SPIKE-02**: 取得が正当な手段で不可と判明した場合、その負の結果（不可の理由・試した手段）が文書化され、PoC が有効な成果としてクローズできる

### Note一覧取得 — 機能2・永続化なし (NOTE)

- [ ] **NOTE-01**: admin は、自分が投稿した Substack Note の一覧を取得して画面で確認できる（毎回サーバー側取得・永続化なし）
- [ ] **NOTE-02**: 各 Note について本文プレビューと投稿日時(JST)が表示される
- [ ] **NOTE-03**: 取得失敗・0件の状態が画面に明示される

### コメント可視化 — 機能1・永続化あり (COMMENT)

- [ ] **COMMENT-01**: ユーザーは Note の URL/ID を入力フォームで指定できる（寛容なパース）
- [ ] **COMMENT-02**: 指定 Note のコメント件数が表示される
- [ ] **COMMENT-03**: コメント本文の一覧（フラット）が表示される
- [ ] **COMMENT-04**: 各コメントにコメント者の名前とアイコンが表示される（アイコン取得不可時はイニシャル/プレースホルダにフォールバック）
- [ ] **COMMENT-05**: 取得したコメントが Supabase にキャッシュ保存され、再取得を避けられる（`fetched_at` 鮮度判定 + 手動 force 再取得）
- [ ] **COMMENT-06**: 取得失敗・0件・キャッシュ無の状態が画面に明示される

## Future Requirements

将来送り（PoC の検証が済み、取得フィールドが確定してから）。

### コメント拡張

- **COMMENT-07**: コメントの投稿日時(JST)・リアクション数表示（取得フィールド確認後）
- **COMMENT-08**: コメント者の Substack プロフィールリンク（handle が取れる場合）
- **COMMENT-09**: 返信スレッドのネスト表示（PoC はフラットで十分）

### Note一覧拡張

- **NOTE-04**: Note 一覧のいいね/返信/restack 数・直リンク・取得時刻表示
- **NOTE-05**: 取得対象の拡張（admin → 登録メンバー → 任意ユーザー）

## Out of Scope

| Feature | Reason |
|---------|--------|
| residential proxy / TLS フィンガープリント偽装での突破 | PoC スコープ外の over-engineering。正当な低頻度リクエストで取れなければ Fallback/負の結果で終える |
| 自前のコメント・いいね機能の実装 | Substack 本体機能と重複。本 PoC は Substack 上のコメントを**読み取り表示**するのみ |
| リッチテキスト/画像/埋め込みの完全再現・ページネーション/全件取得 | PoC は最小表示で十分 |
| クライアント側からの Substack 直叩き | CORS + cookie 露出で不可。取得は必ずサーバー側 |

## Traceability

ロードマップ作成時に埋める。

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPIKE-01 | — | Pending |
| SPIKE-02 | — | Pending |
| NOTE-01 | — | Pending |
| NOTE-02 | — | Pending |
| NOTE-03 | — | Pending |
| COMMENT-01 | — | Pending |
| COMMENT-02 | — | Pending |
| COMMENT-03 | — | Pending |
| COMMENT-04 | — | Pending |
| COMMENT-05 | — | Pending |
| COMMENT-06 | — | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 0（roadmap で確定）
- Unmapped: 11 ⚠️

---
*Requirements defined: 2026-06-18*
*Last updated: 2026-06-18 after initial definition*
