'use client'

import { motion } from 'framer-motion'

export type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'eliminated'

interface OptionCardProps {
  letter: 'A' | 'B' | 'C' | 'D'
  text: string
  state: OptionState
  onClick: () => void
  disabled: boolean
}

const STYLES: Record<OptionState, { card: React.CSSProperties; pill: React.CSSProperties }> = {
  default: {
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(222,216,250,0.10)', color: '#DED8FA' },
    pill: { background: 'rgba(148,116,246,0.18)', color: '#9474F6' },
  },
  selected: {
    card: { background: 'rgba(91,42,243,0.15)', border: '1px solid #5B2AF3', color: '#DED8FA' },
    pill: { background: '#5B2AF3', color: '#F1F1F1' },
  },
  correct: {
    card: { background: 'rgba(103,215,168,0.12)', border: '1px solid rgba(103,215,168,0.5)', color: '#67D7A8' },
    pill: { background: '#67D7A8', color: '#0d0626' },
  },
  wrong: {
    card: { background: 'rgba(220,53,69,0.10)', border: '1px solid rgba(220,53,69,0.4)', color: '#dc3545' },
    pill: { background: '#dc3545', color: '#F1F1F1' },
  },
  eliminated: {
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(222,216,250,0.05)', color: 'rgba(222,216,250,0.3)', opacity: 0.3, pointerEvents: 'none', textDecoration: 'line-through' },
    pill: { background: 'rgba(148,116,246,0.08)', color: 'rgba(148,116,246,0.3)' },
  },
}

const ANIMATIONS: Partial<Record<OptionState, object>> = {
  correct: { scale: [1, 1.05, 1] },
  wrong: { x: [0, -4, 4, -2, 2, 0] },
}

export default function OptionCard({ letter, text, state, onClick, disabled }: OptionCardProps) {
  const s = STYLES[state]
  return (
    <motion.button
      type="button"
      onClick={disabled || state === 'eliminated' ? undefined : onClick}
      animate={ANIMATIONS[state] as any}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        cursor: disabled || state === 'eliminated' ? 'default' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '11.5px',
        fontWeight: 500,
        textAlign: 'left',
        transition: 'background 0.15s ease, border 0.15s ease',
        width: '100%',
        border: 'none',
        ...s.card,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '5px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: '10px',
          flexShrink: 0,
          ...s.pill,
        }}
      >
        {letter}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
    </motion.button>
  )
}
