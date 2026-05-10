import { createAdminClient } from '@/lib/supabase/admin'
import {
  gaussianElo,
  getDivision,
  getBotSkill,
  getBotResponseSpeed,
  resolveUsername,
  weightedPick,
} from './utils'

interface BotPersona {
  id: string
  first_name: string
  username_pattern: string
  country_code: string
  weight: number
  used_count: number
}

export interface BotProfile {
  id: string
  username: string
  country_code: string
  elo: number
  division: string
  card_seed: number
  is_bot: true
  bot_skill: number
  bot_response_speed: 'fast' | 'medium' | 'slow'
}

export async function generateBotProfile(opts: {
  userElo: number
  userCountry: string
  userId: string
}): Promise<BotProfile> {
  const admin = createAdminClient()

  // ── 1. Load personas ────────────────────────────────────────────────────
  const { data: allPersonas, error: pErr } = await admin
    .from('bot_personas')
    .select('*')
  if (pErr || !allPersonas?.length) throw new Error('bot_personas table empty or unreachable')

  const personas = allPersonas as BotPersona[]

  // 60% chance: prefer same country, 40%: full pool
  const useSameCountry = Math.random() < 0.6
  const pool = useSameCountry
    ? (personas.filter((p) => p.country_code === opts.userCountry).length > 0
        ? personas.filter((p) => p.country_code === opts.userCountry)
        : personas)
    : personas

  const persona = weightedPick(pool)

  // Increment used_count (fire-and-forget, non-blocking)
  admin.from('bot_personas').update({ used_count: persona.used_count + 1 }).eq('id', persona.id)

  // ── 2. Generate ELO + division ──────────────────────────────────────────
  const elo = gaussianElo(opts.userElo)
  const division = getDivision(elo)

  // ── 3. Resolve unique username (max 8 attempts) ─────────────────────────
  let username = ''
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = resolveUsername(persona.username_pattern, persona.first_name, attempt)
    const { data: clash } = await admin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle()
    if (!clash) {
      username = candidate
      break
    }
  }
  if (!username) {
    // Final fallback: append random 4-digit suffix
    username = resolveUsername(persona.username_pattern, persona.first_name) +
      String(Math.floor(Math.random() * 9000) + 1000)
  }

  // ── 4. Compute remaining fields ─────────────────────────────────────────
  const botSkill = getBotSkill(division)
  const botSpeed = getBotResponseSpeed()
  const cardSeed = Math.floor(Math.random() * 10000)
  const botEmail = `bot+${crypto.randomUUID()}@internal.local`

  // ── 5. Create auth user first (profiles.id FK → auth.users.id) ──────────
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: botEmail,
    email_confirm: true,
    user_metadata: { is_bot: true },
  })
  if (authErr || !authData?.user) throw new Error(`Bot auth user creation failed: ${authErr?.message}`)

  const botUserId = authData.user.id

  // ── 6. Insert profile ────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await admin
    .from('profiles')
    .insert({
      id: botUserId,
      email: botEmail,
      username,
      country_code: persona.country_code,
      elo,
      division,
      card_seed: cardSeed,
      is_bot: true,
      bot_skill: botSkill,
      bot_response_speed: botSpeed,
      last_active_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    // Clean up orphan auth user on profile insert failure
    await admin.auth.admin.deleteUser(botUserId)
    throw new Error(`Bot profile insert failed: ${insertErr?.message}`)
  }

  return {
    id: inserted.id,
    username,
    country_code: persona.country_code,
    elo,
    division,
    card_seed: cardSeed,
    is_bot: true,
    bot_skill: botSkill,
    bot_response_speed: botSpeed,
  }
}
