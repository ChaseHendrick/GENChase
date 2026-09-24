
/* modules/spinice.js */
/* GENChase: 2D square ice. Vertices obey (or break) the two-in/two-out rule. Ice-rule defects are emergent magnetic monopoles. Charge density is measured from the plate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Lattice', 'grid', 'Vertices', GEOM, 48, 192, 8, v => v + ''),
    { group: 'Lattice', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Ice', 'J', 'Vertex J', LIVE, 0.2, 4, 0.05, f2, { hint: 'Energy is J Σ Q² / 2. Large J enforces the ice rule. Monopoles cost 2J.' }),
    RANGE('Ice', 'temp', 'Temperature', LIVE, 0.05, 3.2, 0.05, f2),
    RANGE('Ice', 'field', 'Field h', LIVE, -1.2, 1.2, 0.05, f2),
    RANGE('Dynamics', 'warmup', 'Warm-up', GEOM, 0, 4000, 50, v => v + ''),
    { group: 'Dynamics', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Seed', key: 'init', label: 'Seed', type: 'seg', kind: GEOM, options: [['ice', 'Ice manifold'], ['ferro', 'All right/up'], ['noise', 'Hot'], ['pair', 'Monopole pair']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['charge', 'Charge Q'], ['ice', 'Ice rule'], ['mx', 'm_x'], ['my', 'm_y']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 96, aspect: '1:1',
    J: 1.6, temp: 0.55, field: 0,
    warmup: 800, running: true,
    init: 'ice', view: 'charge', exposure: 1,
  };

  const PRESETS = {
    cold: pre('Almost ice', { J: 2.0, temp: 0.45, init: 'ice', running: true, view: 'charge' }, Pal.glacier),
    plasma: pre('Monopole plasma', { J: 0.9, temp: 1.6, init: 'noise', running: true, view: 'charge' }, Pal.thermal),
    pair: pre('A pair', { init: 'pair', J: 2.4, temp: 0.08, warmup: 0, running: false, view: 'mx' }, Pal.ember),
    ice: pre('Ice map', { J: 1.6, temp: 0.7, view: 'ice', init: 'ice', running: true }, Pal.harbor),
    flow: pre('Polarised', { field: 0.7, J: 1.4, temp: 0.5, running: true, view: 'mx' }, Pal.nightshade),
    quench: pre('Quench', { init: 'noise', J: 1.7, temp: 0.7, warmup: 200, running: true, view: 'charge' }, Pal.kiln),
    stripes: pre('m_y', { view: 'my', J: 1.3, temp: 0.6, init: 'ice', running: true }, Pal.verdigris),
  };

  function surprise(rng) {
    return {
      J: rng.range(0.8, 2.6),
      temp: rng.range(0.2, 1.4),
      init: rng.pick(['ice', 'ice', 'noise', 'pair']),
      view: rng.pick(['charge', 'charge', 'ice', 'mx']),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(48, Math.min(192, Math.round(s.grid / 8) * 8));
    s.temp = Math.max(0.04, s.temp);
  }

  Studio.register({
    id: 'spinice',
    name: 'Spin Ice',
    tab: 'Spin ice',
    subtitle: 'square ice, emergent monopoles · 1935 / 2008',
    order: 46,
    equation: 'E = (J/2) Σ_v Q_v² − h Σ σ,   Q_v = n_in − 2,   ice: Q = 0',
    credit: 'Linus Pauling, J. Am. Chem. Soc. 57, 2680 (1935), counted the residual entropy of ice. Castelnovo, Moessner and Sondhi, Nature 451, 42 (2008), showed that the same two-in/two-out rule on a pyrochlore magnet fractionalises a dipole into a pair of magnetic monopoles. The plate is square ice, the 2-D vertex model, not a 3-D crystal of Dy₂Ti₂O₇.',
    blurb: 'Dirac argued an isolated magnetic charge has never been seen. Spin ice does not wait for one. Four arrows meet at a vertex; the ice rule asks two in and two out, which is Q = 0. Flip one arrow and you create a Q = +1 and a Q = −1 that can walk apart. They interact like Coulomb charges on the lattice. The plate is that vertex field. The status line reports how many vertices still obey the ice rule, and the monopole density against e^{−2J/T} at low temperature.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Picture'],
    hints: {
      Ice: 'Temperature in units of J. Below about 0.4 J the plasma freezes into a dilute gas of monopole pairs. A field polarises the ice and can pull a pair apart.',
    },
    palette: true,
    defaultPalette: 'glacier',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, hx, hy, Q, iceFrac = 0, rho = 0, step = 0, buf, img;
      let raf = 0, paused = false, lastKey = '';

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(32, Math.round(g * aspect)) };
      }
      const iH = (x, y) => y * W + (x + W) % W;
      const iV = (x, y) => ((y + H) % H) * W + (x + W) % W;

      function charges() {
        const N = W * H;
        if (!Q || Q.length !== N) Q = new Int8Array(N);
        let ice = 0, mon = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const inL = hx[iH(x - 1, y)] === 1 ? 1 : 0;
            const inD = hy[iV(x, y - 1)] === 1 ? 1 : 0;
            const inR = hx[iH(x, y)] === -1 ? 1 : 0;
            const inU = hy[iV(x, y)] === -1 ? 1 : 0;
            const q = inL + inR + inU + inD - 2;
            Q[y * W + x] = q;
            if (q === 0) ice++;
            else if (q === 2 || q === -2) mon++;
          }
        }
        iceFrac = ice / N;
        rho = mon / N;
      }

      function vertexEnergy(x, y, J) {
        const inL = hx[iH(x - 1, y)] === 1 ? 1 : 0;
        const inD = hy[iV(x, y - 1)] === 1 ? 1 : 0;
        const inR = hx[iH(x, y)] === -1 ? 1 : 0;
        const inU = hy[iV(x, y)] === -1 ? 1 : 0;
        const q = inL + inR + inU + inD - 2;
        return 0.5 * J * q * q;
      }

      function rebuild() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        const rng = U.makeRng(s.seed + '/ice');
        hx = new Int8Array(W * H);
        hy = new Int8Array(W * H);
        if (s.init === 'ferro' || s.init === 'pair') {
          hx.fill(1); hy.fill(1);
        } else if (s.init === 'noise') {
          for (let i = 0; i < hx.length; i++) {
            hx[i] = rng() < 0.5 ? 1 : -1;
            hy[i] = rng() < 0.5 ? 1 : -1;
          }
        } else {
          // six-vertex ice: pair horizontal then set vertical to restore Q=0
          hx.fill(1);
          hy.fill(1);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              hx[iH(x, y)] = ((x + y) & 1) ? 1 : -1;
              hy[iV(x, y)] = ((x + y) & 1) ? -1 : 1;
            }
          }
        }
        if (s.init === 'pair') {
          const y0 = H >> 1;
          for (let dy = -1; dy <= 1; dy++) {
            const y = (y0 + dy + H) % H;
            for (let x = (W / 6) | 0; x < ((5 * W / 6) | 0); x++) hx[iH(x, y)] *= -1;
          }
        }
        step = 0;
        const warm = s.warmup | 0;
        const nEdge = 2 * W * H;
        for (let k = 0; k < warm; k++) sweep(s, rng, Math.max(64, nEdge >> 3));
        charges();
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function sweep(s, rng, nflip) {
        const J = s.J, T = s.temp, h = s.field;
        for (let n = 0; n < nflip; n++) {
          const horiz = rng() < 0.5;
          const x = rng.int(0, W - 1), y = rng.int(0, H - 1);
          let dE = 0, dH = 0;
          if (horiz) {
            const i = iH(x, y);
            dE -= vertexEnergy(x, y, J) + vertexEnergy((x + 1) % W, y, J);
            hx[i] = -hx[i];
            dE += vertexEnergy(x, y, J) + vertexEnergy((x + 1) % W, y, J);
            dH = -2 * hx[i] * h; // after flip, hx is new; field couples to +x
            if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T)) hx[i] = -hx[i];
          } else {
            const i = iV(x, y);
            dE -= vertexEnergy(x, y, J) + vertexEnergy(x, (y + 1) % H, J);
            hy[i] = -hy[i];
            dE += vertexEnergy(x, y, J) + vertexEnergy(x, (y + 1) % H, J);
            dH = -2 * hy[i] * h;
            if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T)) hy[i] = -hy[i];
          }
          step++;
        }
      }

      function paint(s) {
        if (!hx) return;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#0F1B2D', '#2E86C1', '#F4F6F7'];
        const ramp = U.makeRamp(pal, s.bg || '#0F1B2D');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const view = s.view;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            let t;
            if (view === 'ice') t = Q[i] === 0 ? 0.15 : U.clamp(0.4 + 0.3 * Math.abs(Q[i]) * exp, 0, 1);
            else if (view === 'mx') t = U.clamp(0.5 + 0.5 * 0.5 * (hx[iH(x, y)] + hx[iH(x - 1, y)]) * exp, 0, 1);
            else if (view === 'my') t = U.clamp(0.5 + 0.5 * 0.5 * (hy[iV(x, y)] + hy[iV(x, y - 1)]) * exp, 0, 1);
            else t = U.clamp(0.5 + 0.25 * Q[i] * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0.5);
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#0F1B2D';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      // Both numbers as fractions. e^{−2J/T} is the Boltzmann weight of one defect vertex, not a
      // prediction of the density, and the density is read from one snapshot of a correlated field.
      function status(s) {
        const weight = Math.exp(-2 * s.J / Math.max(0.05, s.temp));
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          '<span>ice <b>' + Math.round(iceFrac * 100) + '%</b></span>' +
          U.stats.compare({ label: 'monopole density', measured: rho, expected: weight, reference: 'Boltzmann weight e^{−2J/T}', basis: 'sampled', digits: 3,
            pending: 'one snapshot; e^{−2J/T} is a vertex weight, not a density' }) +
          '<span>step <b>' + step.toLocaleString() + '</b></span>'
        );
      }

      function loop() {
        raf = 0;
        if (paused || !host.isActive()) return;
        const s = host.getState();
        if (!s.running) { paint(s); return; }
        const rng = U.makeRng(s.seed + '/mc/' + step);
        sweep(s, rng, W * 8);
        charges(); paint(s); status(s);
        raf = requestAnimationFrame(loop);
      }
      function startLoop() {
        if (raf || paused) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        raf = requestAnimationFrame(loop);
      }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() {
          const s = host.getState();
          const key = [s.seed, s.grid, s.aspect, s.init, s.warmup].join('|');
          if (key !== lastKey || !hx) { lastKey = key; stopLoop(); rebuild(); }
          charges(); paint(s); status(s);
          startLoop();
        },
        repaint() { const s = host.getState(); paint(s); status(s); },
        live(key) {
          const s = host.getState();
          if (key === 'running') { if (s.running) startLoop(); else stopLoop(); }
        },
        resize() { const s = host.getState(); if (hx) paint(s); },
        pause() { paused = true; stopLoop(); },
        resume() {
          paused = false;
          const s = host.getState();
          if (hx) { paint(s); status(s); }
          startLoop();
        },
        disturb(p) {
          if (!hx) return;
          const x = Math.floor(p.x * W) % W, y = Math.floor(p.y * H) % H;
          if (p.dx * p.dx + p.dy * p.dy > 1e-6 && Math.abs(p.dx) > Math.abs(p.dy)) hx[iH(x, y)] *= -1;
          else hy[iV(x, y)] *= -1;
          charges();
          const s = host.getState();
          paint(s); status(s);
        },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#0F1B2D';
          g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
