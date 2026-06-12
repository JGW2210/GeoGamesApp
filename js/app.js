/* ============================================================
   GEOGAMES — application logic
   Hash-routed single page. Each game has a setup screen
   (mode + region/territory filters), a quiz screen, and a
   results screen. Built on the HUD/0S component vocabulary.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- small utilities ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const flagEmoji = (code) =>
    code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  /* ---------- typed-answer matching (case- & spelling-tolerant) ----------
     normAns : lowercase, strip accents/punctuation, unify saint/st & mount/mt.
     coreAns : also drop generic geo words (river, sea, of, the…) so
               "amazon" matches "Amazon River" and "everest" matches
               "Mount Everest". Comparison is lenient on purpose — for a
               learning game a false "wrong" is worse than slight leniency. */
  const stripDiacritics = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normAns = (s) => {
    let v = stripDiacritics(String(s).toLowerCase()).replace(/&/g, ' and ');
    v = ' ' + v.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    v = v.replace(/ saint /g, ' st ').replace(/ mount /g, ' mt ');
    return v.replace(/\s+/g, ' ').trim();
  };
  const GEO_STOP = new Set([
    'of', 'the', 'and', 'el', 'la', 'le',
    'river', 'ocean', 'sea', 'lake', 'gulf', 'bay', 'channel',
    'mt', 'mount', 'mountain', 'mountains',
  ]);
  const coreAns = (s) =>
    normAns(s).split(' ').filter((w) => w && !GEO_STOP.has(w)).join(' ');

  // extra accepted spellings for genuinely ambiguous / abbreviated answers
  const ALIASES = {
    'United States': ['usa', 'us', 'america', 'united states of america'],
    'United Kingdom': ['uk', 'britain', 'great britain'],
    'United Arab Emirates': ['uae'],
    'Democratic Republic of the Congo': ['drc', 'dr congo', 'congo kinshasa'],
    'Republic of the Congo': ['congo', 'congo brazzaville'],
    'Czechia': ['czech republic'],
    'Eswatini': ['swaziland'],
    'Cape Verde': ['cabo verde'],
    'Timor-Leste': ['east timor'],
    'Myanmar': ['burma'],
    'North Macedonia': ['macedonia'],
    'Ivory Coast': ["cote d'ivoire", 'cote divoire'],
    'Vatican City': ['vatican', 'holy see'],
    'Sri Jayawardenepura Kotte': ['colombo', 'kotte', 'sri jayawardenepura'],
    'Washington, D.C.': ['washington', 'washington dc'],
    'Aoraki / Mount Cook': ['mount cook', 'mt cook', 'aoraki'],
  };

  function checkTyped(game, item, raw) {
    const answer = game.answer(item);
    const accepted = new Set();
    const despace = (s) => s.replace(/ /g, '');
    const add = (v) => {
      const n = normAns(v);
      const c = coreAns(v);
      if (n) accepted.add(n).add(despace(n)); // also match "u s a" -> "usa"
      if (c) accepted.add(c).add(despace(c));
    };
    add(answer);
    (ALIASES[answer] || []).forEach(add);
    const userN = normAns(raw);
    const userC = coreAns(raw);
    return (
      accepted.has(userN) ||
      accepted.has(despace(userN)) ||
      (!!userC && (accepted.has(userC) || accepted.has(despace(userC))))
    );
  }

  /* ---------- game definitions ----------
     Each game says where its data lives, how to render the
     prompt, what counts as the answer, and how to label a
     record after answering. Distractors are drawn from the
     filtered pool (preferring the same region / type). */
  const GAMES = {
    capitals: {
      id: 'capitals',
      title: 'Capitals & Cities',
      kicker: '// Game 01',
      blurb: 'Name the capital of each country, territory or dependency.',
      data: () => window.GEO_COUNTRIES,
      hasTerritories: true,
      questionLabel: (item) => `What is the capital of ${esc(item.name)}?`,
      promptHTML: (item) =>
        `<div class="prompt-text">${esc(item.name)}</div>` +
        `<div class="prompt-sub mono">${esc(item.region)}${item.territory ? ' · territory' : ''}</div>`,
      answer: (item) => item.capital,
      reveal: (item) => `${esc(item.capital)} — ${esc(item.name)}`,
    },
    flags: {
      id: 'flags',
      title: 'Flags',
      kicker: '// Game 02',
      blurb: 'Identify the country, region or territory from its flag.',
      data: () => window.GEO_COUNTRIES,
      hasTerritories: true,
      questionLabel: () => 'Which place does this flag belong to?',
      promptHTML: (item) =>
        `<div class="flag-wrap">` +
        `<img class="flag-img" alt="" src="https://flagcdn.com/w320/${item.code.toLowerCase()}.png" ` +
        `onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` +
        `<span class="flag-fallback" style="display:none">${flagEmoji(item.code)}</span>` +
        `</div>`,
      answer: (item) => item.name,
      reveal: (item) => `${esc(item.name)} · ${esc(item.region)}`,
    },
    waters: {
      id: 'waters',
      title: 'Seas & Waters',
      kicker: '// Game 03',
      blurb: 'Identify seas, oceans, gulfs and bays from a zoomed-in map.',
      data: () => window.GEO_SEAMAP.items,
      hasTerritories: false,
      hasHideLabels: true,
      isMap: true,
      questionLabel: () => 'Which body of water is centred in this map view?',
      promptHTML: () =>
        `<div class="seamap" id="seamap"><span class="seamap__loading mono">Loading map…</span></div>`,
      afterPrompt: (item) => renderSeaMap(item),
      answer: (item) => item.name,
      reveal: (item) => `${esc(item.name)} · ${esc(item.region)}`,
    },
    peaks: {
      id: 'peaks',
      title: 'Peaks, Rivers & Lakes',
      kicker: '// Game 04',
      blurb: 'Identify the world’s great mountains, rivers and lakes from a clue.',
      data: () => window.GEO_TERRAIN,
      hasTerritories: false,
      questionLabel: () => 'Which feature is being described?',
      promptHTML: (item) =>
        `<div class="prompt-clue">${esc(item.clue)}</div>` +
        `<div class="prompt-sub mono">${esc(item.type)} · ${esc(item.region)}</div>`,
      answer: (item) => item.name,
      reveal: (item) => `${esc(item.name)} — ${esc(item.type)}`,
      preferType: true,
    },
  };

  const NAV = [
    ['home', 'Home'],
    ['capitals', 'Capitals'],
    ['flags', 'Flags'],
    ['waters', 'Waters'],
    ['peaks', 'Peaks & Rivers'],
  ];

  const COUNTS = [10, 20, 0]; // 0 = all available

  /* ---------- application state ---------- */
  const view = $('#view');
  let quiz = null; // active quiz session, or null

  /* ============================================================
     ROUTER
     ============================================================ */
  function currentRoute() {
    const r = (location.hash || '#/home').replace(/^#\/?/, '').trim();
    return r === '' ? 'home' : r;
  }

  function navigate() {
    const route = currentRoute();
    // leaving a game cancels any in-progress quiz
    if (quiz && quiz.game.id !== route) endQuiz();
    clearScoresTimer(); // stop the leaderboard auto-refresh when leaving
    setActiveNav(route);
    if (route === 'home') return renderHome();
    if (route === 'scores') return renderScores();
    if (GAMES[route]) {
      if (quiz && quiz.game.id === route) return renderQuiz();
      return renderSetup(GAMES[route]);
    }
    location.hash = '#/home';
  }

  function setActiveNav(route) {
    document.querySelectorAll('.nav__link').forEach((a) => {
      const match = a.dataset.route === route || (route !== 'home' && a.dataset.route === route);
      if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ============================================================
     LEADERBOARD helpers + SCORES page
     ============================================================ */
  function lbRows(rows) {
    if (!rows || !rows.length)
      return '<p class="lb-empty mono">No scores yet — be the first.</p>';
    return (
      '<table class="table"><thead><tr><th>#</th><th>Name</th><th>Score</th>' +
      '<th>Accuracy</th><th>Format</th></tr></thead><tbody>' +
      rows
        .map(
          (r, i) =>
            `<tr><td>${i + 1}</td><td>${esc(r.name)}</td>` +
            `<td>${r.score}</td><td>${r.accuracy}%</td>` +
            `<td>${r.format === 'type' ? 'Typed' : 'Multiple Choice'}</td></tr>`
        )
        .join('') +
      '</tbody></table>'
    );
  }

  async function loadBoard(el, game, length, limit) {
    if (!el) return;
    el.textContent = 'Loading…';
    try {
      el.innerHTML = lbRows(await window.LEADERBOARD.top(game, length, limit));
    } catch (e) {
      el.innerHTML = '<p class="lb-empty mono">Could not load scores.</p>';
    }
  }

  let scoresTimer = null;
  function clearScoresTimer() {
    if (scoresTimer) clearInterval(scoresTimer);
    scoresTimer = null;
  }

  const LENGTHS = [
    ['10', '10 questions'],
    ['20', '20 questions'],
    ['all', 'All questions'],
  ];

  function renderScores() {
    const LB = window.LEADERBOARD;
    const ids = Object.keys(GAMES);
    const activeGame = GAMES[renderScores.lastGame] ? renderScores.lastGame : ids[0];
    const activeLen = LENGTHS.some(([v]) => v === renderScores.lastLength)
      ? renderScores.lastLength
      : '10';
    const gameOpts = ids
      .map(
        (id) =>
          `<option value="${id}" ${id === activeGame ? 'selected' : ''}>${esc(GAMES[id].title)}</option>`
      )
      .join('');
    const lenOpts = LENGTHS.map(
      ([v, label]) =>
        `<option value="${v}" ${v === activeLen ? 'selected' : ''}>${label}</option>`
    ).join('');

    view.innerHTML = `
      <section class="scores">
        <header class="spec__head reveal">
          <span class="kicker">// Leaderboard</span>
          <h2>Top Scores</h2>
          <p>${
            LB.online
              ? 'Live global challenge scores — updates automatically.'
              : 'Local challenge scores saved on this device. Add a Supabase backend to share them online (see README).'
          }</p>
        </header>
        <div class="panel reveal">
          <div class="scores__head">
            <div class="scores__filters">
              <div class="field" style="margin:0">
                <span class="field__label">Game</span>
                <select class="select" id="lb-game">${gameOpts}</select>
              </div>
              <div class="field" style="margin:0">
                <span class="field__label">Length</span>
                <select class="select" id="lb-length">${lenOpts}</select>
              </div>
            </div>
            <button class="btn btn--ghost" id="lb-refresh">Refresh</button>
          </div>
          <div id="lb-board" class="lb-list" style="margin-top:var(--sp-4)">Loading…</div>
        </div>
      </section>`;

    const board = $('#lb-board');
    const gameSel = $('#lb-game');
    const lenSel = $('#lb-length');
    const load = () => {
      renderScores.lastGame = gameSel.value;
      renderScores.lastLength = lenSel.value;
      return loadBoard(board, gameSel.value, lenSel.value, 15);
    };
    gameSel.addEventListener('change', load);
    lenSel.addEventListener('change', load);
    $('#lb-refresh').addEventListener('click', load);
    load();

    clearScoresTimer();
    scoresTimer = setInterval(() => {
      if (currentRoute() !== 'scores') return clearScoresTimer();
      load();
    }, 20000);
    stagger();
  }

  /* ============================================================
     SEAMAP — zoomed, label-censored map for the Seas & Waters game.
     The vendored SVG is fetched once and kept as a single node that
     is moved into each question's container; per question we reset
     label visibility, set the viewBox to frame the target body of
     water, and hide its label (plus surrounding ones when enabled).
     ============================================================ */
  let seaSvgPromise = null;
  let seaSvgEl = null;
  let seaHidden = []; // elements currently hidden, to restore next question
  let seaMarker = null; // the "???" placeholder over the censored name
  let seaState = null; // { item, svg } for the active question
  const SVGNS = 'http://www.w3.org/2000/svg';

  function getSeaSvg() {
    if (seaSvgEl) return Promise.resolve(seaSvgEl);
    if (!seaSvgPromise) {
      seaSvgPromise = fetch(window.GEO_SEAMAP.src)
        .then((r) => {
          if (!r.ok) throw new Error('svg ' + r.status);
          return r.text();
        })
        .then((txt) => {
          const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
          // adopt the node into this document before it can be appended
          const svg = document.adoptNode(doc.documentElement);
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.classList.add('seamap__svg');
          seaSvgEl = svg;
          return svg;
        });
    }
    return seaSvgPromise;
  }

  function seaClearMarker() {
    if (seaMarker && seaMarker.parentNode) seaMarker.parentNode.removeChild(seaMarker);
    seaMarker = null;
  }
  function seaRestore() {
    seaHidden.forEach((el) => (el.style.visibility = ''));
    seaHidden = [];
    seaClearMarker();
  }
  function seaHide(svg, id) {
    const t = svg.getElementById(id);
    if (t) {
      t.style.visibility = 'hidden';
      seaHidden.push(t);
    }
  }
  // overlay a "???" where the censored name used to be, matched to the
  // size of the body of water's own label so it blends with the map
  function seaLabelFontSize(svg, id) {
    const el = svg.getElementById(id);
    if (!el) return 16;
    let fs = parseFloat(getComputedStyle(el).fontSize);
    if (!fs) {
      const ts = el.querySelector('tspan');
      if (ts) fs = parseFloat(getComputedStyle(ts).fontSize);
    }
    return fs || 16;
  }
  function seaPlaceMarker(svg, item) {
    seaClearMarker();
    const fs = seaLabelFontSize(svg, item.ids[0]);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', item.cx);
    t.setAttribute('y', item.cy);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-family', 'Arial, sans-serif');
    t.setAttribute('font-weight', '700');
    t.setAttribute('font-size', fs);
    t.setAttribute('fill', '#d92d43');
    t.setAttribute('stroke', '#ffffff');
    t.setAttribute('stroke-width', Math.max(0.4, fs * 0.08));
    t.setAttribute('paint-order', 'stroke');
    t.setAttribute('pointer-events', 'none');
    t.textContent = '???';
    svg.appendChild(t); // last child → painted on top
    seaMarker = t;
  }
  function seaViewBox(svg, item, container) {
    const cw = container.clientWidth || 600;
    const ch = container.clientHeight || cw / 1.5;
    const aspect = cw / ch;
    const MW = window.GEO_SEAMAP.viewW;
    const MH = window.GEO_SEAMAP.viewH;
    let w = item.frame;
    let h = w / aspect;
    if (h > MH) { h = MH; w = h * aspect; }
    if (w > MW) { w = MW; h = w / aspect; }
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const x = clamp(item.cx - w / 2, 0, MW - w);
    const y = clamp(item.cy - h / 2, 0, MH - h);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    return { x, y, w, h };
  }

  async function renderSeaMap(item) {
    const container = document.getElementById('seamap');
    if (!container) return;
    let svg;
    try {
      svg = await getSeaSvg();
    } catch (e) {
      container.innerHTML = '<span class="seamap__loading mono">Map failed to load.</span>';
      return;
    }
    if (document.getElementById('seamap') !== container) return; // navigated away mid-fetch
    container.innerHTML = '';
    container.appendChild(svg); // move the shared node into this question
    seaRestore();
    const vb = seaViewBox(svg, item, container);
    item.ids.forEach((id) => seaHide(svg, id)); // censor the target label
    seaPlaceMarker(svg, item); // ...and mark it with a "???" at label size
    if (quiz && quiz.hideLabels) {
      const labels = window.GEO_SEAMAP.labels;
      const targ = new Set(item.ids);
      for (const id in labels) {
        if (targ.has(id)) continue;
        const [lx, ly] = labels[id];
        if (lx >= vb.x && lx <= vb.x + vb.w && ly >= vb.y && ly <= vb.y + vb.h) seaHide(svg, id);
      }
    }
    seaState = { item, svg };
  }

  function seaRevealTarget() {
    seaClearMarker(); // drop the "???" and show the real name
    if (!seaState) return;
    seaState.item.ids.forEach((id) => {
      const t = seaState.svg.getElementById(id);
      if (t) t.style.visibility = '';
    });
  }

  /* ============================================================
     HOME
     ============================================================ */
  function renderHome() {
    const cards = Object.values(GAMES)
      .map(
        (g) => `
        <a class="panel panel--selectable game-card reveal" href="#/${g.id}">
          <span class="panel__label">${g.kicker}</span>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.blurb)}</p>
          <span class="game-card__go mono">Launch ▸</span>
        </a>`
      )
      .join('');

    view.innerHTML = `
      <header class="hero reveal">
        <span class="kicker">// Geography Quiz Console</span>
        <h1>GEO<b style="color:var(--accent)">GAMES</b></h1>
        <p>Four geography drills, two modes each. Practise freely with instant
        feedback, or take the timed challenge for a score. Narrow any drill by
        continent, or switch in territories and dependencies for an extra layer
        of difficulty.</p>
        <div class="hero__actions">
          <span class="badge badge--ok"><span class="badge__dot"></span>Practice mode</span>
          <span class="badge"><span class="badge__dot"></span>Challenge mode</span>
          <span class="badge"><span class="badge__dot"></span>Region filters</span>
        </div>
      </header>
      <section class="home-grid">${cards}</section>`;
    stagger();
  }

  /* ============================================================
     SETUP SCREEN  (mode + filters)
     ============================================================ */
  function regionsOf(data) {
    const order = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Oceans'];
    const present = new Set(data.map((d) => d.region));
    const found = order.filter((r) => present.has(r));
    // any region not in the canonical order, appended
    data.forEach((d) => {
      if (!found.includes(d.region)) found.push(d.region);
    });
    return found;
  }

  function renderSetup(game) {
    const data = game.data();
    const regions = regionsOf(data);
    const regionChecks = regions
      .map(
        (r) => `
        <label class="check">
          <input type="checkbox" name="region" value="${esc(r)}" checked>
          <span class="check__box"></span>${esc(r)}
        </label>`
      )
      .join('');

    const territoryRow = game.hasTerritories
      ? `<div class="field">
           <span class="field__label">Extra questions</span>
           <label class="switch">
             <input type="checkbox" id="opt-territories">
             <span class="switch__track"></span>
             Include territories &amp; dependencies
           </label>
         </div>`
      : '';

    const hideLabelsRow = game.hasHideLabels
      ? `<div class="field">
           <span class="field__label">Map difficulty</span>
           <label class="switch">
             <input type="checkbox" id="opt-hidelabels">
             <span class="switch__track"></span>
             Hide names of surrounding waters
           </label>
         </div>`
      : '';

    const countOpts = COUNTS.map(
      (c, i) => `
      <label class="check check--radio">
        <input type="radio" name="count" value="${c}" ${i === 0 ? 'checked' : ''}>
        <span class="check__box"></span>${c === 0 ? 'All' : c + ' questions'}
      </label>`
    ).join('');

    view.innerHTML = `
      <section class="setup">
        <header class="spec__head reveal">
          <span class="kicker">${game.kicker} · Setup</span>
          <h2>${esc(game.title)}</h2>
          <p>${esc(game.blurb)}</p>
        </header>

        <div class="setup__grid">
          <div class="panel reveal">
            <span class="panel__label">Mode</span>
            <div class="mode-grid">
              <label class="panel panel--selectable mode-card" data-mode="practice">
                <input type="radio" name="mode" value="practice" checked hidden>
                <h3>Practice</h3>
                <p>Untimed. Instant feedback and the correct answer after every question. No pressure.</p>
              </label>
              <label class="panel panel--selectable mode-card" data-mode="challenge">
                <input type="radio" name="mode" value="challenge" hidden>
                <h3>Challenge</h3>
                <p>Timed run with points, streak bonuses and a final score. One shot per question.</p>
              </label>
            </div>
            <div class="field" style="margin-top:var(--sp-4)">
              <span class="field__label">Answer format</span>
              <div class="inline-checks">
                <label class="check check--radio">
                  <input type="radio" name="input" value="mc" checked>
                  <span class="check__box"></span>Multiple choice
                </label>
                <label class="check check--radio">
                  <input type="radio" name="input" value="type">
                  <span class="check__box"></span>Type the answer
                </label>
              </div>
            </div>
            <div class="field">
              <span class="field__label">Length (challenge)</span>
              <div class="inline-checks">${countOpts}</div>
            </div>
          </div>

          <div class="panel reveal">
            <span class="panel__label">Difficulty · Regions</span>
            <p class="setup__hint">Pick which continents to draw questions from.</p>
            <div class="region-grid">${regionChecks}</div>
            <div class="region-actions">
              <button class="btn btn--ghost" type="button" id="region-all">All</button>
              <button class="btn btn--ghost" type="button" id="region-none">None</button>
            </div>
            ${territoryRow}
            ${hideLabelsRow}
          </div>
        </div>

        <div class="setup__foot reveal">
          <span class="badge" id="pool-count"><span class="badge__dot"></span>—</span>
          <button class="btn btn--primary" id="start-btn">Start ▸</button>
        </div>
      </section>`;

    wireSetup(game);
    stagger();
  }

  function wireSetup(game) {
    // mode cards reflect selection visually
    const modeCards = document.querySelectorAll('.mode-card');
    const syncModes = () => {
      modeCards.forEach((c) => {
        const checked = c.querySelector('input').checked;
        c.setAttribute('aria-selected', checked ? 'true' : 'false');
      });
    };
    modeCards.forEach((c) =>
      c.addEventListener('click', () => {
        c.querySelector('input').checked = true;
        syncModes();
      })
    );
    syncModes();

    const regionInputs = () => Array.from(document.querySelectorAll('input[name="region"]'));
    const territoriesEl = $('#opt-territories');
    const countEl = () => document.querySelector('input[name="count"]:checked');
    const inputEl = () => document.querySelector('input[name="input"]:checked');
    const inputRadios = () => Array.from(document.querySelectorAll('input[name="input"]'));
    const poolBadge = $('#pool-count');

    const buildPool = () => {
      const selected = new Set(regionInputs().filter((i) => i.checked).map((i) => i.value));
      const includeTerr = territoriesEl ? territoriesEl.checked : false;
      return game.data().filter((d) => {
        if (!selected.has(d.region)) return false;
        if (d.territory && !includeTerr) return false;
        return true;
      });
    };

    const refresh = () => {
      const pool = buildPool();
      // multiple choice needs 4 for distractors; typed needs only 1
      const min = inputEl().value === 'type' ? 1 : 4;
      const ok = pool.length >= min;
      poolBadge.className = 'badge ' + (ok ? 'badge--ok' : 'badge--err');
      poolBadge.innerHTML = `<span class="badge__dot"></span>${pool.length} in pool`;
      $('#start-btn').disabled = !ok;
    };

    regionInputs().forEach((i) => i.addEventListener('change', refresh));
    inputRadios().forEach((i) => i.addEventListener('change', refresh));
    if (territoriesEl) territoriesEl.addEventListener('change', refresh);

    $('#region-all').addEventListener('click', () => {
      regionInputs().forEach((i) => (i.checked = true));
      refresh();
    });
    $('#region-none').addEventListener('click', () => {
      regionInputs().forEach((i) => (i.checked = false));
      refresh();
    });

    const hideLabelsEl = $('#opt-hidelabels');

    $('#start-btn').addEventListener('click', () => {
      const pool = buildPool();
      const input = inputEl().value;
      if (pool.length < (input === 'type' ? 1 : 4)) return;
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const rawCount = countEl().value; // '10' | '20' | '0' (=all)
      const length = rawCount === '0' ? 'all' : rawCount;
      let count = parseInt(rawCount, 10);
      if (mode === 'practice') count = pool.length; // practice covers the whole pool
      if (count === 0 || count > pool.length) count = pool.length;
      const hideLabels = hideLabelsEl ? hideLabelsEl.checked : false;
      startQuiz(game, mode, pool, count, input, length, hideLabels);
    });

    refresh();
  }

  /* ============================================================
     QUIZ ENGINE
     ============================================================ */
  function buildQuestion(game, pool, item) {
    const correct = game.answer(item);
    // prefer distractors from the same type, then same region, then anything
    let near = pool.filter((x) => x !== item);
    if (game.preferType && item.type) {
      const t = near.filter((x) => x.type === item.type);
      if (t.length >= 3) near = t;
    } else {
      const r = near.filter((x) => x.region === item.region);
      if (r.length >= 3) near = r;
    }
    const labels = new Set([correct]);
    for (const x of shuffle(near)) {
      if (labels.size >= 4) break;
      labels.add(game.answer(x));
    }
    // top up from whole pool if the near pool was thin
    if (labels.size < 4) {
      for (const x of shuffle(pool.filter((x) => x !== item))) {
        if (labels.size >= 4) break;
        labels.add(game.answer(x));
      }
    }
    const options = shuffle(Array.from(labels));
    return { item, options, correct };
  }

  // build the active question; multiple choice also needs options
  function makeQuestion(item) {
    if (quiz.input === 'mc') return buildQuestion(quiz.game, quiz.pool, item);
    return { item, options: null, correct: quiz.game.answer(item) };
  }

  function startQuiz(game, mode, pool, count, input, length, hideLabels) {
    const queue = sample(pool, count);
    quiz = {
      game,
      mode,
      input: input || 'mc',
      length: length || 'all', // challenge length category: '10' | '20' | 'all'
      hideLabels: !!hideLabels, // hide surrounding water names (map game)
      pool,
      queue,
      index: 0,
      total: queue.length,
      correct: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      answered: false,
      startTime: Date.now(),
      current: null,
    };
    quiz.current = makeQuestion(queue[0]);
    location.hash = '#/' + game.id;
    renderQuiz();
  }

  function endQuiz() {
    quiz = null;
  }

  function renderQuiz() {
    if (!quiz) return navigate();
    if (quiz.finished) return renderResults();
    const q = quiz.current;
    const g = quiz.game;
    const num = quiz.index + 1;
    const pct = Math.round((quiz.index / quiz.total) * 100);

    const stat = (label, value, id) =>
      `<div class="stat"><span class="stat__label mono">${label}</span><span class="stat__value" ${id ? `id="${id}"` : ''}>${value}</span></div>`;

    const stats =
      quiz.mode === 'challenge'
        ? stat('Score', quiz.score, 'stat-score') +
          stat('Streak', quiz.streak, 'stat-streak') +
          stat('Time', fmtTime(Date.now() - quiz.startTime), 'stat-time')
        : stat('Correct', `${quiz.correct}/${quiz.index}`, 'stat-correct');

    const answerArea =
      quiz.input === 'mc'
        ? `<div class="options reveal" id="options">${q.options
            .map(
              (opt, i) =>
                `<button class="btn option" data-i="${i}" data-val="${esc(opt)}">${esc(opt)}</button>`
            )
            .join('')}</div>`
        : `<form class="typed reveal" id="typed-form" autocomplete="off" novalidate>
             <input class="input typed-input" id="typed-input" type="text"
               placeholder="Type your answer…" autocomplete="off"
               autocapitalize="off" autocorrect="off" spellcheck="false">
             <button class="btn btn--primary" type="submit" id="submit-btn">Submit</button>
             <p class="typed__hint mono">Case-insensitive · spelling-tolerant</p>
           </form>`;

    view.innerHTML = `
      <section class="quiz">
        <div class="quiz__bar reveal">
          <div class="quiz__meta">
            <span class="kicker">${g.kicker}</span>
            <span class="badge ${quiz.mode === 'challenge' ? 'badge--warn' : 'badge--ok'}">
              <span class="badge__dot"></span>${quiz.mode}
            </span>
          </div>
          <div class="quiz__stats">${stats}</div>
        </div>

        <div class="progress reveal"><div class="progress__bar" style="width:${pct}%"></div></div>
        <div class="quiz__count mono">Question ${num} / ${quiz.total}</div>

        <article class="panel quiz__card reveal">
          <span class="panel__label">${esc(g.questionLabel(q.item))}</span>
          <div class="prompt">${g.promptHTML(q.item)}</div>
        </article>

        ${answerArea}

        <div class="feedback" id="feedback" hidden></div>

        <div class="quiz__foot reveal">
          <button class="btn btn--ghost" id="quit-btn">Quit</button>
          <button class="btn btn--primary" id="next-btn" hidden>Next ▸</button>
        </div>
      </section>`;

    wireQuiz();
    stagger();
    if (g.afterPrompt) g.afterPrompt(q.item); // e.g. inject + frame the sea map
    if (quiz.mode === 'challenge') startTimer();
  }

  let timerHandle = null;
  function startTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
      const el = $('#stat-time');
      if (!el || !quiz) return stopTimer();
      el.textContent = fmtTime(Date.now() - quiz.startTime);
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  function wireQuiz() {
    const optionEls = Array.from(document.querySelectorAll('.option'));
    const feedback = $('#feedback');
    const nextBtn = $('#next-btn');

    // shared: record the result, update stats, show feedback + Next
    function settle(isRight) {
      quiz.answered = true;
      if (isRight) {
        quiz.correct++;
        quiz.streak++;
        quiz.bestStreak = Math.max(quiz.bestStreak, quiz.streak);
        if (quiz.mode === 'challenge') {
          quiz.score += 100 + (quiz.streak - 1) * 20; // streak bonus
          const s = $('#stat-score');
          if (s) s.textContent = quiz.score;
        }
      } else {
        quiz.streak = 0;
      }
      if (quiz.mode === 'challenge') {
        const st = $('#stat-streak');
        if (st) st.textContent = quiz.streak;
      } else {
        const c = $('#stat-correct');
        if (c) c.textContent = `${quiz.correct}/${quiz.index + 1}`;
      }

      feedback.hidden = false;
      feedback.className = 'feedback alert ' + (isRight ? 'alert--info feedback--ok' : 'alert--err');
      feedback.innerHTML =
        `<span class="alert__icon">${isRight ? '[✓]' : '[✗]'}</span>` +
        `<span class="alert__body"><strong>${isRight ? 'Correct.' : 'Not quite.'}</strong> ` +
        `${quiz.game.reveal(quiz.current.item)}</span>`;

      if (quiz.game.isMap) seaRevealTarget(); // un-censor the answer on the map

      nextBtn.hidden = false;
      nextBtn.textContent = quiz.index + 1 >= quiz.total ? 'See results ▸' : 'Next ▸';
      nextBtn.focus({ preventScroll: true });
    }

    // ---- multiple choice ----
    optionEls.forEach((btn) =>
      btn.addEventListener('click', () => {
        if (quiz.answered) return;
        const correct = quiz.current.correct;
        const isRight = btn.dataset.val === correct;
        optionEls.forEach((b) => {
          b.disabled = true;
          if (b.dataset.val === correct) b.classList.add('option--correct');
          else if (b === btn) b.classList.add('option--wrong');
        });
        settle(isRight);
      })
    );

    // ---- typed answer ----
    const typedForm = $('#typed-form');
    const typedInput = $('#typed-input');
    if (typedForm) {
      typedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (quiz.answered) return;
        if (!typedInput.value.trim()) return; // ignore empty submissions
        const isRight = checkTyped(quiz.game, quiz.current.item, typedInput.value);
        typedInput.disabled = true;
        typedInput.classList.add(isRight ? 'typed--correct' : 'typed--wrong');
        const submitBtn = $('#submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        settle(isRight);
      });
      typedInput.focus({ preventScroll: true });
    }

    nextBtn.addEventListener('click', advance);
    $('#quit-btn').addEventListener('click', () => {
      stopTimer();
      quiz.finished = true;
      renderResults();
    });

    // keyboard: 1-4 picks an option (MC); Enter/Space advances once answered.
    // (When the Next button itself is focused, its native activation advances,
    // so we bail to avoid a double-skip. Typed input keeps Enter for submit.)
    document.onkeydown = (e) => {
      if (!quiz || quiz.finished) return;
      const ae = document.activeElement;
      if (quiz.answered) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (ae && ae.id === 'next-btn') return;
          e.preventDefault();
          advance();
        }
        return;
      }
      if (quiz.input === 'mc' && /^[1-4]$/.test(e.key)) {
        const el = optionEls[parseInt(e.key, 10) - 1];
        if (el) el.click();
      }
    };
  }

  function advance() {
    if (!quiz) return;
    quiz.index++;
    quiz.answered = false;
    if (quiz.index >= quiz.total) {
      stopTimer();
      quiz.finished = true;
      quiz.elapsed = Date.now() - quiz.startTime;
      return renderResults();
    }
    quiz.current = makeQuestion(quiz.queue[quiz.index]);
    renderQuiz();
  }

  /* ============================================================
     RESULTS
     ============================================================ */
  function renderResults() {
    stopTimer();
    document.onkeydown = null;
    const answered = quiz.index + (quiz.answered ? 1 : 0);
    const seen = Math.max(answered, quiz.correct);
    const accuracy = seen ? Math.round((quiz.correct / seen) * 100) : 0;
    const elapsed = quiz.elapsed || Date.now() - quiz.startTime;
    const g = quiz.game;

    let verdict = 'Keep drilling.';
    if (accuracy >= 90) verdict = 'Outstanding — cartographer grade.';
    else if (accuracy >= 70) verdict = 'Strong work.';
    else if (accuracy >= 50) verdict = 'Solid footing.';

    const rows =
      quiz.mode === 'challenge'
        ? [
            ['Score', quiz.score],
            ['Accuracy', accuracy + '%'],
            ['Correct', `${quiz.correct} / ${seen}`],
            ['Best streak', quiz.bestStreak],
            ['Time', fmtTime(elapsed)],
          ]
        : [
            ['Accuracy', accuracy + '%'],
            ['Correct', `${quiz.correct} / ${seen}`],
            ['Best streak', quiz.bestStreak],
            ['Time', fmtTime(elapsed)],
          ];

    const statHTML = rows
      .map(
        ([l, v]) =>
          `<div class="stat stat--big"><span class="stat__label mono">${l}</span><span class="stat__value">${v}</span></div>`
      )
      .join('');

    // score submission + top scores (challenge mode only — practice is unscored)
    const lenLabel = quiz.length === 'all' ? 'All questions' : `${quiz.length} questions`;
    const lbCard =
      quiz.mode === 'challenge'
        ? `<div class="panel reveal" id="lb-card">
             <span class="panel__label">Top Scores · ${esc(g.title)} · ${lenLabel}${
               window.LEADERBOARD.online ? '' : ' · this device'
             }</span>
             <div class="lb-submit" id="lb-submit">
               <input class="input" id="lb-name" maxlength="24" placeholder="Enter your name"
                 value="${esc(window.LEADERBOARD.lastName())}">
               <button class="btn btn--primary" id="lb-save">Submit score</button>
             </div>
             <div id="lb-list" class="lb-list" style="margin-top:var(--sp-4)">Loading…</div>
           </div>`
        : '';

    view.innerHTML = `
      <section class="results">
        <header class="spec__head reveal">
          <span class="kicker">${g.kicker} · Results</span>
          <h2>${esc(g.title)} — ${quiz.mode}</h2>
          <p>${verdict}</p>
        </header>
        <div class="panel reveal results__card">
          <div class="progress" style="margin-bottom:var(--sp-5)">
            <div class="progress__bar" style="width:${accuracy}%"></div>
          </div>
          <div class="results__grid">${statHTML}</div>
        </div>
        ${lbCard}
        <div class="setup__foot reveal">
          <button class="btn btn--ghost" id="home-btn">Home</button>
          <button class="btn" id="again-btn">Change settings</button>
          <button class="btn btn--primary" id="replay-btn">Play again ▸</button>
        </div>
      </section>`;

    const game = g,
      mode = quiz.mode,
      pool = quiz.pool,
      total = quiz.total,
      input = quiz.input,
      length = quiz.length,
      hideLabels = quiz.hideLabels;
    $('#replay-btn').addEventListener('click', () =>
      startQuiz(game, mode, pool, total, input, length, hideLabels)
    );
    $('#again-btn').addEventListener('click', () => {
      endQuiz();
      renderSetup(game);
    });
    $('#home-btn').addEventListener('click', () => {
      endQuiz();
      location.hash = '#/home';
    });

    if (mode === 'challenge') {
      const listEl = $('#lb-list');
      loadBoard(listEl, game.id, length, 10);
      const saveBtn = $('#lb-save');
      const nameEl = $('#lb-name');
      const score = quiz.score;
      saveBtn.addEventListener('click', async () => {
        const name = (nameEl.value || '').trim() || 'Anon';
        window.LEADERBOARD.rememberName(name);
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
          await window.LEADERBOARD.submit({ game: game.id, format: input, length, name, score, accuracy });
          $('#lb-submit').innerHTML =
            '<span class="badge badge--ok"><span class="badge__dot"></span>Score submitted</span>';
          loadBoard(listEl, game.id, length, 10);
        } catch (e) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Submit score';
          nameEl.insertAdjacentHTML(
            'afterend',
            '<p class="lb-empty mono">Submit failed — try again.</p>'
          );
        }
      });
    }
    stagger();
  }

  /* ============================================================
     SHARED: staggered reveal
     ============================================================ */
  function stagger() {
    document.querySelectorAll('#view .reveal').forEach((el, i) => {
      el.style.animationDelay = i * 0.05 + 's';
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  window.addEventListener('hashchange', navigate);
  navigate();
})();
