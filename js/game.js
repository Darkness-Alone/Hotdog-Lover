'use strict';
/* Glizzy Gobbler — main game. */
(() => {
  /* ======================= setup ======================= */
  const W = 540;
  let H = 960;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, scale = 1, offX = 0, offY = 0;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('touch');

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[(Math.random() * a.length) | 0];
  const FONT = '"Press Start 2P", ui-monospace, monospace';

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const prefs = Object.assign({ autofire: false }, store.get('glizzy.prefs', {}));

  /* Player sprite (user-supplied character, chest-up) */
  const PW = 54, PH = PW * 410 / 244;
  const PK = PW / 70; // scale of the player's pod, flames and shield relative to the original size
  const MOUTH = { x: 0.62, y: 0.56 };
  const playerImg = new Image();
  let playerSpr = null, headSpr = null;
  playerImg.onload = () => {
    playerSpr = Sprites.makePlayer(playerImg, PW, PH);
    headSpr = Sprites.makeHead(playerImg, 26);
  };
  playerImg.src = 'assets/player.png?v=8';

  /* ======================= definitions ======================= */
  const DEFS = {
    ketchup: { len: 50, layers: ['ketchup'], bites: 0, pts: 100, face: 'cute', ammo: 'ketchup' },
    mustard: { len: 50, layers: ['mustard'], bites: 0, pts: 100, face: 'cute', ammo: 'mustard' },
    relish: { len: 52, layers: ['relish'], bites: 1, pts: 150, face: 'cute', ammo: 'relish' },
    combo: { len: 54, layers: ['relish', 'mustard', 'ketchup'], bites: 1, pts: 300, face: 'angry', ammo: 'mix' },
    chili: { len: 54, layers: ['cheese', 'chili'], bites: 1, pts: 250, face: 'angry', ammo: 'chili', spread: 3 },
    bacon: { len: 54, layers: ['bacon', 'bacon', 'bacon'], bites: 0, pts: 250, face: 'cute', ammo: 'grease' },
    giant: { len: 90, layers: ['onion', 'relish', 'mustard', 'ketchup'], bites: 3, pts: 800, face: 'angry', ammo: 'mustard', spread: 3, split: 2, drop: 0.35 },
    mutant: { len: 56, layers: ['goo', 'ketchup'], bites: 1, pts: 400, face: 'mutant', ammo: 'goo', split: 2, erratic: true, drop: 0.25 },
    mini: { len: 32, layers: [], bites: 0, pts: 50, face: 'derp', ammo: null },
  };
  const TOPPING_COLORS = {
    ketchup: ['#ff2a1f', '#c40d07', '#ff7a6a'], mustard: ['#ffd51e', '#e0a800', '#fff3a0'],
    relish: ['#2fa02a', '#7ed957', '#156b12'], onion: ['#f5f0dc', '#e0d8b8'], cheese: ['#ffa51e', '#ffcf4a'],
    chili: ['#7a2410', '#a8442a', '#4a1406'], bacon: ['#b8322a', '#f6c0a8'], goo: ['#6dff3a', '#b6ff8a'],
    armor: ['#8a96a8', '#c8d0dc', '#5a6478'], bun: ['#f7c26b', '#d98b3a', '#fff0c0'], sausage: ['#d9472b', '#a3301c', '#ff8a6a'],
  };
  const PWR = {
    machine: { name: 'TOOTH MACHINE GUN', short: 'RAPID', dur: 8, color: '#ff3df2', w: 3, desc: 'Rapid-fire teeth.' },
    golden: { name: 'GOLDEN TOOTH', short: 'GOLD', dur: 8, color: '#ffd700', w: 2, desc: 'Each tooth strips 3 toppings.' },
    floss: { name: 'DENTAL FLOSS', short: 'FLOSS', dur: 7, color: '#4dffd2', w: 2, desc: 'Wide floss lines slice whole rows.' },
    braces: { name: 'BRACES', short: 'BRACES', dur: 8, color: '#c8d4e6', w: 2, desc: 'Shield blocks enemy attacks.' },
    wash: { name: 'MOUTHWASH', short: 'WASH', dur: 0, color: '#3dc8ff', w: 1.5, desc: 'Instantly rinses away all enemy shots.' },
    double: { name: 'DOUBLE DENTURES', short: 'DOUBLE', dur: 10, color: '#ff6b9a', w: 3, desc: 'Two streams of teeth.' },
    molar: { name: 'GIANT MOLAR', short: 'MOLAR', dur: 6, color: '#ffffff', w: 1.5, desc: 'Huge piercing molars plow through dogs.' },
    sugar: { name: 'SUGAR RUSH', short: 'SUGAR', dur: 6, color: '#ff9a1f', w: 2, desc: 'Faster movement and firing.' },
  };
  const PWR_KEYS = Object.keys(PWR);
  const BOSSES = [
    { key: 'chili', name: 'THE MEGA CHILI DOG', hp: 150, len: 250, layers: ['cheese', 'chili', 'onion', 'cheese', 'chili'], face: 'boss', attacks: ['spread', 'bombs', 'spread', 'minions'] },
    { key: 'king', name: 'THE CONDIMENT KING', hp: 190, len: 230, layers: ['relish', 'mustard', 'ketchup', 'relish', 'mustard', 'ketchup'], face: 'angry', crown: true, attacks: ['aimed', 'spiral', 'rain', 'aimed', 'ring'] },
    { key: 'brat', name: 'THE BRATWURST BEAST', hp: 170, armor: 90, len: 270, layers: ['armor', 'armor', 'armor'], face: 'boss', sausage: 'brat', attacks: ['charge', 'links', 'ring', 'charge', 'spread'] },
    { key: 'ultimate', name: 'THE ULTIMATE COMBO', hp: 300, len: 290, layers: ['bacon', 'bacon', 'bacon', 'cheese', 'chili', 'onion', 'relish', 'mustard', 'ketchup', 'goo'], face: 'boss', crown: true, attacks: ['aimed', 'spiral', 'bombs', 'charge', 'rain', 'minions', 'ring', 'links'] },
  ];
  const HIT_WORDS = ['NOM', 'CHOMP', 'MUNCH', 'CRUNCH', 'GNASH', 'SLURP', 'NIBBLE'];
  const EAT_WORDS = ['GOBBLED!', 'DEVOURED!', 'GLIZZY GONE!', 'BURP!', 'DELISH!', 'RELISH THAT!', 'SNARFED!', 'TOOTHED!'];

  /* ======================= state ======================= */
  let state = 'title'; // title | playing | paused | gameover
  let game = null;
  let titleT = 0;
  const stars = [];
  for (let i = 0; i < 170; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() < 0.15 ? 3 : Math.random() < 0.4 ? 2 : 1, tw: Math.random() * TAU });
  const shooting = [];
  const attract = [];

  function newGame() {
    return {
      score: 0, lives: 3, wave: 0, combo: 0, maxCombo: 0, nextLife: 15000,
      player: newPlayer(), enemies: [], teeth: [], floss: [], eb: [], parts: [], texts: [], pows: [], rings: [],
      boss: null, phase: 'intro', phaseT: 0, formT: 0, attackT: 3, breathing: false, breathK: 0,
      stats: null, shake: 0, flash: 0, flashColor: '#fff', t: 0, nextId: 1, banner: null, overT: 0, lastHitT: 0,
    };
  }
  function playerY() { return H - (isTouch ? 140 : 96); }
  function newPlayer() {
    return { x: W / 2, y: playerY(), vx: 0, targetX: null, cool: 0, flossCool: 0, molarCool: 0, mouthT: 0, dead: false, respawnT: 0, invuln: 2, pw: {}, tilt: 0, trail: [] };
  }

  /* ======================= resize ======================= */
  const hudBtns = document.getElementById('hud-buttons');
  function resize() {
    cw = window.innerWidth; ch = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    scale = Math.min(cw / W, ch / 720);
    H = Math.min(ch / scale, 1100);
    offX = (cw - W * scale) / 2; offY = (ch - H * scale) / 2;
    hudBtns.style.right = Math.max(8, offX + 8) + 'px';
    hudBtns.style.top = Math.max(8, offY + 8) + 'px';
    if (game) game.player.y = playerY();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  /* ======================= input ======================= */
  const keys = {};
  let drag = null;
  // An old cached page may still contain the retired FIRE button: remove it.
  const oldFire = document.getElementById('btn-fire');
  if (oldFire) oldFire.remove();
  const isKey = (...k) => k.some(x => keys[x]);
  window.addEventListener('keydown', e => {
    const k = e.key;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; // typing a name
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k) && state !== 'title') e.preventDefault();
    Sound.unlock();
    const first = !keys[k];
    keys[k] = true;
    if (!first) return;
    if (k === 'p' || k === 'P' || k === 'Escape') {
      if (state === 'playing') pause(); else if (state === 'paused' && currentScreen === 'pause') resume();
      else if (currentScreen && currentScreen !== 'title' && currentScreen !== 'pause' && currentScreen !== 'gameover') back();
    }
    if (k === 'm' || k === 'M') toggleMute();
    const onBtn = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if ((k === 'Enter' || k === ' ') && state === 'title' && currentScreen === 'title' && !onBtn) { e.preventDefault(); startGame(); }
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; if (e.key === ' ' && state === 'playing') e.preventDefault(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; drag = null; if (state === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });

  canvas.addEventListener('pointerdown', e => {
    Sound.unlock();
    if (state !== 'playing') return;
    drag = { id: e.pointerId, sx: e.clientX, px: game.player.x };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || !game) return;
    game.player.targetX = clamp(drag.px + (e.clientX - drag.sx) / scale * 1.35, PW * 0.4, W - PW * 0.4);
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; if (game) game.player.targetX = null; } };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);


  /* ======================= UI screens ======================= */
  let currentScreen = 'title';
  let screenStack = [];
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => { screens[s.id.replace('screen-', '')] = s; });
  function show(name, push) {
    if (push && currentScreen) screenStack.push(currentScreen); else if (!push) screenStack = [];
    Object.values(screens).forEach(s => s.classList.remove('active'));
    currentScreen = name;
    if (!name && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (name && screens[name]) {
      screens[name].classList.add('active');
      const b = screens[name].querySelector('button');
      if (b && !isTouch) b.focus({ preventScroll: true });
    }
    document.body.classList.toggle('in-game', state === 'playing' || state === 'paused');
    document.body.classList.toggle('show-fire', state === 'playing' && !name);
  }
  function back() { Sound.sfx('blip'); const prev = screenStack.pop() || 'title'; show(prev, false); if (prev === 'pause') screenStack = []; }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    Sound.unlock();
    const a = b.dataset.action;
    Sound.sfx('blip');
    switch (a) {
      case 'play': startGame(); break;
      case 'howto': show('howto', true); break;
      case 'scores': renderScores(Leaderboard.enabled() ? 'world' : 'mine'); show('scores', true); break;
      case 'settings': syncSettings(); show('settings', true); break;
      case 'back': back(); break;
      case 'resume': resume(); break;
      case 'restart': startGame(); break;
      case 'quit': toTitle(); break;
    }
  });
  document.getElementById('btn-pause').addEventListener('click', () => { Sound.unlock(); if (state === 'playing') pause(); else if (state === 'paused') resume(); });
  document.getElementById('btn-mute').addEventListener('click', () => { Sound.unlock(); toggleMute(); });

  const muteBtn = document.getElementById('btn-mute');
  function toggleMute() {
    const m = Sound.toggleMute();
    syncSettings();
    flashToast(m ? 'SOUND OFF' : 'SOUND ON');
  }
  function syncSettings() {
    const S = Sound.settings;
    document.getElementById('vol-master').value = Math.round(S.master * 100);
    document.getElementById('vol-music').value = Math.round(S.music * 100);
    document.getElementById('vol-sfx').value = Math.round(S.sfx * 100);
    document.getElementById('opt-mute').checked = S.muted;
    document.getElementById('opt-autofire').checked = prefs.autofire;
    muteBtn.classList.toggle('muted', S.muted);
    muteBtn.setAttribute('aria-label', S.muted ? 'Unmute' : 'Mute');
  }
  [['vol-master', 'master'], ['vol-music', 'music'], ['vol-sfx', 'sfx']].forEach(([id, k]) => {
    document.getElementById(id).addEventListener('input', e => { Sound.set(k, e.target.value / 100); if (k === 'sfx') Sound.sfx('shoot'); });
  });
  document.getElementById('opt-mute').addEventListener('change', e => { Sound.set('muted', e.target.checked); syncSettings(); });
  document.getElementById('opt-autofire').addEventListener('change', e => { prefs.autofire = e.target.checked; store.set('glizzy.prefs', prefs); });
  syncSettings();

  let toastT = 0;
  const toastEl = document.getElementById('toast');
  function flashToast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); toastT = 1.2; }

  // How-to power-up list
  (function buildHowTo() {
    const list = document.getElementById('pw-list');
    PWR_KEYS.forEach(k => {
      const p = PWR[k], li = document.createElement('li');
      const c = document.createElement('canvas'); c.width = 80; c.height = 80;
      c.getContext('2d').drawImage(Sprites.power(k, p.color).c, 0, 0, 80, 80);
      const d = document.createElement('div');
      d.innerHTML = `<b style="color:${p.color}">${p.name}</b><span>${p.desc}</span>`;
      li.appendChild(c); li.appendChild(d); list.appendChild(li);
    });
    const dl = document.getElementById('dog-list');
    [['ketchup', 'Ketchup Dog'], ['mustard', 'Mustard Dog'], ['relish', 'Relish Dog'], ['combo', 'The Works'], ['chili', 'Chili Cheese'], ['bacon', 'Bacon-Wrapped'], ['mutant', 'Mutant Dog'], ['giant', 'Giant Dog']].forEach(([t, n]) => {
      const d = DEFS[t], s = Sprites.dog(t + '|full', { len: 44, layers: d.layers, bites: 0, face: d.face });
      const li = document.createElement('li');
      const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height;
      c.getContext('2d').drawImage(s.c, 0, 0);
      const hp = d.layers.length + d.bites + 1;
      li.appendChild(c);
      const sp = document.createElement('span'); sp.innerHTML = `${n}<br><small>${hp} BITES · ${d.pts} PTS</small>`;
      li.appendChild(sp); dl.appendChild(li);
    });
  })();

  /* high scores */
  function getScores() { return store.get('glizzy.scores', []); }
  function bestScore() { const s = getScores(); return s.length ? s[0].score : 0; }
  function saveScore(score, wave) {
    const s = getScores();
    s.push({ score, wave, date: new Date().toISOString().slice(0, 10) });
    s.sort((a, b) => b.score - a.score);
    const top = s.slice(0, 8);
    store.set('glizzy.scores', top);
    return top.findIndex(x => x.score === score && x.wave === wave);
  }
  let scoreTab = Leaderboard.enabled() ? 'world' : 'mine';
  let lastSubmitted = null; // {name, score} highlighted in the world list
  function scoreRow(i, name, score, wave, me) {
    const li = document.createElement('li');
    if (me) li.className = 'me';
    const cells = [['rk', (i + 1) + '.'], ['nm', name], ['sc', String(score).padStart(7, '0')], ['wv', 'W' + wave]];
    for (const [cls, text] of cells) {
      if (text == null) continue;
      const sp = document.createElement('span'); sp.className = cls; sp.textContent = text; li.appendChild(sp);
    }
    return li;
  }
  function renderScores(tab) {
    if (tab) scoreTab = tab;
    const ol = document.getElementById('score-list'), note = document.getElementById('score-note');
    document.getElementById('score-tabs').style.display = Leaderboard.enabled() ? '' : 'none';
    document.querySelectorAll('#score-tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === scoreTab));
    ol.innerHTML = ''; note.textContent = '';
    if (scoreTab === 'mine' || !Leaderboard.enabled()) {
      const s = getScores();
      if (!s.length) { ol.innerHTML = '<li class="empty">NO SCORES YET.<br>GO EAT SOME GLIZZIES.</li>'; return; }
      s.forEach((r, i) => ol.appendChild(scoreRow(i, null, r.score, r.wave)));
      note.textContent = 'YOUR BEST SCORES ON THIS DEVICE';
      return;
    }
    ol.innerHTML = '<li class="empty">LOADING THE WORLD\'S<br>HUNGRIEST GOBBLERS...</li>';
    const req = ++renderScores.req;
    Leaderboard.top(10).then(rows => {
      if (req !== renderScores.req || scoreTab !== 'world') return;
      ol.innerHTML = '';
      if (!rows.length) { ol.innerHTML = '<li class="empty">NO WORLD SCORES YET.<br>BE THE FIRST!</li>'; return; }
      let marked = false;
      rows.forEach((r, i) => {
        const me = !marked && lastSubmitted && r.name === lastSubmitted.name && r.score === lastSubmitted.score;
        if (me) marked = true;
        ol.appendChild(scoreRow(i, r.name, r.score, r.wave, me));
      });
      note.textContent = 'TOP 10 GOBBLERS ON EARTH';
    }).catch(() => {
      if (req !== renderScores.req) return;
      ol.innerHTML = '<li class="empty">LEADERBOARD OFFLINE.<br>CHECK YOUR CONNECTION.</li>';
    });
  }
  renderScores.req = 0;
  document.querySelectorAll('#score-tabs .tab').forEach(b => b.addEventListener('click', () => { Sound.unlock(); Sound.sfx('blip'); renderScores(b.dataset.tab); }));

  function updateWorldBest() {
    const el = document.getElementById('title-world');
    if (!Leaderboard.enabled()) { el.textContent = ''; return; }
    Leaderboard.top(1).then(rows => {
      el.textContent = rows.length ? `WORLD #1: ${rows[0].name}  ${String(rows[0].score).padStart(7, '0')}` : 'WORLD LEADERBOARD: NO SCORES YET';
    }).catch(() => { el.textContent = ''; });
  }
  updateWorldBest();

  /* game-over name entry */
  const goForm = document.getElementById('go-submit'), goName = document.getElementById('go-name');
  const goMsg = document.getElementById('go-msg'), goSend = document.getElementById('go-send');
  let pendingScore = null;
  function setupSubmit(score, wave) {
    pendingScore = Leaderboard.enabled() && score > 0 ? { score, wave } : null;
    goForm.style.display = pendingScore ? '' : 'none';
    goName.disabled = false; goSend.disabled = false; goSend.style.display = '';
    goName.value = store.get('glizzy.name', '');
    goMsg.textContent = ''; goMsg.className = 'small';
    if (pendingScore) {
      goMsg.textContent = '...';
      Leaderboard.rank(score).then(r => {
        if (pendingScore && pendingScore.score === score && r) goMsg.textContent = r <= 10 ? `THAT'S #${r} IN THE WORLD! ENTER YOUR NAME.` : `THAT'S #${r} IN THE WORLD.`;
      }).catch(() => { if (goMsg.textContent === '...') goMsg.textContent = ''; });
    }
  }
  goName.addEventListener('input', () => {
    const c = goName.value.toUpperCase().replace(/[^A-Z0-9 _.!?-]/g, '').slice(0, Leaderboard.MAX_NAME);
    if (c !== goName.value) goName.value = c;
  });
  goForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!pendingScore) return;
    const name = Leaderboard.clean(goName.value);
    if (!name) { goMsg.textContent = 'TYPE A NAME FIRST (UP TO 10 CHARACTERS).'; goName.focus(); return; }
    const { score, wave } = pendingScore;
    goName.value = name; goName.disabled = true; goSend.disabled = true;
    goMsg.textContent = 'SENDING...'; goMsg.className = 'small';
    Leaderboard.submit(name, score, wave).then(() => {
      pendingScore = null;
      store.set('glizzy.name', name);
      lastSubmitted = { name, score };
      goSend.style.display = 'none';
      goMsg.className = 'small cyan';
      goMsg.textContent = 'SCORE SUBMITTED!';
      Sound.sfx('powerup');
      Leaderboard.rank(score).then(r => { if (r) goMsg.textContent = `SUBMITTED! YOU'RE #${r} IN THE WORLD.`; }).catch(() => {});
      updateWorldBest();
    }).catch(() => {
      goName.disabled = false; goSend.disabled = false;
      goMsg.className = 'small red';
      goMsg.textContent = "COULDN'T REACH THE LEADERBOARD. TRY AGAIN.";
    });
  });

  function updateTitleHi() { document.getElementById('title-hi').textContent = String(bestScore()).padStart(7, '0'); }
  updateTitleHi();

  /* ======================= flow ======================= */
  function startGame() {
    Sound.unlock();
    game = newGame();
    state = 'playing';
    show(null);
    Sound.sfx('start');
    startWave(1);
  }
  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    drag = null;
    Sound.stopMusic();
    show('pause');
    document.getElementById('pause-score').textContent = game.score;
    document.getElementById('pause-wave').textContent = game.wave;
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    show(null);
    Sound.playMusic(game.boss || (game.wave % 5 === 0 && game.phase !== 'clear') ? 'boss' : 'main');
  }
  function toTitle() {
    state = 'title'; game = null;
    updateTitleHi();
    updateWorldBest();
    show('title');
    Sound.playMusic('title');
  }
  function gameOver() {
    state = 'gameover';
    Sound.stopMusic();
    Sound.sfx('gameover');
    const prevBest = bestScore();
    const rank = saveScore(game.score, game.wave);
    document.getElementById('go-score').textContent = String(game.score).padStart(7, '0');
    document.getElementById('go-wave').textContent = game.wave;
    document.getElementById('go-combo').textContent = game.maxCombo;
    document.getElementById('go-best').textContent = String(Math.max(prevBest, game.score)).padStart(7, '0');
    document.getElementById('go-new').style.display = game.score > prevBest && game.score > 0 ? 'block' : 'none';
    document.getElementById('go-rank').textContent = rank >= 0 && rank < 8 ? `#${rank + 1} ON YOUR PERSONAL BEST LIST` : '';
    setupSubmit(game.score, game.wave);
    show('gameover');
  }

  function startWave(n) {
    game.wave = n;
    game.phase = 'intro';
    game.phaseT = n % 5 === 0 ? 3.4 : 2.0;
    game.enemies.length = 0;
    game.breathing = false; game.breathK = 0; game.formT = 0;
    game.stats = { shots: 0, hits: 0, eaten: 0, total: 0, hitTaken: false };
    if (n % 5 === 0) {
      const bi = (n / 5 - 1) % BOSSES.length;
      game.banner = { text: 'WARNING!', sub: BOSSES[bi].name, t: 3.4, boss: true };
      Sound.sfx('bosswarn');
      Sound.playMusic('boss');
    } else {
      game.banner = { text: 'WAVE ' + n, sub: pick(['GET GOBBLING!', 'OPEN WIDE!', 'CHOMP TIME!', 'HOLD THE MAYO!', 'TOOTH OR DARE!', 'BITE CLUB!']), t: 2.0 };
      Sound.playMusic('main');
    }
  }

  function spawnWave(n) {
    if (n % 5 === 0) { spawnBoss(n); return; }
    const list = buildFormation(n);
    // group into flights
    const groups = [];
    for (let i = 0; i < list.length; i += 8) groups.push(list.slice(i, i + 8));
    const templates = ['swoop', 'side', 'dive', 'swoop', 'side', 'dive'];
    let delay = 0.2;
    const sp = 330 + Math.min(n, 20) * 9;
    groups.forEach((g, gi) => {
      const tpl = templates[gi % templates.length], mirror = gi % 2 === 1;
      const path = entryPath(tpl, mirror);
      g.forEach((s, i) => {
        const e = makeEnemy(s.type);
        e.row = s.row; e.col = s.col; e.dx = s.dx || 0;
        e.state = 'wait'; e.delay = delay + i * 0.13;
        e.path = path; e.pi = 0; e.speed = sp; e.after = 'slot';
        game.enemies.push(e);
      });
      delay += g.length * 0.13 + Math.max(0.5, 1.3 - n * 0.05);
    });
    game.stats.total = list.length;
    game.attackT = delay + 1.5;
  }

  function buildFormation(n) {
    const out = [];
    const rowCols = r => {
      if (n === 1) return r >= 2 ? [1, 2, 3, 4, 5, 6] : [];
      if (n === 2) return r >= 1 ? [1, 2, 3, 4, 5, 6] : [3, 4];
      if (n === 3) return r >= 1 ? [0, 1, 2, 3, 4, 5, 6, 7] : [2, 3, 4, 5];
      return [0, 1, 2, 3, 4, 5, 6, 7];
    };
    const typeFor = (r, c) => {
      if (r === 0) return n >= 6 && (c === 0 || c === 7 || (n >= 9 && c % 3 === 0)) ? 'mutant' : 'combo';
      if (r === 1) {
        if (n >= 4) return c % 2 ? 'bacon' : 'chili';
        if (n >= 3) return 'chili';
        return 'relish';
      }
      if (r === 2) return n >= 2 ? (c % 2 ? 'relish' : 'combo') : 'relish';
      if (r === 3) return n >= 7 ? pick(['relish', 'chili', 'mustard']) : c % 2 ? 'mustard' : 'ketchup';
      return n >= 8 ? pick(['relish', 'mustard', 'ketchup']) : c % 2 ? 'ketchup' : 'mustard';
    };
    for (let r = 4; r >= 0; r--) {
      if (r === 0 && n >= 4) {
        // giants take two slots each
        out.push({ type: 'giant', row: 0, col: 1, dx: 29.5 });
        out.push({ type: 'giant', row: 0, col: 5, dx: 29.5 });
        [0, 3, 4, 7].forEach(c => { if (c === 3 || c === 4 ? n >= 5 : true) out.push({ type: typeFor(0, c), row: 0, col: c }); });
        continue;
      }
      rowCols(r).forEach(c => out.push({ type: typeFor(r, c), row: r, col: c }));
    }
    return out;
  }

  /* paths */
  function bez(p0, p1, p2, p3, n = 18) {
    const pts = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return pts;
  }
  function arcPts(cx, cy, r, a0, a1, n = 20) {
    const pts = [];
    for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return pts;
  }
  function entryPath(tpl, mirror) {
    let pts;
    if (tpl === 'swoop') {
      const r = W * 0.15, cx = W * 0.27, cy = H * 0.4;
      pts = [[W * 0.42, -40], ...bez([W * 0.42, -40], [W * 0.42, H * 0.16], [W * 0.04, H * 0.2], [cx - r, cy]), ...arcPts(cx, cy, r, Math.PI, Math.PI - 1.6 * Math.PI, 26)];
    } else if (tpl === 'side') {
      const r = H * 0.1, cx = W * 0.56, cy = H * 0.42;
      pts = [[-40, H * 0.62], ...bez([-40, H * 0.62], [W * 0.25, H * 0.66], [W * 0.45, H * 0.6], [cx, cy + r]), ...arcPts(cx, cy, r, Math.PI / 2, Math.PI / 2 - 1.5 * Math.PI, 24)];
    } else {
      pts = [[W * 0.58, -40], ...bez([W * 0.58, -40], [W * 0.58, H * 0.5], [W * 0.95, H * 0.58], [W * 0.82, H * 0.3])];
    }
    if (mirror) pts = pts.map(p => [W - p[0], p[1]]);
    return pts;
  }

  /* ======================= enemies ======================= */
  function makeEnemy(type) {
    const d = DEFS[type];
    return {
      id: game.nextId++, type, d, x: -999, y: -999, rot: 0, flip: false, layers: d.layers.slice(), bites: 0,
      state: 'wait', delay: 0, path: null, pi: 0, speed: 300, row: -1, col: -1, dx: 0, after: 'slot',
      flashT: 0, squashT: 0, shootT: rand(0.4, 1.2), shots: 0, dead: false, hw: d.len * 0.5, hh: d.len * 0.22,
      wob: Math.random() * TAU, lx: 0, ly: 0, t: 0,
    };
  }
  function slotPos(e) {
    const t = game.formT, bk = game.breathK;
    const br = 1 + 0.05 * Math.sin(t * 1.7) * bk;
    const sway = Math.sin(t * 0.8) * 18 * (1 - bk);
    return [W / 2 + ((e.col - 3.5) * 59 + e.dx) * br + sway, 118 + e.row * 50 * (1 + 0.04 * Math.sin(t * 1.7) * bk)];
  }
  function followPath(e, dt) {
    let move = e.speed * dt;
    while (move > 0 && e.pi < e.path.length) {
      const p = e.path[e.pi], dx = p[0] - e.x, dy = p[1] - e.y, d = Math.hypot(dx, dy);
      if (d <= move) { e.x = p[0]; e.y = p[1]; move -= d; e.pi++; } else { e.x += dx / d * move; e.y += dy / d * move; move = 0; }
    }
    return e.pi >= e.path.length;
  }
  function faceVel(e, vx, vy, dt) {
    const sp = Math.hypot(vx, vy);
    if (sp < 20) return;
    let a = Math.atan2(vy, vx);
    let flip = false;
    if (vx < 0) { flip = true; a = Math.atan2(-vy, -vx); }
    if (flip !== e.flip) { e.flip = flip; e.rot = a; return; }
    let d = a - e.rot; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    e.rot += d * Math.min(1, dt * 10);
  }

  function updateEnemies(dt) {
    const p = game.player, n = game.wave;
    let entering = 0;
    for (const e of game.enemies) {
      if (e.dead) continue;
      e.t += dt;
      e.lx = e.x; e.ly = e.y;
      e.flashT -= dt; e.squashT -= dt;
      switch (e.state) {
        case 'wait':
          entering++;
          e.delay -= dt;
          if (e.delay <= 0) { e.state = 'path'; e.x = e.path[0][0]; e.y = e.path[0][1]; e.pi = 1; }
          break;
        case 'path': {
          if (e.after === 'slot') entering++;
          const done = followPath(e, dt);
          if (done) {
            if (e.after === 'wrap') {
              if (e.row >= 0) { const s = slotPos(e); e.x = s[0]; e.y = -50; e.state = 'toSlot'; }
              else { e.x = rand(40, W - 40); e.y = -40; startHunt(e); }
            } else if (e.after === 'slot') e.state = 'toSlot';
            else if (e.after === 'hunt') startHunt(e);
          }
          break;
        }
        case 'toSlot': {
          entering++;
          const s = slotPos(e), dx = s[0] - e.x, dy = s[1] - e.y, d = Math.hypot(dx, dy), mv = e.speed * 1.1 * dt;
          if (d <= mv + 1) { e.x = s[0]; e.y = s[1]; e.state = 'form'; e.flip = false; } else { e.x += dx / d * mv; e.y += dy / d * mv; }
          break;
        }
        case 'form': {
          const s = slotPos(e);
          e.x = s[0]; e.y = s[1] + Math.sin(e.t * 3 + e.wob) * 2.5;
          e.rot = lerp(e.rot, Math.sin(e.t * 2.5 + e.wob) * 0.08, Math.min(1, dt * 6));
          e.flip = false;
          if (n >= 3 && Math.random() < dt * (0.004 + n * 0.0016) && p && !p.dead) enemyShoot(e);
          break;
        }
        case 'dive':
          if (followPath(e, dt)) {
            if (e.row >= 0) { const s = slotPos(e); e.x = s[0]; e.y = -50; e.state = 'toSlot'; }
            else { e.x = rand(40, W - 40); e.y = -40; startHunt(e); }
          }
          if (e.shots > 0 && e.y > 140 && e.y < H * 0.62) {
            e.shootT -= dt;
            if (e.shootT <= 0) { enemyShoot(e); e.shots--; e.shootT = rand(0.35, 0.8); }
          }
          break;
        case 'hunt': {
          const tx = p && !p.dead ? p.x : W / 2;
          e.vx = clamp((e.vx || 0) + Math.sign(tx - e.x) * 520 * dt, -240, 240);
          e.x += e.vx * dt; e.y += e.speed * dt;
          if (e.y > H + 40) { e.y = -40; e.x = rand(40, W - 40); }
          break;
        }
      }
      if (e.state !== 'form' && e.state !== 'wait') faceVel(e, (e.x - e.lx) / dt, (e.y - e.ly) / dt, dt);
      if (e.d.erratic && (e.state === 'dive' || e.state === 'form')) e.x += Math.sin(e.t * 9) * 40 * dt;
    }
    if (!game.breathing && entering === 0 && game.enemies.length && game.phase === 'fight') game.breathing = true;
    if (game.breathing) game.breathK = Math.min(1, game.breathK + dt * 0.6);

    // dive attacks
    if (game.phase === 'fight' && !game.boss && p && !p.dead) {
      game.attackT -= dt;
      if (game.attackT <= 0) {
        const divers = game.enemies.filter(e => e.state === 'dive' || e.state === 'hunt').length;
        const maxDivers = Math.min(2 + Math.floor(n / 2), 9);
        const formed = game.enemies.filter(e => e.state === 'form');
        if (formed.length && divers < maxDivers) {
          const leader = pick(formed);
          launchDive(leader, 0);
          if (n >= 3) {
            const esc = formed.filter(e => e !== leader && e.row === leader.row + 1 && Math.abs(e.col - leader.col) <= 1).slice(0, n >= 6 ? 2 : 1);
            esc.forEach((e, i) => launchDive(e, i + 1, leader));
          }
        }
        game.attackT = Math.max(0.45, 2.4 - n * 0.14) * rand(0.7, 1.2);
      }
    }
  }

  function startHunt(e) { e.state = 'hunt'; e.vx = 0; e.speed = 200 + game.wave * 8; }

  function launchDive(e, idx, leader) {
    const p = game.player, n = game.wave;
    const m = e.x < W / 2 ? -1 : 1, r = 38;
    const cx = e.x + m * r, cy = e.y;
    let pts = m < 0 ? arcPts(cx, cy, r, 0, -1.25 * Math.PI, 14) : arcPts(cx, cy, r, Math.PI, 2.25 * Math.PI, 14);
    const end = pts[pts.length - 1];
    const tx = clamp(p.x + rand(-50, 50) + (idx ? (idx % 2 ? -45 : 45) : 0), 20, W - 20);
    if (e.d.erratic) {
      let y = end[1], x = end[0];
      while (y < H + 60) { y += 85; x = clamp(lerp(x, p.x, 0.45) + rand(-110, 110), 20, W - 20); pts.push([x, y]); }
    } else if (e.type === 'giant') {
      pts = pts.concat(bez(end, [end[0], end[1] + 200], [W - tx, H * 0.55], [tx, H * 0.62]), bez([tx, H * 0.62], [tx, H * 0.8], [end[0], H * 0.9], [end[0], H + 60]));
    } else {
      pts = pts.concat(bez(end, [end[0], end[1] + 160], [tx + rand(-80, 80), H * 0.68], [tx, H + 60], 22));
    }
    e.path = [[e.x, e.y], ...pts]; e.pi = 1;
    e.state = 'dive';
    e.speed = (e.type === 'giant' ? 200 : 290) + Math.min(n, 25) * 10;
    e.shots = (e.d.ammo ? 1 : 0) + (n >= 4 ? 1 : 0) + (n >= 9 ? 1 : 0);
    e.shootT = rand(0.1, 0.5);
  }

  function enemyShoot(e) {
    const p = game.player;
    if (!e.d.ammo || p.dead) return;
    let kind = e.d.ammo;
    if (kind === 'mix') kind = pick(['ketchup', 'mustard', 'relish']);
    const sp = 210 + Math.min(game.wave, 20) * 9;
    const a = Math.atan2(p.y - 30 - e.y, p.x - e.x);
    const n = e.d.spread || 1;
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * 0.22;
      fireBullet(e.x, e.y + 10, kind, Math.cos(aa) * sp, Math.sin(aa) * sp);
    }
    Sound.sfx('eshoot');
  }
  function fireBullet(x, y, kind, vx, vy, extra) {
    if (game.eb.length > 260) return;
    const s = Sprites.bullet(kind);
    game.eb.push(Object.assign({ x, y, vx, vy, kind, r: s.r, t: 0 }, extra || {}));
  }

  /* hitting / eating */
  function inRect(e, px, py, r) {
    const dx = px - e.x, dy = py - e.y, c = Math.cos(-e.rot), s = Math.sin(-e.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) < e.hw + r && Math.abs(ly) < e.hh + r;
  }
  function mult() { return Math.min(8, 1 + Math.floor(game.combo / 8)); }
  function addScore(v) {
    game.score += v;
    if (game.score >= game.nextLife) {
      game.nextLife += game.nextLife < 40000 ? 25000 : 40000;
      if (game.lives < 7) {
        game.lives++;
        Sound.sfx('extralife');
        game.texts.push({ x: game.player.x, y: game.player.y - 90, text: '1UP!', color: '#3dff7a', life: 1.6, max: 1.6, size: 22 });
      }
    }
  }
  function damageEnemy(e, dmg, hx, hy) {
    if (e.dead || e.state === 'wait') return;
    game.stats.hits++;
    for (let i = 0; i < dmg; i++) {
      if (e.layers.length) {
        const l = e.layers.pop();
        toppingBurst(hx, hy, l, 14);
      } else if (e.bites < e.d.bites) {
        e.bites++;
        toppingBurst(hx, hy, 'bun', 10); toppingBurst(hx, hy, 'sausage', 6);
      } else { eatEnemy(e); return; }
    }
    e.flashT = 0.07; e.squashT = 0.18;
    chomp(hx, hy, 0.8);
    addScore(10 * mult());
    Sound.sfx('hit');
    Sound.sfx('splat');
    if (Math.random() < 0.22) textPop(hx, hy - 14, pick(HIT_WORDS) + '!', pick(['#ffd51e', '#ff4fa0', '#3df9ff']), 12);
  }
  function eatEnemy(e) {
    e.dead = true;
    game.stats.eaten++;
    const pts = e.d.pts * mult();
    addScore(pts);
    toppingBurst(e.x, e.y, 'bun', 22); toppingBurst(e.x, e.y, 'sausage', 14);
    for (let i = 0; i < 3; i++) toppingBurst(e.x, e.y, pick(['ketchup', 'mustard', 'relish']), 6);
    chomp(e.x, e.y, e.d.len / 40);
    ring(e.x, e.y, '#ffd51e', e.d.len * 0.9);
    textPop(e.x, e.y, '+' + pts, '#ffffff', e.type === 'giant' ? 16 : 12);
    if (Math.random() < 0.3 || e.type === 'giant') textPop(e.x, e.y - 20, pick(EAT_WORDS), pick(['#ff4fa0', '#3dff7a', '#ffd51e', '#3df9ff']), 13);
    Sound.sfx('eaten');
    shake(e.type === 'giant' ? 6 : 2);
    // split
    if (e.d.split) {
      for (let i = 0; i < e.d.split; i++) {
        const m = makeEnemy('mini');
        m.x = e.x + (i ? 14 : -14); m.y = e.y;
        m.state = 'hunt'; m.vx = (i ? 1 : -1) * 160; m.speed = 170 + game.wave * 8;
        game.enemies.push(m);
        game.stats.total++;
      }
      textPop(e.x, e.y + 22, 'SPLIT!', '#ff9a1f', 11);
    }
    // power-up drop
    const ch = e.d.drop || 0.09;
    if (Math.random() < ch && game.pows.length < 3) dropPower(e.x, e.y);
  }
  function dropPower(x, y, type) {
    if (!type) {
      let tot = 0; PWR_KEYS.forEach(k => tot += PWR[k].w);
      let r = Math.random() * tot;
      type = PWR_KEYS.find(k => (r -= PWR[k].w) < 0) || 'double';
    }
    game.pows.push({ x, y, type, t: 0, vy: 95 });
  }

  /* ======================= boss ======================= */
  function spawnBoss(n) {
    const cycle = Math.floor((n / 5 - 1) / BOSSES.length);
    const bi = (n / 5 - 1) % BOSSES.length, B = BOSSES[bi], mul = 1 + cycle * 0.6;
    game.boss = {
      B, x: W / 2, y: -160, rot: 0, hp: Math.round(B.hp * mul), maxHp: Math.round(B.hp * mul),
      armor: B.armor ? Math.round(B.armor * mul) : 0, maxArmor: B.armor ? Math.round(B.armor * mul) : 0,
      state: 'enter', t: 0, atkT: 2.2, atkI: 0, seq: null, flashT: 0, hw: B.len * 0.5, hh: B.len * 0.22,
      lastLayers: B.layers.length, charge: null, dieT: 0, cycle, bob: 0, homeY: 200,
    };
    game.stats.total = 1;
  }
  function bossLayers(b) {
    const B = b.B;
    if (B.key === 'brat') return B.layers.slice(0, Math.ceil(B.layers.length * Math.max(0, b.armor) / b.maxArmor));
    return B.layers.slice(0, Math.ceil(B.layers.length * Math.max(0, b.hp) / b.maxHp));
  }
  function bossBites(b) { return b.hp / b.maxHp < 0.3 ? (b.hp / b.maxHp < 0.12 ? 2 : 1) : 0; }

  function updateBoss(dt) {
    const b = game.boss, p = game.player;
    if (!b) return;
    b.t += dt; b.flashT -= dt;
    const rage = b.hp / b.maxHp < 0.4 ? 1 : 0;
    const spd = 1 + rage * 0.2 + b.cycle * 0.15;
    if (b.state === 'enter') {
      b.y = lerp(b.y, b.homeY, Math.min(1, dt * 1.6));
      if (Math.abs(b.y - b.homeY) < 3) { b.state = 'fight'; b.t = 0; }
      return;
    }
    if (b.state === 'dying') {
      b.dieT += dt;
      b.x += rand(-3, 3); b.y += rand(-2, 2); b.rot = Math.sin(b.dieT * 30) * 0.05;
      if (Math.random() < dt * 14) {
        const ex = b.x + rand(-b.hw, b.hw), ey = b.y + rand(-b.hh * 1.5, b.hh * 1.5);
        explosion(ex, ey, 1); toppingBurst(ex, ey, pick(b.B.layers.concat(['bun', 'sausage'])), 10);
        Sound.sfx('explode'); shake(5);
      }
      if (b.dieT > 2.6) finishBoss();
      return;
    }
    // movement
    const k = b.B.key;
    if (b.charge) {
      const c = b.charge;
      c.t += dt;
      if (c.stage === 0) { b.x += rand(-4, 4); if (c.t > 0.75) { c.stage = 1; c.t = 0; Sound.sfx('splat'); } }
      else if (c.stage === 1) { b.y += 950 * dt; b.rot = lerp(b.rot, Math.PI / 2 * 0.9, dt * 8); if (b.y > H - 160) { c.stage = 2; shake(10); explosion(b.x, b.y + 40, 1); for (let i = 0; i < 10; i++) { const a = -Math.PI * (i / 9); fireBullet(b.x, b.y, 'mustard', Math.cos(a) * 200, Math.sin(a) * 200); } } }
      else { b.y -= 380 * dt; b.rot = lerp(b.rot, 0, dt * 4); if (b.y <= b.homeY) { b.y = b.homeY; b.charge = null; b.rot = 0; } }
    } else {
      const tt = b.t * spd;
      if (k === 'chili') { b.x = W / 2 + Math.sin(tt * 0.6) * W * 0.27; b.y = b.homeY + Math.sin(tt * 1.3) * 22; }
      else if (k === 'king') { b.x = W / 2 + Math.sin(tt * 0.75) * W * 0.28; b.y = b.homeY + 20 + Math.sin(tt * 1.5) * 60; }
      else if (k === 'brat') { b.x += clamp((p.x - b.x) * 0.9, -150, 150) * dt; b.y = b.homeY + Math.sin(tt * 1.1) * 14; }
      else { b.x = W / 2 + Math.sin(tt * 0.7) * W * 0.25 + Math.sin(tt * 2.1) * 30; b.y = b.homeY + 10 + Math.sin(tt * 1.4) * 45; }
      b.rot = Math.sin(b.t * 1.7) * 0.06;
    }
    // attacks
    if (b.seq) runSeq(b, dt);
    else if (!b.charge) {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        let atks = b.B.attacks;
        if (k === 'ultimate') {
          const f = b.hp / b.maxHp;
          atks = f > 0.66 ? ['aimed', 'spiral', 'rain', 'ring'] : f > 0.33 ? ['spread', 'bombs', 'minions', 'aimed', 'links'] : atks;
        }
        const a = atks[b.atkI++ % atks.length];
        startAttack(b, a);
        b.atkT = (1.6 - rage * 0.45 - Math.min(0.4, b.cycle * 0.15)) * rand(0.85, 1.15);
      }
    }
    // collisions with player
    if (!p.dead && p.invuln <= 0 && inRect(b, p.x, p.y - PH * 0.15, 14)) hitPlayer();
  }
  function startAttack(b, a) {
    const p = game.player, sp = 1 + (b.hp / b.maxHp < 0.4 ? 0.15 : 0) + b.cycle * 0.1;
    const aim = () => Math.atan2(p.y - 30 - b.y, p.x - b.x);
    switch (a) {
      case 'spread': {
        const n = 7, base = aim(), kind = b.B.key === 'brat' ? 'sausage' : 'chili';
        for (let i = 0; i < n; i++) { const an = base + (i - 3) * 0.16; fireBullet(b.x, b.y + 30, kind, Math.cos(an) * 230 * sp, Math.sin(an) * 230 * sp); }
        Sound.sfx('splat'); break;
      }
      case 'bombs':
        for (let i = 0; i < 3; i++) fireBullet(b.x + (i - 1) * 70, b.y + 30, 'bomb', (i - 1) * 40, 130 * sp, { fuse: 1.3 + i * 0.25 });
        Sound.sfx('eshoot'); break;
      case 'minions':
        for (let i = 0; i < 3; i++) {
          const m = makeEnemy('mini'); m.x = b.x + (i - 1) * 50; m.y = b.y + 20; startHunt(m); m.speed = 160 + game.wave * 5;
          m.vx = (i - 1) * 150; game.enemies.push(m);
        }
        textPop(b.x, b.y + 60, 'MINI DOGS!', '#ff9a1f', 12); break;
      case 'aimed': b.seq = { a, t: 0, n: 0, every: 0.16, count: 3 * (1 + (b.hp / b.maxHp < 0.4 ? 1 : 0)) }; break;
      case 'spiral': b.seq = { a, t: 0, n: 0, every: 0.055, count: 40, ang: 0 }; break;
      case 'rain': b.seq = { a, t: 0, n: 0, every: 0.08, count: 22 }; break;
      case 'links': b.seq = { a, t: 0, n: 0, every: 0.09, count: 8, x0: p.x }; break;
      case 'ring': {
        const n = 16;
        for (let i = 0; i < n; i++) { const an = i / n * TAU + b.t; fireBullet(b.x, b.y, 'mustard', Math.cos(an) * 180 * sp, Math.sin(an) * 180 * sp); }
        Sound.sfx('splat'); break;
      }
      case 'charge':
        b.charge = { stage: 0, t: 0, x: b.x };
        textPop(b.x, b.y + 80, 'INCOMING!', '#ff2a1f', 14); Sound.sfx('bosswarn'); break;
    }
  }
  function runSeq(b, dt) {
    const s = b.seq, p = game.player, sp = 1 + (b.hp / b.maxHp < 0.4 ? 0.15 : 0) + b.cycle * 0.1;
    s.t += dt;
    while (s.t >= s.every && s.n < s.count) {
      s.t -= s.every; s.n++;
      if (s.a === 'aimed') {
        const a = Math.atan2(p.y - 30 - b.y, p.x - b.x);
        for (let i = -1; i <= 1; i++) fireBullet(b.x - 40, b.y + 30, 'ketchup', Math.cos(a + i * 0.12) * 270 * sp, Math.sin(a + i * 0.12) * 270 * sp);
        Sound.sfx('eshoot');
      } else if (s.a === 'spiral') {
        s.ang += 0.37;
        for (const o of [0, Math.PI]) fireBullet(b.x, b.y, 'mustard', Math.cos(s.ang + o) * 180 * sp, Math.abs(Math.sin(s.ang + o)) * 180 * sp + 40);
        if (s.n % 3 === 0) Sound.sfx('eshoot');
      } else if (s.a === 'rain') {
        fireBullet(rand(10, W - 10), -10, 'relish', rand(-20, 20), 250 * sp);
      } else if (s.a === 'links') {
        const ph = s.n * 0.6;
        fireBullet(b.x, b.y + 40, 'sausage', 0, 230 * sp, { wave: { x0: b.x, amp: 70, f: 3, ph } });
        if (s.n % 2) Sound.sfx('eshoot');
      }
    }
    if (s.n >= s.count) b.seq = null;
  }
  function damageBoss(b, dmg, hx, hy) {
    if (b.state !== 'fight') return;
    game.stats.hits++;
    b.flashT = 0.06;
    addScore(10 * mult());
    if (b.armor > 0) {
      const before = bossLayers(b).length;
      b.armor -= dmg;
      sparks(hx, hy, '#c8d4e6', 6);
      Sound.sfx('clang');
      if (bossLayers(b).length < before) { toppingBurst(hx, hy, 'armor', 30); shake(8); Sound.sfx('explode'); textPop(hx, hy, 'ARMOR CRACKED!', '#c8d4e6', 13); }
      if (Math.random() < 0.1) textPop(hx, hy, 'CLANG!', '#c8d4e6', 11);
      return;
    }
    const before = bossLayers(b);
    b.hp -= dmg;
    const after = bossLayers(b);
    const top = before[before.length - 1] || 'sausage';
    toppingBurst(hx, hy, top, 6);
    chomp(hx, hy, 0.9);
    Sound.sfx('hit');
    if (after.length < before.length) {
      toppingBurst(b.x, b.y - 20, top, 40); shake(7); Sound.sfx('splat'); Sound.sfx('eaten');
      textPop(b.x, b.y - 60, pick(['TOPPING DOWN!', 'STRIPPED!', 'LAYER EATEN!']), '#ffd51e', 14);
    }
    if (b.hp <= 0) {
      b.state = 'dying'; b.dieT = 0; b.seq = null; b.charge = null;
      game.eb.length = 0;
      Sound.stopMusic();
      Sound.sfx('bigboom');
      textPop(b.x, b.y, 'OM NOM NOM!', '#ff4fa0', 20);
    }
  }
  function finishBoss() {
    const b = game.boss;
    for (const l of b.B.layers.concat(['bun', 'bun', 'sausage', 'sausage', 'ketchup', 'mustard', 'relish'])) toppingBurst(b.x, b.y, l, 22);
    for (let i = 0; i < 16; i++) {
      const a = rand(0, TAU), s = rand(150, 520);
      part(b.x, b.y, Math.cos(a) * s, Math.sin(a) * s - 200, rand(1.5, 2.6), '#d9472b', 1, 500, 'sausage', rand(-8, 8));
    }
    explosion(b.x, b.y, 3);
    ring(b.x, b.y, '#ff4fa0', 300); ring(b.x, b.y, '#ffd51e', 200);
    game.flash = 0.6; game.flashColor = '#fff';
    shake(18);
    Sound.sfx('bigboom'); Sound.sfx('victory');
    const bonus = 5000 * (b.cycle + 1) * (game.wave / 5 | 0);
    addScore(bonus);
    textPop(b.x, b.y + 40, 'BOSS GOBBLED! +' + bonus, '#3dff7a', 16);
    dropPower(b.x - 40, b.y); dropPower(b.x + 40, b.y);
    for (const e of game.enemies) if (!e.dead) { eatEnemy(e); }
    game.stats.eaten++;
    game.boss = null;
  }

  /* ======================= player ======================= */
  function mouthPos(p) {
    const bob = Math.sin(game.t * 3.2) * 4;
    return { x: p.x - PW / 2 + MOUTH.x * PW, y: p.y - PH / 2 + MOUTH.y * PH + bob };
  }
  function updatePlayer(dt) {
    const p = game.player;
    for (const k in p.pw) { p.pw[k] -= dt; if (p.pw[k] <= 0) delete p.pw[k]; }
    if (p.dead) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        if (game.lives <= 0) { if (state === 'playing') gameOver(); return; }
        p.dead = false; p.invuln = 2.5; p.x = W / 2; p.vx = 0; p.targetX = null;
      }
      return;
    }
    p.invuln -= dt; p.cool -= dt; p.flossCool -= dt; p.molarCool -= dt; p.mouthT -= dt;
    const sugar = p.pw.sugar > 0, maxSp = sugar ? 600 : 380;
    const dir = (isKey('ArrowLeft', 'a', 'A') ? -1 : 0) + (isKey('ArrowRight', 'd', 'D') ? 1 : 0);
    if (dir) { p.targetX = null; p.vx += (dir * maxSp - p.vx) * Math.min(1, dt * 14); }
    else if (p.targetX != null) { p.vx = clamp((p.targetX - p.x) * 16, -maxSp * 1.8, maxSp * 1.8); }
    else p.vx *= Math.pow(0.0004, dt);
    p.x = clamp(p.x + p.vx * dt, PW * 0.4, W - PW * 0.4);
    p.tilt = lerp(p.tilt, clamp(p.vx / maxSp, -1, 1) * 0.16, Math.min(1, dt * 10));
    if (sugar) { p.trail.unshift({ x: p.x, y: p.y, t: game.t }); if (p.trail.length > 6) p.trail.pop(); } else p.trail.length = 0;
    // Holding a finger (or mouse) on the screen moves AND fires: no separate fire button needed.
    const firing = isKey(' ') || !!drag || (prefs.autofire && isKey('ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'));
    if (firing && (game.phase === 'fight' || game.phase === 'intro')) tryFire(p);
  }
  function tryFire(p) {
    const pw = p.pw;
    let cd = pw.machine > 0 ? 0.075 : 0.22;
    if (pw.sugar > 0) cd *= 0.55;
    const m = mouthPos(p);
    if (p.cool <= 0) {
      p.cool = cd;
      const gold = pw.golden > 0, kind = gold ? 'gold' : 'tooth', dmg = gold ? 3 : 1;
      const mk = (dx, vx) => ({ x: m.x + dx, y: m.y, vx: vx + p.vx * 0.08, vy: -780, kind, dmg, r: 7, spin: rand(-3, 3), rot: 0 });
      if (pw.double > 0) { game.teeth.push(mk(-8, -45), mk(8, 45)); game.stats.shots += 2; }
      else { game.teeth.push(mk(0, rand(-12, 12))); game.stats.shots++; }
      p.mouthT = 0.09;
      Sound.sfx(gold ? 'gold' : 'shoot');
      for (let i = 0; i < 3; i++) part(m.x, m.y, rand(-60, 60), rand(-120, -40), 0.25, '#bff6ff', 2, 0);
    }
    if (pw.floss > 0 && p.flossCool <= 0) {
      p.flossCool = 0.5;
      game.floss.push({ x: m.x, y: m.y, w: 40, vy: -520, hit: new Set(), t: 0 });
      Sound.sfx('floss');
    }
    if (pw.molar > 0 && p.molarCool <= 0) {
      p.molarCool = 0.6;
      game.teeth.push({ x: m.x, y: m.y - 10, vx: 0, vy: -560, kind: 'molar', dmg: 4, r: 18, spin: rand(-4, 4), rot: 0, pierce: true, hit: new Set() });
      Sound.sfx('molar');
    }
  }
  // Hitbox is a bit smaller than the sprite so near-misses feel fair.
  function playerRect(p) { return { x: p.x - PW * 0.27, y: p.y - PH * 0.4, w: PW * 0.54, h: PH * 0.72 }; }
  function hitPlayer() {
    const p = game.player;
    if (p.dead || p.invuln > 0) return;
    if (p.pw.braces > 0) return;
    p.dead = true; p.respawnT = 2.2;
    game.lives--;
    game.combo = 0;
    game.stats.hitTaken = true;
    p.pw = {};
    Sound.sfx('playerHit');
    shake(14);
    game.flash = 0.35; game.flashColor = '#ff2a1f';
    explosion(p.x, p.y - 20, 2);
    for (let i = 0; i < 18; i++) {
      const a = rand(-Math.PI, 0), s = rand(120, 420);
      part(p.x, p.y - 30, Math.cos(a) * s, Math.sin(a) * s, rand(1, 2), '#fff', 1, 700, 'tooth', rand(-10, 10));
    }
    textPop(p.x, p.y - 80, pick(['OUCH!', 'MY TEETH!', 'GLIZZY\'D!', 'BRAIN FREEZE!']), '#ff2a1f', 16);
    // Defer clearing enemy shots: hitPlayer can run while the bullet loop is iterating them.
    if (game.lives <= 0) { game.clearShots = true; Sound.stopMusic(); }
  }
  function collectPower(pw) {
    const p = game.player, P = PWR[pw.type];
    Sound.sfx('powerup');
    textPop(p.x, p.y - 100, P.name + '!', P.color, 13);
    ring(pw.x, pw.y, P.color, 70);
    addScore(250);
    if (pw.type === 'wash') {
      for (const b of game.eb) sparks(b.x, b.y, '#3dc8ff', 3);
      addScore(game.eb.length * 5);
      game.eb.length = 0;
      game.rings.push({ x: p.x, y: p.y, r: 0, max: Math.hypot(W, H), color: '#3dc8ff', life: 0.9, wash: true });
      game.flash = 0.25; game.flashColor = '#3dc8ff';
      Sound.sfx('wash');
    } else {
      p.pw[pw.type] = P.dur;
      if (pw.type === 'braces') Sound.sfx('clink');
    }
  }

  /* ======================= effects ======================= */
  function part(x, y, vx, vy, life, color, size, g, kind, spin) {
    if (game.parts.length > 900) return;
    game.parts.push({ x, y, vx, vy, life, max: life, color, size, g: g == null ? 600 : g, kind: kind || 0, rot: rand(0, TAU), spin: spin || 0 });
  }
  function toppingBurst(x, y, type, n) {
    const cols = TOPPING_COLORS[type] || TOPPING_COLORS.ketchup;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(60, 330);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s - 120, rand(0.4, 1.0), pick(cols), rand(2, 5), 700, Math.random() < 0.35 ? 'blob' : 0);
    }
  }
  function sparks(x, y, color, n) {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(80, 260); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.15, 0.4), color, 2, 0); }
  }
  function explosion(x, y, big) {
    const n = 18 * big;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, 260) * (0.6 + big * 0.4);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.8), pick(['#fff', '#ffd51e', '#ff9a1f', '#ff2a1f']), rand(2, 5), 100, 'blob');
    }
    ring(x, y, '#ffd51e', 40 * big);
  }
  function ring(x, y, color, max) { game.rings.push({ x, y, r: 4, max, color, life: 0.4 }); }
  function chomp(x, y, s) { game.parts.push({ x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#fff', size: s, g: 0, kind: 'chomp', rot: 0, spin: 0 }); }
  function textPop(x, y, text, color, size) { game.texts.push({ x: clamp(x, 60, W - 60), y, text, color, life: 1.0, max: 1.0, size }); }
  function shake(m) { game.shake = Math.max(game.shake, m); }

  /* ======================= update ======================= */
  function update(dt) {
    const g = game;
    g.t += dt; g.formT += dt;
    g.shake = Math.max(0, g.shake - dt * 40);
    g.flash = Math.max(0, g.flash - dt);
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }

    // phases
    g.phaseT -= dt;
    if (g.phase === 'intro' && g.phaseT <= 0) { g.phase = 'fight'; spawnWave(g.wave); }
    else if (g.phase === 'fight' && !g.boss && g.enemies.length === 0 && !g.player.dead) {
      g.phase = 'clear'; g.phaseT = 3.4;
      const acc = g.stats.shots ? Math.min(1, g.stats.hits / g.stats.shots) : 0;
      const accBonus = Math.round(acc * 100) * 10 * g.wave;
      const perfect = !g.stats.hitTaken ? 1000 * g.wave : 0;
      g.clearInfo = { acc, accBonus, perfect, eaten: g.stats.eaten, total: g.stats.total };
      addScore(accBonus + perfect);
      Sound.sfx('waveclear');
      g.eb.length = 0;
    } else if (g.phase === 'clear' && g.phaseT <= 0) { g.clearInfo = null; startWave(g.wave + 1); }

    updatePlayer(dt);
    if (state !== 'playing') return;
    updateEnemies(dt);
    updateBoss(dt);
    const p = g.player;

    // teeth
    for (let i = g.teeth.length - 1; i >= 0; i--) {
      const t = g.teeth[i];
      t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.spin * dt;
      let gone = false;
      if (t.y < -30) {
        if (!t.pierce) { if (g.combo >= 8) textPop(p.x, p.y - 110, 'COMBO LOST', '#888', 10); g.combo = 0; }
        gone = true;
      } else {
        for (const e of g.enemies) {
          if (e.dead || e.state === 'wait') continue;
          if (t.pierce && t.hit.has(e.id)) continue;
          if (Math.abs(e.x - t.x) > e.hw + t.r + 4 || Math.abs(e.y - t.y) > e.hw + t.r) continue;
          if (inRect(e, t.x, t.y, t.r)) {
            damageEnemy(e, t.dmg, t.x, t.y);
            g.combo++; g.maxCombo = Math.max(g.maxCombo, g.combo);
            if (t.pierce) t.hit.add(e.id); else { gone = true; break; }
          }
        }
        const b = g.boss;
        if (!gone && b && b.state === 'fight' && !(t.pierce && t.hit.has('boss')) && inRect(b, t.x, t.y, t.r)) {
          damageBoss(b, t.dmg, t.x, t.y);
          g.combo++; g.maxCombo = Math.max(g.maxCombo, g.combo);
          if (t.pierce) t.hit.add('boss'); else gone = true;
        }
      }
      if (gone) { g.teeth[i] = g.teeth[g.teeth.length - 1]; g.teeth.pop(); }
    }
    // floss
    for (let i = g.floss.length - 1; i >= 0; i--) {
      const f = g.floss[i];
      f.t += dt; f.y += f.vy * dt; f.w = Math.min(240, f.w + 900 * dt);
      for (const e of g.enemies) {
        if (e.dead || e.state === 'wait' || f.hit.has(e.id)) continue;
        if (Math.abs(e.y - f.y) < e.hh + 6 && Math.abs(e.x - f.x) < f.w / 2 + e.hw) { f.hit.add(e.id); damageEnemy(e, 1, e.x, f.y); }
      }
      const b = g.boss;
      if (b && b.state === 'fight' && !f.hit.has('boss') && Math.abs(b.y - f.y) < b.hh && Math.abs(b.x - f.x) < f.w / 2 + b.hw) { f.hit.add('boss'); damageBoss(b, 2, clamp(b.x, f.x - f.w / 2, f.x + f.w / 2), f.y); }
      if (f.y < -20) { g.floss[i] = g.floss[g.floss.length - 1]; g.floss.pop(); }
    }
    // remove dead enemies
    for (let i = g.enemies.length - 1; i >= 0; i--) if (g.enemies[i].dead) { g.enemies[i] = g.enemies[g.enemies.length - 1]; g.enemies.pop(); }

    // enemy bullets
    const pr = playerRect(p);
    const shield = p.pw.braces > 0;
    for (let i = g.eb.length - 1; i >= 0; i--) {
      const b = g.eb[i];
      b.t += dt;
      if (b.wave) { b.y += b.vy * dt; b.x = b.wave.x0 + Math.sin(b.t * b.wave.f + b.wave.ph) * b.wave.amp; }
      else { b.x += b.vx * dt; b.y += b.vy * dt; }
      let gone = b.y > H + 30 || b.y < -60 || b.x < -30 || b.x > W + 30;
      if (b.fuse != null) {
        b.fuse -= dt;
        if (b.fuse <= 0 || b.y > H * 0.7) {
          for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; fireBullet(b.x, b.y, 'cheese', Math.cos(a) * 190, Math.sin(a) * 190); }
          toppingBurst(b.x, b.y, 'cheese', 16); Sound.sfx('splat'); gone = true;
        }
      }
      if (!gone && !p.dead) {
        if (shield && Math.hypot(b.x - p.x, b.y - (p.y - 10)) < 62 * PK) {
          sparks(b.x, b.y, '#c8d4e6', 6); Sound.sfx('clink'); gone = true;
        } else if (p.invuln <= 0 && b.x + b.r > pr.x && b.x - b.r < pr.x + pr.w && b.y + b.r > pr.y && b.y - b.r < pr.y + pr.h) {
          toppingBurst(b.x, b.y, b.kind in TOPPING_COLORS ? b.kind : 'ketchup', 12);
          hitPlayer(); gone = true;
        }
      }
      if (gone) { g.eb[i] = g.eb[g.eb.length - 1]; g.eb.pop(); }
    }
    // enemy body collisions with player
    if (!p.dead) {
      for (const e of g.enemies) {
        if (e.state === 'wait' || e.dead) continue;
        if (Math.abs(e.x - p.x) < e.hw + 20 && e.y + e.hh > pr.y && e.y - e.hh < pr.y + pr.h) {
          if (shield) { damageEnemy(e, 99, e.x, e.y); Sound.sfx('clink'); }
          else if (p.invuln <= 0) { eatEnemy(e); hitPlayer(); break; }
        }
      }
    }
    // power-ups
    for (let i = g.pows.length - 1; i >= 0; i--) {
      const w = g.pows[i];
      w.t += dt; w.y += w.vy * dt; w.x += Math.sin(w.t * 3) * 30 * dt;
      let gone = w.y > H + 30;
      if (!gone && !p.dead && Math.abs(w.x - p.x) < 36 && w.y > pr.y - 16 && w.y < pr.y + pr.h + 16) { collectPower(w); gone = true; }
      if (gone) g.pows.splice(i, 1);
    }
    // particles
    for (let i = g.parts.length - 1; i >= 0; i--) {
      const q = g.parts[i];
      q.life -= dt;
      if (q.life <= 0) { g.parts[i] = g.parts[g.parts.length - 1]; g.parts.pop(); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.spin * dt;
      q.vx *= 1 - dt * 0.8;
    }
    for (let i = g.rings.length - 1; i >= 0; i--) {
      const r = g.rings[i];
      r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * (r.wash ? 3 : 10));
      if (r.wash) for (const b of g.eb) if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) b.y = -999;
      if (r.life <= 0) g.rings.splice(i, 1);
    }
    for (let i = g.texts.length - 1; i >= 0; i--) {
      const t = g.texts[i]; t.life -= dt; t.y -= 40 * dt;
      if (t.life <= 0) g.texts.splice(i, 1);
    }
    if (g.clearShots) { g.eb.length = 0; g.clearShots = false; }
  }

  function updateStars(dt, speed) {
    for (const s of stars) { s.y += dt * speed * s.z * 0.02; if (s.y > 1) { s.y -= 1; s.x = Math.random(); } }
    if (Math.random() < dt * 0.25) shooting.push({ x: rand(0, 1), y: rand(0, 0.4), vx: rand(-0.6, 0.6) || 0.3, vy: rand(0.25, 0.45), life: 0.8 });
    for (let i = shooting.length - 1; i >= 0; i--) { const s = shooting[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) shooting.splice(i, 1); }
  }

  /* ======================= render ======================= */
  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#05010f'); g.addColorStop(0.55, '#0d0426'); g.addColorStop(1, '#1a0636');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    // nebula glow
    const t = performance.now() / 1000;
    const ng = ctx.createRadialGradient(cw * 0.3, ch * 0.35, 0, cw * 0.3, ch * 0.35, Math.max(cw, ch) * 0.55);
    ng.addColorStop(0, `rgba(120,30,160,${0.18 + Math.sin(t * 0.3) * 0.04})`); ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, cw, ch);
    const ng2 = ctx.createRadialGradient(cw * 0.8, ch * 0.75, 0, cw * 0.8, ch * 0.75, Math.max(cw, ch) * 0.45);
    ng2.addColorStop(0, 'rgba(20,90,170,0.16)'); ng2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng2; ctx.fillRect(0, 0, cw, ch);
    for (const s of stars) {
      const a = 0.45 + 0.55 * Math.abs(Math.sin(t * (1 + s.z) + s.tw));
      ctx.globalAlpha = a * (s.z === 3 ? 1 : s.z === 2 ? 0.75 : 0.5);
      ctx.fillStyle = s.z === 3 ? (s.tw > 5 ? '#ffd0f0' : '#d8f4ff') : '#ffffff';
      const sz = s.z === 3 ? 2.2 : s.z === 2 ? 1.5 : 1;
      ctx.fillRect(Math.round(s.x * cw), Math.round(s.y * ch), sz, sz);
    }
    ctx.globalAlpha = 1;
    for (const s of shooting) {
      ctx.strokeStyle = `rgba(255,255,255,${s.life})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x * cw, s.y * ch); ctx.lineTo((s.x - s.vx * 0.25) * cw, (s.y - s.vy * 0.25) * ch); ctx.stroke();
    }
  }
  function worldTransform(sx, sy) {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + (sx || 0) * scale), dpr * (offY + (sy || 0) * scale));
  }

  function drawDog(e) {
    const key = e.type + '|' + e.layers.length + '|' + e.bites;
    const s = Sprites.dog(key, { len: e.d.len, layers: e.layers, bites: e.bites, face: e.d.face });
    ctx.save();
    ctx.translate(e.x, e.y); ctx.rotate(e.rot);
    let sx = 1, sy = 1;
    if (e.squashT > 0) { const k = e.squashT / 0.18; sx = 1 + 0.22 * k * Math.sin(k * 9); sy = 1 - 0.18 * k; }
    if (e.flip) sx = -sx;
    ctx.scale(sx, sy);
    ctx.drawImage(e.flashT > 0 ? s.flash : s.c, -s.w / 2, -s.h * 0.52, s.w, s.h);
    ctx.restore();
  }
  function drawBoss(b) {
    const B = b.B, layers = bossLayers(b), bites = bossBites(b);
    const s = Sprites.dog('boss|' + B.key + '|' + layers.length + '|' + bites, { len: B.len, layers, bites, face: B.face, crown: B.crown, sausage: B.sausage });
    ctx.save();
    ctx.translate(b.x, b.y);
    if (B.key === 'ultimate' || b.hp / b.maxHp < 0.4) {
      const pulse = 0.5 + 0.5 * Math.sin(game.t * 6);
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, B.len * 0.75);
      g.addColorStop(0, B.key === 'ultimate' ? `hsla(${(game.t * 120) % 360},100%,60%,${0.25 + pulse * 0.15})` : `rgba(255,40,20,${0.2 + pulse * 0.2})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-B.len, -B.len, B.len * 2, B.len * 2);
    }
    if (b.charge && b.charge.stage === 0) {
      ctx.strokeStyle = `rgba(255,40,30,${0.4 + 0.4 * Math.sin(game.t * 30)})`; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, H); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.rotate(b.rot);
    const sq = 1 + Math.sin(game.t * 4) * 0.02;
    ctx.scale(sq, 2 - sq);
    ctx.drawImage(b.flashT > 0 ? s.flash : s.c, -s.w / 2, -s.h * 0.52, s.w, s.h);
    ctx.restore();
  }

  function drawPlayer() {
    const p = game.player;
    if (p.dead || !playerSpr) return;
    if (p.invuln > 0 && Math.floor(game.t * 14) % 2 === 0) return;
    const bob = Math.sin(game.t * 3.2) * 4;
    // sugar rush trail
    p.trail.forEach((tr, i) => {
      ctx.globalAlpha = 0.22 - i * 0.03;
      ctx.drawImage(playerSpr.c, tr.x - playerSpr.w / 2 - (p.x - tr.x) * 0.6, tr.y - playerSpr.h / 2 + bob, playerSpr.w, playerSpr.h);
    });
    ctx.globalAlpha = 1;
    // body
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.tilt);
    const gold = p.pw.golden > 0;
    ctx.drawImage(playerSpr.c, -playerSpr.w / 2, -playerSpr.h / 2, playerSpr.w, playerSpr.h);
    if (gold) { ctx.globalAlpha = 0.18 + 0.12 * Math.sin(game.t * 10); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(playerSpr.flash, -playerSpr.w / 2, -playerSpr.h / 2, playerSpr.w, playerSpr.h); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    // open mouth when firing
    if (p.mouthT > 0) {
      const mx = -PW / 2 + MOUTH.x * PW, my = -PH / 2 + MOUTH.y * PH;
      ctx.fillStyle = '#2a0008';
      ctx.beginPath(); ctx.ellipse(mx, my + 1, 8 * PK, 5.5 * PK, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(mx, my + 4 * PK, 4.5 * PK, 2 * PK, 0, 0, TAU); ctx.fill();
      if (p.pw.machine) { ctx.strokeStyle = 'rgba(255,61,242,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(mx, my + 1, 10 * PK, 7 * PK, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
    // thruster flame
    const fy = p.y + PH * 0.5 + bob;
    const fl = (18 + Math.sin(game.t * 40) * 5 + (p.pw.sugar ? 14 : 0)) * PK;
    const fg = ctx.createLinearGradient(0, fy - 4, 0, fy + fl);
    fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.3, p.pw.sugar ? '#ff4fa0' : '#3df9ff'); fg.addColorStop(1, 'rgba(80,0,255,0)');
    ctx.fillStyle = fg;
    for (const dx of [-14 * PK, 14 * PK]) {
      ctx.beginPath(); ctx.moveTo(p.x + dx - 7, fy - 6); ctx.quadraticCurveTo(p.x + dx, fy + fl * 1.2, p.x + dx + 7, fy - 6); ctx.fill();
    }
    ctx.fillStyle = '#20163a'; ctx.strokeStyle = '#3df9ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, fy - 6, 30 * PK, 7 * PK, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // braces shield
    if (p.pw.braces > 0) {
      const t = p.pw.braces, blink = t < 2 && Math.floor(game.t * 8) % 2;
      if (!blink) {
        ctx.strokeStyle = 'rgba(200,212,230,0.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y - 10 + bob, 60 * PK, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(61,249,255,0.35)'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(p.x, p.y - 10 + bob, 62 * PK, 0, TAU); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + game.t * 1.5;
          ctx.fillStyle = '#e0e8f0'; ctx.fillRect(p.x + Math.cos(a) * 60 * PK - 3, p.y - 10 + bob + Math.sin(a) * 60 * PK - 3, 6, 6);
          ctx.fillStyle = '#5a6478'; ctx.fillRect(p.x + Math.cos(a) * 60 * PK - 1, p.y - 10 + bob + Math.sin(a) * 60 * PK - 1, 2, 2);
        }
      }
    }
  }

  function drawTeeth() {
    for (const t of game.teeth) {
      const s = Sprites.tooth(t.kind);
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot);
      ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
      if (t.kind !== 'molar') { ctx.fillStyle = t.kind === 'gold' ? 'rgba(255,215,0,0.35)' : 'rgba(180,240,255,0.3)'; ctx.fillRect(t.x - 2, t.y + 8, 4, 14); }
    }
    for (const f of game.floss) {
      const x0 = f.x - f.w / 2;
      ctx.strokeStyle = 'rgba(77,255,210,0.3)'; ctx.lineWidth = 8;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const x = x0 + f.w * i / 20, y = f.y + Math.sin(i * 0.9 + f.t * 20) * 2.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = '#d8fff4'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = '#4dffd2'; ctx.fillRect(x0 - 3, f.y - 3, 6, 6); ctx.fillRect(x0 + f.w - 3, f.y - 3, 6, 6);
    }
  }
  function drawBullets() {
    for (const b of game.eb) {
      const s = Sprites.bullet(b.kind);
      ctx.save(); ctx.translate(b.x, b.y);
      if (b.kind === 'ketchup' || b.kind === 'mustard') ctx.rotate(Math.atan2(b.vy, b.vx) - Math.PI / 2);
      else ctx.rotate(b.t * 5);
      if (b.fuse != null) { const k = 1 + Math.max(0, 0.5 - b.fuse) * 0.6 * Math.sin(game.t * 40); ctx.scale(k, k); }
      ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
  }
  function drawPows() {
    for (const w of game.pows) {
      const P = PWR[w.type], s = Sprites.power(w.type, P.color);
      const k = 1 + Math.sin(w.t * 6) * 0.08;
      ctx.drawImage(s.c, w.x - 20 * k, w.y - 20 * k, 40 * k, 40 * k);
      ctx.font = `7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = P.color;
      ctx.fillText(P.short, w.x, w.y + 28);
    }
  }
  function drawParts() {
    for (const q of game.parts) {
      const a = Math.min(1, q.life / q.max * 1.6);
      ctx.globalAlpha = a;
      if (q.kind === 'chomp') {
        const k = 1 - q.life / q.max, s = q.size, gap = (1 - Math.sin(k * Math.PI)) * 14 * s;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14223a'; ctx.lineWidth = 1.5;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const tx = q.x - 16 * s + i * 8 * s;
            ctx.moveTo(tx, q.y + dir * (gap + 7 * s)); ctx.lineTo(tx + 4 * s, q.y + dir * gap); ctx.lineTo(tx + 8 * s, q.y + dir * (gap + 7 * s));
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else if (q.kind === 'sausage') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillStyle = '#d9472b'; ctx.strokeStyle = '#2a0d05'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ff9a7a'; ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(12, -2); ctx.stroke();
        ctx.restore();
      } else if (q.kind === 'tooth') {
        const s = Sprites.tooth('tooth');
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); ctx.restore();
      } else if (q.kind === 'blob') {
        ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 0.8, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
    }
    ctx.globalAlpha = 1;
    for (const r of game.rings) {
      ctx.globalAlpha = Math.max(0, r.life / (r.wash ? 0.9 : 0.4));
      ctx.strokeStyle = r.color; ctx.lineWidth = r.wash ? 10 : 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function neonText(text, x, y, size, color, align, glow) {
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.fillStyle = '#000'; ctx.fillText(text, x + Math.max(1, size / 10), y + Math.max(1, size / 10));
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }
  function drawTexts() {
    for (const t of game.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      const k = t.life > t.max - 0.12 ? 1 + (t.life - (t.max - 0.12)) * 4 : 1;
      neonText(t.text, t.x, t.y, Math.round(t.size * k), t.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const g = game, p = g.player;
    const hi = Math.max(bestScore(), g.score);
    const blink = Math.floor(g.t * 2) % 2 === 0;
    neonText('1UP', 14, 20, 12, blink ? '#ff2a1f' : '#ff7a6a', 'left');
    neonText(String(g.score).padStart(7, '0'), 14, 40, 15, '#ffffff', 'left');
    neonText('HI-SCORE', W / 2, 20, 12, '#ff2a1f');
    neonText(String(hi).padStart(7, '0'), W / 2, 40, 15, '#ffd51e');
    neonText('WAVE ' + g.wave, 14, 62, 10, '#3df9ff', 'left');
    // combo
    const m = mult();
    if (g.combo > 0) {
      const col = ['#ffffff', '#3dff7a', '#3df9ff', '#ffd51e', '#ff9a1f', '#ff4fa0', '#ff3df2', '#ff2a1f'][m - 1];
      neonText('x' + m, 14, 86, 16 + Math.min(6, m), col, 'left', m > 2 ? 8 : 0);
      neonText('COMBO ' + g.combo, 60, 86, 8, col, 'left');
      const into = g.combo % 8 / 8;
      if (m < 8) { ctx.fillStyle = '#ffffff22'; ctx.fillRect(60, 94, 70, 3); ctx.fillStyle = col; ctx.fillRect(60, 94, 70 * into, 3); }
    }
    // power-ups (right column)
    let py = 80;
    for (const k of PWR_KEYS) {
      const t = p.pw[k];
      if (!(t > 0)) continue;
      const P = PWR[k], s = Sprites.power(k, P.color);
      const x = W - 46;
      if (t > 2 || Math.floor(g.t * 8) % 2) ctx.drawImage(s.c, x - 2, py - 16, 32, 32);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(x - 64, py + 2, 58, 5);
      ctx.fillStyle = P.color; ctx.fillRect(x - 64, py + 2, 58 * t / P.dur, 5);
      neonText(P.short, x - 6, py - 7, 7, P.color, 'right');
      py += 36;
    }
    // lives
    const ly = H - 22;
    if (headSpr) for (let i = 0; i < Math.min(g.lives, 7); i++) {
      ctx.drawImage(headSpr.c, 10 + i * (headSpr.w + 4), ly - headSpr.h / 2, headSpr.w, headSpr.h);
    }
    // boss bar
    const b = g.boss;
    if (b) {
      const bw = 300, bx = W / 2 - bw / 2, by = 64;
      neonText(b.B.name, W / 2, by - 6, 9, '#ff4fa0', 'center', 6);
      ctx.fillStyle = '#000a'; ctx.fillRect(bx - 3, by + 2, bw + 6, 14);
      ctx.strokeStyle = '#ff4fa0'; ctx.lineWidth = 2; ctx.strokeRect(bx - 3, by + 2, bw + 6, 14);
      const f = Math.max(0, b.hp / b.maxHp);
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#ff2a1f'); grad.addColorStop(0.5, '#ffd51e'); grad.addColorStop(1, '#3dff7a');
      ctx.fillStyle = grad; ctx.fillRect(bx, by + 5, bw * f, 8);
      if (b.maxArmor) { ctx.fillStyle = '#c8d4e6'; ctx.fillRect(bx, by + 5, bw * Math.max(0, b.armor / b.maxArmor), 3); }
      for (let i = 1; i < 10; i++) { ctx.fillStyle = '#0006'; ctx.fillRect(bx + bw * i / 10, by + 5, 1.5, 8); }
    }
    // playfield frame
    if (offX > 4) {
      ctx.strokeStyle = 'rgba(61,249,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, H); ctx.moveTo(W, 0); ctx.lineTo(W, H); ctx.stroke();
    }
  }

  function drawBanner() {
    const g = game;
    if (g.banner) {
      const b = g.banner, a = Math.min(1, b.t * 3);
      ctx.globalAlpha = a;
      if (b.boss) {
        ctx.fillStyle = `rgba(255,0,40,${0.12 + 0.1 * Math.sin(g.t * 12)})`; ctx.fillRect(0, H * 0.36, W, H * 0.2);
        ctx.fillStyle = '#ff2a1f'; ctx.fillRect(0, H * 0.36, W, 3); ctx.fillRect(0, H * 0.56 - 3, W, 3);
        neonText(b.text, W / 2, H * 0.42, 32, Math.floor(g.t * 6) % 2 ? '#ff2a1f' : '#ffd51e', 'center', 16);
      } else {
        neonText(b.text, W / 2, H * 0.42, 32, '#3df9ff', 'center', 16);
      }
      neonText(b.sub, W / 2, H * 0.5, 12, '#ffd51e', 'center', 8);
      ctx.globalAlpha = 1;
    }
    if (g.phase === 'clear' && g.clearInfo) {
      const c = g.clearInfo, a = Math.min(1, (3.4 - g.phaseT) * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,2,30,0.78)'; ctx.fillRect(40, H * 0.3, W - 80, 250);
      ctx.strokeStyle = '#ff4fa0'; ctx.lineWidth = 3; ctx.strokeRect(40, H * 0.3, W - 80, 250);
      ctx.strokeStyle = '#3df9ff'; ctx.lineWidth = 1; ctx.strokeRect(46, H * 0.3 + 6, W - 92, 238);
      neonText('WAVE ' + g.wave + ' CLEAR!', W / 2, H * 0.3 + 38, 20, '#3dff7a', 'center', 12);
      const rows = [
        ['GLIZZIES EATEN', c.eaten + '/' + c.total, '#ffffff'],
        ['ACCURACY', Math.round(c.acc * 100) + '%', '#3df9ff'],
        ['ACCURACY BONUS', '+' + c.accBonus, '#ffd51e'],
        ['NO-HIT BONUS', c.perfect ? '+' + c.perfect : '---', c.perfect ? '#ff4fa0' : '#666'],
      ];
      rows.forEach((r, i) => {
        if (3.4 - g.phaseT < 0.3 + i * 0.25) return;
        neonText(r[0], 70, H * 0.3 + 90 + i * 34, 11, '#bbb', 'left');
        neonText(r[1], W - 70, H * 0.3 + 90 + i * 34, 12, r[2], 'right');
      });
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    drawBackground();
    if (state === 'title' || !game) { drawAttract(); return; }
    const g = game;
    const sx = g.shake ? rand(-g.shake, g.shake) : 0, sy = g.shake ? rand(-g.shake, g.shake) : 0;
    worldTransform(sx, sy);
    for (const e of g.enemies) if (e.state !== 'wait') drawDog(e);
    if (g.boss) drawBoss(g.boss);
    drawPows();
    drawTeeth();
    drawBullets();
    drawPlayer();
    drawParts();
    drawTexts();
    worldTransform(0, 0);
    drawHUD();
    drawBanner();
    if (g.flash > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.min(0.6, g.flash); ctx.fillStyle = g.flashColor; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    }
  }

  /* title-screen attract mode: a parade of hotdogs */
  const ATTRACT_TYPES = ['ketchup', 'mustard', 'relish', 'combo', 'chili', 'bacon', 'mutant', 'giant'];
  function drawAttract() {
    worldTransform(0, 0);
    if (attract.length < 9 && Math.random() < 0.03) {
      const t = pick(ATTRACT_TYPES), d = DEFS[t], dir = Math.random() < 0.5 ? 1 : -1;
      attract.push({ t, d, x: dir > 0 ? -60 : W + 60, y: rand(60, H - 60), vx: dir * rand(50, 120), ph: rand(0, TAU), dir });
    }
    const now = performance.now() / 1000;
    for (let i = attract.length - 1; i >= 0; i--) {
      const a = attract[i];
      a.x += a.vx / 60;
      if (a.x < -100 || a.x > W + 100) { attract.splice(i, 1); continue; }
      const s = Sprites.dog(a.t + '|' + a.d.layers.length + '|0', { len: a.d.len, layers: a.d.layers, bites: 0, face: a.d.face });
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(a.x, a.y + Math.sin(now * 2 + a.ph) * 14);
      ctx.rotate(Math.cos(now * 2 + a.ph) * 0.2);
      if (a.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ======================= loop ======================= */
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    titleT += dt;
    const playing = state === 'playing';
    updateStars(dt, playing ? 9 : 4);
    // Safety net: an unexpected error in one frame must never stop the game loop.
    if (playing) { try { update(dt); } catch (err) { console.error('Glizzy Gobbler update error:', err); } }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.classList.remove('on'); }
    try { render(); } catch (err) { console.error('Glizzy Gobbler render error:', err); }
    requestAnimationFrame(frame);
  }

  show('title');
  Sound.playMusic('title');
  requestAnimationFrame(frame);

  // test hook (harmless; used for automated checks)
  window.__glizzy = {
    get state() { return state; }, get game() { return game; },
    startGame, startWave: n => { if (game) { game.enemies.length = 0; game.boss = null; startWave(n); } },
    dropPower: t => game && dropPower(game.player.x, game.player.y - 200, t),
  };
})();
