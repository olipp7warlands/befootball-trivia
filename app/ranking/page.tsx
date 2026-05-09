import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, RankingWeekly, Division } from '@/lib/types'
import RankingTabs from './RankingTabs'

type WeeklyRow = RankingWeekly & {
  profiles: Pick<Profile, 'username' | 'country_code' | 'elo' | 'division' | 'card_seed'>
}

export default async function RankingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch all data in parallel
  const [
    weeklyResult,
    globalResult,
    currentProfileResult,
  ] = await Promise.all([
    supabase
      .from('rankings_weekly')
      .select('*, profiles(username, country_code, elo, division, card_seed)')
      .order('points', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .order('elo', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
  ])

  const currentProfile = currentProfileResult.data as Profile | null

  // If rankings_weekly is empty, fall back to profiles for weekly tab too
  let weeklyRows: WeeklyRow[] = (weeklyResult.data ?? []) as WeeklyRow[]
  const globalProfiles: Profile[] = (globalResult.data ?? []) as Profile[]

  // Fallback: synthesise weekly rows from profiles when table is empty
  if (weeklyRows.length === 0) {
    weeklyRows = globalProfiles.map((p) => ({
      user_id: p.id,
      week_start: new Date().toISOString(),
      points: p.elo,
      matches: p.matches_played,
      rank_global: null,
      rank_country: null,
      updated_at: new Date().toISOString(),
      profiles: {
        username: p.username,
        country_code: p.country_code,
        elo: p.elo,
        division: p.division,
        card_seed: p.card_seed,
      },
    }))
  }

  // Country tab: same country as current user, ordered by ELO
  const countryCode = currentProfile?.country_code ?? null
  let countryProfiles: Profile[] = []
  if (countryCode) {
    const { data: cp } = await supabase
      .from('profiles')
      .select('*')
      .eq('country_code', countryCode)
      .order('elo', { ascending: false })
      .limit(20)
    countryProfiles = (cp ?? []) as Profile[]
  }

  // Current user global rank (approximate via count)
  let currentUserGlobalRank: number | null = null
  let currentUserWeeklyRank: number | null = null
  if (currentProfile) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('elo', currentProfile.elo)
    currentUserGlobalRank = (count ?? 0) + 1

    // Weekly rank approximation
    const { count: wCount } = await supabase
      .from('rankings_weekly')
      .select('user_id', { count: 'exact', head: true })
      .gt('points', currentProfile.elo)
    currentUserWeeklyRank = (wCount ?? 0) + 1
  }

  return (
    <div
      className="relative min-h-dvh overflow-hidden px-4 py-8"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 50% 20%, #2a1260 0%, #0a0420 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #5B2AF3 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto max-w-md">
        <header className="mb-8">
          <h1
            className="text-4xl font-black tracking-tight text-white"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            CLASIFICACIÓN
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-lavender">
            Top jugadores de la semana y todos los tiempos
          </p>
        </header>

        <RankingTabs
          weekly={weeklyRows}
          global={globalProfiles}
          country={countryProfiles}
          currentUserId={user.id}
          currentUserElo={currentProfile?.elo ?? null}
          currentUserDivision={(currentProfile?.division ?? null) as Division | null}
          currentUserUsername={currentProfile?.username ?? null}
          currentUserCountry={currentProfile?.country_code ?? null}
          currentUserGlobalRank={currentUserGlobalRank}
          currentUserWeeklyRank={currentUserWeeklyRank}
        />
      </div>
    </div>
  )
}
