import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, RankingWeekly, Division } from '@/lib/types'
import RankingTabs from './RankingTabs'

type WeeklyRow = RankingWeekly & {
  profiles: Pick<Profile, 'username' | 'country_code' | 'elo' | 'division' | 'card_seed'>
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [weeklyResult, globalResult, currentProfileResult] = await Promise.all([
    supabase.from('rankings_weekly').select('*, profiles(username, country_code, elo, division, card_seed)').order('points', { ascending: false }).limit(20),
    supabase.from('profiles').select('*').order('elo', { ascending: false }).limit(20),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const currentProfile = currentProfileResult.data as Profile | null
  let weeklyRows: WeeklyRow[] = (weeklyResult.data ?? []) as WeeklyRow[]
  const globalProfiles: Profile[] = (globalResult.data ?? []) as Profile[]

  if (weeklyRows.length === 0) {
    weeklyRows = globalProfiles.map((p) => ({
      user_id: p.id, week_start: new Date().toISOString(),
      points: p.elo, matches: p.matches_played,
      rank_global: null, rank_country: null, updated_at: new Date().toISOString(),
      profiles: { username: p.username, country_code: p.country_code, elo: p.elo, division: p.division, card_seed: p.card_seed },
    }))
  }

  const countryCode = currentProfile?.country_code ?? null
  let countryProfiles: Profile[] = []
  if (countryCode) {
    const { data: cp } = await supabase.from('profiles').select('*').eq('country_code', countryCode).order('elo', { ascending: false }).limit(20)
    countryProfiles = (cp ?? []) as Profile[]
  }

  let currentUserGlobalRank: number | null = null
  let currentUserWeeklyRank: number | null = null
  if (currentProfile) {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('elo', currentProfile.elo)
    currentUserGlobalRank = (count ?? 0) + 1
    const { count: wCount } = await supabase.from('rankings_weekly').select('user_id', { count: 'exact', head: true }).gt('points', currentProfile.elo)
    currentUserWeeklyRank = (wCount ?? 0) + 1
  }

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>
        — CLASIFICACIÓN
      </p>
      <RankingTabs
        weekly={weeklyRows} global={globalProfiles} country={countryProfiles}
        currentUserId={user.id} currentUserElo={currentProfile?.elo ?? null}
        currentUserDivision={(currentProfile?.division ?? null) as Division | null}
        currentUserUsername={currentProfile?.username ?? null}
        currentUserCountry={currentProfile?.country_code ?? null}
        currentUserGlobalRank={currentUserGlobalRank}
        currentUserWeeklyRank={currentUserWeeklyRank}
      />
    </div>
  )
}
