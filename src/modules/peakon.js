
/* modules/peakon.js */
/* GENChase: Camassa–Holm peakons. Speed equals amplitude. Exact collisions. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Spectral data: speeds c_k > 0. λ_k = 1/c_k. Lundmark (arXiv:1807.01910) form of
  // Beals–Sattinger–Szmigielski, matching u = Σ m_i exp(−|x − x_i|) so that speed = amplitude.
  const KINDS = {
    one: { c: [1.45], label: 'one peakon' },
    two: { c: [1.85, 0.95], label: 'two-peakon collision' },
    three: { c: [2.15, 1.35, 0.72], label: 'three peakons' },
    train: { c: [1.90, 1.42, 1.05, 0.68], label: 'peaked train' },
    overtake: { c: [2.55, 0.58], label: 'overtaking' },
    rest: { c: [0.28], label: 'rest' },
  };

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 256, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Peakons', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['one', 'One'], ['two', 'Two'], ['three', 'Three'], ['train', 'Train'], ['overtake', 'Overtake'], ['rest', 'Rest']] },
    { group: 'Peakons', key: 'slice', label: 'Slice', type: 'seg', kind: GEOM, options: [['space', 'Spacetime'], ['shot', 'Snapshot']] },
    { group: 'Peakons', key: 'frame', label: 'Frame', type: 'seg', kind: GEOM, options: [['cm', 'CM'], ['lab', 'Lab']] },
    RANGE('Peakons', 't', 'Time t', LIVE, -6, 6, 0.05, f2, { hint: 't = 0 is closest approach for equal spectral weights. Incoming train at t < 0, outgoing at t > 0.' }),
    RANGE('Peakons', 'sep', 'Separation', GEOM, -2.4, 2.4, 0.05, f2, { hint: 'Log-ratio of the BSS weights. Zero bunches the collision at t = 0. Positive holds an incoming train.' }),
    RANGE('Field', 'zoom', 'View', GEOM, 0.4, 2.2, 0.05, f2),
    { group: 'Peakons', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['field', 'Height'], ['log', 'Log'], ['shade', 'Relief'], ['profile', 'Profile']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = {
    grid: 192, aspect: '1:1', kind: 'two', slice: 'space', frame: 'cm',
    t: 0, sep: 0, running: false, zoom: 1.0, view: 'field', exposure: 1.05,
  };
  const PRESETS = {
    one: pre('One peakon', { kind: 'one', slice: 'shot', frame: 'lab', t: 0, sep: 0, zoom: 1.55, view: 'profile' }, Pal.ember),
    collide: pre('Two-peakon collision', { kind: 'two', slice: 'shot', frame: 'cm', t: -2.15, sep: 0, zoom: 1.35, view: 'profile' }, Pal.nightshade),
    three: pre('Three', { kind: 'three', slice: 'shot', frame: 'cm', t: -2.4, sep: 0.35, zoom: 1.05, view: 'profile' }, Pal.thermal),
    spacetime: pre('Spacetime', { kind: 'two', slice: 'space', frame: 'cm', t: 0, sep: 0, zoom: 0.9, view: 'field' }, Pal.ember),
    rest: pre('Rest', { kind: 'rest', slice: 'space', frame: 'lab', t: 0, sep: 0, zoom: 1.05, view: 'field' }, Pal.glacier),
    overtake: pre('Overtaking', { kind: 'overtake', slice: 'space', frame: 'cm', t: 0, sep: 0, zoom: 0.8, view: 'field' }, Pal.bioluminescent),
    train: pre('Peaked train', { kind: 'train', slice: 'shot', frame: 'lab', t: -4.2, sep: 1.1, zoom: 0.95, view: 'profile' }, Pal.xray),
  };

  function surprise(rng) {
    return {
      kind: rng.pick(['one', 'two', 'two', 'three', 'train', 'overtake', 'rest']),
      slice: rng.pick(['space', 'space', 'shot']),
      frame: rng.pick(['cm', 'cm', 'lab']),
      t: rng.range(-2.8, 2.2),
      sep: rng.range(-0.4, 1.2),
      zoom: rng.range(0.65, 1.25),
      view: rng.pick(['field', 'field', 'shade', 'profile', 'log']),
    };
  }
  function sanitize(s) {
    s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16));
    if (!KINDS[s.kind]) s.kind = 'two';
    if (s.slice !== 'shot') s.slice = 'space';
    if (s.frame !== 'lab') s.frame = 'cm';
    if (s.view !== 'log' && s.view !== 'shade' && s.view !== 'profile') s.view = 'field';
  }

  function combos(n, k) {
    const out = [];
    (function rec(start, cur) {
      if (cur.length === k) { out.push(cur.slice()); return; }
      for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); }
    })(0, []);
    return out;
  }

  // log Δ_k^a = log Σ_{|I|=k} Vand(λ_I)^2 Π_{i in I} λ_i^a b_i
  function logDelta(k, a, lam, logb) {
    const N = lam.length;
    if (k === 0) return 0;
    if (k < 0 || k > N) return -Infinity;
    const cs = combos(N, k);
    const logs = new Float64Array(cs.length);
    let m = -Infinity;
    for (let s = 0; s < cs.length; s++) {
      const I = cs[s];
      let logt = 0;
      for (let r = 0; r < k; r++) {
        const i = I[r];
        if (a !== 0) logt += a * Math.log(Math.abs(lam[i]));
        logt += logb[i];
      }
      for (let p = 0; p < k; p++) {
        for (let q = p + 1; q < k; q++) {
          const d = lam[I[q]] - lam[I[p]];
          if (d === 0) { logt = -Infinity; break; }
          logt += 2 * Math.log(Math.abs(d));
        }
      }
      logs[s] = logt;
      if (logt > m) m = logt;
    }
    if (!(m > -1e200)) return -Infinity;
    let sum = 0;
    for (let s = 0; s < logs.length; s++) sum += Math.exp(logs[s] - m);
    return m + Math.log(sum);
  }

  function peakonsAt(speeds, t, sep) {
    const N = speeds.length;
    const lam = new Float64Array(N);
    const logb = new Float64Array(N);
    for (let k = 0; k < N; k++) {
      const c = speeds[k];
      lam[k] = 1 / c;
      logb[k] = sep * k + c * t;
    }
    const x = new Float64Array(N);
    const m = new Float64Array(N);
    for (let k = 1; k <= N; k++) {
      const l0 = logDelta(k, 0, lam, logb);
      const l2 = logDelta(k - 1, 2, lam, logb);
      const l1 = logDelta(k, 1, lam, logb);
      const l1m = logDelta(k - 1, 1, lam, logb);
      x[N - k] = l0 - l2;
      m[N - k] = Math.exp(l0 + l2 - l1 - l1m);
    }
    return { x, m, c: speeds, N };
  }

  function uOf(pk, x) {
    let s = 0;
    for (let i = 0; i < pk.N; i++) s += pk.m[i] * Math.exp(-Math.abs(x - pk.x[i]));
    return s;
  }
  // One-sided derivatives: at a peak the classical derivative jumps. sgn(0) = 0, so
  // this is the average of the two sides (zero) exactly on a single peakon crest.
  function uxOf(pk, x) {
    let s = 0;
    for (let i = 0; i < pk.N; i++) {
      const d = x - pk.x[i];
      const sgn = d > 0 ? 1 : d < 0 ? -1 : 0;
      s += -pk.m[i] * sgn * Math.exp(-Math.abs(d));
    }
    return s;
  }

  function meanSpeed(speeds) {
    let s = 0;
    for (let i = 0; i < speeds.length; i++) s += speeds[i];
    return s / speeds.length;
  }

  // Home offset so the t = 0 collision sits at x = 0. Fixed across time, so worldlines drift
  // only by the frame choice (lab vs mean-speed).
  function homeOffset(speeds, sep) {
    const pk = peakonsAt(speeds, 0, sep);
    return 0.5 * (pk.x[0] + pk.x[pk.N - 1]);
  }

  function placed(speeds, t, sep, frame, off, centerNow) {
    const pk = peakonsAt(speeds, t, sep);
    if (off == null) off = homeOffset(speeds, sep);
    const V = frame === 'cm' ? meanSpeed(speeds) : 0;
    for (let i = 0; i < pk.N; i++) pk.x[i] -= off + V * t;
    if (centerNow && pk.N) {
      const mid = 0.5 * (pk.x[0] + pk.x[pk.N - 1]);
      for (let i = 0; i < pk.N; i++) pk.x[i] -= mid;
    }
    pk.V = V;
    return pk;
  }

  function argmaxU(pk, lo, hi, n) {
    n = n || 1600;
    let bestX = lo, bestU = -Infinity;
    const dx = (hi - lo) / n;
    for (let i = 0; i <= n; i++) {
      const x = lo + i * dx;
      const u = uOf(pk, x);
      if (u > bestU) { bestU = u; bestX = x; }
    }
    let h = dx;
    for (let k = 0; k < 12; k++) {
      const uL = uOf(pk, bestX - h), uR = uOf(pk, bestX + h);
      if (uL > bestU) { bestX -= h; bestU = uL; }
      else if (uR > bestU) { bestX += h; bestU = uR; }
      h *= 0.5;
    }
    return { x: bestX, u: bestU, dx: h };
  }

  function fieldH1(pk, n) {
    const mid = 0.5 * (pk.x[0] + pk.x[pk.N - 1]);
    const lo = mid - 22, hi = mid + 22;
    n = n || 1400;
    const dx = (hi - lo) / n;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const x = lo + (i + 0.5) * dx;
      const u = uOf(pk, x);
      const ux = uxOf(pk, x);
      acc += u * u + ux * ux;
    }
    return acc * dx;
  }

  // Particle formula: for one peakon ∫(u² + u_x²) dx = 2 c², and Σ_{i,j} m_i m_j e^{-|xi-xj|} = c²,
  // so the integral equals 2 Σ_{i,j} m_i m_j exp(−|x_i − x_j|).
  function particleH1(pk) {
    let s = 0;
    for (let i = 0; i < pk.N; i++) for (let j = 0; j < pk.N; j++) s += pk.m[i] * pk.m[j] * Math.exp(-Math.abs(pk.x[i] - pk.x[j]));
    return 2 * s;
  }

  function probe(speeds, sep) {
    // Single-peakon speed from the sampled field, not from x_i(t) by construction.
    const c = 1.25;
    const one = [c];
    const dt = 0.8;
    const a = peakonsAt(one, 0, 0);
    const b = peakonsAt(one, dt, 0);
    const pa = argmaxU(a, -4, 8, 2400);
    const pb = argmaxU(b, -4, 8, 2400);
    const v = (pb.x - pa.x) / dt;
    const vRatio = v / c;
    const sigmaV = Math.hypot(pa.dx, pb.dx) / dt / c;

    const q = pa.x;
    const h = 0.008;
    const u0 = uOf(a, q);
    const dL = (u0 - uOf(a, q - h)) / h;
    const dR = (uOf(a, q + h) - u0) / h;
    const cL = dL / c, cR = dR / c;

    // Two-time H1 of the plate's own peakons, sampled from u, against the particle formula.
    const t0 = -2.4, t1 = 2.4;
    const p0 = peakonsAt(speeds, t0, sep);
    const p1 = peakonsAt(speeds, t1, sep);
    const H0 = fieldH1(p0);
    const H1t = fieldH1(p1);
    const Hth = particleH1(p0);
    const hRatio = Hth > 1e-12 ? H0 / Hth : 0;
    const hCons = H0 > 1e-12 ? H1t / H0 : 0;
    return { vRatio, sigmaV, cL, cR, hRatio, hCons, c, dL, dR };
  }

  Studio.register({
    id: 'peakon', name: 'Peakon', tab: 'Peakon',
    subtitle: 'Camassa–Holm peaked traveling waves · 1993',
    order: 112,
    equation: 'u_t − u_xxt + 3 u u_x = 2 u_x u_xx + u u_xxx,   u = Σ m_i e^{−|x−x_i|},   m = u − u_xx',
    credit: 'The Camassa–Holm equation and the peakon u = c exp(−|x − c t|) are R. Camassa and D. D. Holm, Phys. Rev. Lett. 71, 1661 (1993). Multi-peakon collisions, including the Stieltjes / Hankel closed form used here, are R. Beals, D. H. Sattinger and J. Szmigielski, Inverse Problems 15, L1 (1999) and Adv. Math. 154, 229 (2000). This plate evaluates that exact N-peakon formula. It is not a new soliton.',
    blurb: 'A KdV soliton is smooth. The Camassa–Holm peakon is a traveling corner: u = c exp(−|x − c t|), and the speed is the height. Two of them collide exactly. They pass through each other and pick up a phase shift; the peak stays a corner, never rounding. The plate is the Beals–Sattinger–Szmigielski formula, not an integrator. The speed and crest-slope status values are a separate single-peakon control at c=1.25, not a measurement of the displayed multi-peakon collision. The H1 ratio samples the selected spectral family at t=-2.4 and t=2.4. If this were the wrong PDE, or the wrong exponential, both would fail.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Peakons: 'One is the traveling corner, speed = amplitude. Two and Three are exact collisions. Train is an incoming peaked rank. Overtake is a tall peakon catching a short one. Rest is a slow peakon, almost a standing crease. Spacetime (x across, t up) is the collision as worldlines.',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    headline: 't', headlineLabel: 't',
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = null, kindLabel = 'peakon', buf, img, raf = 0, last = 0;

      function sizeFrom(s, wpx, hpx) {
        const a = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        if (wpx && hpx) return { W: wpx, H: hpx };
        return { W: g, H: Math.max(64, Math.round(g * a)) };
      }
      function specOf(s) {
        const spec = KINDS[s.kind] || KINDS.two;
        return spec;
      }
      function fill(s, WW, HH, out) {
        const spec = specOf(s);
        const speeds = spec.c;
        const sep = s.sep;
        const t0 = s.t;
        const L = 14 / Math.max(0.25, s.zoom);
        const T = 9 / Math.max(0.25, s.zoom);
        const frame = s.frame;
        const slice = s.slice;
        const off = homeOffset(speeds, sep);
        let umax = 0;
        for (let y = 0; y < HH; y++) {
          const t = slice === 'space' ? t0 + (0.5 - (y + 0.5) / HH) * 2 * T : t0;
          const pk = placed(speeds, t, sep, frame, off, slice === 'shot');
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * 2 * L;
            const u = uOf(pk, xx);
            out[y * WW + x] = u;
            if (u > umax) umax = u;
          }
        }
        metric = probe(speeds, sep);
        kindLabel = spec.label;
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
        const uMax = Math.max(hi, 1e-9);
        for (let i = 0; i < field.length; i++) {
          const x = i % W, y = (i / W) | 0;
          let tv = (field[i] - lo) / spanv;
          if (view === 'log') tv = Math.log(1.001 + 18 * Math.max(0, tv)) / Math.log(19);
          if (view === 'shade') {
            const xm = x > 0 ? field[i - 1] : field[i];
            const xp = x + 1 < W ? field[i + 1] : field[i];
            const ym = y > 0 ? field[i - W] : field[i];
            const yp = y + 1 < H ? field[i + W] : field[i];
            const nx = (xm - xp), ny = (ym - yp);
            const sh = 0.5 + 0.5 * (nx * 0.55 + ny * 0.85) / (spanv * 2.4 + 1e-6);
            // Modulate height by relief so the far field stays dark. Additive shade on a
            // sparse peakon plate washed the ground to mid-gray and hid the corner.
            tv = U.clamp(tv * (0.28 + 0.95 * sh), 0, 1);
          }
          if (view === 'profile') {
            // Filled skyline of u(x) at this column. For spacetime this is a time-stack of profiles.
            const yb = 1 - (y + 0.5) / H;
            const hgt = 0.07 + 0.86 * (field[i] / uMax);
            const edge = U.smoothstep(hgt - 2.2 / H, hgt + 0.8 / H, yb);
            const fillv = yb <= hgt ? 0.55 + 0.45 * (yb / Math.max(hgt, 1e-6)) : 0;
            const crest = Math.exp(-((yb - hgt) * H) * ((yb - hgt) * H) * 0.55);
            tv = U.clamp(Math.max(fillv * (1 - 0.35 * edge), 0.9 * crest * (yb > hgt - 3 / H ? 1 : 0)), 0, 1);
            if (yb < 0.03) tv = Math.max(tv, 0.18);
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
        const m = metric || { vRatio: NaN, sigmaV: NaN, cL: NaN, cR: NaN, hCons: NaN };
        const vFail = !(Math.abs(m.vRatio - 1) < 0.05);
        const cornerOk = m.cL > 0.7 && m.cR < -0.7 && Math.abs(Math.abs(m.cL) - 1) < 0.12 && Math.abs(Math.abs(m.cR) - 1) < 0.12;
        const hOk = Math.abs(m.hCons - 1) < 0.03;
        // The single-peakon control reads speed and crest slopes off u = c exp(-|x - c t|), which builds
        // speed = amplitude and slopes of +/-c in: those agree by construction. The H1 ratio is a
        // deterministic quadrature of the plate's own multi-peakon field at two times.
        host.setStatus(
          U.stats.compare({ label: 'single-peakon control v/c', measured: m.vRatio, expected: 1, reference: 'closed form', basis: 'construction', digits: 4, note: vFail ? 'miss' : '' }) +
          U.stats.compare({ label: 'control slope/c L', measured: m.cL, expected: 1, reference: 'closed form', basis: 'construction', digits: 3 }) +
          U.stats.compare({ label: 'control slope/c R', measured: m.cR, expected: -1, reference: 'closed form', basis: 'construction', digits: 3, note: cornerOk ? '' : 'not a corner' }) +
          U.stats.compare({ label: 'H1(t+)/H1(t-)', measured: m.hCons, expected: 1, reference: 'H¹ conservation', basis: 'deterministic', digits: 4, note: hOk ? 'conserved' : 'drifted' }) +
          '<span>' + kindLabel + '</span>'
        );
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        s.t = ((s.t + dt * 0.42 + 6) % 12) - 6;
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
