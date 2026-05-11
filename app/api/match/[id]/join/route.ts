import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectQuestionsForMatch } from '@/lib/match/select-questions'
import { shuffleArray } from '@/lib/game/questions'

const ALL_CATS = ['finales', 'goleadores', 'sedes', 'anecdotas', 'records', 'decadas']

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch match
  const { data: match } = await admin.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Already a participant
  if (match.player_a === user.id || match.player_b === user.id) {
    return NextResponse.json({ ok: true, alreadyJoined: true })
  }

  // Must be waiting with no player_b to join
  if (match.status !== 'waiting' || match.player_b !== null) {
    return NextResponse.json({ error: 'Match not joinable' }, { status: 400 })
  }

  // Atomically claim player_b slot
  const { error: claimError } = await admin
    .from('matches')
    .update({ player_b: user.id, status: 'a_turn' })
    .eq('id', matchId)
    .eq('status', 'waiting')
    .is('player_b', null)

  if (claimError) {
    return NextResponse.json({ error: 'Match already taken' }, { status: 409 })
  }

  // Setup match_rounds if they don't exist yet
  const { data: existingRounds } = await admin
    .from('match_rounds')
    .select('id')
    .eq('match_id', matchId)
    .limit(1)

  if (!existingRounds?.length) {
    // Select questions using player_a's division
    const { data: profileA } = await admin
      .from('profiles')
      .select('division, country_code')
      .eq('id', match.player_a)
      .single()

    const categories = (match.selected_categories?.length === 3
      ? match.selected_categories
      : shuffleArray([...ALL_CATS]).slice(0, 3)) as [string, string, string]

    const rounds = await selectQuestionsForMatch({
      userId: match.player_a,
      division: profileA?.division ?? 'bronze',
      categories,
      supabase: admin,
    })

    const allIds = rounds.flatMap(r => r.questionIds)

    await Promise.all([
      admin.from('matches').update({
        selected_categories: categories,
        questions_used: allIds,
      }).eq('id', matchId),
      ...rounds.flatMap((r, i) =>
        [match.player_a, user.id].map(pid =>
          admin.from('match_rounds').insert({
            match_id: matchId,
            round_num: i + 1,
            player: pid,
            category: r.category,
            questions: r.questionIds,
          }) as unknown as Promise<any>
        )
      ),
    ])
  }

  return NextResponse.json({ ok: true })
}
