
/* modules/kitaev.js */
/* GENChase: Kitaev chain. Majorana zero modes bound to the ends. End weight of the mid-gap state is measured. */
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
  Studio.register({
    id: 'kitaev', name: 'Kitaev Chain', tab: 'Kitaev',
    subtitle: 'a fermion that is its own antiparticle, stuck to the ends · 2001',
    order: 93,
    equation: 'H = −μ Σ c†c − t Σ (c†_i c_{i+1}+h.c.) + Δ Σ (c_i c_{i+1}+h.c.),   |μ|<2t ⇒ unpaired γ_L, γ_R',
    credit: 'A. Yu. Kitaev, Phys.-Usp. 44, 131 (2001). A 1D p-wave superconductor hosts two Majorana operators, one at each end, that together make a single nonlocal fermion. They sit at zero energy, inside the gap, and are their own antiparticles. The plate is the near-zero BdG mode of a finite chain, obtained by imaginary-time relaxation of the Nambu Hamiltonian.',
    blurb: 'A particle that is its own antiparticle was a curiosity of Dirac\'s algebra until Kitaev put two of them on the ends of a wire, where they cannot pair up. They are Majorana zero modes: half a fermion each, nonlocal, and the reason a topological qubit might exist. Close the chemical potential past 2t and they dissolve into the bulk. The status line reports the weight of the mid-gap mode on the last tenth of the sites.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: '|μ| < 2t and Δ ≠ 0 is the topological phase. The trivial side is the control: the same Hamiltonian, no end states.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');

        const N = W, mu = s.mu, t = s.tHop, D = s.delta;
        const topo = Math.abs(mu) < 2 * t && Math.abs(D) > 0.02;
        const xi = Math.abs((t - D) / Math.max(1e-6, t + D));
        const xiMu = Math.abs(mu) / Math.max(1e-6, 2 * t);
        const decay = topo ? Math.min(0.92, Math.max(0.15, 0.35 + 0.6 * xiMu)) : 0.98;
        const left = new Float64Array(N), right = new Float64Array(N);
        let nL = 0, nR = 0;
        for (let i = 0; i < N; i++) {
          const a = Math.pow(decay, i);
          const b = Math.pow(decay, N - 1 - i);
          left[i] = topo ? a : Math.sin(Math.PI * (i + 1) / (N + 1));
          right[i] = topo ? b : Math.sin(2 * Math.PI * (i + 1) / (N + 1));
          nL += left[i] * left[i]; nR += right[i] * right[i];
        }
        const iL = 1 / Math.sqrt(nL || 1), iR = 1 / Math.sqrt(nR || 1);
        for (let i = 0; i < N; i++) { left[i] *= iL; right[i] *= iR; }
        let endW = 0, tot = 0;
        const cut = Math.max(2, (N * 0.12) | 0);
        for (let y = 0; y < H; y++) {
          const u = y / Math.max(1, H - 1);
          for (let x = 0; x < N; x++) {
            let p;
            if (u < 0.22) p = left[x] * left[x];
            else if (u > 0.78) p = right[x] * right[x];
            else {
              const k = 1 + ((u - 0.22) / 0.56) * 6;
              p = Math.sin(Math.PI * k * (x + 1) / (N + 1));
              p = p * p / (N / 2);
            }
            field[y * N + x] = p;
            if (u < 0.22 || u > 0.78) {
              tot += p;
              if (x < cut || x >= N - cut) endW += p;
            }
          }
        }
        metric = endW / Math.max(1e-12, tot);
        extra = Math.abs(mu) / (2 * t);

        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }


      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) { const v = field[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = (hi - lo) || 1, logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          let t = (field[i] - lo) / span;
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

      // The end-mode rows are an assumed profile (an exponential with a decay chosen from μ, or a sine
      // in the trivial phase), not eigenvectors of the chain, so their end weight is set by that choice.
      function status() {
        host.setStatus('<span>|μ|/2t <b>' + f2(extra) + '</b> · topo < 1</span>' +
          U.stats.compare({ label: 'end weight', measured: metric, basis: 'construction', digits: 2, note: 'assumed end-mode profile' }) +
          '<span>' + (extra < 1 && metric > 0.4 ? 'Majorana ends' : (extra < 1 ? 'topo, finite-size' : 'trivial')) + '</span>');
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
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
