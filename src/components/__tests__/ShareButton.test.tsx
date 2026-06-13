import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'

// 共有テキスト組み立ては share.ts 側で検証済み。ここではキャプションと
// v1.9 最終版の「クリック→コピー→案内→約3秒後に同一タブで Substack へ遷移」
// フローに集中する。
//
// ShareButton は useState/useRef/useEffect を使うクライアントコンポーネント。
// このリポジトリの component テストは「コンポーネントを純関数として呼び、返る
// React 要素ツリーを走査する」方式のため、React のフックをスタブして同期的に
// 要素ツリーを得られるようにする（DOM レンダラは使わない）。
//
// status state は { kind: 'idle' | 'success' | 'failure', ... } のオブジェクト。
// stateQueue[0] に初期値を差し込めば、その状態でのツリーを得られる。
let stateQueue: unknown[] = []
let stateIndex = 0
const setters: Array<ReturnType<typeof vi.fn>> = []
// useEffect のクリーンアップを捕捉して unmount をシミュレートする
const cleanups: Array<() => void> = []

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: (init: unknown) => {
      const value = stateIndex < stateQueue.length ? stateQueue[stateIndex] : init
      stateIndex++
      const setter = vi.fn()
      setters.push(setter)
      return [value, setter]
    },
    useRef: (init: unknown) => ({ current: init }),
    useEffect: (fn: () => void | (() => void)) => {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
  }
})

import ShareButton, {
  SHARE_BUTTON_LABEL,
  SHARE_SUCCESS_MESSAGE,
  SHARE_SUCCESS_SUBMESSAGE,
  SHARE_FAILURE_MESSAGE,
  SHARE_NAVIGATE_DELAY_MS,
} from '../ShareButton'
import { SHARE_NOTES_URL } from '@/lib/share'

// --- Element-tree helpers（page.test.tsx と同じ素朴な走査）---
type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }
function isElement(node: unknown): node is AnyEl {
  return typeof node === 'object' && node !== null && 'props' in node
}
function findAll(node: unknown, pred: (el: AnyEl) => boolean, acc: AnyEl[] = []): AnyEl[] {
  if (!isElement(node)) return acc
  if (pred(node)) acc.push(node)
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) findAll(child, pred, acc)
  return acc
}
function findByType(node: unknown, type: string): AnyEl | null {
  const all = findAll(node, (el) => el.type === type)
  return all[0] ?? null
}
function textContent(node: unknown): string {
  if (typeof node === 'string') return node
  if (!isElement(node)) return ''
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  return list.map(textContent).join('')
}

function render(props: Parameters<typeof ShareButton>[0]) {
  stateQueue = []
  stateIndex = 0
  setters.length = 0
  cleanups.length = 0
  return ShareButton(props) as unknown
}

