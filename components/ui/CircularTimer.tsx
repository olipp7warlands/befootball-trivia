'use client'

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 100.53

interface CircularTimerProps {
  secondsLeft: number
  totalSeconds?: number
}

export default function CircularTimer({
  secondsLeft,
  totalSeconds = 15,
}: CircularTimerProps) {
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
        {/* Track */}
        <circle
          cx={19}
          cy={19}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
        />
        {/* Progress */}
        <circle
          cx={19}
          cy={19}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      {/* Center number */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          fontSize: '13px',
          color: textColor,
          transition: 'color 0.3s ease',
        }}
      >
        {String(secondsLeft).padStart(2, '0')}
      </div>
    </div>
  )
}
