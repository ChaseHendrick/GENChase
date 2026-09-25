
/* modules/apollonian.js */
/* GENChase: Apollonian gasket. Descartes integer curvatures. Packed circles fill a disk, leftover area measured against 0. */
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

  // The Grid slider and sanitize() read the same bounds, so no slider position is clamped away.
  const GRID_MIN = 128, GRID_MAX = 224;
  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Pack', 'depth', 'Generations', GEOM, 3, 10, 1, v => v + ''),
    { group: 'Pack', key: 'kind', label: 'Color', type: 'seg', kind: GEOM, options: [['gen', 'Generation'], ['k', 'Curvature'], ['fill', 'Fill']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', depth: 7, kind: 'gen', view: 'int', exposure: 1 };
  const PRESETS = {
    gasket: pre('Gasket', { depth: 7, kind: 'gen' }, Pal.kiln),
    k: pre('Curvature', { depth: 7, kind: 'k' }, Pal.ember),
    deep: pre('Deep', { depth: 9, kind: 'fill' }, Pal.nightshade),
    coarse: pre('Coarse', { depth: 4, kind: 'gen' }, Pal.harbor),
    fill: pre('Fill', { depth: 8, kind: 'fill' }, Pal.graphite),
    log: pre('Log k', { view: 'log', kind: 'k', depth: 8 }, Pal.thermal),
  };

  function surprise(rng) { return { depth: rng.int(5, 9), kind: rng.pick(['gen','k','fill']) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  // Integer curvature-center coordinates; reflection changes one tangent circle.
  // Initial unit-disk Descartes quadruple has curvatures (-1,2,2,3).
  function apollonianPacking(depth, maxCurvature=160, maxCircles=2000) {
    const seed=[{k:-1,bx:0,by:0,g:0},{k:2,bx:-1,by:0,g:0},{k:2,bx:1,by:0,g:0},{k:3,bx:0,by:2,g:0}];
    const key=c=>[c.k,c.bx,c.by].join('/'), seen=new Set(seed.map(key)), circles=seed.slice();
    const queue=[{q:seed,last:-1,level:0}];let cursor=0,truncated=false;
    while(cursor<queue.length){
      const {q,last,level}=queue[cursor++];if(level>=depth)continue;
      for(let i=0;i<4;i++){
        if(i===last)continue;
        const c={k:-q[i].k,bx:-q[i].bx,by:-q[i].by,g:level+1};
        for(let j=0;j<4;j++)if(j!==i){c.k+=2*q[j].k;c.bx+=2*q[j].bx;c.by+=2*q[j].by;}
        if(c.k<=0||c.k>maxCurvature)continue;
        const id=key(c);if(seen.has(id))continue;
        if(circles.length>=maxCircles){truncated=true;continue;}
        seen.add(id);circles.push(c);const next=q.slice();next[i]=c;queue.push({q:next,last:i,level:level+1});
      }
    }
    return {circles:circles.map(c=>({...c,x:c.bx/c.k,y:c.by/c.k,r:1/Math.abs(c.k)})),truncated};
  }
  Studio.register({
    id: 'apollonian', name: 'Apollonian', tab: 'Apollonian',
    subtitle: 'finite tangent-circle packing · 1643',
    order: 100,
    equation: 'k₄ = k₁+k₂+k₃ ± 2√(k₁k₂+k₁k₃+k₂k₃)   (Descartes),   k ∈ ℤ if the seeds are',
    credit: 'Descartes\' circle theorem (1643, in a letter to Princess Elisabeth of the Palatinate) gives the fourth curvature from three mutually tangent circles. The Apollonian gasket iterates that packing to infinity. Soddy (1936) wrote the poem; Graham, Lagarias, Mallows, Wilks and Yan (2003) proved the integer curvatures are a well-defined subset of the integers. The plate is a finite generation of the packing inside a disk of curvature −1.',
    blurb: 'Four mutually tangent circles determine a fifth, and a sixth, without end. Start with integer curvatures and every new circle has an integer curvature too. The leftover area goes to zero; the gasket has Hausdorff dimension about 1.306. The status gives the unfilled area of the finite displayed circles, calculated from their radii. A finite generation has a nonzero gap. Curvatures are integers in unit-outer-radius coordinates; pixel radii need not be integers.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Pack: 'Reflect the (-1,2,2,3) tangent-circle seed. Stop at the selected generation, circles smaller than 0.6 grid cells, or 2,000 circles. The outer unit circle has curvature −1; no adjustable seed-curvature control is implemented.' },
    palette: true, defaultPalette: 'kiln', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, integral = false, truncated = false, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');

        const depth = s.depth | 0, kind = s.kind;
        const cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * 0.48;
        field.fill(0);
        const pack = apollonianPacking(depth,R0/.6), all=pack.circles;
        truncated=pack.truncated; integral=all.every(c=>Number.isInteger(c.k));
        for (let i = 0; i < all.length; i++) {
          const c = all[i], g = c.g;
          const circleX=cx+R0*c.x,circleY=cy+R0*c.y;
          const rPix = R0 * c.r;
          const x0 = Math.max(0, (circleX - rPix) | 0), x1 = Math.min(W - 1, (circleX + rPix) | 0);
          const y0 = Math.max(0, (circleY - rPix) | 0), y1 = Math.min(H - 1, (circleY + rPix) | 0);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const dx = x + 0.5 - circleX, dy = y + 0.5 - circleY;
            const rr = Math.hypot(dx, dy);
            if (i === 0) {
              if (rr <= rPix && rr > rPix - 1.2) field[y * W + x] = 0.4;
            } else if (rr <= rPix) {
              let val;
              if (kind === 'k') val = Math.log(1 + Math.abs(c.k));
              else if (kind === 'fill') val = 1;
              else val = 0.2 + 0.8 * (g / Math.max(1, depth));
              if (rr > rPix - 1.1) val += 0.35;
              field[y * W + x] = Math.max(field[y * W + x], val);
            }
          }
        }
        metric = 1 - all.filter(c=>c.k>0).reduce((sum,c)=>sum+c.r*c.r,0);
        extra = all.length;

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

      function status() { host.setStatus('<span>'+(extra|0)+' circles</span><span>finite unfilled area <b>'+(100*metric).toFixed(2)+'%</b></span><span>unit curvatures '+(integral?'integer':'noninteger')+(truncated?' · count cap reached':'')+'</span>'); }

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
