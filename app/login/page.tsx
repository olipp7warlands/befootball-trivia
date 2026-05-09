'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconMail, IconArrowLeft } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { PillButton } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotFound(false)
    startTransition(async () => {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      })

      if (otpError) {
        const msg = otpError.message.toLowerCase()
        const isRateLimit = otpError.status === 429 || msg.includes('rate limit') || msg.includes('over_email')
        const isNotFound = msg.includes('not found') || msg.includes('no user') || otpError.status === 400

        if (isRateLimit) {
          setError('Demasiados intentos. Espera unos minutos.')
          return
        }
        if (isNotFound) {
          setNotFound(true)
          return
        }
        setError('No pudimos enviar el enlace. Inténtalo de nuevo.')
        return
      }

      router.push(`/auth/check-email?mode=login&email=${encodeURIComponent(email)}`)
    })
  }

  return (
    <ScreenContainer>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 20px 16px',
        }}
      >
        {/* Back button */}
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'rgba(222,216,250,0.5)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '32px',
            transition: 'color 0.15s ease',
          }}
        >
          <IconArrowLeft size={14} />
          Volver
        </a>

        {/* Eyebrow */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>
          — TU CUENTA
        </p>

        {/* Hero */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '30px', lineHeight: 0.96, letterSpacing: '-0.025em', color: '#F1F1F1', marginBottom: '12px' }}>
          Vuelve a
          <br />la liga.
        </h1>

        {/* Sub */}
        <p style={{ fontSize: '11.5px', color: '#DED8FA', opacity: 0.75, lineHeight: 1.5, marginBottom: '28px' }}>
          Introduce el email de tu cuenta y te enviaremos el enlace para entrar.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${focused ? '#5B2AF3' : 'rgba(222,216,250,0.12)'}`,
              borderRadius: '10px',
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'border 0.15s ease',
              ...(focused ? { background: 'rgba(91,42,243,0.10)' } : {}),
            }}
          >
            <IconMail size={14} color="rgba(222,216,250,0.5)" />
            <input
              type="email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setNotFound(false) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '11px',
                color: '#DED8FA',
                fontFamily: 'var(--font-body)',
                minWidth: 0,
              }}
            />
          </label>

          {error && (
            <p style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.1)', fontSize: '11px', color: '#dc3545', fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}

          {notFound && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(148,116,246,0.25)', background: 'rgba(148,116,246,0.08)', fontSize: '11px', color: '#DED8FA', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
              No encontramos esa cuenta.{' '}
              <a href="/" style={{ color: '#67D7A8', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                ¿Necesitas registrarte?
              </a>
            </div>
          )}

          <div style={{ marginTop: '4px' }}>
            <PillButton type="submit" variant="primary" arrow disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar enlace'}
            </PillButton>
          </div>
        </form>

        <p style={{ marginTop: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(222,216,250,0.35)' }}>
          Recibirás un enlace mágico · Sin contraseña
        </p>
      </div>
    </ScreenContainer>
  )
}
