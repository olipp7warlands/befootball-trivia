const PALETTES: [string, string][] = [
  ['#9474F6', '#5B2AF3'],
  ['#67D7A8', '#2a8c66'],
  ['#ff9f43', '#f1502f'],
  ['#DED8FA', '#9474F6'],
  ['#5B2AF3', '#180E33'],
  ['#67D7A8', '#5B2AF3'],
]

interface AvatarProps {
  cardSeed: number
  initials: string
  size?: 24 | 28 | 36 | 44
}

export default function Avatar({ cardSeed, initials, size = 36 }: AvatarProps) {
  const [from, to] = PALETTES[cardSeed % PALETTES.length]
  const fontSize = Math.round(size * 0.33)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: '1.5px solid rgba(241,241,241,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          color: '#F1F1F1',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        {initials.slice(0, 2)}
      </span>
    </div>
  )
}
