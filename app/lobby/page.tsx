import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/auth'
import type { Division } from '@/lib/types'
import { LobbyClient } from './LobbyClient'

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱',
  PE: '🇵🇪', UY: '🇺🇾', BR: '🇧🇷', FR: '🇫🇷', DE: '🇩🇪',
  IT: '🇮🇹', PT: '🇵🇹', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', NL: '🇳🇱', US: '🇺🇸',
  JP: '🇯🇵', KR: '🇰🇷', MA: '🇲🇦', SN: '🇸🇳', NG: '🇳🇬',
}

const DIVISION_LABELS: Record<Division, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante',
  elite: 'Élite',
}

const DIVISION_CLASSES: Record<Division, string> = {
  bronze: 'bg-amber-900/40 text-amber-400 border-amber-700/40',
  silver: 'bg-gray-700/40 text-gray-300 border-gray-500/40',
  gold: 'bg-yellow-800/40 text-yellow-300 border-yellow-600/40',
  diamond: 'bg-blue-900/40 text-blue-300 border-blue-600/40',
  elite: 'bg-[#67D7A8]/10 text-[#67D7A8] border-[#67D7A8]/30',
}

export default async function LobbyPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/')
  }

  const accuracy =
    profile.total_questions > 0
      ? Math.round((profile.total_correct / profile.total_questions) * 100)
      : 0

  const flag = COUNTRY_FLAGS[profile.country_code] ?? '🌍'

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #2a1260 0%, #0a0420 100%)' }}
    >
      <header className="flex items-center justify-between px-4 py-4">
        <span
          className="text-sm font-black tracking-wider"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-lavender)' }}
        >
          BEFOOTBALL TRIVIA
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
            {profile.username}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DIVISION_CLASSES[profile.division]}`}
          >
            {DIVISION_LABELS[profile.division]}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 pb-8">
        <div
          className="crystal-card noise-overlay relative overflow-hidden p-5"
          style={{ '--card-angle': `${profile.card_seed}deg` } as React.CSSProperties}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Mini-pase
                </p>
                <h2
                  className="text-2xl font-black text-white leading-tight"
                  style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                >
                  {profile.username}
                </h2>
              </div>
              <span className="text-3xl" role="img" aria-label={profile.country_code}>
                {flag}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/50">ELO</p>
                <p
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {profile.elo}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${DIVISION_CLASSES[profile.division]}`}
              >
                {DIVISION_LABELS[profile.division]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Partidas', value: profile.matches_played },
            { label: 'Aciertos', value: `${accuracy}%` },
            { label: 'Racha', value: profile.current_streak },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 py-3"
            >
              <span
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {stat.value}
              </span>
              <span className="text-xs text-white/50">{stat.label}</span>
            </div>
          ))}
        </div>

        <LobbyClient />
      </main>

      <nav className="flex items-center justify-center gap-8 border-t border-white/10 py-4">
        <a
          href="/ranking"
          className="flex flex-col items-center gap-1 text-white/40 hover:text-[#9474F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span className="text-[10px]">Ranking</span>
        </a>
        <a
          href="/profile"
          className="flex flex-col items-center gap-1 text-white/40 hover:text-[#9474F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span className="text-[10px]">Perfil</span>
        </a>
        <a
          href="/achievements"
          className="flex flex-col items-center gap-1 text-white/40 hover:text-[#9474F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" /><path d="M12 3c0 0-2 2-5 2H5v6c0 3.87 3.13 7 7 7s7-3.13 7-7V5h-2c-3 0-5-2-5-2z" />
          </svg>
          <span className="text-[10px]">Logros</span>
        </a>
      </nav>
    </div>
  )
}
