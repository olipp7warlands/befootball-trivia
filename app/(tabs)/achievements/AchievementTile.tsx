'use client'

import {
  IconFlame,
  IconBolt,
  IconTargetArrow,
  IconHistory,
  IconShieldCheck,
  IconWorld,
  IconCrown,
  IconCheck,
  IconLock,
} from '@tabler/icons-react'
import type { Achievement, AchievementRarity } from '@/lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  flame:         IconFlame,
  bolt:          IconBolt,
  'target-arrow': IconTargetArrow,
  history:       IconHistory,
  'shield-check': IconShieldCheck,
  world:         IconWorld,
  crown:         IconCrown,
}

const RARITY_BADGE: Record<AchievementRarity, { label: string; className: string }> = {
  common:    { label: 'Común',      className: 'text-white/50 border-white/20' },
  rare:      { label: 'Raro',       className: 'text-lavender border-lavender/30' },
  legendary: { label: 'Legendario', className: 'border-turquoise/30' },
}

interface AchievementTileProps {
  achievement: Achievement
  unlocked: boolean
  progress?: number // 0–100, only shown when in-progress
  unlockedAt?: string | null
}

export default function AchievementTile({
  achievement,
  unlocked,
  progress,
  unlockedAt,
}: AchievementTileProps) {
  const IconComponent = ICON_MAP[achievement.icon] ?? IconBolt
  const inProgress = !unlocked && progress !== undefined && progress > 0
  const rarity = RARITY_BADGE[achievement.rarity]

  const containerClass = unlocked
    ? 'border-turquoise/40 bg-turquoise/10'
    : inProgress
    ? 'border-lavender/30 bg-intense-violet/20'
    : 'border-gray-700 bg-bf-black/40'

  const iconClass = unlocked
    ? 'text-turquoise'
    : inProgress
    ? 'text-lavender'
    : 'text-white/20'

  return (
    <div className={`relative flex flex-col gap-3 rounded-2xl border p-4 ${containerClass}`}>
      {/* Top-right badge */}
      {unlocked ? (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-turquoise">
          <IconCheck size={12} className="text-deep-purple" />
        </span>
      ) : (
        !inProgress && (
          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            <IconLock size={11} className="text-white/30" />
          </span>
        )
      )}

      {/* Icon */}
      <IconComponent size={28} className={iconClass} />

      {/* Name + description */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-white leading-tight">{achievement.name}</span>
        <span className="text-xs text-white/50 leading-snug">{achievement.description}</span>
      </div>

      {/* Rarity badge */}
      <span
        className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rarity.className}`}
        style={
          achievement.rarity === 'legendary'
            ? {
                background: 'linear-gradient(90deg, #67D7A8, #5B2AF3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }
            : undefined
        }
      >
        {rarity.label}
      </span>

      {/* Progress bar (in-progress only) */}
      {inProgress && progress !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #5B2AF3, #9474F6)',
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      {/* Unlock date */}
      {unlocked && unlockedAt && (
        <span
          className="text-[10px] tabular-nums text-turquoise/60"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {new Date(unlockedAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      )}
    </div>
  )
}
