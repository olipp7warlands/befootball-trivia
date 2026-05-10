/**
 * Demo M5.2: Exercises findOpponent + selectQuestionsForMatch + match/round insertion.
 * Bypasses HTTP (cookie auth is browser-specific) and calls logic directly.
 * Run: npx tsx scripts/demo-match-api.ts
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

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Create test user + profile ──────────────────────────────────────
  const testEmail = `demo-m52-${Date.now()}@test.local`
  const testPass = 'DemoM52Pass!'

  const { data: newUser } = await admin.auth.admin.createUser({
    email: testEmail, password: testPass, email_confirm: true,
  })
  if (!newUser?.user) throw new Error('User creation failed')
  const userId = newUser.user.id

  await admin.from('profiles').insert({
    id: userId, email: testEmail,
    username: `demo${Date.now().toString().slice(-5)}`,
    country_code: 'ES', elo: 1000, division: 'bronze', card_seed: 2,
  })
  console.log(`\n✓ Test user: ${testEmail.split('@')[0]} (ELO 1000, Bronze)\n`)

  try {
    // Import business logic modules directly
    const { findOpponent } = await import('../lib/match/find-opponent')
    const { selectQuestionsForMatch } = await import('../lib/match/select-questions')
    const { shuffleArray } = await import('../lib/game/questions')

    const ALL_CATS = ['finales','goleadores','sedes','anecdotas','records','decadas']
    const categories = shuffleArray([...ALL_CATS]).slice(0, 3) as [string,string,string]
    console.log(`Selected categories: ${categories.join(', ')}\n`)

    // ── 2. Find opponent ──────────────────────────────────────────────────
    console.log('═══ findOpponent (ELO 1000, ES) ═══')
    const { profile: opponent, isBot } = await findOpponent({
      userId, userElo: 1000, userCountry: 'ES', adminSupabase: admin,
    })
    console.log(`Opponent: ${opponent.username} | ELO ${opponent.elo} | ${opponent.country_code} | ${opponent.division} | isBot=${isBot}`)
    console.log()

    // ── 3. Select questions ───────────────────────────────────────────────
    console.log('═══ selectQuestionsForMatch ═══')
    const rounds = await selectQuestionsForMatch({
      userId, division: 'bronze', categories, supabase: admin,
    })
    rounds.forEach((r, i) => {
      const ids = r.questionIds.join(', ')
      const diffs = r.questions.map(q => (q as any).diff ?? '?')
      console.log(`Round ${i+1} [${r.category}]: ${r.questionIds.length} questions | IDs: ${ids.slice(0,60)}...`)
      console.log(`         First q: "${r.questions[0]?.q?.slice(0,60)}..."`)
    })
    console.log()

    // ── 4. Insert match ───────────────────────────────────────────────────
    const allIds = rounds.flatMap(r => r.questionIds)
    const { data: match, error: matchErr } = await admin.from('matches').insert({
      player_a: userId,
      player_b: opponent.id,
      status: 'a_turn',
      current_round: 1,
      selected_categories: categories,
      questions_used: allIds,
      started_at: new Date().toISOString(),
    }).select('id, status, player_a, player_b').single()
    if (matchErr) throw new Error(`Match insert: ${matchErr.message}`)
    console.log('═══ POST /api/match/new response (simulated) ═══')
    console.log(JSON.stringify({
      matchId: match.id,
      opponent: { id: opponent.id, username: opponent.username, country_code: opponent.country_code, elo: opponent.elo, division: opponent.division, card_seed: opponent.card_seed },
      selectedCategories: categories,
      status: 'a_turn',
    }, null, 2))

    // ── 5. Insert 6 match_round rows ──────────────────────────────────────
    await Promise.all(
      rounds.flatMap((r, i) =>
        [userId, opponent.id].map(playerId =>
          admin.from('match_rounds').insert({
            match_id: match.id,
            round_num: i + 1,
            player: playerId,
            category: r.category,
            questions: r.questionIds,
          })
        )
      )
    )

    // ── 6. Verify BD ──────────────────────────────────────────────────────
    console.log('\n═══ BD verification ═══')
    const { data: matchRow } = await admin.from('matches').select('id, status, player_a, player_b').eq('id', match.id).single()
    console.log('Match row:', matchRow)

    const { data: roundRows } = await admin.from('match_rounds').select('round_num, player, category, questions').eq('match_id', match.id)
    console.log(`match_rounds: ${roundRows?.length} rows`)
    roundRows?.forEach((r: any) =>
      console.log(`  Round ${r.round_num} | player ${r.player === userId ? '[YOU]' : '[OPPONENT]'} | cat: ${r.category} | questions: [${r.questions?.length} IDs]`)
    )

    // ── 7. Simulate GET /api/match/[id]/state ────────────────────────────
    console.log(`\n═══ GET /api/match/${match.id}/state (simulated) ═══`)
    const qIds = rounds[0]?.questionIds ?? []
    const { data: qs } = await admin.from('questions').select('id, q, options').in('id', qIds)
    const stateResponse = {
      matchId: match.id,
      status: 'a_turn',
      currentRound: 1,
      selectedCategories: categories,
      yourSide: 'a',
      opponent: { username: opponent.username, elo: opponent.elo, division: opponent.division },
      rounds: rounds.map((r, i) => ({
        num: i + 1,
        category: r.category,
        yourAnswers: null,
        yourCorrectCount: null,
        opponentCorrectCount: null,
        questions: (i === 0 ? qs ?? [] : r.questions).map((q: any) => ({
          id: q.id,
          q: q.q,
          options: q.options,
          // correct NOT included since user hasn't answered yet
        })),
      })),
      yourScore: 0,
      opponentScore: null,
    }
    console.log(JSON.stringify(stateResponse, null, 2))

  } finally {
    // ── Cleanup ────────────────────────────────────────────────────────────
    await admin.auth.admin.deleteUser(userId)
    console.log('\n✓ Test user cleaned up')
  }
}

main().catch(console.error)
