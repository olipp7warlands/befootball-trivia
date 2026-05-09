import type { Division, QuestionCategory } from "../types"
import { DIFFICULTY_BY_DIVISION } from "../types"

export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function getDifficultyMix(division: Division): [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3] {
  return DIFFICULTY_BY_DIVISION[division]
}

export function selectCategories(available: QuestionCategory[]): QuestionCategory[] {
  return shuffleArray(available).slice(0, 3)
}
