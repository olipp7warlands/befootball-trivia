import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectQuestionsForMatch } from '@/lib/match/select-questions'
import { shuffleArray } from '@/lib/game/questions'

const ALL_CATS = ['finales', 'goleadores', 'sedes', 'anecdotas', 'records', 'decadas']

export async function POST(request: NextRequest) {
  const { previousMatchId } = await request.json() as { previousMatchId: string }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Load previous match
  const { data: prevMatch } = await admin
    .from('matches')
    .select('*')
    .eq('id', previousMatchId)
    .single()

  if (!prevMatch) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // 2. Verify user is participant
  if (prevMatch.player_a !== user.id && prevMatch.player_b !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Must be finished
  if (prevMatch.status !== 'finished') {
    return NextResponse.json({ error: 'El match aún está en curso' }, { status: 400 })
  }

  // 4. Active match limit
  const { data: active } = await admin
    .from('matches')
    .select('id')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['a_turn', 'b_turn', 'waiting'])

  if (active && active.length >= 10) {
    return NextResponse.json(
      { error: 'Tienes 10 partidas en curso, termina alguna antes de pedir revancha' },
      { status: 400 }
    )
  }

  // 5. Opponent ID — reuse same bot or real player
  const opponentId: string | null =
    prevMatch.player_a === user.id ? prevMatch.player_b : prevMatch.player_a

  if (!opponentId) return NextResponse.json({ error: 'Sin oponente' }, { status: 400 })

  // 6. User profile for difficulty
  const { data: myProfile } = await admin
    .from('profiles')
    .select('elo, division')
    .eq('id', user.id)
    .single()

  // 7. Categories — prefer ones NOT used in the previous match
  const usedCats: string[] = prevMatch.selected_categories ?? []
  const freshCats = ALL_CATS.filter(c => !usedCats.includes(c))
  const pool = freshCats.length >= 3 ? freshCats : ALL_CATS
  const categories = shuffleArray([...pool]).slice(0, 3) as [string, string, string]

  // 8. Questions — auto-excludes previous match via recent history (last 90 rounds)
  const rounds = await selectQuestionsForMatch({
    userId: user.id,
    division: myProfile?.division ?? 'bronze',
    categories,
    supabase: admin,
  })
  const allIds = rounds.flatMap(r => r.questionIds)

  // 9. Create match
  const { data: match, error: matchErr } = await admin
    .from('matches')
    .insert({
      player_a: user.id,
      player_b: opponentId,
      status: 'a_turn',
      current_round: 1,
      selected_categories: categories,
      questions_used: allIds,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (matchErr || !match) {
    console.error('[rematch] match insert failed:', matchErr?.message)
    return NextResponse.json({ error: 'Failed to create rematch' }, { status: 500 })
  }

  // 10. Create 6 match_rounds (3 rounds × 2 players)
  await Promise.all(
    rounds.flatMap((r, i) =>
      [user.id, opponentId].map(pid =>
        admin.from('match_rounds').insert({
          match_id: match.id,
          round_num: i + 1,
          player: pid,
          category: r.category,
          questions: r.questionIds,
        }) as unknown as Promise<any>
      )
    )
  )

  // Return opponent public info (never is_bot)
  const { data: opponent } = await admin
    .from('profiles')
    .select('id, username, country_code, elo, division, card_seed')
    .eq('id', opponentId)
    .single()

  return NextResponse.json({
    matchId: match.id,
    opponent: opponent
      ? {
          id: opponent.id,
          username: opponent.username,
          country_code: opponent.country_code,
          elo: opponent.elo,
          division: opponent.division,
          card_seed: opponent.card_seed,
        }
      : null,
  })
}
