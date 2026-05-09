'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from '@/app/actions/auth'
import type { User } from '@supabase/supabase-js'

type Phase = 'loading' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const done = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // Debug: log what arrived so we can diagnose flow type
    console.log('[callback] search:', window.location.search)
    console.log('[callback] hash:', window.location.hash ? window.location.hash.slice(0, 80) + '…' : '(empty)')

    // ── Detect hash-based error from Supabase ──
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const errCode = hashParams.get('error_code')
      if (errCode) {
        console.error('[callback] Supabase auth error:', errCode, hashParams.get('error_description'))
        setPhase('error')
        return
      }
    }

    async function finish(user: User) {
      if (done.current) return
      done.current = true

      // Returning user — go straight to lobby
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existing) {
        router.replace('/lobby')
        return
      }

      // New user — create profile from OTP metadata
      const meta = user.user_metadata ?? {}
      const username = meta.username as string | undefined
      const cardSeed = typeof meta.card_seed === 'number' ? meta.card_seed : 0
      const countryCode = (meta.country_code as string | undefined) ?? 'ES'

      if (!username) {
        router.replace(`/onboarding?email=${encodeURIComponent(user.email ?? '')}`)
        return
      }

      const result = await createProfile({ username, country_code: countryCode, card_seed: cardSeed })

      if (!result.success) {
        if (result.error === 'Username already taken') {
          router.replace(
            `/onboarding?email=${encodeURIComponent(user.email ?? '')}&username_taken=1`
          )
          return
        }
        console.error('[callback] createProfile failed:', result.error)
        setPhase('error')
        return
      }

      router.replace('/lobby')
    }

    // ── Strategy 1: PKCE flow — ?code= in query string ──
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error || !data?.user) {
          console.error('[callback] PKCE exchange failed:', error?.message)
          setPhase('error')
          return
        }
        await finish(data.user)
      })
      return
    }

    // ── Strategy 2: Implicit flow — SDK detects #access_token= automatically ──
    // Subscribe BEFORE checking session so we don't miss the event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await finish(session.user)
      }
    })

    // Also poll once in case the event fired before we subscribed
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await finish(session.user)
      }
    })

    // Safety timeout — show error if nothing happens in 8s
    const timeout = setTimeout(() => {
      if (!done.current) {
        console.error('[callback] Timeout — no auth event received')
        setPhase('error')
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  if (phase === 'error') {
    return (
      <div
        style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          background: '#0a0420', padding: '24px', textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontWeight: 900, fontSize: '20px', color: '#F1F1F1',
            letterSpacing: '-0.02em',
          }}
        >
          Enlace <span style={{ color: '#dc3545' }}>expirado</span>
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(222,216,250,0.6)', lineHeight: 1.5, maxWidth: '260px' }}>
          El enlace ya fue usado o expiró. Vuelve al inicio y solicita uno nuevo.
        </p>
        <a
          href="/"
          style={{
            marginTop: '4px', padding: '11px 20px', borderRadius: '9999px',
            background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)',
            color: '#F1F1F1', fontFamily: 'var(--font-body)',
            fontWeight: 700, fontSize: '11px', textDecoration: 'none',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          Volver al inicio
        </a>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px',
        background: [
          'radial-gradient(ellipse 60% 40% at 15% 10%, rgba(91,42,243,0.45) 0%, transparent 60%)',
          'radial-gradient(ellipse 50% 35% at 90% 90%, rgba(148,116,246,0.30) 0%, transparent 60%)',
          '#0a0420',
        ].join(', '),
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid rgba(148,116,246,0.3)',
          borderTopColor: '#9474F6',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'rgba(222,216,250,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        Verificando...
      </p>
    </div>
  )
}
