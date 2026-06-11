/* ============================================================
   LEADERBOARD — shared online top scores (optional) with a
   local per-device fallback.

   To enable the LIVE SHARED leaderboard, create a free Supabase
   project and paste its URL + anon key below. The anon (public)
   key is safe to commit. Until you do, scores are stored locally
   in each visitor's browser so the app still works.

   Supabase table + policies (run in the SQL editor):

     create table public.scores (
       id         bigint generated always as identity primary key,
       game       text not null,
       format     text not null default 'mc',
       name       text not null default 'Anon',
       score      int  not null default 0,
       accuracy   int  not null default 0,
       created_at timestamptz not null default now()
     );
     alter table public.scores enable row level security;
     create policy "public read"  on public.scores
       for select to anon using (true);
     create policy "public insert" on public.scores
       for insert to anon with check (
         char_length(name) <= 24 and score >= 0 and score <= 1000000
       );

   Note: an anon key lets anyone POST, so scores are unverified
   (spoofable). For a hardened board, front it with a Cloudflare
   Worker / Supabase Edge Function that rate-limits and validates.
   ============================================================ */
window.LEADERBOARD = (function () {
  'use strict';

  // ---- CONFIG: paste your Supabase values here to go live ----
  const SUPABASE_URL = '';      // e.g. 'https://abcdefgh.supabase.co'
  const SUPABASE_ANON_KEY = ''; // the public anon / publishable key
  const TABLE = 'scores';

  const online = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

  const headers = () => ({
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  });

  function clean(entry) {
    return {
      game: String(entry.game),
      format: entry.format === 'type' ? 'type' : 'mc',
      name: (String(entry.name || 'Anon').trim() || 'Anon').slice(0, 24),
      score: Math.max(0, entry.score | 0),
      accuracy: Math.max(0, Math.min(100, entry.accuracy | 0)),
    };
  }

  async function submit(entry) {
    const row = clean(entry);
    if (!online) return localSubmit(row);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error('submit failed: ' + res.status);
  }

  async function top(game, limit = 10) {
    if (!online) return localTop(game, limit);
    const url =
      `${SUPABASE_URL}/rest/v1/${TABLE}` +
      `?select=name,score,accuracy,format,created_at` +
      `&game=eq.${encodeURIComponent(game)}` +
      `&order=score.desc&limit=${limit}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    return res.json();
  }

  /* ---- local (per-device) fallback ---- */
  const LS = 'geogames.scores';
  const allLocal = () => {
    try {
      return JSON.parse(localStorage.getItem(LS)) || [];
    } catch (e) {
      return [];
    }
  };
  function localSubmit(row) {
    const a = allLocal();
    a.push({ ...row, created_at: new Date().toISOString() });
    try {
      localStorage.setItem(LS, JSON.stringify(a));
    } catch (e) {}
    return Promise.resolve();
  }
  function localTop(game, limit) {
    return Promise.resolve(
      allLocal()
        .filter((r) => r.game === game)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    );
  }

  /* ---- remember the last name used ---- */
  function rememberName(n) {
    try {
      localStorage.setItem('geogames.name', n);
    } catch (e) {}
  }
  function lastName() {
    try {
      return localStorage.getItem('geogames.name') || '';
    } catch (e) {
      return '';
    }
  }

  return { online, submit, top, rememberName, lastName };
})();
