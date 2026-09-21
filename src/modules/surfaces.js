/* modules/surfaces.js */
/* Classical parametric surfaces, independently implemented from published mathematics. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const f2 = x => x.toFixed(2), degrees = x => Math.round(x) + '°';
  const defaults = { family: 'enneper', extent: 1.35, associate: 0, pitch: 0.2, turns: 2,
    detail: 96, wires: 24, yaw: 25, tilt: 30, roll: 0, aspect: '1:1', weight: 1.1, color: 'parameter' };

  // These are Cartesian coordinates, before the camera and sheet fitting. No mesh relaxation,
  // curvature correction or artist deformation is applied to the published parameter maps.
  function point(s, u, v) {
    if (s.family === 'enneper') return [u - u * u * u / 3 + u * v * v,
      v - v * v * v / 3 + v * u * u, u * u - v * v];
    if (s.family === 'dini') return [Math.cos(u) * Math.sin(v), Math.sin(u) * Math.sin(v),
      Math.cos(v) + Math.log(Math.tan(v / 2)) + s.pitch * u];
    const t = s.associate * Math.PI / 2, c = Math.cos(t), a = Math.sin(t);
    // Isometric associate family cos(t) C + sin(t) H, with the conjugate helicoid coordinates.
    return [c * Math.cosh(v) * Math.cos(u) + a * Math.sinh(v) * Math.sin(u),
      c * Math.cosh(v) * Math.sin(u) - a * Math.sinh(v) * Math.cos(u), c * v + a * u];
  }
  function domain(s) {
    if (s.family === 'enneper') return [-s.extent, s.extent, -s.extent, s.extent];
    // Stay strictly below v = pi/2, where this Dini parameter map loses rank.
    if (s.family === 'dini') return [-Math.PI * s.turns, Math.PI * s.turns, 0.15, 1.4];
    return [-Math.PI, Math.PI, -s.extent, s.extent];
  }
  function mesh(s) {
    const n = s.detail, d = domain(s), vertices = new Float64Array(3 * (n + 1) * (n + 1));
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const p = point(s, d[0] + (d[1] - d[0]) * i / n, d[2] + (d[3] - d[2]) * j / n);
      vertices.set(p, 3 * (j * (n + 1) + i));
    }
    return { n, vertices, domain: d };
  }
  function camera(s) {
    const rng = U.makeRng(String(s.seed) + '/surfaces-view');
    return { yaw: (s.yaw + rng.range(-25, 25)) * Math.PI / 180,
      tilt: (s.tilt + rng.range(-7, 7)) * Math.PI / 180,
      roll: s.roll * Math.PI / 180, offset: rng() };
  }
  function rotate(p, c) {
    const x = Math.cos(c.yaw) * p[0] - Math.sin(c.yaw) * p[1];
    const y = Math.sin(c.yaw) * p[0] + Math.cos(c.yaw) * p[1];
    const up = Math.cos(c.tilt) * p[2] - Math.sin(c.tilt) * y;
    const depth = Math.sin(c.tilt) * p[2] + Math.cos(c.tilt) * y;
    return [Math.cos(c.roll) * x - Math.sin(c.roll) * up,
      Math.sin(c.roll) * x + Math.cos(c.roll) * up, depth];
  }
  function project(m, s, w, h) {
    const c = camera(s), projected = new Float64Array(m.vertices.length);
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let k = 0; k < m.vertices.length; k += 3) {
      const p = rotate(m.vertices.subarray(k, k + 3), c);
      projected.set(p, k);
      xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]);
      ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]);
    }
    const scale = 0.84 * Math.min(w / (xmax - xmin), h / (ymax - ymin));
    for (let k = 0; k < projected.length; k += 3) {
      projected[k] = w / 2 + scale * (projected[k] - (xmin + xmax) / 2);
      projected[k + 1] = h / 2 - scale * (projected[k + 1] - (ymin + ymax) / 2);
    }
    return { vertices: projected, scale, offset: c.offset };
  }
  function drawing(m, s, w, h) {
    const p = project(m, s, w, h), n = m.n, lines = [];
    const ramp = U.makeRamp(s.palette, s.bg);
    for (let axis = 0; axis < 2; axis++) for (let line = 0; line <= s.wires; line++) {
      // At the catenoid endpoint the angular seam is the same curve, so draw it only once.
      if (axis === 0 && line === s.wires && s.family === 'associate' && s.associate === 0) continue;
      const fixed = Math.round(line * n / s.wires), coords = [];
      let z = 0;
      for (let step = 0; step <= n; step++) {
        const i = axis === 0 ? fixed : step, j = axis === 0 ? step : fixed;
        const k = 3 * (j * (n + 1) + i);
        coords.push([p.vertices[k], p.vertices[k + 1]]);
        z += m.vertices[k + 2];
      }
      // Color is a display choice, not a curvature or energy measurement.
      const t = s.color === 'parameter' ? (0.13 + line / s.wires * 0.65 + axis * 0.17 + p.offset * 0.12) % 1 :
        0.5 + 0.38 * Math.tanh(z / (n + 1));
      const rgb = ramp(0.18 + 0.82 * t);
      lines.push({ coords, color: 'rgb(' + rgb.map(x => Math.round(x)).join(',') + ')' });
    }
    return { lines, weight: s.weight * Math.min(w, h) / 800 };
  }
  function svg(m, s, w, h) {
    const d = drawing(m, s, w, h);
    const body = d.lines.map(l => '<path d="' + l.coords.map((p, i) =>
      (i ? 'L' : 'M') + p[0].toFixed(4) + ',' + p[1].toFixed(4)).join('') + '" fill="none" stroke="' +
      l.color + '" stroke-width="' + d.weight.toFixed(4) + '" stroke-linecap="round" stroke-linejoin="round"/>').join('');
    return U.svgDoc(w, h, s.bg, body);
  }
  const name = s => s.family === 'enneper' ? 'Enneper' : s.family === 'dini' ? 'Dini' :
    s.associate === 0 ? 'Catenoid' : s.associate === 1 ? 'Helicoid' : 'Catenoid–helicoid';
  const pre = (label, p, palette) => ({ label, p, palette });
  Studio.register({
    id: 'surfaces', name: 'Parametric Surfaces', tab: 'Surfaces', order: 99.4,
    subtitle: 'Enneper, Dini and the catenoid–helicoid family · classical geometry',
    equation: 'Enneper and catenoid–helicoid: H = 0; Dini (a = 1): K = −1/(1 + b²)',
    credit: 'Classical surfaces of Enneper and Dini, and the catenoid–helicoid associate family. Parameter maps: 3D-XplorMath / UCI, Enneper Surface; Thomas Banchoff, Brown University, Differential Geometry §7.3; Oliver Knill, Harvard Math 21a, Dini surface. MathMod inspired the selection; this is an independent implementation, not imported MathMod code or collection data.',
    blurb: 'A curved sheet built from its mathematical coordinates. Enneper folds a saddle through itself, Dini winds a negatively curved trumpet, and the associate slider bends a catenoid into a helicoid while preserving its local metric. The plate is a transparent wire mesh: all parameter lines remain visible through one another. These are established formulas. The seed changes the camera and color placement; it does not change the surface law.',
    schema: [
      { group: 'Surface', key: 'family', label: 'Family', type: 'seg', kind: 'geom', wrap: true,
        options: [['enneper', 'Enneper'], ['dini', 'Dini'], ['associate', 'Catenoid–helicoid']] },
      RANGE('Surface', 'extent', 'Patch extent', 'geom', 0.5, 2, 0.05, f2, { dimUnless: s => s.family !== 'dini' }),
      RANGE('Surface', 'associate', 'Catenoid ↔ helicoid', 'geom', 0, 1, 0.02, f2, { dimUnless: s => s.family === 'associate' }),
      RANGE('Surface', 'pitch', 'Dini pitch b', 'geom', 0.1, 0.6, 0.02, f2, { dimUnless: s => s.family === 'dini' }),
      RANGE('Surface', 'turns', 'Dini turns', 'geom', 1, 3, 0.25, f2, { dimUnless: s => s.family === 'dini' }),
      RANGE('Mesh', 'detail', 'Curve samples', 'geom', 48, 192, 48, String),
      { group: 'Mesh', key: 'wires', label: 'Mesh lines', type: 'seg', kind: 'paint', options: [[12, '12'], [24, '24'], [48, '48']] },
      RANGE('View', 'yaw', 'Turn', 'paint', 0, 360, 1, degrees),
      RANGE('View', 'tilt', 'Tilt', 'paint', -80, 80, 1, degrees),
      RANGE('View', 'roll', 'Roll', 'paint', -180, 180, 1, degrees),
      { group: 'View', key: 'aspect', label: 'Sheet', type: 'seg', kind: 'geom', options: Object.keys(ASPECTS).map(k => [k, k]) },
      RANGE('Picture', 'weight', 'Line weight', 'paint', 0.5, 3, 0.1, x => x.toFixed(1)),
      { group: 'Picture', key: 'color', label: 'Color by', type: 'seg', kind: 'paint', options: [['parameter', 'Mesh direction'], ['height', 'Height']] }
    ], defaults,
    presets: {
      enneper: pre('Enneper saddle', { family: 'enneper', extent: 1.35, yaw: 25, tilt: 30, roll: 0 }, Pal.kiln),
      folded: pre('Enneper folds', { family: 'enneper', extent: 2, yaw: 80, tilt: 50, roll: -20, wires: 48 }, Pal.glacier),
      dini: pre('Dini trumpet', { family: 'dini', pitch: 0.2, turns: 2, yaw: 40, tilt: 25, roll: 0 }, Pal.verdigris),
      catenoid: pre('Catenoid neck', { family: 'associate', associate: 0, extent: 1.3, yaw: 20, tilt: 25, roll: 0 }, Pal.ember),
      helicoid: pre('Helicoid ribbon', { family: 'associate', associate: 1, extent: 1.5, yaw: 30, tilt: 20, roll: -20 }, Pal.harbor),
      associate: pre('Between neck and ribbon', { family: 'associate', associate: 0.45, extent: 1.35, yaw: 30, tilt: 30, roll: 10 }, Pal.nightshade)
    },
    palette: true, defaultPalette: 'kiln', closedGroups: ['Mesh', 'Picture'],
    hints: {
      Surface: 'Finite patches of established parameter maps. Dini is cropped away from its singular rim. These surfaces can intersect themselves; no material dynamics is simulated.',
      Mesh: 'More samples make each curved line smoother. Lines choose how many parameter curves are drawn. SVG preserves these polylines as actual vectors.',
      View: 'An orthographic camera preserves shape on every sheet aspect. The seed adds a small repeatable camera offset.',
      Picture: 'Color describes parameter direction or average line height, not a measured physical quantity.'
    },
    sanitize(s) {
      s.detail = U.clamp(Math.round(s.detail / 48) * 48, 48, 192);
      s.wires = [12, 24, 48].includes(+s.wires) ? +s.wires : 24;
    },
    surprise(rng) { return { family: rng.pick(['enneper', 'dini', 'associate']), extent: rng.range(0.9, 1.8),
      associate: rng.pick([0, 0.35, 0.65, 1]), pitch: rng.range(0.15, 0.45), turns: rng.pick([1, 2, 3]),
      yaw: rng.range(0, 360), tilt: rng.range(15, 55), roll: rng.range(-30, 30), wires: rng.pick([12, 24, 48]) }; },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let geometry;
      function paint(g, w, h) {
        const s = host.getState();
        g.fillStyle = s.bg; g.fillRect(0, 0, w, h);
        if (!geometry) return;
        const d = drawing(geometry, s, w, h);
        g.lineWidth = d.weight; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const l of d.lines) {
          g.strokeStyle = l.color; g.beginPath();
          l.coords.forEach((p, i) => { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
          g.stroke();
        }
      }
      function status() {
        host.setStatus('<span><b>' + name(host.getState()) + '</b> · classical geometry</span><span>mesh <b>' +
          geometry.n + '×' + geometry.n + '</b> cells</span><span>transparent wires · vector export</span>');
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { geometry = mesh(host.getState()); paint(ctx, canvas.width, canvas.height); status(); },
        repaint() { paint(ctx, canvas.width, canvas.height); if (geometry) status(); },
        resize() { paint(ctx, canvas.width, canvas.height); }, pause() {}, resume() {},
        async exportPNG(w, h) {
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d', { alpha: false }), w, h);
          return U.toBlob(c);
        },
        exportSVG(w, h) { if (!geometry) throw new Error('Surface is not ready'); return svg(geometry, host.getState(), w, h); }
      };
    }
  });
})();
