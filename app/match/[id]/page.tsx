import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchClient from './MatchClient'
import type { Match } from '@/lib/types'

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (
    !match ||
    (match.player_a !== user.id && match.player_b !== user.id)
  ) {
    redirect('/lobby')
  }

  if (match.status === 'finished') {
    redirect(`/match/${id}/result`)
  }

  const typedMatch = match as Match

  return <MatchClient match={typedMatch} userId={user.id} />
}
