'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  IconTrophy,
  IconBallFootball,
  IconMapPin,
  IconHistory,
  IconChartBar,
  IconCalendar,
  IconAdjustments,
  IconClock,
  IconCardsFilled,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react'
import { submitRoundAnswers } from '@/app/actions/matches'
import type { Match, Question, QuestionCategory } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | 'category-select'
  | 'question'
  | 'round-summary'
  | 'waiting-opponent'
  | 'finished'

interface AnswerRecord {
  selected: number | null
  timeMs: number
}

interface RoundScore {
  correctCount: number
  score: number
}

interface PowerUps {
  var: boolean      // true = used
  prorroga: boolean
  tarjeta_roja: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTION_TIME = 15
const PRORROGA_BONUS = 5

const CATEGORY_ICON_MAP: Record<QuestionCategory, React.ReactNode> = {
  finales:    <IconTrophy size={28} />,
  goleadores: <IconBallFootball size={28} />,
  sedes:      <IconMapPin size={28} />,
  anecdotas:  <IconHistory size={28} />,
  records:    <IconChartBar size={28} />,
  decadas:    <IconCalendar size={28} />,
}

const CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
  finales:    'Partidos decisivos y campeones del mundo',
  goleadores: 'Los mejores artilleros de la historia',
  sedes:      'Países y estadios que marcaron historia',
  anecdotas:  'Curiosidades y momentos únicos',
  records:    'Marcas históricas imbatibles',
  decadas:    'Por era y generación futbolera',
}

const ALL_CATEGORIES: QuestionCategory[] = [
  'finales',
  'goleadores',
  'sedes',
  'anecdotas',
  'records',
  'decadas',
]

