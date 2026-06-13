import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'

// 共有テキスト組み立ては share.ts 側で検証済み。ここではキャプションと
// クリック時の順序（BUG1 / BUG2）に集中する。
//
// ShareButton は useState/useRef/useEffect を使うクライアントコンポーネント。
// このリポジトリの component テストは「コンポーネントを純関数として呼び、返る
// React 要素ツリーを走査する」方式のため、React のフックをスタブして同期的に
// 要素ツリーを得られるようにする（DOM レンダラは使わない）。
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: (init: unknown) => [init, vi.fn()],
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
function findByType(node: unknown, type: string): AnyEl | null {
  if (!isElement(node)) return null
  if (node.type === type) return node
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    const found = findByType(child, type)
    if (found) return found
  }
  return null
}

describe('ShareButton', () => {
  beforeEach(() => {
    // 純 Node 環境（jsdom 不使用）。handler が参照する window/navigator を最小限スタブ。
    vi.stubGlobal('window', {
      location: { origin: 'https://keep-substack.com' },
      open: vi.fn(),
    })
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('BUG1: 既定キャプションは「継続をシェア」で aria-label も一致する', () => {
    const tree = ShareButton({ view: { type: 'goal' } }) as unknown
    const button = findByType(tree, 'button')
    expect(button).not.toBeNull()
    expect(button?.props.children).toBe(SHARE_BUTTON_LABEL)
    expect(SHARE_BUTTON_LABEL).toBe('継続をシェア')
    expect(button?.props['aria-label']).toBe(SHARE_BUTTON_LABEL)
  })

  it('label プロップで上書きできる', () => {
    const tree = ShareButton({ view: { type: 'goal' }, label: '別ラベル' }) as unknown
    const button = findByType(tree, 'button')
    expect(button?.props.children).toBe('別ラベル')
    expect(button?.props['aria-label']).toBe('別ラベル')
  })

  it('BUG2: クリックで clipboard.writeText を await してから Notes を開く', async () => {
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

    const tree = ShareButton({ view: { type: 'daily' } }) as unknown
    const button = findByType(tree, 'button')
    const onClick = button?.props.onClick as () => Promise<void>

    await onClick()

    // コピーが先、open が後（"先にタブが開いてフォーカスを失う" 退行の防止）
    expect(order).toEqual(['copy', 'open'])
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://keep-substack.com/daily')
    )
    expect(open).toHaveBeenCalledWith(
      SHARE_NOTES_URL,
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('BUG2: clipboard 失敗時も Notes は開く（導線を止めない）', async () => {
    const order: string[] = []
    const writeText = vi.fn(async () => {
      order.push('copy-fail')
      throw new Error('denied')
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

    const tree = ShareButton({ view: { type: 'goal' } }) as unknown
    const button = findByType(tree, 'button')
    const onClick = button?.props.onClick as () => Promise<void>

    await onClick()

    expect(order).toEqual(['copy-fail', 'open'])
    expect(open).toHaveBeenCalledTimes(1)
  })
})
