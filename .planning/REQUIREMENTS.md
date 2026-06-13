# Requirements: Keep Substack — v1.9 ワンボタン Substack Note 共有

**Defined:** 2026-06-14
**Core Value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること。

## v1.9 Requirements

ログイン済みユーザーが、見ているビューを1ボタンで自分の Substack Note に共有でき、「自慢」と「Substack内バイラル拡散」を促進する。

### Share（共有ボタン・Notes起動）

- [ ] **SHARE-01**: ユーザーは対象ビューに表示される共有ボタンを押せる（再利用可能な `<ShareButton>` コンポーネント、配置を後から1行で差し替え可能）
- [ ] **SHARE-02**: 共有ボタンを押すと、共有テキスト（定型文＋対象ビューの公開URL）がクリップボードにコピーされる
- [ ] **SHARE-03**: コピー後、Substack Notes コンポーザー（`https://substack.com/notes`）が新規タブで開く
- [ ] **SHARE-04**: コピー完了とともに「貼り付けて投稿してください」を伝える toast 等のフィードバックが表示される
- [ ] **SHARE-05**: 共有テキストの定型文・ハッシュタグが編集しやすい定数（例: `lib/share.ts`）として一元管理される
- [ ] **SHARE-06**: 共有ボタンは既定でログイン済みユーザーのみ表示し、全員表示へ切り替えやすい実装になっている

### URL（共有先の状態保持）

- [ ] **URL-01**: 各対象ビュー（トップ Commit&Goal / `/daily` / 個人カレンダー `/member/[id]` / チーム選択中ビュー）が、状態（チームフィルタ等）を含む公開URLで復元できる

### OGP（リンクプレビュー）

- [ ] **OGP-01**: 共有対象ルートに適切なOGメタタグ（`og:title` / `og:description` / `og:image` / Twitter Card）が出力される
- [ ] **OGP-02**: 共有対象ルートに、その人の草／実績が見える動的OG画像を Next.js `ImageResponse`（`opengraph-image`）で生成する

## v2 Requirements

将来。現マイルストーンのロードマップには含めない。

### Visualization

- **VIZ-01**: 月間投稿数サマリーを表示する
- **VIZ-02**: 年間ヒートマップ（GitHub草型）で長期活動を可視化する

## Out of Scope

| Feature | Reason |
|---------|--------|
| Substack Note への自動投稿（プログラム投稿） | 公式prefill URLが無く、非公式APIは本人のSubstack認証が必要。Webアプリから非現実的 |
| X/Threads等 他SNSへの共有 | スコープを Substack バイラルに絞る。YAGNI |
| 共有実績の集計・ランキング | コミュニティの「ゆるさ」を壊す（既存方針） |
| 共有テキストのユーザー個別カスタムUI | v1.9は定数管理で十分。編集UIは過剰 |

## Traceability

ロードマップ作成時に gsd-roadmapper が記入。

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHARE-01 | Phase 38 | Pending |
| SHARE-02 | Phase 38 | Pending |
| SHARE-03 | Phase 38 | Pending |
| SHARE-04 | Phase 38 | Pending |
| SHARE-05 | Phase 38 | Pending |
| SHARE-06 | Phase 38 | Pending |
| URL-01 | Phase 37 | Pending |
| OGP-01 | Phase 39 | Pending |
| OGP-02 | Phase 39 | Pending |

**Coverage:**
- v1.9 requirements: 9 total
- Mapped to phases: 9（Phase 37 URL-01 / Phase 38 SHARE-01..06 / Phase 39 OGP-01..02）
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-14*
*Last updated: 2026-06-14 after roadmap creation (Phases 37-39 mapped)*
