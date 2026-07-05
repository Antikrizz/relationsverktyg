# Relationsverktyg — Claude Code Guide

## Vad vi bygger

En PWA (Progressive Web App) för Kristian och Elisabet — ett veckovist relationsverktyg baserat på Gottman- och EFT-ramverk. Appen ersätter den nuvarande manuella synkkod-lösningen med en riktig backend (Supabase) och hostas via GitHub Pages.

Båda partners öppnar samma URL i Chrome på Android, anger ett delat rumskod (en gång), fyller i veckans frågor och ser data synkas automatiskt. En separat Cowork-tavla (desktop) drar data direkt från Supabase för djupare analys och AI-råd.

## Stack

- **Frontend:** Vanilla JS + HTML + CSS — ingen build-step, inga frameworks
- **Backend:** Supabase (PostgreSQL + REST API)
- **Hosting:** GitHub Pages (statisk HTML)
- **Auth:** Delad rumskod (6 tecken) — valideras server-side i Edge Functionen `api`; anon-nyckeln kan inte läsa databasen direkt
- **PWA:** manifest.json + service worker för installation + offline-stöd

## Projektkatalog

```
/
├── index.html          # Huvud-PWA (mobilapp)
├── manifest.json       # PWA-manifest
├── sw.js               # Service worker
├── config.js           # Supabase-URL och anon-nyckel
├── docs/
│   ├── BRIEF.md        # Produktspec och user stories
│   ├── ARCHITECTURE.md # Tekniska beslut och databasschema
│   └── SETUP.md        # Steg-för-steg setup (Supabase + GitHub)
└── .claude/
    └── commands/       # Slash-kommandon för Claude Code
```

## Miljövariabler

Supabase-nycklarna bäddas in direkt i `config.js` (anon/public key är OK att exponera — säkerheten sitter i Row Level Security). Ingen `.env`-fil behövs för GitHub Pages.

```js
// config.js
const SUPABASE_URL = 'https://xxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJ...'
```

## Databasschema (Supabase)

```sql
-- Rum: ett per par
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- delad 6-teckenskod
  p1_name TEXT NOT NULL,
  p2_name TEXT NOT NULL,
  couple_context TEXT,              -- parets bakgrund, skickas till AI-analysen
  analysis_text TEXT,               -- cachad AI-analys (delas av bada)
  analysis_week INTEGER,            -- vecka som analysen galler
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Veckoentries: en per partner per vecka
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  partner TEXT NOT NULL,            -- 'p1' eller 'p2'
  week_num INTEGER NOT NULL,
  scores INTEGER[] NOT NULL,        -- [1-5] x 9 fragor
  comments JSONB,                   -- frivilliga kommentarer per fraga, {"0": "..."}
  reflection TEXT,
  fb_appreciation TEXT,
  fb_wish TEXT,
  fb_insight TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, partner, week_num)
);

-- Push-prenumerationer for veckopaminnelser: se supabase/migrations/003_sync_schema.sql

-- RLS: aktiverat UTAN policies — anon-nyckeln nekas all direktåtkomst.
-- All åtkomst går via Edge Functions (service role) som validerar rumskoden.
-- Se supabase/migrations/004_lock_rls.sql.
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
```

## Kodstil

- Vanilla JS — inga npm-paket i runtime, inget build-steg, inget klientbibliotek för Supabase
- All dataåtkomst via `api(action, payload)` i index.html → Edge Functionen `supabase/functions/api` (kräver rumskod)
- Mobile-first CSS, max-width 430px
- Svenska kommentarer och UI-texter
- Modulär: separera data (supabase), UI (index.html), config (config.js)

## Gottman/EFT-dimensioner (9 frågor, i denna ordning)

1. Turning toward — vänder sig mot kontakt
2. Aktiv nyfikenhet — frågar hur den andra mår
3. Emotionell konversation — nära samtal utan att lösa
4. Empati och förståelse — försöker förstå partnerns känsla
5. Sårbarhet — visar sig utan rädsla för kritik
6. Fysisk beröring — närhet utan agenda
7. Repair — reparerar när det spänner
8. Soft start-up — startar svåra samtal mjukt
9. Shared meaning — jobbar som ett team

Ordningen måste stämma överens mellan `QUESTIONS`/`DIMS_SHORT` i index.html och `DIMENSIONS` i supabase/functions/analyze/index.ts.

## EFT-mönster att synliggöra

- Kristian: distancer (drar sig tillbaka, känner sig inte älskad/uppskattad)
- Elisabet: pursuer (söker kontakt, känner sig inte hörd/förstådd)
- Loop: pursuer trycker → distancer drar sig undan → pursuer trycker mer

## Nuvarande prototyp (referens)

- `relationsverktyg_mobil.html` — standalone HTML med localStorage + synkkod. Designreferens.
- `relationsverktyg.html` — Cowork-artefakt med Chart.js, EFT-meter, AI-råd. Uppdateras senare för Supabase.

## Viktigt att veta om användarna

- Kristian: byggingenjör, nybörjare på kod, vill förstå vad som byggs
- Elisabet: teknisk novis — UX måste vara extremt enkel
- Båda: Android-telefoner, Chrome
- Förklara vad koden gör på mellannivå — inte för tekniskt, inte för enkelt
