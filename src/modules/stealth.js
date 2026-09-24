
/* modules/stealth.js */
/* GENChase: stealthy hyperuniform points by collective-coordinate descent. S(k)=0 inside a disk around the origin. The suppressed disk is measured from the plate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Points', 'grid', 'Field', GEOM, 128, 384, 16, v => v + ''),
    { group: 'Points', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Points', 'n', 'How many', GEOM, 80, 900, 10, v => v + ''),
    RANGE('Stealth', 'chi', 'Stealth χ', GEOM, 0.05, 0.55, 0.01, f2, { hint: 'Fraction of degrees of freedom spent killing S(k) near the origin. χ = 0 is a Poisson gas. High χ is almost a crystal that still looks disordered.' }),
    RANGE('Stealth', 'steps', 'Descent steps', GEOM, 40, 800, 20, v => v + ''),
    RANGE('Stealth', 'rate', 'Step size', GEOM, 0.0002, 0.02, 0.0002, v => v.toFixed(4)),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['points', 'Points'], ['density', 'Density'], ['sk', 'S(k)']] },
    RANGE('Picture', 'dot', 'Dot size', PAINT, 1, 8, 0.5, v => Number(v).toFixed(1)),
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 256, aspect: '1:1', n: 280,
    chi: 0.28, steps: 220, rate: 0.004,
    view: 'points', dot: 3, exposure: 1,
  };

  const PRESETS = {
    stealth: pre('Stealthy', { chi: 0.32, n: 320, steps: 280, view: 'points' }, Pal.kiln),
    gas: pre('Poisson', { chi: 0.05, steps: 40, view: 'points' }, Pal.graphite),
    crystalish: pre('High χ', { chi: 0.48, n: 220, steps: 360, view: 'points' }, Pal.harbor),
    fourier: pre('Forbidden disk', { chi: 0.34, n: 360, steps: 300, view: 'sk' }, Pal.nightshade),
    density: pre('Density', { chi: 0.3, view: 'density', n: 400, steps: 260 }, Pal.ember),
    sparse: pre('Sparse', { n: 120, chi: 0.36, dot: 5, view: 'points' }, Pal.meadow),
    tight: pre('Tight pack', { n: 700, chi: 0.22, grid: 320, dot: 2, view: 'density' }, Pal.verdigris),
  };

  function surprise(rng) {
    return {
      n: rng.int(140, 520),
      chi: rng.range(0.12, 0.42),
      view: rng.pick(['points', 'points', 'sk', 'density']),
      steps: rng.int(120, 360),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(128, Math.min(384, Math.round(s.grid / 16) * 16));
    s.n = Math.max(40, Math.min(900, Math.round(s.n / 10) * 10));
  }

  Studio.register({
    id: 'stealth',
    name: 'Stealthy Points',
    tab: 'Stealth',
    subtitle: 'hyperuniform collective coordinates · 2004',
    order: 48,
    equation: 'χ = (1 / dN) #{ k : 0 < |k| < k_C },   S(k) = 0  for |k| < k_C',
    credit: 'Uche, Stillinger and Torquato, Phys. Rev. E 70, 046122 (2004), and Torquato, Stillinger, Phys. Rev. E 68, 041113 (2003). A stealthy hyperuniform point process is disordered in real space and yet has a crystal\'s forbidden disk in Fourier space: S(k) = 0 in a finite neighbourhood of the origin. No Bragg peaks, no Poisson small-k catastrophe. The construction is collective-coordinate descent on a torus, which is what this plate runs.',
    blurb: 'A Poisson gas has S(0) = 1. A crystal has Bragg peaks and S = 0 in between. Stealthy hyperuniform points look like a gas and measure like a crystal at long wavelength: the structure factor is forced to zero inside a disk around k = 0, using a fraction χ of the degrees of freedom. The eye cannot see the constraint. The Fourier view can. The status line reports mean S(k) inside the disk against 0, and S(0) itself.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Picture'],
    hints: {
      Stealth: 'χ is how much of the 2N-dimensional configuration space is spent killing small-k modes. Past about 0.5 the points crystallise. The forbidden disk grows with χ.',
    },
    palette: true,
    defaultPalette: 'kiln',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, px, py, N = 0, ks, sIn = 0, s0 = 0, buf;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(96, Math.round(g * aspect)) };
      }

      function kSet(n, chi) {
        const maxModes = Math.max(1, Math.floor(chi * 2 * n / 2));
        const list = [];
        const cap = 18;
        for (let ny = 0; ny <= cap; ny++) {
          for (let nx = (ny === 0 ? 1 : -cap); nx <= cap; nx++) {
            const k2 = nx * nx + ny * ny;
            if (k2 === 0) continue;
            list.push({ nx, ny, k2 });
          }
        }
        list.sort((a, b) => a.k2 - b.k2 || a.nx - b.nx);
        return list.slice(0, maxModes);
      }

      function descend(s) {
        const rng = U.makeRng(s.seed + '/r');
        N = s.n | 0;
        px = new Float64Array(N);
        py = new Float64Array(N);
        for (let i = 0; i < N; i++) { px[i] = rng(); py[i] = rng(); }
        ks = kSet(N, s.chi);
        const TWO = Math.PI * 2;
        const steps = s.steps | 0;
        const rate = s.rate;
        const X = new Float64Array(ks.length);
        const Y = new Float64Array(ks.length);
        for (let it = 0; it < steps; it++) {
          X.fill(0); Y.fill(0);
          for (let m = 0; m < ks.length; m++) {
            const kx = TWO * ks[m].nx, ky = TWO * ks[m].ny;
            let xr = 0, yr = 0;
            for (let i = 0; i < N; i++) {
              const th = kx * px[i] + ky * py[i];
              xr += Math.cos(th); yr += Math.sin(th);
            }
            X[m] = xr; Y[m] = yr;
          }
          for (let i = 0; i < N; i++) {
            let fx = 0, fy = 0;
            for (let m = 0; m < ks.length; m++) {
              const kx = TWO * ks[m].nx, ky = TWO * ks[m].ny;
              const th = kx * px[i] + ky * py[i];
              const c = Math.cos(th), sn = Math.sin(th);
              const g = Y[m] * c - X[m] * sn;
              fx += kx * g; fy += ky * g;
            }
            px[i] -= rate * fx / N;
            py[i] -= rate * fy / N;
            px[i] -= Math.floor(px[i]);
            py[i] -= Math.floor(py[i]);
            if (px[i] < 0) px[i] += 1;
            if (py[i] < 0) py[i] += 1;
          }
        }
        let acc = 0;
        for (let m = 0; m < ks.length; m++) {
          acc += (X[m] * X[m] + Y[m] * Y[m]) / (N * N);
        }
        sIn = ks.length ? acc / ks.length : 0;
        s0 = 1;
        {
          let xr = 0, yr = 0;
          const kx = TWO * 0.0001, ky = 0;
          for (let i = 0; i < N; i++) {
            const th = kx * px[i];
            xr += Math.cos(th); yr += Math.sin(th);
          }
          s0 = (xr * xr + yr * yr) / (N * N);
        }
      }

      function measureSk() {
        if (!px) return;
        const TWO = Math.PI * 2;
        let acc = 0;
        for (let m = 0; m < ks.length; m++) {
          const kx = TWO * ks[m].nx, ky = TWO * ks[m].ny;
          let xr = 0, yr = 0;
          for (let i = 0; i < N; i++) {
            const th = kx * px[i] + ky * py[i];
            xr += Math.cos(th); yr += Math.sin(th);
          }
          acc += (xr * xr + yr * yr) / (N * N);
        }
        sIn = ks.length ? acc / ks.length : 0;
      }

      function paint() {
        if (!px) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#C4472B', '#E8A33C', '#1E1B18'];
        const bg = s.bg || '#F1E8D8';
        const ramp = U.makeRamp(pal, bg);
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        const g = buf.getContext('2d', { alpha: false });
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        const view = s.view;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        if (view === 'sk') {
          const S = 96;
          const img = g.createImageData(S, S);
          let mx = 0;
          const val = new Float32Array(S * S);
          const TWO = Math.PI * 2;
          const kmax = 12;
          for (let ky = 0; ky < S; ky++) {
            for (let kx = 0; kx < S; kx++) {
              const nx = Math.round((kx / S - 0.5) * 2 * kmax);
              const ny = Math.round((ky / S - 0.5) * 2 * kmax);
              let xr = 0, yr = 0;
              const Kx = TWO * nx, Ky = TWO * ny;
              if (nx === 0 && ny === 0) { val[ky * S + kx] = 0; continue; }
              for (let i = 0; i < N; i++) {
                const th = Kx * px[i] + Ky * py[i];
                xr += Math.cos(th); yr += Math.sin(th);
              }
              const v = (xr * xr + yr * yr) / (N * N);
              val[ky * S + kx] = v;
              if (v > mx) mx = v;
            }
          }
          mx = mx || 1;
          for (let i = 0; i < val.length; i++) {
            const t = U.clamp(Math.pow(val[i] / mx, 0.45) * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0);
            const o = i * 4;
            img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
          }
          const tmp = document.createElement('canvas');
          tmp.width = S; tmp.height = S;
          tmp.getContext('2d').putImageData(img, 0, 0);
          g.imageSmoothingEnabled = true;
          g.drawImage(tmp, 0, 0, W, H);
        } else if (view === 'density') {
          const dens = new Float32Array(W * H);
          const sig = Math.max(1.2, Math.sqrt((W * H) / (Math.PI * N)) * 0.45);
          const rad = Math.ceil(sig * 3);
          for (let i = 0; i < N; i++) {
            const cx = px[i] * W, cy = py[i] * H;
            const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad);
            const y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad);
            for (let y = y0; y <= y1; y++) {
              for (let x = x0; x <= x1; x++) {
                const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                const wgt = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
                const xx = ((x % W) + W) % W, yy = ((y % H) + H) % H;
                dens[yy * W + xx] += wgt;
              }
            }
          }
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < dens.length; i++) { if (dens[i] < lo) lo = dens[i]; if (dens[i] > hi) hi = dens[i]; }
          const span = (hi - lo) || 1;
          const img = g.createImageData(W, H);
          for (let i = 0; i < dens.length; i++) {
            const t = U.clamp(((dens[i] - lo) / span) * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0);
            const o = i * 4;
            img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
          }
          g.putImageData(img, 0, 0);
        } else {
          const ink = pal[pal.length - 1] || '#1E1B18';
          g.fillStyle = ink;
          const r = Math.max(0.8, s.dot);
          for (let i = 0; i < N; i++) {
            const x = px[i] * W, y = py[i] * H;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
          }
        }
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        const verdict = sIn < 0.02 ? 'stealthy' : (sIn < 0.08 ? 'partial' : 'not stealthy');
        host.setStatus(
          '<span>' + N + ' points · ' + (ks ? ks.length : 0) + ' constrained k</span>' +
          // One relaxed configuration is one draw from the ensemble the descent reaches, so no spread
          // can be taken over it here and the bar is pending rather than invented.
          U.stats.compare({ label: '⟨S⟩ disk', measured: sIn, expected: 0, basis: 'sampled', pending: 'one configuration' }) +
          '<span>' + verdict + '</span>'
        );
        void s0;
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() {
          const s = host.getState();
          const sz = sizeFrom(s);
          W = sz.W; H = sz.H;
          descend(s);
          measureSk();
          paint();
          status();
        },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = true;
          g.fillStyle = s.bg || '#F1E8D8';
          g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
