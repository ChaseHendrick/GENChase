// Harper spectrum, TKNN gap integers, and Fukui-Hatsugai-Suzuki Chern numbers.
//
//   node tools/hofstadter-science.js [--write]
//
// The plate's harperEV / jacobiEV / Chern loop are loaded from the module and are not
// reimplemented here. The benchmark is an independent Hermitian diagonalization of the
// magnetic Bloch Hamiltonian, the Diophantine equation of Thouless, Kohmoto, Nightingale
// and den Nijs (Phys. Rev. Lett. 49, 405, 1982), and the lattice Chern number of Fukui,
// Hatsugai and Suzuki (J. Phys. Soc. Jpn. 74, 1674, 2005).
//
// This is not a laboratory quantum Hall measurement.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const sourcePath = 'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js';
const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

const fnStart = source.indexOf('  function gcd(a,b)');
const fnEnd = source.indexOf("  Studio.register({\n    id: 'hofstadter'");
if (fnStart < 0 || fnEnd < fnStart) throw Error('Hofstadter helpers not found in the module');
const sandbox = { TAU: 2 * Math.PI, Float64Array, Math };
vm.createContext(sandbox);
vm.runInContext(source.slice(fnStart, fnEnd) + '\nthis.harperEV = harperEV;\nthis.jacobiEV = jacobiEV;\n', sandbox);
const { harperEV, jacobiEV } = sandbox;

const matrixAt = source.indexOf('const n = q, A = new Float64Array(n*n);');
const matrixEnd = source.indexOf('return jacobiEV(A, n);', matrixAt);
if (matrixAt < 0 || matrixEnd < 0) throw Error('Harper matrix fill not found');
const moduleMatrix = new Function('p', 'q', 'TAU', 'Float64Array', 'Math',
  source.slice(matrixAt, matrixEnd) + '\nreturn A;');

const colorAt = source.indexOf('// Chern of gap above band r: r ≡ p C (mod q), smallest |C|');
const colorEnd = source.indexOf('chern[iy*W+ix] += C;', colorAt);
if (colorAt < 0 || colorEnd < 0) throw Error('Chern coloring loop not found');
const plateC = new Function('p', 'q', 'r', source.slice(colorAt, colorEnd) + '\nreturn C;');

function mod(a, q) { return ((a % q) + q) % q; }
function gcd(a, b) { a = Math.abs(a) | 0; b = Math.abs(b) | 0; while (b) { const t = a % b; a = b; b = t; } return a; }
function coprimePairs(qMax) {
  const out = [];
  for (let q = 1; q <= qMax; q++) for (let p = 0; p <= q; p++) if (gcd(p, q) === 1) out.push([p, q]);
  return out;
}

// TKNN: r = q s + p t, |t| <= q/2, smallest |t|, negative on a tie. r is the number of bands below the gap.
function tknn(p, q, r) {
  let best = null;
  const lim = q / 2;
  for (let t = -Math.floor(lim); t <= Math.floor(lim); t++) {
    if (Math.abs(t) > lim) continue;
    if (mod(r - p * t, q) !== 0) continue;
    if (best === null || Math.abs(t) < Math.abs(best) || (Math.abs(t) === Math.abs(best) && t < best)) best = t;
  }
  if (best === null) throw Error('No TKNN integer for r=' + r + ' at ' + p + '/' + q);
  return best;
}
function satisfies(r, p, q, t) {
  return Number.isInteger(t) && Math.abs(t) <= q / 2 + 1e-12 && mod(r - p * t, q) === 0;
}

// Real symmetric Jacobi, run to convergence. Benchmark for the plate's capped jacobiEV.
function convergedJacobi(A, n) {
  const M = Float64Array.from(A);
  let sweeps = 0, mx = Infinity;
  for (; sweeps < 80; sweeps++) {
    mx = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const apq = M[i * n + j];
      const mag = Math.abs(apq);
      if (mag > mx) mx = mag;
      if (mag < 1e-15) continue;
      const app = M[i * n + i], aqq = M[j * n + j];
      const tau = (aqq - app) / (2 * apq);
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      M[i * n + i] = c * c * app - 2 * s * c * apq + s * s * aqq;
      M[j * n + j] = s * s * app + 2 * s * c * apq + c * c * aqq;
      M[i * n + j] = M[j * n + i] = 0;
      for (let k = 0; k < n; k++) if (k !== i && k !== j) {
        const aik = M[i * n + k], ajk = M[j * n + k];
        M[i * n + k] = M[k * n + i] = c * aik - s * ajk;
        M[j * n + k] = M[k * n + j] = s * aik + c * ajk;
      }
    }
    if (mx < 1e-14) break;
  }
  const ev = Array.from({ length: n }, (_, i) => M[i * n + i]).sort((a, b) => a - b);
  return { ev, sweeps, off: mx };
}

