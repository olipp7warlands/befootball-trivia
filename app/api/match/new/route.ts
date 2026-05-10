import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findOpponent } from '@/lib/match/find-opponent'
import { selectQuestionsForMatch } from '@/lib/match/select-questions'
import { shuffleArray } from '@/lib/game/questions'

const ALL_CATS = ['finales', 'goleadores', 'sedes', 'anecdotas', 'records', 'decadas']

export async function POST() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Load user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('elo, division, country_code, username')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 3. Check active matches limit (max 3)
  const { data: active } = await supabase
    .from('matches')
    .select('id')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['a_turn', 'b_turn', 'waiting'])

  if (active && active.length >= 3) {
    return NextResponse.json(
      { error: 'Tienes 3 partidas en curso, termina una antes de empezar otra' },
      { status: 400 }
    )
  }

  // 4. Find opponent
  const { profile: opponent, isBot } = await findOpponent({
    userId: user.id,
    userElo: profile.elo,
    userCountry: profile.country_code,
    adminSupabase: admin,
  })

  // 5. Select 3 categories
  const categories = shuffleArray([...ALL_CATS]).slice(0, 3) as [string, string, string]

  // 6. Select questions for each round
  const rounds = await selectQuestionsForMatch({
    userId: user.id,
    division: profile.division,
    categories,
    supabase: admin,
  })

  // 7. Collect all used question IDs
  const allQuestionIds = rounds.flatMap((r) => r.questionIds)

  // 8. Insert match record
  const { data: match, error: matchError } = await admin
    .from('matches')
    .insert({
      player_a: user.id,
      player_b: opponent.id,
      status: 'a_turn',
      current_round: 1,
      selected_categories: categories,
      questions_used: allQuestionIds,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }

  // 9. Insert 6 match_rounds (3 rounds × 2 players)
  const roundInserts: Promise<any>[] = []

  for (let i = 0; i < 3; i++) {
    for (const playerId of [user.id, opponent.id]) {
      roundInserts.push(
        admin.from('match_rounds').insert({
          match_id: match.id,
          round_num: i + 1,
          player: playerId,
          category: categories[i],
          questions: rounds[i]?.questionIds ?? [],
        }) as unknown as Promise<any>
      )
    }
  }

  await Promise.all(roundInserts)

  // 10. Return response (never expose is_bot)
  return NextResponse.json({
    matchId: match.id,
    opponent: {
      id: opponent.id,
      username: opponent.username,
      country_code: opponent.country_code,
      elo: opponent.elo,
      division: opponent.division,
      card_seed: opponent.card_seed,
    },
    selectedCategories: categories,
    status: 'a_turn',
  })
}
