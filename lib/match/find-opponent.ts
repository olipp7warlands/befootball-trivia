import { generateBotProfile } from '@/lib/bots/generate-bot-profile'

export async function findOpponent(opts: {
  userId: string
  userElo: number
  userCountry: string
  adminSupabase: any
}): Promise<{
  profile: { id: string; username: string; country_code: string; elo: number; division: string; card_seed: number }
  isBot: boolean
}> {
  const { userId, userElo, userCountry, adminSupabase } = opts

  // Step 1: Find IDs of users currently in active matches with this user
  const { data: activeMatches } = await adminSupabase
    .from('matches')
    .select('player_a, player_b')
    .or(`player_a.eq.${userId},player_b.eq.${userId}`)
    .in('status', ['a_turn', 'b_turn', 'waiting'])

  const activeOpponentIds = new Set<string>()
  if (activeMatches) {
    for (const m of activeMatches) {
      if (m.player_a && m.player_a !== userId) activeOpponentIds.add(m.player_a)
      if (m.player_b && m.player_b !== userId) activeOpponentIds.add(m.player_b)
    }
  }

  // Step 2: Find IDs of last 5 opponents
  const { data: recentMatches } = await adminSupabase
    .from('matches')
    .select('player_a, player_b')
    .or(`player_a.eq.${userId},player_b.eq.${userId}`)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(5)

  const recentOpponentIds = new Set<string>()
  if (recentMatches) {
    for (const m of recentMatches) {
      if (m.player_a && m.player_a !== userId) recentOpponentIds.add(m.player_a)
      if (m.player_b && m.player_b !== userId) recentOpponentIds.add(m.player_b)
    }
  }

  const excludedIds = new Set<string>([...activeOpponentIds, ...recentOpponentIds])

  // Step 3: Query profiles for real candidates
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates } = await adminSupabase
    .from('profiles')
    .select('id, username, country_code, elo, division, card_seed')
    .or('is_bot.eq.false,is_bot.is.null')
    .neq('id', userId)
    .gte('elo', userElo - 100)
    .lte('elo', userElo + 100)
    .gte('last_active_at', sevenDaysAgo)
    .limit(10)

  // Client-side filter: exclude active/recent opponents
  const validCandidates = candidates
    ? candidates.filter((p: any) => !excludedIds.has(p.id))
    : []

  // Step 4: Return a real candidate if available
  if (validCandidates.length > 0) {
    const picked = validCandidates[Math.floor(Math.random() * validCandidates.length)]
    return { profile: picked, isBot: false }
  }

  // Step 5: Fall back to a bot
  const bot = await generateBotProfile({
    userElo,
    userCountry,
    userId,
  })

  return {
    profile: {
      id: bot.id,
      username: bot.username,
      country_code: bot.country_code,
      elo: bot.elo,
      division: bot.division,
      card_seed: bot.card_seed,
    },
    isBot: true,
  }
}
