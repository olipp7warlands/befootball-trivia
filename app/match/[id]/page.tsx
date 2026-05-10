import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import MatchClient from './MatchClient'

export default async function MatchPage({
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
  if (match.status === 'finished') redirect(`/match/${id}/result`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, card_seed, country_code')
    .eq('id', user.id)
    .single()

  return (
    <ScreenContainer>
      <MatchClient
        matchId={id}
        userId={user.id}
        username={profile?.username ?? '??'}
        cardSeed={profile?.card_seed ?? 0}
        countryCode={profile?.country_code ?? 'ES'}
      />
    </ScreenContainer>
  )
}
