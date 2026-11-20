'use strict';
/* Glizzy Gobbler — synthesized retro sound + chiptune music (Web Audio, no files). */
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  const S = Object.assign({ master: 0.8, music: 0.55, sfx: 0.85, muted: false }, load());
  let pendingTrack = null;

  function load() {
    try { return JSON.parse(localStorage.getItem('glizzy.audio')) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem('glizzy.audio', JSON.stringify(S)); } catch (e) { /* ignore */ }
  }

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);
      musicBus = ctx.createGain(); sfxBus = ctx.createGain();
      musicBus.connect(master); sfxBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      apply();
      if (pendingTrack) { const p = pendingTrack; pendingTrack = null; playMusic(p); }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(S.muted ? 0 : S.master, t, 0.02);
    musicBus.gain.setTargetAtTime(S.music * 0.5, t, 0.02);
    sfxBus.gain.setTargetAtTime(S.sfx, t, 0.02);
  }

  const mf = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(o) {
    const t = o.t != null ? o.t : ctx.currentTime;
    const dur = o.dur || 0.1, vol = o.vol || 0.2, f0 = o.f0, f1 = o.f1 != null ? o.f1 : o.f0;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    if (o.hold) g.gain.setValueAtTime(vol, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function nz(o) {
    const t = o.t != null ? o.t : ctx.currentTime;
    const dur = o.dur || 0.1, vol = o.vol || 0.2;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.Q.value = o.q || 1;
    const f0 = o.f0 || 1000, f1 = o.f1 || f0;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  }

  function seq(notes, t, step, type, vol, len) {
    notes.forEach((n, i) => { if (n) tone({ type, f0: mf(n), dur: len || step * 0.95, vol, t: t + i * step }); });
  }

  const crunch = (t, v = 1) => {
    nz({ t, dur: 0.07, vol: 0.35 * v, ft: 'bandpass', f0: 2400, f1: 700, q: 1.4 });
    nz({ t: t + 0.018, dur: 0.035, vol: 0.18 * v, ft: 'highpass', f0: 4500 });
    tone({ t, type: 'square', f0: 170, f1: 80, dur: 0.06, vol: 0.12 * v });
  };

  const FX = {
    blip: t => tone({ t, type: 'square', f0: 880, f1: 1320, dur: 0.05, vol: 0.08 }),
    shoot: t => {
      tone({ t, type: 'square', f0: 1150, f1: 380, dur: 0.07, vol: 0.09 });
      tone({ t, type: 'triangle', f0: 2600, f1: 1500, dur: 0.035, vol: 0.08 });
      nz({ t, dur: 0.025, vol: 0.06, ft: 'highpass', f0: 3500 });
    },
    gold: t => {
      tone({ t, type: 'square', f0: 1300, f1: 520, dur: 0.07, vol: 0.08 });
      tone({ t, type: 'sine', f0: 2100, f1: 3200, dur: 0.1, vol: 0.07 });
    },
    molar: t => {
      tone({ t, type: 'square', f0: 320, f1: 80, dur: 0.28, vol: 0.2 });
      nz({ t, dur: 0.22, vol: 0.18, ft: 'lowpass', f0: 900, f1: 200 });
    },
    floss: t => {
      tone({ t, type: 'sawtooth', f0: 1500, f1: 2600, dur: 0.12, vol: 0.05 });
      tone({ t, type: 'triangle', f0: 820, f1: 760, dur: 0.16, vol: 0.06 });
    },
    hit: t => crunch(t),
    splat: t => {
      nz({ t, dur: 0.18, vol: 0.35, ft: 'lowpass', f0: 1400, f1: 150 });
      tone({ t, type: 'sine', f0: 280, f1: 60, dur: 0.14, vol: 0.22 });
    },
    eaten: t => {
      crunch(t, 1.1); crunch(t + 0.07, 0.9);
      tone({ t: t + 0.12, type: 'sine', f0: 560, f1: 110, dur: 0.22, vol: 0.3 });
      tone({ t: t + 0.13, type: 'square', f0: 880, f1: 1400, dur: 0.07, vol: 0.05 });
    },
    eshoot: t => {
      tone({ t, type: 'triangle', f0: 520, f1: 190, dur: 0.12, vol: 0.09 });
      nz({ t, dur: 0.06, vol: 0.07, ft: 'lowpass', f0: 700 });
    },
    powerup: t => seq([72, 76, 79, 84, 88], t, 0.055, 'square', 0.1, 0.09),
    wash: t => {
      nz({ t, dur: 0.6, vol: 0.25, ft: 'bandpass', f0: 300, f1: 5000, q: 2 });
      tone({ t, type: 'sine', f0: 300, f1: 1100, dur: 0.5, vol: 0.15 });
      seq([84, 88, 91, 96], t + 0.1, 0.06, 'triangle', 0.08);
    },
    clink: t => {
      tone({ t, type: 'triangle', f0: 2600, f1: 2200, dur: 0.14, vol: 0.12 });
      tone({ t, type: 'square', f0: 3700, f1: 3500, dur: 0.06, vol: 0.04 });
    },
    clang: t => {
      tone({ t, type: 'square', f0: 1700, f1: 1300, dur: 0.08, vol: 0.08 });
      tone({ t, type: 'triangle', f0: 2500, f1: 2400, dur: 0.12, vol: 0.07 });
    },
    playerHit: t => {
      tone({ t, type: 'sawtooth', f0: 700, f1: 45, dur: 0.8, vol: 0.28 });
      nz({ t, dur: 0.7, vol: 0.4, ft: 'lowpass', f0: 3000, f1: 90 });
      seq([67, 63, 60], t + 0.1, 0.12, 'square', 0.07);
    },
    explode: t => {
      nz({ t, dur: 0.5, vol: 0.45, ft: 'lowpass', f0: 2600, f1: 80 });
      tone({ t, type: 'sine', f0: 150, f1: 30, dur: 0.45, vol: 0.35 });
    },
    bigboom: t => {
      nz({ t, dur: 1.5, vol: 0.7, ft: 'lowpass', f0: 4200, f1: 50 });
      tone({ t, type: 'sine', f0: 110, f1: 20, dur: 1.3, vol: 0.6 });
      nz({ t: t + 0.25, dur: 0.9, vol: 0.4, ft: 'lowpass', f0: 2000, f1: 60 });
    },
    extralife: t => seq([79, 83, 86, 91, 86, 91, 95], t, 0.07, 'square', 0.11),
    waveclear: t => {
      seq([72, 76, 79, 76, 79, 84], t, 0.09, 'square', 0.1);
      seq([60, 64, 67, 64, 67, 72], t, 0.09, 'triangle', 0.16);
    },
    bosswarn: t => {
      for (let i = 0; i < 6; i++) tone({ t: t + i * 0.22, type: 'sawtooth', f0: i % 2 ? 330 : 440, dur: 0.2, vol: 0.12, hold: 0.15 });
    },
    gameover: t => {
      seq([67, 66, 65, 64, 63, 62, 61, 60], t, 0.16, 'square', 0.12, 0.15);
      tone({ t: t + 1.3, type: 'triangle', f0: mf(48), f1: mf(36), dur: 1.0, vol: 0.3 });
    },
    victory: t => {
      seq([72, 72, 72, 77, null, 76, 77, 84], t, 0.12, 'square', 0.12, 0.11);
      seq([60, 60, 60, 65, null, 64, 65, 72], t, 0.12, 'triangle', 0.18, 0.11);
      tone({ t: t + 0.96, type: 'square', f0: mf(84), dur: 0.6, vol: 0.12, hold: 0.4 });
    },
    start: t => seq([60, 64, 67, 72, 76, 79, 84], t, 0.05, 'square', 0.09),
  };
  const GAP = { hit: 0.035, shoot: 0.03, eshoot: 0.06, splat: 0.05, clang: 0.06, clink: 0.05, eaten: 0.04, explode: 0.06 };
  const last = {};

  function sfx(name) {
    if (!ctx || S.muted || !FX[name]) return;
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < (GAP[name] || 0.015)) return;
    last[name] = now;
    FX[name](now + 0.005);
  }

  /* ---------------- Music sequencer ---------------- */
  const TRACKS = {
    title: {
      bpm: 118, roots: [48, 45, 41, 43], chords: [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]],
      mel: [72, 76, 79, 76, 72, 76, 79, 84, 81, 79, 76, 72, 74, 76, 72, null,
        77, 76, 77, 81, 79, 77, 76, 74, 74, 76, 74, 71, 67, 71, 74, null],
      kick: [0, 8], snare: [4, 12], hat: 2, bass16: false,
    },
    main: {
      bpm: 144, roots: [45, 41, 43, 40], chords: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]],
      mel: [69, 72, 76, 72, 74, 72, 69, null, 65, 69, 72, 69, 71, 72, 74, null,
        67, 71, 74, 71, 72, 74, 76, 79, 76, null, 75, 76, 71, null, 68, 71],
      kick: [0, 8, 10], snare: [4, 12], hat: 2, bass16: false,
    },
    boss: {
      bpm: 168, roots: [38, 38, 34, 36], chords: [[0, 3, 7], [0, 3, 6], [0, 4, 7], [0, 4, 7]],
      mel: [62, null, 65, 62, 68, null, 67, 65, 62, null, 65, 62, 69, 68, 67, null,
        70, null, 69, 67, 65, null, 67, 69, 72, 71, 70, 69, 68, 67, 66, 65],
      kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], hat: 1, bass16: true,
    },
  };
  let track = null, step = 0, nextT = 0, timer = null, trackName = null;

  function playMusic(name) {
    if (!ctx) { pendingTrack = name; return; }
    if (trackName === name && timer) return;
    stopMusic();
    track = TRACKS[name]; trackName = name; step = 0; nextT = ctx.currentTime + 0.08;
    timer = setInterval(schedule, 25);
  }
  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null; track = null; trackName = null; pendingTrack = null;
  }
  function schedule() {
    if (!track || !ctx) return;
    const sd = 60 / track.bpm / 4;
    while (nextT < ctx.currentTime + 0.12) {
      playStep(step, nextT, sd);
      nextT += sd; step = (step + 1) % 64;
    }
  }
  function playStep(s, t, sd) {
    const T = track, bar = s >> 4, pos = s & 15, root = T.roots[bar], ch = T.chords[bar], mb = musicBus;
    // bass
    if (T.bass16) {
      tone({ t, type: 'sawtooth', f0: mf(root - 12 + (pos % 2 ? 12 : 0)), dur: sd * 0.9, vol: 0.13, bus: mb });
    } else if (pos % 2 === 0) {
      tone({ t, type: 'triangle', f0: mf(root - 12 + (pos % 4 === 2 ? 12 : 0)), dur: sd * 1.8, vol: 0.4, bus: mb });
    }
    // arpeggio
    const an = root + 12 + ch[pos % 3] + (pos % 6 >= 3 ? 12 : 0);
    tone({ t, type: 'square', f0: mf(an), dur: sd * 0.8, vol: 0.035, bus: mb });
    // melody
    if (pos % 2 === 0) {
      const m = T.mel[bar * 8 + pos / 2];
      if (m) {
        tone({ t, type: 'square', f0: mf(m), dur: sd * 1.75, vol: 0.085, bus: mb, hold: sd });
        tone({ t, type: 'triangle', f0: mf(m + 12), dur: sd * 1.2, vol: 0.03, bus: mb });
      }
    }
    // drums
    if (T.kick.includes(pos)) tone({ t, type: 'sine', f0: 160, f1: 38, dur: 0.13, vol: 0.55, bus: mb });
    if (T.snare.includes(pos)) {
      nz({ t, dur: 0.11, vol: 0.2, ft: 'highpass', f0: 1400, bus: mb });
      tone({ t, type: 'triangle', f0: 240, f1: 170, dur: 0.06, vol: 0.12, bus: mb });
    }
    if (pos % T.hat === 0) nz({ t, dur: 0.03, vol: pos % 4 === 2 ? 0.07 : 0.04, ft: 'highpass', f0: 8000, bus: mb });
  }

  function set(k, v) { S[k] = v; apply(); save(); }

  return {
    unlock, sfx, playMusic, stopMusic, set,
    get settings() { return S; },
    toggleMute() { set('muted', !S.muted); return S.muted; },
  };
})();
