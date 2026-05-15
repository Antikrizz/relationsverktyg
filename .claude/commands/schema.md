# Databasschema — snabbreferens

## Tabell: rooms
| Kolumn     | Typ          | Beskrivning                    |
|------------|--------------|--------------------------------|
| id         | UUID         | Primärnyckel                   |
| code       | TEXT UNIQUE  | Delad 6-teckenskod (ex: ABC123)|
| p1_name    | TEXT         | Partner 1:s namn               |
| p2_name    | TEXT         | Partner 2:s namn               |
| created_at | TIMESTAMPTZ  | Skapades                       |

## Tabell: entries
| Kolumn          | Typ         | Beskrivning                        |
|-----------------|-------------|------------------------------------|
| id              | UUID        | Primärnyckel                       |
| room_id         | UUID        | Referens till rooms.id             |
| partner         | TEXT        | 'p1' eller 'p2'                    |
| week_num        | INTEGER     | YYYYVV-format (ex: 202620 = v.20)  |
| scores          | INTEGER[]   | 8 poäng [1-5], en per Gottman-fråga|
| reflection      | TEXT        | Fri reflektion                     |
| fb_appreciation | TEXT        | Uppskattning till partnern         |
| fb_wish         | TEXT        | Önskan till partnern               |
| fb_insight      | TEXT        | Insikt om mig själv                |
| submitted_at    | TIMESTAMPTZ | Inskickad                          |

UNIQUE-constraint: (room_id, partner, week_num) — max ett svar per partner per vecka.

## Supabase-projekt
- URL: https://uydnsxpxcgyuedcnzfyy.supabase.co
- Project ref: uydnsxpxcgyuedcnzfyy
