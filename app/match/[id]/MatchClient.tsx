'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, CircularTimer, RoundDots } from '@/components/ui'
import OptionCard, { OptionState } from '@/components/ui/OptionCard'
import PowerupTile from '@/components/ui/PowerupTile'
import CategoryBadge from '@/components/ui/CategoryBadge'

const LETTERS = ['A', 'B', 'C', 'D'] as const
const QUESTION_TIME = 15

// ── Types ────────────────────────────────────────────────────────────────────

interface Question { id: string; q: string; options: string[]; correct?: number; explanation?: string | null }
interface RoundData { num: number; category: string; questions: Question[]; yourAnswers: any[] | null; yourCorrectCount: number | null; opponentCorrectCount: number | null }
interface Opponent { id: string; username: string; country_code: string; elo: number; division: string; card_seed: number }
interface MatchStateData { matchId: string; status: string; currentRound: number; selectedCategories: string[]; yourSide: 'a' | 'b'; opponent: Opponent | null; rounds: RoundData[]; yourScore: number; opponentScore: number | null }

interface Props {
  matchId: string
  userId: string
  username: string
  cardSeed: number
  countryCode: string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MatchClient({ matchId, userId, username, cardSeed, countryCode }: Props) {
  const router = useRouter()

  const [matchData, setMatchData] = useState<MatchStateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctOption: number; explanation: string | null; points: number; roundComplete: boolean; matchComplete: boolean } | null>(null)
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([])
  const [powerupsUsed, setPowerupsUsed] = useState({ var: false, prorroga: false, roja: false })
  const [timerKey, setTimerKey] = useState(0)
  const [totalTime, setTotalTime] = useState(QUESTION_TIME)
  const [answering, setAnswering] = useState(false)

