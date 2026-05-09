interface CrystalCardProps {
  seed: number
  aspectRatio?: string
  children: React.ReactNode
  className?: string
}

function getSeedDeg(seed: number): number {
  return (seed * 137) % 360
}

export default function CrystalCard({
  seed,
  aspectRatio = '9/14',
  children,
  className = '',
}: CrystalCardProps) {
  const deg = getSeedDeg(seed)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.15)',
        aspectRatio,
        background: [
          `radial-gradient(ellipse at 80% 15%, rgba(103,215,168,0.45) 0%, transparent 50%)`,
          `radial-gradient(ellipse at 20% 90%, rgba(222,216,250,0.30) 0%, transparent 50%)`,
          `conic-gradient(from ${deg}deg at 60% 40%, #5B2AF3 0deg, #9474F6 80deg, #DED8FA 160deg, #67D7A8 240deg, #5B2AF3 360deg)`,
        ].join(', '),
      }}
    >
      {/* Noise overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
