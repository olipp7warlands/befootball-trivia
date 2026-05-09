import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { IconShare2 } from '@tabler/icons-react'
import RevanchaButton from './RevanchaButton'
import type { Match, MatchRound, Profile } from '@/lib/types'
import { calcElo } from '@/lib/game/elo'

export default async function MatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch match
  const { data: matchRaw } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (
    !matchRaw ||
    (matchRaw.player_a !== user.id && matchRaw.player_b !== user.id)
  ) {
    redirect('/lobby')
  }

  const match = matchRaw as Match

  // Fetch all rounds for this match
  const { data: roundsRaw } = await supabase
    .from('match_rounds')
    .select('*')
    .eq('match_id', id)

  const rounds = (roundsRaw ?? []) as MatchRound[]

  // Aggregate correct counts per player
  function aggregatePlayer(playerId: string) {
    return rounds
      .filter((r) => r.player === playerId)
      .reduce((sum, r) => sum + (r.correct_count ?? 0), 0)
  }

  const myCorrect = aggregatePlayer(user.id)
  const opponentId =
    match.player_a === user.id ? match.player_b : match.player_a
  const opponentCorrect = opponentId ? aggregatePlayer(opponentId) : null

  // Determine outcome
  const isWinner = match.winner === user.id
  const isDraw = match.status === 'finished' && !match.winner
  const outcome: 'win' | 'loss' | 'draw' =
    isDraw ? 'draw' : isWinner ? 'win' : 'loss'

  // Fetch both profiles for ELO display
  const playerIds = [user.id, ...(opponentId ? [opponentId] : [])]
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('*')
    .in('id', playerIds)

  const profiles = (profilesRaw ?? []) as Profile[]
  const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p]))

  const myProfile = profileMap.get(user.id)
  const opponentProfile = opponentId ? profileMap.get(opponentId) : null

  // Calculate ELO delta (approximate, server already updated; we show the diff)
  let eloDelta = 0
  if (myProfile && opponentProfile) {
    const newElo = calcElo(
      myProfile.elo,
      opponentProfile.elo,
      outcome === 'win',
      outcome === 'draw'
    )
    eloDelta = newElo - myProfile.elo
  }

  // Outcome visuals
  const outcomeLabel =
    outcome === 'win' ? 'VICTORIA' : outcome === 'loss' ? 'DERROTA' : 'EMPATE'
  const outcomeColor =
    outcome === 'win'
      ? 'text-[#67D7A8]'
      : outcome === 'loss'
      ? 'text-red-400'
      : 'text-[#9474F6]'

  const eloDeltaColor =
    eloDelta > 0
      ? 'text-[#67D7A8] bg-[#67D7A8]/10 border-[#67D7A8]/30'
      : eloDelta < 0
      ? 'text-red-400 bg-red-400/10 border-red-400/30'
      : 'text-[#9474F6] bg-[#9474F6]/10 border-[#9474F6]/30'

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#0a0420] px-4 py-12 page-enter">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Outcome headline */}
        <div className="text-center">
          <h1
            className={`text-6xl font-black italic leading-none ${outcomeColor}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {outcomeLabel}
          </h1>

          {/* ELO badge */}
          {eloDelta !== 0 && (
            <span
              className={`inline-block mt-3 text-sm font-bold px-3 py-1 rounded-full border ${eloDeltaColor}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {eloDelta > 0 ? '+' : ''}
              {eloDelta} ELO
            </span>
          )}
        </div>

        {/* Score display */}
        <div
          className="text-5xl font-black tracking-tighter text-[#F1F1F1]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className={outcome === 'win' ? 'text-[#67D7A8]' : 'text-[#F1F1F1]'}>
            {myCorrect}
          </span>
          <span className="text-[#9474F6]/40 mx-3">—</span>
          <span className={outcome === 'loss' ? 'text-red-400' : 'text-[#9474F6]/70'}>
            {opponentCorrect ?? '?'}
          </span>
        </div>

        <div className="text-xs text-[#9474F6]/60 -mt-4">
          respuestas correctas (de 9)
        </div>

        {/* Round-by-round breakdown */}
        {rounds.length > 0 && (
          <div className="w-full rounded-2xl border border-[#5B2AF3]/40 bg-[#180E33] divide-y divide-[#9474F6]/10">
            {[1, 2, 3].map((rNum) => {
              const myRound = rounds.find(
                (r) => r.round_num === rNum && r.player === user.id
              )
              const oppRound = opponentId
                ? rounds.find(
                    (r) => r.round_num === rNum && r.player === opponentId
                  )
                : null

              return (
                <div key={rNum} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-[#9474F6]/70">Ronda {rNum}</span>
                  <div
                    className="flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span className="text-[#67D7A8] font-bold">
                      {myRound?.correct_count ?? '–'}
                    </span>
                    <span className="text-[#9474F6]/40">vs</span>
                    <span className="text-[#9474F6]/60">
                      {oppRound?.correct_count ?? '?'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Crystal card teaser */}
        <div className="w-full rounded-2xl crystal-card noise-overlay p-px">
          <div className="rounded-2xl bg-[#180E33]/80 backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#9474F6]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                Tu tarjeta
              </p>
              <p className="text-sm font-semibold text-[#DED8FA] mt-0.5">
                {myProfile?.username ?? 'Jugador'}
              </p>
              <p className="text-xs text-[#9474F6]/60 mt-0.5">
                {myProfile?.division ?? 'bronze'} · {myProfile?.elo ?? 0} ELO
              </p>
            </div>
            <div
              className="text-3xl font-black text-[#67D7A8]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {myCorrect}/9
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href={`/share/${id}`}
            className="btn-primary justify-center gap-2"
          >
            <IconShare2 size={18} />
            Compartir
            <span className="arrow-badge">↗</span>
          </Link>

          <RevanchaButton
            opponentId={opponentId ?? null}
            opponentUsername={opponentProfile?.username ?? null}
          />
        </div>
      </div>
    </main>
  )
}
