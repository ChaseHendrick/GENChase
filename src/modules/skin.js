
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
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['modes', '|ψ_n(x)|'], ['log', 'log |ψ|'], ['sum', 'Density of states']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
    RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.3, 1.6, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 96, aspect: '4:5',
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
    blurb: 'Hermitian eigenmodes of a chain spread, or they Anderson-localise at a random site. They do not all move to the same end. Give the hop a direction — right hop e^g, left hop e^{−g} — and a similarity transform maps the whole spectrum onto ordinary cosine bands while every right eigenvector is multiplied by e^{g j}. Open the ends and the pile-up is visible: the plate is |ψ_n(x)|, mode index down the page. The status line reports the weight on the last tenth of the chain. Periodic boundaries secretly restore Hermiticity-up-to-a-gauge and the skin vanishes, which the plate will say.',
    schema: SCHEMA,
    defaults: DEFAULTS,
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
        return { W: g, H: Math.max(32, Math.round(g * aspect)) };
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
        if (s.disorder < 0.04 && !periodic) amp = exactModes(W, H, s.g);
        else amp = disorderedModes(W, H, s.g, s.disorder, s.seed, periodic);
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
      // last tenth follows from the formula that drew them. With disorder or periodic ends the rows come
      // from subspace iteration with Gram-Schmidt, which returns an orthonormal basis rather than the
      // right eigenvectors, so the number is printed with that caveat and no reference.
      function status(s) {
        const exact = s.disorder < 0.04 && s.bc !== 'periodic';
        const verdict = s.bc === 'periodic' ? (skinW > 0.35 ? 'skin leaked' : 'no skin') : (skinW > 0.45 ? 'skinned' : (s.g < 0.01 ? 'Hermitian' : 'partial'));
        host.setStatus(
          '<span>chain <b>' + W + '</b> · modes <b>' + H + '</b></span>' +
          (exact
            ? U.stats.compare({ label: 'skin weight', measured: skinW, basis: 'construction', digits: 3, note: 'closed-form modes' })
            : U.stats.compare({ label: 'skin weight', measured: skinW, basis: 'sampled', digits: 3,
                pending: 'Gram–Schmidt basis is orthonormal, not the right eigenvectors' })) +
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
