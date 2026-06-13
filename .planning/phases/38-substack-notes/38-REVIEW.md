---
phase: 38-substack-notes
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/share.ts
  - src/components/ShareButton.tsx
  - src/lib/shareUrl.ts
  - src/app/(main)/page.tsx
  - src/app/(main)/daily/page.tsx
  - src/app/(main)/member/[publicationId]/page.tsx
  - src/lib/__tests__/share.test.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

ワンボタン共有機能（Phase 38）のレビュー。設計は概ね健全で、KISS 方針どおり新規依存なし・定数1か所集約・`buildShareUrl` への委譲が守られている。XSS / インジェクション系の Critical な脆弱性は検出されなかった（クリップボードへ書き込むテキストは静的定型文＋`encodeURIComponent` 済み URL、フィードバック文言は静的、`dangerouslySetInnerHTML` 不使用）。

一方で、クライアント側の `window.open` がポップアップブロックで失敗しうる挙動上の問題、`setTimeout` のクリーンアップ欠如、`getUser()` のエラー無視といった堅牢性の問題が見つかった。いずれも本番投入前に検討すべき Warning レベル。

## Warnings

### WR-01: `await` 後の `window.open` はポップアップブロックで開かない可能性

**File:** `src/components/ShareButton.tsx:23-29`
**Issue:** `window.open(SHARE_NOTES_URL, ...)` を `await navigator.clipboard.writeText(text)` の **後** に呼んでいる。多くのブラウザ（特に Safari、および一部の Firefox/Chrome 設定）は「ユーザー操作（クリック）に同期して呼ばれた `window.open` のみ」を許可する。`await` を挟むとユーザー操作のコンテキストが切れ、新規タブがブロックされて開かないことがある。SHARE-03（コピー後に Notes を開く）の中核 UX が一部環境で機能しない恐れがある。
**Fix:** クリックハンドラ冒頭で同期的にタブを確保し、後でその参照に対して遷移させる。あるいはクリップボード処理と並行して開く。

```tsx
async function handleShare() {
  // クリック直後（ユーザー操作コンテキスト内）に同期で開く
  const win = window.open(SHARE_NOTES_URL, '_blank', 'noopener,noreferrer')
  const { text } = buildShareText({ view, origin: window.location.origin })
  try {
    await navigator.clipboard.writeText(text)
    setFeedback('copied')
  } catch {
    setFeedback('error')
    win?.close() // コピー失敗時はタブを閉じる方針なら
  }
  window.setTimeout(() => setFeedback('idle'), 4000)
}
```
（タブを「コピー成功時のみ開く」要件を厳守するなら、ブロックされうるトレードオフを明示的に受容するか、UX を再検討する。）

### WR-02: `setTimeout` がクリーンアップされず、アンマウント後 / 連打で setState 警告・状態巻き戻り

**File:** `src/components/ShareButton.tsx:34`
**Issue:** `window.setTimeout(() => setFeedback('idle'), 4000)` をクリックのたびに無条件で生成しており、(1) タイマー ID を保持しないためアンマウント時にクリアできず、コンポーネントが消えた後に `setFeedback` が走ると React の「アンマウント済みコンポーネントへの状態更新」相当の挙動になる。(2) 4秒以内に連打すると複数タイマーが走り、後続の `idle` リセットが意図せず早期にフィードバックを消す。
**Fix:** `useRef` でタイマー ID を保持し、新規セット前にクリア＋アンマウント時に `clearTimeout`。または `useEffect` + cleanup で feedback 変化を監視してタイマーを管理する。

```tsx
const timerRef = useRef<number | undefined>(undefined)
// handleShare 内:
if (timerRef.current) window.clearTimeout(timerRef.current)
timerRef.current = window.setTimeout(() => setFeedback('idle'), 4000)
// useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])
```

### WR-03: `auth.getUser()` の error を無視（フェイルクローズだが沈黙）

**File:** `src/app/(main)/page.tsx:22-25`, `src/app/(main)/daily/page.tsx:20-23`, `src/app/(main)/member/[publicationId]/page.tsx:26-29`
**Issue:** 3ページとも `const { data: { user } } = await supabase.auth.getUser()` で `error` を破棄している。認証取得が失敗（ネットワーク・トークン期限切れ等）した場合、`user` は `null` となり共有ボタンが**ログイン済みユーザーにも表示されない**。フェイルクローズなので安全側ではあるが、ログイン中なのにボタンが消える事象がエラーログなしで再現困難になる。同ファイルの `slotsError` は `console.error` でログしている（page.tsx:46-48）のと不整合。
**Fix:** 少なくとも error をログする。

