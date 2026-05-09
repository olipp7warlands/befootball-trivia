import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url))
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    console.error('[auth/callback] Exchange failed:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  // Check if profile already exists (returning user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) {
    return NextResponse.redirect(new URL('/lobby', request.url))
  }

  // New user — create profile from metadata set during signInWithOtp
  const meta = user.user_metadata ?? {}
  const username = meta.username as string | undefined
  const cardSeed = typeof meta.card_seed === 'number' ? meta.card_seed : 0
  const countryCode = (meta.country_code as string | undefined) ?? 'ES'

  if (!username) {
    // No metadata — send back to onboarding
    return NextResponse.redirect(
      new URL(`/onboarding?email=${encodeURIComponent(user.email ?? '')}`, request.url)
    )
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email!,
    username,
    country_code: countryCode,
    card_seed: cardSeed,
  })

  if (insertError) {
    console.error('[auth/callback] Profile insert failed:', insertError)
    // If username collision, let user pick a new one
    if (insertError.code === '23505') {
      return NextResponse.redirect(
        new URL(`/onboarding?email=${encodeURIComponent(user.email ?? '')}&username_taken=1`, request.url)
      )
    }
  }

  return NextResponse.redirect(new URL('/lobby', request.url))
}
