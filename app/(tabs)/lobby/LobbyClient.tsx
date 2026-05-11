'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconSwords, IconUserPlus, IconLoader2 } from '@tabler/icons-react'
import { Avatar, Flag } from '@/components/ui'
import { MatchmakeClient } from './MatchmakeClient'

interface ActiveMatch {
  id: string
  opponent: { username: string; country_code: string; card_seed: number; division: string } | null
  status: string
  currentRound: number
  yourScore: number
  opponentScore: number | null
  isYourTurn: boolean
}

interface Props {
  activeMatches: ActiveMatch[]
}

export function LobbyClient({ activeMatches }: Props) {
  const router = useRouter()
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [loadingNew, setLoadingNew] = useState(false)
  const [newMatchError, setNewMatchError] = useState<string | null>(null)

  // Bug 1 fix: direct matchmaking — no modal
  async function handlePlayNew() {
    if (loadingNew) return
    setLoadingNew(true)
    setNewMatchError(null)
    try {
      const res = await fetch('/api/match/new', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        setNewMatchError(err.error ?? 'No se pudo crear la partida')
        return
      }
      const { matchId } = await res.json()
      router.push(`/match/${matchId}`)
    } catch {
      setNewMatchError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoadingNew(false)
    }
  }

  return (
    <>
      {/* Active matches section (Bug 3 fix) */}
      {activeMatches.length > 0 && (
        <div style={{ marginBottom: '4px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#DED8FA', opacity: 0.85, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
            — EN CURSO
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {activeMatches.map(m => (
              <ActiveMatchCard key={m.id} match={m} onClick={() => router.push(`/match/${m.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Bug 1 fix: Jugar partida nueva → direct matchmaking */}
        <button
          onClick={handlePlayNew}
          disabled={loadingNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', borderRadius: '14px',
            border: '1px solid rgba(91,42,243,0.4)',
            background: 'rgba(91,42,243,0.18)',
            cursor: loadingNew ? 'wait' : 'pointer',
            opacity: loadingNew ? 0.8 : 1,
            transition: 'background 0.15s ease',
            width: '100%',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '9px', background: 'rgba(91,42,243,0.35)', color: '#9474F6', flexShrink: 0 }}>
            {loadingNew
              ? <IconLoader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <IconSwords size={18} />}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: '#F1F1F1' }}>
              {loadingNew ? 'Buscando rival...' : 'Jugar partida nueva'}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(222,216,250,0.5)' }}>
              Búsqueda automática de rival
            </span>
          </div>
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {newMatchError && (
          <p style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.1)', fontSize: '11px', color: '#dc3545', fontFamily: 'var(--font-mono)' }}>
            {newMatchError}
          </p>
        )}

        {/* Retar a un amigo → modal only */}
        <button
          onClick={() => setChallengeOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', borderRadius: '14px',
            border: '1px solid rgba(91,42,243,0.4)',
            background: 'rgba(91,42,243,0.18)',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '9px', background: 'rgba(91,42,243,0.35)', color: '#9474F6', flexShrink: 0 }}>
            <IconUserPlus size={18} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: '#F1F1F1' }}>
              Retar a un amigo
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(222,216,250,0.5)' }}>
              Crea partida y comparte el link
            </span>
          </div>
        </button>
      </div>

      {challengeOpen && <MatchmakeClient onClose={() => setChallengeOpen(false)} />}
    </>
  )
}

// ── Active match card ─────────────────────────────────────────────────────────

function ActiveMatchCard({ match, onClick }: { match: ActiveMatch; onClick: () => void }) {
  const isWaiting = match.status === 'waiting'
  const isYourTurn = match.isYourTurn && !isWaiting

  const label = isWaiting
    ? 'Esperando que abra el link'
    : isYourTurn
      ? `Tu turno · Ronda ${match.currentRound}`
      : `Esperando rival · Ronda ${match.currentRound}`

  const labelColor = isYourTurn ? '#9474F6' : 'rgba(222,216,250,0.5)'
  const initials = (match.opponent?.username ?? '??').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '10px',
        border: isYourTurn ? '1px solid rgba(91,42,243,0.4)' : '1px solid rgba(222,216,250,0.07)',
        background: isYourTurn ? 'rgba(91,42,243,0.12)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer', width: '100%', opacity: !isYourTurn && !isWaiting ? 0.75 : 1,
        transition: 'opacity 0.15s ease',
        animation: isYourTurn ? 'borderPulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`@keyframes borderPulse { 0%,100%{border-color:rgba(91,42,243,0.4)} 50%{border-color:rgba(91,42,243,0.8)} }`}</style>
      {match.opponent
        ? <Avatar cardSeed={match.opponent.card_seed} initials={initials} size={28} />
        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(148,116,246,0.15)' }} />
      }
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: '#F1F1F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.opponent?.username ?? 'Invitado pendiente'}
          </span>
          {match.opponent && <Flag code={match.opponent.country_code} size={12} />}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: labelColor, letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: '#DED8FA', letterSpacing: '0.08em' }}>
          {match.yourScore} · {match.opponentScore ?? '?'}
        </span>
      </div>
    </button>
  )
}
