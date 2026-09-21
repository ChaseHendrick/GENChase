
/* modules/fput.js */
/* GENChase: Fermi-Pasta-Ulam-Tsingou chain. Energy that was supposed to thermalise comes back. Recurrence of mode 1 is measured. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Chain', 'alpha', 'Nonlinearity α', GEOM, 0, 0.45, 0.01, f2),
    RANGE('Chain', 'periods', 'Periods kept', GEOM, 40, 220, 10, v => v + ''),
    RANGE('Chain', 'dt', 'Step dt', GEOM, 0.02, 0.12, 0.005, f3),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '4:5', alpha: 0.22, periods: 120, dt: 0.05, view: 'int', exposure: 1 };
  const PRESETS = {
    recur: pre('Recurrence', { alpha: 0.22, periods: 140 }, Pal.harbor),
    linear: pre('Linear', { alpha: 0, periods: 80 }, Pal.graphite),
    strong: pre('Strong α', { alpha: 0.38, periods: 160 }, Pal.ember),
    long: pre('Long run', { periods: 200, alpha: 0.18 }, Pal.nightshade),
    fine: pre('Fine step', { dt: 0.03, alpha: 0.2 }, Pal.glacier),
    thermal: pre('Toward thermal', { alpha: 0.42, periods: 200 }, Pal.thermal),
  };

  function surprise(rng) { return { alpha: rng.range(0.08, 0.36), periods: rng.int(80, 180) }; }
  function sanitize(s) { s.grid = Math.max(48, Math.min(128, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'fput', name: 'FPUT Recurrence', tab: 'FPUT',
    subtitle: 'a chain that refuses to thermalise · 1955',
    order: 53,
    equation: 'ẍ_i = (q_{i+1}-2q_i+q_{i-1}) + α[(q_{i+1}-q_i)²-(q_i-q_{i-1})²],   E_1(t) returns',
    credit: 'Fermi, Pasta, Ulam and Tsingou, Los Alamos report LA-1940 (1955). A weakly nonlinear string, started in one Fourier mode, was expected to thermalise. It did not: the energy came back. Zabusky and Kruskal (1965) met the soliton in the continuum limit. The plate is spacetime of the displacements, with the first-mode energy measured against its start.',
    blurb: 'Put all the energy in one mode of a weakly nonlinear string. Equipartition says it should leak into every mode and stay there. On the first computers it came back instead. The plate is that recurrence. The status line reports how close E1 returns to its start, against 1 for a perfect revival and 1/N for a thermal soup.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: 'α = 0 is a linear string and recurs exactly. Too much α heats. The original run used 32 masses.' },
    palette: true, defaultPalette: 'harbor', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');

        const N = W, T = H, a = s.alpha, dt = s.dt;
        const q = new Float64Array(N), v = new Float64Array(N);
        for (let i = 1; i < N - 1; i++) q[i] = Math.sin(Math.PI * i / (N - 1));
        function acc(i) {
          const L = q[i] - q[i - 1], R = q[i + 1] - q[i];
          return (q[i + 1] - 2 * q[i] + q[i - 1]) + a * (R * R - L * L);
        }
        function mode1() {
          let s1 = 0;
          for (let i = 1; i < N - 1; i++) s1 += q[i] * Math.sin(Math.PI * i / (N - 1));
          return (2 / (N - 1)) * s1;
        }
        const e0 = mode1(); let eMin = 1, eLast = 1;
        const nInner = Math.max(1, Math.round(0.35 / dt));
        for (let y = 0; y < T; y++) {
          for (let k = 0; k < nInner; k++) {
            for (let i = 1; i < N - 1; i++) v[i] += dt * acc(i);
            for (let i = 1; i < N - 1; i++) q[i] += dt * v[i];
          }
          const e = mode1() / (e0 || 1);
          if (y > T * 0.15 && Math.abs(e) < eMin) eMin = Math.abs(e);
          eLast = e;
          for (let x = 0; x < N; x++) field[y * N + x] = q[x];
        }
        extra = eMin;
        metric = Math.abs(eLast);

        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }


      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) { const v = field[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = (hi - lo) || 1, logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          let t = (field[i] - lo) / span;
          if (logv) t = Math.log(1.001 + 9 * Math.max(0, t)) / Math.log(10);
          t = U.clamp(t * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() { host.setStatus('<span>E1 last / E1(0) <b>' + f2(metric) + '</b></span><span>deepest dip <b>' + f2(extra) + '</b></span><span>' + (metric > 0.45 ? 'recurred' : (extra < 0.2 ? 'leaked' : 'in transit')) + '</span>'); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };

    },
  });
})();
