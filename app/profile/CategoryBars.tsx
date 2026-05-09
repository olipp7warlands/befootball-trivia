'use client'

import { useEffect, useRef } from 'react'
import { CATEGORY_LABELS, type QuestionCategory } from '@/lib/types'

interface CategoryStat {
  category: QuestionCategory
  accuracy: number // 0–100
  total: number
}

interface CategoryBarsProps {
  stats: CategoryStat[]
}

export default function CategoryBars({ stats }: CategoryBarsProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    // Animate bars in on mount using requestAnimationFrame for smooth entry
    const timers: ReturnType<typeof setTimeout>[] = []
    barRefs.current.forEach((bar, i) => {
      if (!bar) return
      bar.style.width = '0%'
      const t = setTimeout(() => {
        if (bar) {
          bar.style.transition = 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
          bar.style.width = `${stats[i]?.accuracy ?? 0}%`
        }
      }, 80 + i * 60)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, [stats])

  if (stats.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-white/40">
        Juega algunas partidas para ver tus estadísticas por categoría.
      </p>
    )
  }

  const sorted = [...stats].sort((a, b) => b.accuracy - a.accuracy)

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((stat, i) => (
        <div key={stat.category} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/70">
              {CATEGORY_LABELS[stat.category]}
            </span>
            <span
              className="text-xs font-bold tabular-nums text-white/80"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {Math.round(stat.accuracy)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              ref={(el) => { barRefs.current[i] = el }}
              className="h-full rounded-full"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(90deg, #67D7A8, #5B2AF3)'
                    : 'linear-gradient(90deg, #5B2AF3, #9474F6)',
                width: '0%',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
