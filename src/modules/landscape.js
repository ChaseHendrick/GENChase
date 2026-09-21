
/* modules/landscape.js */
/* GENChase — landscape evolution by stream-power incision and hillslope diffusion, and the drainage networks it organizes. */
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

  const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const DIST = [1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2];

  /* ---- binary heap over (key, index), typed arrays so the flood is not allocation-bound ---- */
  function Heap(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  Heap.prototype.reset = function () { this.n = 0; };
  Heap.prototype.push = function (key, val) {
    let i = this.n++;
    this.k[i] = key; this.v[i] = val;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= this.k[i]) break;
      const tk = this.k[p], tv = this.v[p];
      this.k[p] = this.k[i]; this.v[p] = this.v[i];
      this.k[i] = tk; this.v[i] = tv;
      i = p;
    }
  };
  Heap.prototype.pop = function () {
    const top = this.v[0];
    this.n--;
    if (this.n > 0) {
      this.k[0] = this.k[this.n]; this.v[0] = this.v[this.n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.n && this.k[l] < this.k[m]) m = l;
        if (r < this.n && this.k[r] < this.k[m]) m = r;
        if (m === i) break;
        const tk = this.k[m], tv = this.v[m];
        this.k[m] = this.k[i]; this.v[m] = this.v[i];
        this.k[i] = tk; this.v[i] = tv;
        i = m;
      }
    }
    return top;
  };

  /* ---------- Drainage Networks ---------- */
  Studio.register({
    id: 'landscape',
    name: 'Drainage Networks',
    tab: 'Drainage',
    subtitle: 'stream-power incision against uplift · 1994',
    order: 32,
    equation: '∂z/∂t = U − K·A^m·S + D∇²z,   A from D8 routing, S the slope to the receiver',
    credit: "Detachment-limited stream power: Alan Howard, 'A detachment-limited model of drainage basin evolution', Water Resources Research 30, 2261 (1994); the hillslope term is the linear diffusion of G. K. Gilbert's creep, formalised by W. E. H. Culling, Journal of Geology 68, 336 (1960). The O(n) implicit solver and the donor-stack ordering are Jean Braun and Sean Willett, 'A very efficient O(n), implicit and parallel method to solve the stream power equation', Geomorphology 180-181, 170 (2013). Depressions are removed by the priority-flood of Richard Barnes, Clarence Lehman and David Mulla, Computers and Geosciences 62, 117 (2014). The statistics of the resulting networks are the subject of Ignacio Rodríguez-Iturbe and Andrea Rinaldo, Fractal River Basins (1997); the competition between the two terms that sets valley spacing is Taylor Perron, James Kirchner and William Dietrich, Nature 460, 502 (2009).",
    blurb: 'Two processes and one competition. Rivers cut downward at a rate set by how much water passes and how steep the bed is, which is the A^m S term, and that term sharpens: the more a valley collects, the faster it deepens. Soil creep does the opposite, rounding everything toward a smooth hill. Where incision wins you get a channel; where creep wins you get a hillside. The line between them sets the spacing of the valleys, and the network that emerges is dendritic, branching at every scale, with no rule anywhere in the model that mentions branching. The elevation field never has a pit in it: every cell drains to the boundary, which is what lets the whole landscape be solved in one pass up the tree and one pass back down.',
    schema: [
      { group: 'Terrain', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [320, '320']] },
      { group: 'Terrain', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Terrain', key: 'bc', label: 'Base level', type: 'seg', kind: GEOM, wrap: true,
        options: [['all', 'All four edges'], ['bottom', 'One edge'], ['belt', 'Belt']],
        hint: 'All four edges gives an island. One edge gives a range draining one way. Belt wraps left to right and opens top and bottom, which is the geometry of a mountain chain with a drainage divide down it.' },
      RANGE('Terrain', 'steps', 'Steps', GEOM, 40, 400, 10, String),
      RANGE('Terrain', 'dt', 'Time step', GEOM, 0.005, 0.2, 0.005, f3, { hint: 'The incision is solved implicitly, so this is not a stability limit. It is a shape control: a large step carries each cell most of the way to its receiver in one go, which straightens the network into parallel gullies instead of letting it branch.' }),
      RANGE('Process', 'U', 'Uplift U', GEOM, 0.1, 4, 0.05, f2),
      RANGE('Process', 'K', 'Erodibility K', GEOM, 0.1, 4, 0.05, f2),
      RANGE('Process', 'm', 'Area exponent m', GEOM, 0.25, 0.7, 0.01, f2, { hint: 'The concavity of the channels. Natural rivers sit near 0.45, with the slope exponent at one, which is the case this tab solves exactly.' }),
      RANGE('Process', 'D', 'Hillslope diffusion D', GEOM, 0, 4, 0.05, f2, { hint: 'Raising it widens the hillslopes and pushes the valleys further apart; at zero the channels reach into every cell and the plate loses its ridges.' }),
      RANGE('Process', 'noise', 'Initial roughness', GEOM, 0.05, 3, 0.05, f2),
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['relief', 'Shaded relief'], ['hypso', 'Elevation'], ['area', 'Drainage area'], ['basins', 'Basins'], ['channels', 'Channel network']] },
      RANGE('Picture', 'light', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'vex', 'Vertical exaggeration', PAINT, 0.5, 20, 0.5, f1, { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'tint', 'Elevation tint', PAINT, 0, 1, 0.02, f2, { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'sea', 'Sea level', PAINT, 0, 0.6, 0.01, f2, { hint: 'A fraction of the relief. Flooding the lowest ground turns the plate into a coastline and is the quickest way to read the network as a map.' }),
      RANGE('Picture', 'thr', 'Channel threshold', PAINT, 0.0002, 0.05, 0.0002, f3, { dimUnless: s => s.view === 'channels',
        hint: 'As a fraction of the whole grid. Lower draws finer tributaries and a heavier file.' }),
      RANGE('Picture', 'wexp', 'Width exponent', PAINT, 0, 0.6, 0.02, f2, { dimUnless: s => s.view === 'channels' }),
      RANGE('Picture', 'lw', 'Line weight', PAINT, 0.2, 6, 0.1, f1, { dimUnless: s => s.view === 'channels' }),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      grid: 256, aspect: '1:1', bc: 'all', steps: 300, dt: 0.05,
      U: 1, K: 1.5, m: 0.45, D: 0.6, noise: 0.5,
      view: 'relief', light: 315, vex: 6, tint: 0.45, sea: 0,
      thr: 0.004, wexp: 0.3, lw: 1.4, gamma: 1, contrast: 1, grain: 0.04,
      seed: 'howard-1994',
    },
    presets: {
      island: pre('An island', { bc: 'all', view: 'relief', sea: 0.12, vex: 6, tint: 0.5, light: 315, D: 0.6 }, Pal.meadow),
      range: pre('A range draining one way', { bc: 'bottom', view: 'relief', sea: 0, vex: 5, tint: 0.4, light: 330, D: 0.8, aspect: '5:4' }, Pal.graphite),
      belt: pre('Mountain belt', { bc: 'belt', view: 'relief', sea: 0, vex: 7, tint: 0.35, light: 300, D: 0.5, aspect: '3:2' }, Pal.kiln),
      network: pre('The channel network', { bc: 'all', view: 'channels', thr: 0.002, wexp: 0.32, lw: 1.6, sea: 0 }, Pal.harbor),
      basins: pre('Watersheds', { bc: 'all', view: 'basins', sea: 0.06 }, Pal.risograph),
      area: pre('Discharge', { bc: 'bottom', view: 'area', sea: 0, aspect: '5:4' }, Pal.thermal),
      smooth: pre('Creep wins', { bc: 'all', D: 2.6, view: 'relief', vex: 8, tint: 0.5, sea: 0.1 }, Pal.verdigris),
    },
    hints: {
      Process: 'Uplift raises the whole interior, incision cuts the channels, creep rounds the hillsides. The plate is where the three settle against each other; raising D pushes the valleys apart, raising K deepens them.',
      Picture: 'The channel network is discrete marks, so that view exports as true vectors. Shaded relief is a continuous surface and exports as raster, which is the honest format for it.',
    },
    palette: true, defaultPalette: 'meadow',
    headline: 'D', headlineLabel: 'creep',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) || 256), 64, 320);
      s.steps = U.clamp(Math.round(Number(s.steps) || 220), 40, 400);
    },
    surprise(rng) {
      return {
        bc: rng.pick(['all', 'all', 'bottom', 'belt']),
        steps: rng.pick([140, 200, 260, 320]), dt: rng.pick([0.02, 0.03, 0.04, 0.06]),
        U: rng.range(0.6, 1.8), K: rng.range(0.6, 1.8), m: rng.range(0.35, 0.6), D: rng.range(0.2, 2.2),
        noise: rng.range(0.2, 1.2),
        view: rng.pick(['relief', 'relief', 'relief', 'channels', 'basins', 'area']),
        light: rng.int(0, 71) * 5, vex: rng.range(3, 12), tint: rng.range(0.2, 0.7),
        sea: rng.pick([0, 0, 0.06, 0.12, 0.2]),
        thr: rng.pick([0.001, 0.002, 0.004, 0.01]), wexp: rng.range(0.2, 0.45), lw: rng.range(0.9, 2.4),
        aspect: rng.pick(['1:1', '1:1', '5:4', '3:2', '16:9']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let W = 0, H = 0, N = 0;
      let z = null, rec = null, dist = null, stack = null, ndon = null, don = null, donOff = null,
        cur = null, area = null, tmp = null, done = null, basin = null, heap = null;
      let timer = 0, building = false, stepNo = 0, floods = 0, zmin = 0, zmax = 1, beta = null, nbasin = 0;

      function stop() { clearTimeout(timer); }

      function isOutlet(s, x, y) {
        if (s.bc === 'belt') return y === 0 || y === H - 1;
        if (s.bc === 'bottom') return y === H - 1;
        return x === 0 || y === 0 || x === W - 1 || y === H - 1;
      }
      // The belt wraps left to right, so a neighbor that walks off one side comes back on the other.
      // Everything else, including the flood, goes through this one function so the two geometries cannot drift.
      function nb(s, x, y, d) {
        let nx = x + DX[d];
        const ny = y + DY[d];
        if (ny < 0 || ny >= H) return -1;
        if (s.bc === 'belt') { if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0; }
        else if (nx < 0 || nx >= W) return -1;
        return ny * W + nx;
      }

      function alloc(s) {
        const g = s.grid, ar = ASPECTS[s.aspect] || 1;
        W = g; H = Math.max(48, Math.round(g * ar)); N = W * H;
        z = new Float64Array(N); rec = new Int32Array(N); dist = new Float64Array(N);
        stack = new Int32Array(N); ndon = new Int32Array(N); don = new Int32Array(N);
        donOff = new Int32Array(N + 1); cur = new Int32Array(N);
        area = new Float64Array(N); tmp = new Float64Array(N); done = new Uint8Array(N);
        basin = new Int32Array(N); heap = new Heap(N);
      }

      function seedTerrain(s) {
        const rng = U.makeRng(s.seed + '/landscape');
        for (let i = 0; i < N; i++) z[i] = rng() * s.noise;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isOutlet(s, x, y)) z[y * W + x] = 0;
      }

      // Priority-flood with an epsilon tilt. Every cell comes out with a strictly descending path to an
      // outlet, which is the precondition the routing below needs; without it a closed basin has no receiver
      // and the stack never reaches the cells above it, so a whole sub-catchment silently stops eroding.
      function flood(s, eps) {
        heap.reset(); done.fill(0);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (!isOutlet(s, x, y)) continue;
          const i = y * W + x;
          if (!done[i]) { done[i] = 1; heap.push(z[i], i); }
        }
        while (heap.n > 0) {
          const i = heap.pop(), x = i % W, y = (i / W) | 0;
          for (let d = 0; d < 8; d++) {
            const j = nb(s, x, y, d);
            if (j < 0 || done[j]) continue;
            done[j] = 1;
            const lift = z[i] + eps * DIST[d];
            if (z[j] < lift) z[j] = lift;
            heap.push(z[j], j);
          }
        }
      }

      // D8 receivers, then the donor-stack of Braun and Willett: one linear pass builds an order in which
      // every cell appears after the cell it drains into, so area accumulates in one reverse sweep and the
      // implicit incision solves in one forward sweep. No matrix, no iteration.
      function route(s) {
        let pits = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (isOutlet(s, x, y)) { rec[i] = i; dist[i] = 0; continue; }
          let best = -1, bestS = 0, bestD = 1;
          for (let d = 0; d < 8; d++) {
            const j = nb(s, x, y, d);
            if (j < 0) continue;
            const sl = (z[i] - z[j]) / DIST[d];
            if (sl > bestS) { bestS = sl; best = j; bestD = DIST[d]; }
          }
          if (best < 0) { rec[i] = i; dist[i] = 0; pits++; } else { rec[i] = best; dist[i] = bestD; }
        }
        ndon.fill(0);
        for (let i = 0; i < N; i++) if (rec[i] !== i) ndon[rec[i]]++;
        donOff[0] = 0;
        for (let i = 0; i < N; i++) donOff[i + 1] = donOff[i] + ndon[i];
        for (let i = 0; i < N; i++) cur[i] = donOff[i];
        for (let i = 0; i < N; i++) if (rec[i] !== i) don[cur[rec[i]]++] = i;
        let top = 0;
        nbasin = 0;
        for (let i = 0; i < N; i++) if (rec[i] === i) { basin[i] = nbasin++; stack[top++] = i; }
        for (let p = 0; p < top; p++) {
          const i = stack[p];
          for (let k = donOff[i]; k < donOff[i + 1]; k++) { const j = don[k]; basin[j] = basin[i]; stack[top++] = j; }
        }
        area.fill(1);
        for (let p = N - 1; p >= 0; p--) { const i = stack[p]; if (rec[i] !== i) area[rec[i]] += area[i]; }
        return pits;
      }

      function oneStep(s) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isOutlet(s, x, y)) z[y * W + x] += s.U * s.dt;
        if (s.D > 0) {
          // Explicit diffusion on the 5-point stencil: the operator's symbol runs over [-8, 0], so the step
          // has to satisfy dt < 2/(8D) at the grid scale. The outer step is set by the picture, not by
          // stability, so it is sub-stepped down to that bound rather than clamped.
          const sub = Math.max(1, Math.ceil(s.D * s.dt / 0.2));
          const sdt = s.dt / sub;
          for (let k = 0; k < sub; k++) {
            tmp.set(z);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              if (isOutlet(s, x, y)) continue;
              const i = y * W + x;
              let acc = -4 * tmp[i];
              for (const d of [0, 2, 4, 6]) { const j = nb(s, x, y, d); acc += j < 0 ? tmp[i] : tmp[j]; }
              z[i] = tmp[i] + s.D * sdt * acc;
            }
          }
        }
        if (route(s) > 0) { flood(s, 1e-7); route(s); floods++; }
        for (let p = 0; p < N; p++) {
          const i = stack[p];
          if (rec[i] === i) continue;
          const f = s.K * s.dt * Math.pow(area[i], s.m) / dist[i];
          const zr = z[rec[i]];
          z[i] = (z[i] + f * zr) / (1 + f);
          if (z[i] < zr) z[i] = zr;
        }
      }

      function measure() {
        zmin = Infinity; zmax = -Infinity;
        for (let i = 0; i < N; i++) { if (z[i] < zmin) zmin = z[i]; if (z[i] > zmax) zmax = z[i]; }
        if (!(zmax > zmin)) zmax = zmin + 1;
        // P(A > a) ~ a^-beta, least squares in log-log over the decade below the largest basin. Reported
        // as measured: natural networks come out near 0.45 and a detachment-limited model at this
        // resolution runs a little above that, so the number is the plate's, not a claim about rivers.
        const as = [];
        for (let i = 0; i < N; i++) if (area[i] > 1) as.push(area[i]);
        as.sort((a, b) => b - a);
        beta = null;
        if (as.length > 500) {
          const aMax = as[Math.floor(as.length * 0.001)] || as[0];
          let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
          for (let k = Math.floor(as.length * 0.002); k < as.length; k++) {
            const a = as[k];
            if (a < aMax / 300 || a > aMax / 2) continue;
            const x = Math.log(a), y = Math.log((k + 1) / as.length);
            sx += x; sy += y; sxx += x * x; sxy += x * y; n++;
          }
          if (n > 30) {
            const den = n * sxx - sx * sx;
            if (Math.abs(den) > 1e-9) beta = -(n * sxy - sx * sy) / den;
          }
        }
      }

      function status(extra) {
        const s = host.getState();
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b> · ' + ({ all: 'island', bottom: 'one open edge', belt: 'belt' }[s.bc]) + '</span>' +
          '<span>step <b>' + stepNo.toLocaleString() + '</b> / ' + s.steps + ' · t ' + (stepNo * s.dt).toFixed(1) + '</span>' +
          '<span>relief <b>' + (zmax - zmin).toFixed(2) + '</b> · ' + nbasin.toLocaleString() + ' outlets</span>' +
          (beta !== null ? '<span>area exceedance P(A&gt;a) ~ a<sup>−' + beta.toFixed(2) + '</sup></span>' : '') +
          '<span>' + floods.toLocaleString() + ' depression fills</span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }

      function build(s, doneCb) {
        stop(); building = true;
        alloc(s); seedTerrain(s); flood(s, 1e-7); route(s);
        stepNo = 0; floods = 0;
        // Progress is shown, but not by repainting the plate on every chunk: at print size the canvas is
        // several million pixels and the tone pass reads and writes all of them, which costs more than the
        // erosion it is reporting on and can leave the build unfinished. Repaint occasionally, and leave
        // the tone and grain pass for the final frame.
        let chunks = 0;
        (function chunk() {
          const t0 = performance.now();
          while (stepNo < s.steps && performance.now() - t0 < 60) { oneStep(s); stepNo++; }
          if (stepNo < s.steps) {
            measure(); status('building');
            if ((chunks++ & 7) === 0) render();
            timer = setTimeout(chunk, 0);
          } else { measure(); building = false; doneCb(); }
        })();
      }

      /* ---- picture ---- */
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const key = (s.palette || []).join(',');
        if (lut && lutKey === key) return;
        lut = U.makeRampLUT(s.palette, null, 256); lutKey = key;
      }
      const rgb = t => {
        const i = Math.max(0, Math.min(255, Math.round(t * 255))) * 3;
        return [lut[i], lut[i + 1], lut[i + 2]];
      };

      function paint(c2, PW, PH) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, PW, PH);
        if (!z || building && stepNo === 0) return;
        ensureLut(s);
        const rel = zmax - zmin, seaZ = zmin + s.sea * rel;
        const waterRgb = U.hexToRgb(s.bg);
        if (s.view === 'channels') {
          const thr = Math.max(2, s.thr * N);
          const sx = PW / W, sy = PH / H;
          c2.lineCap = 'round'; c2.lineJoin = 'round';
          const base = s.lw * PW / 1400;
          let aMax = 1;
          for (let i = 0; i < N; i++) if (area[i] > aMax) aMax = area[i];
          for (let i = 0; i < N; i++) {
            if (area[i] < thr || rec[i] === i) continue;
            if (z[i] < seaZ) continue;
            const x = i % W, y = (i / W) | 0, r = rec[i], rx = r % W, ry = (r / W) | 0;
            if (Math.abs(rx - x) > 1) continue;       // a belt segment that wraps: do not draw it across the plate
            c2.strokeStyle = 'rgb(' + rgb(0.25 + 0.7 * Math.pow(area[i] / aMax, 0.25)).join(',') + ')';
            c2.lineWidth = Math.max(0.3, base * Math.pow(area[i] / thr, s.wexp));
            c2.beginPath();
            c2.moveTo((x + 0.5) * sx, (y + 0.5) * sy);
            c2.lineTo((rx + 0.5) * sx, (ry + 0.5) * sy);
            c2.stroke();
          }
        } else {
          const img = c2.createImageData(PW, PH), px = img.data;
          const ang = s.light * Math.PI / 180, lx = Math.cos(ang), ly = Math.sin(ang), lz = 0.75;
          const ln = Math.hypot(lx, ly, lz);
          let aMax = 1;
          for (let i = 0; i < N; i++) if (area[i] > aMax) aMax = area[i];
          const logMax = Math.log(aMax);
          for (let py = 0; py < PH; py++) {
            const gy = Math.min(H - 1, Math.floor(py * H / PH));
            for (let pxi = 0; pxi < PW; pxi++) {
              const gx = Math.min(W - 1, Math.floor(pxi * W / PW));
              const i = gy * W + gx;
              let r, g, b;
              if (z[i] < seaZ && s.sea > 0) { r = waterRgb[0]; g = waterRgb[1]; b = waterRgb[2]; }
              else if (s.view === 'area') {
                const t = Math.log(Math.max(area[i], 1)) / Math.max(logMax, 1e-6);
                const c = rgb(t); r = c[0]; g = c[1]; b = c[2];
              } else if (s.view === 'basins') {
                // a cheap integer hash so neighboring outlet indices do not get neighboring colors
                const hsh = ((basin[i] * 2654435761) >>> 0) / 4294967296;
                const c = rgb(hsh); r = c[0]; g = c[1]; b = c[2];
              } else if (s.view === 'hypso') {
                const c = rgb((z[i] - zmin) / rel); r = c[0]; g = c[1]; b = c[2];
              } else {
                const xm = gx > 0 ? i - 1 : i, xp = gx < W - 1 ? i + 1 : i;
                const ym = gy > 0 ? i - W : i, yp = gy < H - 1 ? i + W : i;
                const gxv = (z[xp] - z[xm]) * 0.5 * s.vex, gyv = (z[yp] - z[ym]) * 0.5 * s.vex;
                const nl = Math.hypot(gxv, gyv, 1);
                const sh = Math.max(0, (-gxv * lx - gyv * ly + lz) / (nl * ln));
                const shade = 0.18 + 0.82 * Math.pow(sh, 1.1);
                const c = rgb(U.clamp((z[i] - zmin) / rel, 0, 1));
                const base = 255 * shade;
                r = base * (1 - s.tint) + c[0] * shade * s.tint * 1.25;
                g = base * (1 - s.tint) + c[1] * shade * s.tint * 1.25;
                b = base * (1 - s.tint) + c[2] * shade * s.tint * 1.25;
              }
              const o = (py * PW + pxi) * 4;
              px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
            }
          }
          c2.putImageData(img, 0, 0);
        }
        if (!building && (s.gamma !== 1 || s.contrast !== 1 || s.grain > 0)) {
          const img = c2.getImageData(0, 0, PW, PH), px = img.data;
          const rng = U.makeRng(s.seed + '/grain'), amp = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) {
            for (let k = 0; k < 3; k++) {
              let v = px[i + k] / 255;
              if (s.gamma !== 1) v = Math.pow(v, s.gamma);
              if (s.contrast !== 1) v = (v - 0.5) * s.contrast + 0.5;
              px[i + k] = Math.max(0, Math.min(255, v * 255 + (amp > 0 ? (rng() - 0.5) * amp : 0)));
            }
          }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          build(s, () => { render(); status(); });
          status('building');
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!z) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // Only the channel network is discrete marks. Shaded relief is a continuous surface and there is
        // nothing honest to vectorise in it, so this throws and the shell falls back to raster.
        exportSVG(w, h) {
          const s = host.getState();
          if (s.view !== 'channels') throw new Error('raster view');
          if (!z) throw new Error('nothing to export');
          ensureLut(s);
          const thr = Math.max(2, s.thr * N), sx = w / W, sy = h / H;
          const rel = zmax - zmin, seaZ = zmin + s.sea * rel;
          const base = s.lw * w / 1400, r2 = v => Math.round(v * 100) / 100;
          let aMax = 1;
          for (let i = 0; i < N; i++) if (area[i] > aMax) aMax = area[i];
          let body = '<g stroke-linecap="round">';
          for (let i = 0; i < N; i++) {
            if (area[i] < thr || rec[i] === i || z[i] < seaZ) continue;
            const x = i % W, y = (i / W) | 0, r = rec[i], rx = r % W, ry = (r / W) | 0;
            if (Math.abs(rx - x) > 1) continue;
            body += '<line x1="' + r2((x + 0.5) * sx) + '" y1="' + r2((y + 0.5) * sy) +
              '" x2="' + r2((rx + 0.5) * sx) + '" y2="' + r2((ry + 0.5) * sy) +
              '" stroke="rgb(' + rgb(0.25 + 0.7 * Math.pow(area[i] / aMax, 0.25)).join(',') + ')" stroke-width="' +
              r2(Math.max(0.3, base * Math.pow(area[i] / thr, s.wexp))) + '"/>';
          }
          body += '</g>';
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
