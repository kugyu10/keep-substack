'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateCommitSlotsAction } from './actions'

const DAY_LABELS: Record<number, string> = {
  1: '月曜', 2: '火曜', 3: '水曜', 4: '木曜', 5: '金曜', 6: '土曜', 7: '日曜',
}

interface Slot {
  day_of_week: number
  hour: number
}

interface CommitScheduleModalProps {
  initialSlots: { id: number; day_of_week: number; hour: number }[]
}

function formatSummary(slots: Slot[]): string {
  const parts = slots.map(s => `${DAY_LABELS[s.day_of_week]} ${s.hour}:00`)
  return `週${slots.length}回 — ${parts.join('、')}`
}

function hasDuplicateDays(slots: Slot[]): boolean {
  const days = slots.map(s => s.day_of_week)
  return days.length !== new Set(days).size
}

function makeDefaultSlots(count: number): Slot[] {
  return Array.from({ length: count }, () => ({ day_of_week: 1, hour: 8 }))
}

export default function CommitScheduleModal({ initialSlots }: CommitScheduleModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [frequency, setFrequency] = useState(initialSlots.length || 1)
  const [slots, setSlots] = useState<Slot[]>(
    initialSlots.length > 0
      ? initialSlots.map(s => ({ day_of_week: s.day_of_week, hour: s.hour }))
      : makeDefaultSlots(1)
  )
  const [savedSlots, setSavedSlots] = useState<Slot[]>(
    initialSlots.map(s => ({ day_of_week: s.day_of_week, hour: s.hour }))
  )

  const [state, action, isPending] = useActionState(updateCommitSlotsAction, null)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (state === null && !isPending) {
      setSavedSlots([...slots])
      setIsOpen(false)
    }
  }, [state, isPending])

  const triggerRef = useRef<HTMLButtonElement | HTMLSpanElement | null>(null)
  const firstInputRef = useRef<HTMLSelectElement>(null)

  function openModal() {
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
    ;(triggerRef.current as HTMLElement | null)?.focus()
  }

  function handleFrequencyChange(n: number) {
    setFrequency(n)
    setSlots(prev => {
      if (n > prev.length) {
        return [...prev, ...makeDefaultSlots(n - prev.length)]
      }
      return prev.slice(0, n)
    })
  }

  function updateSlot(index: number, field: keyof Slot, value: number) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  useEffect(() => {
    if (isOpen) {
      firstInputRef.current?.focus()
    }
  }, [isOpen])

  const showDuplicateWarning = hasDuplicateDays(slots)

  if (!isOpen) {
    if (savedSlots.length === 0) {
      return (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          onClick={openModal}
          className="border rounded px-4 py-2 text-sm font-semibold border-[#d8d8d8] text-[#363737]"
        >
          投稿スケジュールを宣言する
        </button>
      )
    }
    return (
      <span
        ref={triggerRef as React.RefObject<HTMLSpanElement>}
        onClick={openModal}
        className="text-sm text-[#363737] cursor-pointer underline"
      >
        {formatSummary(savedSlots)}
      </span>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-schedule-modal-title"
        onKeyDown={(e) => { if (e.key === 'Escape') closeModal() }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#fafafa] rounded shadow-xl w-full max-w-sm mx-4 p-6 relative"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="commit-schedule-modal-title" className="text-lg font-semibold">
            投稿スケジュールを宣言
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={closeModal}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form action={action}>
          <div className="mb-4">
            <label htmlFor="frequency" className="block text-sm font-semibold mb-1">
              週の投稿回数
            </label>
            <select
              id="frequency"
              ref={firstInputRef}
              value={frequency}
              onChange={(e) => handleFrequencyChange(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm w-full"
            >
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {slots.map((slot, i) => (
            <div key={i} className="mb-3">
              <p className="text-xs text-gray-500 mb-1">スロット {i + 1}</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor={`day-${i}`} className="block text-sm font-semibold mb-1">
                    曜日
                  </label>
                  <select
                    id={`day-${i}`}
                    value={slot.day_of_week}
                    onChange={(e) => updateSlot(i, 'day_of_week', Number(e.target.value))}
                    className="border rounded px-3 py-2 text-sm flex-1 w-full"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <option key={d} value={d}>{DAY_LABELS[d]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`hour-${i}`} className="block text-sm font-semibold mb-1">
                    時刻
                  </label>
                  <select
                    id={`hour-${i}`}
                    value={slot.hour}
                    onChange={(e) => updateSlot(i, 'hour', Number(e.target.value))}
                    className="border rounded px-3 py-2 text-sm w-24"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {showDuplicateWarning && (
            <p className="text-xs text-red-600 mb-2">同じ曜日を複数選択しています</p>
          )}

          <input type="hidden" name="slots" value={JSON.stringify(slots)} />

          {state && (
            <p role="alert" className="text-sm text-red-600 mb-2">{state}</p>
          )}

          <button
            type="submit"
            disabled={isPending || showDuplicateWarning}
            className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? '宣言中...' : '宣言する'}
          </button>
        </form>
      </div>
    </div>
  )
}
