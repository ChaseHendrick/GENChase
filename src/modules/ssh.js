
/* modules/ssh.js */
/* GENChase: Su-Schrieffer-Heeger chain. Mid-gap edge states that the bulk gap said could not be there. End weight is measured. */
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

  const GRID_MIN = 96, GRID_MAX = 160;
  const SCHEMA = [
    // The slider offers exactly what sanitize allows. It used to reach 224 while sanitize capped the chain
    // at 160, so the top four positions moved the label and changed nothing. Every recipe was clamped to
    // 160 either way, so narrowing the slider reprints every plate as before.
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    // Keyed vIntra, not v: the recipe owns v (its version number) and sanitize writes 2 over it. Until the
    // rename, every plate opened from a link, a preset, Surprise or a reload ran at v = 2; dragging the
    // slider changed the plate on screen, but its link still recorded v = 2. A recipe written before the
    // rename never stored the intra hopping, so it reprints at the default below.
    RANGE('Chain', 'vIntra', 'Intra v', GEOM, 0.1, 1.6, 0.05, f2),
    RANGE('Chain', 'w', 'Inter w', GEOM, 0.1, 1.6, 0.05, f2),
    { group: 'Chain', key: 'bc', label: 'Ends', type: 'seg', kind: GEOM, options: [['open', 'Open'], ['periodic', 'Periodic']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '4:5', vIntra: 0.45, w: 1.15, bc: 'open', view: 'int', exposure: 1.05 };
  const PRESETS = {
    topo: pre('Topological', { vIntra: 0.4, w: 1.2, bc: 'open' }, Pal.ember),
    triv: pre('Trivial', { vIntra: 1.2, w: 0.4, bc: 'open' }, Pal.graphite),
    ring: pre('Periodic', { vIntra: 0.4, w: 1.2, bc: 'periodic' }, Pal.harbor),
    edge: pre('Deep edge', { vIntra: 0.2, w: 1.4, bc: 'open' }, Pal.nightshade),
    crit: pre('Critical', { vIntra: 0.9, w: 0.95, bc: 'open' }, Pal.kiln),
    log: pre('Log |ψ|', { vIntra: 0.35, w: 1.25, view: 'log', bc: 'open' }, Pal.thermal),
  };

  function surprise(rng) { return { vIntra: rng.range(0.2, 1.3), w: rng.range(0.2, 1.3), bc: rng() < 0.2 ? 'periodic' : 'open' }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }

  // ---- The chain, diagonalised ----
  // Sites 0..n-1 alternate between sublattice A (even) and B (odd). Bond (2j, 2j+1) carries the intra-cell
  // hopping v and bond (2j+1, 2j+2) the inter-cell hopping w, so an open chain of even length starts and
  // ends on a v bond; a ring adds a w bond from n-1 back to 0. The solver is Householder reduction to
  // tridiagonal form followed by the implicit QL iteration (EISPACK tred2 and tql2, as written in the
  // public-domain JAMA library). An open chain is already tridiagonal and skips the reduction. Only + - * /
  // and Math.sqrt are used, all correctly rounded in IEEE double, so a recipe reprints the same spectrum on
  // every engine. tools/ssh-science.js checks it against an independent Jacobi solve.
  function pythag(a, b) {
    const x = Math.abs(a), y = Math.abs(b);
    if (x > y) { const r = y / x; return x * Math.sqrt(1 + r * r); }
    if (y === 0) return 0;
    const r = x / y; return y * Math.sqrt(1 + r * r);
  }
  // V holds the symmetric matrix on entry (row-major) and the orthogonal reduction on exit;
  // d and e receive the diagonal and subdiagonal (e[i] couples i and i-1, e[0] = 0).
  function tred2(n, V, d, e) {
    for (let j = 0; j < n; j++) d[j] = V[(n - 1) * n + j];
    for (let i = n - 1; i > 0; i--) {
      let scale = 0, h = 0;
      for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
      if (scale === 0) {
        e[i] = d[i - 1];
        for (let j = 0; j < i; j++) { d[j] = V[(i - 1) * n + j]; V[i * n + j] = 0; V[j * n + i] = 0; }
      } else {
        for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
        let f = d[i - 1], g = Math.sqrt(h);
        if (f > 0) g = -g;
        e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
        for (let j = 0; j < i; j++) e[j] = 0;
        for (let j = 0; j < i; j++) {
          f = d[j]; V[j * n + i] = f; g = e[j] + V[j * n + j] * f;
          for (let k = j + 1; k <= i - 1; k++) { g += V[k * n + j] * d[k]; e[k] += V[k * n + j] * f; }
          e[j] = g;
        }
        f = 0;
        for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
        const hh = f / (h + h);
        for (let j = 0; j < i; j++) e[j] -= hh * d[j];
        for (let j = 0; j < i; j++) {
          f = d[j]; g = e[j];
          for (let k = j; k <= i - 1; k++) V[k * n + j] -= f * e[k] + g * d[k];
          d[j] = V[(i - 1) * n + j]; V[i * n + j] = 0;
        }
      }
      d[i] = h;
    }
    for (let i = 0; i < n - 1; i++) {
      V[(n - 1) * n + i] = V[i * n + i]; V[i * n + i] = 1;
      const h = d[i + 1];
      if (h !== 0) {
        for (let k = 0; k <= i; k++) d[k] = V[k * n + i + 1] / h;
        for (let j = 0; j <= i; j++) {
          let g = 0;
          for (let k = 0; k <= i; k++) g += V[k * n + i + 1] * V[k * n + j];
          for (let k = 0; k <= i; k++) V[k * n + j] -= g * d[k];
        }
      }
      for (let k = 0; k <= i; k++) V[k * n + i + 1] = 0;
    }
    for (let j = 0; j < n; j++) { d[j] = V[(n - 1) * n + j]; V[(n - 1) * n + j] = 0; }
    V[(n - 1) * n + n - 1] = 1;
    e[0] = 0;
  }
  // Implicit QL on the tridiagonal (d, e), accumulating into V. Eigenvalues come out ascending in d,
  // eigenvector k in column k of V.
  function tql2(n, V, d, e) {
    for (let i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    let f = 0, tst1 = 0;
    const eps = Number.EPSILON;
    for (let l = 0; l < n; l++) {
      tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
      let m = l;
      while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
      if (m > l) {
        let iter = 0;
        do {
          if (++iter > 60) throw new Error('SSH eigensolve did not converge');
          let g = d[l];
          let p = (d[l + 1] - g) / (2 * e[l]);
          let r = pythag(p, 1);
          if (p < 0) r = -r;
          d[l] = e[l] / (p + r);
          d[l + 1] = e[l] * (p + r);
          const dl1 = d[l + 1];
          let h = g - d[l];
          for (let i = l + 2; i < n; i++) d[i] -= h;
          f += h;
          p = d[m];
          let c = 1, c2 = c, c3 = c, s = 0, s2 = 0;
          const el1 = e[l + 1];
          for (let i = m - 1; i >= l; i--) {
            c3 = c2; c2 = c; s2 = s;
            g = c * e[i]; h = c * p;
            r = pythag(p, e[i]);
            e[i + 1] = s * r;
            s = e[i] / r; c = p / r;
            p = c * d[i] - s * g;
            d[i + 1] = h + s * (c * g + s * d[i]);
            for (let k = 0; k < n; k++) {
              h = V[k * n + i + 1];
              V[k * n + i + 1] = s * V[k * n + i] + c * h;
              V[k * n + i] = c * V[k * n + i] - s * h;
            }
          }
          p = -s * s2 * c3 * el1 * e[l] / dl1;
          e[l] = s * p; d[l] = c * p;
        } while (Math.abs(e[l]) > eps * tst1);
      }
      d[l] += f; e[l] = 0;
    }
    for (let i = 0; i < n - 1; i++) {
      let k = i, p = d[i];
      for (let j = i + 1; j < n; j++) if (d[j] < p) { k = j; p = d[j]; }
      if (k !== i) {
        d[k] = d[i]; d[i] = p;
        for (let j = 0; j < n; j++) { const t = V[j * n + i]; V[j * n + i] = V[j * n + k]; V[j * n + k] = t; }
      }
    }
  }
  // Every eigenpair of the chain, energies ascending. vectors[k * n + i] is mode k on site i and
  // density[k * n + i] its |psi|^2. Where eigenvalues coincide (the ring's +k and -k pair, or an open
  // chain's zero modes when their splitting is below rounding), the solver's choice of basis is arbitrary,
  // so each such pair is rotated into eigenvectors of the mirror i -> n-1-i, which is a symmetry of both
  // chains. The mid-gap pair then shows both ends, as its resolved eigenvectors (L +- R)/sqrt 2 do, and the
  // picture does not depend on how the solver happened to split a degenerate pair. A larger cluster, which
  // this chain does not produce, falls back to the diagonal of its projector, which every basis agrees on.
  function spectrum(n, v, w, periodic) {
    const V = new Float64Array(n * n), d = new Float64Array(n), e = new Float64Array(n);
    const bond = i => (i % 2 === 0 ? v : w);
    if (periodic) {
      for (let i = 0; i < n - 1; i++) V[i * n + i + 1] = V[(i + 1) * n + i] = bond(i);
      V[n - 1] = V[(n - 1) * n] = w;
      tred2(n, V, d, e);
    } else {
      for (let i = 0; i < n; i++) V[i * n + i] = 1;
      for (let i = 1; i < n; i++) e[i] = bond(i - 1);
    }
    tql2(n, V, d, e);
    const vectors = new Float64Array(n * n);
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) vectors[k * n + i] = V[i * n + k];
    const tol = 1e-9 * (Math.abs(v) + Math.abs(w));
    const averaged = [];
    for (let a = 0; a < n;) {
      let b = a;
      while (b + 1 < n && d[b + 1] - d[b] <= tol) b++;
      if (b === a + 1) {
        let paa = 0, pbb = 0, pab = 0;
        for (let i = 0; i < n; i++) {
          const m = n - 1 - i;
          paa += vectors[a * n + i] * vectors[a * n + m];
          pbb += vectors[b * n + i] * vectors[b * n + m];
          pab += vectors[a * n + i] * vectors[b * n + m];
        }
        if (Math.abs(pab) > 1e-12) {
          const tau = (pbb - paa) / (2 * pab);
          const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
          const c = 1 / Math.sqrt(1 + t * t), s = t * c;
          for (let i = 0; i < n; i++) {
            const x = vectors[a * n + i], y = vectors[b * n + i];
            vectors[a * n + i] = c * x - s * y;
            vectors[b * n + i] = s * x + c * y;
          }
        }
      } else if (b > a + 1) averaged.push([a, b]);
      a = b + 1;
    }
    const density = new Float64Array(n * n);
    for (let j = 0; j < n * n; j++) density[j] = vectors[j] * vectors[j];
    for (const [a, b] of averaged) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let k = a; k <= b; k++) sum += density[k * n + i];
        for (let k = a; k <= b; k++) density[k * n + i] = sum / (b - a + 1);
      }
    }
    return { n, v, w, periodic, values: d, vectors, density };
  }
  // The pair of eigenvalues nearest zero and its mean weight on the tenth of the sites at each end,
  // the same window validation/SSH.md and tools/lib/ssh-reference.js use.
  function midGap(spec) {
    const { n, values, density } = spec;
    const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => (Math.abs(values[i]) - Math.abs(values[j])) || (i - j));
    const edge = Math.max(1, Math.floor(n * 0.1));
    const weight = k => {
      let end = 0, total = 0;
      for (let i = 0; i < n; i++) {
        const p = density[k * n + i];
        total += p;
        if (i < edge || i >= n - edge) end += p;
      }
      return end / (total || 1);
    };
    const a = order[0], b = order[1];
    return { a, b, energy: Math.max(Math.abs(values[a]), Math.abs(values[b])), endWeight: 0.5 * (weight(a) + weight(b)) };
  }
  // What the measurement says. Edge modes need both a pair deep in the gap and weight on the ends; the
  // bulk winding nu = 1 for w > v says whether they should be there. Where the two disagree the text says
  // why when it can: the localisation length 1/ln(w/v), in unit cells, against the chain's length.
  function verdict(spec, mid) {
    const { n, v, w, periodic } = spec;
    if (periodic) return 'ring';
    if (Math.abs(w - v) < 1e-9) return 'gap closed';
    const nu = w > v ? 1 : 0, gap = 2 * Math.abs(w - v);
    const edges = mid.endWeight > 0.5 && mid.energy < 0.25 * gap;
    if (edges) return nu ? 'edge modes' : 'edge modes, not expected for ν = 0';
    if (!nu && mid.endWeight < 0.35) return 'trivial';
    const xi = 1 / Math.log(Math.max(v, w) / Math.min(v, w));
    return (mid.endWeight < 0.35 ? 'no edge modes' : 'crossover') + ': ξ ' + xi.toFixed(1) + ' of ' + (n / 2) + ' cells';
  }
  Studio.register({
    id: 'ssh', name: 'SSH Edges', tab: 'SSH',
    subtitle: 'states in a gap that the bulk forbade · 1979',
    order: 55,
    equation: 'H = v Σ_i (a†_i b_i + h.c.) + w Σ_i (b†_i a_{i+1} + h.c.),   ν = 1 for w > v (open)',
    credit: 'W. P. Su, J. R. Schrieffer and A. J. Heeger, Phys. Rev. Lett. 42, 1698 (1979), on dimerised polyacetylene. The winding of the Bloch Hamiltonian in the Brillouin zone is a topological invariant; when it is 1 an open chain hosts a zero mode at each end, inside the bulk gap. Periodic boundaries have nowhere to put them. The plate is |ψ_n(x)|² of every eigenmode of the finite chain, energy increasing upward, each row scaled to its own peak; the mid-gap pair sits in the middle rows.',
    blurb: 'A gapped chain is not supposed to have states in the gap. Dimerise it the right way, open the ends, and two zero modes sit on the edges, exponentially bound, because the bulk winding has nowhere else to go. Close the chain into a ring and they vanish. The chain is diagonalised exactly. The status line reports the pair of states nearest zero energy: its weight on the tenth of the sites at each end, and its energy against the bulk gap 2|w − v|.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: 'w > v is the topological dimerisation. Periodic boundaries are the control that should look empty at the edge.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, spec = null, mid = null, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      // One row per eigenmode, highest energy at the top. When the sheet has more rows than the chain has
      // modes a mode takes two rows, and when it has fewer some are skipped. The mapping is symmetric about
      // the middle and keeps at least one row of the mid-gap pair on every grid and sheet; the pair are
      // chiral partners, whose |psi|^2 rows are identical, so one row loses nothing. Each row is scaled to
      // its own peak, so a bulk mode spread over the chain reads as clearly as a zero mode on a few sites.
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        const n = W;
        spec = spectrum(n, s.vIntra, s.w, s.bc === 'periodic');
        mid = midGap(spec);
        field = new Float32Array(W * H);
        for (let y = 0; y < H; y++) {
          const k = n - 1 - Math.min(n - 1, Math.floor((y + 0.5) * n / H));
          let peak = 0;
          for (let x = 0; x < n; x++) peak = Math.max(peak, spec.density[k * n + x]);
          const inv = peak > 0 ? 1 / peak : 0;
          for (let x = 0; x < n; x++) field[y * n + x] = spec.density[k * n + x] * inv;
        }
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

      // The end weight comes from one deterministic eigensolve of a finite chain, so it has no sampling
      // error; rounding moves it by far less than the digits shown (see validation/SSH.md). An energy under
      // 1e-13 is below what double precision resolves here (eigenvalues agree with an independent solve to
      // about 1e-14), so it is printed as a bound rather than as rounding noise.
      function status() {
        if (!spec) return;
        const { v, w } = spec, gap = 2 * Math.abs(w - v);
        const fE = x => (x < 1e-13 ? '< 1e-13' : x < 1e-3 ? x.toExponential(1) : f3(x));
        host.setStatus('<span>w/v <b>' + f2(w / v) + '</b>' + (Math.abs(w - v) < 1e-9 ? '' : ' · ν <b>' + (w > v ? 1 : 0) + '</b>') + '</span>' +
          U.stats.compare({ label: 'mid-gap end weight', measured: mid.endWeight, basis: 'deterministic', digits: 2 }) +
          '<span>|E| <b>' + fE(mid.energy) + '</b> in gap 2|w−v| <b>' + f2(gap) + '</b></span>' +
          '<span>' + verdict(spec, mid) + '</span>');
      }

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
