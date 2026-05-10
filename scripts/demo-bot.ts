/**
 * Demo: generate 5 bot profiles for a Diamond ES user (ELO 1500).
 * Run: npx tsx scripts/demo-bot.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}

async function main() {
  const { generateBotProfile } = await import('../lib/bots/generate-bot-profile')
  const opts = { userElo: 1500, userCountry: 'ES', userId: 'demo-user-id' }

  console.log('Generating 5 bots for ELO=1500 country=ES\n')
  for (let i = 1; i <= 5; i++) {
    try {
      const bot = await generateBotProfile(opts)
      console.log(
        `Bot ${i}: ${bot.username.padEnd(22)} ${bot.country_code}  ELO ${String(bot.elo).padEnd(5)}  ${bot.division.padEnd(8)} skill ${bot.bot_skill.toFixed(2)}  speed ${bot.bot_response_speed}`
      )
    } catch (e) {
      console.error(`Bot ${i} failed:`, (e as Error).message)
    }
  }
}

main().catch(console.error)
