
/* modules/potts.js */
/* GENChase — the cellular Potts model: curvature-driven grain growth, soap froth, and the von Neumann-Mullins law measured on the plate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Second-order neighborhood. The four-neighbor version of this model grows square grains: on that
  // stencil the boundary energy of a staircase equals the energy of the straight line it approximates,
  // so the lattice axes cost nothing and the froth inherits them. Eight neighbors restores enough
  // isotropy for the boundaries to be curves.
  const NX = [1, 1, 0, -1, -1, -1, 0, 1], NY = [0, 1, 1, 1, 0, -1, -1, -1];

  /* ---------- Foam and Grains ---------- */
  Studio.register({
    id: 'potts',
    name: 'Foam & Grains',
    tab: 'Froth',
    subtitle: 'the cellular Potts model, coarsening · 1992',
    order: 34,
    equation: 'H = Σ_⟨ij⟩ J(1 − δ_{σi σj}) + λ Σ_c (a_c − A)²;   accept a copy with min(1, e^{−ΔH/T})',
    credit: "The extended, area-constrained Potts model is François Graner and James Glazier, 'Simulation of biological cell sorting using a two-dimensional extended Potts model', Physical Review Letters 69, 2013 (1992), building on Malcolm Anderson, David Srolovitz, Gary Grest and Paul Sahni, Acta Metallurgica 32, 783 (1984), who used the plain q-state Potts model for grain growth. The law the plate measures is John von Neumann's, in Metal Interfaces (1952), as extended by William Mullins, J. Appl. Phys. 27, 900 (1956): a two-dimensional cell with n sides changes area at a rate proportional to n − 6. The average side count being exactly six is Euler's formula, not a fit. Differential adhesion as the explanation for cell sorting is Malcolm Steinberg, Science 141, 401 (1963).",
    blurb: 'Give every cell a label, charge energy for every pair of neighboring sites whose labels differ, and let the labels copy into each other at a finite temperature. That is all. What comes out is a froth: cells meeting three at a time at roughly a hundred and twenty degrees, small cells vanishing, large ones swallowing them, the whole pattern coarsening while staying statistically the same shape. The law behind it is exact and almost absurdly simple. Because the boundaries move by curvature and the angles at the vertices are fixed, a cell with fewer than six sides is bounded by curves that bow inward and must shrink, a cell with more than six grows, and one with exactly six is neutral. The average over the whole froth is six, forced by Euler. Add an area constraint and the cells stop being able to vanish, which is the difference between a metal grain structure and a soap foam that holds its bubbles.',
    schema: [
      { group: 'Froth', key: 'mode', label: 'System', type: 'seg', kind: GEOM, wrap: true,
        options: [['grains', 'Grain growth'], ['foam', 'Constrained foam']],
        hint: 'Grain growth is the plain Potts model: cells shrink away and the structure coarsens without limit. Constrained foam adds an energy penalty for leaving a target area, so small cells resist vanishing and the froth holds a size.' },
      { group: 'Froth', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Froth', key: 'grid', label: 'Lattice', type: 'seg', kind: GEOM, options: [[192, '192'], [256, '256'], [320, '320'], [400, '400']] },
      { group: 'Froth', key: 'wrap', label: 'Wrap the lattice', type: 'toggle', kind: GEOM,
        hint: 'A torus has no walls, so no cell is cut off by the edge and the side counts are the ones the law is about. Unwrapped, the boundary cells have fewer neighbors and drag the average below six.' },
      RANGE('Froth', 'seeds', 'Initial cells', GEOM, 40, 1200, 10, String),
      RANGE('Froth', 'sweeps', 'Sweeps', GEOM, 40, 3000, 20, String, { hint: 'One sweep is one attempted copy per lattice site. Coarsening is diffusive, so the mean area grows roughly linearly in sweeps and the cell count falls as its inverse.' }),
      RANGE('Energy', 'T', 'Temperature', GEOM, 0.5, 24, 0.5, f1, { hint: 'Too cold and the boundaries freeze onto the lattice; too hot and they fray into noise and stop being curves. The froth lives in between.' }),
      RANGE('Energy', 'lam', 'Area stiffness λ', GEOM, 0, 2, 0.02, f2, { dimUnless: s => s.mode === 'foam' }),
      RANGE('Energy', 'targetScale', 'Target area', GEOM, 0.3, 3, 0.05, f2, { dimUnless: s => s.mode === 'foam',
        hint: 'As a multiple of the starting mean area.' }),
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['flat', 'Cells'], ['sides', 'Sides'], ['area', 'Area'], ['walls', 'Walls only']] },
      RANGE('Picture', 'wallW', 'Wall weight', PAINT, 0, 4, 0.2, f1),
      RANGE('Picture', 'shift', 'Palette offset', PAINT, 0, 1, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      mode: 'grains', aspect: '1:1', grid: 320, wrap: true, seeds: 600, sweeps: 700,
      T: 8, lam: 0.3, targetScale: 1,
      view: 'flat', wallW: 1, shift: 0, grain: 0.04,
      seed: 'graner-1992',
    },
    presets: {
      coarse: pre('Coarsened grains', { mode: 'grains', seeds: 600, sweeps: 900, T: 8, view: 'flat', wallW: 1 }, Pal.graphite),
      sides: pre('Colored by side count', { mode: 'grains', seeds: 700, sweeps: 700, T: 8, view: 'sides', wallW: 1.4 }, Pal.thermal),
      foam: pre('A foam that holds', { mode: 'foam', lam: 0.6, targetScale: 1, seeds: 500, sweeps: 900, T: 8, view: 'flat', wallW: 1.2 }, Pal.harbor),
      walls: pre('Walls only', { mode: 'grains', seeds: 500, sweeps: 800, T: 8, view: 'walls', wallW: 1.6 }, Pal.kiln),
      young: pre('Early, still fine', { mode: 'grains', seeds: 1200, sweeps: 150, T: 8, view: 'flat', wallW: 0.6 }, Pal.verdigris),
      hot: pre('Rough boundaries', { mode: 'grains', seeds: 500, sweeps: 700, T: 18, view: 'flat', wallW: 1 }, Pal.ember),
      area: pre('Colored by area', { mode: 'grains', seeds: 700, sweeps: 1000, T: 8, view: 'area', wallW: 1 }, Pal.glacier),
    },
    hints: {
      Energy: 'Only differences of energy matter, so J is fixed at one and the temperature is measured against it.',
      Picture: 'Sides colors each cell by how many neighbors it has, which is the quantity the von Neumann-Mullins law is written in: five-sided cells are shrinking, seven-sided ones are growing, six-sided ones are doing neither.',
    },
    palette: true, defaultPalette: 'graphite',
    headline: 'sweeps', headlineLabel: 'sweeps',
    sanitize(s) {
      s.seeds = U.clamp(Math.round(Number(s.seeds) || 600), 40, 1200);
      s.sweeps = U.clamp(Math.round(Number(s.sweeps) || 700), 40, 3000);
    },
    surprise(rng) {
      const mode = rng.pick(['grains', 'grains', 'foam']);
      return {
        mode, seeds: rng.pick([200, 400, 600, 900, 1200]), sweeps: rng.pick([150, 400, 700, 1200, 2000]),
        T: rng.pick([4, 6, 8, 10, 14, 18]), lam: rng.range(0.2, 1.2), targetScale: rng.range(0.6, 1.8),
        view: rng.pick(['flat', 'flat', 'sides', 'area', 'walls']),
        wallW: rng.range(0, 2), shift: rng.range(0, 1),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let W = 0, H = 0, N = 0, lab = null, area = null, target = 0, nLab = 0;
      let sides = null, aliveCount = 0, meanSides = 0, mullins = null, mullinsR = null;
      let timer = 0, building = false, sweepNo = 0, areaAt = null;

      function stop() { clearTimeout(timer); }

      function idx(s, x, y) {
        if (s.wrap) {
          if (x < 0) x += W; else if (x >= W) x -= W;
          if (y < 0) y += H; else if (y >= H) y -= H;
          return y * W + x;
        }
        if (x < 0 || y < 0 || x >= W || y >= H) return -1;
        return y * W + x;
      }

      function init(s) {
        const ar = ASPECTS[s.aspect] || 1;
        W = Number(s.grid) || 320; H = Math.max(64, Math.round(W * ar)); N = W * H;
        lab = new Int32Array(N);
        nLab = s.seeds;
        const rng = U.makeRng(s.seed + '/potts');
        const px = new Float64Array(nLab), py = new Float64Array(nLab);
        for (let k = 0; k < nLab; k++) { px[k] = rng() * W; py[k] = rng() * H; }
        // Voronoi by brute force. A few hundred sites against a few hundred thousand cells is well inside
        // budget, and it starts the froth as a polycrystal rather than as noise, which would spend most of
        // the run just forming cells instead of coarsening them.
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let best = 0, bd = Infinity;
          for (let k = 0; k < nLab; k++) {
            let dx = px[k] - x, dy = py[k] - y;
            if (s.wrap) { if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W; if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H; }
            const d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = k; }
          }
          lab[y * W + x] = best;
        }
        area = new Float64Array(nLab);
        for (let i = 0; i < N; i++) area[lab[i]]++;
        target = (N / nLab) * s.targetScale;
        sweepNo = 0;
        areaAt = null;
      }

      // One attempted copy: pick a site, pick one of its eight neighbors, and try to take that
      // neighbor's label. Energy is counted only over the eight bonds of the site being changed, which is
      // exact because no other bond in the lattice involves it.
      function attempt(s, rng) {
        const i = (rng() * N) | 0;
        const x = i % W, y = (i / W) | 0;
        const d = (rng() * 8) | 0;
        const j = idx(s, x + NX[d], y + NY[d]);
        if (j < 0) return;
        const from = lab[i], to = lab[j];
        if (from === to) return;
        let dE = 0;
        for (let k = 0; k < 8; k++) {
          const m = idx(s, x + NX[k], y + NY[k]);
          if (m < 0) continue;
          const l = lab[m];
          dE += (l === to ? 0 : 1) - (l === from ? 0 : 1);
        }
        if (s.mode === 'foam' && s.lam > 0) {
          const af = area[from], at = area[to];
          dE += s.lam * (((af - 1 - target) ** 2 - (af - target) ** 2) + ((at + 1 - target) ** 2 - (at - target) ** 2));
        }
        if (dE <= 0 || rng() < Math.exp(-dE / s.T)) {
          lab[i] = to; area[from]--; area[to]++;
        }
      }

      // Side counts: the number of distinct labels a cell touches. Counted from the bonds rather than from
      // any geometric reconstruction, so a cell that has just pinched off is counted the way the energy sees it.
      function countSides(s) {
        const seen = new Map();
        sides = new Int32Array(nLab);
        const sets = new Array(nLab);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, a = lab[i];
          for (const d of [0, 2]) {
            const j = idx(s, x + NX[d], y + NY[d]);
            if (j < 0) continue;
            const b = lab[j];
            if (a === b) continue;
            const key = a < b ? a * nLab + b : b * nLab + a;
            if (seen.has(key)) continue;
            seen.set(key, 1);
            (sets[a] || (sets[a] = new Set())).add(b);
            (sets[b] || (sets[b] = new Set())).add(a);
          }
        }
        aliveCount = 0; let tot = 0, n = 0;
        for (let k = 0; k < nLab; k++) {
          sides[k] = sets[k] ? sets[k].size : 0;
          if (area[k] > 0) { aliveCount++; if (sides[k] > 0) { tot += sides[k]; n++; } }
        }
        meanSides = n ? tot / n : 0;
      }

      // von Neumann-Mullins, measured rather than asserted: regress the area change over the last stretch
      // of the run against n - 6. The slope is the constant in dA/dt = k(n - 6) and the correlation says
      // how cleanly the froth obeys it; a lattice that is too cold or a run that is too short shows it.
      function fitMullins(dt) {
        mullins = null; mullinsR = null;
        if (!areaAt || !sides || dt <= 0) return;
        const xs = [], ys = [];
        for (let k = 0; k < nLab; k++) {
          if (area[k] <= 0 || areaAt[k] <= 0 || sides[k] < 2) continue;
          xs.push(sides[k] - 6); ys.push((area[k] - areaAt[k]) / dt);
        }
        const n = xs.length;
        if (n < 12) return;
        let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
        for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
        const den = n * sxx - sx * sx;
        if (Math.abs(den) < 1e-9) return;
        mullins = (n * sxy - sx * sy) / den;
        const r2 = (n * syy - sy * sy) * den;
        if (r2 > 1e-12) mullinsR = (n * sxy - sx * sy) / Math.sqrt(r2);
      }

      function build(s, doneCb) {
        stop(); building = true;
        init(s);
        const rng = U.makeRng(s.seed + '/potts/mc');
        const markAt = Math.max(1, Math.floor(s.sweeps * 0.75));
        (function chunk() {
          const t0 = performance.now();
          while (sweepNo < s.sweeps && performance.now() - t0 < 45) {
            for (let k = 0; k < N; k++) attempt(s, rng);
            sweepNo++;
            if (sweepNo === markAt) areaAt = Float64Array.from(area);
          }
          if (sweepNo < s.sweeps) { countSides(s); status('coarsening'); timer = setTimeout(chunk, 0); }
          else {
            countSides(s);
            fitMullins(s.sweeps - markAt);
            building = false; doneCb();
          }
        })();
      }

      function status(extra) {
        const s = host.getState();
        host.setStatus(
          '<span>lattice <b>' + W + '×' + H + '</b>' + (s.wrap ? ' torus' : '') + '</span>' +
          '<span>sweep <b>' + sweepNo.toLocaleString() + '</b> / ' + s.sweeps + '</span>' +
          '<span><b>' + aliveCount.toLocaleString() + '</b> cells of ' + nLab.toLocaleString() + ' · mean area ' + (aliveCount ? Math.round(N / aliveCount).toLocaleString() : 0) + '</span>' +
          '<span>mean sides <b>' + meanSides.toFixed(2) + '</b>' + (s.wrap ? ' (Euler: 6)' : '') + '</span>' +
          (mullins !== null
            ? '<span>dA/dt = <b>' + mullins.toFixed(2) + '</b>·(n−6), r = ' + (mullinsR === null ? '?' : mullinsR.toFixed(2)) + '</span>'
            : '') +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }

      /* ---- picture ---- */
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const key = (s.palette || []).join(',');
        if (lut && lutKey === key) return;
        lut = U.makeRampLUT(s.palette, null, 256); lutKey = key;
      }
      function toneOf(s, k) {
        if (s.view === 'sides') {
          const n = sides ? sides[k] : 6;
          return U.clamp((n - 3) / 8, 0, 1);
        }
        if (s.view === 'area') {
          const a = area[k], mean = N / Math.max(1, aliveCount);
          return U.clamp(0.5 + 0.5 * Math.log(Math.max(a, 1) / mean) / 1.6, 0, 1);
        }
        return (((k * 2654435761) >>> 0) / 4294967296);
      }

      function paint(c2, PW, PH) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, PW, PH);
        if (!lab) return;
        ensureLut(s);
        const bgc = U.hexToRgb(s.bg);
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const g = off.getContext('2d');
        const img = g.createImageData(W, H), px = img.data;
        const shift = s.shift;
        const cache = new Int32Array(nLab).fill(-1);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, k = lab[i], o = i * 4;
          // a wall pixel is one whose right or lower neighbor has a different label
          const wall = s.wallW > 0 && (lab[idx(s, x + 1, y) < 0 ? i : idx(s, x + 1, y)] !== k || lab[idx(s, x, y + 1) < 0 ? i : idx(s, x, y + 1)] !== k);
          px[o + 3] = 255;
          if (s.view === 'walls') {
            const c = wall ? Math.round(U.clamp(0.75, 0, 1) * 255) * 3 : -1;
            if (c < 0) { px[o] = bgc[0]; px[o + 1] = bgc[1]; px[o + 2] = bgc[2]; }
            else { px[o] = lut[c]; px[o + 1] = lut[c + 1]; px[o + 2] = lut[c + 2]; }
            continue;
          }
          let ci = cache[k];
          if (ci < 0) { ci = Math.round(U.clamp((toneOf(s, k) + shift) % 1, 0, 1) * 255) * 3; cache[k] = ci; }
          if (wall) {
            const f = U.clamp(s.wallW / 2, 0, 1);
            px[o] = lut[ci] * (1 - f) + bgc[0] * f;
            px[o + 1] = lut[ci + 1] * (1 - f) + bgc[1] * f;
            px[o + 2] = lut[ci + 2] * (1 - f) + bgc[2] * f;
          } else { px[o] = lut[ci]; px[o + 1] = lut[ci + 1]; px[o + 2] = lut[ci + 2]; }
        }
        g.putImageData(img, 0, 0);
        c2.imageSmoothingEnabled = false;
        c2.drawImage(off, 0, 0, W, H, 0, 0, PW, PH);
        c2.imageSmoothingEnabled = true;
        if (s.grain > 0 && !building) {
          const im2 = c2.getImageData(0, 0, PW, PH), p2 = im2.data;
          const rng = U.makeRng(s.seed + '/grain'), amp = s.grain * 28;
          for (let i = 0; i < p2.length; i += 4) { const v = (rng() - 0.5) * amp; p2[i] += v; p2[i + 1] += v; p2[i + 2] += v; }
          c2.putImageData(im2, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          status('coarsening');
          build(s, () => { render(); status(); });
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!lab) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