// Hermitian Jacobi. Returns eigenvalues and orthonormal eigenvectors (columns).
function hermJacobi(re0, im0, n) {
  const re = Float64Array.from(re0), im = Float64Array.from(im0);
  const Vre = new Float64Array(n * n), Vim = new Float64Array(n * n);
  for (let i = 0; i < n; i++) Vre[i * n + i] = 1;
  let sweeps = 0, mx = Infinity;
  for (; sweeps < 64; sweeps++) {
    mx = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const rp = re[p * n + q], ip = im[p * n + q];
      const mag = Math.hypot(rp, ip);
      if (mag > mx) mx = mag;
      if (mag < 1e-15) continue;
      const app = re[p * n + p], aqq = re[q * n + q];
      const cφ = rp / mag, sφ = ip / mag;
      const tau = (aqq - app) / (2 * mag);
      const tt = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + tt * tt), s = tt * c;
      const sr = s * cφ, si = s * sφ;
      const msr = -sr, msi = si;
      const Cp = new Float64Array(2 * n), Cq = new Float64Array(2 * n);
      for (let k = 0; k < n; k++) {
        Cp[k] = re[k * n + p]; Cp[n + k] = im[k * n + p];
        Cq[k] = re[k * n + q]; Cq[n + k] = im[k * n + q];
      }
      for (let k = 0; k < n; k++) {
        const br = Cp[k], bi = Cp[n + k], ar = Cq[k], ai = Cq[n + k];
        re[k * n + p] = c * br + (ar * msr - ai * msi);
        im[k * n + p] = c * bi + (ar * msi + ai * msr);
        re[k * n + q] = (br * sr - bi * si) + c * ar;
        im[k * n + q] = (br * si + bi * sr) + c * ai;
      }
      const nsr = -sr, nsi = -si, esr = sr, esi = -si;
      const Rp = new Float64Array(2 * n), Rq = new Float64Array(2 * n);
      for (let k = 0; k < n; k++) {
        Rp[k] = re[p * n + k]; Rp[n + k] = im[p * n + k];
        Rq[k] = re[q * n + k]; Rq[n + k] = im[q * n + k];
      }
      for (let k = 0; k < n; k++) {
        const br = Rp[k], bi = Rp[n + k], ar = Rq[k], ai = Rq[n + k];
        re[p * n + k] = c * br + (ar * nsr - ai * nsi);
        im[p * n + k] = c * bi + (ar * nsi + ai * nsr);
        re[q * n + k] = (br * esr - bi * esi) + c * ar;
        im[q * n + k] = (br * esi + bi * esr) + c * ai;
      }
      im[p * n + p] = 0; im[q * n + q] = 0;
      re[p * n + q] = im[p * n + q] = re[q * n + p] = im[q * n + p] = 0;
      for (let k = 0; k < n; k++) {
        const vrP = Vre[k * n + p], viP = Vim[k * n + p], vrQ = Vre[k * n + q], viQ = Vim[k * n + q];
        Vre[k * n + p] = c * vrP + (vrQ * msr - viQ * msi);
        Vim[k * n + p] = c * viP + (vrQ * msi + viQ * msr);
        Vre[k * n + q] = (vrP * sr - viP * si) + c * vrQ;
        Vim[k * n + q] = (vrP * si + viP * sr) + c * viQ;
      }
    }
    if (mx < 1e-13) break;
  }
  const ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => re[a * n + a] - re[b * n + b] || a - b);
  const ev = new Float64Array(n), Sre = new Float64Array(n * n), Sim = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    ev[j] = re[ord[j] * n + ord[j]];
    for (let i = 0; i < n; i++) {
      Sre[i * n + j] = Vre[i * n + ord[j]];
      Sim[i * n + j] = Vim[i * n + ord[j]];
    }
  }
  return { ev, re: Sre, im: Sim, sweeps, off: mx };
}

