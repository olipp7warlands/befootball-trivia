import { createAdminClient } from '@/lib/supabase/admin'
import { calcElo, getDivision } from '@/lib/game/elo'

interface BotPlayRoundOpts {
  matchId: string
  botUserId: string
  roundNum: number
}

export async function botPlayRound({ matchId, botUserId, roundNum }: BotPlayRoundOpts): Promise<void> {
  console.log(`[bot] START botPlayRound: match=${matchId} round=${roundNum} bot=${botUserId}`)
  const admin = createAdminClient()

  // ── 1. Load bot profile ──────────────────────────────────────────────────
  const { data: botProfile, error: profErr } = await admin
    .from('profiles')
    .select('id, elo, bot_skill')
    .eq('id', botUserId)
    .single()

  console.log(`[bot] botProfile found=${!!botProfile} bot_skill=${botProfile?.bot_skill} fetchError=${profErr?.message ?? 'none'}`)
  if (!botProfile) {
    console.error(`[bot] ABORT: botProfile not found for bot=${botUserId}`)
    return
  }
  const skill = typeof botProfile.bot_skill === 'number' ? botProfile.bot_skill : 0.55

  // ── 2. Load bot's match_round ────────────────────────────────────────────
  const { data: round, error: roundErr } = await admin
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)
    .eq('round_num', roundNum)
    .eq('player', botUserId)
    .single()

  console.log(`[bot] match_round found=${!!round} round.id=${round?.id} questions=${JSON.stringify(round?.questions ?? null)} fetchError=${roundErr?.message ?? 'none'}`)
  if (!round) {
    console.error(`[bot] ABORT: match_round not found (match=${matchId} round_num=${roundNum} player=${botUserId})`)
    return
  }

  const questionIds: string[] = round.questions ?? []
  console.log(`[bot] questionIds count=${questionIds.length}`)
  if (!questionIds.length) {
    console.error(`[bot] ABORT: no questions in round`)
    return
  }

  // ── 3. Load questions ────────────────────────────────────────────────────
  const { data: questions, error: qErr } = await admin
    .from('questions')
    .select('id, correct')
    .in('id', questionIds)

  console.log(`[bot] questions loaded=${questions?.length ?? 0} fetchError=${qErr?.message ?? 'none'}`)
  if (!questions?.length) {
    console.error(`[bot] ABORT: could not load questions for ids=${questionIds.join(',')}`)
    return
  }
  const qMap = Object.fromEntries(questions.map(q => [q.id, q.correct as number]))

  // ── 4. Simulate answers ──────────────────────────────────────────────────
  const answers: Array<{ questionId: string; selectedOption: number; timeTakenMs: number; correct: boolean; points: number }> = []

  for (const qId of questionIds) {
    const correct = qMap[qId] ?? 0
    const isCorrect = Math.random() < skill
    const selected = isCorrect ? correct : (correct + 1 + Math.floor(Math.random() * 3)) % 4
    const timeMs = Math.floor(4000 + Math.random() * 8000)
    const points = isCorrect
      ? (timeMs < 3000 ? 150 : 100 + Math.max(0, Math.round(50 * (1 - (timeMs - 3000) / 12000))))
      : 0
    answers.push({ questionId: qId, selectedOption: selected, timeTakenMs: timeMs, correct: isCorrect, points })
  }

  const correctCount = answers.filter(a => a.correct).length
  const totalTimeMs = answers.reduce((s, a) => s + a.timeTakenMs, 0)
  console.log(`[bot] Generated ${answers.length} answers: correctCount=${correctCount} totalTimeMs=${totalTimeMs}`)

  // ── 5. Update bot's round ────────────────────────────────────────────────
  const { error: updateRoundErr } = await admin.from('match_rounds').update({
    answers,
    correct_count: correctCount,
    time_taken_ms: totalTimeMs,
    played_at: new Date().toISOString(),
  }).eq('id', round.id)

  console.log(`[bot] match_round updated: error=${updateRoundErr?.message ?? 'none'}`)

  // ── 6. Advance match state ───────────────────────────────────────────────
  const { data: match, error: matchErr } = await admin.from('matches').select('*').eq('id', matchId).single()
  console.log(`[bot] fresh match: current_round=${match?.current_round} status=${match?.status} fetchError=${matchErr?.message ?? 'none'}`)
  if (!match) {
    console.error(`[bot] ABORT: could not load match after round update`)
    return
  }

  if (match.current_round >= 3) {
    console.log(`[bot] Last round. Finishing match...`)
    const { data: allRounds } = await admin
      .from('match_rounds')
      .select('player, correct_count, time_taken_ms')
      .eq('match_id', matchId)

    const sum = (pid: string, field: 'correct_count' | 'time_taken_ms') =>
      (allRounds ?? []).filter(r => r.player === pid).reduce((s, r) => s + (r[field] ?? 0), 0)

    const correctA = sum(match.player_a, 'correct_count')
    const correctB = sum(match.player_b, 'correct_count')
    const timeA = sum(match.player_a, 'time_taken_ms')
    const timeB = sum(match.player_b, 'time_taken_ms')
    console.log(`[bot] Scores: playerA=${correctA}/9 (${timeA}ms) playerB=${correctB}/9 (${timeB}ms)`)

    let winner: string | null = null
    if (correctA > correctB) winner = match.player_a
    else if (correctB > correctA) winner = match.player_b
    else if (timeA < timeB) winner = match.player_a
    else if (timeB < timeA) winner = match.player_b
    console.log(`[bot] Winner: ${winner ?? 'draw'}`)

    const { error: finishErr } = await admin.from('matches').update({
      status: 'finished',
      finished_at: new Date().toISOString(),
      winner,
    }).eq('id', matchId)
    console.log(`[bot] Match finished: error=${finishErr?.message ?? 'none'}`)

    // Update ELO
    const { data: profs } = await admin
      .from('profiles')
      .select('id, elo, matches_played, matches_won')
      .in('id', [match.player_a, match.player_b])

    const pA = profs?.find(p => p.id === match.player_a)
    const pB = profs?.find(p => p.id === match.player_b)

    if (pA && pB) {
      const aWon = winner === match.player_a
      const drew = winner === null
      const newEA = calcElo(pA.elo, pB.elo, aWon, drew)
      const newEB = calcElo(pB.elo, pA.elo, !aWon && !drew, drew)
      console.log(`[bot] ELO update: A ${pA.elo}→${newEA}  B ${pB.elo}→${newEB}`)

      await Promise.all([
        admin.from('profiles').update({
          elo: newEA, division: getDivision(newEA),
          matches_played: pA.matches_played + 1,
          matches_won: pA.matches_won + (aWon ? 1 : 0),
        }).eq('id', match.player_a),
        admin.from('profiles').update({
          elo: newEB, division: getDivision(newEB),
          matches_played: pB.matches_played + 1,
          matches_won: pB.matches_won + (!aWon && !drew ? 1 : 0),
        }).eq('id', match.player_b),
      ])
    }

    console.log(`[bot] DONE: match=${matchId} status=finished winner=${winner ?? 'draw'}`)
  } else {
    // Advance to next round
    const nextRound = match.current_round + 1
    const { error: advanceErr } = await admin.from('matches').update({
      status: 'a_turn',
      current_round: nextRound,
    }).eq('id', matchId)
    console.log(`[bot] DONE: match=${matchId} advanced to round=${nextRound} status=a_turn error=${advanceErr?.message ?? 'none'}`)
  }
}
