'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { IconMail } from '@tabler/icons-react'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { createClient } from '@/lib/supabase/client'

const COOLDOWN = 30

const COPY = {
  login: {
    eyebrow: '— Tu turno',
    title: 'Revisa tu email.',
    sub: 'Te enviamos un enlace para entrar a tu cuenta.',
  },
  signup: {
    eyebrow: '— Casi estás',
    title: 'Confirma tu email.',
    sub: 'Te enviamos un enlace para activar tu cuenta.',
  },
}

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') ?? 'signup') as 'login' | 'signup'
  const email = searchParams.get('email') ?? ''
  const copy = COPY[mode] ?? COPY.signup

  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [secondsLeft])

  async function handleResend() {
    if (secondsLeft > 0 || !email || loading) return
    setResendError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: mode === 'signup',
        },
      })
      if (error) {
        const isRate = error.status === 429 || error.message.toLowerCase().includes('rate limit')
        setResendError(isRate ? 'Demasiados intentos. Espera unos minutos.' : error.message)
        return
      }
      setResent(true)
      setSecondsLeft(COOLDOWN)
    } finally {
      setLoading(false)
    }
  }

  const canResend = secondsLeft === 0 && !loading

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(148,116,246,0.15)',
          border: '1px solid rgba(148,116,246,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <IconMail size={36} color="#9474F6" />
      </div>

      {/* Eyebrow */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {copy.eyebrow}
      </p>

      {/* Title */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '28px', color: '#F1F1F1', letterSpacing: '-0.02em', lineHeight: 1.0, marginBottom: '12px' }}>
        {copy.title}
      </h1>

      {/* Sub */}
      <p style={{ fontSize: '14px', color: '#DED8FA', opacity: 0.8, lineHeight: 1.5, maxWidth: '280px', marginBottom: email ? '6px' : '32px' }}>
        {copy.sub}
      </p>
      {email && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#F1F1F1', fontWeight: 700, marginBottom: '32px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
          {email}
        </p>
      )}

      {/* Resend button */}
      <button
        onClick={handleResend}
        disabled={!canResend}
        style={{
          padding: '11px 24px',
          borderRadius: '9999px',
          border: '1px solid',
          borderColor: canResend ? 'rgba(148,116,246,0.4)' : 'rgba(148,116,246,0.15)',
          background: canResend ? 'rgba(91,42,243,0.15)' : 'transparent',
          color: canResend ? '#9474F6' : 'rgba(222,216,250,0.3)',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '12px',
          cursor: canResend ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
          letterSpacing: '0.03em',
        }}
      >
        {loading ? 'Enviando...' : secondsLeft > 0 ? `Reenviar en ${secondsLeft}s` : 'Reenviar email'}
      </button>

      {resent && !resendError && (
        <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#67D7A8', letterSpacing: '0.06em' }}>
          ✓ Email reenviado
        </p>
      )}

      {resendError && (
        <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#dc3545' }}>
          {resendError}
        </p>
      )}

      <a
        href="/"
        style={{
          marginTop: '40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'rgba(222,216,250,0.35)',
          letterSpacing: '0.1em',
          textDecoration: 'none',
          textTransform: 'uppercase',
        }}
      >
        ← Volver al inicio
      </a>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <ScreenContainer>
      <Suspense fallback={null}>
        <CheckEmailContent />
      </Suspense>
    </ScreenContainer>
  )
}
