'use client'

import { useEffect, useRef, useState } from 'react'

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 100.53

interface CircularTimerProps {
  // Controlled mode (original): just pass secondsLeft + totalSeconds
  secondsLeft?: number
  totalSeconds?: number

  // Self-contained mode: autoStart=true, onTimeout fired when done
  autoStart?: boolean
  paused?: boolean
  onTimeout?: () => void
}

export default function CircularTimer({
  secondsLeft: controlledSecondsLeft,
  totalSeconds = 15,
  autoStart = false,
  paused = false,
  onTimeout,
}: CircularTimerProps) {
  const [elapsed, setElapsed] = useState(0) // seconds elapsed since start
  const startRef = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!autoStart) return

    firedRef.current = false
    startRef.current = Date.now()
    setElapsed(0)

    intervalRef.current = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000
      setElapsed(e)
      if (e >= totalSeconds && !firedRef.current) {
        firedRef.current = true
        clearInterval(intervalRef.current!)
        onTimeout?.()
      }
    }, 100)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, totalSeconds])

  // Pause: clear interval when paused
  useEffect(() => {
    if (!autoStart) return
    if (paused && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [paused, autoStart])

  const secondsLeft = autoStart
    ? Math.max(0, totalSeconds - elapsed)
    : (controlledSecondsLeft ?? totalSeconds)

  const progress = secondsLeft / totalSeconds
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isUrgent = secondsLeft <= 3
  const strokeColor = isUrgent ? '#dc3545' : '#67D7A8'
  const textColor = isUrgent ? '#dc3545' : '#67D7A8'

  return (
    <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
      <svg
        width={38}
        height={38}
        viewBox="0 0 38 38"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle cx={19} cy={19} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle
          cx={19} cy={19} r={RADIUS} fill="none"
          stroke={strokeColor} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '13px',
          color: textColor, transition: 'color 0.3s ease',
        }}
      >
        {String(Math.ceil(secondsLeft)).padStart(2, '0')}
      </div>
    </div>
  )
}
