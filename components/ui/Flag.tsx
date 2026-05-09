interface FlagProps {
  code: string
  size?: number
}

type FlagDef =
  | { type: 'h3'; colors: [string, string, string] }
  | { type: 'v3'; colors: [string, string, string] }
  | { type: 'h2'; colors: [string, string] }
  | { type: 'svg'; render: (w: number, h: number) => React.ReactNode }

const FLAGS: Record<string, FlagDef> = {
  ES: { type: 'h3', colors: ['#c60b1e', '#ffc400', '#c60b1e'] },
  AR: { type: 'h3', colors: ['#74acdf', '#ffffff', '#74acdf'] },
  DE: { type: 'h3', colors: ['#000000', '#dd0000', '#ffce00'] },
  FR: { type: 'v3', colors: ['#002395', '#ffffff', '#ed2939'] },
  IT: { type: 'v3', colors: ['#009246', '#ffffff', '#ce2b37'] },
  PT: { type: 'v3', colors: ['#006600', '#ff0000', '#ff0000'] },
  MX: { type: 'v3', colors: ['#006847', '#ffffff', '#ce1126'] },
  CO: { type: 'h3', colors: ['#fcd116', '#003087', '#ce1126'] },
  CL: { type: 'h2', colors: ['#d52b1e', '#ffffff'] },
  PE: { type: 'v3', colors: ['#d91023', '#ffffff', '#d91023'] },
  UY: { type: 'h3', colors: ['#ffffff', '#5585c5', '#ffffff'] },
  NL: { type: 'h3', colors: ['#ae1c28', '#ffffff', '#21468b'] },
  US: {
    type: 'svg',
    render: (w, h) => (
      <>
        <rect width={w} height={h} fill="#B22234" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={(h / 13) * i} width={w} height={h / 13} fill="#FFFFFF" />
        ))}
        <rect width={w * 0.4} height={(h / 13) * 7} fill="#3C3B6E" />
      </>
    ),
  },
  BR: {
    type: 'svg',
    render: (w, h) => (
      <>
        <rect width={w} height={h} fill="#009c3b" />
        <polygon
          points={`${w * 0.5},${h * 0.1} ${w * 0.95},${h * 0.5} ${w * 0.5},${h * 0.9} ${w * 0.05},${h * 0.5}`}
          fill="#ffdf00"
        />
        <circle cx={w * 0.5} cy={h * 0.5} r={Math.min(w, h) * 0.22} fill="#002776" />
      </>
    ),
  },
  JP: {
    type: 'svg',
    render: (w, h) => (
      <>
        <rect width={w} height={h} fill="#ffffff" />
        <circle cx={w * 0.5} cy={h * 0.5} r={Math.min(w, h) * 0.28} fill="#bc002d" />
      </>
    ),
  },
  KR: {
    type: 'svg',
    render: (w, h) => (
      <>
        <rect width={w} height={h} fill="#ffffff" />
        <circle cx={w * 0.5} cy={h * 0.5} r={Math.min(w, h) * 0.28} fill="#cd2e3a" />
      </>
    ),
  },
  MA: { type: 'h3', colors: ['#006233', '#c1272d', '#006233'] },
  SN: { type: 'v3', colors: ['#00853f', '#fdef42', '#e31b23'] },
  NG: { type: 'v3', colors: ['#008751', '#ffffff', '#008751'] },
  ENG: {
    type: 'svg',
    render: (w, h) => (
      <>
        <rect width={w} height={h} fill="#ffffff" />
        <rect x={w * 0.42} y={0} width={w * 0.16} height={h} fill="#cf142b" />
        <rect x={0} y={h * 0.38} width={w} height={h * 0.24} fill="#cf142b" />
      </>
    ),
  },
}

function getFlagGradient(def: FlagDef, w: number, h: number): React.ReactNode {
  if (def.type === 'h3') {
    const [c1, c2, c3] = def.colors
    return (
      <>
        <rect width={w} height={h / 3} fill={c1} />
        <rect y={h / 3} width={w} height={h / 3} fill={c2} />
        <rect y={(h * 2) / 3} width={w} height={h / 3} fill={c3} />
      </>
    )
  }
  if (def.type === 'v3') {
    const [c1, c2, c3] = def.colors
    return (
      <>
        <rect width={w / 3} height={h} fill={c1} />
        <rect x={w / 3} width={w / 3} height={h} fill={c2} />
        <rect x={(w * 2) / 3} width={w / 3} height={h} fill={c3} />
      </>
    )
  }
  if (def.type === 'h2') {
    const [c1, c2] = def.colors
    return (
      <>
        <rect width={w} height={h / 2} fill={c1} />
        <rect y={h / 2} width={w} height={h / 2} fill={c2} />
      </>
    )
  }
  return def.render(w, h)
}

export default function Flag({ code, size = 14 }: FlagProps) {
  const w = size
  const h = Math.round(size * 0.714)
  const def = FLAGS[code.toUpperCase()]

  if (!def) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: w,
          height: h,
          borderRadius: '1px',
          background: 'rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ borderRadius: '1px', flexShrink: 0, display: 'block' }}
      aria-hidden
    >
      {getFlagGradient(def, w, h)}
    </svg>
  )
}
