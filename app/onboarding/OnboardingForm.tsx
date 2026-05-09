'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createProfile } from '@/app/actions/auth'

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

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

function getUsernameHint(val: string): { text: string; ok: boolean } | null {
  if (val.length === 0) return null
  if (val.length < 3) return { text: 'Mínimo 3 caracteres', ok: false }
  if (val.length > 20) return { text: 'Máximo 20 caracteres', ok: false }
  if (!USERNAME_RE.test(val)) return { text: 'Solo letras, números y _', ok: false }
  return { text: 'Nombre disponible ✓', ok: true }
}

export function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('ES')
  const [cardSeed, setCardSeed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCardSeed(Math.floor(Math.random() * 360))
  }, [])

  const emailParam = searchParams.get('email') ?? ''

  const hint = getUsernameHint(username)
  const isUsernameValid = hint?.ok === true

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isUsernameValid) return
    setError(null)

    startTransition(async () => {
      const result = await createProfile({
        username,
        country_code: country,
        card_seed: cardSeed,
      })
      if (!result.success) {
        if (result.error === 'Username already taken') {
          setError('Ese nombre ya está en uso. Elige otro.')
        } else {
          setError(result.error ?? 'Algo salió mal. Inténtalo de nuevo.')
        }
        return
      }
      router.push('/lobby')
    })
  }

  const previewColor = `hsl(${cardSeed}, 70%, 60%)`

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 40%, #2a1260 0%, #0a0420 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #67D7A8 0%, transparent 70%)' }}
      />

      <div className="noise-overlay relative z-10 flex w-full max-w-sm flex-col gap-7">
        <header className="flex flex-col gap-1">
          <h1
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            className="text-[clamp(2rem,10vw,2.75rem)] font-black text-white leading-tight"
          >
            ELIGE TU NOMBRE
            <br />
            EN EL CAMPO
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-lavender)', fontFamily: 'var(--font-body)' }}
          >
            Este será tu identidad en la liga
          </p>
        </header>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div
            className="h-10 w-10 shrink-0 rounded-full shadow-lg"
            style={{ background: previewColor }}
          />
          <div className="flex flex-col">
            <span className="text-xs text-white/40">Tu carnet tendrá este color</span>
            <span
              className="text-sm font-semibold text-white truncate max-w-[180px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {username || 'tu_nombre'}
            </span>
            {emailParam && (
              <span className="text-[11px] text-white/30 truncate max-w-[180px]">
                {emailParam}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="tu_nombre_aqui"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#9474F6] focus:ring-1 focus:ring-[#9474F6] transition-colors"
            />
            {hint && (
              <p className={`px-1 text-xs ${hint.ok ? 'text-[#67D7A8]' : 'text-red-300'}`}>
                {hint.text}
              </p>
            )}
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#180E33] px-4 py-3 text-sm text-white outline-none focus:border-[#9474F6] focus:ring-1 focus:ring-[#9474F6] transition-colors"
          >
            {FIFA_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !isUsernameValid}
            className="btn-primary mt-1 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Cargando...' : 'Entrar al campo'}
            {!isPending && <span className="arrow-badge">↗</span>}
          </button>
        </form>
      </div>
    </div>
  )
}
