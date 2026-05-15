-- Tabellen "rooms": ett rum per par, identifieras av en delad 6-teckenskod
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  p1_name TEXT NOT NULL,
  p2_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabellen "entries": ett svar per partner per vecka
-- week_num är YYYYVV-format, t.ex. 202620 = vecka 20 år 2026
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

-- Row Level Security: anon-nyckeln kan läsa och skriva (rumskoden är "lösenordet")
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "open_entries" ON entries FOR ALL USING (true);
