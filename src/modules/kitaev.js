/* modules/kitaev.js */
/* GENChase: Kitaev chain. Majorana zero modes bound to the ends. The Bogoliubov-de Gennes matrix is diagonalized exactly; end weight and splitting are measured from its quasiparticle modes. */
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
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Chain', 'mu', 'Chemical μ', GEOM, -2.4, 2.4, 0.05, f2, { hint: '|μ| < 2t is the topological phase: unpaired Majoranas live on the ends.' }),
    RANGE('Chain', 'tHop', 'Hopping t', GEOM, 0.4, 1.6, 0.05, f2),
    RANGE('Chain', 'delta', 'Pairing Δ', GEOM, 0.05, 1.4, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '4:5', mu: 0.4, tHop: 1, delta: 0.8, view: 'int', exposure: 1.05 };
  const PRESETS = {
    majorana: pre('Majorana ends', { mu: 0.3, tHop: 1, delta: 0.85 }, Pal.ember),
    triv: pre('Trivial', { mu: 2.2, tHop: 1, delta: 0.6 }, Pal.graphite),
    deep: pre('Deep topo', { mu: 0.1, delta: 1.1 }, Pal.nightshade),
    crit: pre('Near critical', { mu: 1.85, tHop: 1, delta: 0.7 }, Pal.kiln),
    log: pre('Log |ψ|', { view: 'log', mu: 0.25, delta: 0.9 }, Pal.thermal),
    weak: pre('Weak pairing', { delta: 0.2, mu: 0.4 }, Pal.harbor),
  };

  function surprise(rng) { return { mu: rng.range(-1.6, 2.2), delta: rng.range(0.2, 1.1), tHop: rng.range(0.7, 1.3) }; }
  function sanitize(s) { s.grid = Math.max(64, Math.min(160, Math.round(s.grid / 16) * 16)); }

  /* ---- exact diagonalization ----
     Householder tridiagonalization (tred2) and implicit QL with shifts (tql2), after the EISPACK routines
     of the same names (Wilkinson and Reinsch, Handbook for Automatic Computation II, 1971). Only + - * /
     and sqrt, which IEEE 754 rounds exactly, so every JavaScript engine produces the same bits. Both are
     generators that yield between outer iterations, so the tab can spread a long chain over several
     frames; the arithmetic does not depend on where it pauses. */
  const EPS = 2.220446049250313e-16;
  function pyth(a, b) {
    const x = Math.abs(a), y = Math.abs(b);
    if (x > y) { const r = y / x; return x * Math.sqrt(1 + r * r); }
    if (y === 0) return 0;
    const r = x / y; return y * Math.sqrt(1 + r * r);
  }
  // Dense symmetric A (row-major n*n, overwritten) -> tridiagonal d, e (e[i] = T[i][i+1]) and the
  // orthogonal basis Z with basis vectors as rows.
  function* tred2(A, n) {
    const V = A, d = new Float64Array(n), e = new Float64Array(n);
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
          for (let k = j; k <= i - 1; k++) V[k * n + j] -= (f * e[k] + g * d[k]);
          d[j] = V[(i - 1) * n + j]; V[i * n + j] = 0;
        }
      }
      d[i] = h;
      yield;
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
      yield;
    }
    for (let j = 0; j < n; j++) { d[j] = V[(n - 1) * n + j]; V[(n - 1) * n + j] = 0; }
    V[(n - 1) * n + n - 1] = 1;
    for (let i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    const Z = new Float64Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) Z[c * n + r] = V[r * n + c];
    return { d, e, Z };
  }
  // Symmetric tridiagonal (d, e) in the basis Z -> eigenvalues ascending in d, unit eigenvectors as rows of Z.
  function* tql2(d, e, Z, n) {
    let f = 0, tst1 = 0;
    for (let l = 0; l < n; l++) {
      tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
      let m = l;
      while (m < n - 1 && Math.abs(e[m]) > EPS * tst1) m++;
      if (m > l) {
        let iter = 0;
        do {
          if (++iter > 60) throw new Error('QL iteration did not converge');
          let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = pyth(p, 1);
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
            g = c * e[i]; h = c * p; r = pyth(p, e[i]);
            e[i + 1] = s * r; s = e[i] / r; c = p / r;
            p = c * d[i] - s * g;
            d[i + 1] = h + s * (c * g + s * d[i]);
            const a = i * n, b = (i + 1) * n;
            for (let k = 0; k < n; k++) { h = Z[b + k]; Z[b + k] = s * Z[a + k] + c * h; Z[a + k] = c * Z[a + k] - s * h; }
          }
          p = -s * s2 * c3 * el1 * e[l] / dl1;
          e[l] = s * p; d[l] = c * p;
          yield;
        } while (Math.abs(e[l]) > EPS * tst1);
      }
      d[l] += f; e[l] = 0;
    }
    for (let i = 0; i < n - 1; i++) {
      let k = i, p = d[i];
      for (let j = i + 1; j < n; j++) if (d[j] < p) { k = j; p = d[j]; }
      if (k !== i) {
        d[k] = d[i]; d[i] = p;
        const a = i * n, b = k * n;
        for (let j = 0; j < n; j++) { const t = Z[a + j]; Z[a + j] = Z[b + j]; Z[b + j] = t; }
      }
    }
    return { values: d, vectors: Z };
  }

  // Bogoliubov-de Gennes matrix of the chain of N sites, in the Nambu basis (c_0 .. c_{N-1}, c†_0 .. c†_{N-1}):
  //   H_BdG = [[h, D], [-D, -h]],  h_jj = -μ,  h_{j,j+1} = h_{j+1,j} = -t,  D_{j,j+1} = -Δ,  D_{j+1,j} = +Δ,
  // so that H = ½ Ψ† H_BdG Ψ + const is the tab's Hamiltonian. Real symmetric, 2N × 2N. bc 'periodic' adds
  // the bond from site N-1 to site 0 with the bulk sign (k = 2πm/N), 'antiperiodic' with the opposite sign
  // (k = 2π(m+½)/N). The tab draws the open chain; the rings are the band-structure check.
  function bdgMatrix(N, mu, t, D, bc) {
    const n = 2 * N, A = new Float64Array(n * n);
    for (let j = 0; j < N; j++) { A[j * n + j] = -mu; A[(N + j) * n + N + j] = mu; }
    const bond = (j, k, sg) => {
      A[j * n + k] += -t * sg; A[k * n + j] += -t * sg;
      A[(N + j) * n + N + k] += t * sg; A[(N + k) * n + N + j] += t * sg;
      A[j * n + N + k] += -D * sg; A[(N + k) * n + j] += -D * sg;
      A[k * n + N + j] += D * sg; A[(N + j) * n + k] += D * sg;
    };
    for (let j = 0; j < N - 1; j++) bond(j, j + 1, 1);
    if (bc === 'periodic') bond(N - 1, 0, 1);
    else if (bc === 'antiperiodic') bond(N - 1, 0, -1);
    return A;
  }
  function* solveChain(N, mu, t, D, bc) {
    const n = 2 * N, T = yield* tred2(bdgMatrix(N, mu, t, D, bc), n);
    return yield* tql2(T.d, T.e, T.Z, n);
  }

  // One row per +/- pair of quasiparticle modes, ordered by |E|. Particle-hole symmetry maps (u, v) at E
  // to (v, u) at -E, so a pair has one density |u|² + |v|² and each positive level is drawn once. Levels
  // that agree to within 1e-9 of the bandwidth are treated as one degenerate level, so that the picture
  // depends on the Hamiltonian alone, not on rounding inside the solver: a level straddling zero (a
  // Majorana pair whose splitting double precision cannot resolve) is drawn as its mean density, which no
  // choice of basis inside it can change, and any other degenerate level is rotated to a canonical basis,
  // Gram-Schmidt on the level's projector applied to the basis states in order.
  function pairModes(values, vectors, n, sites, density) {
    const Z = vectors, Emax = Math.abs(values[n - 1]) || 1, tol = 1e-9 * Emax, pairs = [];
    for (let i = 0; i < n;) {
      let j = i + 1;
      while (j < n && values[j] - values[j - 1] <= tol) j++;
      if (values[i] <= tol && values[j - 1] >= -tol) {
        const d = new Float64Array(sites);
        let e = 0;
        for (let a = i; a < j; a++) { const da = density(Z, n, a); for (let x = 0; x < sites; x++) d[x] += da[x] / (j - i); e += Math.abs(values[a]) / (j - i); }
        pairs.push({ E: e, dens: d });
      } else if (values[i] > tol) {
        if (j - i > 1) canonical(Z, n, i, j);
        for (let a = i; a < j; a++) pairs.push({ E: values[a], dens: density(Z, n, a) });
      }
      i = j;
    }
    return pairs;
  }
  function canonical(Z, n, from, to) {
    const m = to - from, out = [];
    for (let s = 0; s < n && out.length < m; s++) {
      const q = new Float64Array(n);
      for (let a = from; a < to; a++) { const c = Z[a * n + s]; if (c !== 0) for (let k = 0; k < n; k++) q[k] += c * Z[a * n + k]; }
      for (let pass = 0; pass < 2; pass++) for (const o of out) { let dot = 0; for (let k = 0; k < n; k++) dot += o[k] * q[k]; for (let k = 0; k < n; k++) q[k] -= dot * o[k]; }
      let nr = 0; for (let k = 0; k < n; k++) nr += q[k] * q[k];
      if (nr > 1e-12) { const inv = 1 / Math.sqrt(nr); for (let k = 0; k < n; k++) q[k] *= inv; out.push(q); }
    }
    for (let a = 0; a < out.length; a++) Z.set(out[a], (from + a) * n);
  }
  const siteDensity = (Z, n, j) => {
    const N = n / 2, o = new Float64Array(N);
    for (let x = 0; x < N; x++) { const u = Z[j * n + x], v = Z[j * n + N + x]; o[x] = u * u + v * v; }
    return o;
  };
  // Fraction of a density on the outer tenth of the sites at each end.
  function endWeight(dens) {
    const n = dens.length, c = Math.max(1, Math.floor(n / 10));
    let end = 0, tot = 0;
    for (let x = 0; x < n; x++) { tot += dens[x]; if (x < c || x >= n - c) end += dens[x]; }
    return end / (tot || 1);
  }
  // The zero modes of the semi-infinite chain in closed form. The left Majorana lives on one Majorana
  // sublattice with amplitude φ_j = (x₊^(j+1) − x₋^(j+1)) / (x₊ − x₋), where x± are the roots of
  // (t + Δ) x² + μ x + (t − Δ) = 0; it is normalizable, and the phase topological, when both |x±| < 1,
  // which is |μ| < 2|t| for Δ ≠ 0. The right Majorana is its mirror. ξ = −1/ln max|x±| is the
  // localization length in sites, and the splitting of a finite chain decays as max|x±|^N, times
  // |sin((N+1)θ)| when the roots are complex, x± = |x| e^(±iθ).
  function majorana(N, mu, t, D) {
    const a = t + D, b = mu, c = t - D, disc = b * b - 4 * a * c;
    let xmax, phi = new Float64Array(N);
    if (disc >= 0) {
      const s = Math.sqrt(disc), x1 = (-b + s) / (2 * a), x2 = (-b - s) / (2 * a);
      xmax = Math.max(Math.abs(x1), Math.abs(x2));
      let p1 = x1, p2 = x2, pd = 1;
      for (let j = 0; j < N; j++) {
        phi[j] = Math.abs(x1 - x2) > 1e-12 * xmax ? (p1 - p2) / (x1 - x2) : (j + 1) * pd;
        pd = p1; p1 *= x1; p2 *= x2;
      }
    } else {
      const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * a), th = Math.atan2(im, re);
      xmax = Math.sqrt(re * re + im * im);
      let r = xmax;
      for (let j = 0; j < N; j++) { phi[j] = r * Math.sin((j + 1) * th); r *= xmax; }
    }
    const topo = xmax < 1 && D !== 0;
    let end = null;
    if (topo) {
      const cut = Math.max(1, Math.floor(N / 10));
      let e = 0, tot = 0;
      for (let j = 0; j < N; j++) { const p = phi[j] * phi[j]; tot += p; if (j < cut || j >= N - cut) e += p; }
      end = e / tot;
    }
    return { topo, xmax, xi: xmax > 0 && xmax < 1 ? -1 / Math.log(xmax) : Infinity, endWeight: end };
  }
  function analyse(res, N, mu, t, D) {
    const n = 2 * N, pairs = pairModes(res.values, res.vectors, n, N, siteDensity);
    const split = res.values[N] - res.values[N - 1], Emax = Math.abs(res.values[n - 1]);
    return {
      pairs, Emax, split, E1: pairs.length > 1 ? pairs[1].E : Emax,
      endW: endWeight(pairs[0].dens), floor: 2 * n * EPS * Emax, zero: majorana(N, mu, t, D),
    };
  }
  // Rows run down a linear |E| axis from zero at the top to the band top at the bottom; each row shows
  // the pair whose |E| is nearest, so the gap appears as a band of whatever sits in it. A pair has to be
  // nearer by more than rounding to displace an earlier one, so a degenerate level always shows its first
  // canonical mode.
  function fill(field, W, H, pairs, Emax) {
    const tol = 1e-9 * Emax;
    for (let y = 0; y < H; y++) {
      const eps = (y + 0.5) / H * Emax;
      let best = 0, bd = Infinity;
      for (let j = 0; j < pairs.length; j++) { const dd = Math.abs(pairs[j].E - eps); if (dd < bd - tol) { bd = dd; best = j; } }
      field.set(pairs[best].dens, y * W);
    }
  }

  Studio.register({
    id: 'kitaev', name: 'Kitaev Chain', tab: 'Kitaev',
    subtitle: 'a fermion that is its own antiparticle, stuck to the ends · 2001',
    order: 93,
    equation: 'H = −μ Σ c†c − t Σ (c†_i c_{i+1}+h.c.) + Δ Σ (c_i c_{i+1}+h.c.),   |μ|<2t ⇒ unpaired γ_L, γ_R',
    credit: 'A. Yu. Kitaev, Phys.-Usp. 44, 131 (2001). A 1D p-wave superconductor hosts two Majorana operators, one at each end, that together make a single nonlocal fermion. They sit at zero energy, inside the gap, and are their own antiparticles. The plate is computed: the 2N × 2N Bogoliubov-de Gennes matrix of an open chain of N sites, one per column, is diagonalized exactly in double precision (Householder reduction and implicit QL, after Wilkinson and Reinsch, 1971), and each row is |u(x)|² + |v(x)|² of one ± pair of quasiparticle modes, scaled to its own peak, on a linear |E| axis from zero at the top.',
    blurb: 'A particle that is its own antiparticle was a curiosity of Dirac\'s algebra until Kitaev put two of them on the ends of a wire, where they cannot pair up. They are Majorana zero modes: half a fermion each, nonlocal, and the reason a topological qubit might exist. Close the chemical potential past 2t and they dissolve into the bulk. Every row is a quasiparticle mode of the chain, found by diagonalizing it; rows run from zero energy at the top to the band top at the bottom, so the superconducting gap shows as a band of whatever lives in it. The status line reports the weight of the mid-gap pair on the outer tenth of the sites at each end and the energy splitting of the pair.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: '|μ| < 2t and Δ ≠ 0 is the topological phase. The trivial side is the control: the same Hamiltonian, no end states.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field = null, buf = null, img = null, info = null;
      let timer = 0, job = 0, busy = false, waiters = [];
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        clearTimeout(timer);
        const s = host.getState(), my = ++job;
        const sz = sizeFrom(s), N = sz.W;
        const it = solveChain(N, s.mu, s.tHop, s.delta, 'open');
        busy = true;
        host.setStatus('<span>computing ' + (2 * N) + ' quasiparticle modes</span>');
        const slice = () => {
          if (my !== job) return;
          const t0 = performance.now(), budget = host.computeBudget ? host.computeBudget().cpuSliceMs : 12;
          let r;
          do r = it.next(); while (!r.done && performance.now() - t0 < budget);
          if (!r.done) { timer = setTimeout(slice, 0); return; }
          W = sz.W; H = sz.H;
          info = analyse(r.value, N, s.mu, s.tHop, s.delta);
          field = new Float32Array(W * H);
          fill(field, W, H, info.pairs, info.Emax);
          buf = document.createElement('canvas'); buf.width = W; buf.height = H;
          img = buf.getContext('2d').createImageData(W, H);
          busy = false;
          paint(); status();
          const ws = waiters; waiters = []; ws.forEach(f => f());
        };
        slice();
      }

      function paint() {
        if (!field || busy) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        // Each row is one mode scaled to its own peak: an edge mode piles its weight on a few sites, and on
        // a shared scale it would leave every bulk mode near black.
        const logv = s.view === 'log', rowHi = new Float64Array(H);
        for (let i = 0; i < field.length; i++) { const y = (i / W) | 0; if (field[i] > rowHi[y]) rowHi[y] = field[i]; }
        for (let i = 0; i < field.length; i++) {
          let t = field[i] / (rowHi[(i / W) | 0] || 1);
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

      // Both numbers are read off the computed quasiparticle modes, so they are deterministic. The end
      // weight is set beside the closed-form Majorana of the semi-infinite chain (they differ by
      // hybridization of order max|x±|^N). The splitting has no closed form here; ξ gives the rate at
      // which it decays with N. Double precision cannot resolve a splitting below about 2nε‖H‖.
      function status() {
        if (!info || busy) return;
        const s = host.getState(), ratio = Math.abs(s.mu) / (2 * s.tHop), z = info.zero;
        const resolved = info.split >= info.floor;
        let word;
        if (z.topo) word = (info.split < 0.1 * info.E1 ? 'Majorana ends' : 'topo, finite-size') + ' · ξ ' + f2(z.xi) + ' sites';
        else word = ratio > 1 ? 'trivial' : 'critical';
        host.setStatus('<span>|μ|/2t <b>' + f2(ratio) + '</b> · topo < 1</span>' +
          U.stats.compare({ label: 'end weight', measured: info.endW, expected: z.endWeight === null ? undefined : z.endWeight, reference: 'Majorana closed form', basis: 'deterministic', digits: 3 }) +
          U.stats.compare({ label: '2|E₀|', measured: info.split, basis: 'deterministic', digits: 3,
            note: resolved ? undefined : 'below the ' + info.floor.toExponential(0) + ' floor of double precision' }) +
          '<span>' + word + '</span>');
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (busy) await new Promise(r => waiters.push(r));
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
