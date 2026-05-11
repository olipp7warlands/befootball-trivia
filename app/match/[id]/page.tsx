import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import MatchClient from './MatchClient'

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated → redirect to email gate with return_to
  if (!user) {
    redirect(`/?return_to=/match/${id}`)
  }

  const { data: match } = await admin.from('matches').select('*').eq('id', id).single()

  if (!match) redirect('/lobby')

  const isParticipant = match.player_a === user.id || match.player_b === user.id

  // Not a participant but match is waiting with no player_b → join
  if (!isParticipant && match.status === 'waiting' && !match.player_b) {
    // Call join endpoint (reuse logic by calling the server action directly)
    const { selectQuestionsForMatch } = await import('@/lib/match/select-questions')
    const { shuffleArray } = await import('@/lib/game/questions')

    const ALL_CATS = ['finales', 'goleadores', 'sedes', 'anecdotas', 'records', 'decadas']

    // Claim player_b atomically
    const { error: claimError } = await admin
      .from('matches')
      .update({ player_b: user.id, status: 'a_turn' })
      .eq('id', id)
      .eq('status', 'waiting')
      .is('player_b', null)

    if (!claimError) {
      // Create match_rounds if they don't exist
      const { data: existingRounds } = await admin
        .from('match_rounds').select('id').eq('match_id', id).limit(1)

      if (!existingRounds?.length) {
        const { data: profileA } = await admin
          .from('profiles').select('division').eq('id', match.player_a).single()

        const categories = (Array.isArray(match.selected_categories) && match.selected_categories.length === 3
          ? match.selected_categories
          : shuffleArray([...ALL_CATS]).slice(0, 3)) as [string, string, string]

        const rounds = await selectQuestionsForMatch({
          userId: match.player_a,
          division: profileA?.division ?? 'bronze',
          categories,
          supabase: admin,
        })

        await Promise.all([
          admin.from('matches').update({
            selected_categories: categories,
            questions_used: rounds.flatMap(r => r.questionIds),
          }).eq('id', id),
          ...rounds.flatMap((r, i) =>
            [match.player_a, user.id].map(pid =>
              admin.from('match_rounds').insert({
                match_id: id, round_num: i + 1, player: pid,
                category: r.category, questions: r.questionIds,
              }) as unknown as Promise<any>
            )
          ),
        ])
      }
    }

    // Redirect to self — now the user IS a participant
    redirect(`/match/${id}`)
  }

  // Caso D: not a participant and match already has a different player_b → render error page
  if (!isParticipant) {
    return (
      <ScreenContainer>
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#dc3545', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            — Reto no disponible
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '22px', color: '#F1F1F1', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Este reto ya fue<br />aceptado.
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(222,216,250,0.6)', maxWidth: '260px', lineHeight: 1.5 }}>
            Otro jugador se te adelantó. Crea tu propia partida desde el lobby.
          </p>
          <a href="/lobby" style={{ marginTop: '8px', padding: '11px 24px', borderRadius: '9999px', background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)', color: '#F1F1F1', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Crear nueva partida
          </a>
        </div>
      </ScreenContainer>
    )
  }

  if (match.status === 'finished') redirect(`/match/${id}/result`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, card_seed, country_code')
    .eq('id', user.id)
    .single()

  return (
    <ScreenContainer>
      <MatchClient
        matchId={id}
        userId={user.id}
        username={profile?.username ?? '??'}
        cardSeed={profile?.card_seed ?? 0}
        countryCode={profile?.country_code ?? 'ES'}
      />
    </ScreenContainer>
  )
}
