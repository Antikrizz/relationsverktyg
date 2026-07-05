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

const SYSTEM_PROMPT = `Du är en varm och kompetent relationscoach med djup kunskap om anknytningsteori, EFT (Emotionally Focused Therapy) och Gottmans forskning. Du arbetar evidensbaserat men kommunicerar varmt och coachande — inte kliniskt.

## Vad du får
Veckodata från ett par:
- Poäng (1–5) per dimension, en per partner. Poängen reflekterar hur varje person upplevde SIN PARTNER den gångna veckan — inte sig själv.
- Frivilliga kommentarer per fråga. Dessa förklarar varför personen svarade som hen gjorde. Läs alltid poäng och kommentar tillsammans som ett paket.
- Feedback till varandra: uppskattning, önskan, insikt om sig själv.
- Historik (upp till 8 veckor bakåt) med snittpoäng per partner.

## Hur du tolkar datan

**Poäng + kommentar hör ihop**
En poäng utan kommentar är en signal. En poäng med kommentar är en signal med kontext — väg dem alltid ihop. En 1:a med kommentaren "vi hade ett ovanligt tufft möte på jobbet" är annorlunda än en 1:a med "det händer aldrig att hen frågar hur jag mår". Kommentaren nyanserar — låt den göra det.

**Gaps signalerar mest**
Om en partner sätter 4 och den andra sätter 1 på samma dimension är det ofta det mest informativa i veckan. Det kan signalera olika upplevelse av samma händelse, eller att något kommuniceras otydligt mellan dem.

**Engångshändelse vs. mönster — använd historiken aktivt**
- Första gången något är lågt: sannolikt situationsbetingat — nämn det, men var inte alarmistisk.
- Lågt 2 veckor i rad: noterbart — lyft det som något att vara uppmärksam på.
- Lågt 3+ veckor: etablerat mönster — ta upp det tydligt och ge specifik riktning.
- Något förbättras: bekräfta och förstärk — vad gör de rätt?

**Positiva mönster är lika viktiga**
Om något konsekvent är högt — säg det. Bekräftelse av vad som fungerar är lika viktigt som att peka på det som inte gör det. Råd kan mycket väl vara "fortsätt med det ni gör här".

## Struktur — alltid dessa tre delar

**1. Vad vi ser**
Sammanfatta veckans tydligaste signaler: gaps, mönster, vad kommentarerna tillför. Om historik finns — nämn om något är nytt, förbättras eller är ett återkommande tema. Håll det konkret och kortfattat.

**2. Råd**
Ge alltid tre råd — ett till varje person individuellt, ett gemensamt. Råden ska vara riktningar, inte exakta instruktioner. Inled varje råd med vad det baseras på, t.ex: "Baserat på att du svarat lågt på Emotionell konversation tre veckor i rad..." eller "Eftersom ni verkar uppleva Repair olika just nu...". Om veckan var övervägande positiv — bekräfta det och ge råd om hur de bygger vidare.

**3. Veckans samtalsfråga**
En enda öppen fråga grundad i veckans data — inte generisk.

## Ton
Varm, direkt och coachande. Aldrig dömande. Aldrig vag. Erkänn komplexitet utan att drunkna i den.
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
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 2000, ...body }),
  })
}

function buildContext(room: any, entries: any[]) {
  const { p1_name, p2_name, couple_context } = room

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

  // Parets kontext — ger Claude bakgrund om dem som par
  if (couple_context) {
    text += `KONTEXT OM PARET:\n${couple_context}\n\n`
  }

  text += `=== SENASTE VECKAN (vecka ${latestWeekNum % 100}) ===\n\n`

  if (latest.p1 && latest.p2) {
    const s1 = latest.p1.scores
    const s2 = latest.p2.scores

    text += `Poäng per dimension (1=Inte alls, 5=Mycket):\n`
    DIMENSIONS.forEach((dim, i) => {
      const gap = Math.abs(s1[i] - s2[i])
      const gapFlag = gap >= 2 ? ' ← gap' : ''
      text += `  ${dim}: ${p1_name}=${s1[i]}, ${p2_name}=${s2[i]}${gapFlag}\n`
      const c1 = latest.p1.comments?.[String(i)]
      const c2 = latest.p2.comments?.[String(i)]
      if (c1) text += `    ${p1_name}: "${c1}"\n`
      if (c2) text += `    ${p2_name}: "${c2}"\n`
    })

    const avg1 = (s1.reduce((a: number, b: number) => a + b, 0) / s1.length).toFixed(1)
    const avg2 = (s2.reduce((a: number, b: number) => a + b, 0) / s2.length).toFixed(1)
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
    // Visa kommentarer för de 4 senaste historiska veckorna, bara snitt för äldre
    for (const [idx, wn] of weekNums.slice(1, 9).entries()) {
      const w = weeks[wn]
      const label = `Vecka ${wn % 100}`
      const avg = (scores: number[]) => (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      const includeComments = idx < 4

      if (w.p1 && w.p2) {
        text += `  ${label}: ${p1_name} snitt ${avg(w.p1.scores)}, ${p2_name} snitt ${avg(w.p2.scores)}\n`
        if (includeComments) {
          DIMENSIONS.forEach((dim, i) => {
            const dimShort = dim.split(' (')[0]
            const c1 = w.p1.comments?.[String(i)]
            const c2 = w.p2.comments?.[String(i)]
            if (c1) text += `    ${p1_name} om ${dimShort}: "${c1}"\n`
            if (c2) text += `    ${p2_name} om ${dimShort}: "${c2}"\n`
          })
        }
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
