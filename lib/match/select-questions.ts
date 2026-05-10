import { getDifficultyMix, shuffleArray } from '@/lib/game/questions'

export function buildDifficultyPool(division: string): [number, number, number] {
  return getDifficultyMix(division as import('@/lib/types').Division) ?? [1, 1, 2]
}

export async function selectQuestionsForMatch(opts: {
  userId: string
  division: string
  categories: [string, string, string]
  supabase: any
}): Promise<Array<{ category: string; questionIds: string[]; questions: Array<{ id: string; q: string; options: string[] }> }>> {
  const { userId, division, categories, supabase } = opts

  // Get recently used question IDs
  const { data: recentRounds } = await supabase
    .from('match_rounds')
    .select('questions')
    .eq('player', userId)
    .order('played_at', { ascending: false })
    .limit(90)

  const excludedIds = new Set<string>()
  if (recentRounds) {
    for (const round of recentRounds) {
      if (Array.isArray(round.questions)) {
        for (const qId of round.questions) {
          excludedIds.add(qId)
        }
      }
    }
  }

  const pickedInMatch = new Set<string>()
  const difficultyMix = getDifficultyMix(division as import('@/lib/types').Division) ?? [1, 1, 2]

  const result: Array<{ category: string; questionIds: string[]; questions: Array<{ id: string; q: string; options: string[] }> }> = []

  for (let i = 0; i < 3; i++) {
    const category = categories[i]
    const roundQuestionIds: string[] = []
    const roundQuestions: Array<{ id: string; q: string; options: string[] }> = []

    for (let j = 0; j < 3; j++) {
      const diff = difficultyMix[j]

      // Query questions for this category and difficulty
      const { data: pool } = await supabase
        .from('questions')
        .select('id, q, options')
        .eq('cat', category)
        .eq('diff', diff)
        .limit(60)

      if (!pool || pool.length === 0) {
        // No questions at all for this diff — skip gracefully
        continue
      }

      // Filter out excluded IDs and already picked in this match
      let freshPool = pool.filter(
        (q: any) => !excludedIds.has(q.id) && !pickedInMatch.has(q.id)
      )

      // Relax anti-repeat if no fresh questions
      if (freshPool.length === 0) {
        freshPool = pool.filter((q: any) => !pickedInMatch.has(q.id))
      }

      if (freshPool.length === 0) {
        // All questions already picked in this match — skip
        continue
      }

      // Pick one random question
      const picked = freshPool[Math.floor(Math.random() * freshPool.length)]
      pickedInMatch.add(picked.id)
      roundQuestionIds.push(picked.id)
      roundQuestions.push({ id: picked.id, q: picked.q, options: picked.options })
    }

    result.push({
      category,
      questionIds: roundQuestionIds,
      questions: roundQuestions,
    })
  }

  return result
}
