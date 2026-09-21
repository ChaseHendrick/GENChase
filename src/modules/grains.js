
/* modules/grains.js */
/* GENChase: a soft-sphere discrete element packing of polydisperse disks settling under gravity, and the branching network of contact forces it carries. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f2 = v => v.toFixed(2);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  /* ================= the model =================

     Cundall and Strack's distinct element method. Every disk is a rigid body carrying a position, a
     velocity and a spin; two disks interact only where they overlap, through a linear spring and a
     dashpot along the line of centers plus a tangential spring capped by Coulomb friction. Nothing is
     solved implicitly and no constraint is enforced: the packing is a large system of stiff damped
     oscillators integrated forward until it stops moving, and the picture is what the contacts are
     carrying when it does.

     Units: the box is 1 wide, the floor is y = 0, y points up. Grain density is 1, so a disk of
     radius r has mass pi r^2 and moment of inertia (1/2) m r^2.

     Gravity and stiffness are not independent. The settled packing depends on them only through the
     dimensionless hardness k_n r0 / (m0 g), the number of grain weights it takes to squash a contact
     by a radius, so turning gravity up is the same thing as making the grains softer. Quote the
     stiffness against a fixed reference weight rather than against the current one and the gravity
     slider becomes a real control instead of a relabelling of the clock, which is what it was in the
     first draft: gravity 0.25 and gravity 4 printed the same plate down to the contact count.
  */

  const PHI = 0.80;          // solid fraction the settled packing is sized for; 2D polydisperse jamming sits near 0.84
  const PHI0 = 0.60;         // solid fraction of the loose starting lattice, so the pile only collapses about a third of its height
  const KT_KN = 0.8;         // tangential stiffness as a fraction of normal; Cundall and Strack keep k_t <= k_n
  const SAFETY = 35;         // dt = contact period / SAFETY
  const SKIN = 0.55;         // Verlet skin, in units of the mean radius
  const KE_TOL = 2e-7;       // stop settling when kinetic energy per grain falls below this many m0 g r0
  // At rest for drawing purposes. KE_TOL is the target the settle runs for; this looser number is what
  // counts as stopped when the status line reports, because a frictionless packing sits on soft modes
  // and relaxes slowly enough that whether it reaches KE_TOL inside the budget depends on the seed. A
  // grain at KE_REST is moving at a few thousandths of the speed it picks up falling the height of the
  // pile, which is nothing on the plate; the corner of the parameter space that genuinely runs out of
  // budget, very stiff grains under weak gravity, lands two hundred times above it.
  const KE_REST = 1e-3;

  // Everything the simulation needs that is not a raw control, derived once from state. sanitize and
  // create both call this, so the timestep that gets reported is the timestep that gets used.
  function derive(s) {
    const ar = ASPECTS[s.aspect] || 1;
    const n = Math.max(40, Math.round(s.n)), p = U.clamp(Number(s.poly) || 0, 0, 0.6);
    // Size the grains so n disks at solid fraction PHI fill a box 1 wide and ar tall. Radii are
    // uniform on [1-p, 1+p] r0, so <r^2> = r0^2 (1 + p^2/3) and the area budget fixes r0.
    const r0 = Math.sqrt(PHI * ar / (n * Math.PI * (1 + p * p / 3)));
    const rmin = r0 * (1 - p), rmax = r0 * (1 + p);
    const g = U.clamp(Number(s.grav) || 1, 0.25, 4);
    const m0 = Math.PI * r0 * r0;
    // Stiffness is quoted as a hardness against a mean grain at the reference gravity of 1:
    // k_n = hard * m0 / r0, so at that gravity one grain resting on another squashes the contact by
    // r0 / hard and a column of H / 2 r0 grains squashes the bottom contact by about (H / 2 r0) / hard
    // of a radius. hard = 4000 at the default geometry is a relative overlap near one percent. That is
    // soft next to a real photoelastic disk, and it is the price of an explicit scheme: harder grains
    // mean a shorter contact period and more steps. What the packing actually feels is hard / g, so
    // the two sliders push the same dimensionless number in opposite directions.
    const kn = s.hard * m0 / r0;

    /* THE STEP, DERIVED, NOT GUESSED.
       A binary contact is a harmonic oscillator: two disks joined by the contact spring oscillate at
       omega = sqrt(k_n / m_eff) with m_eff = m_i m_j / (m_i + m_j), so the contact period is
       T = 2 pi sqrt(m_eff / k_n). An explicit integrator has to resolve that period, and the rule of
       thumb through the DEM literature is dt <= T / 30. We take T / 35 because the tangential spring
       and the Coulomb switch, which can flip inside a step, add behavior the linear estimate does not
       see. The stiffest contact in the packing is the one with the smallest effective mass, which is
       two of the smallest grains touching each other: m_eff = m_min / 2. A grain against a wall has
       m_eff = m_min, since the wall is infinitely heavy, so it is softer and the pair bound covers it.
       Guess this number instead of computing it and the packing does not merely look wrong, it
       detonates: the overlap grows every cycle and the plate is a scatter of grains thrown off frame. */
    const mEffMin = 0.5 * Math.PI * rmin * rmin;
    const period = 2 * Math.PI * Math.sqrt(mEffMin / kn);
    const dt = period / SAFETY;

    // Step budget. How many steps a pile needs to settle is the ratio of its fall time to the
    // timestep, so it grows with grain count and hardness, and with weak gravity, which lengthens the
    // fall without lengthening the contact period. Cap the total work so a large count stays a few
    // seconds instead of a minute; the status line reports the residual kinetic energy, so a packing
    // that ran out of budget says so out loud rather than pretending it is at rest.
    const budget = U.clamp(Math.round(4e7 / n / Math.sqrt(g)), 12000, 40000);
    return { ar, n, p, r0, rmin, rmax, g, m0, kn, kt: KT_KN * kn, period, dt, budget };
  }

  /* ---- the packing ---- */
  function makeSim(s, D) {
    const N = D.n, LX = 1, periodic = s.geom === 'periodic';
    const dt = s.dt, mu = s.mu, damp = s.damp;
    const x = new Float64Array(N), y = new Float64Array(N);
    const vx = new Float64Array(N), vy = new Float64Array(N), om = new Float64Array(N);
    const fx = new Float64Array(N), fy = new Float64Array(N), tq = new Float64Array(N);
    const r = new Float64Array(N), m = new Float64Array(N), im = new Float64Array(N), iI = new Float64Array(N);
    // Tangential springs against the walls: one slot per grain per wall, 0 floor, 1 left, 2 right, 3 lid.
    const wxi = new Float64Array(N * 4);

    const rng = U.makeRng(s.seed + '/grains');
    // Polydispersity is not decoration. Equal disks poured under gravity crystallize in patches into
    // the triangular lattice, and wherever they do the contacts line up into long straight rails that
    // all carry the same load: tidy, and a lie about how granular matter transmits stress. Set it to
    // zero and the plate shows it, straight rows along the floor and up the walls. A spread of radii
    // frustrates the lattice, and what comes out instead is the sparse branching network the
    // photoelastic experiments show.
    for (let i = 0; i < N; i++) {
      r[i] = D.r0 * (1 + D.p * (2 * rng() - 1));
      m[i] = Math.PI * r[i] * r[i];
      im[i] = 1 / m[i];
      iI[i] = 1 / (0.5 * m[i] * r[i] * r[i]);
    }

    // Loose staggered lattice. Row spacing comes from the starting solid fraction, so the pile
    // collapses by about a third of its height and no further. Dropping grains from a great height
    // gives the same packing once it has settled and costs several times the steps to get there.
    const cellArea = Math.PI * D.r0 * D.r0 * (1 + D.p * D.p / 3) / PHI0;
    const cols = Math.max(2, Math.floor(LX / (2 * D.rmax * 1.02)));
    const dx0 = LX / cols;
    const dy0 = Math.max(1.9 * D.r0, cellArea / dx0);
    const jit = 0.11 * dx0;
    for (let i = 0; i < N; i++) {
      const c = i % cols, rw = Math.floor(i / cols);
      x[i] = (c + 0.5 + (rw & 1) * 0.5) * dx0 + (2 * rng() - 1) * jit;
      y[i] = D.rmax + (rw + 0.5) * dy0 + (2 * rng() - 1) * jit;
      // A small seeded kick decorrelates grains that start on the same row. Its scale is a fraction
      // of the speed a grain picks up falling its own radius.
      const sp = 0.7 * Math.sqrt(D.g * D.r0);
      vx[i] = rng.gauss() * sp; vy[i] = rng.gauss() * sp;
      if (periodic) { if (x[i] < 0) x[i] += LX; else if (x[i] >= LX) x[i] -= LX; }
      else x[i] = U.clamp(x[i], r[i], LX - r[i]);
    }

    /* ---- neighbor finding: a uniform grid hash feeding a Verlet list ----
       Testing every pair is O(N^2) and dies above a few hundred grains. Grains are bucketed into a
       uniform grid whose cell is the interaction range, so only nine cells are ever consulted, and
       the pairs found that way are kept in a Verlet list with a skin, so the grid is only rebuilt once
       something has moved far enough to change the answer. The list also gives the tangential springs
       a home: between rebuilds the pair order is fixed, so a spring is a parallel array entry with no
       lookup at all, which is the difference between a packing that settles in seconds and one that
       does not. */
    let cap = Math.max(256, N * 12);
    let pi_ = new Int32Array(cap), pj_ = new Int32Array(cap), pxi = new Float64Array(cap), np = 0;
    let cnt = null, start = null, cells = 0;
    const ord = new Int32Array(N);
    const lx0 = new Float64Array(N), ly0 = new Float64Array(N);   // positions at the last rebuild
    const skin = SKIN * D.r0;

    function grow() {
      cap *= 2;
      const a = new Int32Array(cap), b = new Int32Array(cap), c = new Float64Array(cap);
      a.set(pi_); b.set(pj_); c.set(pxi);
      pi_ = a; pj_ = b; pxi = c;
    }

    function buildPairs() {
      // Carry the tangential springs across the rebuild. Only loaded contacts hold a non-zero spring,
      // so this map holds a few entries per grain and a rebuild happens every few tens of steps.
      // Dropping the springs instead lets the packing creep downhill forever and it never settles.
      const carry = new Map();
      for (let k = 0; k < np; k++) if (pxi[k] !== 0) carry.set(pi_[k] * N + pj_[k], pxi[k]);

      let ymax = 0;
      for (let i = 0; i < N; i++) { const t = y[i] + r[i]; if (t > ymax) ymax = t; }
      const range = 2 * D.rmax + skin;
      const gx = Math.max(1, Math.floor(LX / range));
      const csx = LX / gx, csy = range;
      const gy = Math.max(1, Math.ceil((ymax + 2 * range) / csy));
      const nc = gx * gy;
      if (nc + 2 > cells) { cells = nc + 2; cnt = new Int32Array(cells); start = new Int32Array(cells); }
      cnt.fill(0, 0, nc + 1);
      const cellOf = i => {
        let cx = Math.floor(x[i] / csx); cx = cx < 0 ? 0 : cx >= gx ? gx - 1 : cx;
        let cy = Math.floor(y[i] / csy); cy = cy < 0 ? 0 : cy >= gy ? gy - 1 : cy;
        return cy * gx + cx;
      };
      for (let i = 0; i < N; i++) cnt[cellOf(i) + 1]++;
      for (let c = 0; c < nc; c++) cnt[c + 1] += cnt[c];
      start.set(cnt.subarray(0, nc + 1));
      for (let i = 0; i < N; i++) ord[start[cellOf(i)]++] = i;
      start.set(cnt.subarray(0, nc + 1));

      // A one-cell box cannot be wrapped without a grain seeing itself, so only wrap when there is
      // room for it; three cells across is the smallest honest periodic box.
      const wrap = periodic && gx >= 3;
      np = 0;
      const half = LX / 2;
      for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
        const a0 = start[cy * gx + cx], a1 = cnt[cy * gx + cx + 1];
        for (let a = a0; a < a1; a++) {
          const i = ord[a];
          // All nine neighbor cells, keeping only i < j. Scanning half of them is cheaper, but the
          // bookkeeping goes wrong under a wrapped x and rebuilds are rare enough not to care.
          for (let oy = -1; oy <= 1; oy++) {
            const ny = cy + oy; if (ny < 0 || ny >= gy) continue;
            for (let ox = -1; ox <= 1; ox++) {
              let nx = cx + ox;
              if (wrap) { if (nx < 0) nx += gx; else if (nx >= gx) nx -= gx; }
              else if (nx < 0 || nx >= gx) continue;
              const b0 = start[ny * gx + nx], b1 = cnt[ny * gx + nx + 1];
              for (let b = b0; b < b1; b++) {
                const j = ord[b]; if (j <= i) continue;
                let dx = x[j] - x[i];
                if (wrap) { if (dx > half) dx -= LX; else if (dx < -half) dx += LX; }
                const dy = y[j] - y[i], reach = r[i] + r[j] + skin;
                if (dx * dx + dy * dy > reach * reach) continue;
                if (np >= cap) grow();
                pi_[np] = i; pj_[np] = j;
                const had = carry.get(i * N + j);
                pxi[np] = had === undefined ? 0 : had;
                np++;
              }
            }
          }
        }
      }
      for (let i = 0; i < N; i++) { lx0[i] = x[i]; ly0[i] = y[i]; }
    }

    // Rebuild once any grain has moved half the skin since the last build: past that a pair that was
    // out of reach could have come into contact without ever entering the list.
    function stale() {
      const lim = 0.25 * skin * skin, half = LX / 2;
      for (let i = 0; i < N; i++) {
        let dx = x[i] - lx0[i];
        if (periodic) { if (dx > half) dx -= LX; else if (dx < -half) dx += LX; }
        const dy = y[i] - ly0[i];
        if (dx * dx + dy * dy > lim) return true;
      }
      return false;
    }

    const sim = {
      N, LX, periodic, x, y, vx, vy, om, r, m, D,
      lidY: Infinity, lidVy: 0, lidOn: false, ke: 1, step: 0,
    };

    // One grain-grain contact. n points from j to i, so a positive normal force pushes i away from j;
    // t is n turned a quarter turn counterclockwise. springIdx is the pair's slot in the Verlet list.
    function contact(i, j, nx, ny, delta, mEff, springIdx) {
      const kn = D.kn;
      const tx = -ny, ty = nx;
      // Relative velocity of i with respect to j at the contact point, spin included.
      const rvx = vx[i] - vx[j], rvy = vy[i] - vy[j];
      const vn = rvx * nx + rvy * ny;
      const vt = rvx * tx + rvy * ty - (r[i] * om[i] + r[j] * om[j]);
      // Damping quoted as a ratio of critical for this pair, so one slider means the same thing for a
      // small grain on a large one as for two of a size.
      const gamma = 2 * damp * Math.sqrt(mEff * kn);
      // The dashpot resists approach (vn < 0) and opposes separation (vn > 0). Left alone it would
      // pull the grains back together at the end of a collision, a glue that no dry contact has;
      // clamping at zero makes the contact something that can only push.
      let fn = kn * delta - gamma * vn;
      if (fn < 0) fn = 0;
      // Cundall and Strack's tangential spring: integrate the relative tangential motion since the
      // contact formed, hold it back elastically, then cap at the Coulomb limit and shorten the spring
      // to match so it never stores force the contact cannot carry.
      let xi = pxi[springIdx] + vt * dt;
      let ft = -D.kt * xi;
      const lim = mu * fn;
      if (ft > lim) { ft = lim; xi = -ft / D.kt; }
      else if (ft < -lim) { ft = -lim; xi = -ft / D.kt; }
      pxi[springIdx] = xi;
      const Fx = fn * nx + ft * tx, Fy = fn * ny + ft * ty;
      fx[i] += Fx; fy[i] += Fy; tq[i] -= r[i] * ft;
      fx[j] -= Fx; fy[j] -= Fy; tq[j] -= r[j] * ft;
    }

    // A wall is the same contact against an infinitely heavy, possibly moving partner.
    function wall(i, nx, ny, delta, slot, wvy) {
      const kn = D.kn, k = i * 4 + slot;
      const tx = -ny, ty = nx;
      const rvx = vx[i], rvy = vy[i] - wvy;
      const vn = rvx * nx + rvy * ny;
      const vt = rvx * tx + rvy * ty - r[i] * om[i];
      const gamma = 2 * damp * Math.sqrt(m[i] * kn);
      let fn = kn * delta - gamma * vn;
      if (fn < 0) fn = 0;
      let xi = wxi[k] + vt * dt;
      let ft = -D.kt * xi;
      const lim = mu * fn;
      if (ft > lim) { ft = lim; xi = -ft / D.kt; }
      else if (ft < -lim) { ft = -lim; xi = -ft / D.kt; }
      wxi[k] = xi;
      fx[i] += fn * nx + ft * tx;
      fy[i] += fn * ny + ft * ty;
      tq[i] -= r[i] * ft;
    }

    // Background drag. Packing generation in real DEM codes uses a non-physical body damping to bleed
    // off the collective kinetic energy, because otherwise a pile rings for thousands of contact
    // periods before it is quiet enough to call settled. It does not enter the static force balance,
    // so the network it leaves behind is the one gravity built; it only decides how long you wait.
    const drag = 0.5 * damp * Math.sqrt(D.g / D.r0);

    function forces() {
      const g = D.g, half = LX / 2;
      for (let i = 0; i < N; i++) {
        fx[i] = -drag * m[i] * vx[i];
        fy[i] = -m[i] * g - drag * m[i] * vy[i];
        tq[i] = -drag * om[i] / iI[i];
      }
      for (let k = 0; k < np; k++) {
        const i = pi_[k], j = pj_[k];
        let dx = x[j] - x[i];
        if (periodic) { if (dx > half) dx -= LX; else if (dx < -half) dx += LX; }
        const dy = y[j] - y[i];
        const d2 = dx * dx + dy * dy, sum = r[i] + r[j];
        if (d2 >= sum * sum || d2 === 0) { pxi[k] = 0; continue; }
        const dist = Math.sqrt(d2);
        contact(i, j, -dx / dist, -dy / dist, sum - dist, m[i] * m[j] / (m[i] + m[j]), k);
      }
      for (let i = 0; i < N; i++) {
        let d = r[i] - y[i];
        if (d > 0) wall(i, 0, 1, d, 0, 0); else wxi[i * 4] = 0;
        if (!periodic) {
          d = r[i] - x[i];
          if (d > 0) wall(i, 1, 0, d, 1, 0); else wxi[i * 4 + 1] = 0;
          d = r[i] - (LX - x[i]);
          if (d > 0) wall(i, -1, 0, d, 2, 0); else wxi[i * 4 + 2] = 0;
        }
        if (sim.lidOn) {
          d = r[i] - (sim.lidY - y[i]);
          if (d > 0) wall(i, 0, -1, d, 3, sim.lidVy); else wxi[i * 4 + 3] = 0;
        }
      }
    }

    /* Semi-implicit (symplectic) Euler: velocity from the forces at the current state, then position
       from the velocity that just came out. Velocity-Verlet is the usual choice for conservative
       forces, but half of what acts here depends on velocity (the dashpot, the background drag, and
       the Coulomb switch, which can flip inside a step), and Verlet's second half kick would have to
       be evaluated at a velocity it does not have yet. Symplectic Euler is consistent with all three
       and is what DEM codes actually run. */
    function step() {
      forces();
      let ke = 0;
      for (let i = 0; i < N; i++) {
        vx[i] += dt * fx[i] * im[i];
        vy[i] += dt * fy[i] * im[i];
        om[i] += dt * tq[i] * iI[i];
        x[i] += dt * vx[i];
        y[i] += dt * vy[i];
        if (periodic) { if (x[i] < 0) x[i] += LX; else if (x[i] >= LX) x[i] -= LX; }
        ke += 0.5 * (m[i] * (vx[i] * vx[i] + vy[i] * vy[i]) + om[i] * om[i] / iI[i]);
      }
      // Reported in units of the energy it takes to lift a mean grain by its own radius, so the
      // number means the same thing at any gravity, grain count or aspect.
      sim.ke = ke / (N * D.m0 * D.g * D.r0);
      sim.step++;
      if (stale()) buildPairs();
    }

    buildPairs();
    sim.stepOnce = step;
    sim.top = function () { let t = 0; for (let i = 0; i < N; i++) { const v = y[i] + r[i]; if (v > t) t = v; } return t; };
    sim.pairs = function () { return { np, pi_, pj_ }; };
    return sim;
  }

  /* ---- the contact network, measured once the packing has stopped ----
     At rest the dashpot contributes nothing, so the static normal force is k_n times the overlap and
     the whole network is read straight off the geometry. */
  function network(sim, D, s) {
    const N = sim.N, LX = sim.LX, periodic = sim.periodic, x = sim.x, y = sim.y, r = sim.r;
    const p = sim.pairs(), half = LX / 2;
    const ci = [], cj = [], cf = [], cdx = [], cdy = [];
    const load = new Float64Array(N), wallDeg = new Int32Array(N);
    for (let k = 0; k < p.np; k++) {
      const i = p.pi_[k], j = p.pj_[k];
      let dx = x[j] - x[i];
      if (periodic) { if (dx > half) dx -= LX; else if (dx < -half) dx += LX; }
      const dy = y[j] - y[i], d2 = dx * dx + dy * dy, sum = r[i] + r[j];
      if (d2 >= sum * sum || d2 === 0) continue;
      const f = D.kn * (sum - Math.sqrt(d2));
      ci.push(i); cj.push(j); cf.push(f); cdx.push(dx); cdy.push(dy);
      load[i] += f; load[j] += f;
    }
    // Wall contacts are not drawn, but a grain pressed against the floor is carrying that load and is
    // not a rattler, so they count toward both the load map and the coordination number.
    for (let i = 0; i < N; i++) {
      let d = r[i] - y[i];
      if (d > 0) { load[i] += D.kn * d; wallDeg[i]++; }
      if (!periodic) {
        d = r[i] - x[i]; if (d > 0) { load[i] += D.kn * d; wallDeg[i]++; }
        d = r[i] - (LX - x[i]); if (d > 0) { load[i] += D.kn * d; wallDeg[i]++; }
      }
      if (sim.lidOn) { d = r[i] - (sim.lidY - y[i]); if (d > 0) { load[i] += D.kn * d; wallDeg[i]++; } }
    }

    const nc = cf.length;
    let total = 0; for (let k = 0; k < nc; k++) total += cf[k];
    const mean = nc ? total / nc : 1;
    const sorted = cf.slice().sort((a, b) => b - a);
    // How concentrated the network is: the share of the total contact load carried by the strongest
    // tenth of the contacts. A network that spread the load evenly would give 10 percent; a real
    // packing gives three to four times that, which is the number behind the photoelastic picture.
    let top = 0; const nt = Math.max(1, Math.round(0.1 * nc));
    for (let k = 0; k < nt; k++) top += sorted[k];
    const top10 = total > 0 ? top / total : 0;
    // Color reference. The top of the ramp is the 99th percentile force rather than the maximum,
    // which one freak contact would otherwise own, and rather than the 95th, which in a homogeneous
    // frictionless packing leaves the whole lower half of the plate clipped to one flat color.
    const fHi = nc ? Math.max(sorted[Math.floor(0.01 * (nc - 1))], 1e-30) : 1;

    /* Coordination number over the load-bearing backbone. Rattlers, grains sitting loose in a pocket
       with fewer than two contacts, carry nothing and drag the mean down without saying anything
       about the packing, so strip them, and strip repeatedly because removing one can orphan its
       neighbor. For a frictionless 2D packing at jamming, isostaticity gives Z = 4; friction adds
       tangential constraints, so fewer contacts are needed to fix a grain and Z falls toward 3. */
    const alive = new Uint8Array(N).fill(1), dg = new Int32Array(N);
    for (let pass = 0; pass < 30; pass++) {
      dg.fill(0);
      for (let k = 0; k < nc; k++) { const i = ci[k], j = cj[k]; if (alive[i] && alive[j]) { dg[i]++; dg[j]++; } }
      let cut = 0;
      for (let i = 0; i < N; i++) if (alive[i] && dg[i] + wallDeg[i] < 2) { alive[i] = 0; cut++; }
      if (!cut) break;
    }
    let back = 0, bc = 0;
    for (let i = 0; i < N; i++) if (alive[i]) { back++; bc += dg[i] + wallDeg[i]; }
    const Z = back ? bc / back : 0;

    const ls = Array.from(load).sort((a, b) => a - b);
    const load95 = Math.max(ls[Math.floor(0.95 * (N - 1))], 1e-30);
    return { ci, cj, cf, cdx, cdy, nc, mean, fHi, top10, Z, back, load, load95 };
  }

  /* ---- drawing ---- */
  /* A 64-entry ramp over the palette, ordered by contrast against the background rather than by the
     order the palette happens to list its colors. The plate encodes force as visibility, so the ramp
     has to run from the color nearest the background to the color furthest from it, and several of
     the light-ground palettes carry a near-white that would otherwise land in the middle of the ramp
     and cut a band of invisible contacts out of the network. The offset control slides the whole force
     range up the ramp instead of rotating it, which the other modules do with a cyclic shift: rotating
     a contrast-ordered ramp would put an invisible color back in the middle, and the one thing this
     plate must not do is hide its own strongest contacts. The ramp does not start from the background
     itself either: a contact that is drawn at all should be visible, and the threshold decides which
     contacts are drawn. */
  function rampLUT(s) {
    const lb = U.luminance(s.bg);
    const sorted = s.palette.slice().sort((a, b) => Math.abs(U.luminance(a) - lb) - Math.abs(U.luminance(b) - lb));
    const ramp = U.makeRamp(sorted);
    const off = U.clamp((s.shift | 0) / 20, 0, 0.75);
    const lut = [];
    for (let i = 0; i < 64; i++) { const c = ramp(off + (1 - off) * i / 63); lut.push(U.rgbToHex(c[0], c[1], c[2])); }
    return lut;
  }
  const bin = t => Math.min(63, Math.max(0, Math.floor(t * 63)));

  // Fit the settled packing into the frame. The box is always 1 wide; the height is whatever the pile
  // ended up at, which is why the plate fills the sheet whether the packing compacted or arched.
  function frame(sim, s, W, H) {
    const top = Math.max(sim.top(), 1e-6), mg = s.margin;
    const sc = Math.min(W * (1 - 2 * mg) / sim.LX, H * (1 - 2 * mg) / top);
    return { sc, ox: (W - sim.LX * sc) / 2, oy: (H - top * sc) / 2, top };
  }

  /* ---------- Force Chains ---------- */
  Studio.register({
    id: 'grains',
    name: 'Force Chains',
    tab: 'Chains',
    subtitle: 'a granular packing and the network that carries it · 1979',
    order: 36,
    equation: 'F_n = k_n δ − γ_n v_n  for δ = r_i + r_j − |x_ij| > 0,   |F_t| ≤ μ F_n;   m ẍ = Σ F − m g ŷ;   Δt = T/35,  T = 2π√(m_eff/k_n)',
    credit: "Peter Cundall and Otto Strack, 'A discrete numerical model for granular assemblies', Geotechnique 29, 47 (1979), gave the distinct element method used here: rigid disks, a linear normal spring with a dashpot, a tangential spring capped by Coulomb friction, and an explicit step bounded by the contact period. Trushant Majmudar and Robert Behringer, Nature 435, 1079 (2005), measured the grain-scale normal and tangential forces inside a two-dimensional photoelastic packing and showed the filamentary chains directly. Farhang Radjai, Michel Jean, Jean-Jacques Moreau and Stephane Roux, Physical Review Letters 77, 274 (1996), found that the contact force distribution decays exponentially above the mean and as a power law below it; Radjai, Dietrich Wolf, Jean and Moreau, Physical Review Letters 80, 61 (1998), split the packing into a strong network above the mean force, which carries the deviatoric stress, and a weak network below it, which does not.",
    blurb: 'Pour disks into a box and they jam. Weigh the contacts afterwards and almost none of them are doing the work: the load runs down a sparse branching skeleton of heavily squeezed grains while the rest of the packing idles beside it, and the same picture comes out of a simulation as out of a tray of photoelastic disks under crossed polarizers. Every disk here is integrated from its own forces, a spring and a dashpot wherever two of them overlap plus a friction spring that slips at the Coulomb limit, until the pile stops moving. The chains view draws one line per contact, weighted and colored by the force it carries; the grains view colors the disks by their total load. Stiffness and damping say how hard and how dead the grains are, friction decides how much the packing can arch, and polydispersity keeps it from crystallising, which would replace the branching with straight rails of equal weight.',
    schema: [
      RANGE('Packing', 'n', 'Grains', GEOM, 200, 3500, 50, v => Math.round(v).toLocaleString(),
        { hint: 'Cost is grains times steps. A few hundred reads as individual disks, two thousand reads as a material.' }),
      RANGE('Packing', 'poly', 'Polydispersity', GEOM, 0, 0.5, 0.01, f2,
        { hint: 'Half-width of the radius spread. At zero the packing crystallizes in patches and those patches carry the load along straight rails of equal weight, which is neither what a real sand does nor worth looking at. A third of the mean radius is enough to frustrate it.' }),
      { group: 'Packing', key: 'geom', label: 'Sides', type: 'seg', kind: GEOM,
        options: [['walls', 'Rigid walls'], ['periodic', 'Periodic']] },
      RANGE('Packing', 'press', 'Top load', GEOM, 0, 0.05, 0.002, f2,
        { hint: 'Compressive strain applied by a rigid lid once the pile has settled. Zero leaves a free surface and gravity alone.' }),
      RANGE('Grains', 'hard', 'Stiffness', GEOM, 800, 12000, 100, v => Math.round(v).toLocaleString(),
        { hint: 'Contact stiffness in grain weights per radius, measured at gravity 1. Harder grains overlap less and need a shorter step, so the settle costs more.' }),
      RANGE('Grains', 'damp', 'Damping', GEOM, 0.05, 0.9, 0.01, f2,
        { hint: 'Contact damping as a fraction of critical. Below about 0.15 the pile rings for a long time and may not settle inside the step budget.' }),
      RANGE('Grains', 'mu', 'Friction', GEOM, 0, 0.8, 0.02, f2,
        { hint: 'Coulomb coefficient. More friction means fewer contacts are needed to hold a grain in place, so the coordination number falls and the packing can arch.' }),
      RANGE('Grains', 'grav', 'Gravity', GEOM, 0.25, 4, 0.05, f2,
        { hint: 'Only the ratio of stiffness to gravity matters to the settled packing, so heavy gravity and soft grains are the same thing. Turning it up deepens every overlap and compacts the pile.' }),
      { group: 'Network', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['chains', 'Force chains'], ['grains', 'Grains'], ['both', 'Both']] },
      RANGE('Network', 'wexp', 'Force → width', PAINT, 0.2, 2.5, 0.05, f2,
        { hint: 'Line width goes as force over mean force, raised to this power. Above 1 the strong network stands out and the weak one recedes.' }),
      RANGE('Network', 'weight', 'Line weight', PAINT, 0.2, 3, 0.05, f2),
      RANGE('Network', 'thresh', 'Force threshold', PAINT, 0, 1.2, 0.02, f2,
        { hint: 'Contacts carrying less than this many mean forces are not drawn. At one mean force what is left is exactly the strong network of Radjai and colleagues.' }),
      RANGE('Network', 'shift', 'Palette offset', PAINT, 0, 15, 1, String,
        { hint: 'Slides the force range up the color ramp, which runs from the palette color closest to the background to the one furthest from it. At zero the weakest contacts are almost invisible; raise it and the whole network inks up.' }),
      RANGE('Finish', 'margin', 'Margin', PAINT, 0, 0.2, 0.01, f2),
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
      { group: 'Finish', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM,
        options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    ],
    defaults: {
      n: 1100, poly: 0.32, geom: 'walls', press: 0,
      hard: 4000, damp: 0.35, mu: 0.4, grav: 1,
      view: 'chains', wexp: 1.15, weight: 1.1, thresh: 0.12, shift: 0,
      margin: 0.06, grain: 0.04, aspect: '1:1',
      dt: 1e-4,                 // hidden: sanitize derives it from the contact period; never set by hand
      seed: 'cundall-1979',
    },
    presets: {
      pour: pre('Poured under gravity', { n: 1100, poly: 0.32, geom: 'walls', press: 0, mu: 0.4, hard: 4000, damp: 0.35, view: 'chains', wexp: 1.15, weight: 1.1, thresh: 0.12, shift: 0, aspect: '1:1' }, Pal.kiln),
      photo: pre('Photoelastic', { n: 900, poly: 0.34, geom: 'walls', press: 0.03, mu: 0.3, hard: 5000, damp: 0.4, view: 'both', wexp: 1.4, weight: 1.2, thresh: 0.05, shift: 0, aspect: '1:1' }, Pal.xray),
      strong: pre('Strong network only', { n: 1600, poly: 0.36, geom: 'periodic', press: 0.04, mu: 0.45, hard: 4000, damp: 0.4, view: 'chains', wexp: 1.8, weight: 1.6, thresh: 0.9, shift: 3, aspect: '5:4' }, Pal.ember),
      arch: pre('Arching on high friction', { n: 1300, poly: 0.3, geom: 'walls', press: 0, mu: 0.8, hard: 4000, damp: 0.3, view: 'chains', wexp: 1.2, weight: 1.2, thresh: 0.1, shift: 0, aspect: '4:5' }, Pal.verdigris),
      slip: pre('Frictionless, Z near 4', { n: 1200, poly: 0.4, geom: 'periodic', press: 0.03, mu: 0, hard: 4000, damp: 0.45, view: 'chains', wexp: 1, weight: 0.9, thresh: 0.08, shift: 0, aspect: '3:2' }, Pal.glacier),
      disks: pre('The grains themselves', { n: 700, poly: 0.42, geom: 'walls', press: 0, mu: 0.35, hard: 4000, damp: 0.35, view: 'grains', wexp: 1, weight: 1, thresh: 0, shift: 0, aspect: '1:1' }, Pal.petri),
      column: pre('Tall column, Janssen', { n: 1500, poly: 0.3, geom: 'walls', press: 0, mu: 0.6, hard: 4000, damp: 0.35, view: 'both', wexp: 1.3, weight: 1, thresh: 0.08, shift: 0, aspect: '4:5' }, Pal.graphite),
    },
    hints: {
      Packing: 'Grains fall from a loose lattice and compact under gravity. The seed fixes every radius, every starting jitter and every initial kick, so a seed and these numbers reprint the same packing exactly.',
      Grains: 'Stiffness, damping and friction are the whole contact law, and what the packing feels is stiffness divided by gravity. The timestep is not a control: it is derived from the stiffest contact in the packing, because an explicit scheme needs about a thirtieth of the contact period or the overlaps grow every cycle and the pile explodes.',
      Network: 'Width and color both read the normal force at the contact. Raise the threshold past one mean force and what is left is the strong network, the part of the packing that carries the shear.',
    },
    closedGroups: ['Finish'],
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (weak force → strong)',
    headline: 'n', headlineLabel: 'grains',
    sanitize(s) {
      s.n = U.clamp(Math.round(Number(s.n) / 50) * 50, 200, 3500);
      s.poly = U.clamp(Number(s.poly) || 0, 0, 0.5);
      s.hard = U.clamp(Math.round(Number(s.hard) || 4000), 800, 12000);
      s.damp = U.clamp(Number(s.damp) || 0.35, 0.05, 0.9);
      s.mu = U.clamp(Number(s.mu) || 0, 0, 0.8);
      s.grav = U.clamp(Number(s.grav) || 1, 0.25, 4);
      s.press = U.clamp(Number(s.press) || 0, 0, 0.05);
      // The timestep is not a control. It is the contact period of the stiffest pair in this packing
      // divided by SAFETY, computed in derive from the actual smallest mass and the actual stiffness,
      // then floored so no combination of sliders can drive it to zero and hang the settle.
      s.dt = Math.max(1e-9, derive(s).dt);
    },
    surprise(rng) {
      return {
        n: rng.pick([700, 900, 1100, 1300, 1600]),
        poly: rng.range(0.25, 0.45),
        geom: rng() < 0.6 ? 'walls' : 'periodic',
        press: rng.pick([0, 0, 0.02, 0.03]),
        hard: rng.pick([3000, 4000, 5000]),
        damp: rng.range(0.25, 0.5),
        mu: rng.pick([0, 0.2, 0.4, 0.6, 0.8]),
        grav: 1,
        view: rng.pick(['chains', 'chains', 'chains', 'both', 'grains']),
        wexp: rng.range(0.9, 1.9),
        weight: rng.range(0.8, 1.6),
        thresh: rng.pick([0, 0.08, 0.15, 0.6, 1]),
        shift: rng.int(0, 4),
        margin: 0.06,
        grain: rng.pick([0, 0.04, 0.08]),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let sim = null, net = null, D = null, timer = 0, building = false, paused = false;
      let phase = 0, phaseEnd = 0, lidFrom = 0, lidTo = 0, lidFirst = 0, budget = 0;

      function progress() {
        host.setStatus('<span>grains <b>' + (D ? D.n.toLocaleString() : '0') + '</b></span>' +
          '<span>settling <b>' + (sim ? sim.step.toLocaleString() : '0') + '</b> / ' + budget.toLocaleString() + '</span>' +
          '<span>KE/grain <b>' + (sim ? sim.ke.toExponential(1) : '-') + '</b> · dt <b>' + host.getState().dt.toExponential(1) + '</b></span>');
      }
      function status() {
        // Z is the coordination number over the load-bearing backbone: 4 for a frictionless 2D packing
        // at jamming, falling toward 3 as friction rises. The last span is the residual kinetic energy
        // per grain in units of m0 g r0, and it says so when the packing ran out of budget before it
        // came to rest, because a plate of a pile that is still moving is not the plate it claims.
        const rest = sim.ke < KE_REST;
        host.setStatus('<span>grains <b>' + D.n.toLocaleString() + '</b> · contacts <b>' + net.nc.toLocaleString() + '</b></span>' +
          '<span>Z <b>' + net.Z.toFixed(2) + '</b></span>' +
          '<span>strongest 10% carry <b>' + Math.round(100 * net.top10) + '%</b></span>' +
          '<span>KE/grain <b>' + sim.ke.toExponential(1) + '</b>' + (rest ? '' : ' · still creeping') +
          ' · dt <b>' + D.dt.toExponential(1) + '</b></span>');
      }

      // Phase 0 settles under gravity; phase 1 drives a lid down by the requested strain; phase 2 lets
      // it settle again; phase 3 is done. With no top load the whole budget goes to phase 0.
      function advance(s) {
        if (phase === 0 && s.press > 0) {
          phase = 1; lidFirst = sim.step;
          phaseEnd = Math.min(budget, sim.step + Math.round(0.25 * budget));
          lidFrom = sim.top(); lidTo = lidFrom * (1 - s.press);
          sim.lidOn = true; sim.lidY = lidFrom;
          // Strain control rather than force control, because a ramp of known length is guaranteed to
          // terminate and a servo is not.
          sim.lidVy = (lidTo - lidFrom) / Math.max(1, phaseEnd - lidFirst) / s.dt;
        } else if (phase === 1) { phase = 2; sim.lidVy = 0; phaseEnd = budget; }
        else phase = 3;
      }

      // Run up to count steps of the settle, stopping early once it is finished. The only thing a
      // caller varies is how many steps it asks for, so a chunked build and a blocking one produce the
      // same packing step for step.
      function tick(s, count) {
        for (let q = 0; q < count && phase < 3; q++) {
          if (phase === 1) {
            const t = U.clamp((sim.step - lidFirst) / Math.max(1, phaseEnd - lidFirst), 0, 1);
            sim.lidY = lidFrom + (lidTo - lidFrom) * t;
          }
          sim.stepOnce();
          if (sim.step >= phaseEnd || (phase !== 1 && sim.ke < KE_TOL && sim.step > 600)) advance(s);
        }
      }
      function settled(s) { building = false; net = network(sim, D, s); render(); status(); }

      /* The settle is chunked so the page never blocks, but the physics must not depend on where the
         chunks fall or the same recipe would give different plates on two machines. The wall clock
         only decides when to yield; what decides when to stop is the step budget and the kinetic
         energy, and both are functions of state alone. */
      function build(s) {
        clearTimeout(timer); building = true; paused = false;
        D = derive(s); budget = D.budget;
        sim = makeSim(s, D);
        phase = 0; phaseEnd = s.press > 0 ? Math.round(0.5 * budget) : budget;
        (function chunk() {
          if (paused) return;
          const t0 = performance.now();
          while (phase < 3 && performance.now() - t0 < 32) tick(s, 24);
          if (phase >= 3) { settled(s); return; }
          progress();
          timer = setTimeout(chunk, 0);
        })();
      }

      /* An export must never fail because the settle has not caught up. Yielding between chunks is
         right while somebody is watching the step count climb, but an export is a one-shot they asked
         for, so finish whatever is left in one blocking pass. exportSVG is synchronous and has no other
         option, and the packing it lands on is the one the screen was a second away from showing. This
         is not hypothetical: the print harness presses export a fixed number of seconds after switching
         preset, and the slowest preset was still settling when it did. */
      function finishNow() {
        if (!building || !sim) return;
        clearTimeout(timer);
        const s = host.getState();
        tick(s, budget + 8);         // the whole settle is bounded by budget, so this always completes
        phase = 3;
        settled(s);
      }

      function paint(c2, W, H) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, W, H);
        if (!net) return;
        const F = frame(sim, s, W, H), sc = F.sc, ox = F.ox, oy = F.oy;
        const lut = rampLUT(s), rpx = D.r0 * sc;
        const X = i => ox + sim.x[i] * sc, Y = i => oy + (F.top - sim.y[i]) * sc;

        if (s.view === 'grains' || s.view === 'both') {
          c2.globalAlpha = s.view === 'both' ? 0.35 : 1;
          for (let i = 0; i < sim.N; i++) {
            c2.fillStyle = lut[bin(Math.pow(U.clamp(net.load[i] / net.load95, 0, 1), 0.65))];
            c2.beginPath(); c2.arc(X(i), Y(i), sim.r[i] * sc, 0, U.TAU); c2.fill();
          }
          c2.globalAlpha = 1;
        }
        if (s.view === 'chains' || s.view === 'both') {
          c2.lineCap = 'round';
          const cut = s.thresh * net.mean;
          for (let k = 0; k < net.nc; k++) {
            const f = net.cf[k]; if (f < cut) continue;
            c2.lineWidth = U.clamp(s.weight * 0.22 * rpx * Math.pow(f / net.mean, s.wexp), 0.35, 1.4 * rpx);
            c2.strokeStyle = lut[bin(Math.pow(U.clamp(f / net.fHi, 0, 1), 0.7))];
            const i = net.ci[k], j = net.cj[k];
            const x1 = X(i), y1 = Y(i), dx = net.cdx[k] * sc, dy = -net.cdy[k] * sc;
            c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x1 + dx, y1 + dy); c2.stroke();
            // A contact across the periodic seam leaves one side of the frame and arrives at the
            // other: draw it from both ends and let the frame clip the halves that fall outside.
            const x2 = X(j);
            if (Math.abs(x1 + dx - x2) > 0.5 * sc) {
              c2.beginPath(); c2.moveTo(x2, Y(j)); c2.lineTo(x2 - dx, Y(j) - dy); c2.stroke();
            }
          }
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), img = c2.getImageData(0, 0, W, H), px = img.data, a = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * a; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          net = null;
          ctx.fillStyle = s.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
          build(s);
          progress();
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() { paused = true; clearTimeout(timer); },
        resume() {
          if (!paused) return;
          paused = false;
          // A settle interrupted halfway is restarted from the seed rather than resumed, because the
          // chunk closure is gone; the result is the same packing, since nothing here reads the clock.
          if (building) build(host.getState());
          else if (net) render();
        },
        async exportPNG(w, h) {
          finishNow();
          if (!net) throw new Error('the packing has not settled yet');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          finishNow();
          if (!net) throw new Error('the packing has not settled yet');
          const s = host.getState();
          const F = frame(sim, s, w, h), sc = F.sc, ox = F.ox, oy = F.oy;
          const lut = rampLUT(s), rpx = D.r0 * sc, rr = v => Math.round(v * 100) / 100;
          const X = i => ox + sim.x[i] * sc, Y = i => oy + (F.top - sim.y[i]) * sc;
          let body = '';
          if (s.view === 'grains' || s.view === 'both') {
            const op = s.view === 'both' ? ' fill-opacity="0.35"' : '';
            for (let i = 0; i < sim.N; i++) {
              body += '<circle cx="' + rr(X(i)) + '" cy="' + rr(Y(i)) + '" r="' + rr(sim.r[i] * sc) +
                '" fill="' + lut[bin(Math.pow(U.clamp(net.load[i] / net.load95, 0, 1), 0.65))] + '"' + op + '/>';
            }
          }
          if (s.view === 'chains' || s.view === 'both') {
            const cut = s.thresh * net.mean;
            for (let k = 0; k < net.nc; k++) {
              const f = net.cf[k]; if (f < cut) continue;
              const wd = U.clamp(s.weight * 0.22 * rpx * Math.pow(f / net.mean, s.wexp), 0.35, 1.4 * rpx);
              const col = lut[bin(Math.pow(U.clamp(f / net.fHi, 0, 1), 0.7))];
              const i = net.ci[k], j = net.cj[k];
              const x1 = X(i), y1 = Y(i), dx = net.cdx[k] * sc, dy = -net.cdy[k] * sc;
              const seg = (ax, ay, bx, by) => '<line x1="' + rr(ax) + '" y1="' + rr(ay) + '" x2="' + rr(bx) +
                '" y2="' + rr(by) + '" stroke="' + col + '" stroke-width="' + rr(wd) + '" stroke-linecap="round"/>';
              body += seg(x1, y1, x1 + dx, y1 + dy);
              const x2 = X(j);
              if (Math.abs(x1 + dx - x2) > 0.5 * sc) body += seg(x2, Y(j), x2 - dx, Y(j) - dy);
            }
          }
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
