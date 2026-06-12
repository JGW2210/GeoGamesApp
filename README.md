# GEOGAMES — Geography Quiz Console

A self-contained geography quiz app built on the **HUD/0S** design system
(minimal sci-fi HUD aesthetic — thin lines, bracketed panels, restrained
cyan accent, light + dark themes). No build step, no dependencies: just
open `index.html`.

## The games

Selectable from the top navigation bar:

| Game | What you identify |
|------|-------------------|
| **Capitals** | The capital of each country, territory or dependency |
| **Flags** | The country / region / territory from its flag |
| **Waters** | Seas, oceans, gulfs and bays — from a **zoomed-in map** with the name censored |
| **Peaks, Rivers & Lakes** | The world's great mountains, rivers and lakes from a clue |

## Modes

- **Practice** — untimed, instant feedback and the correct answer after every
  question, covering the whole filtered pool. No score pressure.
- **Challenge** — a timed run of 10 / 20 / all questions. Each correct answer
  scores 100 points plus a streak bonus (+20 per consecutive correct). One shot
  per question; finishes with a score, accuracy, best streak and time.

### Answer format

Either mode can be played as:

- **Multiple choice** — pick one of four options (keys `1`–`4`).
- **Type the answer** — type a free-text answer. Matching is **case-insensitive
  and spelling-tolerant**: it ignores accents, punctuation and extra spaces,
  treats *Saint*/*St* and *Mount*/*Mt* the same, lets you drop generic words
  (so `amazon` matches *Amazon River* and `everest` matches *Mount Everest*),
  and accepts common alternates (`usa`, `uk`, `uae`, `swaziland`, `colombo` for
  Sri Lanka's seat of government, etc.).

## Difficulty filters

Every game can be narrowed before you start:

- **Regions** — pick which continents/basins (e.g. *Polar* for the Waters game)
  to draw questions from.
- **Extra questions** — the Capitals and Flags games have an *Include
  territories & dependencies* toggle (Greenland, Puerto Rico, Hong Kong,
  Gibraltar, French Polynesia, …) for an extra layer of difficulty.
- **Map difficulty** — the Waters game has a *Hide names of surrounding waters*
  toggle (off by default) that blanks the labels of neighbouring seas inside the
  zoomed frame, leaving only the coastline and country names as clues.

The live pool counter tells you how many items match; you need at least 4 to
start a round (1 for typed answers).

## Seas & Waters map game

The Waters game zooms a world seas/oceans map to centre each body of water so it
fills most of the frame (offset toward an edge only when it sits near the map
border), and **censors the target's name**. You then identify it by multiple
choice or by typing. After you answer, the name is revealed on the map.

The map is the Wikimedia Commons SVG **“Oceans and seas boundaries map (en)”**
by *Pinpin*, licensed **CC BY-SA 3.0**, vendored as `oceans-seas.svg`. The
catalogue in `js/data/seamap.js` (focal point, zoom frame and the label element
ids to censor for each sea) is generated from that SVG.

## Leaderboard (top scores)

After a **Challenge** round you can submit your score with a name, and the
**Scores** page shows a live top-15 (auto-refreshing every 20s), filterable by
**game** and by **challenge length** — 10-question, 20-question and All-question
runs are ranked as separate boards so they're compared fairly.

By default scores are stored **locally per device** (`localStorage`) so the app
works with no setup. To make the leaderboard **shared and live across all
players**, point it at a free [Supabase](https://supabase.com) project:

1. Create a free Supabase project.
2. In the SQL editor, create the table and access policies:

   ```sql
   create table public.scores (
     id         bigint generated always as identity primary key,
     game       text not null,
     format     text not null default 'mc',
     length     text not null default 'all',   -- '10' | '20' | 'all'
     name       text not null default 'Anon',
     score      int  not null default 0,
     accuracy   int  not null default 0,
     created_at timestamptz not null default now()
   );
   alter table public.scores enable row level security;
   create policy "public read"   on public.scores for select to anon using (true);
   create policy "public insert" on public.scores for insert to anon
     with check (char_length(name) <= 24 and score >= 0 and score <= 1000000);
   ```

   **Already created the table from an earlier version?** Just add the
   `length` column (the leaderboard now filters by challenge length):

   ```sql
   alter table public.scores add column if not exists length text not null default 'all';
   ```

3. In `js/leaderboard.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your
   project's URL and **anon/public** key (safe to commit — it only allows the
   read/insert above). Bump the `?v=` on the scripts in `index.html` and push.

That's it — scores then sync for everyone. Note the anon key lets anyone POST,
so scores are unverified (spoofable). For a hardened board, front it with a
Cloudflare Worker or Supabase Edge Function that rate-limits and validates
submissions.

## Running it

Just open `index.html` in a browser. To avoid any browser quirks you can also
serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Flag images are loaded from [flagcdn.com](https://flagcdn.com); if offline,
the Flags game automatically falls back to Unicode flag emoji.

## Keyboard

- `1`–`4` — choose an answer
- `Enter` / `Space` — advance to the next question

## Project structure

```
index.html            # nav, view container, FX layers, script tags
css/styles.css        # HUD/0S design system + app layouts
oceans-seas.svg       # vendored world seas/oceans map (CC BY-SA 3.0)
js/data/countries.js  # countries + territories (capitals & flags)
js/data/seamap.js     # seas/oceans/gulfs map catalogue (generated from the SVG)
js/data/terrain.js    # mountains, rivers & lakes
js/leaderboard.js     # online (Supabase) + local top-scores backend
js/app.js             # router, game configs, quiz engine, scores page, sea map
js/fx.js              # theme toggle, particle field, custom cursor
```

Adding questions is just a matter of appending rows to the data files — each
game derives its region filters automatically from whatever regions appear in
its dataset.
