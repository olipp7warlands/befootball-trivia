'use client'

import { useState } from 'react'
import { IconCrown } from '@tabler/icons-react'
import AchievementTile from './AchievementTile'
import type { Achievement, UserAchievement } from '@/lib/types'

type TabId = 'all' | 'unlocked' | 'inprogress'

interface AchievementWithProgress {
  achievement: Achievement
  unlocked: boolean
  progress?: number
  unlockedAt?: string | null
}

interface AchievementTabsProps {
  items: AchievementWithProgress[]
  eliteAchievement: Achievement
  eliteUnlocked: boolean
  eliteProgress: number
  eliteUnlockedAt?: string | null
  totalCount: number
  unlockedCount: number
}

export default function AchievementTabs({
  items,
  eliteAchievement,
  eliteUnlocked,
  eliteProgress,
  eliteUnlockedAt,
  totalCount,
  unlockedCount,
}: AchievementTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all',        label: 'Todos' },
    { id: 'unlocked',   label: 'Desbloqueados' },
    { id: 'inprogress', label: 'En progreso' },
  ]

  function filteredItems(): AchievementWithProgress[] {
    // Exclude elite from the grid — it's the hero tile
    const withoutElite = items.filter((i) => i.achievement.id !== 'elite-befootball')
    if (activeTab === 'unlocked')   return withoutElite.filter((i) => i.unlocked)
    if (activeTab === 'inprogress') return withoutElite.filter((i) => !i.unlocked && (i.progress ?? 0) > 0)
    return withoutElite
  }

  const list = filteredItems()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-4xl font-black italic tracking-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          LOGROS
        </h1>
        <span
          className="text-lg font-bold tabular-nums text-lavender"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {unlockedCount} / {totalCount}
        </span>
      </div>

      {/* Hero tile — Élite Befootball */}
      <div
        className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${
          eliteUnlocked
            ? 'border-turquoise/40 bg-turquoise/10'
            : 'border-lavender/30 bg-intense-violet/10'
        }`}
      >
        <div className="flex items-start gap-4">
          <IconCrown
            size={36}
            className={eliteUnlocked ? 'text-turquoise' : 'text-lavender'}
          />
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-lg font-black italic text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {eliteAchievement.name}
            </span>
            <span className="text-xs text-white/60">{eliteAchievement.description}</span>
            <span
              className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border-turquoise/30`}
              style={{
                background: 'linear-gradient(90deg, #67D7A8, #5B2AF3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Legendario
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50">Progreso ELO</span>
            <span
              className="text-xs font-bold tabular-nums text-white/70"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {Math.round(eliteProgress)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                background: 'linear-gradient(90deg, #5B2AF3, #67D7A8)',
                width: `${eliteProgress}%`,
              }}
            />
          </div>
        </div>

        {eliteUnlocked && eliteUnlockedAt && (
          <p
            className="mt-2 text-[10px] tabular-nums text-turquoise/60"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Desbloqueado el{' '}
            {new Date(eliteUnlockedAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-intense-violet text-white shadow-lg'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {activeTab === 'unlocked'
            ? 'Aún no has desbloqueado ningún logro.'
            : 'No hay logros en progreso.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((item) => (
            <AchievementTile
              key={item.achievement.id}
              achievement={item.achievement}
              unlocked={item.unlocked}
              progress={item.progress}
              unlockedAt={item.unlockedAt}
            />
          ))}
        </div>
      )}
    </div>
  )
}
