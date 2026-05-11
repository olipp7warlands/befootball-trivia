'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconUser, IconMail, IconChevronDown, IconArrowRight } from '@tabler/icons-react'
import { submitLead } from '@/app/actions/leads'
import { Flag, BetaBadge, PillButton, Avatar } from '@/components/ui'
import { ScreenContainer } from '@/components/layout/ScreenContainer'

const FIFA_COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'BR', name: 'Brasil' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ENG', name: 'Inglaterra' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'SN', name: 'Senegal' },
  { code: 'NG', name: 'Nigeria' },
]

const FIELD_BASE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(222,216,250,0.12)',
  borderRadius: '10px',
  padding: '11px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'border 0.15s ease, background 0.15s ease',
}

const FIELD_FOCUS: React.CSSProperties = {
  border: '1px solid #5B2AF3',
  background: 'rgba(91,42,243,0.10)',
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  flex: 1,
  fontSize: '11px',
  color: '#DED8FA',
  fontFamily: 'var(--font-body)',
  minWidth: 0,
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('return_to') ?? ''

  const isInvited = returnTo.startsWith('/match/')
  const matchId = isInvited ? returnTo.split('/')[2] : null

  const [inviterInfo, setInviterInfo] = useState<{ username: string; country_code: string; card_seed: number } | null>(null)

  useEffect(() => {
    if (!matchId) return
    fetch(`/api/match/${matchId}/inviter-info`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.inviter ? setInviterInfo(d.inviter) : null)
      .catch(() => null)
  }, [matchId])

  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('ES')
  const [focused, setFocused] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitLead({ name, email, country_code: country })
      if (!result.success) {
        setError(result.error ?? 'Algo salió mal.')
        return
      }
      const params = new URLSearchParams({ email, name, country })
      if (returnTo) params.set('return_to', returnTo)
      router.push(`/onboarding?${params}`)
    })
  }

  useEffect(() => {
    router.prefetch('/login')
    router.prefetch('/onboarding')
  }, [router])

  const selectedCountry = FIFA_COUNTRIES.find((c) => c.code === country)!

  return (
    <ScreenContainer>
      {/* Crystal blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -40, right: -60,
          width: 220, height: 220,
          borderRadius: '50%',
          background: 'conic-gradient(from 200deg, #5B2AF3, #9474F6, #DED8FA, #67D7A8, #5B2AF3)',
          filter: 'blur(60px)',
          opacity: 0.55,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', zIndex: 1,
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          padding: '24px 20px 16px',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.02em', color: '#F1F1F1' }}>
            BEFOOTBALL
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BetaBadge />
            <a
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '11px',
                color: 'rgba(222,216,250,0.7)',
                letterSpacing: '0.04em',
                textDecoration: 'none',
                transition: 'color 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#67D7A8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(222,216,250,0.7)')}
            >
              Iniciar sesión
              <IconArrowRight size={11} />
            </a>
          </div>
        </div>

        {/* Eyebrow */}
        <p style={{ marginTop: '26px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {inviterInfo ? '— TIENES UN RETO' : '— LIGA GLOBAL · 1930-2026'}
        </p>

        {/* Invited: inviter avatar + name */}
        {inviterInfo && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar cardSeed={inviterInfo.card_seed} initials={inviterInfo.username.slice(0, 2).toUpperCase()} size={44} />
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(222,216,250,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {inviterInfo.country_code} · Te desafía
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '18px', color: '#F1F1F1', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {inviterInfo.username}
              </p>
            </div>
          </div>
        )}

        {/* Hero */}
        <h1 style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: inviterInfo ? '24px' : '30px', lineHeight: 0.96, letterSpacing: '-0.025em', color: '#F1F1F1' }}>
          {inviterInfo
            ? <>{inviterInfo.username} <span style={{ color: '#67D7A8' }}>te reta.</span></>
            : <>Demuestra<br />cuánto sabes<br />de <span style={{ color: '#67D7A8' }}>Mundiales</span></>
          }
        </h1>

        {/* Sub-claim */}
        <p style={{ marginTop: '12px', fontSize: '11.5px', color: '#DED8FA', opacity: 0.75, lineHeight: 1.5 }}>
          {inviterInfo
            ? 'Demuestra cuánto sabes de Mundiales y dejá tu marca.'
            : 'Reta a fans de todo el mundo. Sube divisiones. Conviértete en élite del fútbol.'
          }
        </p>

        {/* Fields */}
        <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <label style={{ ...FIELD_BASE, ...(focused === 'name' ? FIELD_FOCUS : {}) }}>
            <IconUser size={14} color="rgba(222,216,250,0.5)" />
            <input type="text" placeholder="tu nombre o apodo" required minLength={2} value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
              style={INPUT_STYLE} />
          </label>

          <label style={{ ...FIELD_BASE, ...(focused === 'email' ? FIELD_FOCUS : {}) }}>
            <IconMail size={14} color="rgba(222,216,250,0.5)" />
            <input type="email" placeholder="email@ejemplo.com" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              style={INPUT_STYLE} />
          </label>

          <div style={{ position: 'relative' }}>
            <div style={{ ...FIELD_BASE, ...(focused === 'country' ? FIELD_FOCUS : {}) }}>
              <Flag code={country} size={14} />
              <span style={{ flex: 1, fontSize: '11px', color: '#DED8FA' }}>{selectedCountry.name}</span>
              <IconChevronDown size={14} color="rgba(222,216,250,0.4)" />
            </div>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              onFocus={() => setFocused('country')} onBlur={() => setFocused(null)}
              aria-label="País"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}>
              {FIFA_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          {error && (
            <p style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.1)', fontSize: '11px', color: '#dc3545', fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Primary CTA */}
        <PillButton type="submit" variant="primary" arrow disabled={isPending}>
          {isPending ? 'Enviando...' : 'Empezar a jugar'}
        </PillButton>

        <p style={{ marginTop: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(222,216,250,0.4)' }}>
          Al jugar aceptas términos y privacidad
        </p>
      </form>
    </ScreenContainer>
  )
}
