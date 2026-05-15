-- Cachad AI-analys per vecka i rooms-tabellen
-- Båda partners ser samma text istället för att få nya svar varje gång
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS analysis_text TEXT,
  ADD COLUMN IF NOT EXISTS analysis_week INTEGER;