// Square-lattice Harper operator at flux p/q.
// (H ψ)_j = ψ_{j+1} + ψ_{j-1} + 2 cos(φ + 2π p j / q) ψ_j,
// ψ_{n+q} = e^{-i θ} ψ_n, so the wrap adds e^{-i θ} on H_{q-1,0}.
// For q = 2 the two x-hoppings land on the same entry and add.
// phaseMode 'tknn' uses that sign (partial band Chern sums match TKNN).
// 'flipped' uses e^{+i θ}. 'dropped' leaves the wrap real and θ-independent.
function harper(p, q, theta, phi, phaseMode) {
  const n = q;
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  for (let j = 0; j < n; j++) re[j * n + j] = 2 * Math.cos(phi + 2 * Math.PI * p * j / q);
  if (n === 1) {
    const th = phaseMode === 'dropped' ? 0 : theta;
    re[0] = 2 * Math.cos(phi) + 2 * Math.cos(th);
    return hermJacobi(re, im, n);
  }
  for (let j = 0; j < n - 1; j++) {
    re[j * n + (j + 1)] = 1;
    re[(j + 1) * n + j] = 1;
  }
  let th = theta;
  if (phaseMode === 'flipped') th = -theta;
  if (phaseMode === 'dropped') th = 0;
  const er = Math.cos(-th), ei = Math.sin(-th);
  re[(n - 1) * n] += er; im[(n - 1) * n] += ei;
  re[n - 1] += er; im[n - 1] += -ei;
  return hermJacobi(re, im, n);
}

function residual(p, q, theta, phi, phaseMode, eig) {
  const n = q;
  const H = harper(p, q, theta, phi, phaseMode);
  // Rebuild H by one step of the same formula and apply it to eig's vectors.
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  for (let j = 0; j < n; j++) re[j * n + j] = 2 * Math.cos(phi + 2 * Math.PI * p * j / q);
  if (n === 1) {
    re[0] = 2 * Math.cos(phi) + 2 * Math.cos(phaseMode === 'dropped' ? 0 : theta);
  } else {
    for (let j = 0; j < n - 1; j++) { re[j * n + j + 1] = 1; re[(j + 1) * n + j] = 1; }
    let th = theta;
    if (phaseMode === 'flipped') th = -theta;
    if (phaseMode === 'dropped') th = 0;
    const er = Math.cos(-th), ei = Math.sin(-th);
    re[(n - 1) * n] += er; im[(n - 1) * n] += ei;
    re[n - 1] += er; im[n - 1] += -ei;
  }
  let maxR = 0, maxN = 0;
  for (let b = 0; b < n; b++) {
    let nr = 0, norm = 0;
    for (let i = 0; i < n; i++) {
      let rr = 0, ii = 0;
      for (let k = 0; k < n; k++) {
        const hr = re[i * n + k], hi = im[i * n + k];
        const vr = eig.re[k * n + b], vi = eig.im[k * n + b];
        rr += hr * vr - hi * vi;
        ii += hr * vi + hi * vr;
      }
      nr = Math.max(nr, Math.hypot(rr - eig.ev[b] * eig.re[i * n + b], ii - eig.ev[b] * eig.im[i * n + b]));
      const ur = eig.re[i * n + b], ui = eig.im[i * n + b];
      norm += ur * ur + ui * ui;
    }
    maxR = Math.max(maxR, nr);
    maxN = Math.max(maxN, Math.abs(norm - 1));
  }
  void H;
  return { residual: maxR, norm: maxN };
}

function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}
function mirrorErr(ev) {
  let m = 0;
  for (let i = 0; i < ev.length; i++) m = Math.max(m, Math.abs(ev[i] + ev[ev.length - 1 - i]));
  return m;
}

