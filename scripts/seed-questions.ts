import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local so the script works without manually exporting vars
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

// Load questions from preguntas-mundiales.json if it exists
// If not, use sample questions
const questionsFile = path.join(__dirname, 'preguntas-mundiales.json')

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let questions: any[]

  if (fs.existsSync(questionsFile)) {
    const raw = JSON.parse(fs.readFileSync(questionsFile, 'utf-8'))
    questions = raw.questions ?? raw
  } else {
    console.log('⚠️  preguntas-mundiales.json not found, using sample questions')
    questions = getSampleQuestions()
  }

  const rows = questions.map((q: any) => ({
    id: q.id,
    cat: q.cat,
    wc: q.wc ?? null,
    decade: q.decade ?? null,
    diff: q.diff,
    q: q.q,
    options: q.o ?? q.options,
    correct: q.a ?? q.correct,
    explanation: q.exp ?? q.explanation ?? null,
  }))

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from('questions').upsert(batch)
    if (error) throw error
    console.log(`✓ Seeded ${Math.min(i + 500, rows.length)}/${rows.length}`)
  }

  console.log(`✅ Done — ${rows.length} questions seeded`)
}

function getSampleQuestions() {
  return [
    { id: "fin-001", cat: "finales", wc: 2022, decade: "2020s", diff: 1, q: "¿Quién ganó el Mundial de 2022?", o: ["Francia","Argentina","Brasil","Alemania"], a: 1, exp: "Argentina venció a Francia en la final por penaltis." },
    { id: "fin-002", cat: "finales", wc: 2018, decade: "2010s", diff: 1, q: "¿Quién ganó el Mundial de 2018?", o: ["Brasil","Bélgica","Francia","Croacia"], a: 2, exp: "Francia venció a Croacia 4-2 en Moscú." },
    { id: "fin-003", cat: "finales", wc: 2014, decade: "2010s", diff: 1, q: "¿Quién ganó el Mundial de 2014?", o: ["Argentina","Alemania","Brasil","Países Bajos"], a: 1, exp: "Alemania venció a Argentina 1-0 con gol de Götze." },
    { id: "gol-001", cat: "goleadores", wc: null, decade: null, diff: 1, q: "¿Quién es el máximo goleador histórico de los Mundiales?", o: ["Pelé","Ronaldo Nazário","Miroslav Klose","Gerd Müller"], a: 2, exp: "Miroslav Klose marcó 16 goles en cuatro Mundiales." },
    { id: "gol-002", cat: "goleadores", wc: 2022, decade: "2020s", diff: 1, q: "¿Quién fue el Bota de Oro del Mundial 2022?", o: ["Messi","Mbappé","Giroud","Benzema"], a: 1, exp: "Kylian Mbappé fue el máximo goleador con 8 tantos." },
    { id: "sed-001", cat: "sedes", wc: 2026, decade: "2020s", diff: 2, q: "¿Cuántos países organizan el Mundial 2026?", o: ["1","2","3","4"], a: 2, exp: "EE.UU., Canadá y México co-organizan el Mundial 2026." },
    { id: "sed-002", cat: "sedes", wc: 1994, decade: "1990s", diff: 1, q: "¿Dónde se celebró el Mundial de 1994?", o: ["Alemania","Brasil","Estados Unidos","España"], a: 2, exp: "Estados Unidos fue la sede del Mundial 1994." },
    { id: "anec-001", cat: "anecdotas", wc: 2010, decade: "2010s", diff: 2, q: "¿Qué animal fue famoso por predecir resultados en el Mundial 2010?", o: ["León","Pulpo","Tortuga","Pez"], a: 1, exp: "El pulpo Paul acertó todos los resultados incluyendo la final." },
    { id: "anec-002", cat: "anecdotas", wc: 2006, decade: "2000s", diff: 2, q: "¿A quién le dio el famoso cabezazo Zidane en la final de 2006?", o: ["Cannavaro","Buffon","Materazzi","Totti"], a: 2, exp: "Zidane dio un cabezazo a Marco Materazzi en la final." },
    { id: "rec-001", cat: "records", wc: null, decade: null, diff: 2, q: "¿Cuál es el marcador más abultado de la historia de los Mundiales?", o: ["13-0","17-0","10-1","12-0"], a: 0, exp: "Hungría goleó a El Salvador 10-1 en 1982. El 13-0 fue entre Marruecos y Tahití en la Copa de África." },
    { id: "dec-001", cat: "decadas", wc: 1930, decade: "1930s", diff: 3, q: "¿Quién ganó el primer Mundial de la historia en 1930?", o: ["Brasil","Argentina","Uruguay","Italia"], a: 2, exp: "Uruguay ganó el primer Mundial en Montevideo." },
    { id: "dec-002", cat: "decadas", wc: 1950, decade: "1950s", diff: 3, q: "¿Cómo se llama la derrota de Brasil ante Uruguay en 1950?", o: ["Vergonha","Maracanazo","Cariocazo","Desastre"], a: 1, exp: "El Maracanazo ocurrió en el Estadio Maracaná con 200.000 espectadores." },
    { id: "fin-004", cat: "finales", wc: 2010, decade: "2010s", diff: 1, q: "¿Quién ganó el Mundial de 2010?", o: ["Portugal","Brasil","España","Alemania"], a: 2, exp: "España venció a Países Bajos 1-0 con gol de Iniesta." },
    { id: "gol-003", cat: "goleadores", wc: 1998, decade: "1990s", diff: 2, q: "¿Quién fue el goleador del Mundial 1998?", o: ["Ronaldo","Batistuta","Suker","Zidane"], a: 2, exp: "Davor Suker de Croacia fue el Bota de Oro con 6 goles." },
    { id: "sed-003", cat: "sedes", wc: 2002, decade: "2000s", diff: 2, q: "¿Qué dos países co-organizaron el Mundial 2002?", o: ["China y Japón","Corea del Sur y Japón","India y China","Australia y Japón"], a: 1, exp: "Corea del Sur y Japón fueron los primeros co-organizadores de un Mundial." },
    { id: "anec-003", cat: "anecdotas", wc: 1986, decade: "1980s", diff: 2, q: "¿Cuántos goles marcó Maradona con la 'Mano de Dios'?", o: ["0","1","2","3"], a: 1, exp: "Maradona marcó 1 gol con la mano vs Inglaterra en México 86." },
    { id: "rec-002", cat: "records", wc: null, decade: null, diff: 3, q: "¿En qué año se disputó el primer Mundial de fútbol?", o: ["1926","1928","1930","1932"], a: 2, exp: "El primer Mundial se disputó en Uruguay en 1930." },
    { id: "dec-003", cat: "decadas", wc: 1970, decade: "1970s", diff: 2, q: "¿Cuántos Mundiales ganó Brasil en los años 70?", o: ["0","1","2","3"], a: 1, exp: "Brasil ganó el Mundial de 1970 en México con el mítico equipo de Pelé." },
    { id: "fin-005", cat: "finales", wc: 2006, decade: "2000s", diff: 2, q: "¿Quién ganó el Mundial de 2006?", o: ["Francia","Portugal","Alemania","Italia"], a: 3, exp: "Italia venció a Francia en la final de Berlín por penaltis." },
    { id: "gol-004", cat: "goleadores", wc: 2014, decade: "2010s", diff: 2, q: "¿Cuántos goles marcó Alemania a Brasil en semifinales del 2014?", o: ["5","6","7","8"], a: 2, exp: "Alemania aplastó a Brasil 7-1 en el histórico 'Mineirazo'." },
  ]
}

main().catch(console.error)
