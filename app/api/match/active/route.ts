import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Active matches: user is player_a or player_b, not finished/abandoned
  const { data: matches } = await admin
    .from('matches')
    .select('id, player_a, player_b, status, current_round, selected_categories, updated_at, started_at')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['a_turn', 'b_turn', 'waiting'])
    .order('started_at', { ascending: false })
    .limit(5)

  if (!matches?.length) return NextResponse.json([])

  // Collect all opponent IDs (exclude nulls for waiting matches)
  const opponentIds = matches
    .map(m => m.player_a === user.id ? m.player_b : m.player_a)
    .filter(Boolean) as string[]

  const uniqueOpponentIds = [...new Set(opponentIds)]

  const { data: opponents } = uniqueOpponentIds.length > 0
    ? await admin.from('profiles').select('id, username, country_code, card_seed, division').in('id', uniqueOpponentIds)
    : { data: [] }

  const opponentMap = Object.fromEntries((opponents ?? []).map(p => [p.id, p]))

  // Fetch scores from match_rounds for each match
  const matchIds = matches.map(m => m.id)
  const { data: allRounds } = await admin
    .from('match_rounds')
    .select('match_id, player, correct_count')
    .in('match_id', matchIds)

  type RR = { match_id: string; player: string; correct_count: number | null }
  const roundsByMatch = (allRounds ?? []).reduce<Record<string, RR[]>>((acc, r) => {
    if (!acc[r.match_id]) acc[r.match_id] = []
    acc[r.match_id].push(r as RR)
    return acc
  }, {})

  const result = matches.map(m => {
    const yourSide = m.player_a === user.id ? 'a' : 'b'
    const isYourTurn = m.status === (yourSide === 'a' ? 'a_turn' : 'b_turn')
    const opponentId = yourSide === 'a' ? m.player_b : m.player_a
    const opponent = opponentId ? opponentMap[opponentId] ?? null : null

    const rounds = roundsByMatch[m.id] ?? []
    const yourScore = rounds.filter(r => r.player === user.id).reduce((s, r) => s + (r.correct_count ?? 0) * 100, 0)
    const oppRounds = rounds.filter(r => r.player === opponentId)
    const opponentScore = oppRounds.length > 0 ? oppRounds.reduce((s, r) => s + (r.correct_count ?? 0) * 100, 0) : null

    return {
      id: m.id,
      opponent: opponent ? {
        username: opponent.username,
        country_code: opponent.country_code,
        card_seed: opponent.card_seed,
        division: opponent.division,
      } : null,
      status: m.status,
      currentRound: m.current_round,
      yourScore,
      opponentScore,
      isYourTurn,
      updatedAt: m.started_at,
    }
  })

  return NextResponse.json(result)
}
