import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PowerupType = 'var' | 'prorroga' | 'roja'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const { type, questionId } = await request.json() as { type: PowerupType; questionId: string }

  if (!['var', 'prorroga', 'roja'].includes(type)) {
    return NextResponse.json({ error: 'Invalid powerup type' }, { status: 400 })
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await admin.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const isPlayerA = match.player_a === user.id
  const isPlayerB = match.player_b === user.id
  if (!isPlayerA && !isPlayerB) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check powerup not already used in any round of this match (one of each per match)
  const { data: userRounds } = await admin
    .from('match_rounds')
    .select('powerups_used')
    .eq('match_id', matchId)
    .eq('player', user.id)

  const alreadyUsed = (userRounds ?? []).some(r =>
    ((r.powerups_used ?? []) as any[]).some((p: any) => p.type === type)
  )
  if (alreadyUsed) {
    return NextResponse.json({ error: `Powerup '${type}' already used in this match` }, { status: 400 })
  }

  // Get current round for this player
  const { data: round } = await admin
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)
    .eq('round_num', match.current_round)
    .eq('player', user.id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  // Record powerup usage
  const updatedPowerups = [...((round.powerups_used ?? []) as any[]), { type, questionId }]
  await admin.from('match_rounds').update({ powerups_used: updatedPowerups }).eq('id', round.id)

  // Build powerup-specific response
  if (type === 'var') {
    // Find the correct answer index and eliminate 2 wrong ones
    const { data: question } = await admin
      .from('questions')
      .select('correct')
      .eq('id', questionId)
      .single()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const allOptions = [0, 1, 2, 3]
    const incorrect = allOptions.filter(i => i !== question.correct)
    // Shuffle and pick 2 to eliminate
    const eliminated = incorrect
      .map(i => ({ i, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 2)
      .map(x => x.i)
      .sort((a, b) => a - b)

    return NextResponse.json({ eliminatedOptions: eliminated })
  }

  if (type === 'prorroga') {
    return NextResponse.json({ extraSeconds: 5 })
  }

  // roja
  return NextResponse.json({ ok: true })
}
