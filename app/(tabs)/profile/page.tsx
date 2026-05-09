import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Achievement, UserAchievement, MatchRound, QuestionCategory } from '@/lib/types'
import CategoryBars from './CategoryBars'
import { CrystalCard, Avatar, Flag, DivisionPill } from '@/components/ui'

function computeNextAchievement(profile: Profile, userIds: Set<string>, achievements: Achievement[]) {
  const candidates: { name: string; icon: string; progress: number }[] = []
  for (const ach of achievements) {
    if (userIds.has(ach.id)) continue
    let progress = 0
    if (ach.id === 'hat-trick') progress = Math.min(100, (profile.current_streak / 3) * 100)
    else if (ach.id === 'pichichi') progress = Math.min(100, (profile.total_correct / 100) * 100)
    else if (ach.id === 'elite-befootball') progress = Math.min(100, (profile.elo / 1800) * 100)
    else continue
    candidates.push({ name: ach.name, icon: ach.icon, progress })
  }
  if (!candidates.length) return null
  return candidates.sort((a, b) => b.progress - a.progress)[0]
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileResult, achievementsResult, userAchievementsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('*').eq('user_id', user.id),
  ])

  const profile = profileResult.data as Profile | null
  if (!profile) redirect('/')

  const achievements = (achievementsResult.data ?? []) as Achievement[]
  const userAchievements = (userAchievementsResult.data ?? []) as UserAchievement[]
  const userAchievementIds = new Set(userAchievements.map((ua) => ua.achievement_id))

  const { data: rounds } = await supabase.from('match_rounds').select('category, correct_count, questions').eq('player', user.id).not('correct_count', 'is', null)

  type CategoryStat = { category: QuestionCategory; accuracy: number; total: number }
  const categoryStats: CategoryStat[] = []
  if (rounds?.length) {
    const byCategory: Record<string, { correct: number; total: number }> = {}
    for (const r of rounds as MatchRound[]) {
      if (!byCategory[r.category]) byCategory[r.category] = { correct: 0, total: 0 }
      byCategory[r.category].correct += r.correct_count ?? 0
      byCategory[r.category].total += r.questions.length
    }
    for (const [cat, { correct, total }] of Object.entries(byCategory)) {
      categoryStats.push({ category: cat as QuestionCategory, accuracy: total > 0 ? (correct / total) * 100 : 0, total })
    }
  }

  const nextAchievement = computeNextAchievement(profile, userAchievementIds, achievements)
  const accuracy = profile.total_questions > 0 ? Math.round((profile.total_correct / profile.total_questions) * 100) : 0
  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 20px' }}>
      {/* Mini-Pass card */}
      <CrystalCard seed={profile.card_seed} aspectRatio="138/200">
        <div style={{ padding: '13px 14px 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#180E33' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '10px' }}>BEFOOTBALL · ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flag code={profile.country_code} size={14} />
              <Avatar cardSeed={profile.card_seed} initials={initials} size={24} />
            </div>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.03em', lineHeight: 0.92 }}>{profile.username}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', opacity: 0.6, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '3px' }}>
              {profile.country_code} · #— global
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>— Puntos</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px' }}>{profile.elo.toLocaleString('es')}</p>
            </div>
            <DivisionPill division={profile.division} />
          </div>
        </div>
      </CrystalCard>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px' }}>
        {[
          { label: 'Partidas', value: String(profile.matches_played), accent: false },
          { label: 'Aciertos', value: `${accuracy}%`, accent: true },
          { label: 'Racha', value: String(profile.current_streak), accent: false },
          { label: 'Mejor', value: String(profile.best_streak), accent: false },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRadius: '10px', border: '1px solid rgba(148,116,246,0.12)', background: 'rgba(148,116,246,0.05)', padding: '9px 4px', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: s.accent ? '#67D7A8' : '#F1F1F1', lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Category bars */}
      <section>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#DED8FA', opacity: 0.85, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '9px' }}>— TU MEJOR CATEGORÍA</p>
        <div style={{ borderRadius: '10px', border: '1px solid rgba(148,116,246,0.12)', background: 'rgba(148,116,246,0.05)', padding: '12px' }}>
          <CategoryBars stats={categoryStats} />
        </div>
      </section>

      {/* Next achievement */}
      {nextAchievement && (
        <section>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#DED8FA', opacity: 0.85, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '9px' }}>— PRÓXIMO LOGRO</p>
          <div style={{ background: 'rgba(91,42,243,0.10)', border: '1px solid rgba(91,42,243,0.30)', borderRadius: '11px', padding: '10px 11px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(148,116,246,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              🏆
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '10.5px', color: '#F1F1F1', marginBottom: '5px' }}>{nextAchievement.name}</p>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${nextAchievement.progress}%`, background: '#9474F6', borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', color: '#9474F6', flexShrink: 0 }}>
              {Math.round(nextAchievement.progress)}%
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
