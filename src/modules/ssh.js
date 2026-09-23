
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

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Chain', 'intra', 'Intra v', GEOM, 0.1, 1.6, 0.05, f2),
    RANGE('Chain', 'w', 'Inter w', GEOM, 0.1, 1.6, 0.05, f2),
    { group: 'Chain', key: 'bc', label: 'Ends', type: 'seg', kind: GEOM, options: [['open', 'Open'], ['periodic', 'Periodic']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '4:5', intra: 0.45, w: 1.15, bc: 'open', view: 'int', exposure: 1.05 };
  const PRESETS = {
    topo: pre('Topological', { intra: 0.4, w: 1.2, bc: 'open' }, Pal.ember),
    triv: pre('Trivial', { intra: 1.2, w: 0.4, bc: 'open' }, Pal.graphite),
    ring: pre('Periodic', { intra: 0.4, w: 1.2, bc: 'periodic' }, Pal.harbor),
    edge: pre('Deep edge', { intra: 0.2, w: 1.4, bc: 'open' }, Pal.nightshade),
    crit: pre('Critical', { intra: 0.9, w: 0.95, bc: 'open' }, Pal.kiln),
    log: pre('Log |ψ|', { intra: 0.35, w: 1.25, view: 'log', bc: 'open' }, Pal.thermal),
  };

  function surprise(rng) { return { intra: rng.range(0.2, 1.3), w: rng.range(0.2, 1.3), bc: rng() < 0.2 ? 'periodic' : 'open' }; }
  function sanitize(s) { s.grid = Math.max(64, Math.min(160, Math.round(s.grid / 16) * 16)); }
  // H = v Σ (a†_j b_j + h.c.) + w Σ (b†_j a_{j+1} + h.c.) on n sites packed a0 b0 a1 b1 ..., with the
  // w bond closing a ring. Householder reduction to tridiagonal form, then implicit-shift QL (the EISPACK
  // tred2 / tql2 scheme). Returns ascending energies and unit eigenvectors.
  function sshEigen(n, v, w, periodic) {
    const V = Array.from({ length: n }, () => new Float64Array(n)), d = new Float64Array(n), e = new Float64Array(n);
    for (let i = 0; i < n - 1; i++) V[i][i + 1] = V[i + 1][i] = i % 2 === 0 ? v : w;
    if (periodic) V[0][n - 1] = V[n - 1][0] = w;
    for (let j = 0; j < n; j++) d[j] = V[n - 1][j];
    for (let i = n - 1; i > 0; i--) {
      let scale = 0, h = 0;
      for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
      if (scale === 0) {
        e[i] = d[i - 1];
        for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; }
      } else {
        for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
        let f = d[i - 1], g = Math.sqrt(h);
        if (f > 0) g = -g;
        e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
        for (let j = 0; j < i; j++) e[j] = 0;
        for (let j = 0; j < i; j++) {
          f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f;
          for (let k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f; }
          e[j] = g;
        }
        f = 0;
        for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
        const hh = f / (h + h);
        for (let j = 0; j < i; j++) e[j] -= hh * d[j];
        for (let j = 0; j < i; j++) {
          f = d[j]; g = e[j];
          for (let k = j; k <= i - 1; k++) V[k][j] -= f * e[k] + g * d[k];
          d[j] = V[i - 1][j]; V[i][j] = 0;
        }
      }
      d[i] = h;
    }
    for (let i = 0; i < n - 1; i++) {
      V[n - 1][i] = V[i][i]; V[i][i] = 1;
      const h = d[i + 1];
      if (h !== 0) {
        for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h;
        for (let j = 0; j <= i; j++) {
          let g = 0;
          for (let k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j];
          for (let k = 0; k <= i; k++) V[k][j] -= g * d[k];
        }
      }
      for (let k = 0; k <= i; k++) V[k][i + 1] = 0;
    }
    for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; }
    V[n - 1][n - 1] = 1; e[0] = 0;
    for (let i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    let f = 0, tst1 = 0;
    const eps = Math.pow(2, -52);
    for (let l = 0; l < n; l++) {
      tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
      let m = l;
      while (m < n - 1 && Math.abs(e[m]) > eps * tst1) m++;
      if (m > l) {
        for (let iter = 0; iter < 64; iter++) {
          let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1);
          if (p < 0) r = -r;
          d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r);
          const dl1 = d[l + 1];
          let h = g - d[l];
          for (let i = l + 2; i < n; i++) d[i] -= h;
          f += h;
          p = d[m];
          let c = 1, c2 = 1, c3 = 1, s = 0, s2 = 0;
          const el1 = e[l + 1];
          for (let i = m - 1; i >= l; i--) {
            c3 = c2; c2 = c; s2 = s;
            g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]);
            e[i + 1] = s * r; s = e[i] / r; c = p / r; p = c * d[i] - s * g;
            d[i + 1] = h + s * (c * g + s * d[i]);
            for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
          }
          p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p;
          if (Math.abs(e[l]) <= eps * tst1) break;
        }
      }
      d[l] += f; e[l] = 0;
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[a] - d[b]);
    return { values: order.map(i => d[i]), vectors: order.map(j => Float64Array.from({ length: n }, (_, k) => V[k][j])) };
  }
  Studio.register({
    id: 'ssh', name: 'SSH Edges', tab: 'SSH',
    subtitle: 'states in a gap that the bulk forbade · 1979',
    order: 55,
    equation: 'H = v Σ_i (a†_i b_i + h.c.) + w Σ_i (b†_i a_{i+1} + h.c.),   ν = 1 for w > v (open)',
    credit: 'W. P. Su, J. R. Schrieffer and A. J. Heeger, Phys. Rev. Lett. 42, 1698 (1979), on dimerised polyacetylene. The winding of the Bloch Hamiltonian in the Brillouin zone is a topological invariant; when it is 1 an open chain hosts a zero mode at each end, inside the bulk gap. Periodic boundaries have nowhere to put them. The plate is |ψ_n(x)| of every eigenmode of the finite chain, stacked by energy, with the mid-gap pair across the middle.',
    blurb: 'A gapped chain is not supposed to have states in the gap. Dimerise it the right way, open the ends, and two zero modes sit on the edges, exponentially bound, because the bulk winding has nowhere else to go. Close the chain into a ring and they vanish. The chain is diagonalized exactly and every eigenmode is stacked by energy. The status line reports how much of the mid-gap pair sits on the outer tenth of the sites at each end, and how far that pair is from zero energy.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: 'w > v is the topological dimerisation. Periodic boundaries are the control that should look empty at the edge.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, midE = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const n = W, v = s.intra, w = s.w, periodic = s.bc === 'periodic';
        const eig = sshEigen(n, v, w, periodic);
        // Rows are eigenmodes in order of energy. A plate shorter than the chain shows the band of modes
        // centred on E = 0, one row each, so the mid-gap pair is always on it.
        const modeOf = H >= n ? y => Math.floor(y * n / H) : y => n / 2 - Math.floor(H / 2) + y;
        // Exactly degenerate modes (every ±k pair on a ring, the two zero modes of a long open chain) have no
        // preferred eigenvector basis. Inside such a cluster the rows are fixed by pivoted Gram–Schmidt on the
        // sites: each is the normalized projection of the site with the most remaining weight, ties going to
        // the leftmost site. Any correct diagonalization gives the same rows.
        const tol = 1e-8 * (Math.abs(v) + Math.abs(w)), rows = [], density = [];
        for (let i = 0; i < n;) {
          let j = i + 1;
          while (j < n && eig.values[j] - eig.values[j - 1] < tol) j++;
          const cluster = eig.vectors.slice(i, j), rho = new Float64Array(n);
          for (const psi of cluster) for (let x = 0; x < n; x++) rho[x] += psi[x] * psi[x];
          if (j - i === 1) rows[i] = eig.vectors[i];
          else {
            const left = Float64Array.from(rho), chosen = [];
            for (let m = i; m < j; m++) {
              const top = Math.max(...left);
              let site = 0;
              while (left[site] < top * (1 - 1e-9)) site++;
              const b = new Float64Array(n);
              for (const psi of cluster) for (let x = 0; x < n; x++) b[x] += psi[site] * psi[x];
              for (const c of chosen) for (let x = 0; x < n; x++) b[x] -= c[site] * c[x];
              const norm = Math.hypot(...b);
              for (let x = 0; x < n; x++) { b[x] /= norm; left[x] -= b[x] * b[x]; }
              chosen.push(b); rows[m] = b;
            }
          }
          for (let m = i; m < j; m++) density[m] = rho.map(r => r / (j - i));
          i = j;
        }
        for (let y = 0; y < H; y++) {
          const row = rows[modeOf(y)];
          for (let x = 0; x < n; x++) field[y * n + x] = Math.abs(row[x]);
        }
        // End weight: the mean share of the two modes nearest E = 0 on the outer tenth of sites at each end.
        const edge = Math.max(1, Math.floor(n * 0.1));
        const pair = eig.values.map((e, i) => i).sort((a, b) => Math.abs(eig.values[a]) - Math.abs(eig.values[b])).slice(0, 2);
        metric = 0;
        for (const m of pair) for (let x = 0; x < n; x++) if (x < edge || x >= n - edge) metric += density[m][x] / 2;
        midE = Math.max(...pair.map(m => Math.abs(eig.values[m])));
        extra = w > v ? 1 : 0;

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

      function status() { host.setStatus('<span>w/v <b>' + f2(host.getState().w / Math.max(0.05, host.getState().intra)) + '</b></span><span>end weight <b>' + f2(metric) + '</b></span><span>mid-gap |E| <b>' + midE.toExponential(1) + '</b></span><span>' + (host.getState().bc === 'periodic' ? 'ring' : (metric > 0.45 ? 'edge modes' : 'bulk-like')) + '</span>'); }

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
