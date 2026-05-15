# Phase 13: ファーストビュー + モバイルレイアウト - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 13-ファーストビュー + モバイルレイアウト
**Areas discussed:** バナー削除の範囲, モバイル余白の設計, 名前列のモバイル扱い, ヘッダー領域のコンパクト化

---

## バナー削除の範囲

### top_logo.png の img タグ処理

| Option | Description | Selected |
|--------|-------------|----------|
| 完全削除 | img タグをまるごと削除。OGP 用画像は layout.tsx で参照中なので SNS 共有カードに影響なし | ✓ |
| 超小型バッジに縮小 | h1 の隣にアイコン程度（32px）で残す | |
| 削除 + サブタイトルテキスト追加 | 画像を削除し、短いキャッチコピーをテキストで追加 | |

**User's choice:** 完全削除
**Notes:** OGP 参照は layout.tsx で別途維持されるため、ページ内の img タグ削除のみで問題なし。

### h1「Keep Substack」のサイズ・スタイル

| Option | Description | Selected |
|--------|-------------|----------|
| 現状維持（text-2xl） | トップに大きめのタイトル。バナー削除後も存在感あり | ✓ |
| 小さくする（text-sm/text-base） | 最小限のブランディングを残しつつ、モバイルでの占有面積を削減 | |
| 削除（テキストロゴごと削除） | URL やブラウザタブに「Keep Substack」は表示されるので不要と判断する場合 | |

**User's choice:** 現状維持（text-2xl）
**Notes:** ブランド認識のためタイトルは残す。サイズ変更は不要。

---

## モバイル余白の設計

| Option | Description | Selected |
|--------|-------------|----------|
| px-3 py-4 に変更 | 左右 12px に縮小。375px 幅で使用可能幅 351px。モバイルのデータ領域を増やしつつ縦方向の余白は適度に確保 | ✓ |
| p-2 に大幅削減 | 左右 8px まで縮小。幅は最大化されるが、文字やエッジが少し窮屈な印象になるかも | |
| p-6 のまま維持 | 現状の丸マジ。バナー削除だけで十分と判断する場合 | |

**User's choice:** px-3 py-4 に変更
**Notes:** `pb-64` も `pb-16` 程度に縮小予定（スクロール余白の最適化）。

---

## 名前列のモバイル扱い

| Option | Description | Selected |
|--------|-------------|----------|
| w-12（48px）のまま維持 | 変更なし。px-3 変更後、351px - 48px - 40px = 263px でセル約 37px | ✓ |
| w-10（40px）に縮小 | アイコン w-10/h-10 はそのままで列幅だけ縮小。351px - 40px - 40px = 271px でセル約 38px | |
| w-8（32px）に大幅縮小 | アイコンも w-8/h-8 に縮小。351px - 32px - 40px = 279px でセル約 39px | |

**User's choice:** w-12（48px）のまま維持
**Notes:** アイコンサイズ変更は Phase 14 以降で検討。現状維持でシンプルに進める。

---

## ヘッダー領域のコンパクト化

### h1 と チームタブのマージン

| Option | Description | Selected |
|--------|-------------|----------|
| mb-2 / mb-4 に白める | h1 の mb-4→mb-2、タブの mb-6→mb-4 に変更。バナー削除でほげた分を追加圧縮 | ✓ |
| 現状維持（mb-4 / mb-6） | バナー削除だけで十分なスペース節約と判断する場合 | |
| モバイルのみ白める | sm: プレフィックスでモバイルのみ mb-1 等に、PC は現状維持 | |

**User's choice:** mb-2 / mb-4 に白める
**Notes:** シンプルに両方縮小。レスポンシブ分岐は不要。

### チームタブのスタイル

| Option | Description | Selected |
|--------|-------------|----------|
| 現状のまま（変更なし） | タブの見た目は Phase 14 で LIST-03 対応 | ✓ |
| コンパクト化（py-0.5 等） | タブ自体の高さを小さくしてデータ領域をさらに広げる | |

**User's choice:** 現状のまま（変更なし）
**Notes:** アクティブタブの視認性改善は Phase 14（LIST-03）で対応予定。

---

## Claude's Discretion

特になし — 全項目でユーザーが明確に選択した。

## Deferred Ideas

- **チームタブの視認性改善** → Phase 14（LIST-03）で対応
- **ヒートマップセルの 44px タッチターゲット化** → Phase 15（HEATMAP-01/02）で対応
- **名前列のさらなる縮小（w-8 等）** → Phase 14 で再検討可能
