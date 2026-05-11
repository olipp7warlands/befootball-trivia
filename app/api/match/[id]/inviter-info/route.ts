import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const admin = createAdminClient()

  const { data: match } = await admin
    .from('matches')
    .select('player_a, player_b, status')
    .eq('id', matchId)
    .single()

  // Only expose inviter info for open invitations (waiting + no player_b)
  if (!match || match.status !== 'waiting' || match.player_b !== null) {
    return NextResponse.json({ error: 'Not an open invitation' }, { status: 404 })
  }

  const { data: inviter } = await admin
    .from('profiles')
    .select('username, country_code, card_seed')
    .eq('id', match.player_a)
    .single()

  if (!inviter) return NextResponse.json({ error: 'Inviter not found' }, { status: 404 })

  return NextResponse.json({
    inviter: {
      username: inviter.username,
      country_code: inviter.country_code,
      card_seed: inviter.card_seed,
    },
  })
}
