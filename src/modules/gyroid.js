
/* modules/gyroid.js */
/* GENChase: Trigonometric nodal approximation to the Schoen gyroid; it is not exactly minimal. */
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
    RANGE('Surface', 'z0', 'Slice z', GEOM, 0, 6.28, 0.05, f2),
    RANGE('Surface', 'scale', 'Scale', GEOM, 1, 6, 0.1, f2),
    RANGE('Surface', 'iso', 'Level', GEOM, -0.8, 0.8, 0.05, f2),
    { group: 'Surface', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['level', 'Level set'], ['field', 'Field'], ['abs', '|F|']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', z0: 0.8, scale: 2.4, iso: 0, kind: 'level', view: 'int', exposure: 1 };
  const PRESETS = {
    slice: pre('Slice', { kind: 'level', z0: 0.6, scale: 2.6 }, Pal.verdigris),
    field: pre('Field', { kind: 'field', scale: 2.2 }, Pal.harbor),
    dense: pre('Dense', { scale: 4.2, kind: 'level' }, Pal.kiln),
    abs: pre('|F|', { kind: 'abs', scale: 2.8 }, Pal.ember),
    shift: pre('Offset z', { z0: 2.2, scale: 2.5, kind: 'level' }, Pal.nightshade),
    iso: pre('Iso 0.3', { iso: 0.3, kind: 'level', scale: 3 }, Pal.glacier),
  };

  function surprise(rng) { return { z0: rng.range(0, 6), scale: rng.range(1.6, 4.5), kind: rng.pick(['level','field','abs']) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  function nodalMeanCurvature(x, y, z) {
    const sx=Math.sin(x), sy=Math.sin(y), sz=Math.sin(z), cx=Math.cos(x), cy=Math.cos(y), cz=Math.cos(z);
    const g=[cx*cy-sz*sx, cy*cz-sx*sy, cz*cx-sy*sz];
    const xx=-sx*cy-sz*cx, yy=-sx*cy-sy*cz, zz=-sy*cz-sz*cx;
    const xy=-cx*sy, xz=-cz*sx, yz=-cy*sz, g2=g.reduce((sum,v)=>sum+v*v,0);
    if (g2 < 1e-12) return NaN;
    return (g2*(xx+yy+zz)-(g[0]*g[0]*xx+g[1]*g[1]*yy+g[2]*g[2]*zz+2*g[0]*g[1]*xy+2*g[0]*g[2]*xz+2*g[1]*g[2]*yz))/(2*g2**1.5);
  }
  Studio.register({
    id: 'gyroid', name: 'Gyroid', tab: 'Gyroid',
    subtitle: 'a periodic nodal approximation · 1970 / 2001',
    order: 64,
    equation: 'F = sin x cos y + sin y cos z + sin z cos x; F = level; H = ½ div(∇F/|∇F|)',
    credit: 'A. H. Schoen, NASA Technical Note D-5541 (1970), discovered the exact gyroid minimal surface. This module uses a three-term trigonometric nodal approximation, as distinguished from exact minimal geometry by Gandy, Bardhan, Mackay and Klinowski, Chemical Physics Letters 336, 187-195 (2001), doi:10.1016/S0009-2614(00)01418-4.',
    blurb: 'A two-dimensional slice through a triply periodic scalar field. Its zero level approximates the gyroid, but its mean curvature is generally nonzero. The status samples the actual three-dimensional mean curvature in a finite band |F-level|<0.08 around the selected level. It is not an exact-surface average or a minimality test.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Surface: 'Scale packs more unit cells onto the plate. Level 0 is the nodal gyroid approximation; nonzero levels are offset level sets.' },
    palette: true, defaultPalette: 'verdigris', surprise, sanitize,
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

        const z = s.z0, sc = s.scale, iso = s.iso, kind = s.kind;
        let hAcc = 0, nH = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const X = sc * Math.PI * 2 * x / W, Y = sc * Math.PI * 2 * y / H, Z = z;
          const F = Math.sin(X) * Math.cos(Y) + Math.sin(Y) * Math.cos(Z) + Math.sin(Z) * Math.cos(X);
          const Hm = nodalMeanCurvature(X, Y, Z);
          if (Math.abs(F - iso) < 0.08 && Number.isFinite(Hm)) { hAcc += Math.abs(Hm); nH++; }
          let v;
          if (kind === 'field') v = F;
          else if (kind === 'abs') v = Math.abs(F);
          else v = Math.exp(-18 * (F - iso) * (F - iso));
          field[y * W + x] = v;
        }
        metric = hAcc / Math.max(1, nH);
        extra = nH;

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

      function status() { host.setStatus('<span>band mean |H| <b>' + (extra ? f3(metric) : 'no regular samples') + '</b></span><span>samples ' + (extra | 0) + ' · |F-level|&lt;0.08</span><span>nodal approximation · generally nonzero</span>'); }

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
