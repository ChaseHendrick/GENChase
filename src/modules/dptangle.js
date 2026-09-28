/* modules/dptangle.js */
/* GENChase: the homoclinic tangle of the equal double pendulum on its Poincare section.
   Float64 picture of the orbit proved in research/double-pendulum. Not the proof. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES;
  const GEOM = 'geom', PAINT = 'paint';
  const TAU = 2 * Math.PI;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Fixed-point step. Classical RK4 at this step, checked against half the step, lands inside
  // the report's fixed-point enclosures (width under 2e-12). The curves use the coarser curveStep.
  const POINT_H = 0.0005;
  // y_E from REPORT.md (the parenthetical digit is the next printed digit; the enclosure is
  // narrower than 2e-12). Trace enclosures of DP(p_E) are the table. mu is the proved lower
  // bound on the unstable multiplier, not the multiplier itself. Return times are the table.
  const REPORT = {
    '-0.5': { y: -1.244860970918396, trace: [-3.23158, -3.23150], mu: 2.88345, T: [3.70477454, 3.70477455] },
    '0': { y: -1.462373092479858, trace: [-3.80869, -3.80863], mu: 3.52385, T: [2.95348900, 2.95348902] },
    '0.5': { y: -1.627044959203058, trace: [-3.33283, -3.33278], mu: 2.99875, T: [2.56436222, 2.56436223] },
  };
  const PROVED = [-0.5, 0, 0.5];
  const SEEDS = PROVED.map(E => [E, REPORT[String(E)].y]);

  function provedAt(E) {
    for (let i = 0; i < PROVED.length; i++) if (Math.abs(E - PROVED[i]) < 1e-9) return i;
    return -1;
  }
  function reportOf(E) {
    const i = provedAt(E);
    return i < 0 ? null : REPORT[String(PROVED[i])];
  }
  function guessY(E) {
    if (E <= SEEDS[0][0]) return SEEDS[0][1] + (E - SEEDS[0][0]) * (SEEDS[1][1] - SEEDS[0][1]) / (SEEDS[1][0] - SEEDS[0][0]);
    if (E >= SEEDS[2][0]) return SEEDS[2][1] + (E - SEEDS[2][0]) * (SEEDS[2][1] - SEEDS[1][1]) / (SEEDS[2][0] - SEEDS[1][0]);
    const i = E < SEEDS[1][0] ? 0 : 1;
    return SEEDS[i][1] + (E - SEEDS[i][0]) * (SEEDS[i + 1][1] - SEEDS[i][1]) / (SEEDS[i + 1][0] - SEEDS[i][0]);
  }
  function energyLabel(E) {
    if (Math.abs(E + 0.5) < 1e-9) return '-1/2';
    if (Math.abs(E) < 1e-9) return '0';
    if (Math.abs(E - 0.5) < 1e-9) return '1/2';
    const q = Math.round(E * 1000) / 1000;
    return String(q);
  }

  // Hamiltonian vector field. m1 = m2 = 1 is the equal pendulum of the proof.
  // H = Num / (2 Delta) - (m1 + m2) cos t1 - m2 cos t2,
  // Num = p1^2 + alpha p2^2 - 2 c p1 p2, Delta = m1 + m2 sin^2(t1 - t2), alpha = (m1 + m2) / m2.
  // Bottom rest (t1 = t2 = p1 = p2 = 0) has energy -(m1 + 2 m2), which is -3 when the masses are 1.
  function deriv(y, m1, m2, out) {
    const t1 = y[0], t2 = y[1], p1 = y[2], p2 = y[3];
    const d = t1 - t2, s = Math.sin(d), c = Math.cos(d);
    const Delta = m1 + m2 * s * s;
    const alpha = (m1 + m2) / m2;
    const num = p1 * p1 + alpha * p2 * p2 - 2 * c * p1 * p2;
    const dT = s * (p1 * p2 * Delta - num * m2 * c) / (Delta * Delta);
    out[0] = (p1 - c * p2) / Delta;
    out[1] = (alpha * p2 - c * p1) / Delta;
    out[2] = -dT - (m1 + m2) * Math.sin(t1);
    out[3] = dT - m2 * Math.sin(t2);
  }
  function energy(y, m1, m2) {
    const t1 = y[0], t2 = y[1], p1 = y[2], p2 = y[3];
    const d = t1 - t2, s = Math.sin(d), c = Math.cos(d);
    const Delta = m1 + m2 * s * s;
    const alpha = (m1 + m2) / m2;
    const num = p1 * p1 + alpha * p2 * p2 - 2 * c * p1 * p2;
    return num / (2 * Delta) - (m1 + m2) * Math.cos(t1) - m2 * Math.cos(t2);
  }
  // Section t1 = 0, dt1/dt > 0. The + square root is that branch.
  function lift(E, t2, p2, m1, m2) {
    const c = Math.cos(t2), s = Math.sin(t2);
    const Delta = m1 + m2 * s * s;
    const alpha = (m1 + m2) / m2;
    const disc = 2 * Delta * (E + m1 + m2 + m2 * c) - p2 * p2 * (alpha - c * c);
    if (!(disc > 0) || !(Delta > 0)) return null;
    return [0, t2, c * p2 + Math.sqrt(disc), p2];
  }
  function pBound(E, t2, m1, m2) {
    const c = Math.cos(t2), s = Math.sin(t2);
    const Delta = m1 + m2 * s * s;
    const alpha = (m1 + m2) / m2;
    const denom = alpha - c * c;
    const num = 2 * Delta * (E + m1 + m2 + m2 * c);
    if (!(denom > 1e-14) || !(num > 0)) return 0;
    return Math.sqrt(num / denom);
  }
  function wrapPi(t) {
    let x = (t + Math.PI) % TAU;
    if (x < 0) x += TAU;
    return x - Math.PI;
  }
  // G(t2, p2) = (-t2, p2) reverses time on the section. The stable manifold is the image of the unstable one.
  function symmetryPoint(t2, p2) { return { t2: -t2, p2: p2 }; }

  // Shared scratch. poincare is not reentrant.
  const K1 = [0, 0, 0, 0], K2 = [0, 0, 0, 0], K3 = [0, 0, 0, 0], K4 = [0, 0, 0, 0], TMP = [0, 0, 0, 0];
  const YY = [0, 0, 0, 0], PREV = [0, 0, 0, 0], AA = [0, 0, 0, 0], MID = [0, 0, 0, 0];
  function rk4(y, h, m1, m2, out) {
    deriv(y, m1, m2, K1);
    for (let i = 0; i < 4; i++) TMP[i] = y[i] + 0.5 * h * K1[i];
    deriv(TMP, m1, m2, K2);
    for (let i = 0; i < 4; i++) TMP[i] = y[i] + 0.5 * h * K2[i];
    deriv(TMP, m1, m2, K3);
    for (let i = 0; i < 4; i++) TMP[i] = y[i] + h * K3[i];
    deriv(TMP, m1, m2, K4);
    const s = h / 6;
    for (let i = 0; i < 4; i++) out[i] = y[i] + s * (K1[i] + 2 * K2[i] + 2 * K3[i] + K4[i]);
  }
  // First return to t1 = 0 with t1 increasing. The last step is bisected down to 1e-14
  // with the same RK4, then linearly interpolated. t2 is the continuous angle (not wrapped).
  function poincare(t2, p2, E, h, m1, m2) {
    const y0 = lift(E, t2, p2, m1, m2);
    if (!y0) return null;
    const y = YY;
    for (let i = 0; i < 4; i++) y[i] = y0[i];
    let t = 0, steps = 0;
    rk4(y, h, m1, m2, y);
    t += h; steps++;
    const maxT = 48;
    while (t < maxT && steps < 2e6) {
      for (let i = 0; i < 4; i++) PREV[i] = y[i];
      rk4(y, h, m1, m2, y);
      t += h; steps++;
      if (PREV[0] < 0 && y[0] >= 0 && y[0] - PREV[0] < Math.PI) {
        for (let i = 0; i < 4; i++) AA[i] = PREV[i];
        let span = h, tau = t - h;
        while (span > 1e-14) {
          const half = span * 0.5;
          rk4(AA, half, m1, m2, MID);
          if (AA[0] < 0 && MID[0] >= 0) span = half;
          else { for (let i = 0; i < 4; i++) AA[i] = MID[i]; tau += half; span = half; }
        }
        rk4(AA, span, m1, m2, MID);
        const den = AA[0] - MID[0];
        const alpha = den === 0 ? 0.5 : Math.min(1, Math.max(0, AA[0] / den));
        const st = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) st[i] = AA[i] + alpha * (MID[i] - AA[i]);
        return { t2: st[1], p2: st[3], T: tau + alpha * span, H: energy(st, m1, m2), steps: steps };
      }
    }
    return null;
  }

  function eigUnstable(tr, det) {
    const disc = tr * tr / 4 - det;
    if (!(disc >= 0)) return null;
    const rad = Math.sqrt(disc);
    const a = tr / 2 - rad, b = tr / 2 + rad;
    return Math.abs(a) >= Math.abs(b) ? a : b;
  }
  function eigenvector(J, lam) {
    let vx, vy;
    if (Math.abs(J[0][1]) + Math.abs(J[0][0] - lam) >= Math.abs(J[1][0]) + Math.abs(J[1][1] - lam)) {
      vx = J[0][1]; vy = lam - J[0][0];
    } else {
      vx = lam - J[1][1]; vy = J[1][0];
    }
    const n = Math.hypot(vx, vy) || 1;
    vx /= n; vy /= n;
    if (vx < 0) { vx = -vx; vy = -vy; }
    return [vx, vy];
  }
  // Lifted return f~(t2, p2) = (t2_raw + 2 pi, p2). One backward turn of the lower arm per period.
  function lifted(t2, p2, E, h, m1, m2) {
    const r = poincare(t2, p2, E, h, m1, m2);
    if (!r) return null;
    return { t2: r.t2 + TAU, p2: r.p2, T: r.T, H: r.H, raw: r.t2 };
  }
  // Newton on f~(z) - z, started from the report value (or the linear guess off those three).
  // The Jacobian is a central difference of the same map, step 1e-6.
  function locate(E, h, m1, m2) {
    let t2 = 0, p2 = guessY(E);
    const eps = 1e-6;
    let last = null;
    for (let it = 0; it < 8; it++) {
      const c = lifted(t2, p2, E, h, m1, m2);
      const ct = lifted(t2 + eps, p2, E, h, m1, m2);
      const cm = lifted(t2 - eps, p2, E, h, m1, m2);
      const cp = lifted(t2, p2 + eps, E, h, m1, m2);
      const cq = lifted(t2, p2 - eps, E, h, m1, m2);
      if (!c || !ct || !cm || !cp || !cq) return null;
      const J = [
        [(ct.t2 - cm.t2) / (2 * eps), (cp.t2 - cq.t2) / (2 * eps)],
        [(ct.p2 - cm.p2) / (2 * eps), (cp.p2 - cq.p2) / (2 * eps)],
      ];
      const Ft = c.t2 - t2, Fp = c.p2 - p2;
      const tr = J[0][0] + J[1][1];
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      const lam = eigUnstable(tr, det);
      last = { t2, p2, tr, det, lam, J, T: c.T, H: c.H, res: Math.hypot(Ft, Fp), it, h, m1, m2, E };
      if (last.res < 1e-12 && lam !== null) {
        last.vu = eigenvector(J, lam);
        return last;
      }
      const A00 = J[0][0] - 1, A01 = J[0][1], A10 = J[1][0], A11 = J[1][1] - 1;
      const ad = A00 * A11 - A01 * A10;
      if (!(Math.abs(ad) > 1e-14)) return null;
      t2 -= (A11 * Ft - A01 * Fp) / ad;
      p2 -= (-A10 * Ft + A00 * Fp) / ad;
    }
    return last && last.lam !== null && last.res < 1e-8 ? Object.assign(last, { vu: eigenvector(last.J, last.lam) }) : null;
  }

  function distSec(a, b) {
    let d = wrapPi(a.t2) - wrapPi(b.t2);
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return Math.hypot(d, a.p2 - b.p2);
  }
  function sectionPolylines(points) {
    const lines = [];
    let cur = [];
    for (let i = 0; i < points.length; i++) {
      const x = wrapPi(points[i].t2), y = points[i].p2;
      const last = cur.length ? cur[cur.length - 1] : null;
      if (last && (Math.abs(x - last.x) > 1.15 || Math.abs(y - last.y) > 1.15)) {
        if (cur.length > 1) lines.push(cur);
        cur = [];
      }
      cur.push({ x: x, y: y });
    }
    if (cur.length > 1) lines.push(cur);
    return lines;
  }
  function seaSeeds(seed, E, n, m1, m2) {
    const rng = U.makeRng(String(seed) + '/sea');
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 50) {
      const t2 = rng.range(-Math.PI, Math.PI);
      const lim = pBound(E, t2, m1, m2);
      if (!(lim > 0.15)) continue;
      const p2 = rng.range(-0.7 * lim, 0.7 * lim);
      if (lift(E, t2, p2, m1, m2)) out.push({ t2: t2, p2: p2 });
    }
    return out;
  }

  // One unstable branch: a fundamental domain along +vu, iterated, with midpoints inserted
  // wherever an image gap exceeds maxGap. The stable curve is symmetryPoint of these points.
  function pictureSession(opts) {
    const E = opts.E, h = opts.h, m1 = opts.m1, m2 = opts.m2, fp = opts.fp;
    const maxGap = opts.maxGap, maxPoints = opts.maxPoints, iterates = opts.iterates;
    const sea = opts.seeds.map(z => ({ t2: z.t2, p2: z.p2, left: opts.orbitReturns }));
    const seaPts = opts.seeds.map(z => ({ t2: z.t2, p2: z.p2 }));
    let seaI = 0;
    const arc = { queue: [], images: [], cursor: 0, gen: 0, gens: [] };
    if (fp && fp.vu && Math.abs(fp.lam) > 1.05) {
      const vu = fp.vu, stretch = Math.abs(fp.lam), s0 = opts.s0, nSeg = opts.segments;
      for (let i = 0; i <= nSeg; i++) {
        const s = s0 * Math.pow(stretch, i / nSeg);
        arc.queue.push({ t2: fp.t2 + s * vu[0], p2: fp.p2 + s * vu[1] });
      }
      arc.images = new Array(arc.queue.length);
    }
    let calls = 0, manifoldDone = !arc.queue.length, seaDone = sea.length === 0;
    const maxCalls = opts.maxCalls;
    function commitGen() {
      const mapped = [];
      for (let i = 0; i < arc.queue.length; i++) if (arc.images[i]) mapped.push(arc.images[i]);
      if (mapped.length > 1) arc.gens.push(mapped);
      arc.gen++;
      if (arc.gen >= iterates || mapped.length < 2) { manifoldDone = true; return; }
      arc.queue = mapped.map(p => ({ t2: p.t2, p2: p.p2 }));
      arc.images = new Array(arc.queue.length);
      arc.cursor = 0;
    }
    function insertGaps() {
      const nq = [], ni = [];
      let inserted = 0;
      for (let i = 0; i < arc.queue.length; i++) {
        if (i > 0 && arc.images[i] && arc.images[i - 1] && nq.length + (arc.queue.length - i) < maxPoints) {
          if (distSec(arc.images[i - 1], arc.images[i]) > maxGap) {
            const a = arc.queue[i - 1], b = arc.queue[i];
            nq.push({ t2: 0.5 * (a.t2 + b.t2), p2: 0.5 * (a.p2 + b.p2) });
            ni.push(undefined);
            inserted++;
          }
        }
        nq.push(arc.queue[i]);
        ni.push(arc.images[i]);
      }
      if (!inserted) return false;
      arc.queue = nq;
      arc.images = ni;
      arc.cursor = ni.indexOf(undefined);
      if (arc.cursor < 0) arc.cursor = ni.length;
      return arc.cursor < ni.length;
    }
    return {
      calls: () => calls,
      seaPts: seaPts,
      generations: () => arc.gens,
      done: () => manifoldDone && seaDone,
      step(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end && calls < maxCalls && !(manifoldDone && seaDone)) {
          if (!manifoldDone) {
            if (arc.cursor < arc.queue.length) {
              if (arc.images[arc.cursor] !== undefined) { arc.cursor++; continue; }
              const z = arc.queue[arc.cursor];
              const r = poincare(z.t2, z.p2, E, h, m1, m2);
              calls++;
              arc.images[arc.cursor] = r ? { t2: r.t2, p2: r.p2 } : null;
              arc.cursor++;
            } else if (!insertGaps()) commitGen();
          } else if (!seaDone) {
            if (seaI >= sea.length) { seaDone = true; continue; }
            const o = sea[seaI];
            if (o.left <= 0) { seaI++; continue; }
            const r = poincare(o.t2, o.p2, E, h, m1, m2);
            calls++;
            o.left--;
            if (!r) { seaI++; continue; }
            o.t2 = r.t2; o.p2 = r.p2;
            seaPts.push({ t2: r.t2, p2: r.p2 });
          }
        }
        if (calls >= maxCalls) { manifoldDone = true; seaDone = true; }
        return manifoldDone && seaDone;
      },
    };
  }

  function sectionFrame(w, h, E, m1, m2) {
    const x0 = -Math.PI, x1 = Math.PI;
    const yMax = Math.max(0.8, pBound(E, 0, m1, m2)) * 1.08;
    const pad = 0.055;
    const s = Math.min((w * (1 - 2 * pad)) / (x1 - x0), (h * (1 - 2 * pad)) / (2 * yMax));
    const ox = (w - s * (x1 - x0)) / 2;
    const oy = (h - s * (2 * yMax)) / 2;
    return {
      yMax: yMax,
      x: t => ox + (wrapPi(t) - x0) * s,
      y: p => oy + (yMax - p) * s,
      s: s,
    };
  }
  function boundaryLoops(E, m1, m2) {
    const upper = [], lower = [];
    const n = 240;
    for (let i = 0; i <= n; i++) {
      const t = -Math.PI + (i / n) * TAU;
      const p = pBound(E, t, m1, m2);
      if (p > 0) { upper.push({ x: t, y: p }); lower.push({ x: t, y: -p }); }
    }
    return [upper, lower];
  }

  Studio.register({
    id: 'dptangle',
    name: 'Double pendulum tangle',
    tab: 'Tangle',
    subtitle: 'homoclinic tangle on the energy section · 2026',
    order: 51.2,
    equation: 'H = (p₁² + 2 p₂² − 2 cos(θ₁−θ₂) p₁ p₂) / (2D) − 2 cos θ₁ − cos θ₂,  D = 1 + sin²(θ₁−θ₂);  section θ₁ = 0, θ₁′ > 0',
    credit: 'A computer-assisted proof that the equal double pendulum (m = l = g = 1, bottom rest at energy -3) has a transversal homoclinic orbit at E = -1/2, 0 and 1/2 is drafted in this repository, research/double-pendulum/REPORT.md. It is published as version 1.0.0, doi:10.5281/zenodo.22997540. The horseshoe and the positive entropy are the theorem of Stephen Smale, Diffeomorphisms with many periodic points, in Differential and Combinatorial Topology, Princeton University Press (1965), incorporating the homoclinic construction of George D. Birkhoff, On the periodic motions of dynamical systems, Acta Mathematica 50 (1927) 359-379. This plate is a floating-point picture of that tangle. The proof is the interval computation.',
    blurb: 'Two equal masses on equal rods, one hung from the other. The picture is not the rods. It is a slice of their motion: every time the upper rod swings up through the bottom, the lower rod\'s angle and momentum are marked. At E = -1/2, 0 and 1/2 that slice carries a saddle periodic orbit, and the curve that leaves it crosses the curve that arrives. The crossing is a theorem in an interval computation published as version 1.0.0, doi:10.5281/zenodo.22997540. What is drawn here is the same tangle in ordinary floating point, so a crossing on the plate is a picture, not a proof. The stable curve is the unstable one reflected by the pendulum\'s time-reversal symmetry, which sends the lower angle to its negative and leaves the momentum alone. Behind the curves, a seeded cloud of other orbits fills the chaotic sea. Any other energy is drawn the same way and labeled as outside the proof.',
    schema: [
      RANGE('Section', 'energy', 'Energy E', GEOM, -0.9, 0.9, 0.05, f2, {
        hint: 'Bottom rest is E = -3. The interval proof covers only E = -1/2, 0 and 1/2. Every other stop is drawn and labeled as not covered.',
      }),
      RANGE('Section', 'curveStep', 'Curve step', GEOM, 0.001, 0.008, 0.001, f3, {
        hint: 'RK4 step for the manifold curves and the orbit cloud. The fixed point on the status line is always computed at step 0.0005 and checked at half that step.',
      }),
      RANGE('Manifold', 'iterates', 'Returns of the curve', GEOM, 4, 12, 1, String, {
        hint: 'How many times the short piece along the unstable direction is sent through the section. The folds show up after about nine returns.',
      }),
      RANGE('Sea', 'orbits', 'Orbits in the sea', GEOM, 6, 40, 1, String),
      RANGE('Sea', 'orbitReturns', 'Returns per orbit', GEOM, 8, 80, 1, String),
      { group: 'Frame', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Picture', 'point', 'Sea point', PAINT, 0.6, 3.2, 0.1, f1),
      RANGE('Picture', 'weight', 'Curve weight', PAINT, 0.6, 2.4, 0.1, f1),
    ],
    defaults: {
      energy: 0, curveStep: 0.002, iterates: 11, orbits: 18, orbitReturns: 28,
      aspect: '1:1', point: 1.5, weight: 1.2, seed: 'homoclinic',
    },
    presets: {
      zero: pre('E = 0, in the proof', { energy: 0, curveStep: 0.002, iterates: 11, orbits: 18, orbitReturns: 28, aspect: '1:1', point: 1.5, weight: 1.2 }, Pal.nightshade),
      halfDown: pre('E = -1/2, in the proof', { energy: -0.5, curveStep: 0.002, iterates: 11, orbits: 22, orbitReturns: 36, aspect: '1:1', point: 1.4, weight: 1.15 }, Pal.glacier),
      halfUp: pre('E = 1/2, in the proof', { energy: 0.5, curveStep: 0.002, iterates: 11, orbits: 16, orbitReturns: 24, aspect: '4:5', point: 1.6, weight: 1.25 }, Pal.ember),
      low: pre('E = -3/5, not covered', { energy: -0.6, curveStep: 0.002, iterates: 10, orbits: 20, orbitReturns: 32, aspect: '1:1', point: 1.5, weight: 1.15 }, Pal.harbor),
      high: pre('E = 3/4, not covered', { energy: 0.75, curveStep: 0.002, iterates: 10, orbits: 16, orbitReturns: 22, aspect: '5:4', point: 1.7, weight: 1.3 }, Pal.risograph),
      sea: pre('E = 0, denser sea', { energy: 0, curveStep: 0.002, iterates: 9, orbits: 36, orbitReturns: 48, aspect: '16:9', point: 1.2, weight: 1.05 }, Pal.bioluminescent),
    },
    hints: {
      Section: 'Energy is measured so both rods hanging straight down have E = -3. E = 0 is both rods released from rest in the horizontal position. Only three energies are in the interval proof.',
      Manifold: 'The curve is grown from a short segment along the unstable direction of the saddle, then reflected for the stable curve. More returns add folds and cost time.',
      Sea: 'Each orbit is a seeded point on the section, marked at every later return. The cloud is the chaotic sea. It is not part of the proof.',
      Frame: 'The horizontal axis is the lower angle, from -pi to pi. The vertical axis is its momentum.',
      Picture: 'The sea is painted as dots. The curves are strokes, and the SVG export keeps the strokes as vectors. The dots stay on the raster sheet.',
    },
    closedGroups: ['Sea', 'Picture'],
    palette: true,
    defaultPalette: 'nightshade',
    paletteLabel: 'Unstable curve, sea, stable curve',
    headline: 'energy',
    headlineLabel: 'energy',
    sanitize(s) {
      s.energy = U.clamp(Number(s.energy) || 0, -0.9, 0.9);
      s.curveStep = U.clamp(Number(s.curveStep) || 0.002, 0.001, 0.008);
      s.iterates = U.clamp(Math.round(Number(s.iterates) || 11), 4, 12);
      s.orbits = U.clamp(Math.round(Number(s.orbits) || 18), 6, 40);
      s.orbitReturns = U.clamp(Math.round(Number(s.orbitReturns) || 28), 8, 80);
      s.point = U.clamp(Number(s.point) || 1.5, 0.6, 3.2);
      s.weight = U.clamp(Number(s.weight) || 1.2, 0.6, 2.4);
    },
    surprise(rng) {
      const E = rng.pick([-0.5, 0, 0, 0.5, -0.6, 0.75]);
      return {
        energy: E,
        curveStep: 0.002,
        iterates: rng.pick([9, 10, 11]),
        orbits: rng.int(14, 28),
        orbitReturns: rng.int(20, 40),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        point: rng.pick([1.3, 1.5, 1.8]),
        weight: rng.pick([1.05, 1.2, 1.4]),
      };
    },
    create(host) {
      const canvas = host.canvas;
      let geo = null, session = null, timer = 0, token = 0, fp = null, fpHalf = null;

      let paused = false, phase = 0;
      function stop() {
        paused = true;
        if (timer) { clearTimeout(timer); timer = 0; }
      }
      function openSession(s) {
        const seeds = seaSeeds(s.seed, s.energy, s.orbits, 1, 1);
        session = pictureSession({
          E: s.energy, h: s.curveStep, m1: 1, m2: 1, fp: fp,
          seeds: seeds, orbitReturns: s.orbitReturns, iterates: s.iterates,
          segments: 16, s0: 1.5e-5, maxGap: 0.16, maxPoints: 900, maxCalls: 7000,
        });
        phase = 2;
      }
      function storeGeo() {
        geo = { gens: session.generations().slice(), sea: session.seaPts.slice(), calls: session.calls() };
        phase = 3;
      }
      // Exports finish the same work the chunks do, on one turn, if a print starts early.
      function finishNow() {
        const s = host.getState();
        if (!fp) fp = locate(s.energy, POINT_H, 1, 1);
        if (!fpHalf) fpHalf = locate(s.energy, POINT_H / 2, 1, 1);
        if (!session) openSession(s);
        if (session && !session.done()) session.step(1e9);
        if (session) storeGeo();
      }
      // One fixed-point step, then the half-step check, then the curves, each on its own turn
      // so a locate does not share a turn with the manifold. pause() drops the timer.
      function pump() {
        paused = false;
        const my = token;
        const s = host.getState();
        function chunk() {
          if (my !== token || paused) return;
          if (phase === 0) {
            fp = locate(s.energy, POINT_H, 1, 1);
            phase = 1;
            if (my !== token || paused) return;
            status('half step');
            timer = setTimeout(chunk, 0);
            return;
          }
          if (phase === 1) {
            fpHalf = locate(s.energy, POINT_H / 2, 1, 1);
            openSession(s);
            if (my !== token || paused) return;
            timer = setTimeout(chunk, 0);
            return;
          }
          if (!session || phase >= 3) return;
          const finished = session.step(32);
          if (my !== token || paused) return;
          if (!finished) {
            status(String(session.calls()));
            timer = setTimeout(chunk, 0);
            return;
          }
          timer = 0;
          storeGeo();
          paint();
          status(null);
        }
        timer = setTimeout(chunk, 0);
      }
      function rgba(hex, a) {
        const c = U.hexToRgb(hex || '#888888');
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
      }
      function colorsOf(s) {
        const cols = s.palette && s.palette.length ? s.palette : ['#e8dfc8', '#8fb9a8', '#d08b6c'];
        return { unstable: cols[0], sea: cols[Math.min(1, cols.length - 1)], stable: cols[Math.min(2, cols.length - 1)] };
      }
      function unstablePoints() {
        if (!geo) return [];
        const out = [];
        for (let g = 0; g < geo.gens.length; g++) out.push(geo.gens[g]);
        return out;
      }
      function paintTo(ctx, w, h, s) {
        const E = s.energy, m1 = 1, m2 = 1;
        const fr = sectionFrame(w, h, E, m1, m2);
        const col = colorsOf(s);
        ctx.fillStyle = s.bg || '#14120e';
        ctx.fillRect(0, 0, w, h);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const edge = U.inkFor ? U.inkFor(s.bg || '#14120e') : '#d8d2c4';
        ctx.strokeStyle = rgba(edge, 0.28);
        ctx.lineWidth = Math.max(1, w / 900);
        const loops = boundaryLoops(E, m1, m2);
        for (let L = 0; L < loops.length; L++) {
          const loop = loops[L];
          if (loop.length < 2) continue;
          ctx.beginPath();
          for (let i = 0; i < loop.length; i++) {
            const px = fr.x(loop[i].x), py = fr.y(loop[i].y);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        if (geo) {
          const rad = Math.max(0.6, s.point * w / 520);
          ctx.fillStyle = rgba(col.sea, 0.55);
          const pts = geo.sea;
          for (let i = 0; i < pts.length; i++) {
            ctx.fillRect(fr.x(pts[i].t2) - rad * 0.5, fr.y(pts[i].p2) - rad * 0.5, rad, rad);
          }
          const lw = Math.max(0.8, s.weight * w / 520);
          function strokeList(list, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            for (let a = 0; a < list.length; a++) {
              const lines = sectionPolylines(list[a]);
              for (let k = 0; k < lines.length; k++) {
                const line = lines[k];
                ctx.beginPath();
                for (let i = 0; i < line.length; i++) {
                  const px = fr.x(line[i].x), py = fr.y(line[i].y);
                  if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.stroke();
              }
            }
          }
          const gens = unstablePoints();
          const stable = gens.map(g => g.map(p => symmetryPoint(p.t2, p.p2)));
          strokeList(stable, col.stable);
          strokeList(gens, col.unstable);
          if (fp) {
            ctx.fillStyle = edge;
            const r = Math.max(2.2, w / 180);
            ctx.beginPath();
            ctx.arc(fr.x(fp.t2), fr.y(fp.p2), r, 0, TAU);
            ctx.fill();
          }
        }
      }
      function paint() {
        const s = host.getState();
        const ctx = canvas.getContext('2d', { alpha: false });
        paintTo(ctx, canvas.width, canvas.height, s);
      }
      function status(progress) {
        const s = host.getState();
        const rep = reportOf(s.energy);
        const cover = rep
          ? '<span>E <b>' + energyLabel(s.energy) + '</b> · energy the proof covers</span>'
          : '<span>E <b>' + energyLabel(s.energy) + '</b> · not covered by the proof</span>';
        const disclaimer = '<span>float64 picture · the proof is the interval computation, doi:10.5281/zenodo.22997540</span>';
        if (!fp) {
          host.setStatus(cover + '<span>no fixed point at this energy</span>' + disclaimer);
          host.setWitness(null);
          return;
        }
        if (progress) {
          host.setStatus(cover + '<span>integrating <b>' + progress + '</b></span>' + disclaimer);
          return;
        }
        const cmp = rep ? U.stats.compare({
          label: 'fixed point p2',
          measured: fp.p2,
          expected: rep.y,
          reference: 'report center',
          basis: 'deterministic',
          digits: 12,
          note: 'float64 RK4, not the interval proof',
        }) : '<span>fixed point p2 <b>' + fp.p2.toFixed(6) + '</b> · no enclosure at this energy</span>';
        const gap = fpHalf ? Math.abs(fp.p2 - fpHalf.p2) : NaN;
        const step = '<span>point step <b>' + POINT_H + '</b> · half-step difference <b>' + (gap === gap ? gap.toExponential(1) : 'n/a') + '</b> · curve step <b>' + s.curveStep + '</b></span>';
        host.setStatus(cover + cmp + step + disclaimer);
        if (rep) {
          host.setWitness({
            label: 'Fixed point p2',
            measured: fp.p2,
            expected: rep.y,
            tol: 1e-12,
            basis: 'deterministic',
            units: '',
            step: null,
            missWhen: 'The float64 point leaves the report enclosure of width 2e-12, or the half-step point disagrees by more than 1e-11. This does not prove the homoclinic crossing.',
            valid: Math.abs(fp.p2 - rep.y) <= 1e-12 && gap === gap && gap <= 1e-11,
          });
        } else {
          host.setWitness({
            label: 'Fixed point p2',
            measured: fp.p2,
            expected: null,
            tol: null,
            basis: 'deterministic',
            valid: null,
            units: '',
            step: null,
            missWhen: 'This energy is not one of the three the interval proof covers, so there is no enclosure to check.',
          });
        }
      }
      function kick() {
        stop();
        const my = token;
        const s = host.getState();
        function chunk() {
          if (my !== token || !session) return;
          const finished = session.step(32);
          const calls = session.calls();
          if (!finished && host.isActive()) {
            status(String(calls));
            timer = setTimeout(chunk, 0);
            return;
          }
          timer = 0;
          geo = { gens: session.generations().slice(), sea: session.seaPts.slice(), calls: calls };
          paint();
          status(null);
        }
        chunk();
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          token++;
          stop();
          geo = null;
          session = null;
          fp = null;
          fpHalf = null;
          phase = 0;
          host.setWitness(null);
          status('fixed point');
          pump();
        },
        repaint() { paint(); status(session && !session.done() ? String(session.calls()) : null); },
        resize() { paint(); },
        pause() { stop(); },
        resume() {
          if (phase >= 3 && geo) { paint(); status(null); return; }
          pump();
        },
        evidence() {
          const s = host.getState();
          return provedAt(s.energy) >= 0
            ? { status: 'unvalidated', why: 'Floating-point picture of the tangle. The proof is the interval computation in research/double-pendulum, doi:10.5281/zenodo.22997540.' }
            : { status: 'unvalidated', why: 'This energy is outside the three values the interval proof covers. The picture is floating point either way.' };
        },
        exportSVG(w, h) {
          if (phase < 3 || !geo || !fp) finishNow();
          if (!geo || !fp) throw new Error('The tangle is not ready');
          const s = host.getState();
          const fr = sectionFrame(w, h, s.energy, 1, 1);
          const col = colorsOf(s);
          const lw = Math.max(0.8, s.weight * Math.min(w, h) / 520);
          const parts = [];
          const loops = boundaryLoops(s.energy, 1, 1);
          for (let L = 0; L < loops.length; L++) {
            const loop = loops[L];
            if (loop.length < 2) continue;
            let d = '';
            for (let i = 0; i < loop.length; i++) d += (i ? 'L' : 'M') + fr.x(loop[i].x).toFixed(2) + ' ' + fr.y(loop[i].y).toFixed(2) + ' ';
            parts.push('<path d="' + d.trim() + '" fill="none" stroke="' + U.svgEsc(U.inkFor(s.bg)) + '" stroke-opacity="0.35" stroke-width="' + (lw * 0.45).toFixed(2) + '"/>');
          }
          function addCurves(groups, color) {
            for (let a = 0; a < groups.length; a++) {
              const lines = sectionPolylines(groups[a]);
              for (let k = 0; k < lines.length; k++) {
                const line = lines[k];
                let d = '';
                for (let i = 0; i < line.length; i++) d += (i ? 'L' : 'M') + fr.x(line[i].x).toFixed(2) + ' ' + fr.y(line[i].y).toFixed(2) + ' ';
                parts.push('<path d="' + d.trim() + '" fill="none" stroke="' + U.svgEsc(color) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>');
              }
            }
          }
          const gens = unstablePoints();
          addCurves(gens.map(g => g.map(p => symmetryPoint(p.t2, p.p2))), col.stable);
          addCurves(gens, col.unstable);
          const cx = fr.x(fp.t2), cy = fr.y(fp.p2), r = Math.max(2.2, w / 180);
          parts.push('<circle cx="' + cx.toFixed(2) + '" cy="' + cy.toFixed(2) + '" r="' + r.toFixed(2) + '" fill="' + U.svgEsc(U.inkFor(s.bg)) + '"/>');
          return U.svgDoc(w, h, s.bg, parts.join('\n'));
        },
        async exportPNG(w, h) {
          if (phase < 3 || !geo || (session && !session.done())) finishNow();
          if (!geo) throw new Error('The tangle is not ready');
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          paintTo(c.getContext('2d', { alpha: false }), w, h, host.getState());
          return U.toBlob(c);
        },
        async exportData() {
          if (phase < 3 || !fp || !geo) finishNow();
          if (!fp || !geo) throw new Error('The tangle is not ready');
          const s = host.getState();
          const gens = unstablePoints();
          const ut = [], up = [];
          for (let g = 0; g < gens.length; g++) for (let i = 0; i < gens[g].length; i++) { ut.push(gens[g][i].t2); up.push(gens[g][i].p2); }
          const st = geo.sea.map(p => p.t2), sp = geo.sea.map(p => p.p2);
          return {
            arrays: {
              fixed_point: { data: Float64Array.of(fp.t2, fp.p2), shape: [2], units: 'radian, canonical momentum', description: 'Newton fixed point of the lifted return at the point step' },
              unstable_eigenvalue: { data: Float64Array.of(fp.lam), shape: [1], description: 'Unstable eigenvalue of the section return, from a central difference of the same map' },
              unstable_eigenvector: { data: Float64Array.from(fp.vu), shape: [2], description: 'Unit unstable eigenvector, t2 component nonnegative' },
              unstable_t2: { data: Float64Array.from(ut), shape: [ut.length], units: 'radian', description: 'Unstable manifold samples, continuous angle, generations concatenated' },
              unstable_p2: { data: Float64Array.from(up), shape: [up.length], units: 'canonical momentum', description: 'Unstable manifold samples, paired with unstable_t2' },
              sea_t2: { data: Float64Array.from(st), shape: [st.length], units: 'radian', description: 'Seeded orbit cloud on the section' },
              sea_p2: { data: Float64Array.from(sp), shape: [sp.length], units: 'canonical momentum', description: 'Seeded orbit cloud on the section' },
            },
            meta: {
              tab: 'dptangle', energy: s.energy, masses: [1, 1],
              pointStep: POINT_H, halfStep: POINT_H / 2, curveStep: s.curveStep,
              halfStepP2: fpHalf ? fpHalf.p2 : null,
              returnTime: fp.T, trace: fp.tr, det: fp.det,
              scheme: 'classical RK4, float64, fixed step, section crossing bisected to 1e-14',
              note: 'Floating-point illustration. The proof is the interval computation in research/double-pendulum. Published, doi:10.5281/zenodo.22997540. A crossing in this file is not a proof.',
              coveredByProof: provedAt(s.energy) >= 0,
            },
          };
        },
      };
    },
  });
})();
