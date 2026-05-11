export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getProfile } from '@/app/actions/auth'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { TabsHeader } from '@/components/layout/TabsHeader'
import { BottomNav } from '@/components/ui'

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/')

  return (
    <ScreenContainer>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <TabsHeader
          username={profile.username}
          cardSeed={profile.card_seed}
          division={profile.division}
        />
        <main style={{ flex: 1, paddingBottom: '72px' }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </ScreenContainer>
  )
}
