import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = searchParams.get('type')
  const returnTo = searchParams.get('return_to') // e.g. /match/uuid

  // Build redirect responses — prefer return_to over /lobby
  const postAuthUrl = returnTo ? `${origin}${returnTo}` : `${origin}/lobby`
  const redirectLobby = NextResponse.redirect(postAuthUrl)
  const redirectError = NextResponse.redirect(`${origin}/?error=auth_failed`)

  // Create Supabase client that writes session cookies directly onto the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            redirectLobby.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let userId: string | undefined
  let userEmail: string | undefined
  let userMeta: Record<string, unknown> = {}

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      console.error('[callback] exchangeCodeForSession failed:', error?.message)
      return redirectError
    }
    userId = data.user.id
    userEmail = data.user.email
    userMeta = data.user.user_metadata ?? {}
  } else if (token && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'signup' | 'magiclink' | 'email' | 'recovery',
    })
    if (error || !data.user) {
      console.error('[callback] verifyOtp failed:', error?.message)
      return redirectError
    }
    userId = data.user.id
    userEmail = data.user.email
    userMeta = data.user.user_metadata ?? {}
  } else {
    return redirectError
  }

  // Check / create profile using admin client (bypasses RLS)
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (existing) {
    return redirectLobby
  }

  const username = userMeta.username as string | undefined
  const cardSeed = typeof userMeta.card_seed === 'number' ? userMeta.card_seed : 0
  const countryCode = (userMeta.country_code as string | undefined) ?? 'ES'

  if (!username) {
    return NextResponse.redirect(
      `${origin}/onboarding?email=${encodeURIComponent(userEmail ?? '')}`
    )
  }

  const { error: insertError } = await admin.from('profiles').insert({
    id: userId,
    email: userEmail!,
    username,
    country_code: countryCode,
    card_seed: cardSeed,
  })

  if (insertError?.code === '23505') {
    return NextResponse.redirect(
      `${origin}/onboarding?email=${encodeURIComponent(userEmail ?? '')}&username_taken=1`
    )
  }

  if (insertError) {
    console.error('[callback] Profile insert failed:', insertError.message)
  }

  return redirectLobby
}
