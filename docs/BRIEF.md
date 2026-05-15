# Produktspec — Relationsverktyg PWA

## Syfte

Ett privat veckovist verktyg för ett par (Kristian + Elisabet) för att stärka relationen genom strukturerad reflektion, feedback och gemensam analys. Byggt på Gottman Institute-forskning och EFT (Emotionally Focused Therapy).

## Användare

| Person | Roll i EFT-mönster | Enhet |
|---|---|---|
| Kristian | Distancer — drar sig tillbaka, känner sig inte älskad/uppskattad | Android, Chrome |
| Elisabet | Pursuer — söker kontakt, känner sig inte hörd/förstådd | Android, Chrome |

Elisabet är teknisk novis — UX måste vara extremt enkel och felfri.

## User Stories

### Mobilapp (båda partners)

- Som Kristian vill jag snabbt fylla i veckans 8 frågor på min telefon utan att behöva skapa konto
- Som Elisabet vill jag se en tydlig påminnelse när det är dags att fylla i
- Som Elisabet vill jag att mina svar sparas automatiskt utan att jag behöver göra något manuellt
- Som Kristian vill jag kunna fylla i när Elisabet redan är klar, och vice versa
- Som Kristian vill jag skriva en fri reflektion om veckan
- Som Elisabet vill jag ge strukturerad feedback till Kristian (uppskattning, önskan, insikt)

### Cowork-tavla (Kristian, desktop)

- Som Kristian vill jag se ett radardiagram med båda partners poäng
- Som Kristian vill jag se EFT-loopen visualiserad
- Som Kristian vill jag se trender över tid
- Som Kristian vill jag få AI-genererade råd baserat på veckans data

## Features — Mobilapp

### F1: Onboarding (en gång)
- Ange rumskod (6 tecken, delas mellan partners)
- Välj vem du är (Kristian / Elisabet)
- Spara lokalt — slipper välja igen

### F2: Hemskärm
- Visa veckostatus (vem har fyllt i / inte fyllt i)
- Påminnelsebanner om det gått 6+ dagar sedan senaste entry
- Snabbknapp till formuläret

### F3: Veckoformulär
- 8 frågor på 1-5-skala (Gottman + EFT)
- Fri reflektion (textarea)
- 3 feedbackfält till partnern (uppskattning / önskan / insikt)
- Sparar direkt till Supabase vid submit

### F4: Status efter submit
- Bekräftelseskärm med grön checkmark
- Visa om partnern redan svarat den veckan

### F5: Offline-stöd
- Service worker cachar appen
- Om ingen nätuppkoppling: visa senaste kända status, blockera submit med tydligt meddelande

## Features — Cowork-tavla (fas 2)

- Läser direkt från Supabase (via Drive MCP / window.cowork.callMcpTool)
- Radardiagram (Chart.js) med Kristian vs Elisabet
- EFT-loopmeter
- Trendlinje per vecka
- AI-råd (window.cowork.askClaude)

## Gottman-frågor (8 st, 1-5 skala)

1. Hur ofta vände sig den andra mot dig när du sökte kontakt?
   *Gottman: Turning toward*

2. Hur ofta tog din partner initiativ till att fråga hur du mår eller tänker?
   *Aktiv nyfikenhet*

3. När det blev spänt — hur ofta försökte någon reparera?
   *Gottmans viktigaste skyddsfaktor*

4. Hur ofta startade svåra samtal mjukt, utan kritik eller försvar direkt?
   *Gottman: Soft start-up*

5. Hur ofta hade ni fysisk närhet eller beröring utan agenda?
   *Trygg anknytning*

6. Hur ofta hade ni ett emotionellt nära samtal där ingen behövde lösa något?
   *EFT: Emotionell tillgänglighet*

7. Hur ofta vågade du visa sårbarhet utan att förvänta dig kritik?
   *Emotionell intimitet*

8. Hur ofta upplevde du att ni jobbade med vardagen som ett team?
   *Gottman: Shared meaning*

## Feedback-fält (NVC-inspirerade)

- **Uppskattning:** En sak jag uppskattade hos dig den här veckan...
- **Önskan:** En sak jag skulle önska mer av... (formulera som önskan, inte kritik)
- **Insikt:** En insikt om mig själv den här veckan...

## UX-principer

- Max 3 skärmar djup — inga menyer i menyer
- Ingenting kräver konto eller lösenord att minnas
- Stor text, stora knappar (Elisabet-proof)
- Bekräftelse på varje viktig åtgärd (spara, skicka)
- Fel ska aldrig leda till förlorad data

## Icke-mål (v1)

- Push-notiser (komplext, löses av Cowork-påminnelse + in-app banner)
- Historikvy i mobilappen
- Redigera gamla svar
- Fler än 2 partners
- Delning med terapeut