function pickThreeCategories(seed?: QuestionCategory[]): QuestionCategory[] {
  if (seed && seed.length >= 3) return seed.slice(0, 3)
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  match: Match
  userId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchClient({ match, userId }: Props) {
  const isPlayerA = match.player_a === userId

  // Derive 3 categories offered to this player for category-select
  const [offeredCategories] = useState<QuestionCategory[]>(() =>
    pickThreeCategories(match.selected_categories ?? undefined)
  )

  const [phase, setPhase] = useState<Phase>('category-select')
  const [currentRound, setCurrentRound] = useState(match.current_round ?? 1)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [maxTime, setMaxTime] = useState(QUESTION_TIME)
  const [powerups, setPowerups] = useState<PowerUps>({
    var: false,
    prorroga: false,
    tarjeta_roja: false,
  })
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set())
  const [roundScores, setRoundScores] = useState<RoundScore[]>([])
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Track when this question started (for time_ms calc)
  const questionStartRef = useRef<number>(Date.now())
  // Accumulate answers for the current round
  const roundAnswersRef = useRef<AnswerRecord[]>([])

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (phase !== 'question' || answeredIndex !== null) return

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQuestionIndex, answeredIndex])

  // Reset timer when question changes
  useEffect(() => {
    if (phase === 'question') {
      questionStartRef.current = Date.now()
      setTimeLeft(QUESTION_TIME)
      setMaxTime(QUESTION_TIME)
      setAnsweredIndex(null)
      setShowExplanation(false)
      setHiddenOptions(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, phase])

  // ---------------------------------------------------------------------------
  // Fetch questions
  // ---------------------------------------------------------------------------

  const fetchQuestions = useCallback(
    async (category: QuestionCategory) => {
      setLoadingQuestions(true)
      try {
        const url = `/api/match/questions?matchId=${match.id}&category=${category}&round=${currentRound}`
        const res = await fetch(url)
        const json = await res.json()
        setQuestions(json.questions ?? [])
        roundAnswersRef.current = []
        setAnswers([])
        setCurrentQuestionIndex(0)
        setPhase('question')
      } catch (err) {
        console.error('[MatchClient] Failed to fetch questions:', err)
      } finally {
        setLoadingQuestions(false)
      }
    },
    [match.id, currentRound]
  )

  // ---------------------------------------------------------------------------
  // Category select
  // ---------------------------------------------------------------------------

  function handleCategorySelect(cat: QuestionCategory) {
    setSelectedCategory(cat)
    fetchQuestions(cat)
  }

  // ---------------------------------------------------------------------------
  // Answer handling
  // ---------------------------------------------------------------------------

  function recordAnswer(selectedOption: number | null) {
    const timeMs = Date.now() - questionStartRef.current
    const record: AnswerRecord = { selected: selectedOption, timeMs }
    roundAnswersRef.current = [...roundAnswersRef.current, record]
    setAnswers([...roundAnswersRef.current])
    setAnsweredIndex(selectedOption)
    setShowExplanation(true)

    // Advance after 2s
    setTimeout(() => {
      advanceAfterAnswer()
    }, 2000)
  }

  function handleTimeout() {
    recordAnswer(null)
  }

  function handleOptionClick(optionIndex: number) {
    if (answeredIndex !== null) return
    if (hiddenOptions.has(optionIndex)) return
    recordAnswer(optionIndex)
  }

  // ---------------------------------------------------------------------------
  // Advance logic
  // ---------------------------------------------------------------------------

  function advanceAfterAnswer() {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex)
    } else {
      // End of round questions — compute score and submit
      finishRound()
    }
  }

  async function finishRound() {
    const correctCount = roundAnswersRef.current.filter((a, i) => {
      const q = questions[i]
      return q && a.selected === q.correct
    }).length

    const newScore: RoundScore = {
      correctCount,
      score: correctCount * 100,
    }
    setRoundScores((prev) => [...prev, newScore])

    setSubmitting(true)
    try {
      await submitRoundAnswers({
        matchId: match.id,
        roundNum: currentRound,
        answers: roundAnswersRef.current,
        powerupUsed: undefined,
      })
    } catch (err) {
      console.error('[MatchClient] submitRoundAnswers error:', err)
    } finally {
      setSubmitting(false)
    }

    setPhase('round-summary')
  }

  // ---------------------------------------------------------------------------
  // Round summary → next round or waiting
  // ---------------------------------------------------------------------------

  function handleContinue() {
    const nextRound = currentRound + 1
    if (nextRound <= 3) {
      setCurrentRound(nextRound)
      setSelectedCategory(null)
      setQuestions([])
      setCurrentQuestionIndex(0)
      roundAnswersRef.current = []
      setAnswers([])
      setPhase('category-select')
    } else {
      setPhase('waiting-opponent')
    }
  }

  // ---------------------------------------------------------------------------
  // Power-ups
  // ---------------------------------------------------------------------------

  function handleVAR() {
    if (powerups.var || answeredIndex !== null) return
    const currentQ = questions[currentQuestionIndex]
    if (!currentQ) return

    // Reveal 2 wrong options (hide them)
    const wrongOptions = [0, 1, 2, 3].filter((i) => i !== currentQ.correct)
    const toHide = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2)
    setHiddenOptions(new Set(toHide))
    setPowerups((prev) => ({ ...prev, var: true }))
  }

  function handleProrroga() {
    if (powerups.prorroga || answeredIndex !== null) return
    setTimeLeft((prev) => prev + PRORROGA_BONUS)
    setMaxTime((prev) => prev + PRORROGA_BONUS)
    setPowerups((prev) => ({ ...prev, prorroga: true }))
  }

  function handleTarjetaRoja() {
    if (powerups.tarjeta_roja || answeredIndex !== null) return
    setPowerups((prev) => ({ ...prev, tarjeta_roja: true }))
  }

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/match/${match.id}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const currentQuestion = questions[currentQuestionIndex] ?? null
  const timerPercent = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0
  const timerColor = timerPercent > 40 ? '#5B2AF3' : timerPercent > 20 ? '#9474F6' : '#ef4444'

  const roundCorrect = roundAnswersRef.current.filter((a, i) => {
    const q = questions[i]
    return q && a.selected === q.correct
  }).length

  const totalCorrect = roundScores.reduce((s, r) => s + r.correctCount, 0) + roundCorrect

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-dvh flex flex-col items-center justify-start bg-[#0a0420] page-enter">
      {/* ------------------------------------------------------------------ */}
      {/* PHASE: category-select                                              */}
      {/* ------------------------------------------------------------------ */}
      {phase === 'category-select' && (
        <div className="w-full max-w-md px-4 py-10 flex flex-col gap-6">
          <div className="text-center">
            <span
              className="text-xs font-bold tracking-widest uppercase text-[#9474F6] mb-2 block"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Ronda {currentRound} / 3
            </span>
            <h1
              className="text-3xl font-black italic text-[#F1F1F1] leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Elige tu categoría
            </h1>
            <p className="text-sm text-[#9474F6] mt-2">
              Las preguntas dependen de tu elección
            </p>
          </div>

          {loadingQuestions ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-10 h-10 rounded-full border-2 border-[#5B2AF3] border-t-transparent animate-spin" />
              <span className="text-sm text-[#9474F6]">Cargando preguntas…</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {offeredCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className="rounded-2xl border border-[#5B2AF3]/60 bg-[#180E33] hover:bg-[#5B2AF3]/20 active:scale-[0.98] transition-all duration-150 p-5 text-left flex items-center gap-4 group"
                >
                  <span className="text-[#9474F6] group-hover:text-[#67D7A8] transition-colors">
                    {CATEGORY_ICON_MAP[cat]}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-base font-bold text-[#F1F1F1]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="text-xs text-[#9474F6]/80">
                      {CATEGORY_DESCRIPTIONS[cat]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PHASE: question                                                     */}
      {/* ------------------------------------------------------------------ */}
      {phase === 'question' && currentQuestion && (
        <div className="w-full max-w-md px-4 py-6 flex flex-col gap-4 min-h-dvh">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-bold tracking-widest uppercase text-[#9474F6] px-3 py-1 rounded-full border border-[#9474F6]/40 bg-[#180E33]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Ronda {currentRound}/3
            </span>
            <span className="text-xs text-[#9474F6]/70 flex-1 text-center truncate">
              {selectedCategory ? CATEGORY_LABELS[selectedCategory] : ''}
            </span>
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              <span className="text-[#67D7A8] font-bold">{totalCorrect}</span>
              <span className="text-[#9474F6]/50">vs</span>
              <span className="text-[#9474F6]/60 font-bold">?</span>
            </div>
          </div>

          {/* Question counter pills */}
          <div className="flex gap-2 justify-center">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < currentQuestionIndex
                    ? 'bg-[#67D7A8]'
                    : i === currentQuestionIndex
                    ? 'bg-[#5B2AF3]'
                    : 'bg-[#9474F6]/20'
                }`}
              />
            ))}
          </div>

          {/* Question text */}
          <div className="flex-1 flex items-center justify-center px-2 py-4">
            <p
              className="text-xl font-bold text-center text-[#F1F1F1] leading-snug"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {currentQuestion.q}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, i) => {
              if (hiddenOptions.has(i)) return null

              const isSelected = answeredIndex === i
              const isCorrect = i === currentQuestion.correct
              const hasAnswered = answeredIndex !== null

              let optClass =
                'rounded-full border px-5 py-3.5 text-sm font-semibold text-left transition-all duration-200 '

              if (!hasAnswered) {
                optClass +=
                  'bg-[#180E33] border-[#9474F6]/40 text-[#F1F1F1] hover:bg-[#5B2AF3] hover:border-[#5B2AF3] active:scale-[0.98]'
              } else if (isCorrect) {
                optClass += 'bg-[#67D7A8] border-[#67D7A8] text-[#180E33] font-black correct-pulse'
              } else if (isSelected && !isCorrect) {
                optClass += 'bg-red-500/80 border-red-400 text-white wrong-pulse'
              } else {
                optClass +=
                  'bg-[#180E33]/60 border-[#9474F6]/20 text-[#9474F6]/50'
              }

              return (
                <button
                  key={i}
                  onClick={() => handleOptionClick(i)}
                  disabled={hasAnswered}
                  className={optClass}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation && (
            <div className="rounded-xl bg-[#180E33] border border-[#9474F6]/30 px-4 py-3 text-sm text-[#DED8FA]">
              {currentQuestion.explanation}
            </div>
          )}

          {/* Power-ups row */}
          <div className="flex items-center justify-center gap-6 py-2">
            <PowerUpButton
              label="VAR"
              used={powerups.var}
              onClick={handleVAR}
              icon={<IconAdjustments size={20} />}
              disabled={answeredIndex !== null}
            />
            <PowerUpButton
              label="+5s"
              used={powerups.prorroga}
              onClick={handleProrroga}
              icon={<IconClock size={20} />}
              disabled={answeredIndex !== null}
            />
            <PowerUpButton
              label="Roja"
              used={powerups.tarjeta_roja}
              onClick={handleTarjetaRoja}
              icon={<IconCardsFilled size={20} />}
              disabled={answeredIndex !== null}
            />
          </div>

          {/* Timer bar */}
          <div className="h-2 w-full rounded-full bg-[#9474F6]/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${timerPercent}%`,
                backgroundColor: timerColor,
              }}
            />
          </div>
          <div
            className="text-center text-xs tabular-nums text-[#9474F6]/70"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {timeLeft}s
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PHASE: round-summary                                                */}
      {/* ------------------------------------------------------------------ */}
      {phase === 'round-summary' && (
        <div className="w-full max-w-md px-4 py-16 flex flex-col items-center gap-8">
          <div className="text-center">
            <span
              className="text-xs font-bold tracking-widest uppercase text-[#9474F6] mb-3 block"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Ronda {currentRound} completada
            </span>
            <h2
              className="text-5xl font-black italic text-[#F1F1F1]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {roundScores[roundScores.length - 1]?.correctCount ?? 0}
              <span className="text-[#9474F6]/50">/3</span>
            </h2>
            <p className="text-sm text-[#9474F6] mt-2">respuestas correctas</p>
          </div>

          <div className="w-full rounded-2xl border border-[#5B2AF3]/40 bg-[#180E33] p-5 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#DED8FA]/70">Tu puntuación esta ronda</span>
              <span
                className="text-[#67D7A8] font-bold"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {roundScores[roundScores.length - 1]?.score ?? 0} pts
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#DED8FA]/70">Estado del rival</span>
              <span className="text-[#9474F6]/70 italic">Esperando rival…</span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={submitting}
            className="btn-primary w-full justify-center"
          >
            {submitting
              ? 'Guardando…'
              : currentRound < 3
              ? `Continuar → Ronda ${currentRound + 1}`
              : 'Ver resultado'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PHASE: waiting-opponent                                             */}
      {/* ------------------------------------------------------------------ */}
      {phase === 'waiting-opponent' && (
        <div className="w-full max-w-md px-4 py-20 flex flex-col items-center gap-8">
          {/* Pulsing indicator */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-[#5B2AF3]/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-[#180E33] border-2 border-[#5B2AF3] flex items-center justify-center">
              <IconClock size={28} className="text-[#9474F6]" />
            </div>
          </div>

          <div className="text-center">
            <h2
              className="text-2xl font-black italic text-[#F1F1F1] mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Turno completado
            </h2>
            <p className="text-sm text-[#9474F6]">Esperando a tu rival</p>
            <p className="text-xs text-[#9474F6]/50 mt-1">
              El rival tiene 24h para responder
            </p>
          </div>

          {/* Total score summary */}
          <div className="w-full rounded-2xl border border-[#5B2AF3]/40 bg-[#180E33] p-5">
            <div className="flex flex-col gap-2">
              {roundScores.map((rs, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#DED8FA]/70">Ronda {i + 1}</span>
                  <span
                    className="text-[#67D7A8] font-bold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {rs.correctCount}/3 — {rs.score} pts
                  </span>
                </div>
              ))}
              <div className="border-t border-[#9474F6]/20 mt-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-[#DED8FA]">Total</span>
                <span
                  className="text-[#67D7A8]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {roundScores.reduce((s, r) => s + r.correctCount, 0)}/9 —{' '}
                  {roundScores.reduce((s, r) => s + r.score, 0)} pts
                </span>
              </div>
            </div>
          </div>

          <button onClick={handleCopyLink} className="btn-primary w-full justify-center gap-2">
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            {copied ? 'Enlace copiado' : 'Compartir partida'}
          </button>
        </div>
      )}
    </main>
  )
}

// ---------------------------------------------------------------------------
// PowerUpButton sub-component
// ---------------------------------------------------------------------------

interface PowerUpButtonProps {
  label: string
  used: boolean
  onClick: () => void
  icon: React.ReactNode
  disabled: boolean
}

function PowerUpButton({ label, used, onClick, icon, disabled }: PowerUpButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={used || disabled}
      title={label}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150 ${
        used
          ? 'opacity-30 cursor-not-allowed'
          : disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[#5B2AF3]/20 active:scale-90 cursor-pointer'
      }`}
    >
      <span className={used ? 'text-[#9474F6]/40' : 'text-[#9474F6]'}>{icon}</span>
      <span
        className={`text-[10px] font-bold tracking-wider uppercase ${
          used ? 'text-[#9474F6]/30' : 'text-[#9474F6]/70'
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
    </button>
  )
}