function fhs(p, q, N, phaseMode) {
  const n = q;
  const grid = [];
  for (let iy = 0; iy < N; iy++) {
    const row = [];
    const phi = 2 * Math.PI * iy / N;
    for (let ix = 0; ix < N; ix++) row.push(harper(p, q, 2 * Math.PI * ix / N, phi, phaseMode));
    grid.push(row);
  }
  const gaps = Array.from({ length: n - 1 }, () => Infinity);
  for (const row of grid) for (const e of row) for (let b = 0; b < n - 1; b++) gaps[b] = Math.min(gaps[b], e.ev[b + 1] - e.ev[b]);
  let minLink = Infinity;
  const overlap = (A, B, band) => {
    let rr = 0, ii = 0;
    for (let i = 0; i < n; i++) {
      const ar = A.re[i * n + band], ai = A.im[i * n + band];
      const br = B.re[i * n + band], bi = B.im[i * n + band];
      rr += ar * br + ai * bi;
      ii += ar * bi - ai * br;
    }
    return [rr, ii];
  };
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const chern = [];
  for (let b = 0; b < n; b++) {
    let sum = 0, bad = false;
    for (let iy = 0; iy < N && !bad; iy++) for (let ix = 0; ix < N; ix++) {
      const A = grid[iy][ix];
      const R = grid[iy][(ix + 1) % N];
      const U = grid[(iy + 1) % N][ix];
      const UR = grid[(iy + 1) % N][(ix + 1) % N];
      const raw = [overlap(A, R, b), overlap(R, UR, b), overlap(U, UR, b), overlap(A, U, b)];
      const Uu = [];
      for (const z of raw) {
        const m = Math.hypot(z[0], z[1]);
        if (m < minLink) minLink = m;
        if (!(m > 1e-12)) { bad = true; break; }
        Uu.push([z[0] / m, z[1] / m]);
      }
      if (bad) break;
      let z = mul(mul(Uu[0], Uu[1]), [Uu[2][0], -Uu[2][1]]);
      z = mul(z, [Uu[3][0], -Uu[3][1]]);
      sum += Math.atan2(z[1], z[0]);
    }
    chern.push(bad ? NaN : sum / (2 * Math.PI));
  }
  return { chern, gaps, minLink };
}

function assert(ok, why) { if (!ok) throw Error(why); }

function sortedModule(p, q) {
  return Array.from(harperEV(p, q)).sort((a, b) => a - b);
}

