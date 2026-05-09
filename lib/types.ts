export type Division = "bronze" | "silver" | "gold" | "diamond" | "elite"
export type MatchStatus = "waiting" | "a_turn" | "b_turn" | "finished" | "abandoned"
export type AchievementRarity = "common" | "rare" | "legendary"
export type QuestionCategory = "finales" | "goleadores" | "sedes" | "anecdotas" | "records" | "decadas"

export interface Profile {
  id: string
  username: string
  email: string
  country_code: string
  created_at: string
  elo: number
  division: Division
  matches_played: number
  matches_won: number
  total_correct: number
  total_questions: number
  current_streak: number
  best_streak: number
  card_seed: number
}

export interface Lead {
  id: string
  email: string
  name: string | null
  country_code: string | null
  source: string
  created_at: string
  synced_at: string | null
}

export interface Question {
  id: string
  cat: QuestionCategory
  wc: number | null
  decade: string | null
  diff: 1 | 2 | 3
  q: string
  options: string[]
  correct: 0 | 1 | 2 | 3
  explanation: string | null
}

export interface Match {
  id: string
  player_a: string
  player_b: string | null
  status: MatchStatus
  current_round: number
  selected_categories: QuestionCategory[] | null
  questions_used: string[]
  started_at: string
  finished_at: string | null
  winner: string | null
}

export interface MatchRound {
  id: string
  match_id: string
  round_num: 1 | 2 | 3
  player: string
  category: QuestionCategory
  questions: string[]
  answers: (number | null)[] | null
  correct_count: number | null
  time_taken_ms: number | null
  played_at: string | null
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  condition: Record<string, unknown>
}

export interface UserAchievement {
  user_id: string
  achievement_id: string
  unlocked_at: string
}

export interface RankingWeekly {
  user_id: string
  week_start: string
  points: number
  matches: number
  rank_global: number | null
  rank_country: number | null
  updated_at: string
}

export interface PowerUp {
  type: "var" | "prorroga" | "tarjeta-roja"
  used: boolean
}

export interface RoundAnswer {
  question_id: string
  selected: number | null
  correct: boolean
  time_ms: number
  powerup_used: PowerUp["type"] | null
}

export const DIVISION_ELO: Record<Division, [number, number]> = {
  bronze:   [0, 1099],
  silver:   [1100, 1299],
  gold:     [1300, 1499],
  diamond:  [1500, 1799],
  elite:    [1800, Infinity],
}

export const DIFFICULTY_BY_DIVISION: Record<Division, [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3]> = {
  bronze:  [1, 1, 2],
  silver:  [1, 2, 2],
  gold:    [1, 2, 3],
  diamond: [2, 2, 3],
  elite:   [2, 3, 3],
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  finales:    "Finales",
  goleadores: "Goleadores",
  sedes:      "Sedes",
  anecdotas:  "Anécdotas",
  records:    "Récords",
  decadas:    "Décadas",
}

export const CATEGORY_ICONS: Record<QuestionCategory, string> = {
  finales:    "trophy",
  goleadores: "ball-football",
  sedes:      "map-pin",
  anecdotas:  "history",
  records:    "chart-bar",
  decadas:    "calendar",
}
