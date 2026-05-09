import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDifficultyMix } from '@/lib/game/questions'
import type { Division } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const matchId = searchParams.get('matchId')
  const category = searchParams.get('category')
  const round = parseInt(searchParams.get('round') ?? '1')

  if (!matchId || !category) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify participant
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match || (match.player_a !== user.id && match.player_b !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get division from user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('division')
    .eq('id', user.id)
    .single()

  const division = ((profile?.division ?? 'bronze') as Division)
  const diffMix = getDifficultyMix(division)
  const roundIndex = Math.max(0, Math.min(2, round - 1))
  const targetDiff = diffMix[roundIndex]

  // Build exclusion list from questions already used in this match
  const usedIds: string[] = match.questions_used ?? []

  // Fetch a pool of candidate questions
  let query = supabase
    .from('questions')
    .select('*')
    .eq('cat', category)
    .eq('diff', targetDiff)
    .limit(20)

  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.join(',')})`)
  }

  const { data: pool } = await query

  if (!pool || pool.length < 3) {
    // Fallback: relax used-questions filter, keep category
    const { data: fallback } = await supabase
      .from('questions')
      .select('*')
      .eq('cat', category)
      .limit(10)

    const questions = (fallback ?? []).slice(0, 3)
    return NextResponse.json({ questions })
  }

  // Shuffle and pick 3
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const questions = shuffled.slice(0, 3)

  return NextResponse.json({ questions })
}