function run() {
  const failures = [];
  const check = (ok, why) => { if (!ok) failures.push(why); };

  // Solver versus a converged Jacobi of the matrix the module actually builds.
  const solverByQ = {};
  let solverWorstQ4 = 0, solverWorstQ8 = 0;
  for (const [p, q] of coprimePairs(12)) {
    const built = moduleMatrix(p, q, 2 * Math.PI, Float64Array, Math);
    const mod = Array.from(jacobiEV(Float64Array.from(built), q)).sort((a, b) => a - b);
    const ref = convergedJacobi(built, q);
    check(ref.off < 1e-12, 'Reference Jacobi did not converge at ' + p + '/' + q);
    check(mod.length === q && ref.ev.length === q, 'Band count is not q at ' + p + '/' + q);
    const d = maxAbsDiff(mod, ref.ev);
    if (!solverByQ[q] || d > solverByQ[q]) solverByQ[q] = d;
    if (q <= 4) solverWorstQ4 = Math.max(solverWorstQ4, d);
    if (q === 8) solverWorstQ8 = Math.max(solverWorstQ8, d);
  }
  check(solverWorstQ4 < 1e-9, 'Capped Jacobi should match a converged Jacobi for q <= 4, worst ' + solverWorstQ4);
  check(solverWorstQ8 > 1e-2, 'Capped Jacobi at q = 8 should still be visibly unconverged, worst ' + solverWorstQ8);

  // Operator versus the Bloch Hamiltonian at θ = φ = 0.
  const q2mod = sortedModule(1, 2);
  const q2ref = Array.from(harper(1, 2, 0, 0, 'tknn').ev);
  const q3mod = sortedModule(1, 3);
  const q3ref = Array.from(harper(1, 3, 0, 0, 'tknn').ev);
  const q1mod = sortedModule(0, 1);
  const q1ref = Array.from(harper(0, 1, 0, 0, 'tknn').ev);
  check(Math.abs(q2ref[1] - 2 * Math.SQRT2) < 1e-9, 'α = 1/2 band edge should be 2√2, got ' + q2ref[1]);
  check(Math.abs(q2mod[1] - Math.sqrt(5)) < 1e-9, 'Plate α = 1/2 eigenvalue should be √5 (wrong matrix), got ' + q2mod[1]);
  check(Math.abs(q2mod[1] - q2ref[1]) > 0.5, 'Plate q = 2 matrix should disagree with the Harper wrap');
  check(maxAbsDiff(q3mod, q3ref) < 1e-12, 'Plate q = 3 θ = 0 slice should match the Harper matrix');
  check(Math.abs(q1ref[0] - 4) < 1e-12, 'α = 0, θ = φ = 0 should be E = 4');
  check(Math.abs(q1mod[0] - 1) < 1e-12, 'Plate q = 1 overwrites the diagonal and returns 1');
  check(mirrorErr(q3mod) > 0.5, 'The plate θ = 0 slice at q = 3 is not symmetric under E -> -E');
  check(mirrorErr(sortedModule(1, 4)) < 1e-9, 'The plate θ = 0 slice at q = 4 is symmetric under E -> -E');

  let alphaWorst = 0, alphaWorstSmall = 0;
  for (const [p, q] of coprimePairs(16)) {
    if (p > q - p) continue;
    const d = maxAbsDiff(sortedModule(p, q), sortedModule(q - p, q));
    alphaWorst = Math.max(alphaWorst, d);
    if (q <= 4) alphaWorstSmall = Math.max(alphaWorstSmall, d);
  }
  check(alphaWorstSmall < 1e-9, 'Plate spectra at α and 1 - α should agree for q <= 4, worst ' + alphaWorstSmall);
  check(alphaWorst > 1e-3, 'Unconverged Jacobi should break α -> 1 - α on the plate by q = 16, worst ' + alphaWorst);

  // Symmetries of the Bloch Hamiltonian, not of the single phase the plate draws.
  let eSym = 0, aSym = 0, resid = 0;
  for (const q of [2, 3, 4, 5, 7]) {
    for (const p of [1, Math.min(2, q - 1)]) {
      if (gcd(p, q) !== 1) continue;
      for (let iy = 0; iy < 4; iy++) for (let ix = 0; ix < 4; ix++) {
        const th = 2 * Math.PI * ix / 4, ph = 2 * Math.PI * iy / 4;
        const a = harper(p, q, th, ph, 'tknn');
        const b = harper(p, q, th + (q % 2 ? Math.PI : 0), ph + Math.PI, 'tknn');
        const c = harper(q - p, q, th, -ph, 'tknn');
        let em = 0;
        for (let i = 0; i < q; i++) em = Math.max(em, Math.abs(a.ev[i] + b.ev[q - 1 - i]));
        eSym = Math.max(eSym, em);
        aSym = Math.max(aSym, maxAbsDiff(a.ev, c.ev));
        if (ix === 0 && iy === 0) {
          const r = residual(p, q, th, ph, 'tknn', a);
          resid = Math.max(resid, r.residual, r.norm);
        }
      }
    }
  }
  check(eSym < 1e-8, 'Bloch spectrum should be symmetric under E -> -E, worst ' + eSym);
  check(aSym < 1e-8, 'Bloch spectrum should be symmetric under α -> 1 - α, worst ' + aSym);
  check(resid < 1e-8, 'Hermitian residual too large: ' + resid);

  // Diophantine integers, the plate's coloring, and a wrong gap index.
  let colorChecks = 0, colorMismatch = 0, wrongIndexFail = 0, wrongIndexSame = 0;
  const colorDomain = coprimePairs(24).filter(([p, q]) => q >= 2);
  for (const [p, q] of colorDomain) {
    for (let r = 0; r <= q; r++) {
      const t = tknn(p, q, r);
      check(satisfies(r, p, q, t), 'TKNN integer fails its own equation at ' + p + '/' + q + ' r=' + r);
      check(Math.abs(t) <= q / 2, 'TKNN |t| exceeds q/2');
    }
    for (let r = 0; r < q; r++) {
      const painted = plateC(p, q, r);
      const t = tknn(p, q, r);
      colorChecks++;
      if (painted !== t) colorMismatch++;
      const wrong = tknn(p, q, r + 1);
      if (wrong !== t) {
        if (satisfies(r, p, q, wrong)) check(false, 'Wrong gap index still satisfied TKNN at ' + p + '/' + q + ' r=' + r);
        else wrongIndexFail++;
      } else wrongIndexSame++;
    }
  }
  check(colorMismatch === 0, 'Plate coloring disagreed with TKNN t_r at ' + colorMismatch + ' eigenvalues');
  check(wrongIndexFail > 0, 'Wrong gap index never failed');
  const passGap = tknn(1, 3, 1);
  const failGap = tknn(1, 3, 2);
  check(passGap === 1 && failGap === -1, 'Expected passing 1 and failing -1 at α = 1/3, got ' + passGap + ', ' + failGap);
  check(satisfies(1, 1, 3, passGap) && !satisfies(1, 1, 3, failGap), 'Gap-index predicate did not separate 1 from -1');
  check(plateC(1, 3, 1) === 1, 'Plate should paint the middle 1/3 eigenvalue with t_1 = 1');
  check(plateC(1, 3, 1) !== -2 && plateC(1, 3, 0) === 0, 'Plate coloring is not the band Chern');

  // Lattice Chern numbers on open gaps.
  const fractions = [[1, 3], [2, 3], [1, 4], [1, 5], [2, 5], [3, 5], [1, 7], [2, 7], [3, 7]];
  const cases = [];
  const GAP = 0.015;
  for (const [p, q] of fractions) {
    const coarse = fhs(p, q, q <= 5 ? 8 : 10, 'tknn');
    const fine = fhs(p, q, q <= 5 ? 12 : 14, 'tknn');
    const rounded = coarse.chern.map(c => Math.round(c));
    const roundedFine = fine.chern.map(c => Math.round(c));
    const near = coarse.chern.every((c, i) => Number.isFinite(c) && Math.abs(c - rounded[i]) < 1e-6 && rounded[i] === roundedFine[i]);
    check(near, 'FHS Chern numbers not stable integers at ' + p + '/' + q + ' ' + coarse.chern.join(','));
    const gaps = coarse.gaps;
    const isolated = rounded.map((_, j) => (j === 0 || gaps[j - 1] > GAP) && (j === q - 1 || gaps[j] > GAP));
    const bandFromGaps = [];
    for (let j = 0; j < q; j++) bandFromGaps.push(tknn(p, q, j + 1) - tknn(p, q, j));
    const compared = [];
    for (let j = 0; j < q; j++) {
      if (!isolated[j]) continue;
      compared.push({ band: j, fhs: rounded[j], tknn: bandFromGaps[j], gapBelow: j === 0 ? null : gaps[j - 1], gapAbove: j === q - 1 ? null : gaps[j] });
      check(rounded[j] === bandFromGaps[j], 'FHS band ' + j + ' at ' + p + '/' + q + ' is ' + rounded[j] + ', TKNN difference is ' + bandFromGaps[j]);
    }
    check(compared.length > 0, 'No isolated band at ' + p + '/' + q);
    cases.push({
      p, q, alpha: p + '/' + q,
      gapChern: Array.from({ length: q + 1 }, (_, r) => tknn(p, q, r)),
      bandChernTKNN: bandFromGaps,
      bandChernFHS: rounded,
      minGap: Math.min(...gaps),
      minLink: coarse.minLink,
      meshes: [q <= 5 ? 8 : 10, q <= 5 ? 12 : 14],
      comparedBands: compared.map(c => c.band),
    });
  }
  const flip = fhs(1, 3, 8, 'flipped');
  const dropped = fhs(1, 3, 8, 'dropped');
  const flip0 = Math.round(flip.chern[0]);
  const drop0 = Math.round(dropped.chern[0]);
  check(flip0 === -1, 'Reversed hopping phase should give lowest-band Chern -1 at 1/3, got ' + flip0);
  check(drop0 === 0, 'Dropped Bloch phase should give Chern 0 at 1/3, got ' + drop0);
  check(cases.find(c => c.p === 1 && c.q === 3).bandChernFHS.join(',') === '1,-2,1', 'α = 1/3 bands should be 1, -2, 1');
  const c13 = cases.find(c => c.p === 1 && c.q === 3).bandChernFHS;
  const c23 = cases.find(c => c.p === 2 && c.q === 3).bandChernFHS;
  check(c13.every((c, i) => c === -c23[i]), 'Chern numbers should flip under α -> 1 - α');

  const result = {
    tool: 'tools/hofstadter-science.js',
    reviewed: '2026-09-27',
    source: sourcePath,
    sourceSha256,
    node: process.version,
    claim: 'Independent Harper matrix, TKNN gap integers, and Fukui-Hatsugai-Suzuki band Chern numbers. Not a laboratory quantum Hall measurement.',
    hamiltonian: 'H_j = ψ_{j+1} + ψ_{j-1} + 2 cos(φ + 2π p j / q) ψ_j, with ψ_{n+q} = exp(-i θ) ψ_n. The wrap adds, so q = 2 has off-diagonal 1 + exp(-i θ). θ, φ in [0, 2π). This boundary sign is the one whose lattice Chern numbers match TKNN.',
    plate: 'The module builds one real q by q matrix per coprime p/q, with diagonal 2 cos(2π p i / q) and off-diagonal 1, including the corner. That is the θ = φ = 0 Harper matrix only for q >= 3. q = 1 overwrites the diagonal (eigenvalue 1 instead of 4). q = 2 stores 1 instead of 1 + 1 (eigenvalues ±√5 instead of ±2√2). jacobiEV stops after min(60, 8 + q) pivots.',
    coloring: 'Each sorted eigenvalue index r (0 at the bottom) is painted with the TKNN integer t_r of the gap with r bands filled, smallest |t_r| and negative on a tie. That is the gap below the eigenvalue, not the Chern number of the band and not the gap above it. The source comment says "gap above". Neighboring pixels that only receive the 0.4 density smear are painted as Hall integer 0.',
    solverErrorByQ: solverByQ,
    solver: {
      maxAbsErrorQAtMost4: solverWorstQ4,
      maxAbsErrorQ8: solverWorstQ8,
      q2Plate: q2mod,
      q2Harper: Array.from(q2ref),
      q1Plate: q1mod[0],
      q1Harper: q1ref[0],
      alphaSymmetryPlateMaxAbsQ16: alphaWorst,
      alphaSymmetryPlateMaxAbsQAtMost4: alphaWorstSmall,
    },
    blochSymmetry: { eToMinusE: eSym, alphaToOneMinusAlpha: aSym, residual: resid },
    diophantine: {
      colorChecks,
      colorMismatch,
      wrongIndexFailures: wrongIndexFail,
      wrongIndexTied: wrongIndexSame,
      example: { flux: '1/3', r: 1, passing: passGap, failing: failGap },
    },
    hoppingPhase: {
      flux: '1/3',
      band: 0,
      passing: 1,
      failing: flip0,
      droppedPhase: drop0,
    },
    cases,
    limits: [
      'Spectral positions of the plate match a converged diagonalization only for q <= 4 (absolute error below 1e-9). At q = 8 the capped Jacobi is already off by more than 0.01, and from q = 7 it mis-orders eigenvalues, so every legal plate (Q >= 8) paints some Chern integers at the wrong energy.',
      'The picture is the θ = φ = 0 slice, q points per rational, not the filled magnetic bands.',
      'No disorder, no interactions, no edge transport, and no laboratory quantum Hall datum.',
    ],
  };

  if (failures.length) {
    console.error(failures.join('\n'));
    throw Error(failures.length + ' Hofstadter checks failed');
  }
  return result;
}

