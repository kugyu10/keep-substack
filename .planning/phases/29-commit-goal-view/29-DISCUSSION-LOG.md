# Phase 29: Commit & Goal View — 新トップページ - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 29-commit-goal-view
**Areas discussed:** CommitGridセル幅設計, データ層設計, スマホ縮退, アチーブメント列スコープ境界

---

## CommitGridセル幅設計

### 総横幅統一の仕組み

| Option | Description | Selected |
|--------|-------------|----------|
| flex 比率 | 週ブロック内で `flex-1` 的にセルを分割。週回数が少ないほどセル幅が広くなる | |
| 12セル固定グリッド | `grid-cols-12` で全メンバー同一グリッド。週N回は `12/(freq*3)` 列スパン | ✓ |

**User's choice:** 12セル固定グリッド
**Notes:** 実装上 freq=3 の場合は 12列でキリが悪い（9セル）。実装は 36列グリッドなど LCM アプローチをプランナーに委ねる。

---

### 週区切り表現

| Option | Description | Selected |
|--------|-------------|----------|
| 周間毎の細い縦線 | 週ブロック間に細い縦線（`border-r` 等）を入れる | ✓ |
| 週間スペースのみ | セル間 gap を使い分けるだけ、縦線なし | |
| Claude に任せる | 実装時に見やすい方法を選ぶ | |

**User's choice:** 週ごとに細い縦線
**Notes:** 派手にならないよう細くシンプルに。

---

### 未投稿スロット曜日名

| Option | Description | Selected |
|--------|-------------|----------|
| 日本語2文字（月、火…）| コンパクト、最小セルにも収まる | ✓ |
| 英語3文字（Mon、Tue…） | 週4回=小セルでも収まる可能性あり | |

**User's choice:** 日本語2文字（月、火、水、木、金、土、日）
**Notes:** ISO 8601 day_of_week マッピング（1=月〜7=日）は Phase 28 D-15 から引き継ぎ。

---

## データ層設計

### 3週分記事データの取得

| Option | Description | Selected |
|--------|-------------|----------|
| fetchAllFeedsCached 流用 | KVアーカイブ全件を返すため isoDate で21日フィルタ。追加実装なし | ✓ |
| 専用関数 fetchCommitPeriodFeeds | 21日以内限定の新規関数。明示的だが既存と重複 | |

**User's choice:** fetchAllFeedsCached 流用

---

### commit_slots の取得場所

| Option | Description | Selected |
|--------|-------------|----------|
| / page.tsx (Server Component) | トップページで全メンバー分まとめて Supabase SELECT | ✓ |
| CommitGoalView 内で Client 取得 | useEffect で Supabase 取得。ローディング状態管理が必要 | |

**User's choice:** `/ page.tsx` Server Component

---

### member_commit_slots RLS

| Option | Description | Selected |
|--------|-------------|----------|
| 公開読み取り OK | anon ロールに SELECT 許可。書き込みは本人のみ維持 | ✓ |
| 非公開（admin のみ読める） | service_role でバイパス。サーバーサイドのみ取得 | |

**User's choice:** 公開読み取り OK（anon SELECT）
**Notes:** members テーブルと同様に公開ページから読める設計。migration で policy 追加が必要。

---

## スマホ縮退

### 実装方針

| Option | Description | Selected |
|--------|-------------|----------|
| CSS-only | 3週分レンダリング。古い2週を `hidden sm:block` で非表示 | ✓ |
| JS viewport 検知 | useWindowSize 的な hook で条件レンダリング。Client Component 化が必要 | |

**User's choice:** CSS-only

---

### 縮退時に表示する週

| Option | Description | Selected |
|--------|-------------|----------|
| 現在週（最新） | 最も関心が高い情報 | ✓ |
| 左週（最古） | — | |
| Claude に任せる | — | |

**User's choice:** 現在週（最新）

---

## アチーブメント列スコープ境界

### Phase 29 の実装範囲

| Option | Description | Selected |
|--------|-------------|----------|
| 列スペースのみ確保（空） | 空の div でスペースを確保。👑/🔥 は Phase 30 | ✓ |
| VIEW-03 は Phase 30 に委譲 | Commit Grid のみ実装。行レイアウトも Phase 30 で完成 | |
| Phase 29 で全部実装 | VIEW-03 + ACHIEV-01/02 をまとめてやる | |

**User's choice:** 列スペースだけ確保（空）

---

### メンバー並び順

| Option | Description | Selected |
|--------|-------------|----------|
| Claude に任せる | 実装時に適切な順を選ぶ | |
| コミット実績率順 | 達成率高いほど上 → ストリーク週数 → 登録順 | ✓ |
| 登録順（固定） | member ID or addedAt で安定ソート | |

**User's choice:** 今週の実績率 → 同率ならストリーク週数 → 同位なら登録順（id 昇順）
**Notes:** 「仮の実装。あとで変えるかも」とのこと。

---

## Claude's Discretion

- `/weekly-stamp` 移行: `src/app/page.tsx` → `src/app/weekly-stamp/page.tsx` コピー
- 固定グリッドの具体的列数（36列 or その他の均等幅アプローチ）
- Supabase クライアント種別（`server` クライアントで OK）
- `revalidate` 値（既存 300秒を踏襲）

## Deferred Ideas

- メンバー並び順の最終確定 — 実績率 → ストリーク → 登録順は仮。運用後に調整予定
