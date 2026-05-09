'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitLead } from '@/app/actions/leads'

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

export default function HomePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('ES')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await submitLead({ name, email, country_code: country })
      if (!result.success) {
        setError(result.error ?? 'Algo salió mal. Inténtalo de nuevo.')
        return
      }
      router.push(`/onboarding?email=${encodeURIComponent(email)}`)
    })
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 40%, #2a1260 0%, #0a0420 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #9474F6 0%, transparent 70%)' }}
      />

      <div className="noise-overlay relative z-10 flex w-full max-w-sm flex-col gap-7">
        <header className="flex flex-col gap-1 leading-none">
          <h1
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            className="text-[clamp(3.5rem,18vw,5rem)] font-black text-white tracking-tight"
          >
            BEFOOTBALL
          </h1>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            className="text-[clamp(3.5rem,18vw,5rem)] font-black text-white tracking-tight"
          >
            WORLD CUP
          </h1>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            className="text-[clamp(3.5rem,18vw,5rem)] font-black text-white tracking-tight"
          >
            TRIVIA
          </h1>
          <p
            className="mt-2 text-sm font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-lavender)', fontFamily: 'var(--font-body)' }}
          >
            Demuestra que sabes de Mundiales
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Tu nombre"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#9474F6] focus:ring-1 focus:ring-[#9474F6] transition-colors"
          />
          <input
            type="email"
            placeholder="tu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#9474F6] focus:ring-1 focus:ring-[#9474F6] transition-colors"
          />
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
            disabled={isPending}
            className="btn-primary mt-1 w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Cargando...' : 'Empezar a jugar'}
            {!isPending && (
              <span className="arrow-badge">↗</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
