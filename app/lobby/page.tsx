import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/auth'
import { CrystalCard, Avatar, Flag, DivisionPill, BottomNav } from '@/components/ui'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { LobbyClient } from './LobbyClient'

export default async function LobbyPage() {
  const profile = await getProfile()
  if (!profile) redirect('/')

  const accuracy =
    profile.total_questions > 0
      ? Math.round((profile.total_correct / profile.total_questions) * 100)
      : 0

  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <ScreenContainer>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          paddingBottom: '72px', // space for fixed BottomNav
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 10px',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 900,
              fontSize: '14px',
              color: '#F1F1F1',
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            BEFOOTBALL
          </span>

          {/* Right side: username + division — truncate username if long */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'rgba(222,216,250,0.7)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile.username}
            </span>
            <div style={{ flexShrink: 0 }}>
              <DivisionPill division={profile.division} variant="inverse" />
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '0 20px',
          }}
        >
          {/* Mini-Pass card */}
          <CrystalCard seed={profile.card_seed} aspectRatio="2/1">
            <div
              style={{
                padding: '13px 14px 12px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#180E33',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 900,
                      fontSize: '10px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    BEFOOTBALL · ID
                  </p>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 900,
                      fontSize: '22px',
                      letterSpacing: '-0.03em',
                      lineHeight: 0.92,
                      marginTop: '6px',
                    }}
                  >
                    {profile.username}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <Flag code={profile.country_code} size={16} />
                  <Avatar cardSeed={profile.card_seed} initials={initials} size={28} />
                </div>
              </div>

              {/* Bottom row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '7px',
                      opacity: 0.55,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    — Puntos
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '16px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {profile.elo.toLocaleString('es')}
                  </p>
                </div>
                <DivisionPill division={profile.division} />
              </div>
            </div>
          </CrystalCard>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px' }}>
            {[
              { label: 'Partidas', value: String(profile.matches_played) },
              { label: 'Aciertos', value: `${accuracy}%` },
              { label: 'Racha', value: String(profile.current_streak) },
              { label: 'Mejor', value: String(profile.best_streak) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,116,246,0.12)',
                  background: 'rgba(148,116,246,0.05)',
                  padding: '9px 4px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#F1F1F1',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '7px',
                    opacity: 0.6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <LobbyClient />
        </main>
      </div>

      <BottomNav />
    </ScreenContainer>
  )
}
