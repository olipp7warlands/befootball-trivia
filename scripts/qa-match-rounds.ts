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

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Create 2 test users
  const { data: ua } = await admin.auth.admin.createUser({ email: 'qa-a@test.local', password: 'Qa1pass!', email_confirm: true })
  const { data: ub } = await admin.auth.admin.createUser({ email: 'qa-b@test.local', password: 'Qa1pass!', email_confirm: true })
  await admin.from('profiles').insert([
    { id: ua!.user!.id, email: 'qa-a@test.local', username: 'QA_PlayerA', country_code: 'ES', elo: 1000, division: 'bronze', card_seed: 1 },
    { id: ub!.user!.id, email: 'qa-b@test.local', username: 'QA_PlayerB', country_code: 'AR', elo: 990,  division: 'bronze', card_seed: 2 },
  ])

  // Pick SAME 3 questions per round (identical for both players)
  const q1 = ((await admin.from('questions').select('id').eq('cat','finales').eq('diff',1).limit(3)).data ?? []).map(q=>q.id)
  const q2 = ((await admin.from('questions').select('id').eq('cat','goleadores').eq('diff',1).limit(3)).data ?? []).map(q=>q.id)
  const q3 = ((await admin.from('questions').select('id').eq('cat','sedes').eq('diff',2).limit(3)).data ?? []).map(q=>q.id)

  const { data: match } = await admin.from('matches').insert({
    player_a: ua!.user!.id, player_b: ub!.user!.id,
    status: 'a_turn', current_round: 1,
    selected_categories: ['finales','goleadores','sedes'],
    questions_used: [...q1,...q2,...q3],
    started_at: new Date().toISOString(),
  }).select('id').single()

  // 6 rows: same questions per round, different player UUID
  const insertOps = [
    [q1, 'finales',   1],
    [q2, 'goleadores', 2],
    [q3, 'sedes',      3],
  ].flatMap(([qs, cat, num]) =>
    [ua!.user!.id, ub!.user!.id].map(pid =>
      admin.from('match_rounds').insert({ match_id: match!.id, round_num: num, player: pid, category: cat, questions: qs })
    )
  )
  await Promise.all(insertOps)

  // Query
  const { data: rows } = await admin.from('match_rounds')
    .select('round_num, player, category, questions')
    .eq('match_id', match!.id)
    .order('round_num')

  console.log(`match_id: ${match!.id}\n`)
  rows?.forEach(r => {
    const who = r.player === ua!.user!.id ? 'player_a (QA_PlayerA)' : 'player_b (QA_PlayerB)'
    console.log(`Round ${r.round_num} | player: ${who} | cat: ${r.category}`)
    console.log(`  questions: ${JSON.stringify(r.questions)}`)
  })

  // Cleanup
  await admin.auth.admin.deleteUser(ua!.user!.id)
  await admin.auth.admin.deleteUser(ub!.user!.id)
  console.log('\n(test users deleted — cascade removes match + rounds)')
}

main().catch(console.error)
