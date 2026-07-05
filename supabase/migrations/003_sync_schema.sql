-- Synkar migrationshistoriken med ändringar som tidigare gjorts direkt i databasen.
-- Allt är skrivet så att det är ofarligt att köra även om kolumnerna/tabellen redan finns.

-- Frivilliga kommentarer per fråga (objekt med frågeindex som nyckel, t.ex. {"0": "text"})
ALTER TABLE entries ADD COLUMN IF NOT EXISTS comments JSONB;

-- Parets egen bakgrundsbeskrivning — skickas med till AI-analysen
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS couple_context TEXT;

-- Push-prenumerationer för veckopåminnelser (en per partner och rum)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  partner TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, partner)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_push" ON push_subscriptions;
CREATE POLICY "open_push" ON push_subscriptions FOR ALL USING (true);
