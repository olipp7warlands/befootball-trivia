'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { IconArrowUpRight } from '@tabler/icons-react'
import { signInWithEmail } from '@/app/actions/auth'
import { CrystalCard, Avatar } from '@/components/ui'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

const PALETTES: { from: string; to: string; label: string }[] = [
  { from: '#9474F6', to: '#5B2AF3', label: 'Violeta' },
  { from: '#67D7A8', to: '#2a8c66', label: 'Turquesa' },
  { from: '#ff9f43', to: '#f1502f', label: 'Coral' },
  { from: '#DED8FA', to: '#9474F6', label: 'Lavanda' },
  { from: '#5B2AF3', to: '#180E33', label: 'Índigo' },
  { from: '#67D7A8', to: '#5B2AF3', label: 'Aurora' },
]

function usernameHint(val: string): { text: string; ok: boolean } | null {
  if (!val) return null
  if (val.length < 3) return { text: 'Mínimo 3 caracteres', ok: false }
  if (val.length > 20) return { text: 'Máximo 20 caracteres', ok: false }
  if (!USERNAME_RE.test(val)) return { text: 'Solo letras, números y _', ok: false }
  return { text: 'Nombre disponible ✓', ok: true }
}

export function OnboardingForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const country = searchParams.get('country') ?? 'ES'
  const name = searchParams.get('name') ?? ''

  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState('')
  const [cardSeed, setCardSeed] = useState(0)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hint = usernameHint(username)
  const canSubmit = hint?.ok === true && !isPending

  const initials = username ? username.slice(0, 2).toUpperCase() : (name ? name.slice(0, 2).toUpperCase() : 'BF')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await signInWithEmail(email, { username, cardSeed, countryCode: country })
      if (!result.success) {
        setError(result.error ?? 'Error enviando el email. Inténtalo de nuevo.')
        return
      }
      setSent(true)
    })
  }

  // ── "Check your email" screen ──────────────────────────────────────────
  if (sent) {
    return (
      <div
        style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px', textAlign: 'center',
          background: [
            'radial-gradient(ellipse 60% 40% at 15% 10%, rgba(91,42,243,0.45) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 35% at 90% 90%, rgba(148,116,246,0.30) 0%, transparent 60%)',
            '#0a0420',
          ].join(', '),
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
        <h2
          style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontWeight: 900, fontSize: '22px', color: '#F1F1F1',
            letterSpacing: '-0.02em', marginBottom: '10px',
          }}
        >
          Revisa tu <span style={{ color: '#67D7A8' }}>email</span>
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(222,216,250,0.7)', lineHeight: 1.5, maxWidth: '280px' }}>
          Enviamos un enlace mágico a <strong style={{ color: '#DED8FA' }}>{email}</strong>.
          Haz clic en él para entrar al campo.
        </p>
        <p style={{ marginTop: '24px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(222,216,250,0.35)', letterSpacing: '0.08em' }}>
          El enlace expira en 1 hora · Revisa la carpeta de spam
        </p>
      </div>
    )
  }

  // ── Main onboarding form ───────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100dvh', position: 'relative', overflow: 'hidden',
        background: [
          'radial-gradient(ellipse 60% 40% at 15% 10%, rgba(91,42,243,0.45) 0%, transparent 60%)',
          'radial-gradient(ellipse 50% 35% at 90% 90%, rgba(148,116,246,0.30) 0%, transparent 60%)',
          '#0a0420',
        ].join(', '),
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', zIndex: 1,
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          padding: '24px 20px 16px', maxWidth: '420px', margin: '0 auto',
        }}
      >
        {/* Eyebrow */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          — ELIGE TU IDENTIDAD
        </p>

        {/* Hero */}
        <h1
          style={{
            marginTop: '6px',
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontWeight: 900, fontSize: '26px',
            lineHeight: 0.96, letterSpacing: '-0.025em', color: '#F1F1F1',
          }}
        >
          Tu nombre
          <br />en el <span style={{ color: '#67D7A8' }}>campo</span>
        </h1>

        <p style={{ marginTop: '8px', fontSize: '11px', color: '#DED8FA', opacity: 0.65, lineHeight: 1.4 }}>
          Este apodo es tu identidad en la liga. Elige bien.
        </p>

        {/* Mini card preview */}
        <div style={{ marginTop: '18px', maxWidth: '200px' }}>
          <CrystalCard seed={cardSeed} aspectRatio="3/2">
            <div
              style={{
                padding: '10px 12px', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                color: '#180E33',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontStyle: 'italic',
                  fontWeight: 900, fontSize: '9px', letterSpacing: '-0.01em',
                }}
              >
                BEFOOTBALL
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    fontWeight: 900, fontSize: '16px',
                    letterSpacing: '-0.03em', lineHeight: 0.95, color: '#180E33',
                  }}
                >
                  {username || name || 'Tu nombre'}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '7px',
                    opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase',
                    marginTop: '2px',
                  }}
                >
                  {country} · #1000 ELO
                </p>
              </div>
            </div>
          </CrystalCard>
        </div>

        {/* Username input */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(222,216,250,0.12)',
              borderRadius: '10px', padding: '11px 12px',
            }}
          >
            <Avatar cardSeed={cardSeed} initials={initials} size={24} />
            <input
              type="text"
              placeholder="tu_nombre_aqui"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: '11px', color: '#DED8FA',
                fontFamily: 'var(--font-mono)', minWidth: 0,
              }}
            />
          </label>
          {hint && (
            <p
              style={{
                paddingLeft: '4px', fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: hint.ok ? '#67D7A8' : '#dc3545',
              }}
            >
              {hint.text}
            </p>
          )}
        </div>

        {/* Avatar seed picker */}
        <div style={{ marginTop: '16px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '8.5px',
              color: 'rgba(222,216,250,0.5)', letterSpacing: '0.14em',
              textTransform: 'uppercase', marginBottom: '10px',
            }}
          >
            — COLOR DE CARNET
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PALETTES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCardSeed(idx)}
                aria-label={p.label}
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
                  border: cardSeed === idx
                    ? '2.5px solid #F1F1F1'
                    : '2px solid rgba(241,241,241,0.15)',
                  cursor: 'pointer',
                  transform: cardSeed === idx ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border 0.15s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p
            style={{
              marginTop: '12px', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(220,53,69,0.3)',
              background: 'rgba(220,53,69,0.1)',
              fontSize: '11px', color: '#dc3545', fontFamily: 'var(--font-mono)',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '8px', padding: '13px 16px', borderRadius: '9999px',
            background: canSubmit
              ? 'linear-gradient(180deg, #6d3df5, #5B2AF3)'
              : 'rgba(91,42,243,0.3)',
            color: '#F1F1F1', border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'var(--font-body)', fontWeight: 800,
            fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.15s ease',
          }}
        >
          <span>{isPending ? 'Enviando enlace...' : 'Entrar al campo'}</span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '9999px',
              background: '#F1F1F1', color: '#180E33', flexShrink: 0,
            }}
          >
            <IconArrowUpRight size={13} />
          </span>
        </button>

        <p
          style={{
            marginTop: '8px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '8px',
            color: 'rgba(222,216,250,0.35)',
          }}
        >
          Recibirás un enlace por email · Sin contraseña
        </p>
      </form>
    </div>
  )
}
