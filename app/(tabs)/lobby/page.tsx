import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { CrystalCard, Avatar, Flag, DivisionPill } from '@/components/ui'
import { LobbyClient } from './LobbyClient'

export default async function LobbyPage() {
  const profile = await getProfile()
  if (!profile) redirect('/')

  // Fetch active matches
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  let activeMatches: any[] = []
  if (user) {
    const { data: matches } = await admin
      .from('matches')
      .select('id, player_a, player_b, status, current_round, started_at')
      .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
      .in('status', ['a_turn', 'b_turn', 'waiting'])
      .order('started_at', { ascending: false })
      .limit(5)

    if (matches?.length) {
      const opponentIds = matches
        .map(m => m.player_a === user.id ? m.player_b : m.player_a)
        .filter(Boolean) as string[]

      const { data: opponents } = opponentIds.length > 0
        ? await admin.from('profiles').select('id, username, country_code, card_seed, division').in('id', [...new Set(opponentIds)])
        : { data: [] }

      const oppMap = Object.fromEntries((opponents ?? []).map(p => [p.id, p]))

      const matchIds = matches.map(m => m.id)
      const { data: rounds } = await admin.from('match_rounds').select('match_id, player, correct_count').in('match_id', matchIds)
      type RoundRow = { match_id: string; player: string; correct_count: number | null }
      const byMatch = (rounds ?? []).reduce<Record<string, RoundRow[]>>((acc, r) => {
        if (!acc[r.match_id]) acc[r.match_id] = []
        acc[r.match_id].push(r as RoundRow)
        return acc
      }, {})

      activeMatches = matches.map(m => {
        const yourSide = m.player_a === user.id ? 'a' : 'b'
        const isYourTurn = m.status === (yourSide === 'a' ? 'a_turn' : 'b_turn')
        const opponentId = yourSide === 'a' ? m.player_b : m.player_a
        const opp = opponentId ? oppMap[opponentId] ?? null : null
        const mr = byMatch[m.id] ?? []
        const yourScore = mr.filter(r => r.player === user.id).reduce((s, r) => s + (r.correct_count ?? 0) * 100, 0)
        const oppRounds = mr.filter(r => r.player === opponentId)
        return {
          id: m.id,
          opponent: opp ? { username: opp.username, country_code: opp.country_code, card_seed: opp.card_seed, division: opp.division } : null,
          status: m.status,
          currentRound: m.current_round,
          yourScore,
          opponentScore: oppRounds.length > 0 ? oppRounds.reduce((s, r) => s + (r.correct_count ?? 0) * 100, 0) : null,
          isYourTurn,
        }
      })
    }
  }

  const accuracy =
    profile.total_questions > 0
      ? Math.round((profile.total_correct / profile.total_questions) * 100)
      : 0
  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '10px', letterSpacing: '-0.01em' }}>
                BEFOOTBALL · ID
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.03em', lineHeight: 0.92, marginTop: '6px' }}>
                {profile.username}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <Flag code={profile.country_code} size={16} />
              <Avatar cardSeed={profile.card_seed} initials={initials} size={28} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', opacity: 0.55, letterSpacing: '0.1em', textTransform: 'uppercase' }}>— Puntos</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>
                {profile.elo.toLocaleString('es')}
              </p>
            </div>
            <DivisionPill division={profile.division} />
          </div>
        </div>
      </CrystalCard>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px' }}>
        {[
          { label: 'Partidas', value: profile.matches_played },
          { label: 'Aciertos', value: `${accuracy}%` },
          { label: 'Racha', value: profile.current_streak },
          { label: 'Mejor', value: profile.best_streak },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRadius: '10px', border: '1px solid rgba(148,116,246,0.12)', background: 'rgba(148,116,246,0.05)', padding: '9px 4px', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: '#F1F1F1', lineHeight: 1 }}>{String(s.value)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <LobbyClient activeMatches={activeMatches} />
    </div>
  )
}
