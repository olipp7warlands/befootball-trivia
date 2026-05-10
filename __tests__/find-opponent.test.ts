import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findOpponent } from '../lib/match/find-opponent'

// ---------------------------------------------------------------------------
// Mock generateBotProfile at module level
// ---------------------------------------------------------------------------

vi.mock('../lib/bots/generate-bot-profile', () => ({
  generateBotProfile: vi.fn().mockResolvedValue({
    id: 'bot-123',
    username: 'BotUser',
    country_code: 'ES',
    elo: 1480,
    division: 'diamond',
    card_seed: 42,
    is_bot: true,
    bot_skill: 0.8,
    bot_response_speed: 'medium',
  }),
}))

// ---------------------------------------------------------------------------
// Helper: build a mock admin supabase client using the "then" trick
// ---------------------------------------------------------------------------

function buildAdminMock(matchesData: any[], profilesData: any[]) {
  return {
    from: (table: string) => {
      const terminal: any = {
        select: () => terminal,
        eq: () => terminal,
        or: () => terminal,
        in: () => terminal,
        gte: () => terminal,
        lte: () => terminal,
        is: () => terminal,
        neq: () => terminal,
        limit: () => terminal,
        order: () => terminal,
        then: (resolve: (value: any) => any) => {
          if (table === 'matches') return resolve({ data: matchesData, error: null })
          if (table === 'profiles') return resolve({ data: profilesData, error: null })
          return resolve({ data: [], error: null })
        },
      }
      return terminal
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findOpponent', () => {
  const defaultCandidate = {
    id: 'user-b',
    username: 'RealUser',
    country_code: 'ES',
    elo: 1450,
    division: 'diamond',
    card_seed: 7,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns real user when real candidate exists', async () => {
    const adminMock = buildAdminMock(
      [], // no active matches
      [defaultCandidate]
    )

    const result = await findOpponent({
      userId: 'user-a',
      userElo: 1500,
      userCountry: 'ES',
      adminSupabase: adminMock,
    })

    expect(result.isBot).toBe(false)
    expect(result.profile.id).toBe(defaultCandidate.id)
    expect(result.profile.username).toBe(defaultCandidate.username)
  })

  it('falls back to bot when no real candidates', async () => {
    const adminMock = buildAdminMock(
      [], // no active matches
      [] // no real candidates
    )

    const result = await findOpponent({
      userId: 'user-a',
      userElo: 1500,
      userCountry: 'ES',
      adminSupabase: adminMock,
    })

    expect(result.isBot).toBe(true)
    expect(result.profile.username).toBe('BotUser')
    expect(result.profile.id).toBe('bot-123')
  })

  it('excludes active opponents and falls back to bot', async () => {
    // user-b is in an active match with user-a
    const activeMatch = {
      player_a: 'user-a',
      player_b: 'user-b',
    }

    // Profiles returns user-b as a candidate, but it should be excluded
    const adminMock = buildAdminMock([activeMatch], [defaultCandidate])

    const result = await findOpponent({
      userId: 'user-a',
      userElo: 1500,
      userCountry: 'ES',
      adminSupabase: adminMock,
    })

    // user-b is excluded because they're in an active match → falls back to bot
    expect(result.isBot).toBe(true)
    expect(result.profile.username).toBe('BotUser')
  })
})
