
/* modules/skyrmion.js */
/* GENChase: overdamped Landau-Lifshitz-Gilbert relaxation of a 2D Heisenberg magnet with exchange, interfacial or bulk Dzyaloshinskii-Moriya coupling, uniaxial anisotropy and a Zeeman field. Topological charge is the Berg-Luscher solid angle, measured from the plate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Lattice', 'grid', 'Grid', GEOM, 64, 384, 16, v => v + ''),
    { group: 'Lattice', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    { group: 'Lattice', key: 'wrap', label: 'Boundaries', type: 'seg', kind: GEOM, options: [['periodic', 'Periodic'], ['open', 'Open']] },
    RANGE('Magnetism', 'J', 'Exchange J', LIVE, 0.2, 2.4, 0.05, f2),
    RANGE('Magnetism', 'D', 'DMI D', LIVE, 0, 1.2, 0.02, f2),
    { group: 'Magnetism', key: 'dmi', label: 'DMI kind', type: 'seg', kind: GEOM, options: [['neel', 'Neel'], ['bloch', 'Bloch']], hint: 'Interfacial DMI makes radial (Neel) skyrmions. Bulk DMI makes circulating (Bloch) skyrmions.' },
    RANGE('Magnetism', 'K', 'Anisotropy K', LIVE, -0.6, 1.2, 0.02, f2),
    RANGE('Magnetism', 'B', 'Field B', LIVE, -0.8, 0.8, 0.02, f2),
    RANGE('Dynamics', 'dt', 'Step', LIVE, 0.01, 0.2, 0.005, f3),
    RANGE('Dynamics', 'damp', 'Damping', LIVE, 0.2, 1, 0.05, f2),
    RANGE('Dynamics', 'warmup', 'Warm-up', GEOM, 0, 2400, 50, v => v + ''),
    { group: 'Dynamics', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Seeding', key: 'init', label: 'Seed', type: 'seg', kind: GEOM, options: [
      ['skyrmion', 'Skyrmion'],
      ['lattice', 'Lattice'],
      ['bimeron', 'Bimeron'],
      ['spiral', 'Helix'],
      ['ferro', 'Ferro'],
      ['noise', 'Quench'],
    ] },
    RANGE('Seeding', 'radius', 'Core radius', GEOM, 4, 28, 1, v => v + ''),
    RANGE('Seeding', 'width', 'Wall width', GEOM, 1, 10, 0.5, v => Number(v).toFixed(1)),
    RANGE('Seeding', 'count', 'How many', GEOM, 1, 16, 1, v => v + '', { dimUnless: s => s.init === 'lattice' || s.init === 'skyrmion' }),
    { group: 'Seeding', key: 'polarity', label: 'Polarity', type: 'seg', kind: GEOM, options: [['down', 'Core down'], ['up', 'Core up']] },
    RANGE('Seeding', 'noise', 'Seed noise', GEOM, 0, 0.4, 0.02, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [
      ['spin', 'Spin'],
      ['nz', 'n_z'],
      ['qdens', 'Topological density'],
      ['energy', 'Energy'],
    ] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
    { group: 'Picture', key: 'cores', label: 'Mark cores', type: 'toggle', kind: PAINT },
  ];

  const DEFAULTS = {
    grid: 192, aspect: '1:1', wrap: 'periodic',
    J: 1, D: 0.36, dmi: 'neel', K: 0.18, B: 0.06,
    dt: 0.05, damp: 1, warmup: 400, running: true,
    init: 'skyrmion', radius: 14, width: 4, count: 1, polarity: 'down', noise: 0.03,
    view: 'spin', exposure: 1, cores: false,
  };

  const PRESETS = {
    neel: pre('Neel skyrmion', { init: 'skyrmion', dmi: 'neel', D: 0.38, K: 0.2, B: 0.08, radius: 14, count: 1, view: 'spin', warmup: 500 }, Pal.harbor),
    bloch: pre('Bloch skyrmion', { init: 'skyrmion', dmi: 'bloch', D: 0.4, K: 0.16, B: 0.06, radius: 15, view: 'spin', warmup: 500 }, Pal.kiln),
    crystal: pre('Skyrmion crystal', { init: 'lattice', dmi: 'neel', D: 0.42, K: 0.12, B: 0.12, radius: 10, count: 7, view: 'spin', warmup: 800 }, Pal.nightshade),
    bimeron: pre('Bimeron', { init: 'bimeron', dmi: 'neel', D: 0.28, K: -0.08, B: 0.02, radius: 16, view: 'spin', warmup: 600 }, Pal.bioluminescent),
    helix: pre('Helical spiral', { init: 'spiral', dmi: 'bloch', D: 0.5, K: 0.04, B: 0, radius: 10, view: 'nz', warmup: 300 }, Pal.verdigris),
    quench: pre('Quench', { init: 'noise', dmi: 'neel', D: 0.34, K: 0.1, B: 0.06, noise: 0.35, view: 'spin', warmup: 700 }, Pal.ember),
  };

  function surprise(rng) {
    const init = rng.pick(['skyrmion', 'lattice', 'bimeron', 'spiral', 'noise']);
    return {
      init, dmi: rng.pick(['neel', 'bloch']),
      D: rng.range(0.22, 0.55), K: rng.range(-0.1, 0.35), B: rng.range(-0.04, 0.18),
      radius: rng.int(10, 18), count: init === 'lattice' ? rng.int(4, 9) : 1,
      view: rng.pick(['spin', 'spin', 'nz', 'qdens']), warmup: rng.int(300, 800),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(64, Math.min(384, Math.round(s.grid / 16) * 16));
    const stiff = Math.abs(s.J) * 8 + Math.abs(s.D) * 4 + Math.abs(s.K) * 2 + Math.abs(s.B) + 0.2;
    const bound = 0.65 / stiff;
    if (s.dt > bound) s.dt = bound;
  }

  // n_z = p cos Θ, Θ(r) = 2 atan(exp((R-r)/w)). Θ(0)≈π so the core is -p; Θ(∞)≈0 so the far field is +p.
  function placeSkyrmion(nx, ny, nz, W, H, cx, cy, R, w, pol, kind, vort) {
    const gamma = kind === 'bloch' ? Math.PI / 2 : 0;
    const cut = R + 6 * Math.max(0.4, w);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (r > cut) continue;
        const phi = Math.atan2(dy, dx);
        const Theta = 2 * Math.atan(Math.exp((R - r) / Math.max(0.4, w)));
        const st = Math.sin(Theta), ct = Math.cos(Theta);
        const ang = vort * phi + gamma;
        const i = y * W + x;
        nx[i] = st * Math.cos(ang);
        ny[i] = st * Math.sin(ang);
        nz[i] = pol * ct;
      }
    }
  }

  function normalizeAll(nx, ny, nz, N) {
    for (let i = 0; i < N; i++) {
      const L = Math.hypot(nx[i], ny[i], nz[i]) || 1;
      nx[i] /= L; ny[i] /= L; nz[i] /= L;
    }
  }

  function seedField(s, W, H) {
    const N = W * H;
    const nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N);
    // "Core down" means n_z(0) = -1, so p = +1 and the far field is +1.
    const pFar = s.polarity === 'up' ? -1 : 1;
    const rng = U.makeRng(s.seed + '/spin');
    for (let i = 0; i < N; i++) { nx[i] = 0; ny[i] = 0; nz[i] = pFar; }
    const R = s.radius, w = s.width, kind = s.dmi;
    if (s.init === 'ferro') {
      const z = s.B >= 0 ? 1 : -1;
      for (let i = 0; i < N; i++) { nx[i] = 0; ny[i] = 0; nz[i] = z; }
    } else if (s.init === 'noise') {
      for (let i = 0; i < N; i++) {
        const z = rng.range(-1, 1);
        const phi = rng.range(0, Math.PI * 2);
        const rxy = Math.sqrt(Math.max(0, 1 - z * z));
        nx[i] = rxy * Math.cos(phi); ny[i] = rxy * Math.sin(phi); nz[i] = z;
      }
    } else if (s.init === 'spiral') {
      const q = Math.PI / Math.max(4, R);
      const bloch = kind === 'bloch';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, phase = q * x;
        if (bloch) { nx[i] = 0; ny[i] = Math.sin(phase); nz[i] = Math.cos(phase); }
        else { nx[i] = Math.sin(phase); ny[i] = 0; nz[i] = Math.cos(phase); }
      }
    } else if (s.init === 'bimeron') {
      for (let i = 0; i < N; i++) { nx[i] = 1; ny[i] = 0; nz[i] = 0; }
      placeSkyrmion(nx, ny, nz, W, H, W * 0.38, H * 0.5, R, w, 1, kind, 1);
      placeSkyrmion(nx, ny, nz, W, H, W * 0.62, H * 0.5, R, w, -1, kind, -1);
    } else if (s.init === 'lattice') {
      const n = Math.max(1, s.count | 0);
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      let k = 0;
      for (let r = 0; r < rows && k < n; r++) {
        for (let c = 0; c < cols && k < n; c++, k++) {
          const cx = ((c + 0.5 + (r % 2) * 0.5) / cols) * W;
          const cy = ((r + 0.5) / rows) * H;
          placeSkyrmion(nx, ny, nz, W, H, cx, cy, R, w, pFar, kind, 1);
        }
      }
    } else {
      const n = Math.max(1, s.count | 0);
      if (n === 1) placeSkyrmion(nx, ny, nz, W, H, W * 0.5, H * 0.5, R, w, pFar, kind, 1);
      else {
        for (let k = 0; k < n; k++) {
          const ang = (Math.PI * 2 * k) / n, rad = Math.min(W, H) * 0.22;
          placeSkyrmion(nx, ny, nz, W, H, W * 0.5 + rad * Math.cos(ang), H * 0.5 + rad * Math.sin(ang), R, w, pFar, kind, 1);
        }
      }
    }
    if (s.noise > 0 && s.init !== 'noise') {
      for (let i = 0; i < N; i++) {
        nx[i] += (rng() - 0.5) * 2 * s.noise;
        ny[i] += (rng() - 0.5) * 2 * s.noise;
        nz[i] += (rng() - 0.5) * 2 * s.noise;
      }
    }
    normalizeAll(nx, ny, nz, N);
    return { nx, ny, nz };
  }

  function wrapIdx(x, y, W, H, wrap) {
    if (wrap === 'periodic') return ((y + H) % H) * W + ((x + W) % W);
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    return y * W + x;
  }

  function triple(a, b, c) {
    const rho = 1 + a[0]*b[0]+a[1]*b[1]+a[2]*b[2] + b[0]*c[0]+b[1]*c[1]+b[2]*c[2] + c[0]*a[0]+c[1]*a[1]+c[2]*a[2];
    const chi = a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]);
    return 2 * Math.atan2(chi, rho);
  }

  function spinAt(nx, ny, nz, x, y, W, H, wrap) {
    const i = wrapIdx(x, y, W, H, wrap);
    if (i < 0) {
      const xx = Math.max(0, Math.min(W - 1, x)), yy = Math.max(0, Math.min(H - 1, y));
      const j = yy * W + xx;
      return [nx[j], ny[j], nz[j]];
    }
    return [nx[i], ny[i], nz[i]];
  }

  function bergLuscher(nx, ny, nz, W, H, wrap) {
    let Q = 0;
    const xMax = wrap === 'periodic' ? W : W - 1;
    const yMax = wrap === 'periodic' ? H : H - 1;
    for (let y = 0; y < yMax; y++) {
      for (let x = 0; x < xMax; x++) {
        const n00 = spinAt(nx, ny, nz, x, y, W, H, wrap);
        const n10 = spinAt(nx, ny, nz, x + 1, y, W, H, wrap);
        const n01 = spinAt(nx, ny, nz, x, y + 1, W, H, wrap);
        const n11 = spinAt(nx, ny, nz, x + 1, y + 1, W, H, wrap);
        Q += triple(n00, n10, n11) + triple(n00, n11, n01);
      }
    }
    return Q / (4 * Math.PI);
  }

  function qDensity(nx, ny, nz, W, H, wrap, out) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n00 = spinAt(nx, ny, nz, x, y, W, H, wrap);
        const n10 = spinAt(nx, ny, nz, x + 1, y, W, H, wrap);
        const n01 = spinAt(nx, ny, nz, x, y + 1, W, H, wrap);
        const n11 = spinAt(nx, ny, nz, x + 1, y + 1, W, H, wrap);
        out[y * W + x] = (triple(n00, n10, n11) + triple(n00, n11, n01)) / (4 * Math.PI);
      }
    }
  }

  Studio.register({
    id: 'skyrmion',
    name: 'Magnetic Skyrmions',
    tab: 'Skyrmions',
    subtitle: 'chiral magnets · 1989',
    order: 36.2,
    equation: 'dn/dt = -n x (n x H),   H = J sum_nn n_j + H_DMI + 2K n_z zhat + B zhat,   Q = (1/4pi) int n · (dx n x dy n) dA',
    credit: 'A. N. Bogdanov and D. A. Yablonskii, Sov. Phys. JETP 68, 101 (1989), predicted localized chiral solitons in magnets with Dzyaloshinskii-Moriya coupling. S. Muhlbauer, B. Binz, F. Jonietz, C. Pfleiderer, A. Rosch, A. Neubauer, R. Georgii and P. Boni, Science 323, 915 (2009), observed the skyrmion lattice in MnSi. The topological charge on the plate is the Berg-Luscher lattice invariant, Berg and Luscher, Nucl. Phys. B 190, 412 (1981).',
    blurb: 'A skyrmion is a knot in a magnetization field that cannot be combed out. Neighboring spins want to agree (exchange), a chiral interaction twists them (Dzyaloshinskii-Moriya), easy-axis anisotropy and a field pick a background direction, and the compromise is a small core of reversed magnetization wrapped by a swirling wall. The wrapping has a topological charge Q that the plate measures from the spins themselves, not from a label. Q stays near an integer while the core lives, and drops toward zero if the field pulls the knot apart. Click the plate to shove a neighborhood of spins and watch whether a new core nucleates or an old one dies.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Seeding'],
    hints: {
      Magnetism: 'J sets the stiffness of the wall. D against J sets the preferred twist; around 0.3 to 0.5 a single skyrmion is happy on this lattice. K > 0 is easy-axis, which helps a ferro background. B is the external field along z. Too much B erases the core; too little and the plate prefers a spiral.',
      Dynamics: 'The integrator is overdamped Landau-Lifshitz: each spin slides down the energy in its tangent plane and is renormalized. The step is clamped against the linear stiffness so the field cannot fill with a grid-scale checkerboard.',
      Seeding: 'Skyrmion drops one textbook core on a ferro sheet. Lattice tiles several on a staggered grid. Bimeron is two merons in an in-plane background. Helix is the competing spiral. Quench is a hot start and lets topology appear on its own.',
      Picture: 'Spin colors the in-plane angle and lights n_z. n_z is the textbook out-of-plane map. Topological density is the Berg-Luscher weight per plaquette, so a living core is a bright lump whose integral is Q. Energy lights the wall.',
    },
    palette: true,
    defaultPalette: 'harbor',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, N = 0;
      let nx, ny, nz, hx, hy, hz, scratch;
      let step = 0, Q = 0, E = 0, raf = 0, paused = false;
      let buf, img, lastKey = '';

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(32, Math.round(g * aspect)) };
      }

      function rebuild() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H; N = W * H;
        const field = seedField(s, W, H);
        nx = field.nx; ny = field.ny; nz = field.nz;
        hx = new Float32Array(N); hy = new Float32Array(N); hz = new Float32Array(N);
        scratch = new Float32Array(N);
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
        step = 0;
        const quiet = host.reducedMotion();
        const warm = quiet ? Math.min(s.warmup, 80) : s.warmup;
        for (let i = 0; i < warm; i++) relax(s, 1);
        measure(s);
        paint(s);
        status(s);
      }

      function fields(s) {
        const J = s.J, D = s.D, K = s.K, B = s.B, wrap = s.wrap, bloch = s.dmi === 'bloch';
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const e = wrapIdx(x + 1, y, W, H, wrap);
            const wgt = wrapIdx(x - 1, y, W, H, wrap);
            const nrt = wrapIdx(x, y + 1, W, H, wrap);
            const sth = wrapIdx(x, y - 1, W, H, wrap);
            const take = (j, arr, fb) => (j < 0 ? fb : arr[j]);
            const ex = take(e, nx, nx[i]) + take(wgt, nx, nx[i]) + take(nrt, nx, nx[i]) + take(sth, nx, nx[i]);
            const ey = take(e, ny, ny[i]) + take(wgt, ny, ny[i]) + take(nrt, ny, ny[i]) + take(sth, ny, ny[i]);
            const ez = take(e, nz, nz[i]) + take(wgt, nz, nz[i]) + take(nrt, nz, nz[i]) + take(sth, nz, nz[i]);
            const nzE = take(e, nz, nz[i]), nzW = take(wgt, nz, nz[i]);
            const nzN = take(nrt, nz, nz[i]), nzS = take(sth, nz, nz[i]);
            const nxE = take(e, nx, nx[i]), nxW = take(wgt, nx, nx[i]);
            const nyN = take(nrt, ny, ny[i]), nyS = take(sth, ny, ny[i]);
            const nyE = take(e, ny, ny[i]), nyW = take(wgt, ny, ny[i]);
            const nxN = take(nrt, nx, nx[i]), nxS = take(sth, nx, nx[i]);
            let dx, dy, dz;
            if (bloch) {
              dx = 0.5 * D * (nzN - nzS);
              dy = 0.5 * D * -(nzE - nzW);
              dz = 0.5 * D * ((nyE - nyW) - (nxN - nxS));
            } else {
              dx = 0.5 * D * (nzE - nzW);
              dy = 0.5 * D * (nzN - nzS);
              dz = -0.5 * D * ((nxE - nxW) + (nyN - nyS));
            }
            hx[i] = J * ex + dx;
            hy[i] = J * ey + dy;
            hz[i] = J * ez + dz + 2 * K * nz[i] + B;
          }
        }
      }

      function relax(s, nsteps) {
        const damp = s.damp, dt = s.dt;
        for (let sstep = 0; sstep < nsteps; sstep++) {
          fields(s);
          for (let i = 0; i < N; i++) {
            const mx = nx[i], my = ny[i], mz = nz[i];
            const Hx = hx[i], Hy = hy[i], Hz = hz[i];
            const mH = mx * Hx + my * Hy + mz * Hz;
            let ox = mx + dt * damp * (Hx - mH * mx);
            let oy = my + dt * damp * (Hy - mH * my);
            let oz = mz + dt * damp * (Hz - mH * mz);
            const L = Math.hypot(ox, oy, oz) || 1;
            nx[i] = ox / L; ny[i] = oy / L; nz[i] = oz / L;
          }
          step++;
        }
      }

      function measure(s) {
        Q = bergLuscher(nx, ny, nz, W, H, s.wrap);
        fields(s);
        let e = 0;
        for (let i = 0; i < N; i++) e -= nx[i] * hx[i] + ny[i] * hy[i] + nz[i] * hz[i];
        E = e / N;
      }

      function paint(s) {
        if (!nx) return;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1A1A1A', '#F25C05', '#FFF3D6'];
        const view = s.view, ramp = U.makeRamp(pal, s.bg || '#121110'), data = img.data, exp = s.exposure;
        if (view === 'qdens') qDensity(nx, ny, nz, W, H, s.wrap, scratch);
        else if (view === 'energy') {
          fields(s);
          for (let i = 0; i < N; i++) scratch[i] = -(nx[i] * hx[i] + ny[i] * hy[i] + nz[i] * hz[i]);
        }
        let lo = Infinity, hi = -Infinity;
        if (view === 'energy' || view === 'qdens') {
          for (let i = 0; i < N; i++) {
            const v = scratch[i];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          if (!(hi > lo)) { lo = 0; hi = 1; }
        }
        for (let i = 0; i < N; i++) {
          let r, g, b;
          if (view === 'nz') {
            const c = ramp(U.clamp(0.5 + 0.5 * nz[i] * exp, 0, 1));
            r = c[0]; g = c[1]; b = c[2];
          } else if (view === 'qdens' || view === 'energy') {
            const c = ramp(U.clamp(((scratch[i] - lo) / (hi - lo)) * exp, 0, 1));
            r = c[0]; g = c[1]; b = c[2];
          } else {
            const ang = (Math.atan2(ny[i], nx[i]) + Math.PI) / (Math.PI * 2);
            const c = ramp(ang);
            const lit = U.clamp(0.35 + 0.65 * (0.5 + 0.5 * nz[i]) * exp, 0, 1);
            r = c[0] * lit; g = c[1] * lit; b = c[2] * lit;
          }
          const o = i * 4;
          data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
        }
        if (s.cores) {
          qDensity(nx, ny, nz, W, H, s.wrap, scratch);
          const ink = U.hexToRgb(U.inkFor(s.bg));
          for (let i = 0; i < N; i++) if (Math.abs(scratch[i]) > 0.04) {
            const o = i * 4; data[o] = ink[0]; data[o + 1] = ink[1]; data[o + 2] = ink[2];
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status(s) {
        // The reference is the charge of the seeded texture, not a prediction for the relaxed state. On a
        // periodic lattice the Berg-Luscher total is an exact integer, so only float round-off is removed.
        const integral = s.wrap === 'periodic' && Math.abs(Q - Math.round(Q)) < 1e-6;
        const q = integral ? Math.round(Q) : Q;
        const expect = (s.init === 'ferro' || s.init === 'spiral') ? '0'
          : (s.init === 'lattice' ? '~' + s.count
          : (s.init === 'bimeron' ? '~0' : (s.init === 'noise' ? 'integer' : '±1')));
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          U.stats.compare({ label: 'Q', measured: q, expected: expect, reference: 'seeded texture', basis: integral ? 'exact' : 'deterministic', digits: 3 }) +
          '<span>E/site <b>' + f3(E) + '</b></span>' +
          '<span>step <b>' + step.toLocaleString() + '</b></span>'
        );
      }

      function loop() {
        raf = 0;
        if (paused || !host.isActive()) return;
        const s = host.getState();
        if (!s.running) { paint(s); return; }
        const t0 = performance.now();
        let n = 0;
        while (performance.now() - t0 < 22 && n < 8) { relax(s, 1); n++; }
        if ((step & 7) === 0) measure(s);
        paint(s); status(s);
        raf = requestAnimationFrame(loop);
      }

      function startLoop() {
        if (raf || paused) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        raf = requestAnimationFrame(loop);
      }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() {
          const s = host.getState();
          const key = [s.seed, s.grid, s.aspect, s.wrap, s.init, s.radius, s.width, s.count, s.polarity, s.dmi, s.noise, s.warmup].join('|');
          if (key !== lastKey || !nx) { lastKey = key; stopLoop(); rebuild(); }
          else { paint(s); status(s); }
          startLoop();
        },
        repaint() { const s = host.getState(); paint(s); status(s); },
        live(key) {
          const s = host.getState();
          if (key === 'running') { if (s.running) startLoop(); else stopLoop(); }
        },
        resize() { const s = host.getState(); if (nx) paint(s); },
        pause() { paused = true; stopLoop(); },
        resume() {
          paused = false;
          const s = host.getState();
          if (nx) { paint(s); status(s); }
          startLoop();
        },
        disturb(p) {
          if (!nx) return;
          const s = host.getState();
          const cx = p.x * (W - 1), cy = p.y * (H - 1);
          const rad = Math.max(4, s.radius * 0.45);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d > rad * 2) continue;
            const a = Math.exp(-(d * d) / (rad * rad));
            const i = y * W + x;
            nz[i] -= a * 1.4;
            nx[i] += a * (x - cx) * 0.08;
            ny[i] += a * (y - cy) * 0.08;
          }
          normalizeAll(nx, ny, nz, N);
          measure(s); paint(s); status(s);
        },
        async exportPNG(w, h) {
          if (!nx) throw new Error('nothing to export');
          if (w > 30000 || h > 30000) throw new Error('print size too large for this lattice');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const cctx = c.getContext('2d', { alpha: false });
          cctx.imageSmoothingEnabled = false;
          cctx.fillStyle = s.bg;
          cctx.fillRect(0, 0, w, h);
          cctx.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
