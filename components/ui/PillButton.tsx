'use client'

import { IconArrowUpRight } from '@tabler/icons-react'

interface PillButtonProps {
  variant?: 'primary' | 'secondary' | 'dark'
  arrow?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

const VARIANTS = {
  primary: {
    background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)',
    color: '#F1F1F1',
    border: '1px solid rgba(255,255,255,0.1)',
    arrowBg: '#F1F1F1',
    arrowColor: '#180E33',
  },
  secondary: {
    background: 'transparent',
    color: '#9474F6',
    border: '1px solid rgba(91,42,243,0.5)',
    arrowBg: 'rgba(91,42,243,0.15)',
    arrowColor: '#9474F6',
  },
  dark: {
    background: '#180E33',
    color: '#67D7A8',
    border: '1px solid rgba(103,215,168,0.25)',
    arrowBg: 'rgba(103,215,168,0.15)',
    arrowColor: '#67D7A8',
  },
}

export default function PillButton({
  variant = 'primary',
  arrow = false,
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: PillButtonProps) {
  const v = VARIANTS[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: arrow ? 'space-between' : 'center',
        gap: '8px',
        padding: '13px 16px',
        borderRadius: '9999px',
        background: v.background,
        color: v.color,
        border: v.border,
        fontFamily: 'var(--font-body)',
        fontWeight: 800,
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
        width: '100%',
      }}
    >
      <span>{children}</span>
      {arrow && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '9999px',
            background: v.arrowBg,
            color: v.arrowColor,
            flexShrink: 0,
          }}
        >
          <IconArrowUpRight size={13} />
        </span>
      )}
    </button>
  )
}
