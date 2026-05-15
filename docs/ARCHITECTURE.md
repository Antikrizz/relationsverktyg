# Arkitektur — Relationsverktyg PWA

## Övergripande flöde

```
[Kristians telefon]          [Elisabets telefon]
  Chrome → index.html          Chrome → index.html
        |                            |
        v                            v
  [Supabase DB] <------ direkt sync ------>
        |
        v
  [Cowork-tavla, desktop]
  läser via MCP-koppling
```

Ingen server-side kod. Allt sker via Supabase REST API direkt från webbläsaren.

## Stack-val och motivering

### Vanilla JS (inte React/Vue)
- Ingen build-step → GitHub Pages fungerar utan CI/CD
- Lättare att förstå och debugga för Kristian
- Appen är enkel nog — ingen state-management behövs
- Prototypkod från `relationsverktyg_mobil.html` kan återanvändas direkt

### Supabase (inte Firebase/PocketBase)
- Gratis tier räcker gott (500 MB, 50k requests/dag)
- PostgreSQL — vanlig SQL, enkel att förstå och felsöka
- Inbyggd REST API utan extra setup
- Bra JS-klient via CDN (esm.sh)
- Kan läsas av Cowork-artefakt via Drive MCP i framtiden

### GitHub Pages (inte Vercel/Netlify)
- Kristian har redan GitHub-konto
- Gratis, stabilt, inga konton att underhålla
- Deploy = git push → automatisk publicering
- Custom domain möjligt senare om så önskas

### Rumskod (inte OAuth/lösenord)
- Elisabet ska inte behöva skapa konto
- 6-teckenskod delas en gång (t.ex. via WhatsApp vid setup)
- Koden ger tillgång till ett "rum" i databasen
- Säkerheten är acceptabel för privat, icke-känslig data

## Filstruktur

```
index.html      Hela mobilappen — HTML, CSS, JS i en fil
                (eller uppdelat i separata .css/.js vid behov)

config.js       Supabase URL + anon key
                Läggs till i .gitignore OM nyckeln är känslig
                (anon key är publik per design — OK att committa)

sw.js           Service worker
                - Cachar index.html, config.js vid installation
                - Offline: visar cachad app, blockerar submit

manifest.json   PWA-manifest
                - name, short_name, icons, theme_color
                - display: standalone (ser ut som native app)
                - start_url: "/"
```

## Databasschema

### Tabell: `rooms`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| id | UUID | Primärnyckel |
| code | TEXT UNIQUE | Delad 6-teckenskod |
| p1_name | TEXT | Partner 1 namn (Kristian) |
| p2_name | TEXT | Partner 2 namn (Elisabet) |
| created_at | TIMESTAMPTZ | Skapades |

### Tabell: `entries`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| id | UUID | Primärnyckel |
| room_id | UUID | Referens till rooms |
| partner | TEXT | 'p1' eller 'p2' |
| week_num | INTEGER | Veckonummer (1, 2, 3...) |
| scores | INTEGER[] | Array med 8 poäng [1-5] |
| reflection | TEXT | Fri reflektion |
| fb_appreciation | TEXT | Feedback: uppskattning |
| fb_wish | TEXT | Feedback: önskan |
| fb_insight | TEXT | Feedback: insikt om mig själv |
| submitted_at | TIMESTAMPTZ | Inskickad |

UNIQUE-constraint på (room_id, partner, week_num) — max ett svar per partner per vecka.

### Row Level Security

Öppen policy (anon kan läsa/skriva) — rumskoden är "lösenordet". Acceptabelt för privat data utan känslig information.

```sql
CREATE POLICY "open_rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "open_entries" ON entries FOR ALL USING (true);
```

## Appflöde

```
START
  |
  +--> Finns rumskod i localStorage?
        |
        NEJ --> Onboarding-skärm
                Ange rumskod → lookup i Supabase
                Välj vem du är (p1/p2)
                Spara i localStorage
                |
        JA  --> Hämta veckostatus från Supabase
                |
                v
              Hemskärm
              Visa: vem har fyllt i denna vecka?
                |
                +--> Tryck "Fyll i" → Formulär
                      8 frågor + reflektion + feedback
                      Submit → POST till Supabase
                      Bekräftelseskärm
```

## Offline-strategi

Service workern cachar allt vid första besök. Om offline:
- Appen startar och visar senaste kända status (från localStorage-cache)
- Submit-knappen är inaktiverad med meddelande "Ingen uppkoppling"
- När online igen: submit fungerar normalt

Inget kö-system för offline-submit i v1 (för komplext, låg nytta).

## Supabase-integration

```js
// Exempel: hämta veckostatus
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getWeekStatus(roomId, weekNum) {
  const { data } = await supabase
    .from('entries')
    .select('partner, submitted_at')
    .eq('room_id', roomId)
    .eq('week_num', weekNum)
  return data // [{partner: 'p1', ...}, {partner: 'p2', ...}]
}

// Exempel: spara entry
async function submitEntry(roomId, partner, weekNum, payload) {
  const { error } = await supabase
    .from('entries')
    .upsert({
      room_id: roomId,
      partner,
      week_num: weekNum,
      ...payload
    })
  return !error
}
```

## Framtida utbyggnad

- **Cowork-tavlan:** Uppdatera `relationsverktyg.html` att läsa från Supabase via `window.cowork.callMcpTool` istället för synkkod-import
- **Push-notiser:** Supabase Edge Functions kan skicka webb-push — kräver vapid-nycklar och service worker-tillägg
- **Historikvy:** Lägg till en "Historia"-tab i mobilappen som visar sparkline per dimension
- **Terapeut-läge:** Read-only delningslänk med token
