import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { PillButton, Avatar, Flag } from '@/components/ui'
import Link from 'next/link'

export default async function RoundResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ round?: string }>
}) {
  const { id: matchId } = await params
  const { round: roundParam } = await searchParams
  const roundNum = parseInt(roundParam ?? '1', 10)

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: match } = await admin.from('matches').select('*').eq('id', matchId).single()
  if (!match || (match.player_a !== user.id && match.player_b !== user.id)) redirect('/lobby')

  const opponentId = match.player_a === user.id ? match.player_b : match.player_a
  const yourSide = match.player_a === user.id ? 'a' : 'b'

  // Fetch profiles
  const [profileResult, opponentResult] = await Promise.all([
    supabase.from('profiles').select('username, card_seed, country_code').eq('id', user.id).single(),
    admin.from('profiles').select('username, card_seed, country_code').eq('id', opponentId).single(),
  ])
  const profile = profileResult.data
  const opponent = opponentResult.data

  // Fetch match_rounds for this round
  const { data: rounds } = await admin
    .from('match_rounds')
    .select('player, correct_count, time_taken_ms, category')
    .eq('match_id', matchId)
    .eq('round_num', roundNum)

  const yourRound = rounds?.find(r => r.player === user.id)
  const opponentRound = rounds?.find(r => r.player === opponentId)

  const yourCorrect = yourRound?.correct_count ?? 0
  const oppCorrect = opponentRound?.correct_count ?? null
  const yourTime = ((yourRound?.time_taken_ms ?? 0) / 1000).toFixed(1)
  const category = yourRound?.category ?? 'finales'

  const roundPoints = (yourCorrect ?? 0) * 100
  const isLastRound = roundNum >= 3
  const matchFinished = match.status === 'finished'

  return (
    <ScreenContainer>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px 16px',
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: '#67D7A8',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          — Ronda {roundNum} completa
        </p>

        {/* Hero score */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: '32px',
            lineHeight: 0.95,
            letterSpacing: '-0.025em',
            color: '#F1F1F1',
            marginBottom: '8px',
          }}
        >
          {yourCorrect}/3{' '}
          <span style={{ color: '#67D7A8' }}>aciertos</span>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'rgba(222,216,250,0.6)',
            letterSpacing: '0.04em',
            marginBottom: '24px',
          }}
        >
          {roundPoints} pts · {yourTime}s
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(148,116,246,0.2)', marginBottom: '20px' }} />

        {/* Comparison block */}
        {oppCorrect !== null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: '#9474F6',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              — Resultado de la ronda
            </p>

            {/* You */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(91,42,243,0.12)',
                border: '1px solid rgba(91,42,243,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar cardSeed={profile?.card_seed ?? 0} initials={(profile?.username ?? '??').slice(0, 2).toUpperCase()} size={28} />
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: '#F1F1F1' }}>
                  {profile?.username ?? '??'} <span style={{ color: '#9474F6', fontSize: '9px' }}>TÚ</span>
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: '#67D7A8' }}>
                {yourCorrect}/3
              </span>
            </div>

            {/* Opponent */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(222,216,250,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar cardSeed={opponent?.card_seed ?? 0} initials={(opponent?.username ?? '??').slice(0, 2).toUpperCase()} size={28} />
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: '#DED8FA' }}>
                  {opponent?.username ?? '...'}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: '#DED8FA' }}>
                {oppCorrect}/3
              </span>
            </div>

            {/* Round winner */}
            {yourCorrect !== oppCorrect && (
              <p style={{ fontSize: '11px', color: 'rgba(222,216,250,0.6)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                {yourCorrect > oppCorrect ? '✓ Ganaste esta ronda' : '✗ Perdiste esta ronda'}
              </p>
            )}
            {yourCorrect === oppCorrect && (
              <p style={{ fontSize: '11px', color: 'rgba(222,216,250,0.6)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                Empate en esta ronda
              </p>
            )}
          </div>
        ) : (
          /* Waiting for opponent */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(148,116,246,0.3)', borderTopColor: '#9474F6', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: '#F1F1F1' }}>
              Esperando a {opponent?.username ?? '...'}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(222,216,250,0.5)', maxWidth: '240px', lineHeight: 1.5 }}>
              Te avisaremos por email cuando juegue su ronda.
            </p>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* CTA */}
        {matchFinished ? (
          <Link href={`/match/${matchId}/result`} style={{ textDecoration: 'none' }}>
            <PillButton variant="primary" arrow>
              Ver resultado final
            </PillButton>
          </Link>
        ) : (
          <Link href="/lobby" style={{ textDecoration: 'none' }}>
            <PillButton variant="primary" arrow>
              Volver al lobby
            </PillButton>
          </Link>
        )}

        <p
          style={{
            marginTop: '10px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'rgba(222,216,250,0.35)',
          }}
        >
          {isLastRound ? 'Última ronda jugada' : `Quedan ${3 - roundNum} rondas`}
        </p>
      </div>
    </ScreenContainer>
  )
}
