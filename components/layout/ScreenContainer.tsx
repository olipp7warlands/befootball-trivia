const BG = [
  'radial-gradient(ellipse 60% 40% at 15% 10%, rgba(91,42,243,0.45) 0%, transparent 60%)',
  'radial-gradient(ellipse 50% 35% at 90% 90%, rgba(148,116,246,0.30) 0%, transparent 60%)',
  '#0a0420',
].join(', ')

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

interface Props {
  children: React.ReactNode
}

export function ScreenContainer({ children }: Props) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        background: BG,
        position: 'relative',
      }}
    >
      {/* Noise texture */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: NOISE,
          opacity: 0.04,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Centered column — mobile full-width, desktop 420px */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          minHeight: '100dvh',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}