  const questionStartRef = useRef(Date.now())

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/state`)
      if (!res.ok) throw new Error('No se pudo cargar la partida')
      const data: MatchStateData = await res.json()
      setMatchData(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => { loadMatch() }, [loadMatch])

  // Reset question-ephemeral state when loading a fresh question
  function resetForNextQuestion() {
    setSelectedOption(null)
    setAnswerResult(null)
    setEliminatedOptions([])
    setTotalTime(QUESTION_TIME)
    setTimerKey(k => k + 1)
    questionStartRef.current = Date.now()
    setAnswering(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />
  if (error || !matchData) return <ErrorScreen error={error} />

  const isMyTurn = matchData.status === (matchData.yourSide === 'a' ? 'a_turn' : 'b_turn')
  const currentRoundIdx = Math.max(0, matchData.currentRound - 1)
  const currentRound = matchData.rounds[currentRoundIdx]
  const answeredCount = currentRound?.yourAnswers?.length ?? 0
  const currentQuestion = currentRound?.questions[answeredCount]
  const doneCount = currentRoundIdx * 3 + answeredCount

  if (matchData.status === 'finished') { router.replace(`/match/${matchId}/result`); return null }
  if (isMyTurn && answeredCount >= 3) { router.replace(`/match/${matchId}/round-result?round=${matchData.currentRound}`); return null }
  if (!isMyTurn) return <WaitingScreen matchData={matchData} onBack={() => router.push('/lobby')} />
  if (!currentQuestion) return <LoadingScreen />

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAnswer(optionIdx: number) {
    if (answering || selectedOption !== null) return
    setAnswering(true)
    setSelectedOption(optionIdx)
    const elapsed = Math.min(Date.now() - questionStartRef.current, totalTime * 1000)

    try {
      const res = await fetch(`/api/match/${matchId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, selectedOption: optionIdx, timeTakenMs: elapsed }),
      })
      const result = await res.json()
      setAnswerResult(result)

      setTimeout(async () => {
        if (result.matchComplete) {
          router.push(`/match/${matchId}/result`)
        } else if (result.roundComplete) {
          router.push(`/match/${matchId}/round-result?round=${matchData!.currentRound}`)
        } else {
          await loadMatch()
          resetForNextQuestion()
        }
      }, 2000)
    } catch {
      setAnswering(false)
      setSelectedOption(null)
    }
  }

  function handleTimeout() {
    if (answering || selectedOption !== null) return
    handleAnswer(-1)
  }

  async function handlePowerup(type: 'var' | 'prorroga' | 'roja') {
    if (powerupsUsed[type] || answering || selectedOption !== null) return
    const res = await fetch(`/api/match/${matchId}/use-powerup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, questionId: currentQuestion.id }),
    })
    if (!res.ok) return
    const data = await res.json()
    setPowerupsUsed(prev => ({ ...prev, [type]: true }))
    if (type === 'var') setEliminatedOptions(data.eliminatedOptions ?? [])
    if (type === 'prorroga') {
      const newTotal = totalTime + 5
      setTotalTime(newTotal)
      setTimerKey(k => k + 1)
    }
  }

  function getOptionState(idx: number): OptionState {
    if (eliminatedOptions.includes(idx)) return 'eliminated'
    if (!answerResult) return selectedOption === idx ? 'selected' : 'default'
    if (idx === answerResult.correctOption) return 'correct'
    if (idx === selectedOption && !answerResult.correct) return 'wrong'
    return 'default'
  }

  const yourInitials = username.slice(0, 2).toUpperCase()
  const oppInitials = (matchData.opponent?.username ?? '??').slice(0, 2).toUpperCase()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px 16px',
      }}
    >
      {/* VS Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <PlayerSide initials={yourInitials} seed={cardSeed} name={username} country={countryCode} align="left" />

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            fontSize: '17px',
            padding: '4px 11px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(148,116,246,0.18)',
            borderRadius: '8px',
            letterSpacing: '0.1em',
            color: '#F1F1F1',
            whiteSpace: 'nowrap',
          }}
        >
          {matchData.yourScore} · {matchData.opponentScore !== null ? matchData.opponentScore : '?'}
        </div>

        <PlayerSide
          initials={oppInitials}
          seed={matchData.opponent?.card_seed ?? 0}
          name={matchData.opponent?.username ?? '...'}
          country={matchData.opponent?.country_code ?? '?'}
          align="right"
        />
      </div>

      {/* Round Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 11px',
          background: 'rgba(91,42,243,0.12)',
          border: '1px solid rgba(91,42,243,0.25)',
          borderRadius: '8px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9.5px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#DED8FA',
          }}
        >
          Ronda {matchData.currentRound} / 3
        </span>
        <RoundDots total={9} doneCount={doneCount} currentIndex={doneCount} />
      </div>

      {/* Category */}
      <div style={{ marginBottom: '11px' }}>
        <CategoryBadge category={currentRound.category} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.h2
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 800,
            fontSize: '16px',
            lineHeight: 1.22,
            letterSpacing: '-0.015em',
            color: '#F1F1F1',
            margin: '0 0 14px',
          }}
        >
          {currentQuestion.q}
        </motion.h2>
      </AnimatePresence>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
        {currentQuestion.options.map((opt, idx) => (
          <OptionCard
            key={idx}
            letter={LETTERS[idx]}
            text={opt}
            state={getOptionState(idx)}
            onClick={() => handleAnswer(idx)}
            disabled={answering || selectedOption !== null}
          />
        ))}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answerResult?.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '10px' }}
          >
            <p
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(148,116,246,0.08)',
                border: '1px solid rgba(148,116,246,0.2)',
                fontSize: '11px',
                color: 'rgba(222,216,250,0.8)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {answerResult.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Timer Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <CircularTimer
          key={timerKey}
          secondsLeft={totalTime}
          totalSeconds={totalTime}
          autoStart
          paused={selectedOption !== null}
          onTimeout={handleTimeout}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8.5px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.6,
              color: '#DED8FA',
            }}
          >
            tiempo restante
          </span>
          <span style={{ fontSize: '10px', color: '#DED8FA' }}>
            +50 pts si aciertas en &lt;3s
          </span>
        </div>
      </div>

      {/* Power-ups */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {(['var', 'prorroga', 'roja'] as const).map(type => (
          <PowerupTile
            key={type}
            type={type}
            used={powerupsUsed[type]}
            onClick={() => handlePowerup(type)}
            disabled={answering || selectedOption !== null}
          />
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerSide({ initials, seed, name, country, align }: { initials: string; seed: number; name: string; country: string; align: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'flex-end', gap: '4px' }}>
      <Avatar cardSeed={seed} initials={initials} size={36} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em', color: '#DED8FA', textAlign: align }}>
        {name.slice(0, 12)} · {country}
      </span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(148,116,246,0.3)', borderTopColor: '#9474F6', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorScreen({ error }: { error: string | null }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
      <p style={{ color: '#dc3545', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{error ?? 'Error cargando la partida'}</p>
      <a href="/lobby" style={{ color: '#9474F6', fontSize: '12px' }}>← Volver al lobby</a>
    </div>
  )
}

function WaitingScreen({ matchData, onBack }: { matchData: MatchStateData; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '16px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#9474F6', letterSpacing: '0.18em', textTransform: 'uppercase' }}>— Ronda {matchData.currentRound}</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '24px', color: '#F1F1F1', letterSpacing: '-0.02em', lineHeight: 1 }}>
        Esperando a<br /><span style={{ color: '#67D7A8' }}>{matchData.opponent?.username ?? '...'}</span>
      </h2>
      <p style={{ fontSize: '12px', color: 'rgba(222,216,250,0.6)', maxWidth: '260px', lineHeight: 1.5 }}>
        Tu rival aún no ha jugado esta ronda. Te avisaremos por email cuando termine.
      </p>
      <button
        onClick={onBack}
        style={{ marginTop: '8px', padding: '11px 24px', borderRadius: '9999px', background: 'linear-gradient(180deg, #6d3df5, #5B2AF3)', color: '#F1F1F1', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}
      >
        Volver al lobby
      </button>
    </div>
  )
}
