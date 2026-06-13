import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'

// 共有テキスト組み立ては share.ts 側で検証済み。ここではキャプションと
// v1.9 修正版の「クリック→コピー→即 Substack を開く（ページ内モーダルなし）」
// フローに集中する。
//
// ShareButton は useState/useRef/useEffect を使うクライアントコンポーネント。
// このリポジトリの component テストは「コンポーネントを純関数として呼び、返る
// React 要素ツリーを走査する」方式のため、React のフックをスタブして同期的に
// 要素ツリーを得られるようにする（DOM レンダラは使わない）。
let stateQueue: unknown[] = []
let stateIndex = 0
const setters: Array<ReturnType<typeof vi.fn>> = []

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
    useEffect: () => {},
  }
})

import ShareButton, { SHARE_BUTTON_LABEL } from '../ShareButton'
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

function render(props: Parameters<typeof ShareButton>[0]) {
  // 既定（toast = null）で描画
  stateQueue = []
  stateIndex = 0
  setters.length = 0
  return ShareButton(props) as unknown
}

describe('ShareButton', () => {
  beforeEach(() => {
    stateQueue = []
    stateIndex = 0
    setters.length = 0
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open: vi.fn(),
    })
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
  })
  afterEach(() => {
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

  it('クリックでコピーし、続けて即 Substack Notes を開く（ページ内ダイアログは出さない）', async () => {
    const order: string[] = []
    const writeText = vi.fn(async () => {
      order.push('copy')
    })
    const open = vi.fn(() => {
      order.push('open')
      return null
    })
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open,
    })

    const tree = render({ view: { type: 'daily' } })

    // ブロッキングな role="dialog" は描画されない
    const dialogEls = findAll(tree, (el) => el.props['role'] === 'dialog')
    expect(dialogEls.length).toBe(0)

    const button = findByType(tree, 'button')
    const onClick = button?.props.onClick as () => Promise<void>
    await onClick()

    // コピーしてから Substack を開く順序
    expect(order).toEqual(['copy', 'open'])
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://keep-substack.com/daily')
    )
    expect(open).toHaveBeenCalledWith(SHARE_NOTES_URL, '_blank', 'noopener')
  })

  it('コピー失敗時も Substack を開き、フォールバックを案内する（ブロッキングしない）', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    const open = vi.fn(() => null)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open,
    })

    const tree = render({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    await (button?.props.onClick as () => Promise<void>)()

    // コピーが失敗しても Substack は開く
    expect(open).toHaveBeenCalledWith(SHARE_NOTES_URL, '_blank', 'noopener')
    // 非ブロッキング: ダイアログは出さず、トースト用 setter が呼ばれる
    expect(findAll(tree, (el) => el.props['role'] === 'dialog').length).toBe(0)
    expect(setters[0]).toHaveBeenCalled()
  })

  it('トースト表示中は role="status" の非ブロッキング通知を出す', () => {
    stateQueue = ['コピーしました！Substackで貼り付けて投稿してください']
    stateIndex = 0
    setters.length = 0
    const tree = ShareButton({ view: { type: 'goal' } }) as unknown

    const statusEls = findAll(tree, (el) => el.props['role'] === 'status')
    expect(statusEls.length).toBe(1)
    expect(statusEls[0].props['aria-live']).toBe('polite')
    expect(statusEls[0].props.children).toBe(
      'コピーしました！Substackで貼り付けて投稿してください'
    )
    // ブロッキングなダイアログではない
    expect(findAll(tree, (el) => el.props['role'] === 'dialog').length).toBe(0)
  })
})
