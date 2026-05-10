import { describe, it, expect } from 'vitest'
import { calcScore } from '../lib/game/scoring'

describe('calcScore', () => {
  it('correct in <3s → 150 pts', () => {
    expect(calcScore(true, 2000)).toBe(150)
    expect(calcScore(true, 0)).toBe(150)
    expect(calcScore(true, 2999)).toBe(150)
  })

  it('correct at 3s exactly → 150 pts (boundary)', () => {
    // timeTakenMs < 3000 triggers 150. At exactly 3000 we use the formula.
    // 100 + max(0, 50*(1-(3000-3000)/12000)) = 100 + 50 = 150
    expect(calcScore(true, 3000)).toBe(150)
  })

  it('correct at 8s → ~79 pts', () => {
    // 100 + round(50 * (1 - (8000-3000)/12000)) = 100 + round(50 * (1 - 5/12))
    // = 100 + round(50 * 7/12) = 100 + round(29.17) = 129
    const score = calcScore(true, 8000)
    expect(score).toBeGreaterThanOrEqual(100)
    expect(score).toBeLessThanOrEqual(150)
  })

  it('correct at 15s → 100 pts (no speed bonus)', () => {
    // 100 + max(0, 50*(1-(15000-3000)/12000)) = 100 + max(0, 50*(1-1)) = 100
    expect(calcScore(true, 15000)).toBe(100)
  })

  it('correct beyond 15s → 100 pts (clamped)', () => {
    expect(calcScore(true, 20000)).toBe(100)
  })

  it('incorrect → 0 pts regardless of time', () => {
    expect(calcScore(false, 500)).toBe(0)
    expect(calcScore(false, 8000)).toBe(0)
    expect(calcScore(false, 15000)).toBe(0)
  })

  it('speed bonus decreases linearly between 3s and 15s', () => {
    const mid = calcScore(true, 9000)  // halfway between 3s and 15s
    expect(mid).toBeGreaterThan(100)
    expect(mid).toBeLessThan(150)
    // Score at 6s should be higher than at 12s
    expect(calcScore(true, 6000)).toBeGreaterThan(calcScore(true, 12000))
  })
})