describe('ShareButton', () => {
  beforeEach(() => {
    stateQueue = []
    stateIndex = 0
    setters.length = 0
    cleanups.length = 0
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com', assign: vi.fn() },
      open: vi.fn(),
    })
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('既定キャプションは「継続をシェア」で aria-label も一致する', () => {
    const tree = render({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    expect(button?.props.children).toBe(SHARE_BUTTON_LABEL)
    expect(SHARE_BUTTON_LABEL).toBe('継続をシェア')
    expect(button?.props['aria-label']).toBe(SHARE_BUTTON_LABEL)
  })

  it('label プロップで上書きできる', () => {
    const tree = render({ view: { type: 'goal' }, label: '別ラベル' })
    const button = findByType(tree, 'button')
    expect(button?.props.children).toBe('別ラベル')
    expect(button?.props['aria-label']).toBe('別ラベル')
  })

  it('クリックで共有テキストをクリップボードへコピーする', async () => {
    const writeText = vi.fn(async () => {})
    const assign = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com', assign },
    })

    const tree = render({ view: { type: 'daily' } })

    // ブロッキングな role="dialog" は描画されない
    expect(findAll(tree, (el) => el.props['role'] === 'dialog').length).toBe(0)

    const button = findByType(tree, 'button')
    await (button?.props.onClick as () => Promise<void>)()

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://keep-substack.com/daily')
    )
    // この時点ではまだ遷移しない（案内表示中）
    expect(assign).not.toHaveBeenCalled()
  })

  it('コピー成功時は成功メッセージを表示する（success 状態のツリー）', () => {
    stateQueue = [{ kind: 'success' }]
    stateIndex = 0
    setters.length = 0
    cleanups.length = 0
    const tree = ShareButton({ view: { type: 'goal' } }) as unknown

    const statusEls = findAll(tree, (el) => el.props['role'] === 'status')
    expect(statusEls.length).toBe(1)
    expect(statusEls[0].props['aria-live']).toBe('polite')
    const text = textContent(statusEls[0])
    expect(text).toContain(SHARE_SUCCESS_MESSAGE)
    expect(text).toContain(SHARE_SUCCESS_SUBMESSAGE)
    // ブロッキングなダイアログではない
    expect(findAll(tree, (el) => el.props['role'] === 'dialog').length).toBe(0)
  })

  it('コピー後 約3000ms で同一タブ遷移する（window.open ではなく location.assign）', async () => {
    const writeText = vi.fn(async () => {})
    const assign = vi.fn()
    const open = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com', assign },
      open,
    })

    const tree = render({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    await (button?.props.onClick as () => Promise<void>)()

    // タイマー満了前は未遷移
    expect(assign).not.toHaveBeenCalled()

    vi.advanceTimersByTime(SHARE_NAVIGATE_DELAY_MS)

    // 同一タブ遷移。新規タブ open は使わない
    expect(assign).toHaveBeenCalledWith(SHARE_NOTES_URL)
    expect(open).not.toHaveBeenCalled()
  })

  it('コピー失敗時は手動コピー文言と読み取り専用テキスト＋「Substackへ移動」を表示し、自動遷移しない', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    const assign = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com', assign },
    })

    const tree = render({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    await (button?.props.onClick as () => Promise<void>)()

    // 失敗状態の setter が呼ばれる（共有テキストを保持）
    expect(setters[0]).toHaveBeenCalledWith({
      kind: 'failure',
      text: expect.stringContaining('https://keep-substack.com/'),
    })

    // 自動遷移しない（タイマーも貼られない）
    vi.advanceTimersByTime(SHARE_NAVIGATE_DELAY_MS * 2)
    expect(assign).not.toHaveBeenCalled()

    // failure 状態のツリーを描画して内容を確認
    const failText = 'Substack継続を頑張っています📈 #KeepSubstack\nhttps://keep-substack.com/'
    stateQueue = [{ kind: 'failure', text: failText }]
    stateIndex = 0
    setters.length = 0
    cleanups.length = 0
    const failTree = ShareButton({ view: { type: 'goal' } }) as unknown

    expect(textContent(failTree)).toContain(SHARE_FAILURE_MESSAGE)
    // 読み取り専用テキスト
    const textarea = findByType(failTree, 'textarea')
    expect(textarea?.props.readOnly).toBe(true)
    expect(textarea?.props.value).toContain('https://keep-substack.com/')
    // クリックできる「Substackへ移動」リンク
    const link = findByType(failTree, 'a')
    expect(link?.props.href).toBe(SHARE_NOTES_URL)
    expect(textContent(link)).toContain('Substackへ移動')
    // ブロッキングなダイアログではない
    expect(findAll(failTree, (el) => el.props['role'] === 'dialog').length).toBe(0)
  })

  it('アンマウント時にタイマーがクリアされ、遷移は発火しない', async () => {
    const writeText = vi.fn(async () => {})
    const assign = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com', assign },
    })

    const tree = render({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    await (button?.props.onClick as () => Promise<void>)()

    // useEffect のクリーンアップ（= unmount）を実行
    expect(cleanups.length).toBe(1)
    cleanups.forEach((fn) => fn())

    // unmount 後にタイマーが満了しても遷移しない
    vi.advanceTimersByTime(SHARE_NAVIGATE_DELAY_MS)
    expect(assign).not.toHaveBeenCalled()
  })
})
