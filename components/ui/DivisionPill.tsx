import type { Division } from '@/lib/types'

const styles: Record<Division, string> = {
  bronze: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  silver: 'text-gray-300 border-gray-300/30 bg-gray-400/10',
  gold: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  diamond: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  elite: 'text-[#67D7A8] border-[#67D7A8]/40 bg-[#67D7A8]/10',
}

const labels: Record<Division, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante',
  elite: 'Élite',
}

export default function DivisionPill({ division }: { division: Division }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${styles[division]}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {labels[division]}
    </span>
  )
}
