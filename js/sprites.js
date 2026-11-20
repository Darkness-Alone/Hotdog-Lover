'use strict';
/* Glizzy Gobbler — procedural, cached sprite art (hotdogs, toppings, teeth, power-ups). */
const Sprites = (() => {
  const RS = 2; // render scale for crisp sprites on hi-dpi
  const OUT = '#2a0d05';

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * RS); c.height = Math.ceil(h * RS);
    const x = c.getContext('2d');
    x.scale(RS, RS);
    return [c, x];
  }
  function rr(x, X, Y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + w, Y, X + w, Y + h, r);
    x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r);
    x.arcTo(X, Y, X + w, Y, r);
    x.closePath();
  }
  function rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function flashOf(c) {
    const f = document.createElement('canvas');
    f.width = c.width; f.height = c.height;
    const x = f.getContext('2d');
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(0, 0, f.width, f.height);
    return f;
  }

  /* ---------------- toppings ---------------- */
  function stroked(x, pts, colors, widths) {
    for (let k = 0; k < colors.length; k++) {
      x.strokeStyle = colors[k]; x.lineWidth = widths[k];
      x.beginPath();
      pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
      x.stroke();
    }
  }
  const TOP = {
    ketchup(x, L, h, k, lw) {
      const pts = [], n = 9;
      for (let i = 0; i <= n; i++) pts.push([-L * 0.42 + (L * 0.84) * i / n, i % 2 ? -h * 0.07 : -h * 0.25]);
      stroked(x, pts, ['#5e0603', '#ff2a1f', '#ff9a8a'], [lw * 3.2, lw * 2.1, lw * 0.6]);
    },
    mustard(x, L, h, k, lw) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const px = -L * 0.43 + L * 0.86 * i / 40;
        pts.push([px, -h * 0.17 + Math.sin(i / 40 * Math.PI * 7) * h * 0.09]);
      }
      stroked(x, pts, ['#6a4c00', '#ffd51e', '#fff6b0'], [lw * 3, lw * 1.9, lw * 0.6]);
    },
    relish(x, L, h, k, lw) {
      const r = rng(77 + k);
      for (let i = 0; i < 18; i++) {
        const px = -L * 0.42 + r() * L * 0.84, py = -h * 0.32 + r() * h * 0.26, s = L * (0.035 + r() * 0.025);
        x.fillStyle = '#0f4a0c'; x.fillRect(px - s / 2 - 0.8, py - s / 2 - 0.8, s + 1.6, s * 0.8 + 1.6);
        x.fillStyle = r() > 0.4 ? '#2fa02a' : '#7ed957'; x.fillRect(px - s / 2, py - s / 2, s, s * 0.8);
      }
    },
    onion(x, L, h, k, lw) {
      const r = rng(31 + k);
      for (let i = 0; i < 14; i++) {
        const px = -L * 0.4 + r() * L * 0.8, py = -h * 0.36 + r() * h * 0.22, s = L * 0.045;
        x.fillStyle = '#8c8060'; x.fillRect(px - s / 2 - 0.7, py - s / 2 - 0.7, s + 1.4, s + 1.4);
        x.fillStyle = r() > 0.5 ? '#fbf7e6' : '#e6dcb8'; x.fillRect(px - s / 2, py - s / 2, s, s);
      }
    },
    cheese(x, L, h, k, lw) {
      x.fillStyle = '#ffa51e'; x.strokeStyle = '#7a3a00'; x.lineWidth = lw;
      x.beginPath();
      x.moveTo(-L * 0.48, -h * 0.2 - k * h * 0.06);
      const drips = [-0.36, -0.12, 0.1, 0.32];
      x.lineTo(-L * 0.44, h * 0.02);
      drips.forEach((d, i) => {
        const dl = h * (0.12 + ((i + k) % 3) * 0.08);
        x.lineTo(L * (d - 0.04), h * 0.02);
        x.quadraticCurveTo(L * (d - 0.035), h * 0.02 + dl, L * d, h * 0.02 + dl);
        x.quadraticCurveTo(L * (d + 0.035), h * 0.02 + dl, L * (d + 0.04), h * 0.02);
      });
      x.lineTo(L * 0.46, h * 0.02);
      x.lineTo(L * 0.48, -h * 0.2 - k * h * 0.06);
      x.quadraticCurveTo(0, -h * 0.42 - k * h * 0.06, -L * 0.48, -h * 0.2 - k * h * 0.06);
      x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = '#ffd36a'; x.lineWidth = lw * 0.8;
      x.beginPath(); x.moveTo(-L * 0.3, -h * 0.22 - k * h * 0.06); x.quadraticCurveTo(0, -h * 0.34, L * 0.3, -h * 0.22 - k * h * 0.06); x.stroke();
    },
    chili(x, L, h, k, lw) {
      const r = rng(13 + k), yo = -k * h * 0.08;
      for (let i = 0; i < 16; i++) {
        const px = -L * 0.42 + (L * 0.84) * i / 15, py = -h * 0.3 + yo + r() * h * 0.08, rad = h * (0.12 + r() * 0.06);
        x.fillStyle = OUT; x.beginPath(); x.arc(px, py, rad + lw * 0.6, 0, 7); x.fill();
      }
      const r2 = rng(13 + k);
      for (let i = 0; i < 16; i++) {
        const px = -L * 0.42 + (L * 0.84) * i / 15, py = -h * 0.3 + yo + r2() * h * 0.08, rad = h * (0.12 + r2() * 0.06);
        x.fillStyle = i % 3 ? '#8a2a12' : '#a8442a'; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
      }
      const r3 = rng(99 + k);
      for (let i = 0; i < 12; i++) {
        x.fillStyle = r3() > 0.5 ? '#4a1406' : '#d0663a';
        x.fillRect(-L * 0.4 + r3() * L * 0.8, -h * 0.38 + yo + r3() * h * 0.14, L * 0.03, L * 0.025);
      }
    },
    bacon(x, L, h, k, lw) {
      const cx = [-0.27, 0.02, 0.29][k % 3] * L;
      x.save(); x.translate(cx, -h * 0.05); x.rotate(-0.45);
      const bw = L * 0.11, bh = h * 0.95;
      x.fillStyle = OUT; rr(x, -bw / 2 - lw * 0.7, -bh / 2 - lw * 0.7, bw + lw * 1.4, bh + lw * 1.4, 2); x.fill();
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i % 2 ? '#f6c0a8' : '#b8322a';
        x.fillRect(-bw / 2 + bw * i / 4, -bh / 2, bw / 4 + 0.3, bh);
      }
      x.restore();
    },
    goo(x, L, h, k, lw) {
      x.fillStyle = '#6dff3a'; x.strokeStyle = '#1f6a0a'; x.lineWidth = lw;
      x.beginPath();
      x.moveTo(-L * 0.46, -h * 0.26);
      x.quadraticCurveTo(-L * 0.2, -h * 0.5, 0, -h * 0.3);
      x.quadraticCurveTo(L * 0.25, -h * 0.5, L * 0.46, -h * 0.24);
      x.lineTo(L * 0.42, -h * 0.02);
      [0.28, 0.02, -0.22].forEach((d, i) => {
        const dl = h * (0.22 + i * 0.1);
        x.lineTo(L * (d + 0.04), -h * 0.02);
        x.quadraticCurveTo(L * (d + 0.05), dl, L * d, dl);
        x.quadraticCurveTo(L * (d - 0.05), dl, L * (d - 0.04), -h * 0.02);
      });
      x.lineTo(-L * 0.46, -h * 0.02);
      x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#d8ffb8';
      [[-0.3, -0.28, 0.05], [0.12, -0.3, 0.04], [0.32, -0.2, 0.03]].forEach(b => { x.beginPath(); x.arc(L * b[0], h * b[1], h * b[2] * 2, 0, 7); x.fill(); });
    },
    armor(x, L, h, k, lw) {
      const cx = [-0.3, 0, 0.3][k % 3] * L, pw = L * 0.24;
      x.fillStyle = '#7d8aa0'; x.strokeStyle = '#1c2230'; x.lineWidth = lw;
      rr(x, cx - pw / 2, -h * 0.42, pw, h * 0.5, 4); x.fill(); x.stroke();
      x.fillStyle = '#c3cede'; x.fillRect(cx - pw / 2 + 3, -h * 0.4, pw - 6, h * 0.07);
      x.fillStyle = '#2b3242';
      [[-0.38, -0.3], [0.38, -0.3], [-0.38, 0.0], [0.38, 0.0]].forEach(p => { x.beginPath(); x.arc(cx + pw * p[0], h * p[1], lw * 1.2, 0, 7); x.fill(); });
    },
  };

  /* ---------------- faces ---------------- */
  function eye(x, cx, cy, r, lw, look = [0, 0.35], pupil = '#111') {
    x.fillStyle = '#fff'; x.strokeStyle = OUT; x.lineWidth = lw * 0.8;
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.stroke();
    x.fillStyle = pupil; x.beginPath(); x.arc(cx + look[0] * r, cy + look[1] * r, r * 0.52, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + look[0] * r - r * 0.18, cy + look[1] * r - r * 0.22, r * 0.17, 0, 7); x.fill();
  }
  const FACE = {
    cute(x, L, h, lw) {
      const fx = -L * 0.2, fy = h * 0.16, r = h * 0.12;
      eye(x, fx - L * 0.06, fy, r, lw); eye(x, fx + L * 0.07, fy, r, lw);
      x.strokeStyle = OUT; x.lineWidth = lw;
      x.beginPath(); x.arc(fx, fy + h * 0.1, h * 0.09, 0.2, Math.PI - 0.2); x.stroke();
      x.fillStyle = 'rgba(255,90,90,0.5)';
      x.beginPath(); x.arc(fx - L * 0.13, fy + h * 0.1, h * 0.05, 0, 7); x.arc(fx + L * 0.14, fy + h * 0.1, h * 0.05, 0, 7); x.fill();
    },
    angry(x, L, h, lw) {
      const fx = -L * 0.2, fy = h * 0.17, r = h * 0.12;
      eye(x, fx - L * 0.06, fy, r, lw, [0.1, 0.3], '#7a0000'); eye(x, fx + L * 0.07, fy, r, lw, [0.1, 0.3], '#7a0000');
      x.strokeStyle = OUT; x.lineWidth = lw * 1.4;
      x.beginPath(); x.moveTo(fx - L * 0.12, fy - r * 1.4); x.lineTo(fx - L * 0.02, fy - r * 0.8);
      x.moveTo(fx + L * 0.13, fy - r * 1.4); x.lineTo(fx + L * 0.03, fy - r * 0.8); x.stroke();
      x.fillStyle = '#3a0505'; x.beginPath();
      x.moveTo(fx - L * 0.07, fy + h * 0.17); x.quadraticCurveTo(fx, fy + h * 0.07, fx + L * 0.07, fy + h * 0.17); x.closePath(); x.fill();
      x.lineWidth = lw * 0.7; x.stroke();
    },
    mutant(x, L, h, lw) {
      const fx = -L * 0.16, fy = h * 0.17;
      // drool mouth
      x.fillStyle = '#2a0010'; x.strokeStyle = OUT; x.lineWidth = lw;
      x.beginPath(); x.ellipse(fx + L * 0.04, fy + h * 0.17, L * 0.16, h * 0.11, 0, 0, Math.PI); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const tx = fx - L * 0.1 + i * L * 0.05;
        x.beginPath(); x.moveTo(tx, fy + h * 0.17); x.lineTo(tx + L * 0.022, fy + h * 0.25); x.lineTo(tx + L * 0.044, fy + h * 0.17); x.fill();
      }
      x.fillStyle = '#7dff3a'; x.beginPath(); x.ellipse(fx + L * 0.1, fy + h * 0.25, L * 0.04, h * 0.05, 0, 0, 7); x.fill();
      eye(x, fx - L * 0.09, fy - h * 0.02, h * 0.17, lw, [0.3, 0.2], '#c00');
      eye(x, fx + L * 0.07, fy - h * 0.09, h * 0.08, lw, [-0.4, 0.3]);
      eye(x, fx + L * 0.17, fy + h * 0.02, h * 0.11, lw, [0.4, -0.3], '#260');
      x.strokeStyle = '#d00'; x.lineWidth = lw * 0.4;
      x.beginPath(); x.moveTo(fx - L * 0.15, fy - h * 0.06); x.lineTo(fx - L * 0.12, fy - h * 0.02); x.stroke();
    },
    derp(x, L, h, lw) {
      const fx = -L * 0.15, fy = h * 0.16, r = h * 0.15;
      eye(x, fx - L * 0.09, fy, r, lw, [-0.4, 0.2]); eye(x, fx + L * 0.09, fy, r * 0.8, lw, [0.4, -0.3]);
      x.fillStyle = '#3a0505'; x.beginPath(); x.ellipse(fx, fy + h * 0.15, h * 0.06, h * 0.08, 0, 0, 7); x.fill();
    },
    boss(x, L, h, lw) {
      const fx = -L * 0.18, fy = h * 0.16, r = h * 0.11;
      eye(x, fx - L * 0.07, fy, r, lw, [0.15, 0.2], '#e00000'); eye(x, fx + L * 0.07, fy, r, lw, [0.15, 0.2], '#e00000');
      x.strokeStyle = OUT; x.lineWidth = lw * 2;
      x.beginPath(); x.moveTo(fx - L * 0.14, fy - r * 1.7); x.lineTo(fx - L * 0.02, fy - r * 0.7);
      x.moveTo(fx + L * 0.14, fy - r * 1.7); x.lineTo(fx + L * 0.02, fy - r * 0.7); x.stroke();
      x.fillStyle = '#2a0000'; x.lineWidth = lw;
      x.beginPath(); x.moveTo(fx - L * 0.12, fy + h * 0.13); x.quadraticCurveTo(fx, fy + h * 0.33, fx + L * 0.12, fy + h * 0.13); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const tx = fx - L * 0.1 + i * L * 0.036;
        x.beginPath(); x.moveTo(tx, fy + h * 0.14); x.lineTo(tx + L * 0.018, fy + h * 0.21); x.lineTo(tx + L * 0.036, fy + h * 0.14); x.fill();
      }
    },
  };

  function crown(x, L, h, lw) {
    const cx = L * 0.05, cy = -h * 0.55, w = L * 0.34, ch = h * 0.42;
    x.fillStyle = '#ffd700'; x.strokeStyle = '#6a4a00'; x.lineWidth = lw;
    x.beginPath();
    x.moveTo(cx - w / 2, cy + ch / 2);
    x.lineTo(cx - w / 2, cy - ch / 2); x.lineTo(cx - w / 4, cy); x.lineTo(cx, cy - ch * 0.7);
    x.lineTo(cx + w / 4, cy); x.lineTo(cx + w / 2, cy - ch / 2); x.lineTo(cx + w / 2, cy + ch / 2);
    x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff6a0'; x.fillRect(cx - w / 2 + 3, cy + ch * 0.2, w - 6, ch * 0.1);
    [['#ff2a1f', -w / 4], ['#2fa02a', 0], ['#3dc8ff', w / 4]].forEach(g => {
      x.fillStyle = g[0]; x.beginPath(); x.arc(cx + g[1], cy + ch * 0.05, lw * 2.2, 0, 7); x.fill(); x.stroke();
    });
  }

  function drawHotdog(x, o) {
    const L = o.len, h = L * 0.42, lw = Math.max(1.4, L / 30);
    x.lineJoin = 'round'; x.lineCap = 'round';
    // bun back
    x.fillStyle = '#c47428'; x.strokeStyle = OUT; x.lineWidth = lw;
    rr(x, -L * 0.46, -h * 0.36, L * 0.92, h * 0.62, h * 0.3); x.fill(); x.stroke();
    // sausage
    const brat = o.sausage === 'brat';
    const sg = x.createLinearGradient(0, -h * 0.32, 0, h * 0.2);
    sg.addColorStop(0, brat ? '#a8622e' : '#f0603f'); sg.addColorStop(1, brat ? '#5a2a10' : '#a3301c');
    x.fillStyle = sg;
    rr(x, -L * 0.55, -h * 0.32, L * 1.1, h * 0.52, h * 0.26); x.fill(); x.stroke();
    x.globalAlpha = 0.75; x.strokeStyle = brat ? '#d09060' : '#ffa58a'; x.lineWidth = lw * 0.9;
    x.beginPath(); x.moveTo(-L * 0.47, -h * 0.22); x.lineTo(L * 0.45, -h * 0.22); x.stroke(); x.globalAlpha = 1;
    if (brat) {
      x.strokeStyle = '#2a0f04'; x.lineWidth = lw * 1.3;
      for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(L * (i * 0.13 - 0.03), -h * 0.3); x.lineTo(L * (i * 0.13 + 0.04), -h * 0.06); x.stroke(); }
    }
    // bun front
    const bg = x.createLinearGradient(0, -h * 0.05, 0, h * 0.5);
    bg.addColorStop(0, '#ffd57e'); bg.addColorStop(1, '#d2802c');
    x.fillStyle = bg; x.strokeStyle = OUT; x.lineWidth = lw;
    rr(x, -L * 0.47, -h * 0.06, L * 0.94, h * 0.54, h * 0.27); x.fill(); x.stroke();
    x.globalAlpha = 0.7; x.strokeStyle = '#fff3c4'; x.lineWidth = lw;
    x.beginPath(); x.moveTo(-L * 0.36, h * 0.04); x.lineTo(L * 0.32, h * 0.04); x.stroke(); x.globalAlpha = 1;
    // toppings (bottom -> top)
    const counts = {};
    for (const t of o.layers) { const k = counts[t] || 0; TOP[t](x, L, h, k, lw); counts[t] = k + 1; }
    if (o.face) FACE[o.face](x, L, h, lw);
    if (o.crown) crown(x, L, h, lw);
    // bites from the right end
    if (o.bites > 0) {
      const bites = [];
      for (let b = 0; b < o.bites; b++) bites.push([L * 0.56 - b * L * 0.19, -h * 0.02 + (b % 2 ? h * 0.12 : -h * 0.06), h * 0.44]);
      x.save(); x.globalCompositeOperation = 'destination-out';
      for (const [cx, cy, r] of bites) {
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
        for (let a = 0; a < 5; a++) {
          const ang = Math.PI * (0.62 + a * 0.19);
          x.beginPath(); x.arc(cx + Math.cos(ang) * r * 0.95, cy + Math.sin(ang) * r * 0.95, r * 0.22, 0, 7); x.fill();
        }
      }
      x.globalCompositeOperation = 'source-atop';
      x.strokeStyle = '#fff1c6'; x.lineWidth = lw * 2.2;
      for (const [cx, cy, r] of bites) { x.beginPath(); x.arc(cx, cy, r * 1.05, 0, 7); x.stroke(); }
      x.restore();
    }
  }

  const dogCache = new Map();
  function dog(key, o) {
    let s = dogCache.get(key);
    if (s) return s;
    const L = o.len, w = L * 1.25, h = L * 0.95;
    const [c, x] = mk(w, h);
    x.translate(w / 2, h * 0.52);
    drawHotdog(x, o);
    s = { c, flash: flashOf(c), w, h };
    dogCache.set(key, s);
    return s;
  }

  /* ---------------- teeth ---------------- */
  function toothPath(x, w, h) {
    x.beginPath();
    x.moveTo(-w * 0.5, -h * 0.18);
    x.bezierCurveTo(-w * 0.56, -h * 0.56, -w * 0.15, -h * 0.6, 0, -h * 0.42);
    x.bezierCurveTo(w * 0.15, -h * 0.6, w * 0.56, -h * 0.56, w * 0.5, -h * 0.18);
    x.bezierCurveTo(w * 0.48, h * 0.1, w * 0.42, h * 0.2, w * 0.33, h * 0.5);
    x.lineTo(w * 0.17, h * 0.5); x.lineTo(w * 0.07, h * 0.12); x.lineTo(-w * 0.07, h * 0.12);
    x.lineTo(-w * 0.17, h * 0.5); x.lineTo(-w * 0.33, h * 0.5);
    x.bezierCurveTo(-w * 0.42, h * 0.2, -w * 0.48, h * 0.1, -w * 0.5, -h * 0.18);
    x.closePath();
  }
  function drawTooth(x, w, h, kind) {
    const gold = kind === 'gold';
    if (gold || kind === 'molar') {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, w * 0.9);
      g.addColorStop(0, gold ? 'rgba(255,215,0,0.6)' : 'rgba(180,240,255,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(-w, -h, w * 2, h * 2);
    }
    toothPath(x, w, h);
    const g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    if (gold) { g.addColorStop(0, '#fff6a0'); g.addColorStop(0.5, '#ffd700'); g.addColorStop(1, '#b8860b'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f2f6ff'); g.addColorStop(1, '#a8c4e8'); }
    x.fillStyle = g; x.fill();
    x.strokeStyle = gold ? '#5a3a00' : '#14223a'; x.lineWidth = Math.max(1.2, w / 9); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.beginPath(); x.ellipse(-w * 0.22, -h * 0.3, w * 0.1, h * 0.08, -0.5, 0, 7); x.fill();
  }
  const toothCache = {};
  function tooth(kind) {
    if (toothCache[kind]) return toothCache[kind];
    const size = kind === 'molar' ? [38, 42] : kind === 'life' ? [16, 18] : [13, 16];
    const pad = kind === 'molar' || kind === 'gold' ? 1.8 : 1.15;
    const w = size[0] * pad, h = size[1] * pad;
    const [c, x] = mk(w, h); x.translate(w / 2, h / 2);
    drawTooth(x, size[0], size[1], kind);
    return (toothCache[kind] = { c, w, h });
  }

  /* ---------------- enemy bullets ---------------- */
  const BUL = {
    ketchup: ['#ff2a1f', '#ffb0a0', 'drop'],
    mustard: ['#ffd51e', '#fff8c0', 'drop'],
    relish: ['#38c22a', '#c8ff9a', 'chunk'],
    chili: ['#a8331a', '#ff8a4a', 'blob'],
    cheese: ['#ffa51e', '#ffe08a', 'blob'],
    goo: ['#6dff3a', '#e0ffc8', 'blob'],
    grease: ['#ff6a4a', '#ffe0d0', 'chunk'],
    sausage: ['#c8442a', '#ff9a7a', 'link'],
    bomb: ['#ffa51e', '#fff0b0', 'bomb'],
  };
  const bulCache = {};
  function bullet(kind) {
    if (bulCache[kind]) return bulCache[kind];
    const [col, hi, shape] = BUL[kind];
    const r = shape === 'bomb' ? 14 : shape === 'link' ? 9 : 6.5;
    const w = r * 4, h = r * 4;
    const [c, x] = mk(w, h); x.translate(w / 2, h / 2);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r * 2);
    g.addColorStop(0, col + 'cc'); g.addColorStop(0.45, col + '55'); g.addColorStop(1, col + '00');
    x.fillStyle = g; x.fillRect(-w / 2, -h / 2, w, h);
    x.strokeStyle = '#1a0500'; x.lineWidth = 1.4; x.fillStyle = col;
    if (shape === 'drop') {
      x.beginPath(); x.moveTo(0, -r * 1.5); x.quadraticCurveTo(r, -r * 0.2, r * 0.8, r * 0.4);
      x.arc(0, r * 0.4, r * 0.8, 0, Math.PI); x.quadraticCurveTo(-r, -r * 0.2, 0, -r * 1.5); x.fill(); x.stroke();
      x.fillStyle = hi; x.beginPath(); x.arc(-r * 0.3, r * 0.2, r * 0.25, 0, 7); x.fill();
    } else if (shape === 'chunk') {
      x.save(); x.rotate(0.4); rr(x, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, 2); x.fill(); x.stroke();
      x.fillStyle = hi; x.fillRect(-r * 0.5, -r * 0.5, r * 0.5, r * 0.4); x.restore();
    } else if (shape === 'link') {
      rr(x, -r * 0.55, -r, r * 1.1, r * 2, r * 0.55); x.fill(); x.stroke();
      x.strokeStyle = hi; x.beginPath(); x.moveTo(-r * 0.2, -r * 0.6); x.lineTo(-r * 0.2, r * 0.5); x.stroke();
    } else {
      x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.stroke();
      if (shape === 'bomb') { x.fillStyle = '#d07000'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(Math.cos(i * 1.3) * r * 0.5, Math.sin(i * 1.3) * r * 0.5, r * 0.15, 0, 7); x.fill(); } }
      x.fillStyle = hi; x.beginPath(); x.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, 7); x.fill();
    }
    return (bulCache[kind] = { c, w, h, r: shape === 'bomb' ? 11 : shape === 'link' ? 7 : 5 });
  }

  /* ---------------- power-up badges ---------------- */
  function icon(x, type, s) {
    const T = (kind, dx, dy, k) => { x.save(); x.translate(dx, dy); x.scale(k, k); drawTooth(x, 11, 14, kind); x.restore(); };
    switch (type) {
      case 'machine': T('tooth', -6, 1, 0.7); T('tooth', 0, -2, 0.7); T('tooth', 6, 1, 0.7);
        x.strokeStyle = '#ff3df2'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-8, 8); x.lineTo(8, 8); x.stroke(); break;
      case 'golden': T('gold', 0, 0, 1.05); break;
      case 'floss':
        x.fillStyle = '#e8fff8'; x.strokeStyle = '#0a4a3a'; x.lineWidth = 1.5;
        rr(x, -9, -7, 18, 14, 4); x.fill(); x.stroke();
        x.strokeStyle = '#4dffd2'; x.lineWidth = 2; x.beginPath(); x.moveTo(6, 0); x.quadraticCurveTo(12, -8, 14, 2); x.stroke();
        x.fillStyle = '#0a4a3a'; x.font = 'bold 7px monospace'; x.textAlign = 'center'; x.fillText('FL', 0, 3); break;
      case 'braces': T('tooth', 0, 0, 1);
        x.fillStyle = '#9aa6b8'; x.fillRect(-7, -2, 14, 3); x.fillStyle = '#e0e8f0'; x.fillRect(-2.5, -3.5, 5, 6); break;
      case 'wash':
        x.fillStyle = '#3dc8ff'; x.strokeStyle = '#05334a'; x.lineWidth = 1.5;
        rr(x, -6, -4, 12, 13, 3); x.fill(); x.stroke();
        x.fillStyle = '#e8f8ff'; x.fillRect(-3, -9, 6, 5); x.strokeRect(-3, -9, 6, 5);
        x.fillStyle = '#bff0ff'; x.fillRect(-4, 0, 3, 6); break;
      case 'double':
        x.fillStyle = '#ff7fa8'; x.strokeStyle = '#5a0a2a'; x.lineWidth = 1.2;
        rr(x, -10, -8, 20, 5, 2.5); x.fill(); x.stroke(); rr(x, -10, 4, 20, 5, 2.5); x.fill(); x.stroke();
        x.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) { x.fillRect(-8 + i * 4.3, -3.5, 3.5, 3.4); x.fillRect(-8 + i * 4.3, 0.6, 3.5, 3.4); } break;
      case 'molar': T('molar', 0, 0, 0.45); break;
      case 'sugar':
        x.fillStyle = '#ff4fa0'; x.strokeStyle = '#5a0a2a'; x.lineWidth = 1.2;
        x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); x.stroke();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, 3.4, 0.2, 2.6); x.fill();
        x.fillStyle = '#ffd51e';
        x.beginPath(); x.moveTo(-6, 0); x.lineTo(-12, -5); x.lineTo(-12, 5); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(6, 0); x.lineTo(12, -5); x.lineTo(12, 5); x.closePath(); x.fill(); x.stroke(); break;
    }
  }
  const pwCache = {};
  function power(type, color) {
    if (pwCache[type]) return pwCache[type];
    const w = 40, h = 40;
    const [c, x] = mk(w, h); x.translate(w / 2, h / 2);
    const g = x.createRadialGradient(0, 0, 8, 0, 0, 20);
    g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00');
    x.fillStyle = g; x.fillRect(-20, -20, 40, 40);
    x.fillStyle = '#12082a'; x.strokeStyle = color; x.lineWidth = 2.5;
    x.beginPath(); x.arc(0, 0, 15, 0, 7); x.fill(); x.stroke();
    x.strokeStyle = '#ffffff55'; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, 12.5, 3.6, 5.2); x.stroke();
    icon(x, type, 1);
    return (pwCache[type] = { c, w, h });
  }

  /* ---------------- player ---------------- */
  function makePlayer(img, w, h) {
    const pad = 6;
    const [c, x] = mk(w + pad * 2, h + pad * 2);
    // neon outline: silhouette stamped in 8 directions
    const [sc, sx] = mk(w, h);
    sx.drawImage(img, 0, 0, w, h);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#3df9ff'; sx.fillRect(0, 0, w, h);
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      x.drawImage(sc, pad + Math.cos(ang) * 2.2, pad + Math.sin(ang) * 2.2, w, h);
    }
    x.globalAlpha = 0.5;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + 0.4;
      x.drawImage(sc, pad + Math.cos(ang) * 4, pad + Math.sin(ang) * 4, w, h);
    }
    x.globalAlpha = 1;
    x.drawImage(img, pad, pad, w, h);
    const [wc, wx] = mk(w + pad * 2, h + pad * 2);
    wx.drawImage(c, 0, 0, w + pad * 2, h + pad * 2);
    wx.globalCompositeOperation = 'source-atop'; wx.fillStyle = 'rgba(255,255,255,0.8)'; wx.fillRect(0, 0, w + pad * 2, h + pad * 2);
    return { c, flash: wc, w: w + pad * 2, h: h + pad * 2, pad };
  }
  function makeHead(img, size) {
    const sh = img.naturalHeight * 0.6, sw = img.naturalWidth;
    const h = size, w = size * sw / sh;
    const [c, x] = mk(w, h);
    x.drawImage(img, 0, 0, sw, sh, 0, 0, w, h);
    return { c, w, h };
  }

  return { dog, tooth, bullet, power, makePlayer, makeHead, BUL };
})();
