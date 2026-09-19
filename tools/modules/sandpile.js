/* modules/sandpile.js */
/* GENChase: rotor-router aggregation (the Propp machine) against internal DLA at the same particle count, with the odometer, the rotor field, the measured inradius and outradius, and the abelian property checked cell by cell. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Directions in screen order with y running down the buffer: 0 east, 1 south, 2 west, 3 north.
  // A rotor advances 0 -> 1 -> 2 -> 3 -> 0, which is a quarter turn clockwise on the plate.

  // Lattice half-width. The aggregate of n particles has radius about sqrt(n / pi); a particle only ever
  // moves while it is standing on an occupied site, so it can never get outside the aggregate, and the
  // margin below has never been approached in testing up to n = 100,000. The simulations still check
  // whether a particle has come to rest on the border ring and stop if one ever does.
  const latticeR = n => Math.ceil(Math.sqrt(n / Math.PI)) + 12 + Math.ceil(2.5 * Math.log(Math.max(2, n)));
  // Half-width of the plate itself, fixed in advance from n so the picture does not jump size while it builds.
  const plateR = n => Math.ceil(Math.sqrt(n / Math.PI)) + 6;

  // The starting rotors are built once, into an array, and both firing orders are handed the same array.
  // Drawing them twice from one seeded generator would advance the stream and hand the second order a
  // different lattice, which would make the abelian comparison a comparison of two different problems.
  function initRotors(kind, W, N, rng) {
    const a = new Uint8Array(N);
    if (kind === 'random') { for (let i = 0; i < N; i++) a[i] = rng.int(0, 3); }
    else if (kind === 'checker') { for (let i = 0; i < N; i++) a[i] = (((i % W) + ((i / W) | 0)) & 3); }
    // otherwise every rotor points east, so the first chip out of every site goes south
    return a;
  }

  // Rotor-router aggregation, routed one particle at a time. Each particle leaves the origin, and at every
  // occupied site it turns that site's rotor one step and follows it; the first unoccupied site it reaches
  // is where it stops. No random number is consulted anywhere in this loop.
  function newRotorSim(W, c, n, rot0) {
    const N = W * W;
    const occ = new Uint8Array(N), rot = new Uint8Array(N), od = new Int32Array(N), arr = new Int32Array(N).fill(-1);
    rot.set(rot0);
    occ[c] = 1; arr[c] = 0;
    let k = 1, steps = 0, escaped = false;
    const edge = p => p < W || p >= N - W || (p % W) === 0 || (p % W) === W - 1;
    return {
      occ, rot, od, arr, W,
      placed: () => k, steps: () => steps, escaped: () => escaped,
      step(ms) {
        const t0 = performance.now();
        while (k < n) {
          let p = c;
          while (occ[p]) {
            const d = (rot[p] + 1) & 3; rot[p] = d; od[p]++;
            p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
            steps++;
          }
          occ[p] = 1; arr[p] = k; k++;
          if (edge(p)) { escaped = true; return true; }
          if ((k & 63) === 0 && performance.now() - t0 > ms) return false;
        }
        return true;
      },
    };
  }

  // Internal diffusion limited aggregation: the same growth with a fair four-sided coin in place of the rotor.
  // This is the one place in the tab a random number is drawn, and it comes from the seeded generator.
  // A walk of four hundred million steps needs four hundred million coin flips, so the draws are taken
  // sixteen at a time: makeRng returns a full 32-bit word scaled into [0, 1), the multiplication back up by
  // 2^32 is exact, and the word is spent two bits per step. Same generator, same stream, same plate for a
  // given seed, one call instead of sixteen.
  function newIdlaSim(W, c, n, rng) {
    const N = W * W;
    const occ = new Uint8Array(N), od = new Int32Array(N), arr = new Int32Array(N).fill(-1);
    occ[c] = 1; arr[c] = 0;
    let k = 1, steps = 0, escaped = false, bits = 0, spare = 0;
    const edge = p => p < W || p >= N - W || (p % W) === 0 || (p % W) === W - 1;
    return {
      occ, rot: null, od, arr, W,
      placed: () => k, steps: () => steps, escaped: () => escaped,
      step(ms) {
        const t0 = performance.now();
        while (k < n) {
          let p = c;
          while (occ[p]) {
            if (spare === 0) { bits = (rng() * 4294967296) >>> 0; spare = 16; }
            const d = bits & 3; bits >>>= 2; spare--;
            od[p]++;
            p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
            steps++;
          }
          occ[p] = 1; arr[p] = k; k++;
          if (edge(p)) { escaped = true; return true; }
          if ((k & 63) === 0 && performance.now() - t0 > ms) return false;
        }
        return true;
      },
    };
  }

  // The same rotor-router aggregate built in a completely different order. Instead of routing one particle
  // to rest before the next one starts, all n particles are released at once and advanced in lockstep, one
  // legal move each per round: a particle standing on an occupied site turns that rotor and steps, a particle
  // standing on an unoccupied site claims it and drops out. Every interleaving of legal moves is allowed, and
  // the abelian property says they all end in the same place. That is what the plate checks, cell by cell.
  function newRoundRobin(W, c, n, rot0) {
    const N = W * W;
    const occ = new Uint8Array(N), rot = new Uint8Array(N), od = new Int32Array(N);
    rot.set(rot0);
    const pos = new Int32Array(n);
    for (let i = 0; i < n; i++) pos[i] = c;
    let m = n;
    return {
      occ, rot, od,
      left: () => m,
      step(ms) {
        const t0 = performance.now();
        while (m > 0) {
          let w = 0;
          for (let i = 0; i < m; i++) {
            let p = pos[i];
            if (occ[p] === 0) { occ[p] = 1; continue; }
            const d = (rot[p] + 1) & 3; rot[p] = d; od[p]++;
            p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
            pos[w++] = p;
          }
          m = w;
          if (performance.now() - t0 > ms) break;
        }
        return m === 0;
      },
    };
  }

  // Inradius as the distance to the nearest site the aggregate failed to fill, outradius as the distance to
  // the farthest site it did fill. Both are read off the finished plate, not predicted.
  function radii(occ, W, cx, cy) {
    let inr = Infinity, out = 0, cells = 0;
    for (let y = 0; y < W; y++) {
      const dy = y - cy, row = y * W;
      for (let x = 0; x < W; x++) {
        const dx = x - cx, r = Math.sqrt(dx * dx + dy * dy);
        if (occ[row + x]) { if (r > out) out = r; cells++; }
        else if (r < inr) inr = r;
      }
    }
    return { inr: inr === Infinity ? 0 : inr, out, cells };
  }

  function maxOf(a) { let m = 0; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }

  const band = (t, cyc) => {
    t = U.clamp(t, 0, 1);
    if (cyc <= 1) return t;
    const v = t * cyc, f = v - Math.floor(v);
    return f === 0 && v > 0 ? 1 : f;
  };

  /* ---------- Rotor Routers ---------- */
  Studio.register({
    id: 'rotor',
    name: 'Rotor Routers',
    tab: 'Rotor',
    subtitle: 'rotor-router aggregation and internal DLA · 2009',
    order: 41,
    equation: 'at an occupied site turn the rotor a quarter turn and follow it; stop at the first unoccupied site.   B(r − c log r) ⊆ A(n) ⊆ B(r + c log r),  r = √(n/π)',
    credit: "Lionel Levine and Yuval Peres, 'Strong spherical asymptotics for rotor-router aggregation and the divisible sandpile', Potential Analysis 30, 1 (2009), is the theorem this plate measures: the rotor-router aggregate of n particles contains a disk of radius √(n/π) − O(log n) and sits inside one of radius √(n/π) + O(log n), with no probability anywhere in the statement. The rotor-router walk and the aggregation model are James Propp's; they are studied in Ander Holroyd and James Propp, 'Rotor walks and Markov chains', Contemporary Mathematics 520 (2010), and in Joshua Cooper and Joel Spencer, 'Simulating a random walk with constant error', Combinatorics, Probability and Computing 15 (2006). Internal diffusion limited aggregation, the random counterpart drawn beside it, is Gregory Lawler, Maury Bramson and David Griffeath, 'Internal diffusion limited aggregation', Annals of Probability 20, 2117 (1992), who proved its limit shape is a disk; David Jerison, Lionel Levine and Scott Sheffield, Journal of the American Mathematical Society 25, 271 (2012), showed its fluctuations are logarithmic as well, so the gap the plate measures between the two is one of constants and of certainty, not of orders. That a finished aggregate does not depend on the order the particles were routed in is the abelian property of Persi Diaconis and William Fulton, Rendiconti del Seminario Matematico dell'Università e del Politecnico di Torino (1991); it is the same argument Deepak Dhar, Physical Review Letters 64, 1613 (1990), made for the abelian sandpile of Per Bak, Chao Tang and Kurt Wiesenfeld, Physical Review Letters 59, 381 (1987).",
    blurb: 'Give every site of the square lattice a little arrow and one rule: when a particle arrives, turn the arrow a quarter turn and send the particle the way it now points. Release particles one at a time from the origin, each walking until it reaches a site nobody has claimed, and let it stop there. Nothing in that is random, and yet twenty thousand particles settle into a disk that is round to within about a cell and a half. That is the theorem: the inradius and the outradius both sit within a constant times log n of the radius √(n/π) a disk of that area would have, and the status line measures all three off the plate rather than asserting them. Beside it is internal diffusion limited aggregation, the identical growth with a coin flip in place of the arrow at the identical particle count, and the comparison is the point: the random blob is round too, but its rim is frayed several times as wide. The odometer counts how many particles passed through each site and bands the count into contours, so the deterministic level sets come out as clean circles and the random ones shred at the edge. The rotor view draws the arrows themselves, and it is the strangest picture here, a quilt of patches with no randomness anywhere in it. The seed changes only the coin flips of the random aggregate, the optional scatter of the starting arrows, and the paper grain.',
    schema: [
      { group: 'Aggregate', key: 'mode', label: 'Growth', type: 'seg', kind: GEOM, wrap: true,
        options: [['rotor', 'Rotor-router'], ['idla', 'Internal DLA'], ['both', 'Side by side']],
        hint: 'Side by side grows both at the same particle count and draws them on one plate at one scale, which is the only fair way to look at them.' },
      RANGE('Aggregate', 'n', 'Particles', GEOM, 1000, 50000, 1000, v => v.toLocaleString(),
        { hint: 'Both models cost about n² steps in total, because the n-th particle has to cross an aggregate of radius √(n/π) before it can stop. Twenty thousand rotor-routed particles land in about a second, and side by side in under three; fifty thousand side by side takes around fifteen, with the count shown as it goes.' }),
      { group: 'Aggregate', key: 'rot0', label: 'Starting arrows', type: 'seg', kind: GEOM,
        options: [['east', 'All east'], ['checker', 'Diagonal stripes'], ['random', 'Scattered']],
        dimUnless: s => s.mode !== 'idla',
        hint: 'The theorem holds for any starting arrangement of rotors. All east is the classic Propp machine. Scattered is the one choice on this tab that the seed controls, and it is still a disk.' },
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['disk', 'Core and rim'], ['arrival', 'Arrival time'], ['odometer', 'Odometer'], ['rotors', 'Rotor field']],
        hint: 'Core and rim splits the aggregate at the measured inradius, so the ragged shell between inradius and outradius is drawn as itself. Rotor field needs rotors and falls back to core and rim for the random aggregate.' },
      RANGE('Picture', 'cycles', 'Contour bands', PAINT, 1, 14, 1, String,
        { dimUnless: s => s.view === 'arrival' || s.view === 'odometer',
          hint: 'How many times the palette repeats across the range. One is a smooth gradient; several turn the level sets of the count into contour rings, which is where the two models part company.' }),
      RANGE('Picture', 'tone', 'Odometer curve', PAINT, 0.15, 1, 0.05, f2,
        { dimUnless: s => s.view === 'odometer',
          hint: 'The odometer falls off steeply from the origin. This is the exponent it is raised to before the ramp, so a low value opens out the quiet rim.' }),
      { group: 'Picture', key: 'rings', label: 'Draw the measured radii', type: 'toggle', kind: PAINT,
        hint: 'Three circles on the lattice: the measured inradius, the measured outradius, and √(n/π) in full ink. They are marked cell by cell, like everything else on the plate.' },
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.5, 0.02, pct),
    ],
    defaults: {
      mode: 'both', n: 20000, rot0: 'east',
      view: 'odometer', cycles: 6, tone: 0.4, rings: false, grain: 0.03,
      seed: 'propp-machine',
    },
    presets: {
      quilt: pre('The rotor quilt', { mode: 'rotor', n: 20000, rot0: 'east', view: 'rotors', rings: false, grain: 0 }, Pal.risograph),
      odometer: pre('Rotor odometer', { mode: 'rotor', n: 40000, rot0: 'east', view: 'odometer', cycles: 8, tone: 0.4, rings: false, grain: 0.03 }, Pal.ember),
      shells: pre('Growth rings', { mode: 'rotor', n: 20000, rot0: 'east', view: 'arrival', cycles: 11, rings: false, grain: 0.02 }, Pal.thermal),
      idla: pre('Internal DLA, the random twin', { mode: 'idla', n: 20000, view: 'arrival', cycles: 1, rings: true, grain: 0.04 }, Pal.glacier),
      versus: pre('Deterministic against random', { mode: 'both', n: 20000, rot0: 'east', view: 'odometer', cycles: 6, tone: 0.4, rings: false, grain: 0.03 }, Pal.nightshade),
      rims: pre('Two rims at one scale', { mode: 'both', n: 12000, rot0: 'east', view: 'disk', rings: true, grain: 0.03 }, Pal.tram),
      stripes: pre('Started on the diagonal', { mode: 'rotor', n: 20000, rot0: 'checker', view: 'rotors', rings: false, grain: 0 }, Pal.verdigris),
    },
    hints: {
      Aggregate: 'The rotor-router aggregate is fully determined by the starting arrows: no seed, no coin, the same picture every time. The seed moves only the random walk of the internal DLA aggregate, the scattered starting arrows if you choose them, and the grain.',
      Picture: 'One pixel per lattice site, scaled up with nearest sampling. The picture is exact integers on a lattice, so nothing here is ever interpolated, on screen or in print.',
      Finish: 'Grain is added per lattice cell, so it scales up with the cells rather than sitting on top of the print as a separate texture.',
    },
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Colors (low → high count; four directions in the rotor view)',
    headline: 'n', headlineLabel: 'particles',
    closedGroups: ['Finish'],
    sanitize(s) {
      s.n = U.clamp(Math.round(Number(s.n) / 1000) * 1000, 1000, 50000);
      s.cycles = U.clamp(Math.round(Number(s.cycles) || 1), 1, 14);
      if (s.mode === 'idla' && s.view === 'rotors') s.view = 'disk';
    },
    surprise(rng) {
      const mode = rng.pick(['rotor', 'rotor', 'idla', 'both', 'both']);
      const view = mode === 'idla'
        ? rng.pick(['disk', 'arrival', 'odometer'])
        : rng.pick(['disk', 'arrival', 'odometer', 'odometer', 'rotors']);
      return {
        mode, n: rng.pick([6000, 12000, 20000, 20000, 30000]),
        rot0: rng.pick(['east', 'east', 'checker', 'random']),
        view, cycles: view === 'arrival' ? rng.int(1, 12) : rng.int(3, 10),
        tone: rng.pick([0.25, 0.4, 0.55, 0.8]),
        rings: view === 'disk' ? rng() < 0.7 : rng() < 0.2,
        grain: rng.pick([0, 0.03, 0.03, 0.08]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      const buf = document.createElement('canvas');
      let bw = 0, bh = 0;

      let timer = 0, tasks = null, ti = 0, paused = false, key = '';
      let rotorSim = null, idlaSim = null, verify = null;
      let N = 0, R = 0, CR = 0, S = 0;
      let statRotor = null, statIdla = null, sharedMax = 1;
      let abelian = null, warn = '';

      function stopTimer() { if (timer) { clearTimeout(timer); timer = 0; } }
      function pump() {
        timer = 0;
        if (paused || !tasks) return;
        const t = tasks[ti];
        if (!t) { tasks = null; return; }
        const fin = t.step(28);
        if (fin) { if (t.after) t.after(); ti++; }
        else if (t.tick) t.tick();
        if (tasks && ti < tasks.length) timer = setTimeout(pump, 0);
        else tasks = null;
      }
      function start(list) { stopTimer(); tasks = list; ti = 0; timer = setTimeout(pump, 0); }

      /* ---- picture ---- */
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const k = (s.palette || []).join(',') + '|' + s.bg;
        if (lut && lutKey === k) return;
        lut = U.makeRampLUT(s.palette, null, 256); lutKey = k;
      }
      const col = t => { const i = (U.clamp(t, 0, 1) * 255 | 0) * 3; return [lut[i], lut[i + 1], lut[i + 2]]; };
      // The four rotor directions get four palette entries rather than four samples of the ramp, because
      // a direction is a label, not a quantity, and a sequential ramp would imply an order the rotors do
      // not have. Parsed once per repaint instead of once per lattice site.
      const rotorColors = s => [0, 1, 2, 3].map(k => U.hexToRgb(s.palette[k % s.palette.length]));

      // One lattice site, one pixel. Everything the plate says is an integer read out of the simulation.
      function blockColor(s, sim, i, dx, dy, st, rc) {
        const occ = sim.occ[i];
        if (s.view === 'odometer') {
          const v = sim.od[i];
          if (!occ && v === 0) return null;
          return col(band(Math.pow(v / sharedMax, s.tone), s.cycles));
        }
        if (!occ) {
          // a site the aggregate skipped although it lies inside the outer radius: the fluctuation itself
          if (s.view === 'disk' && st && dx * dx + dy * dy < st.out * st.out) return col(0.1);
          return null;
        }
        if (s.view === 'arrival') return col(band(sim.arr[i] / Math.max(1, sim.placed() - 1), s.cycles));
        if (s.view === 'rotors' && sim.rot) return rc[sim.rot[i] & 3];
        if (st) return dx * dx + dy * dy <= st.inr * st.inr ? col(0.5) : col(0.92);
        return col(0.5);
      }

      function drawBlock(px, s, sim, st, ox) {
        const bgc = U.hexToRgb(s.bg), W = sim.W, Rc = R, rc = rotorColors(s);
        for (let yy = 0; yy < S; yy++) {
          const gy = yy - CR + Rc;
          for (let xx = 0; xx < S; xx++) {
            const gx = xx - CR + Rc;
            const o = (yy * bw + ox + xx) * 4;
            let c = null;
            if (gx >= 0 && gy >= 0 && gx < W && gy < W) c = blockColor(s, sim, gy * W + gx, xx - CR, yy - CR, st, rc);
            if (!c) c = bgc;
            px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
          }
        }
      }

      // The measured radii marked on the lattice itself, a cell wide, so the circles are as discrete as the
      // aggregate they measure. Full ink is the theoretical radius; the two measurements sit either side of it.
      function drawRings(px, s, st, ox) {
        if (!st) return;
        const ink = U.hexToRgb(U.inkFor(s.bg)), bgc = U.hexToRgb(s.bg);
        const soft = [0, 1, 2].map(k => Math.round(ink[k] * 0.55 + bgc[k] * 0.45));
        const list = [[st.inr, soft], [Math.sqrt(st.n / Math.PI), ink], [st.out, soft]];
        for (const [r, c] of list) {
          if (!(r > 0.5) || r > CR) continue;
          const lo = (r - 0.5) * (r - 0.5), hi = (r + 0.5) * (r + 0.5);
          for (let yy = 0; yy < S; yy++) {
            const dy = yy - CR, dy2 = dy * dy;
            for (let xx = 0; xx < S; xx++) {
              const dx = xx - CR, d2 = dx * dx + dy2;
              if (d2 < lo || d2 > hi) continue;
              const o = (yy * bw + ox + xx) * 4;
              px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
            }
          }
        }
      }

      function paint() {
        const s = host.getState();
        if (!S || !rotorSim && !idlaSim) return;
        ensureLut(s);
        // The odometer ramp is normalised against the largest count on the plate, and in the side by side
        // it is the larger of the two, so the two halves are read against one scale and not each against
        // its own. Recomputed here rather than cached, so a half-built plate is exposed on what it has.
        sharedMax = Math.max(1, rotorSim ? maxOf(rotorSim.od) : 0, idlaSim ? maxOf(idlaSim.od) : 0);
        if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
        const g = buf.getContext('2d');
        const img = g.createImageData(bw, bh), px = img.data;
        const bgc = U.hexToRgb(s.bg);
        for (let i = 0; i < px.length; i += 4) { px[i] = bgc[0]; px[i + 1] = bgc[1]; px[i + 2] = bgc[2]; px[i + 3] = 255; }
        if (s.mode === 'both') {
          if (rotorSim) { drawBlock(px, s, rotorSim, statRotor, 0); if (s.rings) drawRings(px, s, statRotor, 0); }
          if (idlaSim) { drawBlock(px, s, idlaSim, statIdla, S); if (s.rings) drawRings(px, s, statIdla, S); }
        } else {
          const sim = s.mode === 'idla' ? idlaSim : rotorSim, st = s.mode === 'idla' ? statIdla : statRotor;
          if (sim) { drawBlock(px, s, sim, st, 0); if (s.rings) drawRings(px, s, st, 0); }
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), a = s.grain * 26;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * a; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
        }
        g.putImageData(img, 0, 0);
        blit(ctx, canvas.width, canvas.height, s.bg);
      }

      // Nearest sampling at an integer-free but uniform scale, centered: every lattice cell is the same size
      // and no cell is ever blended with its neighbor. Smoothing here would be a lie about an exact lattice.
      function blit(c2, w, h, bg) {
        c2.imageSmoothingEnabled = false;
        c2.fillStyle = bg; c2.fillRect(0, 0, w, h);
        if (!bw || !bh) return;
        const k = Math.min(w / bw, h / bh);
        const dw = Math.max(1, Math.round(bw * k)), dh = Math.max(1, Math.round(bh * k));
        c2.drawImage(buf, 0, 0, bw, bh, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
        c2.imageSmoothingEnabled = true;
      }

      /* ---- status ---- */
      function line(st) {
        return 'in <b>' + f1(st.inr) + '</b> out <b>' + f1(st.out) + '</b> · spread <b>' + f2(st.out - st.inr) + '</b>';
      }
      // Total moves made by all the particles put together. It is the cost of the plate and it grows like
      // n², because the last particle has to cross an aggregate of radius √(n/π) before it can stop.
      function walked() {
        const v = (rotorSim ? rotorSim.steps() : 0) + (idlaSim ? idlaSim.steps() : 0);
        return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v.toLocaleString();
      }
      function status(extra) {
        const s = host.getState(), n = s.n;
        const root = Math.sqrt(n / Math.PI), ln = Math.log(n);
        const spans = [];
        if (s.mode === 'both') {
          spans.push('<span>n <b>' + n.toLocaleString() + '</b> · √(n/π) <b>' + f1(root) + '</b> · plate <b>' + bw + '×' + bh + '</b> cells · <b>' + walked() + '</b> steps</span>');
          if (statRotor) spans.push('<span>rotor ' + line(statRotor) + '</span>');
          if (statIdla) spans.push('<span>IDLA ' + line(statIdla) + '</span>');
        } else if (s.mode === 'idla') {
          spans.push('<span>internal DLA · n <b>' + n.toLocaleString() + '</b> · plate <b>' + bw + '×' + bh + '</b> cells · <b>' + walked() + '</b> steps</span>');
          if (statIdla) spans.push('<span>inradius <b>' + f1(statIdla.inr) + '</b> · outradius <b>' + f1(statIdla.out) + '</b> · √(n/π) <b>' + f1(root) + '</b></span>');
          if (statIdla) spans.push('<span>spread <b>' + f2(statIdla.out - statIdla.inr) + '</b> · log n <b>' + f2(ln) + '</b></span>');
        } else {
          spans.push('<span>rotor-router · n <b>' + n.toLocaleString() + '</b> · plate <b>' + bw + '×' + bh + '</b> cells · <b>' + walked() + '</b> steps</span>');
          if (statRotor) spans.push('<span>inradius <b>' + f1(statRotor.inr) + '</b> · outradius <b>' + f1(statRotor.out) + '</b> · √(n/π) <b>' + f1(root) + '</b></span>');
          if (statRotor) spans.push('<span>spread <b>' + f2(statRotor.out - statRotor.inr) + '</b> · log n <b>' + f2(ln) + '</b></span>');
        }
        let tail = extra ? '<span>' + extra + '</span>' : '';
        if (!extra) {
          if (warn) tail = '<span><b>' + warn + '</b></span>';
          else if (abelian) tail = '<span>abelian: ' + abelian + (s.mode === 'both' ? ' · log n <b>' + f2(ln) + '</b>' : '') + '</span>';
        }
        host.setStatus(spans.join('') + tail);
      }

      /* ---- build ---- */
      function compute() {
        const s = host.getState(), n = s.n;
        stopTimer(); tasks = null;
        rotorSim = idlaSim = verify = null;
        statRotor = statIdla = null; abelian = null; warn = ''; sharedMax = 1;
        R = latticeR(n); const W = 2 * R + 1; N = W * W;
        CR = plateR(n); S = 2 * CR + 1;
        // each half carries its own ring of empty cells, so the two plates butt together and still read apart
        bw = s.mode === 'both' ? 2 * S : S; bh = S;
        const c = R * W + R;
        const wantRotor = s.mode !== 'idla', wantIdla = s.mode !== 'rotor';
        const rot0 = initRotors(s.rot0, W, N, U.makeRng(s.seed + '/rotors'));
        const quiet = host.reducedMotion();
        const list = [];

        if (wantRotor) {
          rotorSim = newRotorSim(W, c, n, rot0);
          list.push({
            step: ms => rotorSim.step(ms),
            tick: () => { if (!quiet) paint(); status('routing <b>' + rotorSim.placed().toLocaleString() + '</b> of ' + n.toLocaleString() + '…'); },
            after: () => {
              statRotor = radii(rotorSim.occ, W, R, R); statRotor.n = n;
              // every particle occupies exactly one site, so the aggregate has to hold n of them
              if (rotorSim.escaped()) warn = 'the rotor aggregate reached the edge of the lattice';
              else if (statRotor.cells !== n) warn = 'rotor aggregate holds ' + statRotor.cells.toLocaleString() + ' cells, not ' + n.toLocaleString();
            },
          });
        }
        if (wantIdla) {
          const rng = U.makeRng(s.seed + '/idla');
          idlaSim = newIdlaSim(W, c, n, rng);
          list.push({
            step: ms => idlaSim.step(ms),
            tick: () => { if (!quiet) paint(); status('walking <b>' + idlaSim.placed().toLocaleString() + '</b> of ' + n.toLocaleString() + '…'); },
            after: () => {
              statIdla = radii(idlaSim.occ, W, R, R); statIdla.n = n;
              if (idlaSim.escaped()) warn = 'the random aggregate reached the edge of the lattice';
              else if (statIdla.cells !== n) warn = 'random aggregate holds ' + statIdla.cells.toLocaleString() + ' cells, not ' + n.toLocaleString();
            },
          });
        }
        // Paint the finished plate before the verification starts, so the picture does not wait on it.
        list.push({ step: () => true, after: () => { paint(); status(wantRotor ? 'checking the abelian property…' : ''); } });

        if (wantRotor) {
          verify = newRoundRobin(W, c, n, rot0);
          list.push({
            step: ms => verify.step(ms),
            tick: () => status('checking the abelian property, <b>' + verify.left().toLocaleString() + '</b> particles still moving…'),
            after: () => {
              let diff = 0;
              for (let i = 0; i < N; i++) {
                if (verify.occ[i] !== rotorSim.occ[i] || verify.rot[i] !== rotorSim.rot[i] || verify.od[i] !== rotorSim.od[i]) diff++;
              }
              abelian = diff === 0
                ? '<b>identical</b>, ' + N.toLocaleString() + ' cells compared'
                : '<b>' + diff.toLocaleString() + ' of ' + N.toLocaleString() + ' cells differ</b>';
              verify = null;
              status();
            },
          });
        }
        start(list);
      }

      return {
        aspect(s) { return s.mode === 'both' ? 0.5 : 1; },
        // The plate is one pixel per lattice site: the print pipeline reads this and stops supersampling it.
        fieldCells() { return bw && bh ? [bw, bh] : null; },
        regenerate() {
          const s = host.getState();
          const k = [s.mode, s.n, s.rot0, s.seed].join('|');
          if (k === key && !tasks && (rotorSim || idlaSim)) { paint(); status(); return; }
          key = k;
          status('building…');
          compute();
        },
        repaint() { paint(); status(); },
        resize() { blit(ctx, canvas.width, canvas.height, host.getState().bg); },
        pause() { paused = true; stopTimer(); },
        resume() {
          if (!paused) { paint(); return; }
          paused = false;
          if (tasks && !timer) timer = setTimeout(pump, 0); else paint();
        },
        async exportPNG(w, h) {
          if (!bw || !bh) throw new Error('nothing to export');
          if (w > 30000 || h > 30000) throw new Error('print size too large for this lattice');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          blit(c.getContext('2d'), w, h, host.getState().bg);
          return U.toBlob(c);
        },
      };
    },
  });
})();
