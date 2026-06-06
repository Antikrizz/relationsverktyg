// Edge Function: notify
// Skickar push-påminnelser till partners som inte fyllt i veckans frågor.
// Anropas av en cron-job varje måndag morgon.

import webpush from 'npm:web-push'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Beräknar ISO-veckonummer i formatet YYYYVV
function getWeekNum(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const isoWeek = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return d.getUTCFullYear() * 100 + isoWeek
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    webpush.setVapidDetails(
      'mailto:kristian_112@hotmail.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    const dbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    }

    const weekNum = getWeekNum()

    // Hämta alla entries för denna vecka (vilka som fyllt i)
    const [subsRes, entriesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=*`, { headers: dbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/entries?week_num=eq.${weekNum}&select=room_id,partner`, { headers: dbHeaders }),
    ])

    const subs = await subsRes.json()
    const entries = await entriesRes.json()

    // Bygg karta: room_id -> Set av partners som fyllt i denna vecka
    const doneMap: Record<string, Set<string>> = {}
    for (const e of entries) {
      if (!doneMap[e.room_id]) doneMap[e.room_id] = new Set()
      doneMap[e.room_id].add(e.partner)
    }

    let sent = 0
    const errors: string[] = []

    for (const sub of subs) {
      const alreadyDone = doneMap[sub.room_id]?.has(sub.partner) ?? false
      if (alreadyDone) continue  // Redan klar — ingen påminnelse

      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: '🩷 Dags för veckans incheckning!',
            body: 'Ta 5 minuter och fyll i veckans frågor — din partner väntar.',
          })
        )
        sent++
      } catch (err: any) {
        errors.push(err.message)
        // Prenumeration ogiltig (enhet avregistrerad) — ta bort den
        if (err.statusCode === 410 || err.statusCode === 404) {
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            { method: 'DELETE', headers: dbHeaders }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({ week: weekNum, sent, errors }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
