import type { Division } from '@/lib/types'

const ICONS: Record<Division, string> = {
  bronze: '●',
  silver: '●',
  gold: '●',
  diamond: '◆',
  elite: '★',
}

const LABELS: Record<Division, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante',
  elite: 'Élite',
}

interface DivisionPillProps {
  division: Division
  tier?: 'I' | 'II' | 'III'
  variant?: 'standard' | 'inverse'
}

export default function DivisionPill({
  division,
  tier,
  variant = 'standard',
}: DivisionPillProps) {
  const isInverse = variant === 'inverse'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '9999px',
        background: isInverse ? 'rgba(103,215,168,0.10)' : '#180E33',
        color: '#67D7A8',
        border: isInverse ? '1px solid rgba(103,215,168,0.25)' : 'none',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '8px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {ICONS[division]} {LABELS[division]}{tier ? ` ${tier}` : ''}
    </span>
  )
}
