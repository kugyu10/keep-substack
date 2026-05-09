# Phase 5: WeeklyHeatmap + リッチTooltip - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 5-WeeklyHeatmap + リッチTooltip
**Areas discussed:** セル色・濃淡デザイン, Tooltipの見た目とトリガー, 50人対応レイアウト, MiniCalendarの扱い

---

## セル色・濃淡デザイン

| Option | Description | Selected |
|--------|-------------|----------|
| 投稿数で6段階の濃淡 | 現MiniCalendarのbg-green-xxx パターンを踏襲 | ✓ |
| 記事あり=1色（固定）、なし=グレー | シンプル。記事あり/なしだけにフォーカス | |
| Claudeの裁量に任せる | プランナーに判断させる | |

**User's choice:** 投稿数で6段階の濃淡
**Notes:** 記事なしセル = bg-gray-100。直近7日 = 今日から遡って6日前まで（未来の日は表示しない）

---

## Tooltipの見た目とトリガー

| Option | Description | Selected |
|--------|-------------|----------|
| サムネイル上・タイトル下（縦積み） | 2層組み。サムネイル→タイトルの順 | ✓ |
| サムネイル左・タイトル右（横並び） | コンパクトにまとまる | |
| Claudeの裁量に任せる | コンパクトにまとめる方を選択する可能性が高い | |

**User's choice:** サムネイル上・タイトル下（縦積み）

| Option | Description | Selected |
|--------|-------------|----------|
| グレーのプレースホルダー（固定サイズ） | グレーの四角形。「画像なし」が明確 | |
| 📷 アイコン表示 | 画像アイコンをセンターに表示 | |
| 写真なしでタイトルを上につめる | サムネイル領域を省略してタイトルのみ表示 | ✓ |

**User's choice:** サムネイルなし時はサムネイル部分を省略してタイトルだけ表示（つめる）

| Option | Description | Selected |
|--------|-------------|----------|
| タップで表示／非表示トグル | デスクトップ=ホバー、モバイル=タップ（ArticleTooltipと同じ） | ✓ |
| モバイル考慮なし（デスクトップで十分） | コードが少ない | |
| Claudeの裁量に任せる | シンプルな実装を選択 | |

**User's choice:** タップで表示／非表示トグル

**Tooltip幅:**
| Option | Description | Selected |
|--------|-------------|----------|
| max-w-xs（160px相当） | コンパクト。小スマホでも安全 | ✓ |
| max-w-sm（384px相当） | やや広め。サムネイルとタイトルがゆったり収まる | |
| Claudeの裁量に任せる | max-w-xsをベースに実装時に調整 | |

**User's choice:** max-w-xs（160px相当）

**フリーテキスト補足:**
> タイトルは20文字と言ったが、全部表示しよう。横幅上限を設けて小さいスマホでも横がはみでないように折り返す

**Notes:** REQUIREMENTS.md TIP-01の「記事タイトル20文字」はユーザー決定で全文表示に変更。max-w-xs内でbreak-words折り返し。

---

## 50人対応レイアウト

| Option | Description | Selected |
|--------|-------------|----------|
| ページ内縦スクロール（全員表示） | シンプル。メンテナンスが少ない | ✓ |
| テーブルのみスクロール（ヘッダー固定） | 見た目は良いが実装が複雑 | |
| Claudeの裁量に任せる | 2人規模から始まるので縦スクロールが適切 | |

**User's choice:** ページ内縦スクロール（全員表示）

| Option | Description | Selected |
|--------|-------------|----------|
| 固定幅（w-32程度）で切れたらtruncate | 8rem固定。シンプル。長い名前は「...」で省略 | ✓ |
| 固定幅（w-24程度）で小さめに収める | 6rem固定。セル数分の幅を確保しやすい | |
| Claudeの裁量に任せる | 7日分のセルとバランスした幅を選択 | |

**User's choice:** 固定幅（w-32程度）でtruncate

---

## MiniCalendarの扱い

| Option | Description | Selected |
|--------|-------------|----------|
| WeeklyHeatmap専用新コンポーネントを作る | HeatmapRow.tsxなど新設。読みやすく「7日の行」の責割りが明確。KISS原則 | ✓ |
| MiniCalendarを拡張・改造して流用 | 既存propやスタイルを再利用。月カレンダーのロジックが混入するリスク | |
| Claudeの裁量に任せる | 異なる責務なので新規作成を選択 | |

**User's choice:** WeeklyHeatmap専用新コンポーネントを作る
**Notes:** 既存MiniCalendarは/memberページで継続使用。削除・変更しない。

| Option | Description | Selected |
|--------|-------------|----------|
| 必要（曜日名 or MM/DD） | 日付を見るのが楽になる | ✓ |
| 不要（セルだけ） | よりコンパクト | |
| Claudeの裁量に任せる | コンパクトにまとめるため「不要」を選択する可能性が高い | |

**User's choice:** 日付ヘッダーあり

| Option | Description | Selected |
|--------|-------------|----------|
| MM/DD（5/3、5/4...） | 少ない文字数で日付が明確。曜日は不明 | ✓ |
| 曜日名（月火水...またはMon/Tue...） | 曜日リズムが一目瞭然。日付はわからない | |
| MM/DD + 曜日名両方 | 例:「5/3(月)」。情報量が多いがセル幅が必要 | |

**User's choice:** MM/DD（5/3、5/4...）

---

## Claude's Discretion

- サムネイル画像のCSSサイズはコンパクトに収まるよう実装時に決定
- `FeedItem`型への`contentEncoded`フィールド追加と`rss-parser`のカスタムフィールド設定
- セルの具体的なpx/remサイズはレイアウト全体のバランスでClaude判断

## Deferred Ideas

- スティッキーヘッダー（メンバー名列と日付列を固定）— 実装複雑度が高い。将来フェーズで検討
- team-idフィルター — Phase 6（HEAT-04）で実装
- 年間ヒートマップ（GitHub草型）— Future要件
