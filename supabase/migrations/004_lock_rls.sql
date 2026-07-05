-- Låser databasen för anon-nyckeln.
-- Tidigare kunde vem som helst med anon-nyckeln (som är publik på GitHub Pages)
-- läsa alla rum och alla svar via REST-API:t. Nu går all åtkomst via Edge
-- Functionen "api" som kräver rumskoden och använder service role-nyckeln.
--
-- OBS: Kör denna FÖRST EFTER att Edge Functionen "api" är deployad och den nya
-- klienten är publicerad — annars slutar appen fungera.

DROP POLICY IF EXISTS "open_rooms" ON rooms;
DROP POLICY IF EXISTS "open_entries" ON entries;
DROP POLICY IF EXISTS "open_push" ON push_subscriptions;
-- Policyn i produktionsdatabasen hette så här (skapad direkt i dashboarden):
DROP POLICY IF EXISTS "open_push_subscriptions" ON push_subscriptions;

-- RLS är fortsatt aktiverat på alla tabeller; utan policies nekas anon allt.
-- Service role-nyckeln (Edge Functions) påverkas inte av RLS.
