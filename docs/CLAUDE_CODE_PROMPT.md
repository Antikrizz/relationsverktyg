# Startprompt till Claude Code

Klistra in detta i Claude Code (efter att du fyllt i Supabase-uppgifterna):

---

Mina Supabase-uppgifter:
- URL: https://uydnsxpxcgyuedcnzfyy.supabase.co
- Anon key: sb_publishable_i99YkdBlVCE9gx1wdP3gyA_9Gt2Bnza
- Project ref: uydnsxpxcgyuedcnzfyy

Läs CLAUDE.md, docs/BRIEF.md och docs/ARCHITECTURE.md innan du skriver en enda rad kod. De beskriver exakt vad vi bygger, varför och hur.

Bygg sedan hela appen i denna ordning. Förklara kort vad du gör och varför innan varje steg — en mening räcker. Fråga om något är oklart innan du fortsätter.

---

## Steg 0 — Supabase-databas (automatisk setup)

Installera Supabase CLI och kör databas-migrationen automatiskt:

```bash
npm install -g supabase
supabase login
supabase link --project-ref uydnsxpxcgyuedcnzfyy
```

Skapa sedan filen `supabase/migrations/001_init.sql` med detta innehåll och kör den:

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  p1_name TEXT NOT NULL,
  p2_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  partner TEXT NOT NULL,
  week_num INTEGER NOT NULL,
  scores INTEGER[] NOT NULL,
  reflection TEXT,
  fb_appreciation TEXT,
  fb_wish TEXT,
  fb_insight TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, partner, week_num)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "open_entries" ON entries FOR ALL USING (true);
```

Kör: `supabase db push`

Verifiera att tabellerna skapades utan fel. Om Supabase CLI inte fungerar: kör SQL direkt via Supabase REST API med curl och service_role-nyckeln (be mig om den om det behövs).

---

## Steg 1 — config.js

Skapa config.js med Supabase URL och anon key. Exportera en initierad supabase-klient via CDN (esm.sh, supabase-js v2). Inga npm-paket i runtime.

## Steg 2 — index.html (grund + onboarding)

Skapa index.html med:
- All CSS inline i `<style>` — använd designspråket från relationsverktyg_mobil.html som referens (färger, radiusar, kortdesign, knappstilar)
- Skärm 1: Onboarding — ange rumskod (6 tecken). Om koden finns i Supabase: hämta namn och visa "Välj vem du är". Om koden inte finns: erbjud att skapa nytt rum (ange båda namnen → generera kod → spara i Supabase)
- Spara room_id, room_code, partner ('p1'/'p2') och namn i localStorage
- Om localStorage redan innehåller giltigt rum: hoppa direkt till hemskärmen

## Steg 3 — index.html (hemskärm)

Lägg till hemskärm som visar:
- Veckonummer (ISO-veckonummer från aktuellt datum)
- Status: vem har fyllt i den här veckan (hämta från Supabase entries)
- Grön bock om klar, grå cirkel om ej klar
- Påminnelsebanner om ingen entry finns för innevarande vecka
- Stor knapp: "Fyll i veckans frågor"
- Nedre navigering: Hem | Fyll i | Inställningar

## Steg 4 — index.html (formulär + submit)

Lägg till formulärskärm med:
- 8 frågor (hämta exakt formulering från docs/BRIEF.md) med 1–5 skala — stor klickbar knapp per värde
- Fri reflektion (textarea)
- 3 feedbackfält: uppskattning / önskan / insikt om mig själv
- Validering: alla 8 frågor måste besvaras innan submit är möjligt
- Submit: upsert till Supabase entries med room_id, partner, week_num, scores[], reflection, fb_*
- Efter submit: bekräftelseskärm med grön checkmark + info om partnern har fyllt i eller ej

## Steg 5 — index.html (inställningar)

Enkel inställningsskärm:
- Visa rumskod och vem jag är
- Knapp: "Byt vem jag är" (ändrar partner i localStorage, inget rum-byte)
- Knapp: "Lämna rummet" (rensar localStorage, tillbaka till onboarding) med bekräftelsedialog

## Steg 6 — manifest.json

Skapa PWA-manifest:
- name: "Relationsverktyg", short_name: "Relation"
- display: standalone
- theme_color: "#2d5a4e", background_color: "#faf9f7"
- start_url: "/"
- icons: skapa icon.svg (grön bakgrund #2d5a4e, vitt hjärta) och referera till den i manifest

## Steg 7 — sw.js

Skapa service worker:
- Cache-namn: "rv-v1"
- Cacha vid install: index.html, config.js, manifest.json, icon.svg
- Fetch-strategi: cache-first med network fallback
- Om offline och submit försöks: visa toast "Ingen uppkoppling — försök igen när du är online"

Lägg till i index.html: `<link rel="manifest">`, `<meta name="theme-color">` och service worker-registrering.

## Steg 8 — Slash-kommandon

Skapa `.claude/commands/deploy.md`:
- Instruktioner för git add, commit med $ARGUMENTS som meddelande, och push till main

Skapa `.claude/commands/schema.md`:
- Snabbreferens för databasschema (rooms + entries)

## Steg 9 — GitHub + deploy

```bash
git add -A
git commit -m "Initial version — Relationsverktyg PWA"
git push origin main
```

Bekräfta att GitHub Pages är aktiverat (Settings → Pages → branch: main). Appen ska vara live på `https://ANVÄNDARNAMN.github.io/relationsverktyg`.

## Steg 10 — Slutkontroll

Gå igenom detta och rapportera status på varje punkt:

1. Körs index.html utan konsolfel i Chrome DevTools?
2. Fungerar "Skapa nytt rum" — skapas row i Supabase rooms-tabellen?
3. Fungerar "Gå med i rum" med befintlig kod?
4. Sparas entry korrekt i Supabase entries efter submit?
5. Uppdateras hemskärmens status efter submit utan omladdning?
6. Visas appen som installerbar i Chrome (pwa-ikon i adressfältet)?
7. Fungerar offline — visas cachad app och blockeras submit med meddelande?
8. Är GitHub Pages-URL:en aktiv och laddningsbar?

Rapportera eventuella fel och föreslå lösningar innan du avslutar.

---

## Kodriktlinjer

- Vanilla JS — inga ramverk, inga npm-paket i runtime
- Supabase JS via CDN: `https://esm.sh/@supabase/supabase-js@2`
- Svenska UI-texter genomgående
- Stor text, stora knappar — Elisabet (teknisk novis) ska klara allt utan hjälp
- Felhantering på alla Supabase-anrop — visa aldrig tom eller kraschad skärm
- Kommentera koden på svenska, mellannivå — Kristian (nybörjare på kod) ska förstå vad varje del gör
