
/* modules/kpz.js */
/* GENChase — ballistic deposition, RSOS, surface relaxation and Eden growth: three roughening universality classes and the strata they leave. */
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

  // Growth exponent beta in W(t) ~ t^beta, for the 1+1 dimensional classes this tab can run.
  // Random deposition has no lateral correlation at all and never saturates. Surface relaxation is
  // Edwards-Wilkinson. Ballistic deposition and RSOS are Kardar-Parisi-Zhang, whose 1/3 is the number
  // the plate is really about: it is not 1/4, and the difference is visible as the interface roughening.
  const CLASS = {
    random: { beta: 0.5, name: 'random deposition', cls: 'uncorrelated, β = 1/2' },
    relax: { beta: 0.25, name: 'surface relaxation', cls: 'Edwards-Wilkinson, β = 1/4' },
    ballistic: { beta: 1 / 3, name: 'ballistic deposition', cls: 'KPZ, β = 1/3' },
    rsos: { beta: 1 / 3, name: 'restricted solid-on-solid', cls: 'KPZ, β = 1/3' },
    eden: { beta: 1 / 3, name: 'Eden cluster', cls: 'KPZ, β = 1/3' },
  };

  /* ---------- Rough Growth ---------- */
  Studio.register({
    id: 'kpz',
    name: 'Rough Growth',
    tab: 'Roughness',
    subtitle: 'ballistic deposition and the KPZ exponent · 1986',
    order: 33,
    equation: '∂h/∂t = ν∇²h + (λ/2)(∇h)² + η,   W(t) ~ t^β with β = 1/3 in 1+1 dimensions',
    credit: "Mehran Kardar, Giorgio Parisi and Yi-Cheng Zhang, 'Dynamic scaling of growing interfaces', Physical Review Letters 56, 889 (1986). The scaling form W(L, t) = L^α f(t/L^z) is Fereydoon Family and Tamás Vicsek, J. Phys. A 18, L75 (1985). Ballistic deposition is Murray Vold (1959) and Michael Sutherland (1966); the restricted solid-on-solid model is Jin Min Kim and Joel Kosterlitz, Phys. Rev. Lett. 62, 2289 (1989); surface relaxation is Family, J. Phys. A 19, L441 (1986); the cluster model is Murray Eden, in the Berkeley Symposium proceedings (1961). That the edge fluctuations follow the Tracy-Widom distributions is Michael Prähofer and Herbert Spohn, Phys. Rev. Lett. 84, 4882 (2000), and Kazumasa Takeuchi and Masaki Sano measured it in turbulent liquid crystal, Phys. Rev. Lett. 104, 230601 (2010).",
    blurb: 'Drop particles on a surface at random and the surface gets rough. How rough, and how fast, depends on almost nothing about the particles: three rules that differ only in what a particle does when it lands fall into three universality classes with three different exponents, and the exponents are all the physics there is. If the particle simply stacks where it fell, the height is a sum of independent Poisson counts and the width grows as t^(1/2) forever. If it hops to the lowest of its three candidate sites, lateral relaxation smooths the surface and the width grows as t^(1/4). If it sticks to the first thing it touches, so that a tall column reaches sideways and shadows its neighbors, growth is locally normal to the surface, a nonlinear term appears, and the width grows as t^(1/3). That last number is Kardar, Parisi and Zhang, and it has since been measured in turbulent liquid crystal and in bacterial colonies. The plate colors every particle by when it landed, so the strata are the history of the interface.',
    schema: [
      { group: 'Growth', key: 'model', label: 'Rule', type: 'seg', kind: GEOM, wrap: true,
        options: [['ballistic', 'Ballistic'], ['rsos', 'RSOS'], ['relax', 'Relaxation'], ['random', 'Random'], ['eden', 'Eden cluster']],
        hint: 'Ballistic and RSOS are KPZ. Relaxation is Edwards-Wilkinson. Random deposition has no lateral coupling at all. The Eden cluster is the same KPZ physics grown radially instead of on a line.' },
      { group: 'Growth', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Growth', 'cols', 'Lattice width', GEOM, 192, 1400, 8, String),
      RANGE('Growth', 'fill', 'Fill', GEOM, 0.2, 0.98, 0.02, pct, { hint: 'How far up the plate the deposit is grown. The width of the interface keeps increasing the whole way, so a taller deposit is a longer measurement of the exponent, not just more of the same.' }),
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['strata', 'Strata'], ['rings', 'Interfaces'], ['both', 'Both']] },
      RANGE('Picture', 'bands', 'Strata', PAINT, 1, 60, 1, String, { dimUnless: s => s.view !== 'rings',
        hint: 'Quantizes deposition time into layers. One band is a smooth gradient; many bands read as bedding planes and make the roughening legible layer by layer.' }),
      { group: 'Picture', key: 'logTime', label: 'Space the layers logarithmically', type: 'toggle', kind: PAINT },
      RANGE('Picture', 'lines', 'Interface count', PAINT, 2, 48, 1, String, { dimUnless: s => s.view !== 'strata' }),
      RANGE('Picture', 'lw', 'Line weight', PAINT, 0.2, 5, 0.1, f1, { dimUnless: s => s.view !== 'strata' }),
      RANGE('Picture', 'shift', 'Palette offset', PAINT, 0, 1, 0.02, f2),
      RANGE('Picture', 'void', 'Void contrast', PAINT, 0, 1, 0.02, f2, { dimUnless: s => s.model === 'ballistic' || s.model === 'eden',
        hint: 'Ballistic deposition leaves overhangs, so the deposit is porous. This is how strongly those voids read against the solid.' }),
      RANGE('Picture', 'margin', 'Margin', PAINT, 0, 0.15, 0.01, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      model: 'ballistic', aspect: '1:1', cols: 700, fill: 0.86,
      view: 'strata', bands: 26, logTime: false, lines: 18, lw: 1.2,
      shift: 0, void: 0.55, margin: 0.03, grain: 0.04,
      seed: 'kardar-1986',
    },
    presets: {
      kpz: pre('Ballistic, KPZ', { model: 'ballistic', view: 'strata', bands: 26, cols: 700, fill: 0.86, void: 0.55 }, Pal.ember),
      ew: pre('Relaxation, Edwards–Wilkinson', { model: 'relax', view: 'strata', bands: 30, cols: 700, fill: 0.88 }, Pal.glacier),
      rd: pre('Random deposition', { model: 'random', view: 'strata', bands: 30, cols: 700, fill: 0.86 }, Pal.kiln),
      rsos: pre('Restricted solid-on-solid', { model: 'rsos', view: 'strata', bands: 34, cols: 900, fill: 0.9 }, Pal.verdigris),
      eden: pre('Eden cluster', { model: 'eden', view: 'strata', bands: 40, cols: 620, fill: 0.9, logTime: false }, Pal.thermal),
      rings: pre('The interface, every doubling', { model: 'ballistic', view: 'rings', lines: 16, lw: 1.4, logTime: true, cols: 900, fill: 0.9 }, Pal.graphite),
      wide: pre('A long line', { model: 'ballistic', view: 'both', bands: 22, lines: 12, cols: 1400, fill: 0.8, aspect: '16:9' }, Pal.harbor),
    },
    hints: {
      Growth: 'Every draw comes from the seeded generator, so the same seed grows the same deposit particle for particle. The status line fits the roughening exponent from the deposit actually on the plate and prints it next to the exponent its class predicts. Read it as a measurement, not a verdict: random deposition lands on 1/2 immediately, but ballistic deposition crosses over to KPZ slowly and a plate-sized run fits a little under 1/3, while RSOS gets there faster.',
      Picture: 'Interfaces are traced lines, so that view exports as vectors. Strata are a deposited lattice, which is a raster and stays one.',
    },
    palette: true, defaultPalette: 'ember',
    headline: 'cols', headlineLabel: 'columns',
    sanitize(s) {
      s.cols = U.clamp(Math.round(Number(s.cols) || 700), 192, 1400);
      s.bands = U.clamp(Math.round(Number(s.bands) || 26), 1, 60);
    },
    surprise(rng) {
      return {
        model: rng.pick(['ballistic', 'ballistic', 'rsos', 'relax', 'random', 'eden']),
        cols: rng.pick([400, 600, 800, 1000, 1200]),
        fill: rng.range(0.7, 0.95),
        view: rng.pick(['strata', 'strata', 'strata', 'rings', 'both']),
        bands: rng.pick([1, 8, 16, 26, 38, 52]), logTime: rng() < 0.35,
        lines: rng.int(8, 28), lw: rng.range(0.7, 2.2),
        shift: rng.range(0, 1), void: rng.range(0.2, 0.8),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2', '16:9']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let W = 0, H = 0, cell = null, h = null, snaps = null, nPart = 0, target = 0;
      let timer = 0, building = false, betaFit = null, betaSE = NaN, wFinal = 0, radial = false, pointsUsed = 0;
      let perim = null, nPerim = 0;

      function stop() { clearTimeout(timer); }

      function alloc(s) {
        const ar = ASPECTS[s.aspect] || 1;
        W = s.cols; H = Math.max(64, Math.round(s.cols * ar));
        cell = new Int32Array(W * H);          // 0 = empty, otherwise the particle number that landed there
        h = new Int32Array(W);
        snaps = [];
        nPart = 0;
        radial = s.model === 'eden';
      }

      // Width of the interface: the standard deviation of the column heights. Measured at logarithmically
      // spaced particle counts so a straight line through log W against log t covers the whole run rather
      // than being dominated by the end of it.
      const widths = [];
      function widthNow() {
        let m = 0;
        for (let x = 0; x < W; x++) m += h[x];
        m /= W;
        let v = 0;
        for (let x = 0; x < W; x++) { const d = h[x] - m; v += d * d; }
        return { w: Math.sqrt(v / W), mean: m };
      }

      function seedRadial(s, rng) {
        // Eden model A: keep a list of empty sites adjacent to the cluster, pick one uniformly, occupy it.
        perim = new Int32Array(W * H); nPerim = 0;
        const cx = W >> 1, cy = H >> 1;
        cell[cy * W + cx] = 1; nPart = 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const i = (cy + dy) * W + cx + dx;
          perim[nPerim++] = i; cell[i] = -1;
        }
      }
      function stepRadial(rng, n) {
        for (let k = 0; k < n && nPerim > 0; k++) {
          const p = (rng() * nPerim) | 0;
          const i = perim[p];
          perim[p] = perim[--nPerim];
          const x = i % W, y = (i / W) | 0;
          if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) { nPerim = 0; break; }
          cell[i] = ++nPart;
          for (const d of [1, -1, W, -W]) {
            const j = i + d;
            if (cell[j] === 0) { cell[j] = -1; perim[nPerim++] = j; }
          }
        }
      }

      function stepColumns(s, rng, n) {
        const top = H - 2;
        for (let k = 0; k < n; k++) {
          const x = (rng() * W) | 0;
          let y;
          if (s.model === 'random') y = h[x] + 1;
          else if (s.model === 'ballistic') {
            // stick to the first thing touched: the particle lands beside a tall neighbor rather than on top
            // of its own column, which is the lateral growth that makes this KPZ rather than Edwards-Wilkinson
            const l = x > 0 ? h[x - 1] : h[W - 1], r = x < W - 1 ? h[x + 1] : h[0];
            y = Math.max(h[x] + 1, l, r);
          } else if (s.model === 'relax') {
            const lx = x > 0 ? x - 1 : W - 1, rx = x < W - 1 ? x + 1 : 0;
            let best = x;
            if (h[lx] < h[best]) best = lx;
            if (h[rx] < h[best]) best = rx;
            y = h[best] + 1;
            if (y > top) { target = nPart; return true; }
            cell[y * W + best] = ++nPart; h[best] = y;
            continue;
          } else {
            const lx = x > 0 ? x - 1 : W - 1, rx = x < W - 1 ? x + 1 : 0;
            y = h[x] + 1;
            if (y - h[lx] > 1 || y - h[rx] > 1) continue;   // RSOS: the step to a neighbor may not exceed one
          }
          if (y > top) { target = nPart; return true; }
          cell[y * W + x] = ++nPart;
          h[x] = y;
        }
        return false;
      }

      function build(s, doneCb) {
        stop(); building = true;
        alloc(s);
        const rng = U.makeRng(s.seed + '/kpz');
        widths.length = 0;
        const limit = radial ? Math.floor(W * H * 0.9) : Math.floor(W * H * s.fill * 1.4);
        const stopH = Math.floor(H * s.fill);
        if (radial) seedRadial(s, rng);
        // Sample the width at logarithmically spaced particle counts. Depositing in fixed blocks and
        // measuring after each one puts almost every sample in the last stretch of the run, and a least
        // squares fit in log-log then answers a question about the tail instead of about the growth law.
        let nextMeasure = 4 * W;
        (function chunk() {
          const t0 = performance.now();
          let full = false;
          while (!full && performance.now() - t0 < 45) {
            if (radial) {
              stepRadial(rng, 20000);
              if (nPerim === 0 || nPart > limit) full = true;
            } else {
              const want = Math.max(1000, Math.min(60000, Math.ceil(nextMeasure - nPart)));
              full = stepColumns(s, rng, want);
              const m = widthNow();
              if (nPart >= nextMeasure) { widths.push([nPart / W, m.w]); nextMeasure = Math.ceil(nextMeasure * 1.25); }
              if (m.mean >= stopH || nPart > limit) full = true;
            }
          }
          if (!full) { status('growing'); timer = setTimeout(chunk, 0); }
          else { finish(s); building = false; doneCb(); }
        })();
      }

      function finish(s) {
        target = nPart;
        if (!radial) {
          const m = widthNow();
          wFinal = m.w;
          // Least squares on log W against log t across the whole run, from a few layers up to the last
          // sample, excluding anything near saturation at W ~ L^alpha where the growth exponent no longer
          // governs. Fitting a shorter window was tried and abandoned: the width of one realisation
          // fluctuates by tens of percent between samples, so a single decade is noise and the fitted
          // number swung between 0.09 and 0.41 on runs of the same model. Over the full run it is stable.
          const pts = widths.filter(p => p[0] >= 4 && p[1] > 0.4 && p[1] < W * 0.06);
          betaFit = null; betaSE = NaN; pointsUsed = pts.length;
          if (pts.length > 5) {
            let sx = 0, sy = 0, sxx = 0, sxy = 0;
            for (const [t, w] of pts) { const X = Math.log(t), Y = Math.log(w); sx += X; sy += Y; sxx += X * X; sxy += X * Y; }
            const n = pts.length, den = n * sxx - sx * sx;
            if (Math.abs(den) > 1e-9) betaFit = (n * sxy - sx * sy) / den;
            // The samples lie along one growing interface, so their residuals are correlated and the
            // ordinary least squares error would be far too small. A moving-block bootstrap over the
            // same points keeps neighbors together; its draws are seeded, so the bar reprints.
            if (betaFit !== null && n >= 8) {
              betaSE = U.stats.slopeBootstrap(pts.map(p => Math.log(p[0])), pts.map(p => Math.log(p[1])),
                { seed: s.seed + '/kpz-beta', reps: 300 }).se;
            }
          }
        } else { betaFit = null; betaSE = NaN; wFinal = 0; pointsUsed = 0; }
      }

      function status(extra) {
        const s = host.getState(), C = CLASS[s.model];
        host.setStatus(
          '<span>lattice <b>' + W + '×' + H + '</b> · ' + C.name + '</span>' +
          '<span><b>' + nPart.toLocaleString() + '</b> particles</span>' +
          (radial ? '' : '<span>interface width <b>' + wFinal.toFixed(1) + '</b></span>') +
          (betaFit !== null
            ? U.stats.compare({ label: 'fitted β', measured: betaFit, expected: C.cls.split('β = ')[1], expectedValue: C.beta,
                reference: C.cls.split(',')[0], basis: 'sampled', uncertainty: betaSE, digits: 3,
                method: 'block bootstrap over ' + pointsUsed + ' log-spaced samples of one run',
                pending: pointsUsed < 8 ? 'fewer than 8 samples' : 'bootstrap gave no spread', note: pointsUsed + ' samples' })
            : '<span>' + C.cls + '</span>') +
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
      function tone(s, t) {
        t = ((t + s.shift) % 1 + 1) % 1;
        if (s.bands > 1) t = Math.floor(t * s.bands) / Math.max(1, s.bands - 1);
        return Math.max(0, Math.min(1, t));
      }

      function paintLattice(s) {
        // The cells are the picture, so the lattice is drawn at one pixel per cell and scaled up with
        // nearest-neighbor sampling; smoothing it would invent material that was never deposited.
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const g = off.getContext('2d');
        const img = g.createImageData(W, H), px = img.data;
        const bgc = U.hexToRgb(s.bg);
        const maxT = Math.max(1, nPart);
        for (let y = 0; y < H; y++) {
          const sy = H - 1 - y;
          for (let x = 0; x < W; x++) {
            const v = cell[sy * W + x];
            const o = (y * W + x) * 4;
            px[o + 3] = 255;
            if (v <= 0) {
              // an overhang void inside the deposit, or the air above it
              const below = sy < h[x] || radial;
              const k = below ? 1 - s.void : 1;
              px[o] = bgc[0] * k + 255 * (1 - k) * 0; px[o + 1] = bgc[1] * k; px[o + 2] = bgc[2] * k;
              if (!below) { px[o] = bgc[0]; px[o + 1] = bgc[1]; px[o + 2] = bgc[2]; }
              continue;
            }
            let t = v / maxT;
            if (s.logTime) t = Math.log(1 + 9 * t) / Math.log(10);
            const c = Math.round(tone(s, t) * 255) * 3;
            px[o] = lut[c]; px[o + 1] = lut[c + 1]; px[o + 2] = lut[c + 2];
          }
        }
        g.putImageData(img, 0, 0);
        return off;
      }

      // Interface profiles at logarithmically spaced particle counts, reconstructed from the deposit:
      // the height of column x at time T is the highest occupied cell whose particle number is below T.
      function profiles(s) {
        const out = [];
        const n = Math.max(2, s.lines);
        for (let k = 1; k <= n; k++) {
          const frac = s.logTime ? Math.pow(nPart, k / n) / nPart : k / n;
          const T = Math.max(1, Math.floor(frac * nPart));
          const prof = new Int32Array(W);
          for (let x = 0; x < W; x++) {
            let top = 0;
            for (let y = H - 1; y >= 0; y--) { const v = cell[y * W + x]; if (v > 0 && v <= T) { top = y; break; } }
            prof[x] = top;
          }
          out.push({ T, prof });
        }
        return out;
      }

      function paint(c2, PW, PH) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, PW, PH);
        if (!cell || nPart === 0) return;
        ensureLut(s);
        const m = s.margin, ox = PW * m, oy = PH * m, pw = PW * (1 - 2 * m), ph = PH * (1 - 2 * m);
        if (s.view !== 'rings') {
          const off = paintLattice(s);
          c2.imageSmoothingEnabled = false;
          c2.drawImage(off, 0, 0, W, H, ox, oy, pw, ph);
          c2.imageSmoothingEnabled = true;
        }
        if (s.view !== 'strata' && !radial) {
          const list = profiles(s);
          c2.lineJoin = 'round'; c2.lineCap = 'round';
          c2.lineWidth = Math.max(0.4, s.lw * PW / 1400);
          list.forEach((p, k) => {
            const c = Math.round(tone(s, (k + 0.5) / list.length) * 255) * 3;
            c2.strokeStyle = s.view === 'both' ? U.inkRgba(s.bg, 0.75) : 'rgb(' + lut[c] + ',' + lut[c + 1] + ',' + lut[c + 2] + ')';
            c2.beginPath();
            for (let x = 0; x < W; x++) {
              const X = ox + pw * (x + 0.5) / W, Y = oy + ph * (1 - (p.prof[x] + 0.5) / H);
              if (x === 0) c2.moveTo(X, Y); else c2.lineTo(X, Y);
            }
            c2.stroke();
          });
        }
        if (s.grain > 0 && !building) {
          const img = c2.getImageData(0, 0, PW, PH), px = img.data;
          const rng = U.makeRng(s.seed + '/grain'), amp = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * amp; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          status('growing');
          build(s, () => { render(); status(); });
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!cell) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // Only the traced interfaces are marks. The strata are a deposited lattice, which is a raster.
        exportSVG(w, h) {
          const s = host.getState();
          if (s.view !== 'rings' || radial) throw new Error('raster view');
          if (!cell) throw new Error('nothing to export');
          ensureLut(s);
          const m = s.margin, ox = w * m, oy = h * m, pw = w * (1 - 2 * m), ph = h * (1 - 2 * m);
          const r = v => Math.round(v * 100) / 100;
          const list = profiles(s);
          let body = '<g fill="none" stroke-linejoin="round" stroke-width="' + r(Math.max(0.4, s.lw * w / 1400)) + '">';
          list.forEach((p, k) => {
            const c = Math.round(tone(s, (k + 0.5) / list.length) * 255) * 3;
            const pts = [];
            for (let x = 0; x < W; x++) pts.push(r(ox + pw * (x + 0.5) / W) + ',' + r(oy + ph * (1 - (p.prof[x] + 0.5) / H)));
            body += '<polyline stroke="rgb(' + lut[c] + ',' + lut[c + 1] + ',' + lut[c + 2] + ')" points="' + pts.join(' ') + '"/>';
          });
          body += '</g>';
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
