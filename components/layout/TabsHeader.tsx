'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IconUser, IconSettings, IconLogout } from '@tabler/icons-react'
import { Avatar, DivisionPill } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { Division } from '@/lib/types'

interface Props {
  username: string
  cardSeed: number
  division: Division
}

export function TabsHeader({ username, cardSeed, division }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = username.slice(0, 2).toUpperCase()

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 10px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: '14px',
          color: '#F1F1F1',
          letterSpacing: '-0.02em',
        }}
      >
        BEFOOTBALL
      </span>

      <div style={{ position: 'relative' }} ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '4px',
          }}
          aria-label="Menú de usuario"
        >
          <DivisionPill division={division} variant="inverse" />
          <Avatar cardSeed={cardSeed} initials={initials} size={28} />
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '180px',
              background: '#180E33',
              border: '1px solid rgba(148,116,246,0.2)',
              borderRadius: '12px',
              padding: '8px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          >
            {[
              {
                icon: IconUser,
                label: 'Mi perfil',
                color: '#DED8FA',
                onClick: () => { router.push('/profile'); setOpen(false) },
              },
              {
                icon: IconSettings,
                label: 'Configuración',
                color: 'rgba(222,216,250,0.35)',
                onClick: () => setOpen(false),
              },
            ].map(({ icon: Icon, label, color, onClick }) => (
              <MenuItem key={label} icon={<Icon size={14} />} label={label} color={color} onClick={onClick} />
            ))}

            <div
              style={{
                height: '1px',
                background: 'rgba(148,116,246,0.15)',
                margin: '4px 4px',
              }}
            />

            <MenuItem
              icon={<IconLogout size={14} />}
              label="Cerrar sesión"
              color="rgba(248,113,113,0.9)"
              onClick={handleLogout}
            />
          </div>
        )}
      </div>
    </header>
  )
}

function MenuItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: 'none',
        background: hover ? 'rgba(148,116,246,0.08)' : 'transparent',
        color,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: '11.5px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s ease',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
