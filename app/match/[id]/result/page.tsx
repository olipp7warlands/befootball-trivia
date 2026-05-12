export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Avatar, Flag, CrystalCard, DivisionPill, PillButton } from '@/components/ui'
import type { Profile, Division } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'
import RevanchaButton from './RevanchaButton'

export default async function MatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: match } = await admin.from('matches').select('*').eq('id', id).single()
  if (!match || (match.player_a !== user.id && match.player_b !== user.id)) redirect('/lobby')
  if (match.status !== 'finished') redirect(`/match/${id}`)

  const opponentId = match.player_a === user.id ? match.player_b : match.player_a

  // Load profiles
  const ids = [user.id, ...(opponentId ? [opponentId] : [])]
  const { data: profilesRaw } = await admin.from('profiles').select('*').in('id', ids)
  const profileMap = Object.fromEntries((profilesRaw ?? []).map((p: Profile) => [p.id, p]))
  const myProfile = profileMap[user.id] as Profile | undefined
  const opponentProfile = opponentId ? (profileMap[opponentId] as Profile | undefined) : undefined

  // Load rounds
  const { data: rounds } = await admin.from('match_rounds').select('*').eq('match_id', id)
  const allRounds = rounds ?? []

  const myRounds = allRounds.filter((r: any) => r.player === user.id)
  const oppRounds = allRounds.filter((r: any) => r.player === opponentId)

  // Aggregate
  const myCorrect = myRounds.reduce((s: number, r: any) => s + (r.correct_count ?? 0), 0)
  const oppCorrect = oppRounds.reduce((s: number, r: any) => s + (r.correct_count ?? 0), 0)
  const myTotalTimeMs = myRounds.reduce((s: number, r: any) => s + (r.time_taken_ms ?? 0), 0)
  const myTotalPoints = myRounds.flatMap((r: any) => r.answers ?? []).reduce((s: number, a: any) => s + (a.points ?? 0), 0)

  // Best category
  const catStats: Record<string, { correct: number; total: number }> = {}
  for (const r of myRounds as any[]) {
    const cat = r.category as string
    if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 }
    catStats[cat].correct += r.correct_count ?? 0
    catStats[cat].total += (r.questions ?? []).length
  }
  const bestCat = Object.entries(catStats).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))[0]

  // Outcome
  const isWinner = match.winner === user.id
  const isDraw = !match.winner
  const outcome: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinner ? 'win' : 'loss'

  // ELO delta (approximate using Elo formula with current post-match ELOs)
  let eloDelta = 0
  if (myProfile && opponentProfile) {
    const K = 32
    const expected = 1 / (1 + Math.pow(10, (opponentProfile.elo - myProfile.elo) / 400))
    const result = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0
    eloDelta = Math.floor(K * (result - expected))
  }

  const OUTCOME = {
    win:  { eyebrow: '— VICTORIA', eyebrowColor: '#67D7A8', hero: '¡La liga es tuya!' },
    loss: { eyebrow: '— DERROTA',  eyebrowColor: 'rgba(222,216,250,0.5)', hero: 'Esta vez no.' },
    draw: { eyebrow: '— EMPATE',   eyebrowColor: '#9474F6', hero: 'Empate técnico.' },
  }[outcome]

  const myInitials = (myProfile?.username ?? '??').slice(0, 2).toUpperCase()
  const oppInitials = (opponentProfile?.username ?? '??').slice(0, 2).toUpperCase()

  return (
    <ScreenContainer>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: OUTCOME.eyebrowColor, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>
            {OUTCOME.eyebrow}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '36px', lineHeight: 1, letterSpacing: '-0.025em', color: '#F1F1F1', marginBottom: '6px' }}>
            {OUTCOME.hero}
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(222,216,250,0.7)' }}>
            {myCorrect} de 9 aciertos
          </p>
        </div>

        {/* ── Scoreboard ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', background: 'rgba(148,116,246,0.06)', border: '1px solid rgba(148,116,246,0.18)', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
          {/* Left: me */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
            <Avatar cardSeed={myProfile?.card_seed ?? 0} initials={myInitials} size={36} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: '#F1F1F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
              {myProfile?.username ?? '??'}
            </span>
            <DivisionPill division={(myProfile?.division ?? 'bronze') as Division} />
          </div>

          {/* Center: score */}
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '28px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: outcome === 'win' ? '#67D7A8' : '#DED8FA' }}>{myCorrect}</span>
            <span style={{ color: 'rgba(148,116,246,0.3)', fontSize: '20px' }}>·</span>
            <span style={{ color: outcome === 'loss' ? '#67D7A8' : 'rgba(222,216,250,0.5)' }}>{oppCorrect}</span>
          </div>

          {/* Right: opponent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <Avatar cardSeed={opponentProfile?.card_seed ?? 0} initials={oppInitials} size={36} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '11px', color: '#F1F1F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px', textAlign: 'right' }}>
              {opponentProfile?.username ?? '...'}
            </span>
            <DivisionPill division={(opponentProfile?.division ?? 'bronze') as Division} />
          </div>
        </div>

        {/* ── Mini-Pass crystal ── */}
        {myProfile && (
          <div style={{ marginBottom: '14px' }}>
            <CrystalCard seed={myProfile.card_seed} aspectRatio="16/9">
              <div style={{ padding: '12px 14px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#180E33' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '10px' }}>BEFOOTBALL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Flag code={myProfile.country_code} size={14} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.03em', lineHeight: 0.95 }}>{myProfile.username}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', opacity: 0.6, marginTop: '3px' }}>
                      ELO {myProfile.elo} {eloDelta !== 0 && <span style={{ color: eloDelta > 0 ? '#067A50' : '#8B0000', fontWeight: 700 }}>({eloDelta > 0 ? '+' : ''}{eloDelta})</span>}
                    </p>
                  </div>
                  <DivisionPill division={myProfile.division} />
                </div>
              </div>
            </CrystalCard>
          </div>
        )}

        {/* ── Stats grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            {
              label: 'Mejor categoría',
              value: bestCat ? `${CATEGORY_LABELS[bestCat[0] as keyof typeof CATEGORY_LABELS] ?? bestCat[0]}` : '–',
              sub: bestCat ? `${bestCat[1].correct}/${bestCat[1].total}` : '',
            },
            {
              label: 'Tiempo total',
              value: `${(myTotalTimeMs / 1000).toFixed(0)}s`,
              sub: 'en 9 preguntas',
            },
            {
              label: 'Puntos ganados',
              value: String(myTotalPoints),
              sub: 'pts en este match',
            },
            {
              label: 'ELO',
              value: String(myProfile?.elo ?? '–'),
              sub: eloDelta !== 0 ? `${eloDelta > 0 ? '+' : ''}${eloDelta} en esta partida` : 'sin cambio',
              valueColor: eloDelta > 0 ? '#67D7A8' : eloDelta < 0 ? '#dc3545' : '#DED8FA',
            },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(148,116,246,0.05)', border: '1px solid rgba(148,116,246,0.12)', borderRadius: '10px', padding: '10px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(222,216,250,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: (s as any).valueColor ?? '#F1F1F1', lineHeight: 1 }}>{s.value}</p>
              {s.sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(222,216,250,0.45)', marginTop: '2px' }}>{s.sub}</p>}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── CTAs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="/lobby" style={{ textDecoration: 'none' }}>
            <PillButton variant="primary" arrow>Volver al lobby</PillButton>
          </a>
          <RevanchaButton previousMatchId={id} />
        </div>

        <p style={{ marginTop: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(222,216,250,0.3)' }}>
          {new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </ScreenContainer>
  )
}
