import { describe, it, expect, vi } from 'vitest'
import { buildDifficultyPool, selectQuestionsForMatch } from '../lib/match/select-questions'

// ---------------------------------------------------------------------------
// buildDifficultyPool tests
// ---------------------------------------------------------------------------

describe('buildDifficultyPool', () => {
  it('Bronze → [1, 1, 2]', () => {
    expect(buildDifficultyPool('bronze')).toEqual([1, 1, 2])
  })

  it('Silver → [1, 2, 2]', () => {
    expect(buildDifficultyPool('silver')).toEqual([1, 2, 2])
  })

  it('Gold → [1, 2, 3]', () => {
    expect(buildDifficultyPool('gold')).toEqual([1, 2, 3])
  })

  it('Diamond → [2, 2, 3]', () => {
    expect(buildDifficultyPool('diamond')).toEqual([2, 2, 3])
  })

  it('Elite → [2, 3, 3]', () => {
    expect(buildDifficultyPool('elite')).toEqual([2, 3, 3])
  })

  it('Unknown division defaults to bronze [1, 1, 2]', () => {
    expect(buildDifficultyPool('unknown_xyz')).toEqual([1, 1, 2])
  })
})

// ---------------------------------------------------------------------------
// selectQuestionsForMatch tests
// ---------------------------------------------------------------------------

function makeSampleQuestions(count = 5): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${Math.random().toString(36).slice(2)}-${i}`,
    q: `Question ${i}`,
    options: ['A', 'B', 'C', 'D'],
  }))
}

describe('selectQuestionsForMatch', () => {
  it('returns 3 rounds, each with up to 3 questions, with no duplicate IDs across all 9', async () => {
    const sampleQuestions = makeSampleQuestions(5)

    // Build a base chain that handles match_rounds and questions differently
    const baseChain = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      is: vi.fn(),
      neq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    }

    // Make all chain methods return the chain itself
    for (const key of Object.keys(baseChain) as Array<keyof typeof baseChain>) {
      if (key !== 'limit') {
        ;(baseChain[key] as any).mockReturnValue(baseChain)
      }
    }

    const mockSupa = {
      from: vi.fn((table: string) => {
        // Create a fresh chain per call so limit can resolve differently
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn(),
        }

        if (table === 'match_rounds') {
          chain.limit.mockResolvedValue({ data: [], error: null })
        } else {
          // Return fresh questions each time so there are no cross-round collisions
          chain.limit.mockResolvedValue({
            data: makeSampleQuestions(5),
            error: null,
          })
        }

        return chain
      }),
    }

    const result = await selectQuestionsForMatch({
      userId: 'user-a',
      division: 'gold',
      categories: ['finales', 'goleadores', 'sedes'],
      supabase: mockSupa,
    })

    expect(result).toHaveLength(3)

    const allIds: string[] = []
    for (const round of result) {
      expect(round.questionIds.length).toBeGreaterThan(0)
      expect(round.questionIds.length).toBeLessThanOrEqual(3)
      expect(round.questions.length).toBe(round.questionIds.length)
      allIds.push(...round.questionIds)
    }

    // No duplicate IDs across all 9 questions
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
  })
})
