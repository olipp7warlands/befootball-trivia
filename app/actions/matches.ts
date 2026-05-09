"use server"

import { createClient } from "@/lib/supabase/server"
import { calcElo, getDivision } from "@/lib/game/elo"
import { selectCategories, getDifficultyMix } from "@/lib/game/questions"
import { checkAchievements } from "@/lib/game/achievements"
import type { Match, MatchRound, Profile, QuestionCategory } from "@/lib/types"

// ---------------------------------------------------------------------------
// createMatch
// ---------------------------------------------------------------------------

export async function createMatch(
  opponentEmailOrUsername?: string
): Promise<{ matchId: string; error?: string; waiting?: boolean }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { matchId: "", error: "Not authenticated" }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return { matchId: "", error: "Profile not found" }
    }

    const categories: QuestionCategory[] = [
      "finales",
      "goleadores",
      "sedes",
      "anecdotas",
      "records",
      "decadas",
    ]
    const selectedCategories = selectCategories(categories)

    let playerBId: string | null = null

    if (opponentEmailOrUsername) {
      const { data: opponent } = await supabase
        .from("profiles")
        .select("id")
        .or(
          `email.eq.${opponentEmailOrUsername},username.eq.${opponentEmailOrUsername}`
        )
        .single()

      if (opponent) {
        playerBId = opponent.id
      }
      // If opponent not found, create a waiting match (player_b = null, status = 'waiting')
    }

    const matchStatus = playerBId ? "a_turn" : "waiting"

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        player_a: user.id,
        player_b: playerBId,
        status: matchStatus,
        current_round: 1,
        selected_categories: selectedCategories,
        questions_used: [],
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (matchError || !match) {
      console.error("[matches] createMatch insert failed:", matchError)
      return { matchId: "", error: matchError?.message ?? "Failed to create match" }
    }

    if (playerBId) {
      // TODO: send invite email via Resend when configured
      console.log(
        `[matches] Invite for match ${match.id} → player_b ${playerBId} (email not configured)`
      )
    }

    return { matchId: match.id, waiting: !playerBId }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[matches] Unexpected error in createMatch:", err)
    return { matchId: "", error: message }
  }
}

// ---------------------------------------------------------------------------
// submitRoundAnswers
// ---------------------------------------------------------------------------

