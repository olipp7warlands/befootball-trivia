import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = searchParams.get('type')
  // return_to from URL (legacy) OR from user_metadata (set during OTP) — resolved after auth
  const urlReturnTo = searchParams.get('return_to')

  // Placeholder redirects — actual destination resolved after auth (using user_metadata.return_to)
  const redirectLobby = NextResponse.redirect(`${origin}/lobby`)
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

  // Resolve post-auth destination: metadata.return_to > URL return_to > /lobby
  const metaReturnTo = userMeta.return_to as string | undefined
  const finalReturnTo = metaReturnTo || urlReturnTo || null
  const postAuthRedirect = NextResponse.redirect(
    finalReturnTo ? `${origin}${finalReturnTo}` : `${origin}/lobby`
  )
  // Copy session cookies onto postAuthRedirect
  redirectLobby.cookies.getAll().forEach(c => postAuthRedirect.cookies.set(c.name, c.value))

  if (existing) {
    return postAuthRedirect
  }

  const username = userMeta.username as string | undefined
  const cardSeed = typeof userMeta.card_seed === 'number' ? userMeta.card_seed : 0
  const countryCode = (userMeta.country_code as string | undefined) ?? 'ES'

  if (!username) {
    const onboardingUrl = new URL(`${origin}/onboarding`)
    onboardingUrl.searchParams.set('email', userEmail ?? '')
    if (finalReturnTo) onboardingUrl.searchParams.set('return_to', finalReturnTo)
    return NextResponse.redirect(onboardingUrl.toString())
  }

  const { error: insertError } = await admin.from('profiles').insert({
    id: userId,
    email: userEmail!,
    username,
    country_code: countryCode,
    card_seed: cardSeed,
  })

  if (insertError?.code === '23505') {
    const onboardingUrl = new URL(`${origin}/onboarding`)
    onboardingUrl.searchParams.set('email', userEmail ?? '')
    onboardingUrl.searchParams.set('username_taken', '1')
    if (finalReturnTo) onboardingUrl.searchParams.set('return_to', finalReturnTo)
    return NextResponse.redirect(onboardingUrl.toString())
  }

  if (insertError) {
    console.error('[callback] Profile insert failed:', insertError.message)
  }

  return postAuthRedirect
}
