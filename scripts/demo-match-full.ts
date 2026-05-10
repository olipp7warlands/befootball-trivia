/**
 * Simulates a complete async PVP match end-to-end:
 * - Match creation (M5.2 logic)
 * - All 9 answers per player (3 rounds × 3 questions)
 * - Status transitions at each step
 * - Final ELO update
 * Run: npx tsx scripts/demo-match-full.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}

import { createClient as createSupabase } from '@supabase/supabase-js'
import { calcScore } from '../lib/game/scoring'
import { calcElo, getDivision } from '../lib/game/elo'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY!

function separator(label: string) {
  console.log(`\n${'─'.repeat(52)}`)
  console.log(`  ${label}`)
  console.log('─'.repeat(52))
}

async function main() {
  const admin = createSupabase(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } })

  // ── 1. Create two test users ──────────────────────────────────────────────
  const [ua, ub] = await Promise.all([
    admin.auth.admin.createUser({ email: `full-a-${Date.now()}@t.local`, password: 'P1', email_confirm: true }),
    admin.auth.admin.createUser({ email: `full-b-${Date.now()}@t.local`, password: 'P2', email_confirm: true }),
  ])
  const idA = ua.data!.user!.id, idB = ub.data!.user!.id

  await admin.from('profiles').insert([
    { id: idA, email: `full-a@t.local`, username: 'PlayerA', country_code: 'ES', elo: 1050, division: 'silver', card_seed: 0 },
    { id: idB, email: `full-b@t.local`, username: 'PlayerB', country_code: 'AR', elo: 980, division: 'bronze', card_seed: 1 },
  ])

  separator('SETUP')
  console.log('PlayerA  ELO 1050  Silver  (ES)')
  console.log('PlayerB  ELO  980  Bronze  (AR)')

  try {
    // ── 2. Create match (same logic as POST /api/match/new) ──────────────────
    const { shuffleArray } = await import('../lib/game/questions')
    const { selectQuestionsForMatch } = await import('../lib/match/select-questions')

    const ALL_CATS = ['finales','goleadores','sedes','anecdotas','records','decadas']
    const categories = shuffleArray([...ALL_CATS]).slice(0, 3) as [string,string,string]
    const rounds = await selectQuestionsForMatch({ userId: idA, division: 'silver', categories, supabase: admin })

    const allIds = rounds.flatMap(r => r.questionIds)
    const { data: match } = await admin.from('matches').insert({
      player_a: idA, player_b: idB, status: 'a_turn', current_round: 1,
      selected_categories: categories, questions_used: allIds,
      started_at: new Date().toISOString(),
    }).select('id').single()
    const matchId = match!.id

    await Promise.all(
      rounds.flatMap((r, i) =>
        [idA, idB].map(pid =>
          admin.from('match_rounds').insert({ match_id: matchId, round_num: i+1, player: pid, category: r.category, questions: r.questionIds })
        )
      )
    )

    separator(`MATCH CREATED: ${matchId.slice(0, 8)}...`)
    console.log(`Categories: ${categories.join(' | ')}`)
    rounds.forEach((r, i) => console.log(`  Round ${i+1} [${r.category}]: ${r.questionIds.join(', ')}`))

    // Fetch correct answers for all questions upfront
    const allQData: Record<string, { correct: number; explanation: string }> = {}
    for (const { data: qs } of [await admin.from('questions').select('id, correct, explanation').in('id', allIds)]) {
      for (const q of (qs ?? [])) allQData[q.id] = { correct: q.correct, explanation: q.explanation }
    }

    // ── 3. Simulate answers ───────────────────────────────────────────────────
    // Helper: answer a question as a given player, applying the endpoint logic
    async function answer(playerId: string, questionId: string, simulatedTimMs = 5000): Promise<void> {
      const { data: currentMatch } = await admin.from('matches').select('*').eq('id', matchId).single()
      const { data: round } = await admin.from('match_rounds').select('*')
        .eq('match_id', matchId).eq('round_num', currentMatch!.current_round).eq('player', playerId).single()

      const existingAnswers: any[] = round!.answers ?? []
      const qData = allQData[questionId]
      const correct = qData.correct
      const points = calcScore(true, simulatedTimMs) // simulate always correct for drama-free demo

      const newAnswer = { questionId, selectedOption: correct, timeTakenMs: simulatedTimMs, correct: true, points }
      const updatedAnswers = [...existingAnswers, newAnswer]
      const isRoundComplete = updatedAnswers.length === (round!.questions as string[]).length

      const update: any = { answers: updatedAnswers }
      if (isRoundComplete) {
        update.correct_count = updatedAnswers.filter((a: any) => a.correct).length
        update.time_taken_ms = updatedAnswers.reduce((s: number, a: any) => s + a.timeTakenMs, 0)
        update.played_at = new Date().toISOString()
      }
      await admin.from('match_rounds').update(update).eq('id', round!.id)

      if (isRoundComplete) {
        const isA = playerId === idA
        if (currentMatch!.status === 'a_turn') {
          await admin.from('matches').update({ status: 'b_turn' }).eq('id', matchId)
        } else if (currentMatch!.current_round >= 3) {
          // Finish
          const { data: allR } = await admin.from('match_rounds').select('player, correct_count, time_taken_ms').eq('match_id', matchId)
          const correctA = (allR ?? []).filter(r => r.player === idA).reduce((s, r) => s + (r.correct_count ?? 0), 0)
          const correctB = (allR ?? []).filter(r => r.player === idB).reduce((s, r) => s + (r.correct_count ?? 0), 0)
          const timeA = (allR ?? []).filter(r => r.player === idA).reduce((s, r) => s + (r.time_taken_ms ?? 0), 0)
          const timeB = (allR ?? []).filter(r => r.player === idB).reduce((s, r) => s + (r.time_taken_ms ?? 0), 0)

          let winner: string | null = null
          if (correctA > correctB) winner = idA
          else if (correctB > correctA) winner = idB
          else if (timeA < timeB) winner = idA
          else if (timeB < timeA) winner = idB

          await admin.from('matches').update({ status: 'finished', finished_at: new Date().toISOString(), winner }).eq('id', matchId)

          const { data: profs } = await admin.from('profiles').select('id, elo, matches_played, matches_won').in('id', [idA, idB])
          const pA = profs!.find(p => p.id === idA)!
          const pB = profs!.find(p => p.id === idB)!
          const aWon = winner === idA
          const drew = winner === null
          const newEA = calcElo(pA.elo, pB.elo, aWon, drew)
          const newEB = calcElo(pB.elo, pA.elo, !aWon && !drew, drew)
          await admin.from('profiles').update({ elo: newEA, division: getDivision(newEA), matches_played: pA.matches_played + 1, matches_won: pA.matches_won + (aWon ? 1 : 0) }).eq('id', idA)
          await admin.from('profiles').update({ elo: newEB, division: getDivision(newEB), matches_played: pB.matches_played + 1, matches_won: pB.matches_won + (!aWon && !drew ? 1 : 0) }).eq('id', idB)
        } else {
          await admin.from('matches').update({ status: 'a_turn', current_round: currentMatch!.current_round + 1 }).eq('id', matchId)
        }
      }
    }

    async function getStatus(): Promise<string> {
      const { data: m } = await admin.from('matches').select('status, current_round').eq('id', matchId).single()
      return `status=${m!.status}  round=${m!.current_round}`
    }

    // Round 1
    separator('ROUND 1')
    console.log(`  [${categories[0]}]`)
    for (const qId of rounds[0].questionIds) {
      await answer(idA, qId, 4000 + Math.random() * 3000)
      console.log(`  A answers ${qId} (correct, ~5s)  →  ${await getStatus()}`)
    }
    for (const qId of rounds[0].questionIds) {
      await answer(idB, qId, 6000 + Math.random() * 4000)
      console.log(`  B answers ${qId} (correct, ~8s)  →  ${await getStatus()}`)
    }

    // Round 2
    separator('ROUND 2')
    console.log(`  [${categories[1]}]`)
    for (const qId of rounds[1].questionIds) {
      await answer(idA, qId, 3500)
      console.log(`  A answers ${qId}  →  ${await getStatus()}`)
    }
    for (const qId of rounds[1].questionIds) {
      await answer(idB, qId, 9000)
      console.log(`  B answers ${qId}  →  ${await getStatus()}`)
    }

    // Round 3
    separator('ROUND 3')
    console.log(`  [${categories[2]}]`)
    for (const qId of rounds[2].questionIds) {
      await answer(idA, qId, 2500)  // fast!
      console.log(`  A answers ${qId}  →  ${await getStatus()}`)
    }
    for (const qId of rounds[2].questionIds) {
      await answer(idB, qId, 11000)
      console.log(`  B answers ${qId}  →  ${await getStatus()}`)
    }

    // ── 4. Final results ──────────────────────────────────────────────────────
    separator('FINAL RESULTS')
    const { data: finalMatch } = await admin.from('matches').select('status, winner').eq('id', matchId).single()
    const { data: allR } = await admin.from('match_rounds').select('player, correct_count, time_taken_ms').eq('match_id', matchId)
    const correctA = (allR ?? []).filter(r => r.player === idA).reduce((s, r) => s + (r.correct_count ?? 0), 0)
    const correctB = (allR ?? []).filter(r => r.player === idB).reduce((s, r) => s + (r.correct_count ?? 0), 0)
    const totalTimeA = (allR ?? []).filter(r => r.player === idA).reduce((s, r) => s + (r.time_taken_ms ?? 0), 0)
    const totalTimeB = (allR ?? []).filter(r => r.player === idB).reduce((s, r) => s + (r.time_taken_ms ?? 0), 0)

    const { data: finalProfs } = await admin.from('profiles').select('id, username, elo, division').in('id', [idA, idB])
    const profA = finalProfs!.find(p => p.id === idA)!
    const profB = finalProfs!.find(p => p.id === idB)!

    const winnerName = finalMatch!.winner === idA ? 'PlayerA' : finalMatch!.winner === idB ? 'PlayerB' : 'Draw'

    console.log(`Match status: ${finalMatch!.status}`)
    console.log(`Winner: ${winnerName}`)
    console.log()
    console.log(`PlayerA  correct: ${correctA}/9  total_time: ${(totalTimeA/1000).toFixed(1)}s`)
    console.log(`         ELO: 1050 → ${profA.elo}  (${profA.elo > 1050 ? '+' : ''}${profA.elo - 1050})  div: ${profA.division}`)
    console.log()
    console.log(`PlayerB  correct: ${correctB}/9  total_time: ${(totalTimeB/1000).toFixed(1)}s`)
    console.log(`         ELO: 980 → ${profB.elo}  (${profB.elo > 980 ? '+' : ''}${profB.elo - 980})  div: ${profB.division}`)
    console.log()
    console.log(`(A was faster: ${(totalTimeA/1000).toFixed(1)}s vs ${(totalTimeB/1000).toFixed(1)}s → determines winner when tied)`)

  } finally {
    await admin.auth.admin.deleteUser(idA)
    await admin.auth.admin.deleteUser(idB)
    console.log('\n✓ Test users cleaned up')
  }
}

main().catch(console.error)
