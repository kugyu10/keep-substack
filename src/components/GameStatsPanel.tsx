// Server Component — do NOT add 'use client'
import type { MemberGameStats } from '@/lib/types'

type GameStatsPanelProps = {
  stats: MemberGameStats
}

export default function GameStatsPanel({ stats }: GameStatsPanelProps) {
  const {
    level,
    xp,
    nextLevelXp,
    progressRatio,
    postCount,
    onTimeCount,
    achievedWeekCount,
    xpBreakdown,
    dailyStreak,
    weeklyStreak,
  } = stats

  const remainingXp = Math.max(0, nextLevelXp - xp)
  const progressPercent = Math.round(progressRatio * 100)

  return (
    <div className="border border-[#ebebeb] rounded-lg p-4 bg-white">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-primary">Lv {level}</span>
        <span className="text-sm text-gray-500">XP {xp}</span>
      </div>

      <div className="mb-4">
        <div
          className="h-2 rounded-full bg-gray-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="次のレベルまでの進捗"
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">次のレベルまで {remainingXp} XP</div>
      </div>

      <div className="text-xs text-gray-600 space-y-0.5 mb-4">
        <div>投稿 {postCount}件 × 10 = {xpBreakdown.post} XP</div>
        <div>オンタイム投稿 {onTimeCount}件 × 10 = {xpBreakdown.onTime} XP</div>
        <div>目標達成 {achievedWeekCount}週 × 30 = {xpBreakdown.achieved} XP</div>
      </div>

      <div className="flex gap-4 text-sm">
        <span>
          <span role="img" aria-label="連続投稿" className="text-sm leading-none">🔥</span>
          {' '}連続投稿 {dailyStreak > 0 ? `${dailyStreak}日` : '—'}
        </span>
        <span>
          <span role="img" aria-label="連続目標達成" className="text-sm leading-none">🔥</span>
          {' '}連続目標達成 {weeklyStreak > 0 ? `${weeklyStreak}週` : '—'}
        </span>
      </div>
    </div>
  )
}
