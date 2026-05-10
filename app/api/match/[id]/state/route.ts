import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params

  const supabase = await createClient()
  const admin = createAdminClient()

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Read match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // 4. Verify user is a participant
  if (match.player_a !== user.id && match.player_b !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. Determine which side the user is on
  const yourSide: 'a' | 'b' = user.id === match.player_a ? 'a' : 'b'
  const opponentId: string = yourSide === 'a' ? match.player_b : match.player_a

  // 6. Read opponent profile (use admin to avoid leaking is_bot)
  const { data: opponentProfile } = await admin
    .from('profiles')
    .select('id, username, country_code, elo, division, card_seed')
    .eq('id', opponentId)
    .single()

  // 7. Read all match_rounds for this match
  const { data: allRounds } = await admin
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)

  const rounds = allRounds ?? []

  // 8. Build per-round data
  const roundsOutput = []
  let yourScore = 0
  let opponentScoreTotal = 0
  let opponentAllPlayed = true

  for (let n = 1; n <= 3; n++) {
    const yourRound = rounds.find((r: any) => r.round_num === n && r.player === user.id)
    const opponentRound = rounds.find((r: any) => r.round_num === n && r.player === opponentId)

    // Get question IDs from your round, fall back to opponent's
    const questionIds: string[] =
      yourRound?.questions ?? opponentRound?.questions ?? []

    // Fetch full question data
    let questionsData: any[] = []
    if (questionIds.length > 0) {
      const { data: qData } = await admin
        .from('questions')
        .select('id, q, options, correct, explanation')
        .in('id', questionIds)

      questionsData = qData ?? []
    }

    const yourAnswers = yourRound?.answers ?? null
    const youPlayed = yourAnswers !== null

    // Build question objects, hiding correct/explanation if not yet played
    const questionsOutput = questionIds
      .map((qId: string) => {
        const q = questionsData.find((d: any) => d.id === qId)
        if (!q) return null
        if (youPlayed) {
          return { id: q.id, q: q.q, options: q.options, correct: q.correct, explanation: q.explanation }
        }
        return { id: q.id, q: q.q, options: q.options }
      })
      .filter(Boolean)

    const yourCorrectCount: number | null = yourRound?.correct_count ?? null
    const opponentAnswers = opponentRound?.answers ?? null
    const opponentCorrectCount: number | null =
      youPlayed && opponentAnswers !== null ? opponentRound?.correct_count ?? null : null

    if (yourCorrectCount !== null) {
      yourScore += yourCorrectCount * 100
    }

    if (opponentRound?.correct_count == null) {
      opponentAllPlayed = false
    } else {
      opponentScoreTotal += opponentRound.correct_count * 100
    }

    // Category: prefer your round row, fallback to opponent's, then from match
    const category =
      yourRound?.category ??
      opponentRound?.category ??
      (match.selected_categories?.[n - 1] ?? null)

    roundsOutput.push({
      num: n,
      category,
      yourAnswers,
      yourCorrectCount,
      opponentCorrectCount,
      questions: questionsOutput,
    })
  }

  // 9-10. Build final response
  return NextResponse.json({
    matchId,
    status: match.status,
    currentRound: match.current_round,
    selectedCategories: match.selected_categories,
    yourSide,
    opponent: opponentProfile
      ? {
          id: opponentProfile.id,
          username: opponentProfile.username,
          country_code: opponentProfile.country_code,
          elo: opponentProfile.elo,
          division: opponentProfile.division,
          card_seed: opponentProfile.card_seed,
        }
      : null,
    rounds: roundsOutput,
    yourScore,
    opponentScore: opponentAllPlayed ? opponentScoreTotal : null,
  })
}
