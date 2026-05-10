'use client'

import { IconEyeCheck, IconClockPlus, IconCardsFilled } from '@tabler/icons-react'

type PowerupType = 'var' | 'prorroga' | 'roja'

interface PowerupTileProps {
  type: PowerupType
  used: boolean
  onClick: () => void
  disabled: boolean
}

const CONFIG: Record<PowerupType, {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  bg: string
  border: string
  iconColor: string
  labelColor: string
}> = {
  var: {
    icon: IconEyeCheck,
    label: 'VAR',
    bg: 'rgba(148,116,246,0.06)',
    border: 'rgba(148,116,246,0.18)',
    iconColor: '#9474F6',
    labelColor: 'rgba(222,216,250,0.85)',
  },
  prorroga: {
    icon: IconClockPlus,
    label: 'Prórroga',
    bg: 'rgba(148,116,246,0.06)',
    border: 'rgba(148,116,246,0.18)',
    iconColor: '#9474F6',
    labelColor: 'rgba(222,216,250,0.85)',
  },
  // The only red element in the entire UI
  roja: {
    icon: IconCardsFilled,
    label: 'Roja',
    bg: 'rgba(220,53,69,0.10)',
    border: 'rgba(220,53,69,0.25)',
    iconColor: '#F1F1F1',
    labelColor: '#F1F1F1',
  },
}

export default function PowerupTile({ type, used, onClick, disabled }: PowerupTileProps) {
  const cfg = CONFIG[type]
  const Icon = cfg.icon

  return (
    <button
      type="button"
      onClick={used || disabled ? undefined : onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        padding: '8px 4px',
        borderRadius: '10px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        cursor: used || disabled ? 'default' : 'pointer',
        opacity: used ? 0.3 : 1,
        transition: 'opacity 0.2s ease',
        flex: 1,
      }}
    >
      <Icon size={16} color={cfg.iconColor} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.85,
          color: cfg.labelColor,
          lineHeight: 1,
        }}
      >
        {cfg.label}
      </span>
    </button>
  )
}
