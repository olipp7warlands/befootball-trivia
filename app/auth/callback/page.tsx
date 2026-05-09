'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from '@/app/actions/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

type Phase = 'loading' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    const supabase = createClient()

    async function run() {
      // PKCE flow: Supabase sends ?code= in the query string
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.user) {
          console.error('[auth/callback] exchangeCodeForSession failed:', error)
          setPhase('error')
          return
        }
        await finish(supabase, data.user.id, data.user.email ?? '', data.user.user_metadata)
        return
      }

      // Implicit flow fallback: Supabase sets session automatically via detectSessionInUrl
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        console.error('[auth/callback] No session found:', sessionError)
        setPhase('error')
        return
      }
      await finish(supabase, session.user.id, session.user.email ?? '', session.user.user_metadata)
    }

    async function finish(
      supabase: SupabaseClient,
      userId: string,
      email: string,
      meta: Record<string, unknown>
    ) {
      // Check if profile already exists (returning user)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (existing) {
        router.replace('/lobby')
        return
      }

      // New user — create profile from OTP metadata
      const username = meta.username as string | undefined
      const cardSeed = typeof meta.card_seed === 'number' ? meta.card_seed : 0
      const countryCode = (meta.country_code as string | undefined) ?? 'ES'

      if (!username) {
        router.replace(`/onboarding?email=${encodeURIComponent(email)}`)
        return
      }

      const result = await createProfile({ username, country_code: countryCode, card_seed: cardSeed })

      if (!result.success) {
        if (result.error === 'Username already taken') {
          router.replace(`/onboarding?email=${encodeURIComponent(email)}&username_taken=1`)
          return
        }
        console.error('[auth/callback] createProfile failed:', result.error)
        setPhase('error')
        return
      }

      router.replace('/lobby')
    }

    run()
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
          Enlace <span style={{ color: '#dc3545' }}>inválido</span>
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(222,216,250,0.6)', lineHeight: 1.5 }}>
          El enlace expiró o ya fue usado. Vuelve a intentarlo.
        </p>
        <a
          href="/"
          style={{
            marginTop: '8px', padding: '11px 20px', borderRadius: '9999px',
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
          border: '2px solid rgba(148,116,246,0.4)',
          borderTopColor: '#9474F6',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'rgba(222,216,250,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        Iniciando sesión...
      </p>
    </div>
  )
}
