'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHome, IconTrophy, IconUser, IconMedal } from '@tabler/icons-react'

const links = [
  { href: '/lobby', icon: IconHome, label: 'Inicio' },
  { href: '/ranking', icon: IconTrophy, label: 'Ranking' },
  { href: '/achievements', icon: IconMedal, label: 'Logros' },
  { href: '/profile', icon: IconUser, label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(24,14,51,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(148,116,246,0.2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0',
        }}
      >
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: active ? '#9474F6' : 'rgba(241,241,241,0.4)',
                textDecoration: 'none',
                fontSize: '11px',
                padding: '4px 12px',
                fontFamily: 'var(--font-body)',
                transition: 'color 0.15s ease-out',
              }}
            >
              <Icon size={22} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
