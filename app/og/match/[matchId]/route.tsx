import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let winnerName = 'Jugador'
  let loserName = 'Rival'
  let cardAngle = 120

  try {
    const matchRes = await fetch(
      `${supabaseUrl}/rest/v1/matches?id=eq.${matchId}&select=*,winner_profile:profiles!winner(username,card_seed),player_a_profile:profiles!player_a(username),player_b_profile:profiles!player_b(username)`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )
    const matches = await matchRes.json()
    if (matches?.[0]) {
      const m = matches[0]
      winnerName = m.winner_profile?.username ?? 'Jugador'
      cardAngle = (m.winner_profile?.card_seed ?? 0) % 360
      const otherProfile =
        m.winner === m.player_a ? m.player_b_profile : m.player_a_profile
      loserName = otherProfile?.username ?? 'Rival'
    }
  } catch {
    // fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #0a0420 0%, #180E33 50%, #2a1260 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(103,215,168,0.2) 0%, transparent 70%)',
          }}
        />

        {/* Crystal card */}
        <div
          style={{
            width: '360px',
            height: '520px',
            borderRadius: '32px',
            background: `conic-gradient(from ${cardAngle}deg at 40% 50%, #180E33 0deg, #5B2AF3 60deg, #9474F6 120deg, #67D7A8 180deg, #DED8FA 240deg, #5B2AF3 300deg, #180E33 360deg)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            border: '1px solid rgba(148,116,246,0.4)',
            position: 'relative',
            boxShadow:
              '0 24px 80px rgba(91,42,243,0.4), 0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '24px',
              color: 'rgba(241,241,241,0.75)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.2em',
            }}
          >
            BEFOOTBALL
          </div>

          {/* VICTORIA label */}
          <div
            style={{
              color: '#67D7A8',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              marginBottom: '12px',
            }}
          >
            VICTORIA
          </div>

          {/* Winner name */}
          <div
            style={{
              color: '#F1F1F1',
              fontSize: '44px',
              fontWeight: 900,
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {winnerName}
          </div>

          {/* Opponent */}
          <div
            style={{
              color: '#9474F6',
              fontSize: '16px',
              marginTop: '16px',
            }}
          >
            vs {loserName}
          </div>

          {/* Arrow badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F1F1F1',
              fontSize: '16px',
            }}
          >
            ↗
          </div>
        </div>

        {/* Right side text */}
        <div
          style={{
            marginLeft: '72px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '520px',
          }}
        >
          <div
            style={{
              color: '#9474F6',
              fontSize: '13px',
              letterSpacing: '0.3em',
              fontWeight: 700,
            }}
          >
            BEFOOTBALL WORLD CUP TRIVIA
          </div>
          <div
            style={{
              color: '#F1F1F1',
              fontSize: '38px',
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1.15,
            }}
          >
            DEMUESTRA QUE SABES DE MUNDIALES
          </div>
          <div
            style={{
              color: '#9474F6',
              fontSize: '17px',
              marginTop: '8px',
            }}
          >
            trivia.befootball.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
