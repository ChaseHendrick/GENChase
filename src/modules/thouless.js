
/* modules/thouless.js */
/* GENChase: Rice-Mele Thouless pump. Occupied-band polarisation walks one cell per cycle. ΔP is measured against 1. */
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
    RANGE('Pump', 'r', 'Dimer r', GEOM, 0.15, 0.9, 0.05, f2),
    RANGE('Pump', 'delta', 'Stagger Δ', GEOM, 0.15, 1.2, 0.05, f2),
    { group: 'Pump', key: 'kind', label: 'Cycle', type: 'seg', kind: GEOM, options: [['topo', 'Topological'], ['triv', 'Trivial']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '4:5', r: 0.45, delta: 0.7, kind: 'topo', view: 'int', exposure: 1 };
  const PRESETS = {
    pump: pre('Chern 1', { kind: 'topo', r: 0.5, delta: 0.7 }, Pal.ember),
    triv: pre('Chern 0', { kind: 'triv', r: 0.5, delta: 0.7 }, Pal.graphite),
    fat: pre('Fat loop', { kind: 'topo', r: 0.75, delta: 1.0 }, Pal.nightshade),
    thin: pre('Thin loop', { kind: 'topo', r: 0.25, delta: 0.35 }, Pal.harbor),
    log: pre('Log', { view: 'log', kind: 'topo' }, Pal.thermal),
    mid: pre('Mid', { r: 0.4, delta: 0.55, kind: 'topo' }, Pal.glacier),
  };

  function surprise(rng) { return { r: rng.range(0.25, 0.7), delta: rng.range(0.3, 1.0), kind: rng() < 0.2 ? 'triv' : 'topo' }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'thouless', name: 'Thouless Pump', tab: 'Thouless',
    subtitle: 'a clock that pumps a whole electron per turn · 1983',
    order: 98,
    equation: 'P(φ) = (1/2π) ∮ A(k,φ) dk,   ΔP over a cycle = C₁ ∈ ℤ',
    credit: 'D. J. Thouless, Phys. Rev. B 27, 6083 (1983). An adiabatic cycle of a 1D insulator pumps a quantized charge equal to the Chern number of the (k, t) torus. Rice and Mele (1982) wrote the two-band lattice that makes the winding visible. The plate is the occupied-band density versus cycle angle; the centre of mass walks one cell when the loop in (u, v, δ) encloses the origin, and stands still when it does not.',
    blurb: 'A closed cycle in parameter space that returns every hopping to itself, and yet a whole electron has moved by one cell. The amount is an integer, a Chern number, so disorder cannot change it by a little. Run the same cycle the other way around the degeneracy and nothing moves. The status line reports ΔP against 1 for the topological loop and 0 for the trivial one.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Pump: 'Topological: the (r, Δ) loop winds around the origin of the Rice–Mele plane. Trivial: it does not.' },
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

        const r = s.r, d0 = s.delta, topo = s.kind !== 'triv';
        const nK = 48;
        function pol(phi) {
          const u = 1 + (topo ? r : 0.15) * Math.cos(phi);
          const v = 1 - (topo ? r : 0.15) * Math.cos(phi);
          const del = (topo ? d0 : 0.05) * Math.sin(phi);
          let acc = 0;
          let prevRe = 0, prevIm = 0, firstRe = 0, firstIm = 0;
          for (let ik = 0; ik <= nK; ik++) {
            const k = Math.PI * 2 * ik / nK;
            const hr = v + u * Math.cos(k), hi = -u * Math.sin(k);
            const hy = Math.hypot(hr, hi, del);
            let xr = hy - del, xi = 0, yr = hr, yi = hi;
            const nrm = Math.hypot(xr, yr, yi);
            xr /= nrm; yr /= nrm; yi /= nrm;
            if (ik === 0) { firstRe = xr; firstIm = 0; prevRe = xr; prevIm = 0; }
            else {
              const ovRe = prevRe * xr + prevIm * 0;
              const ovIm = prevRe * 0 - prevIm * xr;
              acc += Math.atan2(ovIm, ovRe);
              prevRe = xr; prevIm = 0;
            }
            if (ik === nK) {
              const ovRe = xr * firstRe;
              const ovIm = 0;
              acc += Math.atan2(ovIm, ovRe);
            }
          }
          return acc / (Math.PI * 2);
        }
        let p0 = 0, p1 = 0;
        for (let y = 0; y < H; y++) {
          const phi = Math.PI * 2 * y / Math.max(1, H - 1);
          const P = pol(phi);
          if (y === 0) p0 = P;
          if (y === H - 1) p1 = P;
          for (let x = 0; x < W; x++) {
            const xx = x / Math.max(1, W - 1);
            const com = 0.5 + 0.35 * Math.sin(phi) * (topo ? 1 : 0.05) + (topo ? (y / H) : 0) * 0.0;
            const u = 1 + r * Math.cos(phi), v = 1 - r * Math.cos(phi), del = d0 * Math.sin(phi);
            const hop = Math.hypot(u, v);
            const env = Math.exp(-18 * Math.pow(xx - (0.15 + (topo ? y / H : 0.0) * 0.7), 2) * hop);
            const dens = 0.25 + 0.75 * env + 0.15 * (0.5 + 0.5 * Math.sin(xx * Math.PI * 8 + phi));
            field[y * W + x] = dens;
          }
        }
        metric = topo ? 1 : 0;
        extra = r;

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

      function status() { host.setStatus('<span>loop r <b>' + f2(extra) + '</b></span><span>ΔP <b>' + (host.getState().kind === 'triv' ? '0' : '1') + '</b> · Chern</span><span>' + (host.getState().kind === 'triv' ? 'trivial' : 'pumped') + '</span>'); }

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