if (require.main === module) {
  const result = run();
  const outPath = path.join(root, 'validation/results/hofstadter-science.json');
  if (process.argv.includes('--write')) fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  else if (fs.existsSync(outPath)) {
    const saved = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    assert(saved.diophantine.example.passing === result.diophantine.example.passing
      && saved.diophantine.example.failing === result.diophantine.example.failing
      && saved.hoppingPhase.passing === result.hoppingPhase.passing
      && saved.hoppingPhase.failing === result.hoppingPhase.failing
      && saved.diophantine.colorMismatch === 0
      && saved.cases.length === result.cases.length, 'validation/results/hofstadter-science.json is stale; run node tools/hofstadter-science.js --write');
  }
  const ex = result.diophantine.example;
  console.log('Hofstadter science OK');
  console.log('gap index at 1/3, r = 1: passing ' + ex.passing + ', failing ' + ex.failing
    + ' (' + result.diophantine.wrongIndexFailures + ' wrong indices rejected, ' + result.diophantine.colorChecks + ' plate colors matched t_r)');
  console.log('hopping phase at 1/3, lowest band: passing ' + result.hoppingPhase.passing + ', failing ' + result.hoppingPhase.failing
    + ' (dropped phase ' + result.hoppingPhase.droppedPhase + ')');
  for (const c of result.cases) console.log('  ' + c.alpha + ' FHS ' + c.bandChernFHS.join(',') + ' gaps ' + c.gapChern.join(','));
}

module.exports = { tknn, satisfies, plateC, harper };
