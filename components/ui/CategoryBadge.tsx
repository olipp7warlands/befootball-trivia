import {
  IconTrophy,
  IconBallFootball,
  IconWorld,
  IconBook2,
  IconMedal,
  IconHistory,
} from '@tabler/icons-react'

const CATEGORY_MAP: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
  finales:    { icon: IconTrophy,       label: 'Finales' },
  goleadores: { icon: IconBallFootball, label: 'Goleadores' },
  sedes:      { icon: IconWorld,        label: 'Sedes' },
  anecdotas:  { icon: IconBook2,        label: 'Anécdotas' },
  records:    { icon: IconMedal,        label: 'Récords' },
  decadas:    { icon: IconHistory,      label: 'Décadas' },
}

export default function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_MAP[category] ?? { icon: IconTrophy, label: category }
  const Icon = cfg.icon

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 9px',
        borderRadius: '9999px',
        background: 'rgba(103,215,168,0.10)',
        color: '#67D7A8',
        border: '1px solid rgba(103,215,168,0.25)',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        lineHeight: 1,
      }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}
