'use client'

import { useState, useTransition } from 'react'
import { IconX, IconSend, IconClock } from '@tabler/icons-react'
import { createMatch } from '@/app/actions/matches'

interface Props {
  onClose: () => void
}

export function MatchmakeClient({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [opponent, setOpponent] = useState('')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false) // match created but no opponent yet
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createMatch(opponent.trim() || undefined)
      if (result.error && result.error !== 'Opponent not found') {
        setError(result.error)
        return
      }
      if (result.waiting) {
        setWaiting(true)
        setMatchId(result.matchId)
        return
      }
      setMatchId(result.matchId)
    })
  }

  const matchUrl =
    typeof window !== 'undefined' && matchId
      ? `${window.location.origin}/match/${matchId}`
      : matchId ? `/match/${matchId}` : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(10,4,32,0.85)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="noise-overlay"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '24px',
          background: '#180E33',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
          }}
        >
          <IconX size={16} />
        </button>

        {!matchId && !waiting ? (
          <>
            <h2
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: '#F1F1F1', letterSpacing: '-0.02em', marginBottom: '4px' }}
            >
              RETAR A UN AMIGO
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#9474F6', letterSpacing: '0.08em', marginBottom: '20px' }}>
              Introduce su email o nombre de usuario
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="email o @usuario (opcional)"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(222,216,250,0.12)',
                  borderRadius: '10px',
                  padding: '11px 12px',
                  fontSize: '11px',
                  color: '#DED8FA',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.1)', fontSize: '11px', color: '#dc3545', fontFamily: 'var(--font-mono)' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '8px', padding: '13px 16px', borderRadius: '9999px',
                  background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)',
                  color: '#F1F1F1', border: '1px solid rgba(255,255,255,0.1)',
                  fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
                }}
              >
                <span>{isPending ? 'Creando partida...' : 'Enviar reto'}</span>
                <IconSend size={16} />
              </button>
            </form>
          </>
        ) : waiting ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(148,116,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconClock size={20} color="#9474F6" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '18px', color: '#F1F1F1', letterSpacing: '-0.02em' }}>
                Reto enviado
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(222,216,250,0.7)', lineHeight: 1.5, marginBottom: '20px' }}>
              Comparte este link con tu amigo. Cuando lo abra, podrá jugar contigo.
            </p>
            {matchUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(222,216,250,0.1)', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', color: 'rgba(222,216,250,0.6)', fontFamily: 'var(--font-mono)' }}>{matchUrl}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(matchUrl)}
                  style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(222,216,250,0.15)', background: 'rgba(255,255,255,0.06)', color: '#DED8FA', fontSize: '10px', cursor: 'pointer' }}
                >
                  Copiar
                </button>
              </div>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: '11px', borderRadius: '9999px', background: 'rgba(91,42,243,0.2)', border: '1px solid rgba(91,42,243,0.4)', color: '#9474F6', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Entendido
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: '#67D7A8', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              ¡PARTIDA CREADA!
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#9474F6', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Comparte este enlace con tu rival
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(222,216,250,0.1)', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', color: 'rgba(222,216,250,0.6)', fontFamily: 'var(--font-mono)' }}>{matchUrl}</span>
              <button onClick={() => navigator.clipboard.writeText(matchUrl ?? '')} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(222,216,250,0.15)', background: 'rgba(255,255,255,0.06)', color: '#DED8FA', fontSize: '10px', cursor: 'pointer' }}>
                Copiar
              </button>
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: '11px', borderRadius: '9999px', background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)', border: 'none', color: '#F1F1F1', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Listo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
