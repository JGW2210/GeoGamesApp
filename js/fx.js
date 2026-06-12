/* ============================================================
   FX — theme toggle, particle field and custom cursor.
   Lifted from the HUD/0S reference so the app keeps the same
   ambient motion. All decorative, all click-through.
   ============================================================ */
(function () {
  'use strict';

  /* ---- THEME TOGGLE (in-memory) ---- */
  const root = document.documentElement;
  const tg = document.getElementById('themeToggle');
  const lbl = document.getElementById('themeLabel');
  function setTheme(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (lbl) lbl.textContent = dark ? 'DARK' : 'LIGHT';
    if (tg) tg.checked = !dark;
  }
  setTheme(false); // default to light mode
  if (tg) tg.addEventListener('change', () => setTheme(!tg.checked));

  /* ---- MOBILE NAV (hamburger) ---- */
  (function () {
    const nav = document.querySelector('.nav');
    const burger = document.getElementById('navBurger');
    const links = document.getElementById('navLinks');
    if (!nav || !burger) return;
    const close = () => {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (links) links.addEventListener('click', (e) => {
      if (e.target.closest('.nav__link')) close(); // close after choosing a page
    });
  })();

  /* ---- PARTICLE FIELD ---- */
  (function () {
    const layer = document.querySelector('.fx-particles');
    if (!layer) return;
    function build() {
      layer.innerHTML = '';
      if (window.matchMedia('(max-width:640px)').matches) return; // no particles on phones
      const area = window.innerWidth * window.innerHeight;
      const count = Math.max(30, Math.min(120, Math.round(area / 20000)));
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const d = document.createElement('span');
        d.className = 'fx-dot';
        d.style.left = (Math.random() * 100).toFixed(2) + '%';
        d.style.top = (Math.random() * 100).toFixed(2) + '%';
        const dur = 4 + Math.random() * 6;
        d.style.setProperty('--pdur', dur.toFixed(2) + 's');
        d.style.setProperty('--pdelay', (-Math.random() * dur).toFixed(2) + 's');
        frag.appendChild(d);
      }
      layer.appendChild(frag);
    }
    build();
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(build, 300);
    });
  })();

  /* ---- CUSTOM CURSOR: square reticle + teal afterimage ---- */
  (function () {
    if (!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<div class="cursor__box"><i class="cursor__ring"></i></div>';
    document.body.appendChild(cur);
    document.documentElement.classList.add('cursor-custom');

    let x = 0, y = 0, lx = 0, ly = 0, shown = false, raf = 0;
    function render() {
      cur.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      raf = 0;
    }
    function spawn(px, py) {
      const t = document.createElement('span');
      t.className = 'trace';
      t.style.left = px + 'px';
      t.style.top = py + 'px';
      document.body.appendChild(t);
      t.addEventListener('animationend', () => t.remove());
    }
    window.addEventListener('mousemove', (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        cur.style.opacity = '1';
        lx = x;
        ly = y;
      }
      if (!raf) raf = requestAnimationFrame(render);
      if (!reduce) {
        const dx = x - lx, dy = y - ly;
        if (dx * dx + dy * dy > 80) {
          spawn(x, y);
          lx = x;
          ly = y;
        }
      }
    });
    document.addEventListener('mouseleave', () => {
      shown = false;
      cur.style.opacity = '0';
    });
    window.addEventListener('mousedown', () => cur.classList.add('cursor--down'));
    window.addEventListener('mouseup', () => cur.classList.remove('cursor--down'));
    const HOT = 'a,button,input,select,textarea,label,.tab,.panel--selectable,[role="tab"],[tabindex]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(HOT)) cur.classList.add('cursor--hot');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(HOT)) cur.classList.remove('cursor--hot');
    });
  })();
})();