export async function submitRoundAnswers(params: {
  matchId: string
  roundNum: number
  answers: Array<{ selected: number | null; timeMs: number }>
  powerupUsed?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { matchId, roundNum, answers, powerupUsed } = params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Fetch match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()

    if (matchError || !match) {
      return { success: false, error: "Match not found" }
    }

    const typedMatch = match as Match

    // Validate it is this player's turn
    const isPlayerA = typedMatch.player_a === user.id
    const isPlayerB = typedMatch.player_b === user.id

    if (!isPlayerA && !isPlayerB) {
      return { success: false, error: "You are not a participant in this match" }
    }

    const expectedStatus = isPlayerA ? "a_turn" : "b_turn"
    if (typedMatch.status !== expectedStatus) {
      return { success: false, error: "It is not your turn" }
    }

    if (typedMatch.current_round !== roundNum) {
      return { success: false, error: `Expected round ${typedMatch.current_round}, got ${roundNum}` }
    }

    // Fetch the round definition to get the question ids and correct answers
    const { data: roundDef, error: roundDefError } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .eq("round_num", roundNum)
      .eq("player", user.id)
      .maybeSingle()

    // Fetch questions used in this round so we can score
    let correctCount = 0
    let questionIds: string[] = roundDef?.questions ?? []
    let totalTimeMs = 0

    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from("questions")
        .select("id, correct")
        .in("id", questionIds)

      if (questions) {
        const correctMap = new Map<string, number>(
          questions.map((q: { id: string; correct: number }) => [q.id, q.correct])
        )

        answers.forEach((answer, idx) => {
          totalTimeMs += answer.timeMs
          if (
            questionIds[idx] &&
            correctMap.get(questionIds[idx]) === answer.selected
          ) {
            correctCount++
          }
        })
      }
    } else {
      // Round row doesn't exist yet (shouldn't normally happen) — just tally time
      totalTimeMs = answers.reduce((sum, a) => sum + a.timeMs, 0)
    }

    const now = new Date().toISOString()

    if (roundDef) {
      // Update existing round row
      const { error: updateError } = await supabase
        .from("match_rounds")
        .update({
          answers: answers.map((a) => a.selected),
          correct_count: correctCount,
          time_taken_ms: totalTimeMs,
          played_at: now,
        })
        .eq("id", roundDef.id)

      if (updateError) {
        console.error("[matches] Round update failed:", updateError)
        return { success: false, error: updateError.message }
      }
    } else {
      // Insert new round row (open match format where round rows are created on answer)
      const category: QuestionCategory =
        (typedMatch.selected_categories?.[roundNum - 1] as QuestionCategory) ??
        "finales"

      const { error: insertError } = await supabase.from("match_rounds").insert({
        match_id: matchId,
        round_num: roundNum,
        player: user.id,
        category,
        questions: questionIds,
        answers: answers.map((a) => a.selected),
        correct_count: correctCount,
        time_taken_ms: totalTimeMs,
        played_at: now,
      })

      if (insertError) {
        console.error("[matches] Round insert failed:", insertError)
        return { success: false, error: insertError.message }
      }
    }

    // Advance match state
    // Determine next status: the other player's turn, or finish
    const nextStatus =
      isPlayerA
        ? ("b_turn" as const)
        : ("a_turn" as const)

    // Check if both players have now played this round
    const { data: roundsPlayed } = await supabase
      .from("match_rounds")
      .select("player")
      .eq("match_id", matchId)
      .eq("round_num", roundNum)
      .not("played_at", "is", null)

    const bothPlayed =
      (roundsPlayed?.length ?? 0) >= 2 ||
      typedMatch.player_b === null // solo mode — no second player

    if (bothPlayed && roundNum >= 3) {
      // All rounds done — finish the match
      await finishMatch(matchId)
    } else if (bothPlayed) {
      // Advance to next round, player A goes first
      await supabase
        .from("matches")
        .update({ current_round: roundNum + 1, status: "a_turn" })
        .eq("id", matchId)
    } else {
      // Other player still needs to play this round
      await supabase
        .from("matches")
        .update({ status: nextStatus })
        .eq("id", matchId)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[matches] Unexpected error in submitRoundAnswers:", err)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// finishMatch (internal)
// ---------------------------------------------------------------------------

async function finishMatch(matchId: string): Promise<void> {
  const supabase = await createClient()

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single()

  if (!match) {
    console.error("[matches] finishMatch: match not found", matchId)
    return
  }

  const typedMatch = match as Match

  // Aggregate scores per player
  const { data: allRounds } = await supabase
    .from("match_rounds")
    .select("*")
    .eq("match_id", matchId)

  const rounds = (allRounds ?? []) as MatchRound[]

  function aggregate(playerId: string) {
    const playerRounds = rounds.filter((r) => r.player === playerId)
    const totalCorrect = playerRounds.reduce((s, r) => s + (r.correct_count ?? 0), 0)
    const totalTime = playerRounds.reduce((s, r) => s + (r.time_taken_ms ?? 0), 0)
    return { totalCorrect, totalTime }
  }

  const aStats = aggregate(typedMatch.player_a)
  const bStats = typedMatch.player_b ? aggregate(typedMatch.player_b) : null

  let winner: string | null = null
  let drew = false

  if (!bStats) {
    // Solo match — no winner logic, just finish
    winner = null
  } else if (aStats.totalCorrect > bStats.totalCorrect) {
    winner = typedMatch.player_a
  } else if (bStats.totalCorrect > aStats.totalCorrect) {
    winner = typedMatch.player_b
  } else if (aStats.totalTime < bStats.totalTime) {
    // Tiebreaker: faster time wins
    winner = typedMatch.player_a
  } else if (bStats.totalTime < aStats.totalTime) {
    winner = typedMatch.player_b
  } else {
    drew = true
  }

  const now = new Date().toISOString()

  await supabase
    .from("matches")
    .update({ status: "finished", winner, finished_at: now })
    .eq("id", matchId)

  // Fetch both profiles
  const playerIds = [typedMatch.player_a, ...(typedMatch.player_b ? [typedMatch.player_b] : [])]

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", playerIds)

  if (!profiles || profiles.length === 0) return

  const profileMap = new Map<string, Profile>(
    (profiles as Profile[]).map((p) => [p.id, p])
  )

  const profileA = profileMap.get(typedMatch.player_a)
  const profileB = typedMatch.player_b ? profileMap.get(typedMatch.player_b) : undefined

  async function updatePlayerStats(
    profile: Profile,
    won: boolean,
    opponentElo: number
  ) {
    const newElo = calcElo(profile.elo, opponentElo, won, drew)
    const newDivision = getDivision(newElo)
    const newMatchesPlayed = profile.matches_played + 1
    const newMatchesWon = won ? profile.matches_won + 1 : profile.matches_won
    const newStreak = won ? profile.current_streak + 1 : 0
    const newBestStreak = Math.max(profile.best_streak, newStreak)

    await supabase
      .from("profiles")
      .update({
        elo: newElo,
        division: newDivision,
        matches_played: newMatchesPlayed,
        matches_won: newMatchesWon,
        current_streak: newStreak,
        best_streak: newBestStreak,
      })
      .eq("id", profile.id)
  }

  if (profileA) {
    const aWon = winner === typedMatch.player_a
    const opponentElo = profileB?.elo ?? profileA.elo
    await updatePlayerStats(profileA, aWon, opponentElo)
  }

  if (profileB && typedMatch.player_b) {
    const bWon = winner === typedMatch.player_b
    const opponentElo = profileA?.elo ?? profileB.elo
    await updatePlayerStats(profileB, bWon, opponentElo)
  }

  // Fire achievement checks — fire-and-forget
  if (profileA) {
    void checkAndUnlockAchievements(typedMatch.player_a, matchId)
  }
  if (typedMatch.player_b) {
    void checkAndUnlockAchievements(typedMatch.player_b, matchId)
  }
}

// ---------------------------------------------------------------------------
// checkAndUnlockAchievements (exported for direct use if needed)
// ---------------------------------------------------------------------------

export async function checkAndUnlockAchievements(
  userId: string,
  matchId: string
): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (!profile) return

    const { data: recentRounds } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .eq("player", userId)

    const { data: matchRow } = await supabase
      .from("matches")
      .select("winner")
      .eq("id", matchId)
      .single()

    const matchWon = matchRow?.winner === userId

    // Check if any powerups were used in these rounds
    // (powerup_used is tracked in round answers payload; not a column on match_rounds by default,
    //  so we default to false unless the schema supports it)
    const usedPowerups = false

    const toUnlock = checkAchievements({
      userId,
      profile: profile as Profile,
      recentRounds: (recentRounds ?? []) as MatchRound[],
      matchWon,
      usedPowerups,
    })

    if (toUnlock.length === 0) return

    // Fetch existing achievements to avoid re-inserting
    const { data: existing } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId)

    const alreadyUnlocked = new Set(
      (existing ?? []).map((r: { achievement_id: string }) => r.achievement_id)
    )

    const newOnes = toUnlock.filter((id) => !alreadyUnlocked.has(id))
    if (newOnes.length === 0) return

    const rows = newOnes.map((achievementId) => ({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
    }))

    // Insert with conflict ignore (onConflict = do nothing)
    await supabase
      .from("user_achievements")
      .upsert(rows, { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
  } catch (err) {
    console.error("[matches] checkAndUnlockAchievements error:", err)
  }
}
