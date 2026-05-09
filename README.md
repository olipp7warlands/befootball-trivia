# Befootball World Cup Trivia

PVP async trivia game about FIFA World Cups. Lead capture → matchmaking → async 3-round matches → crystal share cards.

## Stack

Next.js 16 · TypeScript · Tailwind v4 · Supabase · Resend · Vercel

## Local setup

```bash
# 1. Install deps
pnpm install

# 2. Set env vars
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Run DB migrations (paste SQL into Supabase dashboard → SQL Editor)
#    supabase/migrations/001_initial_schema.sql
#    supabase/migrations/002_achievements_seed.sql

# 4. Seed questions (place preguntas-mundiales.json in scripts/ first)
pnpm seed

# 5. Start dev server
pnpm dev
```

Open http://localhost:3000

## DB migrations

Run in order in Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql` — all tables + RLS
2. `supabase/migrations/002_achievements_seed.sql` — 7 achievements

## Seeding questions

Place `preguntas-mundiales.json` in `scripts/` then run:

```bash
pnpm seed
```

Without the file, 20 sample questions are used across all 6 categories.

## Deploy (Vercel)

Set all env vars from `.env.example` in the Vercel dashboard, then:

```bash
vercel --prod
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Email gate — lead capture (name, email, country) |
| `/onboarding` | Pick username, creates profile |
| `/lobby` | Game hub — matchmaking, active matches |
| `/match/[id]` | Active gameplay |
| `/match/[id]/result` | Post-match result + share |
| `/ranking` | Weekly / Global / Country leaderboards |
| `/profile` | Player stats + achievements preview |
| `/achievements` | Full achievement gallery |
| `/share/[matchId]` | Crystal victory card + share actions |
| `/og/match/[matchId]` | OG image (1200x630, edge runtime) |

## Autonomous decisions

- **Font**: Archivo Black has no italic variant on Google Fonts — used Archivo 900 italic instead.
- **Proxy**: Next.js 16 renamed `middleware.ts` to `proxy.ts` and `middleware()` to `proxy()`. Implemented accordingly.
- **Power-up storage**: Stored in `match_rounds` answers metadata. Tarjeta Roja is visual-only per spec.
- **Achievement check**: "Coleccionista" skipped for MVP (requires historical cross-match query).

## Known gaps vs spec

- **Email notifications (Resend)**: Actions log intent but email templates not wired. Add `lib/email/resend.ts`.
- **PostHog events**: Not yet instrumented. Add `posthog.capture()` calls after each action.
- **IP geolocation**: Country defaults to ES. Wire an IP API for prefill.
- **Rankings cron**: No weekly rollover cron yet. Add via Supabase Edge Function or Vercel Cron.
- **Sudden-death tiebreaker**: Winner determined by correct count then total time. Extra question not implemented.
- **Realtime opponent status**: No Supabase Realtime subscription yet — waiting screen is static.
