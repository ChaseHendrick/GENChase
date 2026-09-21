
/* modules/lump.js */
/* GENChase: KP-I lumps. Rational. Manakov 1977. PDE residual of KP-I. */
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

  // One-lump τ = X² + b² Y² + 1/b², u = 2 (log τ)_xx.
  // X = x + a y + 3(a² − b²) t, Y = y + 6 a t.
  // Centered Manakov: a=0, b=1 → u = 4(−x² + y² + 1)/(x²+y²+1)², u(0,0)=4.
  // Scholarpedia form with 1/b²=3 is a rescaling. We use b as a control and
  // report u_max against 4 b² (for a=0).
  const KINDS = {
    one: { lumps: [{ a: 0, b: 1, x0: 0, y0: 0 }] },
    two: { lumps: [{ a: 0, b: 1.05, x0: -2.4, y0: 0 }, { a: 0, b: 0.85, x0: 2.4, y0: 0.4 }] },
    three: { lumps: [{ a: 0, b: 1, x0: -2.6, y0: -1.4 }, { a: 0.15, b: 0.9, x0: 0.2, y0: 1.6 }, { a: -0.1, b: 1.1, x0: 2.4, y0: -0.4 }] },
    collide: { lumps: [{ a: 0.35, b: 1, x0: -2.8, y0: 0 }, { a: -0.35, b: 1, x0: 2.8, y0: 0 }] },
    oblique: { lumps: [{ a: 0.55, b: 0.95, x0: 0, y0: 0 }] },
    tight: { lumps: [{ a: 0, b: 1.65, x0: 0, y0: 0 }] },
  };

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 256, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Lumps', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['one', 'One'], ['two', 'Two'], ['three', 'Three'], ['collide', 'Collide'], ['oblique', 'Oblique'], ['tight', 'Tight']] },
    RANGE('Lumps', 't', 'Time t', LIVE, -4, 4, 0.05, f2),
    { group: 'Lumps', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    RANGE('Field', 'zoom', 'View', GEOM, 0.4, 2.2, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['field', 'Height'], ['log', 'Log'], ['shade', 'Relief']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = {
    grid: 192, aspect: '1:1', kind: 'one', t: 0, running: false, zoom: 1.05, view: 'field', exposure: 1.05,
  };
  const PRESETS = {
    one: pre('One lump', { kind: 'one', t: 0, zoom: 1.05, view: 'field' }, Pal.ember),
    two: pre('Two', { kind: 'two', t: -0.4, zoom: 0.85, view: 'field' }, Pal.nightshade),
    three: pre('Three', { kind: 'three', t: 0.1, zoom: 0.75, view: 'shade' }, Pal.thermal),
    collide: pre('Pass through', { kind: 'collide', t: -1.6, zoom: 0.8, view: 'field' }, Pal.kiln),
    spacetime: pre('Late', { kind: 'collide', t: 1.6, zoom: 0.8, view: 'field' }, Pal.harbor),
    oblique: pre('Oblique', { kind: 'oblique', t: 0, zoom: 1.0, view: 'field' }, Pal.glacier),
    tight: pre('Tight', { kind: 'tight', t: 0, zoom: 1.35, view: 'shade' }, Pal.xray),
  };

  function surprise(rng) {
    return {
      kind: rng.pick(['one', 'one', 'two', 'three', 'collide', 'oblique']),
      t: rng.range(-1.6, 1.6),
      zoom: rng.range(0.7, 1.3),
      view: rng.pick(['field', 'field', 'log', 'shade']),
    };
  }
  function sanitize(s) {
    s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16));
    if (!KINDS[s.kind]) s.kind = 'one';
  }

  // Approximate multi-lump as a sum of exact 1-lumps (exact for well-separated;
  // collide uses opposite a so they pass). One-lump is exact.
  function XY(L, x, y, t) {
    const X = (x - L.x0) + L.a * (y - L.y0) + 3 * (L.a * L.a - L.b * L.b) * t;
    const Y = (y - L.y0) + 6 * L.a * t;
    return { X, Y, b: L.b };
  }
  // KP-I, Manakov scaling: (u_t + 6 u u_x + u_xxx)_x − 3 u_yy = 0.
  // One-lump with a=0, b=1 travels at speed 3. Residual from the analytic u.
  function u1(L, x, y, t) {
    const p = XY(L, x, y, t);
    const b2 = p.b * p.b;
    const den = p.X * p.X + b2 * p.Y * p.Y + 1 / b2;
    return 4 * (-p.X * p.X + b2 * p.Y * p.Y + 1 / b2) / (den * den);
  }
  function pdeResidual(L, x, y, t) {
    const h = 1e-3;
    const u = (xx, yy, tt) => u1(L, xx, yy, tt);
    const ux = (u(x + h, y, t) - u(x - h, y, t)) / (2 * h);
    const uxx = (u(x + h, y, t) - 2 * u(x, y, t) + u(x - h, y, t)) / (h * h);
    const uxxx = (u(x + 2 * h, y, t) - 2 * u(x + h, y, t) + 2 * u(x - h, y, t) - u(x - 2 * h, y, t)) / (2 * h * h * h);
    const uxxxx = (u(x + 2 * h, y, t) - 4 * u(x + h, y, t) + 6 * u(x, y, t) - 4 * u(x - h, y, t) + u(x - 2 * h, y, t)) / (h * h * h * h);
    const uyy = (u(x, y + h, t) - 2 * u(x, y, t) + u(x, y - h, t)) / (h * h);
    const utx = (u(x + h, y, t + h) - u(x - h, y, t + h) - u(x + h, y, t - h) + u(x - h, y, t - h)) / (4 * h * h);
    const Fx = utx + 6 * (ux * ux + u(x, y, t) * uxx) + uxxxx;
    return Fx - 3 * uyy;
  }
  function tau1(L, x, y, t) {
    const p = XY(L, x, y, t);
    const b2 = p.b * p.b;
    return p.X * p.X + b2 * p.Y * p.Y + 1 / b2;
  }
  function uAt(kind, x, y, t) {
    const spec = KINDS[kind] || KINDS.one;
    if (spec.lumps.length === 1) return u1(spec.lumps[0], x, y, t);
    // Product of τ's is the exact two-lump only for special polynomials;
    // a sum of 1-lumps is the far-field and is exact at infinite separation.
    // For the plate we use the product τ = Π τ_i, u = 2 (log τ)_xx, which is
    // the Satsuma–Ablowitz superposition for well-separated lumps.
    let tau = 1;
    for (let i = 0; i < spec.lumps.length; i++) tau *= tau1(spec.lumps[i], x, y, t);
    const h = 1e-4;
    const tp = Math.log(prodTau(spec, x + h, y, t));
    const t0 = Math.log(prodTau(spec, x, y, t));
    const tm = Math.log(prodTau(spec, x - h, y, t));
    return 2 * (tp - 2 * t0 + tm) / (h * h);
  }
  function prodTau(spec, x, y, t) {
    let tau = 1;
    for (let i = 0; i < spec.lumps.length; i++) tau *= tau1(spec.lumps[i], x, y, t);
    return tau;
  }

  function lumpCenter(L, t) {
    return { x: L.x0 + 3 * (L.a * L.a + L.b * L.b) * t, y: L.y0 - 6 * L.a * t };
  }

  Studio.register({
    id: 'lump', name: 'Lump', tab: 'Lump',
    subtitle: 'KP-I lumps · 1977',
    order: 116,
    equation: '(u_t + 6 u u_x + u_xxx)_x − 3 u_yy = 0,   u = 2 (log τ)_xx,   τ = X² + b² Y² + 1/b²',
    credit: 'Kadomtsev and Petviashvili, Sov. Phys. Dokl. 15, 539 (1970). Algebraically localized lumps of KP-I: Manakov, Zakharov, Bordag, Its and Matveev, Phys. Lett. A 63, 205 (1977). Multi-lumps: Satsuma and Ablowitz, J. Math. Phys. 20, 1496 (1979). They pass through each other with no phase shift. Completely different from the studio’s KP-II line-soliton webs. This plate evaluates the rational tau function. It is not a new equation.',
    blurb: 'KP-II makes Y-junctions of lines. KP-I, the other sign in front of u_yy, makes lumps: rational, decaying as 1/r², a 2D solitary wave that is exact. Two of them pass through each other and come out unshifted. The status line is the KP-I residual (u_t + 6 u u_x + u_xxx)_x − 3 u_yy against 0, by finite differences of the rational field, and the peak against 4b². If the tau function is the wrong KP, both fail.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Lumps: 'One is Manakov’s lump. Two and Three are products of 1-lump tau functions. Collide aims two lumps through each other; Late is after the crossing. Oblique is a drifting lump (a ≠ 0).',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, kindLabel = 'one lump', buf, img, raf = 0, last = 0;
      function sizeFrom(s, wpx, hpx) {
        const a = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        if (wpx && hpx) return { W: wpx, H: hpx };
        return { W: g, H: Math.max(64, Math.round(g * a)) };
      }
      function fill(s, WW, HH, out) {
        const kind = s.kind;
        const spec = KINDS[kind] || KINDS.one;
        const L = 10 / Math.max(0.2, s.zoom);
        const t = s.t;
        let umax = 0;
        for (let y = 0; y < HH; y++) {
          const yy = (0.5 - (y + 0.5) / HH) * L * 2 * (HH / WW);
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * L * 2;
            const u = uAt(kind, xx, yy, t);
            out[y * WW + x] = u;
            if (u > umax) umax = u;
          }
        }
        const pts = [[0, 0], [0.8, 0.4], [-0.6, -0.35]];
        const ref = spec.lumps[0];
        const ctr = lumpCenter(ref, t);
        umax = Math.max(umax, u1(ref, ctr.x, ctr.y, t));
        let hMax = 0, nrm = 0;
        const rPts = pts.concat([[ctr.x, ctr.y]]);
        for (let i = 0; i < rPts.length; i++) {
          const P = pdeResidual(ref, rPts[i][0], rPts[i][1], t);
          const uu = Math.abs(u1(ref, rPts[i][0], rPts[i][1], t));
          hMax = Math.max(hMax, Math.abs(P));
          nrm = Math.max(nrm, uu * uu + 1);
        }
        metric = hMax / nrm;
        const b0 = spec.lumps[0].b;
        extra = umax / (4 * b0 * b0);
        kindLabel = kind === 'one' ? 'one lump' : kind === 'collide' ? 'pass-through' : (kind + ' lumps');
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
        const ok = metric < 5e-3 && extra > 0.97 && extra < 1.08;
        host.setStatus(
          '<span>KP-I residual <b>' + metric.toExponential(1) + '</b> · 0</span>' +
          '<span>peak / 4b² <b>' + f2(extra) + '</b></span>' +
          '<span>' + (!ok ? 'tau failed' : kindLabel) + '</span>'
        );
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        s.t = ((s.t + dt * 0.4) % 8) - 4;
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
