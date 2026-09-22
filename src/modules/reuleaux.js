
/* modules/reuleaux.js */
/* GENChase: Reuleaux triangle. Constant width that is not a circle. Width versus angle is measured against the side length. */
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
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Body', 'R', 'Side R', GEOM, 24, 80, 1, v => v + ''),
    RANGE('Body', 'frames', 'Rotation frames', GEOM, 8, 48, 2, v => v + ''),
    { group: 'Body', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['roll', 'Rotations'], ['shape', 'Shape'], ['width', 'Width rose']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', R: 44, frames: 24, kind: 'roll', view: 'int', exposure: 1 };
  const PRESETS = {
    roll: pre('Rotated overlays', { kind: 'roll', R: 44, frames: 28 }, Pal.kiln),
    shape: pre('Triangle', { kind: 'shape', R: 52 }, Pal.harbor),
    rose: pre('Width rose', { kind: 'width', R: 48 }, Pal.ember),
    fat: pre('Fat', { R: 64, kind: 'shape' }, Pal.nightshade),
    many: pre('Many frames', { frames: 40, kind: 'roll' }, Pal.graphite),
    log: pre('Log', { view: 'log', kind: 'roll' }, Pal.thermal),
  };

  function surprise(rng) { return { R: rng.int(32, 64), frames: rng.int(14, 36), kind: rng.pick(['roll','shape','width']) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  function reuleauxBoundary(R, subdivisions) {
    const vertices = [[0,-R/Math.sqrt(3)],[R/2,R/(2*Math.sqrt(3))],[-R/2,R/(2*Math.sqrt(3))]], points=[];
    for(let i=0;i<3;i++) {
      const c=vertices[i], a=vertices[(i+1)%3], b=vertices[(i+2)%3];
      const start=Math.atan2(a[1]-c[1],a[0]-c[0]);
      let turn=Math.atan2(b[1]-c[1],b[0]-c[0])-start;
      turn=Math.atan2(Math.sin(turn),Math.cos(turn));
      for(let j=0;j<=subdivisions;j++){const t=start+turn*j/subdivisions;points.push([c[0]+R*Math.cos(t),c[1]+R*Math.sin(t)]);}
    }
    return points;
  }
  function supportWidth(points, angle) {
    const c=Math.cos(angle),s=Math.sin(angle);let lo=Infinity,hi=-Infinity;
    for(const p of points){const z=c*p[0]+s*p[1];lo=Math.min(lo,z);hi=Math.max(hi,z);}return hi-lo;
  }
  Studio.register({
    id: 'reuleaux', name: 'Reuleaux', tab: 'Reuleaux',
    subtitle: 'a non-circle of constant width · 1875',
    order: 99,
    equation: 'width(θ) = R  for all θ,   W ≠ a disk,   area = ½(π − √3) R²',
    credit: 'F. Reuleaux, The Kinematics of Machinery (Kennedy translation, 1876), described the curved triangle of constant width now named for him. The intersection of three radius-R disks centered at an equilateral triangle has constant support width R. The plate shows this body, rotated overlays or a sampled support-width rose.',
    blurb: 'A Reuleaux triangle has constant width despite being noncircular. Width is measured from sampled circular boundary arcs, not from the underlying straight triangle. The displayed variation is a finite-sampling error, bounded by the angular chord spacing. Rotated overlays are geometric poses, not a no-slip rolling or square-drilling mechanism.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Body: 'Rotations stack copies of the same body. The width rose uses 720 samples on each curved arc; its finite sampling differs slightly from the exact width R. Large bodies on narrow sheets may be cropped; R is measured in field cells.' },
    palette: true, defaultPalette: 'kiln', surprise, sanitize,
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

        const R = s.R, nF = s.frames | 0, kind = s.kind;
        const cx = W / 2, cy = H / 2;
        field.fill(0);
        const v0 = [0, -R / Math.sqrt(3)], v1 = [R / 2, R / (2 * Math.sqrt(3))], v2 = [-R / 2, R / (2 * Math.sqrt(3))];
        function rot(p, ang) {
          const c = Math.cos(ang), s2 = Math.sin(ang);
          return [p[0] * c - p[1] * s2, p[0] * s2 + p[1] * c];
        }
        function splat(x, y, w) {
          const xi = Math.round(x), yi = Math.round(y);
          if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += w;
        }
        function inReuleaux(p, verts) {
          const d0 = Math.hypot(p[0] - verts[0][0], p[1] - verts[0][1]);
          const d1 = Math.hypot(p[0] - verts[1][0], p[1] - verts[1][1]);
          const d2 = Math.hypot(p[0] - verts[2][0], p[1] - verts[2][1]);
          return d0 <= R && d1 <= R && d2 <= R;
        }
        const boundary = reuleauxBoundary(R, 720), widths = [];
        for (let a = 0; a < 180; a++) {
          const ang = (a + .137) * Math.PI / 180, width = supportWidth(boundary, ang); widths.push(width);
          if (kind === 'width') {
            const rr = .35 * Math.min(W,H) * width / R;
            splat(cx+rr*Math.cos(ang),cy+rr*Math.sin(ang),2);
            splat(cx-rr*Math.cos(ang),cy-rr*Math.sin(ang),2);
          }
        }
        if (kind !== 'width') {
          const frames = kind === 'shape' ? 1 : nF;
          for (let f = 0; f < frames; f++) {
            const ang = f / frames * Math.PI * 2 / 3;
            const verts = [rot(v0,ang),rot(v1,ang),rot(v2,ang)];
            for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inReuleaux([x+.5-cx,y+.5-cy],verts)) field[y*W+x] += kind==='shape'?1:.35;
          }
        }
        let mean = 0; for (let i = 0; i < widths.length; i++) mean += widths[i];
        mean /= Math.max(1, widths.length);
        let varw = 0; for (let i = 0; i < widths.length; i++) varw += (widths[i] - mean) * (widths[i] - mean);
        metric = Math.sqrt(varw / Math.max(1, widths.length)) / Math.max(1e-6, mean);
        extra = mean;

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

      function status() {
        const s = host.getState(), R = s.R;
        const bound = 2 * R * (1 - Math.cos(Math.PI / (6 * 720)));
        const roundoff = 1e-12 * R;
        const mayCrop = s.kind !== 'width' && R / Math.sqrt(3) > Math.min(W, H) / 2;
        host.setStatus('<span>sampled mean width <b>' + extra.toFixed(6) + '</b> cells · exact ' + R +
          '</span><span>deficit ' + (R - extra).toExponential(3) + ' · sampling bound ' + bound.toExponential(3) +
          '</span><span>relative spread ' + metric.toExponential(2) + '</span>' +
          (mayCrop ? '<span>body may be cropped by the field; width check uses the complete mathematical boundary</span>' : ''));
        host.setWitness({ label: 'Boundary sampling regression (not a pixel-width measurement)',
          measured: extra, expected: R, tol: bound + roundoff,
          valid: Number.isFinite(extra) && extra <= R + roundoff && R - extra <= bound + roundoff,
          missWhen: 'Sampled mean exceeds the exact width or its chord-error bound; does not validate printed edge width or rolling physics.' });
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
