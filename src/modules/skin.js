
/* modules/skin.js */
/* GENChase: Hatano-Nelson chain. A similarity transform skins every eigenmode onto one boundary. The plate is |ψ_n(x)|. Skin weight is measured from the spectrum. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Chain', 'grid', 'Sites', GEOM, 48, 192, 8, v => v + ''),
    { group: 'Chain', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Non-Hermitian', 'g', 'Asymmetry g', GEOM, 0, 0.18, 0.005, f3, { hint: 'Right hop e^g, left hop e^{−g}. g = 0 is ordinary Hermitian tight-binding. Any g ≠ 0 skins every mode onto one end.' }),
    RANGE('Non-Hermitian', 'disorder', 'On-site W', GEOM, 0, 4, 0.05, f2),
    { group: 'Non-Hermitian', key: 'bc', label: 'Ends', type: 'seg', kind: GEOM, options: [['open', 'Open'], ['periodic', 'Periodic']], hint: 'The skin effect needs an edge. Periodic boundaries undo it: the similarity transform is no longer compatible with the identification.' },
    { group: 'Chain', key: 'rows', label: 'Rows', type: 'seg', kind: GEOM, options: [['modes', 'One per mode'], ['sheet', 'Before v7']],
      hint: 'One per mode draws at most one row per eigenmode: a chain of N sites has at most N rows on any sheet. Before v8 is the sheet height in cells, which recipes made before recipe v8 used. On a tall sheet that repeats early modes, and the row at wave number pi is rounding error. Old links keep it so they reprint.' },
    { group: 'Chain', key: 'solver', label: 'Solver', type: 'seg', kind: GEOM, options: [['right', 'Right eigenvectors'], ['gram', 'Gram–Schmidt']],
      hint: 'Right eigenvectors are the modes of this chain. With open ends, ψ_j = e^{g j} φ_j turns the operator into a Hermitian tridiagonal, which a symmetric QL diagonalizes. Periodic ends keep a real nonsymmetric matrix: Francis QR for the eigenvalues, then inverse iteration for each right eigenvector. Gram–Schmidt is the subspace iteration recipes made before recipe v8 used. It returns an orthonormal basis, not the right eigenvectors. Old links keep it so they reprint.' },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['modes', '|ψ_n(x)|'], ['log', 'log |ψ|'], ['sum', 'Density of states']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
    RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.3, 1.6, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 96, aspect: '4:5', rows: 'modes', solver: 'right',
    g: 0.06, disorder: 0, bc: 'open',
    view: 'log', exposure: 1.1, gamma: 0.55,
  };

  const PRESETS = {
    skin: pre('Skinned', { g: 0.08, disorder: 0, bc: 'open', view: 'log' }, Pal.ember),
    hermite: pre('Hermitian', { g: 0, disorder: 0, bc: 'open', view: 'modes' }, Pal.harbor),
    dirty: pre('Disordered skin', { g: 0.07, disorder: 1.4, bc: 'open', view: 'log' }, Pal.thermal),
    ring: pre('Periodic (no skin)', { g: 0.08, disorder: 0, bc: 'periodic', view: 'modes' }, Pal.graphite),
    wall: pre('Hard skin', { g: 0.14, disorder: 0, bc: 'open', view: 'sum' }, Pal.nightshade),
    weak: pre('Gentle g', { g: 0.025, disorder: 0, bc: 'open', view: 'log' }, Pal.kiln),
    anderson: pre('Anderson', { g: 0, disorder: 3.2, bc: 'open', view: 'log' }, Pal.xray),
  };

  function surprise(rng) {
    return {
      g: rng.range(0.02, 0.12),
      disorder: rng() < 0.45 ? rng.range(0.4, 2.2) : 0,
      bc: rng() < 0.15 ? 'periodic' : 'open',
      view: rng.pick(['log', 'log', 'modes', 'sum']),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(48, Math.min(192, Math.round(s.grid / 8) * 8));
  }

  Studio.register({
    id: 'skin',
    name: 'Skin Effect',
    tab: 'Skin',
    subtitle: 'non-Hermitian skin, Hatano–Nelson · 1996 / 2018',
    order: 47,
    equation: 'H_{j,j+1} = e^{g},   H_{j+1,j} = e^{−g},   ψ_n(j) ∝ e^{g j} sin(π n j / (N+1))',
    credit: 'N. Hatano and D. R. Nelson, Phys. Rev. Lett. 77, 570 (1996), wrote a directed-hopping chain whose bulk spectrum is that of Hermitian tight-binding while every eigenvector piles onto a boundary. Yao and Wang, Phys. Rev. Lett. 121, 086803 (2018), named this the non-Hermitian skin effect and showed it breaks the usual bulk-boundary correspondence. Hermitian quantum mechanics cannot do it: a similarity transform that is not unitary has no counterpart when H = H†.',
    blurb: 'Hermitian eigenmodes of a chain spread, or they Anderson-localise at a random site. They do not all move to the same end. Give the hop a direction, right hop e^g and left hop e^{-g}, and a similarity transform maps the whole spectrum onto ordinary cosine bands while every right eigenvector is multiplied by e^{g j}. Open the ends and the pile-up is visible: the plate is |ψ_n(x)|, mode index down the page, at most one row per mode. A taller sheet stretches those rows. Recipes made before recipe v8 keep the old sheet-height count, which repeats modes, and the Gram–Schmidt basis, which is not the eigenvectors. The status line says so. The status line reports the weight on the last tenth of the chain. Periodic boundaries are not the open-chain similarity, and the skin weight drops.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    // Recipes older than v7 drew one cell-row per sheet row, past the N eigenmodes on a tall sheet.
    // Recipes older than v8 diagonalized disorder and periodic ends by subspace iteration with
    // Gram-Schmidt, an orthonormal basis rather than the right eigenvectors.
    legacy: { 8: { rows: 'sheet', solver: 'gram' } },
    presets: PRESETS,
    closedGroups: ['Picture'],
    hints: {
      'Non-Hermitian': 'Disorder of order 1 competes with the skin. Periodic boundaries are the control that should look Hermitian even at large g.',
    },
    palette: true,
    defaultPalette: 'ember',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, amp, skinW = 0, ipr = 0, buf, img;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        const sheet = Math.max(32, Math.round(g * aspect));
        // A chain of N sites has N eigenmodes. Rows past N repeat modes 1, 2, ... and the
        // row at k = pi is the normalization of sin(pi * integer) rounding error. New
        // recipes draw at most N. Recipes older than v7 keep the sheet height.
        const H = s.rows === 'sheet' ? sheet : Math.min(sheet, g);
        return { W: g, H };
      }

      function exactModes(N, M, g) {
        const out = new Float32Array(N * M);
        const gg = g;
        for (let n = 0; n < M; n++) {
          const k = Math.PI * (n + 1) / (N + 1);
          let nrm = 0;
          const row = new Float32Array(N);
          for (let j = 0; j < N; j++) {
            const v = Math.exp(gg * j) * Math.sin(k * (j + 1));
            row[j] = v * v;
            nrm += row[j];
          }
          nrm = nrm || 1;
          for (let j = 0; j < N; j++) out[n * N + j] = row[j] / nrm;
        }
        return out;
      }

      function pack32(rows) {
        const M = rows.length, N = rows[0].length;
        const out = new Float32Array(N * M);
        for (let n = 0; n < M; n++) {
          let nrm = 0;
          for (let j = 0; j < N; j++) {
            out[n * N + j] = rows[n][j];
            nrm += out[n * N + j];
          }
          nrm = nrm || 1;
          for (let j = 0; j < N; j++) out[n * N + j] /= nrm;
        }
        return out;
      }

      function onsite(N, Wd, seed) {
        const rng = U.makeRng(String(seed) + '/hn');
        const pot = new Float64Array(N);
        for (let i = 0; i < N; i++) pot[i] = Wd * rng.gauss();
        return pot;
      }

      // Symmetric tridiagonal QL with eigenvectors. d is the diagonal, e the subdiagonal.
      // Columns of V are the eigenvectors of the Hermitian chain φ, not of the skinned ψ.
      function tridiagQL(dIn, eIn) {
        const n = dIn.length;
        const d = Float64Array.from(dIn);
        const e = new Float64Array(n);
        for (let i = 0; i < n - 1; i++) e[i] = eIn[i];
        const V = new Float64Array(n * n);
        for (let i = 0; i < n; i++) V[i * n + i] = 1;
        const eps = Number.EPSILON;
        for (let l = 0; l < n; l++) {
          let iter = 0;
          for (;;) {
            let m = l;
            while (m < n - 1) {
              const dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
              if (Math.abs(e[m]) <= eps * (dd || 1)) break;
              m++;
            }
            if (m === l) break;
            if (++iter > 80) throw new Error('skin QL did not converge');
            const g0 = (d[l + 1] - d[l]) / (2 * e[l]);
            const r0 = Math.hypot(g0, 1);
            let g = d[m] - d[l] + e[l] / (g0 + Math.sign(g0 || 1) * r0);
            let s = 1, c = 1, p = 0, broken = false;
            for (let i = m - 1; i >= l; i--) {
              const f = s * e[i], b = c * e[i], r = Math.hypot(f, g);
              e[i + 1] = r;
              if (r === 0) { d[i + 1] -= p; e[m] = 0; broken = true; break; }
              s = f / r; c = g / r;
              g = d[i + 1] - p;
              const rr = (d[i] - g) * s + 2 * c * b;
              p = s * rr;
              d[i + 1] = g + p;
              g = c * rr - b;
              for (let k = 0; k < n; k++) {
                const z = V[k * n + i], w = V[k * n + i + 1];
                V[k * n + i] = z * c - w * s;
                V[k * n + i + 1] = z * s + w * c;
              }
            }
            if (!broken) { d[l] -= p; e[l] = g; e[m] = 0; }
          }
        }
        return { d, V };
      }

      function openRight(N, M, g, pot) {
        const off = new Float64Array(Math.max(0, N - 1));
        off.fill(1);
        const { d, V } = tridiagQL(pot, off);
        const order = Array.from(d, (_, i) => i).sort((a, b) => d[b] - d[a] || a - b);
        const rows = [];
        for (let t = 0; t < M; t++) {
          const col = order[t % N];
          const row = new Float64Array(N);
          let nrm = 0;
          for (let j = 0; j < N; j++) {
            const v = Math.exp(g * j) * V[j * N + col];
            row[j] = v * v;
            nrm += row[j];
          }
          for (let j = 0; j < N; j++) row[j] /= nrm || 1;
          rows.push(row);
        }
        return pack32(rows);
      }

      // Real nonsymmetric eigenvalues: Hessenberg reduction, then Francis double-shift QR.
      function francis(M) {
        const n = M.length, a = M.map(r => Float64Array.from(r)), wr = new Float64Array(n), wi = new Float64Array(n);
        for (let m = 1; m < n - 1; m++) {
          let x = 0, i = m;
          for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
          if (i !== m) {
            for (let j = m - 1; j < n; j++) { const t = a[i][j]; a[i][j] = a[m][j]; a[m][j] = t; }
            for (let j = 0; j < n; j++) { const t = a[j][i]; a[j][i] = a[j][m]; a[j][m] = t; }
          }
          if (x) for (i = m + 1; i < n; i++) {
            let y = a[i][m - 1];
            if (!y) continue;
            y /= x; a[i][m - 1] = y;
            for (let j = m; j < n; j++) a[i][j] -= y * a[m][j];
            for (let j = 0; j < n; j++) a[j][m] += y * a[j][i];
          }
        }
        for (let i = 0; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
        let anorm = 0;
        for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
        let nn = n - 1, t = 0, p = 0, q = 0, r = 0, x, y, z, w, s, l;
        while (nn >= 0) {
          let its = 0;
          do {
            for (l = nn; l >= 1; l--) {
              s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]);
              if (s === 0) s = anorm;
              if (Math.abs(a[l][l - 1]) + s === s) { a[l][l - 1] = 0; break; }
            }
            x = a[nn][nn];
            if (l === nn) { wr[nn] = x + t; wi[nn--] = 0; }
            else {
              y = a[nn - 1][nn - 1]; w = a[nn][nn - 1] * a[nn - 1][nn];
              if (l === nn - 1) {
                p = 0.5 * (y - x); q = p * p + w; z = Math.sqrt(Math.abs(q)); x += t;
                if (q >= 0) {
                  z = p + (p >= 0 ? z : -z);
                  wr[nn - 1] = wr[nn] = x + z;
                  if (z) wr[nn] = x - w / z;
                  wi[nn - 1] = wi[nn] = 0;
                } else {
                  wr[nn - 1] = wr[nn] = x + p;
                  wi[nn - 1] = -(wi[nn] = z);
                }
                nn -= 2;
              } else {
                if (its === 80) throw new Error('skin QR did not converge');
                if (its === 10 || its === 20) {
                  t += x;
                  for (let i = 0; i <= nn; i++) a[i][i] -= x;
                  s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]);
                  y = x = 0.75 * s; w = -0.4375 * s * s;
                }
                ++its;
                let m;
                for (m = nn - 2; m >= l; m--) {
                  z = a[m][m]; r = x - z; s = y - z;
                  p = (r * s - w) / a[m + 1][m] + a[m][m + 1];
                  q = a[m + 1][m + 1] - z - r - s; r = a[m + 2][m + 1];
                  s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s;
                  if (m === l) break;
                  const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r));
                  const v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
                  if (u + v === v) break;
                }
                for (let i = m + 2; i <= nn; i++) { a[i][i - 2] = 0; if (i !== m + 2) a[i][i - 3] = 0; }
                for (let k = m; k <= nn - 1; k++) {
                  if (k !== m) {
                    p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0;
                    if (k !== nn - 1) r = a[k + 2][k - 1];
                    if ((x = Math.abs(p) + Math.abs(q) + Math.abs(r)) !== 0) { p /= x; q /= x; r /= x; }
                  }
                  if ((s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r)) !== 0) {
                    if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; }
                    else a[k][k - 1] = -s * x;
                    p += s; x = p / s; y = q / s; z = r / s; q /= p; r /= p;
                    for (let j = k; j <= nn; j++) {
                      p = a[k][j] + q * a[k + 1][j];
                      if (k !== nn - 1) { p += r * a[k + 2][j]; a[k + 2][j] -= p * z; }
                      a[k + 1][j] -= p * y; a[k][j] -= p * x;
                    }
                    const mmin = nn < k + 3 ? nn : k + 3;
                    for (let i = l; i <= mmin; i++) {
                      p = x * a[i][k] + y * a[i][k + 1];
                      if (k !== nn - 1) { p += z * a[i][k + 2]; a[i][k + 2] -= p * r; }
                      a[i][k + 1] -= p * q; a[i][k] -= p;
                    }
                  }
                }
              }
            }
          } while (l < nn - 1);
        }
        const ev = [];
        for (let i = 0; i < n; i++) ev.push([wr[i], wi[i]]);
        return ev;
      }

      function cdiv(ar, ai, br, bi) {
        const den = br * br + bi * bi;
        return [(ar * br + ai * bi) / den, (ai * br - ar * bi) / den];
      }

      function thomas(sub, dr, di, sup, rr, ri) {
        const n = dr.length;
        const cr = new Float64Array(n), ci = new Float64Array(n);
        const br = Float64Array.from(rr), bi = Float64Array.from(ri);
        cr[0] = dr[0]; ci[0] = di[0];
        for (let i = 1; i < n; i++) {
          const den = cr[i - 1] * cr[i - 1] + ci[i - 1] * ci[i - 1];
          const pr = sub[i] * cr[i - 1] / den, pi = -sub[i] * ci[i - 1] / den;
          cr[i] = dr[i] - pr * sup[i - 1];
          ci[i] = di[i] - pi * sup[i - 1];
          const nr = br[i] - pr * br[i - 1] + pi * bi[i - 1];
          const ni = bi[i] - pr * bi[i - 1] - pi * br[i - 1];
          br[i] = nr; bi[i] = ni;
        }
        const xr = new Float64Array(n), xi = new Float64Array(n);
        [xr[n - 1], xi[n - 1]] = cdiv(br[n - 1], bi[n - 1], cr[n - 1], ci[n - 1]);
        for (let i = n - 2; i >= 0; i--) {
          [xr[i], xi[i]] = cdiv(br[i] - sup[i] * xr[i + 1], bi[i] - sup[i] * xi[i + 1], cr[i], ci[i]);
        }
        return { xr, xi };
      }

      // (A - λ) x = r for the periodic Hatano–Nelson matrix. Corners are a rank-two update
      // of the open tridiagonal, applied with Sherman-Morrison twice.
      function solveCyclic(pot, g, re, im, rr, ri) {
        const n = pot.length;
        const tR = Math.exp(g), tL = Math.exp(-g);
        const sub = new Float64Array(n), sup = new Float64Array(n);
        const dr = new Float64Array(n), di = new Float64Array(n);
        for (let i = 0; i < n; i++) { dr[i] = pot[i] - re; di[i] = -im; }
        for (let i = 1; i < n; i++) sub[i] = tR;
        for (let i = 0; i < n - 1; i++) sup[i] = tL;
        const ur1 = new Float64Array(n), ui1 = new Float64Array(n);
        const vr1 = new Float64Array(n), vi1 = new Float64Array(n);
        ur1[0] = tR; vr1[n - 1] = 1;
        const once = (r1, i1) => {
          const y = thomas(sub, dr, di, sup, r1, i1);
          const z = thomas(sub, dr, di, sup, ur1, ui1);
          let vyr = 0, vyi = 0, vzr = 0, vzi = 0;
          for (let i = 0; i < n; i++) {
            vyr += vr1[i] * y.xr[i] - vi1[i] * y.xi[i];
            vyi += vr1[i] * y.xi[i] + vi1[i] * y.xr[i];
            vzr += vr1[i] * z.xr[i] - vi1[i] * z.xi[i];
            vzi += vr1[i] * z.xi[i] + vi1[i] * z.xr[i];
          }
          const [fr, fi] = cdiv(vyr, vyi, 1 + vzr, vzi);
          const xr = new Float64Array(n), xi = new Float64Array(n);
          for (let i = 0; i < n; i++) {
            xr[i] = y.xr[i] - (fr * z.xr[i] - fi * z.xi[i]);
            xi[i] = y.xi[i] - (fr * z.xi[i] + fi * z.xr[i]);
          }
          return { xr, xi };
        };
        const ur2 = new Float64Array(n), ui2 = new Float64Array(n);
        const vr2 = new Float64Array(n);
        ur2[n - 1] = tL; vr2[0] = 1;
        const y = once(rr, ri);
        const z = once(ur2, ui2);
        let vyr = 0, vyi = 0, vzr = 0, vzi = 0;
        for (let i = 0; i < n; i++) {
          vyr += vr2[i] * y.xr[i];
          vyi += vr2[i] * y.xi[i];
          vzr += vr2[i] * z.xr[i];
          vzi += vr2[i] * z.xi[i];
        }
        const [fr, fi] = cdiv(vyr, vyi, 1 + vzr, vzi);
        const xr = new Float64Array(n), xi = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          xr[i] = y.xr[i] - (fr * z.xr[i] - fi * z.xi[i]);
          xi[i] = y.xi[i] - (fr * z.xi[i] + fi * z.xr[i]);
        }
        return { xr, xi };
      }

      function periodicHermitian(N, M, pot) {
        const A = Array.from({ length: N }, () => new Float64Array(N));
        const V = Array.from({ length: N }, () => new Float64Array(N));
        for (let i = 0; i < N; i++) {
          A[i][i] = pot[i];
          V[i][i] = 1;
          const j = (i + 1) % N;
          A[i][j] = 1;
          A[j][i] = 1;
        }
        for (let sweep = 0; sweep < 80; sweep++) {
          let off = 0;
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) off += A[i][j] * A[i][j];
          if (Math.sqrt(off) < 1e-14) break;
          for (let p = 0; p < N - 1; p++) for (let q = p + 1; q < N; q++) {
            const apq = A[p][q];
            if (Math.abs(apq) < 1e-18) continue;
            const tau = (A[q][q] - A[p][p]) / (2 * apq);
            const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
            const c = 1 / Math.sqrt(1 + t * t), s = t * c;
            for (let k = 0; k < N; k++) {
              const akp = A[k][p], akq = A[k][q];
              A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
            }
            for (let k = 0; k < N; k++) {
              const apk = A[p][k], aqk = A[q][k];
              A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
            }
            for (let k = 0; k < N; k++) {
              const vkp = V[k][p], vkq = V[k][q];
              V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
            }
          }
        }
        const order = A.map((row, i) => i).sort((a, b) => A[b][b] - A[a][a] || a - b);
        const rows = [];
        for (let t = 0; t < M; t++) {
          const col = order[t % N];
          const row = new Float64Array(N);
          let nrm = 0;
          for (let j = 0; j < N; j++) { const v = V[j][col]; row[j] = v * v; nrm += row[j]; }
          for (let j = 0; j < N; j++) row[j] /= nrm || 1;
          rows.push(row);
        }
        return pack32(rows);
      }

      function periodicRight(N, M, g, pot) {
        if (!(Math.abs(g) > 0)) return periodicHermitian(N, M, pot);
        const A = Array.from({ length: N }, () => new Float64Array(N));
        const tR = Math.exp(g), tL = Math.exp(-g);
        for (let i = 0; i < N; i++) {
          A[i][i] = pot[i];
          A[i][(i - 1 + N) % N] += tR;
          A[i][(i + 1) % N] += tL;
        }
        const ev = francis(A).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
        const found = [];
        const rows = [];
        for (let t = 0; t < M; t++) {
          const [re, im] = ev[t % N];
          let xr = Float64Array.from({ length: N }, (_, i) => ((i * 17) % 7) - 3);
          let xi = new Float64Array(N);
          const mates = found.filter(p => Math.hypot(p.re - re, p.im - im) < 1e-6);
          let shift = 0;
          for (let it = 0; it < 8; it++) {
            let sol = solveCyclic(pot, g, re + shift, im, xr, xi);
            if (!sol.xr.every(Number.isFinite) || !sol.xi.every(Number.isFinite)) {
              shift = shift === 0 ? 1e-10 : shift * 10;
              sol = solveCyclic(pot, g, re + shift, im, xr, xi);
            }
            xr = sol.xr; xi = sol.xi;
            for (const p of mates) {
              let dot = 0;
              for (let i = 0; i < N; i++) dot += p.xr[i] * xr[i] + p.xi[i] * xi[i];
              for (let i = 0; i < N; i++) { xr[i] -= dot * p.xr[i]; xi[i] -= dot * p.xi[i]; }
            }
            let n2 = 0;
            for (let i = 0; i < N; i++) n2 += xr[i] * xr[i] + xi[i] * xi[i];
            const inv = 1 / Math.sqrt(n2 || 1);
            for (let i = 0; i < N; i++) { xr[i] *= inv; xi[i] *= inv; }
          }
          found.push({ re, im, xr, xi });
          const row = new Float64Array(N);
          let s = 0;
          for (let j = 0; j < N; j++) { row[j] = xr[j] * xr[j] + xi[j] * xi[j]; s += row[j]; }
          for (let j = 0; j < N; j++) row[j] /= s || 1;
          rows.push(row);
        }
        return pack32(rows);
      }

      function applyH(src, dst, N, tR, tL, pot, periodic) {
        for (let i = 0; i < N; i++) {
          const L = i === 0 ? (periodic ? src[N - 1] : 0) : src[i - 1];
          const R = i === N - 1 ? (periodic ? src[0] : 0) : src[i + 1];
          dst[i] = tR * L + tL * R + pot[i] * src[i];
        }
      }

      function disorderedModes(N, M, g, Wd, seed, periodic) {
        const rng = U.makeRng(seed + '/hn');
        const pot = new Float32Array(N);
        for (let i = 0; i < N; i++) pot[i] = Wd * rng.gauss();
        const tR = Math.exp(g), tL = Math.exp(-g);
        const K = M;
        const V = new Float64Array(N * K);
        for (let k = 0; k < K; k++) {
          for (let i = 0; i < N; i++) V[k * N + i] = rng.gauss();
        }
        const tmp = new Float64Array(N);
        const col = new Float64Array(N);
        for (let it = 0; it < 36; it++) {
          for (let k = 0; k < K; k++) {
            for (let i = 0; i < N; i++) col[i] = V[k * N + i];
            applyH(col, tmp, N, tR, tL, pot, periodic);
            for (let i = 0; i < N; i++) V[k * N + i] = tmp[i];
          }
          for (let k = 0; k < K; k++) {
            for (let p = 0; p < k; p++) {
              let dot = 0;
              for (let i = 0; i < N; i++) dot += V[k * N + i] * V[p * N + i];
              for (let i = 0; i < N; i++) V[k * N + i] -= dot * V[p * N + i];
            }
            let n2 = 0;
            for (let i = 0; i < N; i++) n2 += V[k * N + i] * V[k * N + i];
            const inv = 1 / Math.sqrt(n2 || 1);
            for (let i = 0; i < N; i++) V[k * N + i] *= inv;
          }
        }
        const out = new Float32Array(N * M);
        for (let n = 0; n < M; n++) {
          let nrm = 0;
          for (let j = 0; j < N; j++) {
            const v = V[n * N + j];
            out[n * N + j] = v * v;
            nrm += v * v;
          }
          nrm = nrm || 1;
          for (let j = 0; j < N; j++) out[n * N + j] /= nrm;
        }
        return out;
      }

      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        const periodic = s.bc === 'periodic';
        const cleanOpen = s.disorder < 0.04 && !periodic;
        if (cleanOpen) amp = exactModes(W, H, s.g);
        else if (s.solver === 'gram') amp = disorderedModes(W, H, s.g, s.disorder, s.seed, periodic);
        else {
          const pot = onsite(W, s.disorder, s.seed);
          amp = periodic ? periodicRight(W, H, s.g, pot) : openRight(W, H, s.g, pot);
        }
        const cut = Math.max(2, Math.floor(W * 0.9));
        let w = 0, p = 0;
        for (let n = 0; n < H; n++) {
          let right = 0, ip = 0;
          for (let j = 0; j < W; j++) {
            const a = amp[n * W + j];
            ip += a * a;
            if (j >= cut) right += a;
          }
          w += right;
          p += ip;
        }
        skinW = w / H;
        ipr = p / H;
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function paint() {
        if (!amp) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#121110', '#F25C05', '#FFF3D6'];
        const ramp = U.makeRamp(pal, s.bg || '#121110');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const gam = isFinite(s.gamma) && s.gamma > 0 ? s.gamma : 1;
        const view = s.view;
        if (view === 'sum') {
          const dens = new Float32Array(W);
          for (let n = 0; n < H; n++) for (let j = 0; j < W; j++) dens[j] += amp[n * W + j];
          let lo = Infinity, hi = -Infinity;
          for (let j = 0; j < W; j++) { if (dens[j] < lo) lo = dens[j]; if (dens[j] > hi) hi = dens[j]; }
          const span = (hi - lo) || 1;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const t = U.clamp(Math.pow(Math.max(0, (dens[x] - lo) / span), gam) * exp, 0, 1);
              const c = ramp(isFinite(t) ? t : 0);
              const o = (y * W + x) * 4;
              data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
            }
          }
        } else {
          const logv = view === 'log';
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < amp.length; i++) {
            const v = logv ? Math.log(1e-12 + amp[i]) : amp[i];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          const span = (hi - lo) || 1;
          for (let i = 0; i < amp.length; i++) {
            const raw = logv ? Math.log(1e-12 + amp[i]) : amp[i];
            const t = U.clamp(Math.pow(Math.max(0, (raw - lo) / span), gam) * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0);
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#121110';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      // On the clean open chain the rows are the closed-form modes e^{gj} sin(k j), so the weight on the
      // last tenth follows from the formula that drew them. Disorder and periodic ends use the right
      // eigenvectors from recipe v8. Gram–Schmidt, kept for older recipes, is an orthonormal basis,
      // so that weight is printed with the caveat and no reference.
      function status(s) {
        const exact = s.disorder < 0.04 && s.bc !== 'periodic';
        const gram = !exact && s.solver === 'gram';
        const legacyRows = s.rows === 'sheet';
        const verdict = s.bc === 'periodic' ? (skinW > 0.35 ? 'skin leaked' : 'no skin') : (skinW > 0.45 ? 'skinned' : (s.g < 0.01 ? 'Hermitian' : 'partial'));
        host.setStatus(
          '<span>chain <b>' + W + '</b> · ' + (legacyRows ? 'sheet rows' : 'modes') + ' <b>' + H + '</b></span>' +
          (legacyRows ? '<span>before v8: rows follow the sheet, so a tall sheet repeats modes</span>' : '') +
          (exact
            ? U.stats.compare({ label: 'skin weight', measured: skinW, basis: 'construction', digits: 3, note: 'closed-form modes' })
            : gram
              ? U.stats.compare({ label: 'skin weight', measured: skinW, basis: 'sampled', digits: 3,
                  pending: 'Gram–Schmidt basis is orthonormal, not the right eigenvectors' })
              : U.stats.compare({ label: 'skin weight', measured: skinW, basis: 'deterministic', digits: 3, note: 'right eigenvectors' })) +
          '<span>' + verdict + '</span>'
        );
        void ipr;
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(host.getState()); },
        repaint() { paint(); status(host.getState()); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#121110';
          g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
