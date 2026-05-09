'use client'

import { useState, useTransition } from 'react'
import { IconX, IconSend } from '@tabler/icons-react'
import { createMatch } from '@/app/actions/matches'

interface Props {
  onClose: () => void
}

export function MatchmakeClient({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [opponent, setOpponent] = useState('')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createMatch(opponent.trim() || undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      setMatchId(result.matchId)
    })
  }

  const matchUrl =
    typeof window !== 'undefined' && matchId
      ? `${window.location.origin}/match/${matchId}`
      : matchId
        ? `/match/${matchId}`
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(10,4,32,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="noise-overlay relative w-full max-w-sm rounded-3xl border border-white/10 p-6"
        style={{ background: '#180E33' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
        >
          <IconX size={16} />
        </button>

        {!matchId ? (
          <>
            <h2
              className="mb-1 text-lg font-black text-white"
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            >
              RETAR A UN AMIGO
            </h2>
            <p className="mb-5 text-xs" style={{ color: 'var(--color-lavender)' }}>
              Introduce su email o nombre de usuario
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="email o @usuario"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#9474F6] focus:ring-1 focus:ring-[#9474F6] transition-colors"
              />
              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? 'Creando partida...' : 'Enviar reto'}
                {!isPending && <IconSend size={16} />}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2
              className="mb-1 text-lg font-black"
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                color: 'var(--color-turquoise)',
              }}
            >
              ¡PARTIDA CREADA!
            </h2>
            <p className="mb-4 text-xs" style={{ color: 'var(--color-lavender)' }}>
              Comparte este enlace con tu rival
            </p>
            <div
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span
                className="flex-1 truncate text-xs text-white/70"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {matchUrl}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(matchUrl ?? '')}
                className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors"
              >
                Copiar
              </button>
            </div>
            <button
              onClick={onClose}
              className="btn-primary mt-4 w-full justify-center"
            >
              Listo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
