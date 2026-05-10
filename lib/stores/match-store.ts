'use client'

import { create } from 'zustand'

// ── Types ────────────────────────────────────────────────────────────────────

interface MatchQuestion {
  id: string
  q: string
  options: string[]
  correct?: number       // only present after answering
  explanation?: string   // only present after answering
}

interface MatchRoundState {
  num: number
  category: string
  questions: MatchQuestion[]
  yourAnswers: (number | null)[] | null
  yourCorrectCount: number | null
  opponentCorrectCount: number | null
}

interface OpponentInfo {
  id: string
  username: string
  country_code: string
  elo: number
  division: string
  card_seed: number
}

interface MatchData {
  matchId: string
  status: string
  currentRound: number
  selectedCategories: string[]
  yourSide: 'a' | 'b'
  opponent: OpponentInfo
  rounds: MatchRoundState[]
  yourScore: number
  opponentScore: number | null
}

interface AnswerResult {
  correct: boolean
  correctOption: number
  explanation: string | null
  points: number
  roundComplete: boolean
  matchComplete: boolean
}

interface MatchStore {
  matchId: string | null
  match: MatchData | null
  currentRoundIdx: number
  currentQuestionIdx: number
  powerupsUsed: { var: boolean; prorroga: boolean; roja: boolean }
  varEliminatedOptions: number[]
  prorrogaActive: boolean
  loading: boolean
  error: string | null

  // Actions
  loadMatch: (matchId: string) => Promise<void>
  answerQuestion: (questionId: string, optionIdx: number, timeMs: number) => Promise<AnswerResult | null>
  usePowerup: (type: 'var' | 'prorroga' | 'roja', questionId: string) => Promise<void>
  nextQuestion: () => void
  reset: () => void
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useMatchStore = create<MatchStore>((set, get) => ({
  matchId: null,
  match: null,
  currentRoundIdx: 0,
  currentQuestionIdx: 0,
  powerupsUsed: { var: false, prorroga: false, roja: false },
  varEliminatedOptions: [],
  prorrogaActive: false,
  loading: false,
  error: null,

  loadMatch: async (matchId: string) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/match/${matchId}/state`)
      if (!res.ok) throw new Error(`Failed to load match: ${res.status}`)
      const data: MatchData = await res.json()

      // Restore currentRoundIdx from match state
      const currentRoundIdx = Math.max(0, (data.currentRound ?? 1) - 1)

      set({ matchId, match: data, currentRoundIdx, currentQuestionIdx: 0, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  answerQuestion: async (questionId: string, optionIdx: number, timeMs: number) => {
    const { matchId } = get()
    if (!matchId) return null
    try {
      const res = await fetch(`/api/match/${matchId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOption: optionIdx, timeTakenMs: timeMs }),
      })
      if (!res.ok) {
        const err = await res.json()
        set({ error: err.error ?? 'Answer failed' })
        return null
      }
      const result: AnswerResult = await res.json()

      // Update local match state optimistically
      set(state => {
        if (!state.match) return state
        const rounds = [...state.match.rounds]
        const round = { ...rounds[state.currentRoundIdx] }
        const qIdx = round.questions.findIndex(q => q.id === questionId)
        if (qIdx !== -1) {
          const questions = [...round.questions]
          questions[qIdx] = {
            ...questions[qIdx],
            correct: result.correctOption,
            explanation: result.explanation ?? undefined,
          }
          round.questions = questions
        }
        rounds[state.currentRoundIdx] = round
        return { match: { ...state.match, rounds }, prorrogaActive: false }
      })

      return result
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  usePowerup: async (type: 'var' | 'prorroga' | 'roja', questionId: string) => {
    const { matchId, powerupsUsed } = get()
    if (!matchId || powerupsUsed[type]) return
    try {
      const res = await fetch(`/api/match/${matchId}/use-powerup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, questionId }),
      })
      if (!res.ok) return
      const data = await res.json()

      set(state => ({
        powerupsUsed: { ...state.powerupsUsed, [type]: true },
        varEliminatedOptions: type === 'var' ? data.eliminatedOptions ?? [] : state.varEliminatedOptions,
        prorrogaActive: type === 'prorroga',
      }))
    } catch {
      // non-fatal
    }
  },

  nextQuestion: () => {
    set(state => {
      const { currentRoundIdx, currentQuestionIdx, match } = state
      if (!match) return state
      const roundQuestionCount = match.rounds[currentRoundIdx]?.questions.length ?? 3
      if (currentQuestionIdx < roundQuestionCount - 1) {
        return { currentQuestionIdx: currentQuestionIdx + 1, varEliminatedOptions: [], prorrogaActive: false }
      }
      return state // round done — UI should react to roundComplete from answerQuestion
    })
  },

  reset: () => set({
    matchId: null,
    match: null,
    currentRoundIdx: 0,
    currentQuestionIdx: 0,
    powerupsUsed: { var: false, prorroga: false, roja: false },
    varEliminatedOptions: [],
    prorrogaActive: false,
    loading: false,
    error: null,
  }),
}))
