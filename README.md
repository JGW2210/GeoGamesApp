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
| **Waters** | Oceans, seas, gulfs, bays and great lakes from a clue |
| **Peaks & Rivers** | The world's great mountains and rivers from a clue |

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

- **Regions** — pick which continents (and *Oceans* for the Waters game) to
  draw questions from.
- **Extra questions** — the Capitals and Flags games have an *Include
  territories & dependencies* toggle (Greenland, Puerto Rico, Hong Kong,
  Gibraltar, French Polynesia, …) for an extra layer of difficulty.

The live pool counter tells you how many items match; you need at least 4 to
start a round.

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
js/data/countries.js  # countries + territories (capitals & flags)
js/data/waters.js     # oceans, seas, lakes, gulfs, bays
js/data/terrain.js    # mountains & rivers
js/app.js             # router, game configs, quiz engine
js/fx.js              # theme toggle, particle field, custom cursor
```

Adding questions is just a matter of appending rows to the data files — each
game derives its region filters automatically from whatever regions appear in
its dataset.
