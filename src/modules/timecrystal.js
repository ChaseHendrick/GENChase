
/* modules/timecrystal.js */
/* GENChase: a classical Floquet Ising chain. A near-π pulse plus disordered Ising interactions. The plate is spacetime. Subharmonic order is measured from the magnetisation. */
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
    RANGE('Chain', 'grid', 'Sites', GEOM, 64, 320, 16, v => v + ''),
    { group: 'Chain', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Drive', 'eps', 'Pulse error ε', GEOM, 0, 0.45, 0.005, f3, { hint: 'ε = 0 is a perfect π pulse: every spin flips every period. Watanabe and Oshikawa forbade a time crystal in equilibrium. A small ε still period-doubles if the Ising glass is rigid.' }),
    RANGE('Drive', 'J', 'Ising J', GEOM, 0, 2.4, 0.05, f2),
    RANGE('Drive', 'disorder', 'Disorder W', GEOM, 0, 3.2, 0.05, f2),
    RANGE('Drive', 'temp', 'After-pulse T', GEOM, 0.02, 2.4, 0.02, f2),
    RANGE('Drive', 'sweeps', 'Sweeps / period', GEOM, 1, 12, 1, v => v + ''),
    RANGE('Drive', 'warmup', 'Discarded periods', GEOM, 0, 200, 4, v => v + ''),
    { group: 'Seed', key: 'init', label: 'Seed', type: 'seg', kind: GEOM, options: [['polar', 'All up'], ['stagger', 'Néel'], ['domain', 'Domain'], ['noise', 'Hot']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['spacetime', 'Spacetime'], ['strobe', 'Even − odd'], ['order', 'Subharmonic m₂']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 160, aspect: '4:5',
    eps: 0.04, J: 1.1, disorder: 0.25, temp: 0.18, sweeps: 2, warmup: 12,
    init: 'polar', view: 'spacetime', exposure: 1,
  };

  const PRESETS = {
    rigid: pre('Rigid DTC', { eps: 0.02, J: 1.4, disorder: 0.15, temp: 0.1, sweeps: 2, init: 'polar', view: 'spacetime' }, Pal.nightshade),
    melt: pre('Thermalised', { eps: 0.28, J: 0.4, disorder: 0.2, temp: 1.8, sweeps: 6, init: 'noise', view: 'spacetime' }, Pal.graphite),
    neel: pre('Néel seed', { init: 'stagger', eps: 0.05, J: 1.2, disorder: 0.2, view: 'strobe' }, Pal.ember),
    domain: pre('Domain wall', { init: 'domain', eps: 0.03, J: 1.3, disorder: 0.2, view: 'spacetime' }, Pal.harbor),
    prethermal: pre('Prethermal', { eps: 0.08, J: 0.85, disorder: 0.15, temp: 0.35, warmup: 4, sweeps: 1, view: 'spacetime' }, Pal.kiln),
    order: pre('m₂ map', { eps: 0.04, view: 'order', J: 1.2, disorder: 0.2, temp: 0.15 }, Pal.thermal),
    clean: pre('No disorder', { disorder: 0, eps: 0.01, J: 1.5, temp: 0.08, sweeps: 2, view: 'spacetime' }, Pal.xray),
  };

  function surprise(rng) {
    return {
      eps: rng.range(0.01, 0.18),
      J: rng.range(0.6, 1.6),
      disorder: rng.range(0.3, 2.2),
      init: rng.pick(['polar', 'polar', 'stagger', 'domain', 'noise']),
      view: rng.pick(['spacetime', 'spacetime', 'strobe']),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(64, Math.min(320, Math.round(s.grid / 16) * 16));
    s.eps = U.clamp(s.eps, 0, 0.49);
    s.temp = Math.max(0.01, s.temp);
  }

  Studio.register({
    id: 'timecrystal',
    name: 'Time Crystal',
    tab: 'Time crystal',
    subtitle: 'Floquet Ising chain, period doubled · 2012 / 2016',
    order: 45,
    equation: 'U(T) = exp(−i T H_Ising) · exp(−i π(1−ε) Σ X_i),   m₂ = ⟨(−1)^n m(nT)⟩',
    credit: 'Frank Wilczek, Phys. Rev. Lett. 109, 160401 (2012), named the time crystal. Watanabe and Oshikawa, Phys. Rev. Lett. 114, 251603 (2015), proved an equilibrium one cannot exist. Else, Bauer and Nayak, Phys. Rev. Lett. 117, 090402 (2016), and Khemani, Lazarides, Moessner and Sondhi, Phys. Rev. Lett. 116, 250401 (2016), showed a periodically driven, many-body-localised spin chain can still lock at twice the drive period. Zhang et al., Nature 543, 217 (2017), saw it in trapped ions. This plate is the classical Floquet-Ising analog of that chain, not a quantum register.',
    blurb: 'A theorem says a clock cannot spontaneously tick in thermal equilibrium: time-translation symmetry does not break the way a crystal breaks space. Drive the chain instead. Each period a near-π pulse tries to flip every spin, then a disordered Ising glass tries to freeze them. The rigid glass remembers the extra minus sign, so the magnetisation comes back only every two drives. The plate is that spacetime. The status line reports the subharmonic order m₂ against 1 for a perfect period-doubled crystal and 0 for a melted one.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Picture'],
    hints: {
      Drive: 'ε is how wrong the π pulse is. Disorder W is what stops the chain absorbing the drive and thermalising. Below a few hundred periods a weakly disordered chain can still look crystalline: that is prethermal, not a phase.',
    },
    palette: true,
    defaultPalette: 'nightshade',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, mag, m2 = 0, m2Stat = null, mAbs = 0, buf, img;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * aspect)) };
      }

      function seedSpins(s, n, rng) {
        const sp = new Int8Array(n);
        if (s.init === 'stagger') {
          for (let i = 0; i < n; i++) sp[i] = i & 1 ? 1 : -1;
        } else if (s.init === 'domain') {
          for (let i = 0; i < n; i++) sp[i] = i < n / 2 ? 1 : -1;
        } else if (s.init === 'noise') {
          for (let i = 0; i < n; i++) sp[i] = rng() < 0.5 ? 1 : -1;
        } else {
          for (let i = 0; i < n; i++) sp[i] = 1;
        }
        return sp;
      }

      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        const rng = U.makeRng(s.seed + '/floquet');
        // A thin 2-D strip. 1-D Ising cannot hold a magnetisation at any T>0,
        // so a 1-D classical chain always "melts" and cannot show a time crystal.
        const Ly = 24;
        const n = W * Ly;
        const h = new Float32Array(n);
        const Wd = s.disorder;
        for (let i = 0; i < n; i++) h[i] = Wd * rng.gauss();
        const sp = seedSpins(s, n, rng);
        const at = (x, y) => ((y + Ly) % Ly) * W + ((x + W) % W);
        function period() {
          const J = s.J, T = s.temp, eps = s.eps;
          for (let i = 0; i < n; i++) if (rng() > eps) sp[i] = -sp[i];
          const sweeps = s.sweeps | 0;
          for (let sw = 0; sw < sweeps; sw++) {
            for (let y = 0; y < Ly; y++) {
              for (let x = 0; x < W; x++) {
                const i = at(x, y);
                const nb = sp[at(x - 1, y)] + sp[at(x + 1, y)] + sp[at(x, y - 1)] + sp[at(x, y + 1)];
                const dE = 2 * sp[i] * (J * nb + h[i]);
                if (dE <= 0 || rng() < Math.exp(-dE / T)) sp[i] = -sp[i];
              }
            }
          }
        }
        const warm = s.warmup | 0;
        for (let t = 0; t < warm; t++) period();
        field = new Float32Array(W * H);
        mag = new Float32Array(H);
        const yCut = (Ly / 2) | 0;
        let acc2 = 0, accA = 0;
        for (let t = 0; t < H; t++) {
          let m = 0;
          for (let x = 0; x < W; x++) {
            const v = sp[at(x, yCut)];
            field[t * W + x] = v;
            m += v;
          }
          m /= W;
          mag[t] = m;
          acc2 += (t & 1 ? -1 : 1) * m;
          accA += Math.abs(m);
          period();
        }
        m2 = acc2 / H;
        mAbs = accA / H;
        // m2 is the mean over H periods of (-1)^t m(t). Successive periods are correlated, so its
        // standard error uses the integrated autocorrelation time of that series, not sd / sqrt(H).
        const staggered = new Float64Array(H);
        for (let t = 0; t < H; t++) staggered[t] = (t & 1 ? -1 : 1) * mag[t];
        m2Stat = U.stats.seriesMean(staggered);
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#17141F', '#C084FC', '#E6E1F5'];
        const ramp = U.makeRamp(pal, s.bg || '#17141F');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const view = s.view;
        if (view === 'strobe') {
          for (let y = 0; y < H; y++) {
            const sgn = y & 1 ? -1 : 1;
            for (let x = 0; x < W; x++) {
              const t = U.clamp(0.5 + 0.5 * field[y * W + x] * sgn * exp, 0, 1);
              const c = ramp(isFinite(t) ? t : 0.5);
              const o = (y * W + x) * 4;
              data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
            }
          }
        } else if (view === 'order') {
          for (let y = 0; y < H; y++) {
            const local = mag[y] * (y & 1 ? -1 : 1);
            for (let x = 0; x < W; x++) {
              const t = U.clamp(0.5 + 0.5 * field[y * W + x] * (local >= 0 ? 1 : -1) * exp, 0, 1);
              const c = ramp(isFinite(t) ? t : 0.5);
              const o = (y * W + x) * 4;
              data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
            }
          }
        } else {
          for (let i = 0; i < field.length; i++) {
            const t = U.clamp(0.5 + 0.5 * field[i] * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0.5);
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#17141F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        const rigid = Math.abs(m2) >= 0.45;
        const st = m2Stat || { se: NaN, reliable: false };
        const m2Span = U.stats.compare(H < 20
          ? { label: 'm₂', measured: m2, basis: 'sampled', pending: 'fewer than 20 periods', digits: 3 }
          : st.se > 0
            ? { label: 'm₂', measured: m2, basis: 'sampled', uncertainty: st.se, method: 'τ_int over ' + H + ' periods of one row',
              note: st.reliable ? '' : 'series shorter than 50 τ_int' }
            : { label: 'm₂', measured: m2, basis: 'sampled', pending: 'no fluctuation over ' + H + ' periods', digits: 3 });
        host.setStatus(
          '<span>chain <b>' + W + '</b> · periods <b>' + H + '</b></span>' +
          m2Span + '<span>|m| ' + f3(mAbs) + '</span>' +
          '<span>' + (rigid ? 'period-doubled' : (Math.abs(m2) < 0.12 ? 'melted' : 'prethermal')) + '</span>'
        );
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
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#17141F';
          g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
