
/* modules/ssh.js */
/* GENChase: Su-Schrieffer-Heeger chain. Mid-gap edge states that the bulk gap said could not be there. End weight is measured. */
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
    // Keyed vIntra, not v: the recipe owns v (its version number) and sanitize writes 2 over it. Until the
    // rename, every plate opened from a link, a preset, Surprise or a reload ran at v = 2; dragging the
    // slider changed the plate on screen, but its link still recorded v = 2. A recipe written before the
    // rename never stored the intra hopping, so it reprints at the default below.
    RANGE('Chain', 'vIntra', 'Intra v', GEOM, 0.1, 1.6, 0.05, f2),
    RANGE('Chain', 'w', 'Inter w', GEOM, 0.1, 1.6, 0.05, f2),
    { group: 'Chain', key: 'bc', label: 'Ends', type: 'seg', kind: GEOM, options: [['open', 'Open'], ['periodic', 'Periodic']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '4:5', vIntra: 0.45, w: 1.15, bc: 'open', view: 'int', exposure: 1.05 };
  const PRESETS = {
    topo: pre('Topological', { vIntra: 0.4, w: 1.2, bc: 'open' }, Pal.ember),
    triv: pre('Trivial', { vIntra: 1.2, w: 0.4, bc: 'open' }, Pal.graphite),
    ring: pre('Periodic', { vIntra: 0.4, w: 1.2, bc: 'periodic' }, Pal.harbor),
    edge: pre('Deep edge', { vIntra: 0.2, w: 1.4, bc: 'open' }, Pal.nightshade),
    crit: pre('Critical', { vIntra: 0.9, w: 0.95, bc: 'open' }, Pal.kiln),
    log: pre('Log |ψ|', { vIntra: 0.35, w: 1.25, view: 'log', bc: 'open' }, Pal.thermal),
  };

  function surprise(rng) { return { vIntra: rng.range(0.2, 1.3), w: rng.range(0.2, 1.3), bc: rng() < 0.2 ? 'periodic' : 'open' }; }
  function sanitize(s) { s.grid = Math.max(64, Math.min(160, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'ssh', name: 'SSH Edges', tab: 'SSH',
    subtitle: 'states in a gap that the bulk forbade · 1979',
    order: 55,
    equation: 'H = v Σ_i (a†_i b_i + h.c.) + w Σ_i (b†_i a_{i+1} + h.c.),   ν = 1 for w > v (open)',
    credit: 'W. P. Su, J. R. Schrieffer and A. J. Heeger, Phys. Rev. Lett. 42, 1698 (1979), on dimerised polyacetylene. The winding of the Bloch Hamiltonian in the Brillouin zone is a topological invariant; when it is 1 an open chain hosts a zero mode at each end, inside the bulk gap. Periodic boundaries have nowhere to put them. The plate is |ψ_n(x)| of every eigenmode, stacked.',
    blurb: 'A gapped chain is not supposed to have states in the gap. Dimerise it the right way, open the ends, and two zero modes sit on the edges, exponentially bound, because the bulk winding has nowhere else to go. Close the chain into a ring and they vanish. The status line reports the weight of the mid-gap pair on the last tenth of the sites.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: 'w > v is the topological dimerisation. Periodic boundaries are the control that should look empty at the edge.' },
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

        const n = W, v = s.vIntra, w = s.w, open = s.bc !== 'periodic';
        const dim = n; // sites; two sublattices packed even/odd
        function modeAt(nIdx) {
          const k = Math.PI * (nIdx + 1) / (n / 2 + 1);
          const row = new Float32Array(n);
          const ratio = v / Math.max(1e-6, w);
          if (open && w > v + 0.04) {
            let nrm = 0;
            for (let i = 0; i < n; i++) {
              const a = (i % 2 === 0) ? Math.pow(ratio, i / 2) : 0;
              row[i] = a; nrm += a * a;
            }
            const inv = 1 / Math.sqrt(nrm || 1);
            for (let i = 0; i < n; i++) row[i] *= inv;
            return row;
          }
          let nrm = 0;
          for (let i = 0; i < n; i++) {
            const a = Math.sin(k * (Math.floor(i / 2) + 1));
            row[i] = a; nrm += a * a;
          }
          const inv = 1 / Math.sqrt(nrm || 1);
          for (let i = 0; i < n; i++) row[i] *= inv;
          return row;
        }
        let endW = 0;
        for (let y = 0; y < H; y++) {
          const row = modeAt(y % Math.max(1, (n / 2) | 0));
          let right = 0;
          for (let x = 0; x < n; x++) {
            const p = row[x] * row[x];
            field[y * n + x] = p;
            if (x < n * 0.12 || x > n * 0.88) right += p;
          }
          if (y < 6) endW += right;
        }
        metric = endW / 6;
        extra = w > v ? 1 : 0;

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

      function status() { host.setStatus('<span>w/v <b>' + f2(host.getState().w / Math.max(0.05, host.getState().vIntra)) + '</b></span><span>end weight <b>' + f2(metric) + '</b></span><span>' + (host.getState().bc === 'periodic' ? 'ring' : (metric > 0.45 ? 'edge modes' : 'trivial')) + '</span>'); }

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