```ts
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError) console.error('[Home] auth.getUser error:', authError)
```

## Info

### IN-01: `getUser()` 追加により `revalidate = 300` が実質無効化

**File:** `src/app/(main)/page.tsx:11,21`, `daily/page.tsx:9,19`, `member/[publicationId]/page.tsx:12,25`
**Issue:** `auth.getUser()` は内部で `cookies()` を読むため、これらのルートは動的レンダリング（per-request）にオプトインされる。結果、宣言されている `export const revalidate = 300`（ISR 5分キャッシュ）は事実上効かなくなる。これは「ユーザーごとに共有ボタン表示を出し分ける」要件上は意図どおりだが、矛盾した設定が残ると将来の読み手を誤解させる。（パフォーマンス影響自体は v1 スコープ外。）
**Fix:** 動的化が意図なら `revalidate` の意味をコメントで補足するか、`export const dynamic = 'force-dynamic'` を明示して意図を表現する。

### IN-02: `buildShareUrl` の switch に網羅性ガードがない

**File:** `src/lib/shareUrl.ts:64-80`
**Issue:** `ShareView` ユニオン上の `switch` に `default` 句がなく、関数は `string | undefined` を返す可能性がある型構造（全 case で return しているため現状は問題なし）。将来 `ShareView` に新しい `type` を追加した際、コンパイル時に検知されず、未処理ケースで `undefined` を返して `new URL(undefined, origin)` がランタイムで壊れる。
**Fix:** 網羅性チェックを追加。

```ts
default: {
  const _exhaustive: never = view
  throw new Error(`unhandled ShareView: ${JSON.stringify(_exhaustive)}`)
}
```

### IN-03: member 共有 URL が常に `?ym=` を含み、現在月にピン留めされる

**File:** `src/app/(main)/member/[publicationId]/page.tsx:65-72`, `src/lib/shareUrl.ts:74-77`
**Issue:** メンバーページは `ym` 未指定でも `parseYmParam` が現在 JST 年月へフォールバックし、その値を `formatYmParam` して必ず `ShareButton` に渡す。よって `/member/x`（月指定なし）を見ているときの共有 URL も `/member/x?ym=2026-06` のように現在月を埋め込む。共有時点の月に固定されるため、後で開いた人は「最新月」ではなく「共有された月」を見る。意図的な正準化なら問題ないが、`buildShareUrl` 側の `if (!view.ym) return base`（ym なしならクエリ無し）という分岐が呼び出し側で常に潰されており、デッドパス気味。
**Fix:** 「常に明示月」が意図ならこのままで可。ただし「ユーザーが月を指定していない場合は素の URL を共有」したいなら、ページ側で生の `ym` searchParam の有無を見て渡し分ける。

### IN-04: テストが正常系の組み立てに偏っており、信頼境界・フォールバックの回帰を守れていない

**File:** `src/lib/__tests__/share.test.ts`
**Issue:** `buildShareText` のテストは全て有効入力。`shareUrl.ts` のコメントが強調する信頼境界（不正 `ym` のフォールバック、域外年の正準化、`type: 'member'` で `ym` 省略時の素 URL）に対する `buildShareText` 経由のテストがない。これらは外部入力起因のリグレッションが起きやすい箇所。
**Fix:** 例として、不正 ym（`'2026/6'` や `'9999-99'`）が現在 JST 月へ正準化されること、`ym` 省略時に `/member/pub-123`（クエリ無し）になることを追加。

### IN-05: `window.open` の戻り値 / `noopener` の整合（情報）

**File:** `src/components/ShareButton.tsx:29`
**Issue:** `'noopener,noreferrer'` 指定は外部サイト（substack.com）を開くうえで適切（reverse tabnabbing 対策）で良い。ただし `noopener` 指定時 `window.open` は `null` を返すため、WR-01 の修正でタブ参照を使う設計に変える場合は `noopener` を外す必要があり、その際は `win.opener = null` を手動設定するなどの代替対策を検討すること。
**Fix:** WR-01 を「冒頭で同期 open し参照は使わない（成功時に閉じない）」方針にすれば `noopener` を維持でき、本項は対応不要。

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
