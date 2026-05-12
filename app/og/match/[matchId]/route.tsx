import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const CATEGORY_LABELS: Record<string, string> = {
  finales: 'Finales históricas',
  goleadores: 'Goleadores',
  sedes: 'Sedes & Estadios',
  anecdotas: 'Anécdotas',
  records: 'Récords',
  decadas: 'Por Décadas',
}

const DIVISION_LABELS: Record<string, string> = {
  bronze: 'Bronce', silver: 'Plata', gold: 'Oro', diamond: 'Diamante', elite: 'Élite',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const h = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  }

  // Defaults
  let winnerName = 'Jugador'
  let winnerCountry = 'ES'
  let winnerDivision = 'bronze'
  let cardAngle = 120
  let scoreStr = '? / 9'
  let bestCatLabel = 'Finales históricas'

  try {
    // 1. Match
    const mRes = await fetch(
      `${supabaseUrl}/rest/v1/matches?id=eq.${matchId}&select=winner,player_a,player_b,status&limit=1`,
      { headers: h }
    )
    const matches = await mRes.json()
    if (!matches?.[0] || matches[0].status !== 'finished') {
      return new Response('Match not ready', { status: 404 })
    }
    const m = matches[0]
    const winnerId: string = m.winner ?? m.player_a

    // 2. Winner profile
    const pRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${winnerId}&select=username,card_seed,country_code,division&limit=1`,
      { headers: h }
    )
    const profiles = await pRes.json()
    if (profiles?.[0]) {
      winnerName = profiles[0].username ?? 'Jugador'
      winnerCountry = profiles[0].country_code ?? 'ES'
      winnerDivision = profiles[0].division ?? 'bronze'
      cardAngle = ((profiles[0].card_seed ?? 0) * 137) % 360
    }

    // 3. Winner's rounds for score + best category
    const rRes = await fetch(
      `${supabaseUrl}/rest/v1/match_rounds?match_id=eq.${matchId}&player=eq.${winnerId}&select=correct_count,category`,
      { headers: h }
    )
    const rounds = await rRes.json()
    if (Array.isArray(rounds) && rounds.length > 0) {
      const total = rounds.reduce((s: number, r: { correct_count: number | null }) => s + (r.correct_count ?? 0), 0)
      scoreStr = `${total} / 9`
      const best = [...rounds].sort((a: { correct_count: number | null }, b: { correct_count: number | null }) =>
        (b.correct_count ?? 0) - (a.correct_count ?? 0)
      )[0] as { category: string } | undefined
      if (best) bestCatLabel = CATEGORY_LABELS[best.category] ?? best.category
    }
  } catch (e) {
    console.error('[og] error:', e)
    // continue with defaults
  }

  const divLabel = DIVISION_LABELS[winnerDivision] ?? winnerDivision

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #0d0626 0%, #1a0d40 100%)',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background radial glows */}
        <div style={{
          position: 'absolute', top: '-100px', left: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,42,243,0.45) 0%, transparent 65%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-60px',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(103,215,168,0.20) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* ── LEFT: Crystal card ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '520px',
          height: '630px',
          padding: '40px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: '440px',
            height: '540px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: [
              `radial-gradient(ellipse at 80% 15%, rgba(103,215,168,0.45) 0%, transparent 50%)`,
              `radial-gradient(ellipse at 20% 90%, rgba(222,216,250,0.30) 0%, transparent 50%)`,
              `conic-gradient(from ${cardAngle}deg at 60% 40%, #5B2AF3 0deg, #9474F6 80deg, #DED8FA 160deg, #67D7A8 240deg, #5B2AF3 360deg)`,
            ].join(', '),
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 28px 24px',
            color: '#180E33',
            boxShadow: '0 32px 80px rgba(91,42,243,0.5)',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
                BEFOOTBALL
              </span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#180E33', color: '#F1F1F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              }}>↗</div>
            </div>

            {/* Score */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px' }}>
              <span style={{ fontSize: '72px', fontWeight: 900, fontStyle: 'italic', lineHeight: '1', letterSpacing: '-0.03em' }}>
                {scoreStr}
              </span>
              <span style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                aciertos
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(24,14,51,0.25)', margin: '24px 0 18px', display: 'flex' }} />

            {/* Best category */}
            <span style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>
              — MEJOR CATEGORÍA
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>
              {bestCatLabel}
            </span>

            <div style={{ flex: 1, display: 'flex' }} />

            {/* Bottom */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', fontWeight: 800 }}>{winnerName}</span>
                <span style={{ fontSize: '11px', opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
                  {winnerCountry}
                </span>
              </div>
              <div style={{
                background: '#180E33', color: '#67D7A8',
                padding: '6px 12px', borderRadius: '99px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                display: 'flex',
              }}>
                ◆ {divLabel}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Text ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          padding: '48px 56px 48px 16px',
          position: 'relative',
          zIndex: 1,
        }}>
          <span style={{
            fontSize: '14px', color: '#67D7A8', letterSpacing: '0.18em',
            fontWeight: 700, textTransform: 'uppercase', marginBottom: '20px',
          }}>
            — Befootball Trivia
          </span>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '46px', fontWeight: 900, fontStyle: 'italic', color: '#F1F1F1', lineHeight: '1.05', letterSpacing: '-0.025em' }}>
              ¿Sabes más
            </span>
            <span style={{ fontSize: '46px', fontWeight: 900, fontStyle: 'italic', color: '#F1F1F1', lineHeight: '1.05', letterSpacing: '-0.025em' }}>
              de Mundiales
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '46px', fontWeight: 900, fontStyle: 'italic', color: '#F1F1F1', lineHeight: '1.05', letterSpacing: '-0.025em' }}>
                que&nbsp;
              </span>
              <span style={{ fontSize: '46px', fontWeight: 900, fontStyle: 'italic', color: '#67D7A8', lineHeight: '1.05', letterSpacing: '-0.025em' }}>
                {winnerName}
              </span>
              <span style={{ fontSize: '46px', fontWeight: 900, fontStyle: 'italic', color: '#F1F1F1', lineHeight: '1.05', letterSpacing: '-0.025em' }}>
                ?
              </span>
            </div>
          </div>

          <span style={{ fontSize: '20px', color: 'rgba(222,216,250,0.75)', marginTop: '24px', lineHeight: '1.4' }}>
            Demuéstralo en 3 minutos.
          </span>

          <span style={{ fontSize: '14px', color: 'rgba(148,116,246,0.6)', marginTop: '32px', letterSpacing: '0.04em' }}>
            befootball.com/trivia
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
