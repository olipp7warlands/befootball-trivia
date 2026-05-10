import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

const personas = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'seed', 'bot-personas.json'), 'utf-8')
)

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('bot_personas').upsert(
    personas.map((p: Record<string, unknown>) => ({
      first_name: p.first_name,
      username_pattern: p.username_pattern,
      country_code: p.country_code,
      weight: p.weight ?? 1,
      used_count: 0,
    })),
    { onConflict: 'id', ignoreDuplicates: false }
  )

  if (error) throw error
  console.log(`✅ Seeded ${personas.length} bot personas`)
}

main().catch(console.error)
