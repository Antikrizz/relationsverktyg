// Edge Function: analyze
// Hämtar parets veckodata, cachar analysen server-side så båda ser samma råd.
// Hanterar både engångsanalys och fortsatt chatt-konversation.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DIMENSIONS = [
  'Turning toward (vänder sig mot kontakt)',
  'Aktiv nyfikenhet (frågar hur den andra mår)',
  'Emotionell konversation (nära samtal utan att lösa)',
  'Empati och förståelse (försöker förstå partnerns känsla)',
  'Sårbarhet (visar sig utan rädsla för kritik)',
  'Fysisk beröring (närhet utan agenda)',
  'Repair (reparerar när det spänner)',
  'Soft start-up (startar svåra samtal mjukt)',
  'Shared meaning (jobbar som ett team)',
]

const SYSTEM_PROMPT = `Du är en kunnig och varm relationsstödjare med bred och aktuell kunskap om relationspsykologi, anknytning, kommunikation och välmående.

Du får veckodata från ett par — poäng (1–5) på 8 dimensioner av relationskvalitet, plus deras feedback till varandra (uppskattning, önskan, insikt om sig själv). Den personliga reflektionen delas inte.

Så här analyserar du:
- Utgå från vad datan faktiskt visar, inte från förutbestämda modeller
- Var extra uppmärksam på GAP mellan partnernas perspektiv på samma dimension — det är ofta det mest informativa signalet
- Notera trender om det finns historik (förbättring, försämring, återkommande mönster)
- Håll dig epistemiskt ödmjuk — du ser en del av bilden, inte allt

Strukturera alltid svaret i dessa tre delar:
1. **Vad vi ser** — kort sammanfattning av veckans mönster och eventuella gaps
2. **Råd** — tre konkreta råd: ett för varje person individuellt + ett gemensamt
3. **Veckans samtalsfråga** — en enda fråga de kan ta upp tillsammans

Ton: varm, direkt, handlingsorienterad. Undvik vaga generaliseringar.
Språk: svenska.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { room_id, mode, messages } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const dbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    }

    // Hämta rum och alla entries parallellt
    const [roomRes, entriesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${room_id}&select=*`, { headers: dbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/entries?room_id=eq.${room_id}&select=*&order=week_num.asc`, { headers: dbHeaders }),
    ])

    const [room] = await roomRes.json()
    const entries = await entriesRes.json()

    if (!room) throw new Error('Rum hittades inte')

    // Ta reda på senaste veckan där båda fyllt i
    const weeks: Record<number, Record<string, any>> = {}
    for (const e of entries) {
      if (!weeks[e.week_num]) weeks[e.week_num] = {}
      weeks[e.week_num][e.partner] = e
    }
    const latestBothWeek = Object.keys(weeks)
      .map(Number)
      .filter(w => weeks[w].p1 && weeks[w].p2)
      .sort((a, b) => b - a)[0]

    // Chatt-läge: generera alltid nytt svar (ingen cachning)
    if (mode === 'chat' && messages?.length > 0) {
      const context = buildContext(room, entries)
      const anthropicRes = await callClaude(anthropicKey, {
        system: `${SYSTEM_PROMPT}\n\n---\nKONTEXT FÖR DETTA PAR:\n${context}`,
        messages,
      })
      const result = await anthropicRes.json()
      if (!anthropicRes.ok) throw new Error(result.error?.message || 'Claude API-fel')
      return new Response(
        JSON.stringify({ content: result.content[0].text }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Analysläge: returnera cachad analys om den finns för senaste veckan
    if (latestBothWeek && room.analysis_week === latestBothWeek && room.analysis_text) {
      return new Response(
        JSON.stringify({ content: room.analysis_text, cached: true }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Generera ny analys
    const context = buildContext(room, entries)
    const anthropicRes = await callClaude(anthropicKey, {
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    })
    const result = await anthropicRes.json()
    if (!anthropicRes.ok) throw new Error(result.error?.message || 'Claude API-fel')

    const analysisText = result.content[0].text

    // Spara till databasen så partnern får samma svar
    if (latestBothWeek) {
      await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${room_id}`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ analysis_text: analysisText, analysis_week: latestBothWeek }),
        }
      )
    }

    return new Response(
      JSON.stringify({ content: analysisText }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

function callClaude(apiKey: string, body: { system: string; messages: any[] }) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, ...body }),
  })
}

function buildContext(room: any, entries: any[]) {
  const { p1_name, p2_name } = room

  const weeks: Record<number, Record<string, any>> = {}
  for (const e of entries) {
    if (!weeks[e.week_num]) weeks[e.week_num] = {}
    weeks[e.week_num][e.partner] = e
  }

  const weekNums = Object.keys(weeks).map(Number).sort((a, b) => b - a)
  if (weekNums.length === 0) return 'Ingen data tillgänglig ännu.'

  const latestWeekNum = weekNums[0]
  const latest = weeks[latestWeekNum]

  let text = `PAR: ${p1_name} och ${p2_name}\n\n`
  text += `=== SENASTE VECKAN (vecka ${latestWeekNum % 100}) ===\n\n`

  if (latest.p1 && latest.p2) {
    const s1 = latest.p1.scores
    const s2 = latest.p2.scores

    text += `Poäng per dimension (1=Aldrig, 5=Alltid):\n`
    DIMENSIONS.forEach((dim, i) => {
      const gap = Math.abs(s1[i] - s2[i])
      const gapFlag = gap >= 2 ? ' ← gap' : ''
      text += `  ${dim}: ${p1_name}=${s1[i]}, ${p2_name}=${s2[i]}${gapFlag}\n`
    })

    const avg1 = (s1.reduce((a: number, b: number) => a + b, 0) / 8).toFixed(1)
    const avg2 = (s2.reduce((a: number, b: number) => a + b, 0) / 8).toFixed(1)
    text += `  Snitt: ${p1_name}=${avg1}, ${p2_name}=${avg2}\n\n`

    const addFeedback = (entry: any, fromName: string, toName: string) => {
      if (!entry.fb_appreciation && !entry.fb_wish && !entry.fb_insight) return
      text += `${fromName}s feedback till ${toName}:\n`
      if (entry.fb_appreciation) text += `  Uppskattning: "${entry.fb_appreciation}"\n`
      if (entry.fb_wish) text += `  Önskan: "${entry.fb_wish}"\n`
      if (entry.fb_insight) text += `  Insikt om sig själv: "${entry.fb_insight}"\n`
      text += '\n'
    }

    addFeedback(latest.p1, p1_name, p2_name)
    addFeedback(latest.p2, p2_name, p1_name)
  } else {
    text += `(Bara en partner har fyllt i denna vecka — analys kräver båda.)\n\n`
  }

  if (weekNums.length > 1) {
    text += `=== HISTORIK (${weekNums.length - 1} veckor) ===\n`
    for (const wn of weekNums.slice(1, 9)) {
      const w = weeks[wn]
      const label = `Vecka ${wn % 100}`
      const avg = (scores: number[]) => (scores.reduce((a, b) => a + b, 0) / 8).toFixed(1)
      if (w.p1 && w.p2) {
        text += `  ${label}: ${p1_name} snitt ${avg(w.p1.scores)}, ${p2_name} snitt ${avg(w.p2.scores)}\n`
      } else if (w.p1) {
        text += `  ${label}: Bara ${p1_name} fyllde i\n`
      } else if (w.p2) {
        text += `  ${label}: Bara ${p2_name} fyllde i\n`
      }
    }
    text += '\n'
  }

  text += 'Analysera ovanstående och ge dina bästa råd.'
  return text
}
