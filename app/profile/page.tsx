import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Achievement, UserAchievement, MatchRound, QuestionCategory } from '@/lib/types'
import CategoryBars from './CategoryBars'

function countryFlag(code: string) {
  if (!code || code.length !== 2) return '🏳️'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1F1E0 + c.charCodeAt(0) - 65)
  )
}

function divisionLabel(division: string) {
  const map: Record<string, string> = {
    bronze: 'Bronce',
    silver: 'Plata',
    gold: 'Oro',
    diamond: 'Diamante',
    elite: 'Élite',
  }
  return map[division] ?? division
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-lavender)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-bold text-white"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
    </div>
  )
}

interface NextAchievementData {
  name: string
  icon: string
  progress: number // 0–100
}

function computeNextAchievement(
  profile: Profile,
  userAchievementIds: Set<string>,
  achievements: Achievement[]
): NextAchievementData | null {
  const candidates: (NextAchievementData & { raw: number })[] = []

  for (const ach of achievements) {
    if (userAchievementIds.has(ach.id)) continue
    let progress = 0

    if (ach.id === 'hat-trick') {
      progress = Math.min(100, (profile.current_streak / 3) * 100)
    } else if (ach.id === 'pichichi') {
      progress = Math.min(100, (profile.total_correct / 100) * 100)
    } else if (ach.id === 'elite-befootball') {
      progress = Math.min(100, (profile.elo / 1800) * 100)
    } else {
      continue
    }

    candidates.push({ name: ach.name, icon: ach.icon, progress, raw: progress })
  }

  if (candidates.length === 0) return null
  // Return the one closest to 100% but not yet 100%
  candidates.sort((a, b) => b.raw - a.raw)
  return candidates[0]
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  // Fetch match_rounds for category accuracy
  const { data: rounds } = await supabase
    .from('match_rounds')
    .select('category, correct_count, questions')
    .eq('player', user.id)
    .not('correct_count', 'is', null)

  type CategoryStat = { category: QuestionCategory; accuracy: number; total: number }
  const categoryStats: CategoryStat[] = []

  if (rounds && rounds.length > 0) {
    const byCategory: Record<string, { correct: number; total: number }> = {}
    for (const r of rounds as MatchRound[]) {
      if (!byCategory[r.category]) byCategory[r.category] = { correct: 0, total: 0 }
      byCategory[r.category].correct += r.correct_count ?? 0
      byCategory[r.category].total += r.questions.length
    }
    for (const [cat, { correct, total }] of Object.entries(byCategory)) {
      categoryStats.push({
        category: cat as QuestionCategory,
        accuracy: total > 0 ? (correct / total) * 100 : 0,
        total,
      })
    }
  }

  const nextAchievement = computeNextAchievement(profile, userAchievementIds, achievements)

  const accuracy =
    profile.total_questions > 0
      ? Math.round((profile.total_correct / profile.total_questions) * 100)
      : 0

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
        className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #67D7A8 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto max-w-md flex flex-col gap-6">
        {/* 1. Mini-Pass card */}
        <div
          className="noise-overlay relative overflow-hidden rounded-[1.5rem] p-5 shadow-2xl"
          style={{
            background: `conic-gradient(from ${profile.card_seed}deg at 40% 50%, #180E33 0deg, #5B2AF3 60deg, #9474F6 120deg, #67D7A8 180deg, #DED8FA 240deg, #5B2AF3 300deg, #180E33 360deg)`,
            borderRadius: '1.5rem',
          }}
        >
          {/* Watermark */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-4 select-none text-[2.5rem] font-black italic tracking-tighter text-white/8 leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            BEFOOTBALL
          </span>

          <div className="relative flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <h2
                className="text-2xl font-black italic text-white leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {profile.username}
              </h2>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                {divisionLabel(profile.division)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl">{countryFlag(profile.country_code)}</span>
              <span
                className="text-xs font-bold uppercase tracking-widest text-white/60"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {profile.country_code}
              </span>
            </div>

            <span
              className="text-4xl font-bold tabular-nums text-white"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {profile.elo}
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-widest text-white/50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              ELO Rating
            </span>
          </div>
        </div>

        {/* 2. Stats grid */}
        <section>
          <h3
            className="mb-3 text-xs font-bold uppercase tracking-widest text-lavender"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Estadísticas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Partidas" value={String(profile.matches_played)} />
            <StatBox label="Precisión" value={`${accuracy}%`} />
            <StatBox label="Racha actual" value={String(profile.current_streak)} />
            <StatBox label="Mejor racha" value={String(profile.best_streak)} />
          </div>
        </section>

        {/* 3. Category accuracy bars */}
        <section>
          <h3
            className="mb-3 text-xs font-bold uppercase tracking-widest text-lavender"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Tu mejor categoría
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <CategoryBars stats={categoryStats} />
          </div>
        </section>

        {/* 4. Next achievement */}
        {nextAchievement && (
          <section>
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-widest text-lavender"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Próximo logro
            </h3>
            <div className="rounded-2xl border border-lavender/20 bg-intense-violet/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{nextAchievement.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{nextAchievement.name}</span>
                  <span
                    className="text-xs tabular-nums text-lavender"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {Math.round(nextAchievement.progress)}% completado
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    background: 'linear-gradient(90deg, #5B2AF3, #67D7A8)',
                    width: `${nextAchievement.progress}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
