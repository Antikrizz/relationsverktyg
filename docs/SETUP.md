# Setup-guide — Relationsverktyg PWA

Gör detta en gång innan vi börjar koda. Tar ca 15 minuter.

---

## Steg 1: Skapa Supabase-projekt

1. Gå till [supabase.com](https://supabase.com) → **Start your project**
2. Logga in med GitHub
3. Klicka **New project**
4. Fyll i:
   - **Name:** `relationsverktyg`
   - **Database Password:** Välj ett starkt lösenord (spara det, behövs inte i koden men bra att ha)
   - **Region:** `West EU (Ireland)` — närmast Sverige
5. Klicka **Create new project** — tar 1-2 minuter

---

## Steg 2: Hämta API-nycklar

1. I Supabase-projektet: gå till **Settings → API**
2. Kopiera:
   - **Project URL** — ser ut som `https://abcdefgh.supabase.co`
   - **anon public** key — lång JWT-sträng som börjar med `eyJ`

Dessa klistrar du in i `config.js` när vi skapar den filen.

---

## Steg 3: Skapa databastabeller

1. I Supabase: gå till **SQL Editor** (vänstermenyn)
2. Klicka **New query**
3. Klistra in följande SQL och klicka **Run**:

```sql
-- Rum: ett per par
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  p1_name TEXT NOT NULL,
  p2_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Veckoentries: en per partner per vecka
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

-- Öppen säkerhetspolicy (rumskoden är "lösenordet")
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "open_entries" ON entries FOR ALL USING (true);
```

4. Verifiera: gå till **Table Editor** och kontrollera att `rooms` och `entries` syns

---

## Steg 4: Skapa GitHub-repo

1. Gå till [github.com](https://github.com) → **New repository**
2. Fyll i:
   - **Repository name:** `relationsverktyg`
   - **Visibility:** Private (rekommenderat)
   - **Add a README:** Ja
3. Klicka **Create repository**

---

## Steg 5: Klona repot lokalt

Öppna terminalen (eller Claude Code) i den mapp du vill jobba i:

```bash
git clone https://github.com/DITT-ANVÄNDARNAMN/relationsverktyg.git
cd relationsverktyg
```

---

## Steg 6: Aktivera GitHub Pages

1. I GitHub-repot: gå till **Settings → Pages**
2. Under **Source**: välj **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Klicka **Save**

Din app kommer vara tillgänglig på:
`https://DITT-ANVÄNDARNAMN.github.io/relationsverktyg`

(Tar 1-2 minuter att bli aktiv första gången)

---

## Steg 7: Ge Claude Code kontexten

När du öppnar Claude Code i projektmappen, berätta:

> "Supabase URL: https://xxxx.supabase.co, anon key: eyJ..."

Sedan bygger vi appen.

---

## Rumskod (gör när appen är byggd)

1. Öppna appen → klicka "Skapa nytt rum"
2. Du får en 6-teckenskod, t.ex. `K7E2M9`
3. Skicka koden till Elisabet via WhatsApp
4. Elisabet öppnar appen, anger koden → ni är länkade

---

## Felsökning

**"Failed to fetch" i appen**
→ Kontrollera att URL och nyckel i `config.js` stämmer exakt

**"relation does not exist" i Supabase**
→ SQL-scriptet körde inte korrekt — prova igen i SQL Editor

**GitHub Pages visar 404**
→ Vänta 2-3 minuter och ladda om. Kontrollera att `index.html` ligger i root.

**Appen syns men data sparas inte**
→ Öppna Chrome DevTools (F12) → Console — leta efter felmeddelanden
