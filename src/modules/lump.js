
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
  // report the visible sampled peak without substituting the analytic center.
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
    { group: 'Lumps', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['one', 'One'], ['two', 'Two (sum)'], ['three', 'Three (sum)'], ['collide', 'Crossing (sum)'], ['oblique', 'Oblique'], ['tight', 'Tight']] },
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

  // The single rational lump solves KP-I. A sum is only an illustrative field;
  // finite separation does not make a sum an exact nonlinear solution.
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
  function uAt(kind, x, y, t) {
    const spec = KINDS[kind] || KINDS.one;
    // Differentiate log(product tau) analytically as a sum. Finite differences
    // here used to lose precision and did not create an interacting KP solution.
    return spec.lumps.reduce((sum, L) => sum + u1(L, x, y, t), 0);
  }
  function pdeResidual(kind, x, y, t, h) {
    const u = (dx = 0, dy = 0, dt = 0) => uAt(kind, x + dx, y + dy, t + dt);
    const c = u(), xp = u(h), xm = u(-h);
    const ux = (xp - xm) / (2 * h), uxx = (xp - 2 * c + xm) / (h * h);
    const uxxxx = (u(2*h) - 4*xp + 6*c - 4*xm + u(-2*h)) / h**4;
    const uyy = (u(0,h) - 2*c + u(0,-h)) / (h*h);
    const uxt = (u(h,0,h) - u(-h,0,h) - u(h,0,-h) + u(-h,0,-h)) / (4*h*h);
    const terms = [uxt, 6*(ux*ux + c*uxx), uxxxx, -3*uyy];
    return terms.reduce((a,b) => a+b, 0) / Math.max(1, ...terms.map(Math.abs));
  }

  function lumpCenter(L, t) {
    return { x: L.x0 + 3 * (L.a * L.a + L.b * L.b) * t, y: L.y0 - 6 * L.a * t };
  }

  Studio.register({
    id: 'lump', name: 'Lump', tab: 'Lump',
    subtitle: 'KP-I lumps · 1977',
    order: 116,
    equation: '(u_t + 6 u u_x + u_xxx)_x − 3 u_yy = 0,   u = 2 (log τ)_xx,   τ = X² + b² Y² + 1/b²',
    credit: 'Kadomtsev and Petviashvili, Sov. Phys. Dokl. 15, 539 (1970). Algebraically localized lumps of KP-I: Manakov, Zakharov, Bordag, Its and Matveev, Phys. Lett. A 63, 205 (1977). Exact multi-lump solutions are studied by Satsuma and Ablowitz, J. Math. Phys. 20, 1496 (1979). This module implements single rational lumps; its multiple-lump modes are illustrative sums, not those interacting solutions. Completely different from the studio’s KP-II line-soliton webs. This plate evaluates the rational tau function. It is not a new equation.',
    blurb: 'A single rational lump is an algebraically localized KP-I wave. One, Oblique and Tight evaluate that exact formula. Two, Three and Crossing add single-lump fields for illustration and generally fail the nonlinear KP-I equation. The displayed finite-difference residual tests the actual selected field at two spacings. Sampled peak height depends on the viewport and grid.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Lumps: 'One, Oblique and Tight are single KP-I lumps. The other modes are sums without nonlinear interactions. Their equation residual need not approach zero. The peak is sampled on the visible grid.',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, residualChange = 0, kindLabel = 'one lump', buf, img, raf = 0, last = 0;
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
        let umax = -Infinity;
        for (let y = 0; y < HH; y++) {
          const yy = (0.5 - (y + 0.5) / HH) * L * 2 * (HH / WW);
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * L * 2;
            const u = uAt(kind, xx, yy, t);
            out[y * WW + x] = u;
            if (u > umax) umax = u;
          }
        }
        const points = [[0, 0], [0.8, 0.4], [-0.6, -0.35]].concat(spec.lumps.map(L => { const c = lumpCenter(L,t); return [c.x,c.y]; }));
        const rms = h => Math.sqrt(points.reduce((sum, p) => sum + pdeResidual(kind,p[0],p[1],t,h)**2,0)/points.length);
        metric = rms(0.01);
        residualChange = Math.abs(rms(0.02) - metric);
        extra = umax;
        kindLabel = spec.lumps.length === 1 ? 'single exact formula' : 'illustrative sum, not a KP-I solution';
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
        host.setStatus(
          '<span>sampled KP-I residual <b>' + metric.toExponential(1) + '</b></span>' +
          '<span>step sensitivity <b>' + residualChange.toExponential(1) + '</b></span>' +
          '<span>visible grid peak <b>' + f2(extra) + '</b></span>' +
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
        s.t = ((s.t + 4 + dt * 0.4) % 8 + 8) % 8 - 4;
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
          const diagnostics = [metric, extra, residualChange, kindLabel];
          try {
            W = w; H = ht; field = tmp;
            buf = document.createElement('canvas'); buf.width = w; buf.height = ht;
            img = buf.getContext('2d').createImageData(w, ht);
            fill(s, w, ht, tmp);
            paintBuf();
            g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, ht);
            g.drawImage(buf, 0, 0);
            return await U.toBlob(c);
          } finally {
            W = builtW; H = builtH; field = builtF; buf = builtB; img = builtI;
            [metric, extra, residualChange, kindLabel] = diagnostics;
            paint();
          }
        },
      };
    },
  });
})();
