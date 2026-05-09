import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Achievement, UserAchievement, Profile } from '@/lib/types'
import AchievementTabs from './AchievementTabs'

function computeProgress(achievementId: string, profile: Profile): number | undefined {
  if (achievementId === 'hat-trick') {
    return Math.min(100, (profile.current_streak / 3) * 100)
  }
  if (achievementId === 'pichichi') {
    return Math.min(100, (profile.total_correct / 100) * 100)
  }
  if (achievementId === 'elite-befootball') {
    return Math.min(100, (profile.elo / 1800) * 100)
  }
  return undefined
}

export default async function AchievementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [profileResult, achievementsResult, userAchievementsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('achievements').select('*').order('rarity', { ascending: false }),
    supabase.from('user_achievements').select('*').eq('user_id', user.id),
  ])

  const profile = profileResult.data as Profile | null
  if (!profile) redirect('/')

  const achievements = (achievementsResult.data ?? []) as Achievement[]
  const userAchievements = (userAchievementsResult.data ?? []) as UserAchievement[]

  const unlockedMap = new Map<string, string>( // id -> unlocked_at
    userAchievements.map((ua) => [ua.achievement_id, ua.unlocked_at])
  )

  const items = achievements.map((ach) => ({
    achievement: ach,
    unlocked: unlockedMap.has(ach.id),
    progress: computeProgress(ach.id, profile),
    unlockedAt: unlockedMap.get(ach.id) ?? null,
  }))

  // Elite achievement data for the hero tile
  const eliteAchievement = achievements.find((a) => a.id === 'elite-befootball') ?? {
    id: 'elite-befootball',
    name: 'Élite Befootball',
    description: 'Alcanza el ELO 1800 y únete a la élite de jugadores mundiales.',
    icon: 'crown',
    rarity: 'legendary' as const,
    condition: {},
  }
  const eliteProgress = Math.min(100, (profile.elo / 1800) * 100)
  const eliteUnlocked = unlockedMap.has('elite-befootball')
  const eliteUnlockedAt = unlockedMap.get('elite-befootball') ?? null

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
        className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #67D7A8 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto max-w-md">
        <AchievementTabs
          items={items}
          eliteAchievement={eliteAchievement}
          eliteUnlocked={eliteUnlocked}
          eliteProgress={eliteProgress}
          eliteUnlockedAt={eliteUnlockedAt}
          totalCount={achievements.length}
          unlockedCount={unlockedMap.size}
        />
      </div>
    </div>
  )
}
