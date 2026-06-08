# Phase 36: QA・UAT・検証ギャップ解消 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 36-qa-uat
**Areas discussed:** 実行方法, 検証環境, 既済項目, 記録方法

---

## 検証実行方法（自動 vs 手動）

| Option | Description | Selected |
|--------|-------------|----------|
| ハイブリッド（自動化優先＋手動補完） | 自動化できる項目は既存E2Eハーネス拡張で回帰テスト化、視覚・実メール往復は手動 | ✓ |
| 全項目を手動実行 | ブラウザ/Dashboard で全シナリオ手動、新規テストコードなし | |
| 全項目を自動化 | 視覚・実メール往復も可能な限りPlaywrightで自動化 | |

**User's choice:** ハイブリッド（自動化優先＋手動補完）
**Notes:** durable な回帰資産を残しつつ、自動化困難項目は手動で補完。

---

## 検証環境

| Option | Description | Selected |
|--------|-------------|----------|
| 本番＋開発者自身のアカウント | 本番で開発者メンバー行に対し実行、SC#1充足、他データ非汚染 | ✓ |
| 自動化はTEST project / 手動は本番 | 自動E2EはTEST隔離、手動UATのみ本番 | |
| 全てローカルdev | dev DB で実行、本番要件未充足だが安全 | |

**User's choice:** 本番＋開発者自身のアカウント
**Notes:** ⚠ 本番ドメインが `https://keep-substack.com` へ移行済み（旧 keep-substack.vercel.app）。Magic Link / Supabase Redirect URL の前提確認が必要。E2E ハーネスは TEST project 紐付けのため、SC#1「本番充足」は手動本番パスで担保（CONTEXT D-04/D-05）。

---

## 既に他フェーズで解消済みの項目の扱い

| Option | Description | Selected |
|--------|-------------|----------|
| 参照解決（再検証しない） | Phase 32/29 で証明済み項目は resolved-by-reference、未実行項目に集中 | ✓ |
| 全項目を新規再検証 | 漏れ防止のため既済も再実行 | |

**User's choice:** 参照解決（再検証しない）
**Notes:** Phase 28 ①（member_commit_slots本番存在）→ Phase 32 で確認済み。Phase 29 HUMAN-UAT → 既 resolved(3/3)。

---

## 結果記録方法 / Definition of Done

| Option | Description | Selected |
|--------|-------------|----------|
| 既存ファイルをin-place更新＋失敗は新規バグ化 | 27/28/29のUAT/VERIFICATIONを直接更新、失敗はdebug/phase化 | ✓ |
| Phase 36に統合サマリー作成 | 横断レポート新規作成、各ファイルはポインタのみ | |
| 両方 | 個別更新＋統合サマリー | |

**User's choice:** 既存ファイルをin-place更新＋失敗は新規バグ化
**Notes:** 個別ファイルが正典。失敗は黙って通さず milestone close 可否を明示。

---

## Claude's Discretion

- 自動化テストの spec ファイル構成・配置（既存 e2e/ パターン踏襲）。
- 28/29 のどの項目を自動化し切るか手動に残すかの最終線引き。

## Deferred Ideas

- 検証で発見されたバグの修正実装（→ `/gsd:debug` または新規フェーズ）。
- 既知の logout redirect bug（Phase 32 で発見、Phase 33 対応予定）。
