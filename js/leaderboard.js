'use strict';
/* Glizzy Gobbler — world leaderboard backed by Supabase (REST, no library). */
const Leaderboard = (() => {
  const URL = 'https://gxhdcdfqgmdliyosxkyf.supabase.co';
  // Public "anon" / "publishable" key from Supabase: Project Settings → API.
  // It is meant to be public; the database's row-level security limits it to
  // reading scores and adding new ones. Leave empty to disable the world board.
  const KEY = 'sb_publishable_dERcU4biGxXUtcX2Z0tS4Q_y3PH4K8d';

  const MAX_NAME = 10;
  const enabled = () => KEY.length > 0;

  function headers(extra) {
    const h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY; // legacy JWT-style anon key
    return Object.assign(h, extra || {});
  }
  async function req(path, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(URL + '/rest/v1/' + path, Object.assign({ signal: ctrl.signal }, opts));
      if (!r.ok) throw new Error('Leaderboard HTTP ' + r.status);
      return r;
    } finally { clearTimeout(timer); }
  }

  /** Top scores, highest first; ties go to whoever got there first. */
  async function top(n = 10) {
    const r = await req(`scores?select=name,score,wave,created_at&order=score.desc,created_at.asc&limit=${n}`, { headers: headers() });
    return r.json();
  }
  async function submit(name, score, wave) {
    await req('scores', {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ name, score: Math.floor(score), wave: Math.floor(wave) }),
    });
  }
  /** World rank a score would have (1 = best), or null if unknown. */
  async function rank(score) {
    const r = await req(`scores?select=id&score=gt.${Math.floor(score)}`, { method: 'HEAD', headers: headers({ Prefer: 'count=exact' }) });
    const m = (r.headers.get('content-range') || '').match(/\/(\d+)$/);
    return m ? Number(m[1]) + 1 : null;
  }
  /** Names: up to 10 characters of A–Z, 0–9, space and - _ . ! ? (shown in caps). */
  function clean(name) {
    return String(name || '').toUpperCase().replace(/[^A-Z0-9 _.!?-]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  }

  return { enabled, top, submit, rank, clean, MAX_NAME };
})();
