interface RoundDotsProps {
  total?: number
  doneCount: number
  currentIndex: number
}

export default function RoundDots({
  total = 9,
  doneCount,
  currentIndex,
}: RoundDotsProps) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < doneCount
        const isCurrent = i === currentIndex

        let bg = 'rgba(222,216,250,0.2)'
        let boxShadow = 'none'

        if (isDone) {
          bg = '#67D7A8'
        } else if (isCurrent) {
          bg = '#5B2AF3'
          boxShadow = '0 0 0 2px rgba(91,42,243,0.25)'
        }

        return (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '9999px',
              background: bg,
              boxShadow,
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        )
      })}
    </div>
  )
}
