import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcScore } from '../lib/game/scoring'
import { calcElo, getDivision } from '../lib/game/elo'

// ── Pure scoring logic ────────────────────────────────────────────────────────

describe('Answer scoring', () => {
  it('correct at 2s → 150 pts', () => expect(calcScore(true, 2000)).toBe(150))
  it('correct at 8s → between 100 and 150', () => {
    const s = calcScore(true, 8000)
    expect(s).toBeGreaterThanOrEqual(100)
    expect(s).toBeLessThanOrEqual(150)
  })
  it('correct at 15s → 100 pts', () => expect(calcScore(true, 15000)).toBe(100))
  it('incorrect → 0', () => expect(calcScore(false, 2000)).toBe(0))
})

// ── VAR powerup — eliminates 2 wrong options ──────────────────────────────────

describe('VAR powerup logic', () => {
  it('eliminatedOptions contains exactly 2 items, neither is correct', () => {
    const correct = 2
    const allOptions = [0, 1, 2, 3]
    const incorrect = allOptions.filter(i => i !== correct)
    const eliminated = incorrect.sort(() => Math.random() - 0.5).slice(0, 2)
    expect(eliminated).toHaveLength(2)
    expect(eliminated.includes(correct)).toBe(false)
  })

  it('repeated VAR picks always skip the correct answer', () => {
    for (let correct = 0; correct < 4; correct++) {
      const allOptions = [0, 1, 2, 3]
      const incorrect = allOptions.filter(i => i !== correct)
      const eliminated = incorrect.sort(() => Math.random() - 0.5).slice(0, 2)
      expect(eliminated.includes(correct)).toBe(false)
    }
  })
})

// ── ELO calculation ───────────────────────────────────────────────────────────

describe('ELO after match', () => {
  it('winner gains ELO, loser loses ELO', () => {
    const eloA = 1000, eloB = 1000
    const newA = calcElo(eloA, eloB, true, false)
    const newB = calcElo(eloB, eloA, false, false)
    expect(newA).toBeGreaterThan(eloA)
    expect(newB).toBeLessThan(eloB)
  })

  it('draw → both near original ELO', () => {
    const eloA = 1000, eloB = 1000
    const newA = calcElo(eloA, eloB, false, true)
    const newB = calcElo(eloB, eloA, false, true)
    expect(Math.abs(newA - eloA)).toBeLessThanOrEqual(2)
    expect(Math.abs(newB - eloB)).toBeLessThanOrEqual(2)
  })

  it('upset: low-ELO player wins → bigger ELO gain', () => {
    const eloA = 900, eloB = 1100
    const gainA = calcElo(eloA, eloB, true, false) - eloA
    const gainNormal = calcElo(1000, 1000, true, false) - 1000
    expect(gainA).toBeGreaterThan(gainNormal)
  })

  it('getDivision maps ELO correctly', () => {
    expect(getDivision(900)).toBe('bronze')
    expect(getDivision(1200)).toBe('silver')
    expect(getDivision(1400)).toBe('gold')
    expect(getDivision(1600)).toBe('diamond')
    expect(getDivision(1900)).toBe('elite')
  })
})

// ── Match status progression (pure logic) ────────────────────────────────────

describe('Match status progression', () => {
  type Status = 'a_turn' | 'b_turn' | 'finished'

  function nextStatus(current: Status, currentRound: number, isRoundComplete: boolean): { status: Status; round: number } {
    if (!isRoundComplete) return { status: current, round: currentRound }
    if (current === 'a_turn') return { status: 'b_turn', round: currentRound }
    if (currentRound >= 3) return { status: 'finished', round: currentRound }
    return { status: 'a_turn', round: currentRound + 1 }
  }

  it('A completes round 1 → b_turn', () => {
    expect(nextStatus('a_turn', 1, true)).toEqual({ status: 'b_turn', round: 1 })
  })

  it('B completes round 1 → a_turn, round 2', () => {
    expect(nextStatus('b_turn', 1, true)).toEqual({ status: 'a_turn', round: 2 })
  })

  it('B completes round 3 → finished', () => {
    expect(nextStatus('b_turn', 3, true)).toEqual({ status: 'finished', round: 3 })
  })

  it('incomplete round → no change', () => {
    expect(nextStatus('a_turn', 2, false)).toEqual({ status: 'a_turn', round: 2 })
  })

  it('full match sequence: 3 rounds', () => {
    const sequence: string[] = []
    let status: Status = 'a_turn'
    let round = 1
    while (status !== 'finished') {
      sequence.push(`${status} R${round}`)
      const next = nextStatus(status, round, true)
      status = next.status
      round = next.round
    }
    sequence.push('finished')
    expect(sequence).toEqual([
      'a_turn R1', 'b_turn R1', 'a_turn R2', 'b_turn R2', 'a_turn R3', 'b_turn R3', 'finished'
    ])
  })
})

// ── Powerup uniqueness check ──────────────────────────────────────────────────

describe('Powerup already-used detection', () => {
  it('detects used powerup across rounds', () => {
    const userRounds = [
      { powerups_used: [{ type: 'var', questionId: 'q1' }] },
      { powerups_used: [] },
    ]
    const alreadyUsed = (type: string) =>
      userRounds.some(r => (r.powerups_used ?? []).some((p: any) => p.type === type))

    expect(alreadyUsed('var')).toBe(true)
    expect(alreadyUsed('prorroga')).toBe(false)
    expect(alreadyUsed('roja')).toBe(false)
  })
})
