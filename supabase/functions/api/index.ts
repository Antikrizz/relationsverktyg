// Edge Function: api
// All dataåtkomst från appen går via denna funktion. Rumskoden krävs för varje
// anrop och valideras här — utan rätt kod går det inte att läsa eller skriva något.
// Funktionen använder service role-nyckeln; anon-nyckeln kan inte längre nå
// tabellerna direkt (RLS-policyerna är borttagna i migration 004).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { action, code, ...p } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const baseHeaders = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }
    const rest = (path: string, init: RequestInit = {}) =>
      fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: { ...baseHeaders, ...(init.headers || {}) },
      })

    // ---- Skapa rum — enda action som inte kräver en befintlig kod ----
    if (action === 'create_room') {
      const p1 = String(p.p1_name || '').trim().slice(0, 60)
      const p2 = String(p.p2_name || '').trim().slice(0, 60)
      if (!p1 || !p2) return json({ error: 'Båda namnen krävs' }, 400)

      // 6-teckenskod utan förväxlingsbara tecken; nytt försök vid krock
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      for (let attempt = 0; attempt < 5; attempt++) {
        let newCode = ''
        for (let i = 0; i < 6; i++) newCode += chars[Math.floor(Math.random() * chars.length)]
        const res = await rest('rooms', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({ code: newCode, p1_name: p1, p2_name: p2 }),
        })
        if (res.ok) {
          const [room] = await res.json()
          return json({ room: { id: room.id, code: room.code, p1_name: room.p1_name, p2_name: room.p2_name } })
        }
        if (res.status !== 409) return json({ error: 'Kunde inte skapa rum' }, 500)
      }
      return json({ error: 'Kunde inte skapa rum — försök igen' }, 500)
    }

    // ---- Alla andra actions kräver giltig rumskod ----
    const codeStr = String(code || '').trim().toUpperCase()
    if (codeStr.length < 3) return json({ error: 'Rumskod saknas' }, 400)

    const roomRes = await rest(`rooms?code=eq.${encodeURIComponent(codeStr)}&select=*`)
    const [room] = await roomRes.json()
    if (!room) return json({ error: 'Hittade inget rum med den koden' }, 404)

    switch (action) {
      // Rummets uppgifter — används vid "gå med" och i inställningarna
      case 'get_room':
        return json({ room: {
          id: room.id, code: room.code,
          p1_name: room.p1_name, p2_name: room.p2_name,
          couple_context: room.couple_context,
        } })

      // Alla veckoentries för rummet — används av hem, formulär och analys
      case 'entries': {
        const res = await rest(
          `entries?room_id=eq.${room.id}` +
          `&select=partner,week_num,scores,comments,reflection,fb_appreciation,fb_wish,fb_insight,submitted_at` +
          `&order=week_num.asc`
        )
        return json({ entries: await res.json() })
      }

      // Sparar (eller uppdaterar) en partners veckosvar
      case 'submit_entry': {
        const partner = p.partner
        const week_num = Number(p.week_num)
        const scores = p.scores
        if (partner !== 'p1' && partner !== 'p2') return json({ error: 'Ogiltig partner' }, 400)
        if (!Number.isInteger(week_num)) return json({ error: 'Ogiltigt veckonummer' }, 400)
        if (!Array.isArray(scores) || scores.length !== 9 ||
            scores.some((s) => !Number.isInteger(s) || s < 1 || s > 5)) {
          return json({ error: 'Ogiltiga poäng' }, 400)
        }

        const entry = {
          room_id: room.id, partner, week_num, scores,
          comments: p.comments && typeof p.comments === 'object' ? p.comments : null,
          reflection: p.reflection || null,
          fb_appreciation: p.fb_appreciation || null,
          fb_wish: p.fb_wish || null,
          fb_insight: p.fb_insight || null,
          submitted_at: new Date().toISOString(),
        }
        const res = await rest('entries?on_conflict=room_id,partner,week_num', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(entry),
        })
        if (!res.ok) return json({ error: 'Kunde inte spara' }, 500)

        // Ny/ändrad data — rensa cachad analys så en färsk genereras
        await rest(`rooms?id=eq.${room.id}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({ analysis_week: null }),
        })
        return json({ ok: true })
      }

      // Sparar parets bakgrundskontext (och tvingar ny analys)
      case 'save_context': {
        const text = String(p.couple_context || '').slice(0, 4000)
        const res = await rest(`rooms?id=eq.${room.id}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({ couple_context: text || null, analysis_week: null }),
        })
        if (!res.ok) return json({ error: 'Kunde inte spara' }, 500)
        return json({ ok: true })
      }

      // Push-prenumeration för veckopåminnelser
      case 'push_subscribe': {
        if (p.partner !== 'p1' && p.partner !== 'p2') return json({ error: 'Ogiltig partner' }, 400)
        const res = await rest('push_subscriptions?on_conflict=room_id,partner', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ room_id: room.id, partner: p.partner, subscription: p.subscription }),
        })
        if (!res.ok) return json({ error: 'Kunde inte spara prenumerationen' }, 500)
        return json({ ok: true })
      }

      case 'push_unsubscribe': {
        if (p.partner !== 'p1' && p.partner !== 'p2') return json({ error: 'Ogiltig partner' }, 400)
        await rest(`push_subscriptions?room_id=eq.${room.id}&partner=eq.${p.partner}`, {
          method: 'DELETE',
          headers: { 'Prefer': 'return=minimal' },
        })
        return json({ ok: true })
      }

      default:
        return json({ error: 'Okänd action' }, 400)
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
