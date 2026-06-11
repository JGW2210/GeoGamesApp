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
      blurb: 'Identify oceans, seas, gulfs, bays and great lakes from a clue.',
      data: () => window.GEO_WATERS,
      hasTerritories: false,
      questionLabel: () => 'Which body of water is being described?',
      promptHTML: (item) =>
        `<div class="prompt-clue">${esc(item.clue)}</div>` +
        `<div class="prompt-sub mono">${esc(item.type)} · ${esc(item.region)}</div>`,
      answer: (item) => item.name,
      reveal: (item) => `${esc(item.name)} — ${esc(item.type)}`,
      preferType: true,
    },
    peaks: {
      id: 'peaks',
      title: 'Peaks & Rivers',
      kicker: '// Game 04',
      blurb: 'Identify the world’s great mountains and rivers from a clue.',
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
    setActiveNav(route);
    if (route === 'home') return renderHome();
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

    $('#start-btn').addEventListener('click', () => {
      const pool = buildPool();
      const input = inputEl().value;
      if (pool.length < (input === 'type' ? 1 : 4)) return;
      const mode = document.querySelector('input[name="mode"]:checked').value;
      let count = parseInt(countEl().value, 10);
      if (mode === 'practice') count = pool.length; // practice covers the whole pool
      if (count === 0 || count > pool.length) count = pool.length;
      startQuiz(game, mode, pool, count, input);
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

  function startQuiz(game, mode, pool, count, input) {
    const queue = sample(pool, count);
    quiz = {
      game,
      mode,
      input: input || 'mc',
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

      nextBtn.hidden = false;
      nextBtn.textContent = quiz.index + 1 >= quiz.total ? 'See results ▸' : 'Next ▸';
      nextBtn.focus();
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
      typedInput.focus();
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
        <div class="setup__foot reveal">
          <button class="btn btn--ghost" id="home-btn">Home</button>
          <button class="btn" id="again-btn">Change settings</button>
          <button class="btn btn--primary" id="replay-btn">Play again ▸</button>
        </div>
      </section>`;

    const game = g,
      mode = quiz.mode,
      pool = quiz.pool,
      total = quiz.total;
    $('#replay-btn').addEventListener('click', () => startQuiz(game, mode, pool, total));
    $('#again-btn').addEventListener('click', () => {
      endQuiz();
      renderSetup(game);
    });
    $('#home-btn').addEventListener('click', () => {
      endQuiz();
      location.hash = '#/home';
    });
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
