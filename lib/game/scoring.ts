import type { RoundAnswer } from "../types"

export function calcScore(correct: boolean, timeMs: number): number {
  if (!correct) return 0
  if (timeMs < 3000) return 150
  return 100 + Math.max(0, Math.round(50 * (1 - (timeMs - 3000) / 12000)))
}

export function calcRoundScore(answers: Array<{ correct: boolean; timeMs: number }>): {
  score: number
  correctCount: number
  totalTimeMs: number
} {
  let score = 0
  let correctCount = 0
  let totalTimeMs = 0

  for (const a of answers) {
    score += calcScore(a.correct, a.timeMs)
    if (a.correct) correctCount++
    totalTimeMs += a.timeMs
  }

  return { score, correctCount, totalTimeMs }
}
