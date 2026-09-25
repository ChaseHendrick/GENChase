
/* modules/kp.js */
/* GENChase: resonant line-soliton webs of KP-II, from the Sato–Hirota tau function. Exact. The picture is Kodama’s, not a private name. */
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

  const KINDS = {
    line: { N: 1, k: [-0.80, 0.90], label: 'line' },
    y: { N: 1, k: [-1.25, -0.05, 1.20], label: 'Y-junction' },
    o: { N: 2, k: [-1.70, -0.50, 0.45, 1.65], label: 'O-type' },
    spider: { N: 2, k: [-2.00, -1.00, -0.05, 0.95, 1.95], label: 'spider' },
    web: { N: 3, k: [-2.20, -1.30, -0.40, 0.40, 1.25, 2.15], label: 'web' },
  };

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 256, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Web', key: 'kind', label: 'Web', type: 'seg', kind: GEOM, options: [['y', 'Y'], ['o', 'O'], ['spider', 'Spider'], ['web', 'Web'], ['line', 'Line']] },
    RANGE('Web', 'span', 'Span', GEOM, 0.55, 1.45, 0.05, f2, { hint: 'Overall scale of the wave numbers k. Larger span is a tighter, taller web.' }),
    RANGE('Web', 't', 'Time t', LIVE, -2.4, 2.4, 0.05, f2, { hint: 'The web expands as |t| grows; morphology is preserved (Horowitz–Zarmi).' }),
    { group: 'Web', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    RANGE('Field', 'zoom', 'View', GEOM, 0.45, 1.8, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['field', 'Height'], ['log', 'Log'], ['shade', 'Relief']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = {
    grid: 192, aspect: '1:1', kind: 'y', span: 1.0, t: 0.0, running: false, zoom: 1.0, view: 'field', exposure: 1.05,
  };
  const PRESETS = {
    y: pre('Y-junction', { kind: 'y', t: 0, span: 1, zoom: 1, view: 'field' }, Pal.ember),
    o: pre('O-type', { kind: 'o', t: 0.15, span: 0.95, zoom: 0.85, view: 'field' }, Pal.nightshade),
    spider: pre('Spider', { kind: 'spider', t: 0.35, span: 0.9, zoom: 0.75, view: 'field' }, Pal.kiln),
    web: pre('Web', { kind: 'web', t: 0.1, span: 0.85, zoom: 0.7, view: 'field' }, Pal.harbor),
    late: pre('Expanded', { kind: 'y', t: 1.6, span: 1, zoom: 0.55, view: 'field' }, Pal.glacier),
    line: pre('One line', { kind: 'line', t: 0, span: 1.1, zoom: 1.1, view: 'field' }, Pal.graphite),
    relief: pre('Relief', { kind: 'spider', t: 0.2, view: 'shade', zoom: 0.8 }, Pal.thermal),
  };

  function surprise(rng) {
    return {
      kind: rng.pick(['y', 'y', 'o', 'spider', 'web']),
      span: rng.range(0.75, 1.25),
      t: rng.range(-0.4, 1.2),
      zoom: rng.range(0.65, 1.15),
      view: rng.pick(['field', 'field', 'log', 'shade']),
    };
  }
  function sanitize(s) {
    s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16));
    if (!KINDS[s.kind]) s.kind = 'y';
  }

  function combos(m, n) {
    const out = [];
    (function rec(start, cur) {
      if (cur.length === n) { out.push(cur.slice()); return; }
      for (let i = start; i < m; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); }
    })(0, []);
    return out;
  }
  function det(A) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const a = A[0][0], b = A[0][1], c = A[0][2];
    const d = A[1][0], e = A[1][1], f = A[1][2];
    const g = A[2][0], h = A[2][1], i = A[2][2];
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }
  function termsOf(s) {
    const spec = KINDS[s.kind] || KINDS.y;
    const span = s.span;
    const ks = spec.k.map(k => k * span);
    const N = spec.N, M = ks.length;
    const A = [];
    for (let i = 0; i < N; i++) {
      const row = [];
      for (let j = 0; j < M; j++) row.push(Math.pow(ks[j], i));
      A.push(row);
    }
    const Ilist = combos(M, N);
    const terms = [];
    for (let c = 0; c < Ilist.length; c++) {
      const I = Ilist[c];
      const AI = [];
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let q = 0; q < N; q++) row.push(A[r][I[q]]);
        AI.push(row);
      }
      let vand = 1;
      for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) vand *= (ks[I[b]] - ks[I[a]]);
      const amp = det(AI) * vand;
      if (!(amp > 0)) continue;
      let kx = 0, ky = 0, kt = 0;
      for (let q = 0; q < N; q++) {
        const k = ks[I[q]];
        kx += k; ky += k * k; kt += k * k * k;
      }
      terms.push({ amp, loga: Math.log(amp), kx, ky, kt });
    }
    const k1 = ks[0], kM = ks[ks.length - 1];
    const peakTh = 0.5 * (kM - k1) * (kM - k1);
    return { terms, spec, ks, peakTh };
  }
  function uAt(terms, x, y, t) {
    const T = terms.length;
    let m = -Infinity;
    const S = new Float64Array(T);
    for (let i = 0; i < T; i++) {
      const tr = terms[i];
      const s = tr.loga + tr.kx * x + tr.ky * y + tr.kt * t;
      S[i] = s;
      if (s > m) m = s;
    }
    let tau = 0, tx = 0, txx = 0;
    for (let i = 0; i < T; i++) {
      const e = Math.exp(Math.max(-40, Math.min(40, S[i] - m)));
      const w = terms[i].amp > 0 ? e : 0;
      // e is exp(S-m) = (amp e^{phase}) / e^m / amp * amp... wait
      // S already includes loga, so exp(S-m) = amp e^{kx x+...} / e^m
      tau += e;
      tx += e * terms[i].kx;
      txx += e * terms[i].kx * terms[i].kx;
    }
    if (tau < 1e-30) return 0;
    const Lx = tx / tau, Lxx = txx / tau - Lx * Lx;
    return 2 * Lxx;
  }
  function hirotaAt(terms, x, y, t) {
    const T = terms.length;
    let tau = 0, tx = 0, txx = 0, txxx = 0, txxxx = 0;
    let ty = 0, tyy = 0, tt = 0, txt = 0;
    for (let i = 0; i < T; i++) {
      const tr = terms[i];
      const e = tr.amp * Math.exp(tr.kx * x + tr.ky * y + tr.kt * t);
      tau += e;
      tx += e * tr.kx;
      txx += e * tr.kx * tr.kx;
      txxx += e * tr.kx * tr.kx * tr.kx;
      txxxx += e * Math.pow(tr.kx, 4);
      ty += e * tr.ky;
      tyy += e * tr.ky * tr.ky;
      tt += e * tr.kt;
      txt += e * tr.kx * tr.kt;
    }
    const Dx4 = 2 * tau * txxxx - 8 * tx * txxx + 6 * txx * txx;
    const DxDt = 2 * tau * txt - 2 * tx * tt;
    const Dy2 = 2 * tau * tyy - 2 * ty * ty;
    return Dx4 - 4 * DxDt + 3 * Dy2;
  }

  Studio.register({
    id: 'kp', name: 'Soliton Web', tab: 'KP',
    subtitle: 'resonant line-soliton webs of the Kadomtsev–Petviashvili equation',
    order: 109,
    equation: '(−4 u_t + u_xxx + 6 u u_x)_x + 3 u_yy = 0,   u = 2 (log τ)_xx,   τ = Σ_I det(A_I) Δ(k_I) e^{Σ θ}',
    credit: 'The KP equation is Kadomtsev and Petviashvili, Sov. Phys. Dokl. 15, 539 (1970). The tau function as a Wronskian of exponentials is Sato and Hirota. Resonant Y-junctions are Miles, J. Fluid Mech. 79, 171 (1977). The classification of the webs by totally nonnegative Grassmannians is Biondini and Chakravarty, J. Math. Phys. 47, 033514 (2006), and Kodama. Asymptotic webs expand and keep their morphology: Horowitz and Zarmi, Physica D 300, 1 (2015). This plate evaluates the exact tau function. It is not a new equation.',
    blurb: 'A one-dimensional soliton is a ridge. In two dimensions the Kadomtsev–Petviashvili equation lets those ridges meet. Miles found they can meet in a Y: two incoming lines become one, amplitudes adding as (k_j − k_i)²/2. Sato’s tau function, a Wronskian of plane waves, makes the whole web exact — O-type boxes, spiders, the hexagonal net — with no integrator. The status line reports the Hirota bilinear residual against 0, and the peak height against the largest line-soliton amplitude in the combinatorial type. If the Wronskian were wrong, both would fail.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Web: 'Y is Miles’ resonant junction, the stem of every larger web. O is the box. Spider and Web are Gr(2,5) and Gr(3,6). Line is the control: one soliton, no junction. Time expands the web without changing its type.',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, kindLabel = 'Y-junction', buf, img, raf = 0, last = 0;
      function sizeFrom(s, wpx, hpx) {
        const a = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        if (wpx && hpx) return { W: wpx, H: hpx };
        return { W: g, H: Math.max(64, Math.round(g * a)) };
      }
      function fill(s, WW, HH, out) {
        const built = termsOf(s);
        const terms = built.terms;
        const L = 13 / Math.max(0.2, s.zoom);
        const t = s.t;
        let umax = 0;
        for (let y = 0; y < HH; y++) {
          const yy = (0.5 - (y + 0.5) / HH) * L * 2 * (HH / WW);
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * L * 2;
            const u = uAt(terms, xx, yy, t);
            out[y * WW + x] = u;
            if (u > umax) umax = u;
          }
        }
        const pts = [[0, 0], [0.8, 0.4], [-0.6, -0.35]];
        let hMax = 0, scale = 0;
        for (let i = 0; i < pts.length; i++) {
          const P = hirotaAt(terms, pts[i][0], pts[i][1], t);
          const tau0 = terms.reduce((a, tr) => a + tr.amp * Math.exp(tr.kx * pts[i][0] + tr.ky * pts[i][1] + tr.kt * t), 0);
          hMax = Math.max(hMax, Math.abs(P));
          scale = Math.max(scale, Math.abs(tau0) * Math.abs(tau0));
        }
        metric = scale > 1e-12 ? hMax / scale : hMax;
        extra = built.peakTh > 1e-12 ? umax / built.peakTh : 0;
        kindLabel = built.spec.label;
        return umax;
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        fill(s, W, H, field);
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }
      function paintBuf() {
        if (!field || !img) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) {
          const v = field[i];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const spanv = (hi - lo) || 1;
        const view = s.view;
        for (let i = 0; i < field.length; i++) {
          let tv = (field[i] - lo) / spanv;
          if (view === 'log') tv = Math.log(1.001 + 12 * Math.max(0, tv)) / Math.log(13);
          if (view === 'shade') {
            const x = i % W, y = (i / W) | 0;
            const xm = x > 0 ? field[i - 1] : field[i];
            const xp = x + 1 < W ? field[i + 1] : field[i];
            const ym = y > 0 ? field[i - W] : field[i];
            const yp = y + 1 < H ? field[i + W] : field[i];
            const nx = (xm - xp), ny = (ym - yp);
            const sh = 0.5 + 0.5 * (nx * 0.6 + ny * 0.8) / (spanv * 2.2 + 1e-6);
            tv = U.clamp(0.35 * tv + 0.65 * sh, 0, 1);
          }
          tv = U.clamp(tv * exp, 0, 1);
          const c = ramp(isFinite(tv) ? tv : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
      }
      function paint() {
        paintBuf();
        if (!buf) return;
        const s = host.getState();
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }
      function status() {
        const ok = metric < 1e-6;
        const dead = extra < 0.12 || extra > 8;
        // Both numbers come from the closed-form tau function with no randomness. The Hirota residual is
        // round-off in the bilinear identity; the peak is read against (k_M − k_1)²/2, the amplitude of
        // the [1,M] line soliton.
        host.setStatus(
          U.stats.compare({ label: 'Hirota residual', measured: metric, expected: 0, reference: 'Hirota identity', basis: 'deterministic' }) +
          U.stats.compare({ label: 'peak / (Δk)²/2', measured: extra, expected: 1, reference: '[1,M] line soliton', basis: 'deterministic', digits: 6 }) +
          '<span>' + (!ok ? 'tau failed' : (dead ? kindLabel + ', flat' : kindLabel)) + '</span>'
        );
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        s.t = ((s.t + dt * 0.35) % 4.8) - 2.4;
        compute(); paint(); status();
        raf = requestAnimationFrame(tick);
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        live(key) {
          if (key === 't' || key === 'running') {
            if (host.getState().running) {
              if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
            } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
            if (key === 't') { compute(); paint(); status(); }
          }
        },
        resize() { paint(); },
        pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } },
        resume() {
          const s = host.getState();
          if (s.running && !host.reducedMotion() && !raf) { last = 0; raf = requestAnimationFrame(tick); }
          else paint();
        },
        async exportPNG(w, ht) {
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = ht;
          const g = c.getContext('2d', { alpha: false });
          const tmp = new Float32Array(w * ht);
          const builtW = W, builtH = H, builtF = field, builtB = buf, builtI = img;
          W = w; H = ht; field = tmp;
          buf = document.createElement('canvas'); buf.width = w; buf.height = ht;
          img = buf.getContext('2d').createImageData(w, ht);
          fill(s, w, ht, tmp);
          paintBuf();
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, ht);
          g.drawImage(buf, 0, 0);
          W = builtW; H = builtH; field = builtF; buf = builtB; img = builtI;
          paint();
          return U.toBlob(c);
        },
      };
    },
  });
})();
