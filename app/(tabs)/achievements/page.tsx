import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Achievement, UserAchievement, Profile } from '@/lib/types'
import AchievementTabs from './AchievementTabs'

function computeProgress(achievementId: string, profile: Profile): number | undefined {
  if (achievementId === 'hat-trick') return Math.min(100, (profile.current_streak / 3) * 100)
  if (achievementId === 'pichichi') return Math.min(100, (profile.total_correct / 100) * 100)
  if (achievementId === 'elite-befootball') return Math.min(100, (profile.elo / 1800) * 100)
  return undefined
}

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const unlockedMap = new Map<string, string>(userAchievements.map((ua) => [ua.achievement_id, ua.unlocked_at]))

  const items = achievements.map((ach) => ({
    achievement: ach,
    unlocked: unlockedMap.has(ach.id),
    progress: computeProgress(ach.id, profile),
    unlockedAt: unlockedMap.get(ach.id) ?? null,
  }))

  const eliteAchievement = achievements.find((a) => a.id === 'elite-befootball') ?? {
    id: 'elite-befootball', name: 'Élite Befootball',
    description: 'Alcanza el ELO 1800 y únete a la élite de jugadores mundiales.',
    icon: 'crown', rarity: 'legendary' as const, condition: {},
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <AchievementTabs
        items={items}
        eliteAchievement={eliteAchievement}
        eliteUnlocked={unlockedMap.has('elite-befootball')}
        eliteProgress={Math.min(100, (profile.elo / 1800) * 100)}
        eliteUnlockedAt={unlockedMap.get('elite-befootball') ?? null}
        totalCount={achievements.length}
        unlockedCount={unlockedMap.size}
      />
    </div>
  )
}
