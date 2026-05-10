import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcScore } from '@/lib/game/scoring'
import { calcElo, getDivision } from '@/lib/game/elo'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const body = await request.json()
  const { questionId, selectedOption, timeTakenMs } = body as {
    questionId: string
    selectedOption: number
    timeTakenMs: number
  }

  if (questionId === undefined || selectedOption === undefined || timeTakenMs === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
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

  if (match.status === 'finished' || match.status === 'abandoned') {
    return NextResponse.json({ error: 'Match already finished' }, { status: 400 })
  }

  const expectedStatus = isPlayerA ? 'a_turn' : 'b_turn'
  if (match.status !== expectedStatus) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
  }

  // Get this player's round for current_round
  const { data: round } = await admin
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)
    .eq('round_num', match.current_round)
    .eq('player', user.id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const questionIds: string[] = round.questions ?? []
  if (!questionIds.includes(questionId)) {
    return NextResponse.json({ error: 'Question not in this round' }, { status: 400 })
  }

  const existingAnswers: any[] = round.answers ?? []
  if (existingAnswers.some((a: any) => a.questionId === questionId)) {
    return NextResponse.json({ error: 'Already answered this question' }, { status: 400 })
  }

  const { data: question } = await admin
    .from('questions')
    .select('correct, explanation')
    .eq('id', questionId)
    .single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const correct = selectedOption === question.correct
  const points = calcScore(correct, timeTakenMs)

  const updatedAnswers = [...existingAnswers, { questionId, selectedOption, timeTakenMs, correct, points }]
  const isRoundComplete = updatedAnswers.length === questionIds.length

  const roundUpdate: Record<string, unknown> = { answers: updatedAnswers }
  if (isRoundComplete) {
    roundUpdate.correct_count = updatedAnswers.filter((a: any) => a.correct).length
    roundUpdate.time_taken_ms = updatedAnswers.reduce((s: number, a: any) => s + a.timeTakenMs, 0)
    roundUpdate.played_at = new Date().toISOString()
  }
  await admin.from('match_rounds').update(roundUpdate).eq('id', round.id)

  let matchComplete = false

  if (isRoundComplete) {
    if (match.status === 'a_turn') {
      // A finished → B's turn
      await admin.from('matches').update({ status: 'b_turn' }).eq('id', matchId)
    } else {
      // B finished this round
      if (match.current_round >= 3) {
        // Last round done → finish match
        const { data: allRounds } = await admin
          .from('match_rounds')
          .select('player, correct_count, time_taken_ms')
          .eq('match_id', matchId)

        const sum = (playerId: string, field: 'correct_count' | 'time_taken_ms') =>
          (allRounds ?? []).filter(r => r.player === playerId).reduce((s, r) => s + (r[field] ?? 0), 0)

        const correctA = sum(match.player_a, 'correct_count')
        const correctB = sum(match.player_b, 'correct_count')
        const timeA = sum(match.player_a, 'time_taken_ms')
        const timeB = sum(match.player_b, 'time_taken_ms')

        let winner: string | null = null
        if (correctA > correctB) winner = match.player_a
        else if (correctB > correctA) winner = match.player_b
        else if (timeA < timeB) winner = match.player_a
        else if (timeB < timeA) winner = match.player_b

        await admin.from('matches').update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          winner,
        }).eq('id', matchId)

        // Update ELO + stats for both players
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, elo, matches_played, matches_won')
          .in('id', [match.player_a, match.player_b])

        const profA = profiles?.find(p => p.id === match.player_a)
        const profB = profiles?.find(p => p.id === match.player_b)

        if (profA && profB) {
          const aWon = winner === match.player_a
          const drew = winner === null
          const newEloA = calcElo(profA.elo, profB.elo, aWon, drew)
          const newEloB = calcElo(profB.elo, profA.elo, !aWon && !drew, drew)

          await Promise.all([
            admin.from('profiles').update({
              elo: newEloA,
              division: getDivision(newEloA),
              matches_played: profA.matches_played + 1,
              matches_won: profA.matches_won + (aWon ? 1 : 0),
            }).eq('id', match.player_a),
            admin.from('profiles').update({
              elo: newEloB,
              division: getDivision(newEloB),
              matches_played: profB.matches_played + 1,
              matches_won: profB.matches_won + (!aWon && !drew ? 1 : 0),
            }).eq('id', match.player_b),
          ])
        }

        matchComplete = true
      } else {
        // Advance to next round, A's turn again
        await admin.from('matches').update({
          status: 'a_turn',
          current_round: match.current_round + 1,
        }).eq('id', matchId)
      }
    }
  }

  return NextResponse.json({
    correct,
    correctOption: question.correct,
    explanation: question.explanation ?? null,
    points,
    roundComplete: isRoundComplete,
    matchComplete,
  })
}
