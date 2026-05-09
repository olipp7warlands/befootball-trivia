export default function BetaBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 7px',
        borderRadius: '9999px',
        border: '1px solid rgba(103,215,168,0.4)',
        color: '#67D7A8',
        fontFamily: 'var(--font-mono)',
        fontSize: '8.5px',
        letterSpacing: '0.1em',
        lineHeight: 1,
        background: 'transparent',
        textTransform: 'uppercase',
      }}
    >
      BETA
    </span>
  )
}
