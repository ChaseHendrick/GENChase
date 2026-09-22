
/* modules/double-triangle-bound.js */
/* Classical two-ring vortex collapse for regular polygons, with derived sharp spin-time bounds; historical priority remains open. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES;
  const PI = Math.PI, TAU = 2 * PI, PHI = (1 + Math.sqrt(5)) / 2;
  const X = PHI * PHI, FLOOR = Math.sqrt(29) / 3;
  const OPT = Math.acos(Math.sqrt(5) / 11) / 3 * 180 / PI;
  function family(n = 3) {
    const d = Math.sqrt(2 * n - 1), x = (n + d) / (n - 1), eta = Math.log(x);
    const K = (n - 1) * Math.sinh((n + 2) * eta / 2);
    return { n, d, x, radius: Math.sqrt(x), R: x ** (n / 2), K,
      floor: Math.sqrt(K * K - d * d) / (2 * n), opt: Math.acos(d / K) / n * 180 / PI };
  }
  function strengths(n) { const x = family(n).x; return Array(n).fill(-1).concat(Array(n).fill(x)); }
  const vortexPalette = { bg: '#121110', colors: ['#F25C05', '#FFF3D6'] };
  const QMAX = -Math.log(0.1), SAMPLES = 600;
  const range = (group, key, label, kind, min, max, step, hint) =>
    ({ group, key, label, type: 'range', kind, min, max, step, fmt: v => Number(v).toFixed(2), hint });
  const sci = v => Number.isFinite(v) ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(1) : v.toFixed(3)) : '—';
  const schema = [
    { group: 'Sheet', key: 'aspect', label: 'Sheet', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { ...range('Collapse', 'n', 'Vertices per polygon', 'geom', 2, 5, 1, 'Two regular n-gons, 2n vortices. n = 2 recovers the parallelogram, n = 3 the triangles, and n = 4 the new square case.'), fmt: v => String(Math.round(v)) },
    { group: 'Collapse', key: 'kind', label: 'Shape', type: 'seg', kind: 'geom', options: [['minimum', 'Minimum'], ['family', 'Family'], ['broken', 'Broken']], hint: 'Minimum selects the unique optimum for this polygon order. Family changes the angle between polygons. Broken displaces one vortex, so the self-similar formula no longer applies.' },
    range('Collapse', 'theta', 'Angle θ (degrees)', 'geom', 1, 84, 0.25, 'Relative rotation of the outer polygon. The collapsing arc is 0 < θ < 180°/n. The displayed range stays inside that arc.'),
    range('Collapse', 'time', 'Time / t_c', 'live', 0, 0.9, 0.01, 'Stop before the singularity. For Broken, the time scale is only the initial contraction estimate, not a predicted collision time.'),
    { group: 'Collapse', key: 'running', label: 'Run', type: 'toggle', kind: 'live' },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: 'paint', options: [['spiral', 'Spirals'], ['triangles', 'Polygons'], ['bound', 'Bound curve']] },
    range('Picture', 'weight', 'Weight', 'paint', 0.4, 2, 0.05, 'Line weight at screen and print resolution.'),
    range('Picture', 'rotation', 'Turn (degrees)', 'geom', -180, 180, 1, 'Rotate the complete configuration; the measured product is unchanged.'),
  ];
  const defaults = { seed: 'double-triangle', n: 3, aspect: '1:1', kind: 'minimum', theta: OPT, time: 0.78, running: false, view: 'spiral', weight: 1, rotation: 0 };
  const pre = (label, p, palette) => ({ label, p, palette });
  const presets = {
    minimum: pre('Minimum', { n: 3, kind: 'minimum', view: 'spiral', time: 0.78, rotation: 0 }, vortexPalette),
    thirty: pre('Thirty degrees', { n: 3, kind: 'family', theta: 30, view: 'spiral', time: 0.78, rotation: 30 }, Pal.harbor),
    winding: pre('More winding', { n: 3, kind: 'family', theta: 9, view: 'spiral', time: 0.83, rotation: 0 }, Pal.nightshade),
    triangles: pre('Nested triangles', { n: 3, kind: 'minimum', view: 'triangles', time: 0.8, rotation: 15 }, Pal.glacier),
    bound: pre('The sharp bound', { n: 3, kind: 'minimum', view: 'bound', time: 0.78, rotation: 0 }, { bg: '#E9E7E2', colors: ['#1A1A1A', '#E63B2E'] }),
    square: pre('Square minimum', { n: 4, kind: 'minimum', view: 'triangles', time: 0.84, rotation: 0 }, { bg: '#101F2C', colors: ['#53D6CF', '#F9C46B'] }),
    broken: pre('Off the family', { n: 3, kind: 'broken', theta: OPT, view: 'spiral', time: 0.78, rotation: 0 }, Pal.thermal),
  };
  function sanitize(s) {
    if (!['minimum', 'family', 'broken'].includes(s.kind)) s.kind = 'minimum';
    s.n = U.clamp(Math.round(Number(s.n) || 3), 2, 5);
    const f = family(s.n);
    s.theta = s.kind === 'minimum' ? f.opt : U.clamp(Number(s.theta) || f.opt, 12 / s.n, 168 / s.n);
    s.time = U.clamp(Number(s.time) || 0, 0, 0.9);
    s.weight = U.clamp(Number(s.weight) || 1, 0.4, 2);
    s.rotation = U.clamp(Number(s.rotation) || 0, -180, 180);
    s.running = !!s.running;
  }
  function place(theta, broken, rotation = 0, n = 3) {
    const z = [], f = family(n);
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < n; k++) {
      const a = TAU * k / n + (rotation + (ring === 0 ? theta : 0)) * PI / 180;
      const r = ring === 0 ? f.radius : 1;
      z.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    if (broken) { z[0][0] += 0.22; z[0][1] += 0.15; }
    return z;
  }
  // Direct all-pairs Biot–Savart. The closed formula is never used in the velocity or integrator.
  function velocity(z, G = strengths(z.length / 2)) {
    return z.map((p, i) => {
      let vx = 0, vy = 0;
      for (let j = 0; j < z.length; j++) if (i !== j) {
        const dx = p[0] - z[j][0], dy = p[1] - z[j][1];
        const f = G[j] / (TAU * (dx * dx + dy * dy));
        vx -= f * dy; vy += f * dx;
      }
      return [vx, vy];
    });
  }
  function measure(z) {
    const G = strengths(z.length / 2);
    const total = G.reduce((a, b) => a + b, 0);
    const c = [0, 0];
    z.forEach((p, i) => { c[0] += G[i] * p[0] / total; c[1] += G[i] * p[1] / total; });
    const v = velocity(z, G), r = z.map(p => [p[0] - c[0], p[1] - c[1]]);
    let norm = 0, dot = 0, cross = 0, inertia = 0, inorm = 0, vnorm = 0;
    r.forEach((p, i) => {
      const rr = p[0] ** 2 + p[1] ** 2;
      norm += rr; inertia += G[i] * rr; inorm += Math.abs(G[i]) * rr;
      dot += p[0] * v[i][0] + p[1] * v[i][1];
      cross += p[0] * v[i][1] - p[1] * v[i][0];
      vnorm += v[i][0] ** 2 + v[i][1] ** 2;
    });
    const A = dot / norm, B = cross / norm, tc = -1 / (2 * A);
    let residual = 0;
    r.forEach((p, i) => { residual += (v[i][0] - A * p[0] + B * p[1]) ** 2 + (v[i][1] - A * p[1] - B * p[0]) ** 2; });
    return { A, B, tc, product: B * tc, c, norm, inertia: inertia / inorm, residual: Math.sqrt(residual / vnorm) };
  }
  function closed(theta, n = 3) {
    const f = family(n), a = n * theta * PI / 180;
    return (f.K - f.d * Math.cos(a)) / (2 * n * Math.sin(a));
  }
  function distances(z) {
    const d = [];
    for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) d.push(Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]));
    const norm = Math.hypot(...d);
    return d.map(x => x / norm);
  }
  // q = -log(1-t/T) resolves the shrinking scale; physical equations are unchanged.
  function step(z, q, h, T) {
    const rhs = (p, u) => velocity(p).map(v => v.map(x => x * T * Math.exp(-u)));
    const add = (k, f) => z.map((p, i) => p.map((x, j) => x + f * k[i][j]));
    const k1 = rhs(z, q), k2 = rhs(add(k1, h / 2), q + h / 2);
    const k3 = rhs(add(k2, h / 2), q + h / 2), k4 = rhs(add(k3, h), q + h);
    return z.map((p, i) => p.map((x, j) => x + h * (k1[i][j] + 2 * k2[i][j] + 2 * k3[i][j] + k4[i][j]) / 6));
  }
  function trajectory(z0, T, substeps) {
    let z = z0.map(p => p.slice()), q = 0;
    const out = [z], h = QMAX / (SAMPLES * substeps);
    for (let k = 1; k <= SAMPLES; k++) {
      for (let j = 0; j < substeps; j++) { z = step(z, q, h, T); q += h; }
      out.push(z);
    }
    return out;
  }
  function compute(s) {
    const n = s.n || 3, f = family(n), theta = s.kind === 'minimum' ? f.opt : s.theta;
    const z0 = place(theta, s.kind === 'broken', s.rotation, n), m = measure(z0);
    const T = m.tc > 0 && Number.isFinite(m.tc) ? m.tc : 4;
    const coarse = trajectory(z0, T, 1), path = trajectory(z0, T, 2);
    const d0 = distances(z0), radius = Math.sqrt(m.norm / (2 * n));
    let odeError = 0, shapeError = 0, exactError = 0;
    path.forEach((z, k) => {
      const q = QMAX * k / SAMPLES, scale = Math.exp(-q / 2), angle = m.product * q;
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const ds = distances(z);
      shapeError = Math.max(shapeError, Math.hypot(...ds.map((x, i) => x - d0[i])));
      z.forEach((p, i) => {
        odeError = Math.max(odeError, Math.hypot(p[0] - coarse[k][i][0], p[1] - coarse[k][i][1]) / (15 * radius));
        if (s.kind !== 'broken') {
          const rx = z0[i][0] - m.c[0], ry = z0[i][1] - m.c[1];
          exactError = Math.max(exactError, Math.hypot(p[0] - m.c[0] - scale * (cs * rx - sn * ry), p[1] - m.c[1] - scale * (sn * rx + cs * ry)) / radius);
        }
      });
    });
    return { n, family: f, theta, m, path, odeError, shapeError, exactError, formulaError: Math.abs(m.product / closed(theta, n) - 1), broken: s.kind === 'broken' };
  }
  function currentIndex(t) { return Math.round(-Math.log(1 - t) / QMAX * SAMPLES); }

  // One drawing list drives canvas and SVG so the print has exactly the same marks.
  function drawing(w, h, s, data, time) {
    const marks = [], pal = s.palette && s.palette.length ? s.palette : ['#dcad59', '#65bac3'];
    const color = i => pal[i % pal.length], size = Math.min(w, h), lw = size * 0.0032 * s.weight;
    const line = (points, stroke, width = lw, opacity = 1, close = false) => marks.push({ type: 'line', points, stroke, width, opacity, close });
    const dot = (x, y, r, fill) => marks.push({ type: 'dot', x, y, r, fill });
    const text = (x, y, value, fill, fs = size * 0.025) => marks.push({ type: 'text', x, y, value, fill, fs });
    const ink = U.inkFor(s.bg), kNow = currentIndex(time), n = data.n, f = data.family;
    if (s.view === 'bound') {
      const top = f.floor * 7.5, bottom = f.floor * 0.8;
      const x = a => w * (0.12 + 0.76 * a / 180), y = p => h * (0.84 - 0.61 * (p - bottom) / (top - bottom));
      line([[x(0), y(bottom)], [x(180), y(bottom)]], ink, lw * 0.6, 0.45);
      line([[x(0), y(bottom)], [x(0), y(top)]], ink, lw * 0.6, 0.45);
      for (const multiple of [1, 2, 4, 6]) {
        const value = multiple * f.floor;
        line([[x(0) - size * 0.01, y(value)], [x(0), y(value)]], ink, lw * 0.6, 0.45);
        text(x(0) - size * 0.075, y(value) + size * 0.007, value.toFixed(1), ink, size * 0.021);
      }
      line([[x(0), y(f.floor)], [x(180), y(f.floor)]], color(1), lw, 0.6);
      const curve = [];
      for (let a = 12; a <= 168; a += 0.6) curve.push([x(a), y(closed(a / n, n))]);
      line(curve, color(0), lw * 1.8);
      dot(x(n * f.opt), y(f.floor), lw * 2.5, color(1));
      // Dots come from direct Biot–Savart measurements, not from closed().
      for (let a = 18; a <= 162; a += 18) dot(x(a), y(measure(place(a / n, false, 0, n)).product), lw * 1.6, ink);
      text(x(0), h * 0.1, 'Spin × collapse time · n = ' + n, ink, size * 0.035);
      text(x(0), h * 0.16, 'Curve: formula · dots: vortex velocities', ink, size * 0.021);
      const label = n === 3 ? '√29 / 3' : n === 4 ? '√322 / 9' : 'F_' + n;
      text(x(102), y(f.floor) - size * 0.025, label + ' = ' + f.floor.toFixed(6) + '…', color(1), size * 0.023);
      text(x(50), y(f.floor) - size * 0.075, 'θ* ≈ ' + f.opt.toFixed(4) + '°', ink, size * 0.022);
      text(x(0), h * 0.92, '0°', ink); text(x(162), h * 0.92, (180 / n).toFixed(1) + '°', ink);
      text(x(58), h * 0.92, 'Relative angle θ', ink);
      if (s.kind !== 'broken') dot(x(n * data.theta), y(data.m.product), lw * 3, color(0));
    } else {
      const scale = size * 0.245, cx = w / 2, cy = h / 2;
      const map = p => [cx + scale * (p[0] - data.m.c[0]), cy - scale * (p[1] - data.m.c[1])];
      if (s.view === 'triangles') {
        for (let k = 0; k <= kNow; k += 32) for (let ring = 0; ring < 2; ring++) {
          line(data.path[k].slice(n * ring, n * ring + n).map(map), color(ring), lw * 0.75, 0.18 + 0.7 * k / Math.max(kNow, 1), true);
        }
      } else for (let i = 0; i < 2 * n; i++) {
        line(data.path.slice(0, kNow + 1).map(z => map(z[i])), color(i < n ? 0 : 1), lw * 1.5, 0.9);
        const p = map(data.path[0][i]); dot(p[0], p[1], lw * 1.2, ink);
      }
      for (let ring = 0; ring < 2; ring++) line(data.path[kNow].slice(ring * n, ring * n + n).map(map), color(ring), lw * 0.75, 0.65, true);
      data.path[kNow].forEach((p, i) => { const xy = map(p); dot(xy[0], xy[1], lw * (i < n ? 2.5 : 3.6), color(i < n ? 0 : 1)); });
      line([[cx - lw * 2, cy], [cx + lw * 2, cy]], ink, lw * 0.5, 0.45);
      line([[cx, cy - lw * 2], [cx, cy + lw * 2]], ink, lw * 0.5, 0.45);
    }
    return marks;
  }
  function paint(ctx, w, h, s, data, time) {
    ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h);
    for (const m of drawing(w, h, s, data, time)) {
      if (m.type === 'line') {
        ctx.beginPath(); m.points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
        if (m.close) ctx.closePath();
        ctx.strokeStyle = m.stroke; ctx.lineWidth = m.width; ctx.globalAlpha = m.opacity;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
      } else if (m.type === 'dot') {
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fillStyle = m.fill; ctx.fill();
      } else { ctx.font = m.fs + 'px Georgia, serif'; ctx.fillStyle = m.fill; ctx.fillText(m.value, m.x, m.y); }
    }
  }
  function svg(w, h, s, data, time) {
    const esc = U.svgEsc, parts = drawing(w, h, s, data, time).map(m => {
      if (m.type === 'line') return '<path d="' + m.points.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ') + (m.close ? ' Z' : '') + '" fill="none" stroke="' + esc(m.stroke) + '" stroke-width="' + m.width + '" opacity="' + m.opacity + '" stroke-linecap="round" stroke-linejoin="round"/>';
      if (m.type === 'dot') return '<circle cx="' + m.x + '" cy="' + m.y + '" r="' + m.r + '" fill="' + esc(m.fill) + '"/>';
      return '<text x="' + m.x + '" y="' + m.y + '" fill="' + esc(m.fill) + '" font-family="Georgia, serif" font-size="' + m.fs + '">' + esc(m.value) + '</text>';
    });
    return U.svgDoc(w, h, s.bg, parts.join(''));
  }
  Studio.register({
    id: 'double-triangle-bound', name: 'Polygon collapse bounds', tab: 'Polygon bounds',
    subtitle: 'Two regular polygons · sharp spin–time floor · priority open', order: 120, familiarity: 'rare',
    equation: 'ω₀t_c = (K_n − √(2n−1) cos nθ)/(2n sin nθ) ≥ F_n; F₃ = √29/3, F₄ = √322/9',
    credit: 'Classical two-ring collapse: Aref, Physics of Fluids 25, 2183 (1982); Koiller, Pinto de Carvalho, Rodrigues da Silva and Gonçalves de Oliveira, Physica D 16, 27–61 (1985), §11. Two regular n-gons with outer circulation −1, inner circulation x = (n + √(2n−1))/(n−1), and squared radius ratio x. GENChase derives the product and its sharp minimum in identities/polygon-collapse.md. The n = 4 value √322/9 illustrates the general theorem. Historical priority of these explicit bounds is unconfirmed; the collapse family is classical.',
    blurb: 'Two rings of whirlpools keep their polygon shapes while shrinking and turning. The spin × collapse-time score has a sharp floor. Three vortices per ring give √29/3; four give √322/9 at a relative angle of about 20.1455°. Change the vertex count to explore the general bound. Trajectories come from all pairwise vortex velocities. Broken moves one vortex off the family. The mathematics is proved; historical novelty is still being checked.',
    schema, defaults, presets, sanitize, palette: true, defaultPalette: vortexPalette, paletteLabel: 'Outer / inner polygon',
    headline: 'time', headlineLabel: 't / t_c', closedGroups: ['Picture'],
    hints: { Collapse: 'Minimum selects the unique optimum for the chosen polygon order. Every valid Family shape obeys its bound. Broken is a control. The two-ring collapse is classical; priority of this explicit bound remains open.', Picture: 'Spirals and polygons use numerical trajectories. Bound curve compares the formula with independent velocity measurements. Exports preserve these vector marks.' },
    surprise(rng) { const n = rng.int(2, 5); return { n, kind: rng() < 0.5 ? 'minimum' : 'family', theta: rng.range(24, 156) / n, rotation: rng.range(-180, 180), time: rng.range(0.55, 0.88), view: rng.pick(['spiral', 'spiral', 'triangles']) }; },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let data, raf = 0, last = 0, time = 0;
      function report() {
        const m = data.m, valid = !data.broken && m.tc > 0 && m.residual < 1e-9;
        const miss = !valid || data.formulaError > 1e-8 || data.shapeError > 1e-5 || data.exactError > 1e-5;
        const score = valid ? (m.product / data.family.floor).toFixed(6) : 'n/a';
        host.setStatus('<span>n = ' + data.n + ' · ω₀t_c / F_n <b>' + score + '</b> · ≥ 1</span>' +
          '<span>formula <b>' + (valid ? sci(data.formulaError) : 'off family') + '</b></span>' +
          '<span>shape <b>' + sci(data.shapeError) + '</b> · 0</span>' +
          '<span>ODE Δ/15 <b>' + sci(data.odeError) + '</b></span>' +
          '<span>' + (miss ? 'miss · off family or numerical disagreement' : 'bound held · no sampling error') + ' · priority open</span>');
        if (host.setWitness) host.setWitness({
          label: 'Self-similar velocity residual', measured: Number.isFinite(m.residual) ? m.residual : null,
          expected: 0, tol: 1e-9, valid,
          missWhen: 'Off the two-polygon family, nonpositive collapse time, or relative residual at least 1e-9.'
        });
      }
      function draw() { if (data) paint(ctx, canvas.width, canvas.height, host.getState(), data, time); }
      function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
      function tick(now) {
        raf = 0; const s = host.getState();
        if (!s.running || !host.isActive() || host.reducedMotion()) { last = 0; return; }
        time = (time + (last ? Math.min(0.05, (now - last) / 1000) : 0) * 0.13) % 0.9;
        last = now; draw(); raf = requestAnimationFrame(tick);
      }
      function start() { if (!raf && host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(tick); }
      return {
        aspect(s) { return ({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 })[s.aspect] || 1; },
        regenerate() { stop(); const s = host.getState(); time = s.time; data = compute(s); draw(); report(); start(); },
        repaint() { draw(); report(); }, resize() { draw(); }, pause: stop,
        resume() { draw(); start(); },
        live(key) { if (key === 'time') time = host.getState().time; if (!host.getState().running) stop(); else start(); draw(); },
        async exportPNG(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h, host.getState(), data, time); return U.toBlob(c); },
        exportSVG(w, h) { return svg(w, h, host.getState(), data, time); },
      };
    },
  });
})();
