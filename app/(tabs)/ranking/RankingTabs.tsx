'use client'

import { useState } from 'react'
import type { Profile, Division, RankingWeekly } from '@/lib/types'

type WeeklyRow = RankingWeekly & {
  profiles: Pick<Profile, 'username' | 'country_code' | 'elo' | 'division' | 'card_seed'>
}

interface RankingTabsProps {
  weekly: WeeklyRow[]
  global: Profile[]
  country: Profile[]
  currentUserId: string | null
  currentUserElo: number | null
  currentUserDivision: Division | null
  currentUserUsername: string | null
  currentUserCountry: string | null
  currentUserGlobalRank: number | null
  currentUserWeeklyRank: number | null
}

const DIVISION_STYLES: Record<Division, { text: string; border: string; label: string }> = {
  bronze:  { text: 'text-amber-400',  border: 'border-amber-400/40',  label: 'Bronce' },
  silver:  { text: 'text-gray-300',   border: 'border-gray-300/40',   label: 'Plata' },
  gold:    { text: 'text-yellow-400', border: 'border-yellow-400/40', label: 'Oro' },
  diamond: { text: 'text-blue-400',   border: 'border-blue-400/40',   label: 'Diamante' },
  elite:   { text: 'text-turquoise',  border: 'border-turquoise/40',  label: 'Élite' },
}

function countryFlag(code: string) {
  // Convert ISO 3166-1 alpha-2 to flag emoji
  if (!code || code.length !== 2) return '🏳️'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1F1E0 + c.charCodeAt(0) - 65)
  )
}

function InitialCircle({ username }: { username: string }) {
  const colors = [
    'bg-intense-violet', 'bg-lavender', 'bg-turquoise',
    'bg-blue-500', 'bg-pink-500', 'bg-orange-500',
  ]
  const idx = username.charCodeAt(0) % colors.length
  return (
    <span
      className={`${colors[idx]} flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white`}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function DivisionPill({ division }: { division: Division }) {
  const s = DIVISION_STYLES[division]
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.text} ${s.border}`}
    >
      {s.label}
    </span>
  )
}

function PodiumCard({
  rank,
  username,
  elo,
  country,
  division,
  isFirst,
}: {
  rank: number
  username: string
  elo: number
  country: string
  division: Division
  isFirst: boolean
}) {
  const medals = ['🥇', '🥈', '🥉']
  const s = DIVISION_STYLES[division]
  return (
    <div
      className={`noise-overlay relative flex flex-col items-center gap-1.5 rounded-[1.5rem] border border-white/10 p-4 ${
        isFirst ? 'scale-105 z-10' : ''
      }`}
      style={{
        background:
          'conic-gradient(from 120deg at 40% 50%, #180E33 0deg, #5B2AF3 60deg, #9474F6 120deg, #67D7A8 180deg, #DED8FA 240deg, #5B2AF3 300deg, #180E33 360deg)',
        minWidth: '90px',
      }}
    >
      <span className="text-2xl">{medals[rank - 1]}</span>
      <span
        className="text-center text-xs font-bold text-white leading-tight"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {username}
      </span>
      <span className="text-sm">{countryFlag(country)}</span>
      <span
        className={`text-xs font-bold ${s.text}`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {elo}
      </span>
    </div>
  )
}

function RankRow({
  rank,
  username,
  country,
  division,
  elo,
  isCurrentUser,
}: {
  rank: number
  username: string
  country: string
  division: Division
  elo: number
  isCurrentUser: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${
        isCurrentUser
          ? 'border border-lavender/30 bg-intense-violet/20'
          : 'border border-white/5 bg-white/5'
      }`}
    >
      <span
        className="w-7 shrink-0 text-right text-sm font-bold tabular-nums text-white/50"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {rank}
      </span>
      <InitialCircle username={username} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-white">
          {username} <span className="text-xs">{countryFlag(country)}</span>
          {isCurrentUser && (
            <span className="ml-1 text-[10px] font-bold text-lavender uppercase tracking-wider">
              tú
            </span>
          )}
        </span>
      </div>
      <DivisionPill division={division} />
      <span
        className="shrink-0 text-sm font-bold tabular-nums text-white/80"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {elo}
      </span>
    </div>
  )
}

type TabId = 'weekly' | 'global' | 'country'

export default function RankingTabs({
  weekly,
  global,
  country,
  currentUserId,
  currentUserElo,
  currentUserDivision,
  currentUserUsername,
  currentUserCountry,
  currentUserGlobalRank,
  currentUserWeeklyRank,
}: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('global')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'weekly', label: 'Semanal' },
    { id: 'global', label: 'Global' },
    { id: 'country', label: 'Mi País' },
  ]

  type ListItem = { rank: number; username: string; country: string; division: Division; elo: number; userId: string }

  function getList(): ListItem[] {
    if (activeTab === 'weekly') {
      return weekly.map((row, i) => ({
        rank: i + 1,
        username: row.profiles.username,
        country: row.profiles.country_code,
        division: row.profiles.division,
        elo: row.profiles.elo,
        userId: row.user_id,
      }))
    }
    if (activeTab === 'country') {
      return country.map((p, i) => ({
        rank: i + 1,
        username: p.username,
        country: p.country_code,
        division: p.division,
        elo: p.elo,
        userId: p.id,
      }))
    }
    return global.map((p, i) => ({
      rank: i + 1,
      username: p.username,
      country: p.country_code,
      division: p.division,
      elo: p.elo,
      userId: p.id,
    }))
  }

  const list = getList()
  const top3 = list.slice(0, 3)
  const rest = list.slice(3)

  const userInList = list.some((r) => r.userId === currentUserId)
  const userRank = activeTab === 'weekly' ? currentUserWeeklyRank : currentUserGlobalRank

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-intense-violet text-white shadow-lg'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium top 3 */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2">
          {top3.length > 1 && (
            <PodiumCard
              rank={2}
              username={top3[1].username}
              elo={top3[1].elo}
              country={top3[1].country}
              division={top3[1].division}
              isFirst={false}
            />
          )}
          <PodiumCard
            rank={1}
            username={top3[0].username}
            elo={top3[0].elo}
            country={top3[0].country}
            division={top3[0].division}
            isFirst={true}
          />
          {top3.length > 2 && (
            <PodiumCard
              rank={3}
              username={top3[2].username}
              elo={top3[2].elo}
              country={top3[2].country}
              division={top3[2].division}
              isFirst={false}
            />
          )}
        </div>
      )}

      {/* Ranked list */}
      <div className="flex flex-col gap-2">
        {rest.map((row) => (
          <RankRow
            key={row.userId}
            rank={row.rank}
            username={row.username}
            country={row.country}
            division={row.division}
            elo={row.elo}
            isCurrentUser={row.userId === currentUserId}
          />
        ))}

        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-white/40">Sin datos todavía</p>
        )}
      </div>

      {/* Sticky "You" row when user is outside top 20 */}
      {currentUserId && !userInList && currentUserElo !== null && currentUserDivision && currentUserUsername && currentUserCountry && (
        <div className="sticky bottom-4 mt-2">
          <RankRow
            rank={userRank ?? 9999}
            username={currentUserUsername}
            country={currentUserCountry}
            division={currentUserDivision}
            elo={currentUserElo}
            isCurrentUser={true}
          />
        </div>
      )}
    </div>
  )
}
