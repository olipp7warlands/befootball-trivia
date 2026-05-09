import type { Profile, MatchRound } from "../types"

export interface AchievementCheck {
  userId: string
  profile: Profile
  recentRounds: MatchRound[]
  matchWon: boolean
  usedPowerups: boolean
}

export function checkAchievements(check: AchievementCheck): string[] {
  const { profile, recentRounds, matchWon, usedPowerups } = check
  const unlocked: string[] = []

  if (profile.current_streak >= 3) {
    unlocked.push("hat-trick")
  }

  const hasFastCorrect = recentRounds.some((round) => {
    if (!round.answers || !round.played_at) return false
    const perQ = round.time_taken_ms != null && round.questions.length > 0
      ? round.time_taken_ms / round.questions.length
      : null
    return perQ !== null && perQ < 3000 && (round.correct_count ?? 0) > 0
  })
  if (hasFastCorrect) {
    unlocked.push("penalti")
  }

  if (profile.total_correct >= 100) {
    unlocked.push("pichichi")
  }

  if (matchWon && !usedPowerups) {
    unlocked.push("sin-var")
  }

  if (profile.division === "elite") {
    unlocked.push("elite-befootball")
  }

  const hasMemoria = recentRounds.some(
    (round) => round.category === "anecdotas" && round.correct_count === 3
  )
  if (hasMemoria) {
    unlocked.push("memoria")
  }

  return unlocked
}
