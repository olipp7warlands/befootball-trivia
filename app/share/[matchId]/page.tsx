import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ShareActions from './ShareActions'

interface Props {
  params: Promise<{ matchId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params
  return {
    openGraph: {
      images: [`/og/match/${matchId}.png`],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { matchId } = await params
  const supabase = await createClient()

  // Fetch match with winner and both player profiles
  const { data: match } = await supabase
    .from('matches')
    .select(
      `
      *,
      winner_profile:profiles!winner(username, card_seed),
      player_a_profile:profiles!player_a(username),
      player_b_profile:profiles!player_b(username)
      `
    )
    .eq('id', matchId)
    .single()

  // Fetch round scores
  const { data: rounds } = match
    ? await supabase
        .from('match_rounds')
        .select('player, correct_count')
        .eq('match_id', matchId)
    : { data: null }

  const isFinished = match?.status === 'finished'
  const isDraw = isFinished && !match?.winner

  const winnerUsername: string =
    (match as any)?.winner_profile?.username ?? 'Jugador'
  const cardSeed: number = (match as any)?.winner_profile?.card_seed ?? 120

  const opponentProfile =
    match?.winner === match?.player_a
      ? (match as any)?.player_b_profile
      : (match as any)?.player_a_profile
  const opponentUsername: string = opponentProfile?.username ?? 'Rival'

  // Calculate scores from rounds
  let winnerCorrect = 0
  let loserCorrect = 0
  if (rounds && match?.winner) {
    for (const round of rounds) {
      const count = round.correct_count ?? 0
      if (round.player === match.winner) {
        winnerCorrect += count
      } else {
        loserCorrect += count
      }
    }
  }

  const cardAngle = cardSeed % 360

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 50% 40%, #2a1260 0%, #0a0420 100%)',
      }}
    >
      {/* Background decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #67D7A8 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #5B2AF3 0%, transparent 70%)',
        }}
      />

      {/* Share Card */}
      <div
        className="noise-overlay relative w-full max-w-[340px] rounded-3xl border pb-6"
        style={{
          height: '480px',
          background: `conic-gradient(from ${cardAngle}deg at 40% 50%, #180E33 0deg, #5B2AF3 60deg, #9474F6 120deg, #67D7A8 180deg, #DED8FA 240deg, #5B2AF3 300deg, #180E33 360deg)`,
          borderColor: 'rgba(148,116,246,0.35)',
          boxShadow:
            '0 24px 80px rgba(91,42,243,0.35), 0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Decorative arc */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
        >
          <div
            className="absolute rounded-full"
            style={{
              width: '340px',
              height: '340px',
              top: '-100px',
              right: '-120px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '200px',
              height: '200px',
              bottom: '-60px',
              left: '-40px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Top wordmark */}
        <div className="relative z-10 flex items-start justify-between px-6 pt-5">
          <span
            className="text-xs font-black tracking-[0.2em] uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'rgba(241,241,241,0.75)',
            }}
          >
            BEFOOTBALL
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-8">
          {/* VICTORIA / EMPATE label */}
          <span
            className="mb-3 text-xs font-black tracking-[0.3em] uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              color: isDraw ? '#9474F6' : '#67D7A8',
            }}
          >
            {isDraw ? 'EMPATE' : 'VICTORIA'}
          </span>

          {/* Winner username */}
          <h1
            className="text-center text-5xl font-black italic leading-tight text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {winnerUsername}
          </h1>

          {/* Score */}
          <div
            className="mt-4 text-3xl font-black tracking-widest text-white"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {winnerCorrect} — {loserCorrect}
          </div>

          {/* Opponent */}
          <p
            className="mt-2 text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: '#9474F6',
            }}
          >
            vs {opponentUsername}
          </p>
        </div>

        {/* Bottom-right arrow badge */}
        <div
          aria-hidden
          className="absolute bottom-5 right-5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          ↗
        </div>
      </div>

      {/* Action sheet */}
      <div className="mt-6 flex w-full max-w-[340px] flex-col gap-3">
        <ShareActions matchId={matchId} winnerName={winnerUsername} />

        <Link
          href="/lobby"
          className="text-center text-sm"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'rgba(148,116,246,0.7)',
          }}
        >
          Volver al lobby
        </Link>
      </div>
    </div>
  )
}
