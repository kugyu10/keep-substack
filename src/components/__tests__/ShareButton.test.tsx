import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'

// 共有テキスト組み立ては share.ts 側で検証済み。ここではキャプションと
// v1.9 の「クリック→コピー→説明モーダル→（明示ジェスチャで）Substackを開く」
// フローに集中する。
//
// ShareButton は useState/useRef/useEffect を使うクライアントコンポーネント。
// このリポジトリの component テストは「コンポーネントを純関数として呼び、返る
// React 要素ツリーを走査する」方式のため、React のフックをスタブして同期的に
// 要素ツリーを得られるようにする（DOM レンダラは使わない）。
//
// useState はモジュールスコープの stateQueue から順に初期値を返し、setter は
// 記録用 spy を返す。テストごとに stateQueue を差し替えることで「モーダルが
// 開いている状態のツリー」も検証できる。
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
function findButtonByLabel(node: unknown, label: string): AnyEl | null {
  const buttons = findAll(node, (el) => el.type === 'button')
  return (
    buttons.find(
      (b) =>
        b.props.children === label || b.props['aria-label'] === label
    ) ?? null
  )
}

function renderClosed(props: Parameters<typeof ShareButton>[0]) {
  // 既定（全 state 初期値: isOpen=false, copied=null, shareText='')
  stateQueue = []
  stateIndex = 0
  setters.length = 0
  return ShareButton(props) as unknown
}
function renderOpen(props: Parameters<typeof ShareButton>[0], copied: boolean, shareText: string) {
  // state 順: [isOpen, copied, shareText]
  stateQueue = [true, copied, shareText]
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
    const tree = renderClosed({ view: { type: 'goal' } })
    const button = findByType(tree, 'button')
    expect(button?.props.children).toBe(SHARE_BUTTON_LABEL)
    expect(SHARE_BUTTON_LABEL).toBe('継続をシェア')
    expect(button?.props['aria-label']).toBe(SHARE_BUTTON_LABEL)
  })

  it('label プロップで上書きできる', () => {
    const tree = renderClosed({ view: { type: 'goal' }, label: '別ラベル' })
    const button = findByType(tree, 'button')
    expect(button?.props.children).toBe('別ラベル')
    expect(button?.props['aria-label']).toBe('別ラベル')
  })

  it('クリックでコピーしモーダルを開くが、Substack は自動で開かない', async () => {
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

    const tree = renderClosed({ view: { type: 'daily' } })
    const button = findByType(tree, 'button')
    const onClick = button?.props.onClick as () => Promise<void>

    await onClick()

    // コピーは発生するが Substack は開かない（モーダルで明示確認を挟む）
    expect(order).toEqual(['copy'])
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://keep-substack.com/daily')
    )
    expect(open).not.toHaveBeenCalled()
    // setIsOpen(true) が呼ばれている（state 順: isOpen, copied, shareText）
    expect(setters[0]).toHaveBeenCalledWith(true)
  })

  it('コピー成功時、開いたモーダルは成功メッセージと共有テキストを表示する', () => {
    const text = 'Substack継続を頑張っています📈 #KeepSubstack\nhttps://keep-substack.com/daily'
    const tree = renderOpen({ view: { type: 'daily' } }, true, text)

    const dialog = findByType(tree, 'div')
    const dialogEls = findAll(tree, (el) => el.props['role'] === 'dialog')
    expect(dialogEls.length).toBe(1)
    expect(dialogEls[0].props['aria-modal']).toBe('true')
    expect(dialogEls[0].props['aria-labelledby']).toBe('share-modal-title')

    // 成功メッセージ
    const successLine = findAll(
      tree,
      (el) => el.type === 'p' && el.props.children === '✅ 共有テキストをコピーしました'
    )
    expect(successLine.length).toBe(1)

    // 共有テキストを表示する readonly textarea
    const textarea = findByType(tree, 'textarea')
    expect(textarea?.props.readOnly).toBe(true)
    expect(textarea?.props.value).toBe(text)

    // 主ボタンは window.open を呼ぶ
    const openButton = findButtonByLabel(tree, 'Substackでノートを開く →')
    expect(openButton).not.toBeNull()

    // dialog にフォーカス可能な属性
    expect(dialog).not.toBeNull()
  })

  it('モーダルの主ボタンは window.open(_blank, noopener) を呼ぶ', () => {
    const open = vi.fn(() => null)
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open,
    })
    const tree = renderOpen({ view: { type: 'goal' } }, true, 'text')
    const openButton = findButtonByLabel(tree, 'Substackでノートを開く →')
    const onClick = openButton?.props.onClick as () => void
    onClick()
    expect(open).toHaveBeenCalledWith(SHARE_NOTES_URL, '_blank', 'noopener')
  })

  it('再コピーボタンはクリップボードへ再コピーする', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const text = 'Substack継続を頑張っています📈 #KeepSubstack\nhttps://keep-substack.com/'
    const tree = renderOpen({ view: { type: 'goal' } }, true, text)
    const recopy = findButtonByLabel(tree, '再コピー')
    const onClick = recopy?.props.onClick as () => Promise<void>
    await onClick()
    expect(writeText).toHaveBeenCalledWith(text)
  })

  it('コピー失敗時もモーダルは開き、手動コピー誘導を出しつつ Substack を開ける', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    const open = vi.fn(() => null)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open,
    })

    // クリックでコピー失敗 → setCopied(false), setIsOpen(true)
    const closed = renderClosed({ view: { type: 'goal' } })
    const button = findByType(closed, 'button')
    await (button?.props.onClick as () => Promise<void>)()
    // state 順: setters[0]=setIsOpen, setters[1]=setCopied, setters[2]=setShareText
    expect(setters[0]).toHaveBeenCalledWith(true)
    expect(setters[1]).toHaveBeenCalledWith(false)

    // 失敗状態で開いたモーダルは「成功」と主張せず手動コピーを促す
    const text = 'Substack継続を頑張っています📈 #KeepSubstack\nhttps://keep-substack.com/'
    const tree = renderOpen({ view: { type: 'goal' } }, false, text)
    const manualLine = findAll(
      tree,
      (el) => el.type === 'p' && el.props.children === '下のテキストをコピーしてください'
    )
    expect(manualLine.length).toBe(1)
    const successLine = findAll(
      tree,
      (el) => el.type === 'p' && el.props.children === '✅ 共有テキストをコピーしました'
    )
    expect(successLine.length).toBe(0)

    // それでも Substack は開ける
    const openButton = findButtonByLabel(tree, 'Substackでノートを開く →')
    ;(openButton?.props.onClick as () => void)()
    expect(open).toHaveBeenCalledWith(SHARE_NOTES_URL, '_blank', 'noopener')
  })
})
