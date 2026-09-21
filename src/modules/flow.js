
/* modules/flow.js */
/* GENChase — Flow Field: collision-avoiding strokes grown along a noise field (port of Fieldwork). */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;

  /* ------------------------------------------------------------------
     Schema
  ------------------------------------------------------------------ */
  const GEOM = 'geom', PAINT = 'paint', ANIM = 'anim';
  const pct = v => Math.round(v * 100) + '%';
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
  const deg = v => v + '°';
  const signed2 = v => (v > 0 ? '+' : '') + v.toFixed(2);

  const SCHEMA = [
    // ---- Canvas
    { group: 'Canvas', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, wrap: true,
      options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:4', '3:4'], ['2:3', '2:3'], ['16:9', '16:9'], ['9:16', '9:16'], ['3:1', '3:1'], ['custom', 'Custom']] },
    { group: 'Canvas', key: 'aspectCustom', label: 'Custom height ÷ width', type: 'range', kind: GEOM, min: 0.3, max: 3, step: 0.01, fmt: f2, dimUnless: s => s.aspect === 'custom' },
    { group: 'Canvas', key: 'margin', label: 'Frame margin', type: 'range', kind: GEOM, min: 0, max: 25, step: 0.5, fmt: v => v + '%' },
    { group: 'Canvas', key: 'bleed', label: 'Strokes run past the frame', type: 'toggle', kind: GEOM },
    { group: 'Canvas', key: 'frameLine', label: 'Frame rule weight', type: 'range', kind: PAINT, min: 0, max: 8, step: 0.25, fmt: f2 },

    // ---- Field
    { group: 'Field', key: 'fieldMode', label: 'Field', type: 'seg', kind: GEOM, wrap: true,
      options: [['smooth', 'Smooth'], ['ridged', 'Ridged'], ['vortex', 'Vortex'], ['waves', 'Waves'], ['radial', 'Radial'], ['grid', 'Grid']] },
    { group: 'Field', key: 'scale', label: 'Scale (features per canvas)', type: 'range', kind: GEOM, min: 0.2, max: 14, step: 0.1, fmt: f1 },
    { group: 'Field', key: 'octaves', label: 'Detail (octaves)', type: 'range', kind: GEOM, min: 1, max: 6, step: 1 },
    { group: 'Field', key: 'lacunarity', label: 'Lacunarity (octave spacing)', type: 'range', kind: GEOM, min: 1.5, max: 3.5, step: 0.05, fmt: f2 },
    { group: 'Field', key: 'gain', label: 'Gain (fine-detail weight)', type: 'range', kind: GEOM, min: 0.2, max: 0.85, step: 0.01, fmt: f2 },
    { group: 'Field', key: 'turbulence', label: 'Turbulence', type: 'range', kind: GEOM, min: 0.05, max: 4, step: 0.05, fmt: f2 },
    { group: 'Field', key: 'warp', label: 'Domain warp', type: 'range', kind: GEOM, min: 0, max: 3, step: 0.05, fmt: f2 },
    { group: 'Field', key: 'rotation', label: 'Rotation', type: 'range', kind: GEOM, min: 0, max: 360, step: 1, fmt: deg },
    { group: 'Field', key: 'curl', label: 'Curl (constant curvature)', type: 'range', kind: GEOM, min: -0.1, max: 0.1, step: 0.001, fmt: v => signed2(v * 100) + '·' },
    { group: 'Field', key: 'offsetX', label: 'Pan field X', type: 'range', kind: GEOM, min: -1000, max: 1000, step: 5 },
    { group: 'Field', key: 'offsetY', label: 'Pan field Y', type: 'range', kind: GEOM, min: -1000, max: 1000, step: 5 },
    { group: 'Field', key: 'showField', label: 'Show field vectors', type: 'toggle', kind: PAINT },
    { group: 'Field', key: 'fieldAlpha', label: 'Vector opacity', type: 'range', kind: PAINT, min: 0.05, max: 1, step: 0.05, fmt: pct, dimUnless: s => s.showField },

    // ---- Strokes
    { group: 'Strokes', key: 'strokes', label: 'Strokes (target count)', type: 'range', kind: GEOM, min: 10, max: 6000, step: 10 },
    { group: 'Strokes', key: 'autoFit', label: 'Shrink widths until the count fits', type: 'toggle', kind: GEOM },
    { group: 'Strokes', key: 'startRegion', label: 'Start points', type: 'seg', kind: GEOM,
      options: [['anywhere', 'Anywhere'], ['center', 'Center'], ['edges', 'Edges']] },
    { group: 'Strokes', key: 'direction', label: 'Grow', type: 'seg', kind: GEOM,
      options: [['both', 'Both ways'], ['forward', 'Downstream'], ['backward', 'Upstream']] },
    { group: 'Strokes', key: 'minLen', label: 'Min length', type: 'range', kind: GEOM, min: 5, max: 800, step: 5 },
    { group: 'Strokes', key: 'maxLen', label: 'Max length', type: 'range', kind: GEOM, min: 20, max: 3000, step: 10 },
    { group: 'Strokes', key: 'lenBias', label: 'Length bias (short ↔ long)', type: 'range', kind: GEOM, min: -1, max: 1, step: 0.05, fmt: signed2 },
    { group: 'Strokes', key: 'step', label: 'Step length', type: 'range', kind: GEOM, min: 0.5, max: 15, step: 0.5, fmt: f1 },
    { group: 'Strokes', key: 'jitter', label: 'Wobble per step', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.01, fmt: f2 },
    { group: 'Strokes', key: 'maxTurn', label: 'Max turn per step (0 = free)', type: 'range', kind: GEOM, min: 0, max: 90, step: 1, fmt: deg },
    { group: 'Strokes', key: 'spacing', label: 'Spacing (negative overlaps)', type: 'range', kind: GEOM, min: -40, max: 40, step: 0.5, fmt: f1 },
    { group: 'Strokes', key: 'spacingRel', label: 'Spacing grows with width', type: 'range', kind: GEOM, min: 0, max: 1.5, step: 0.05, fmt: f2 },
    { group: 'Strokes', key: 'selfAvoid', label: 'Strokes avoid themselves', type: 'toggle', kind: GEOM },

    // ---- Width & shape
    { group: 'Width & shape', key: 'minW', label: 'Thinnest', type: 'range', kind: GEOM, min: 0.5, max: 80, step: 0.5, fmt: f1 },
    { group: 'Width & shape', key: 'maxW', label: 'Thickest', type: 'range', kind: GEOM, min: 2, max: 400, step: 1 },
    { group: 'Width & shape', key: 'bias', label: 'Bias (thin ↔ thick)', type: 'range', kind: GEOM, min: -2.5, max: 2.5, step: 0.05, fmt: signed2 },
    { group: 'Width & shape', key: 'classes', label: 'Size classes', type: 'range', kind: GEOM, min: 1, max: 10, step: 1 },
    { group: 'Width & shape', key: 'quantize', label: 'Snap to size classes', type: 'toggle', kind: GEOM },
    { group: 'Width & shape', key: 'widthByField', label: 'Width follows field (thick in calm)', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Width & shape', key: 'taper', label: 'Taper toward ends', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: pct },
    { group: 'Width & shape', key: 'widthNoise', label: 'Width variation along stroke', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: pct },
    { group: 'Width & shape', key: 'caps', label: 'End caps', type: 'seg', kind: PAINT,
      options: [['square', 'Square'], ['round', 'Round'], ['butt', 'Flat']] },

    // ---- Color
    { group: 'Color', key: 'colorMode', label: 'Assign color', type: 'seg', kind: GEOM, wrap: true,
      options: [['random', 'Random'], ['field', 'By field'], ['width', 'By width'], ['sequence', 'In order'], ['position', 'Left → right'], ['angle', 'By angle']] },
    { group: 'Color', key: 'colorJitter', label: 'Per-stroke color jitter', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: pct },
    { group: 'Color', key: 'alpha', label: 'Stroke opacity', type: 'range', kind: PAINT, min: 0.1, max: 1, step: 0.02, fmt: pct },
    { group: 'Color', key: 'blend', label: 'Blend', type: 'seg', kind: PAINT, wrap: true,
      options: [['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['difference', 'Difference']] },
    { group: 'Color', key: 'outline', label: 'Outline strokes', type: 'toggle', kind: PAINT },
    { group: 'Color', key: 'outlineW', label: 'Outline weight', type: 'range', kind: PAINT, min: 0.25, max: 8, step: 0.25, fmt: f2, dimUnless: s => s.outline },
    { group: 'Color', key: 'outlineMode', label: 'Outline color', type: 'seg', kind: PAINT,
      options: [['auto', 'Ink'], ['bg', 'Background'], ['darker', 'Darker self']], dimUnless: s => s.outline },

    // ---- Effects
    { group: 'Effects', key: 'shadowOffset', label: 'Shadow offset', type: 'range', kind: PAINT, min: 0, max: 20, step: 0.5, fmt: f1 },
    { group: 'Effects', key: 'shadowAngle', label: 'Shadow angle', type: 'range', kind: PAINT, min: 0, max: 360, step: 5, fmt: deg, dimUnless: s => s.shadowOffset > 0 },
    { group: 'Effects', key: 'shadowAlpha', label: 'Shadow opacity', type: 'range', kind: PAINT, min: 0, max: 0.8, step: 0.02, fmt: pct, dimUnless: s => s.shadowOffset > 0 },
    { group: 'Effects', key: 'grain', label: 'Paper grain', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Effects', key: 'vignette', label: 'Vignette', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Effects', key: 'bgGradient', label: 'Background gradient depth', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Effects', key: 'bgGradientAngle', label: 'Gradient angle', type: 'range', kind: PAINT, min: 0, max: 360, step: 5, fmt: deg, dimUnless: s => s.bgGradient > 0 },

    // ---- Drawing
    { group: 'Drawing', key: 'animate', label: 'Draw strokes live', type: 'toggle', kind: ANIM },
    { group: 'Drawing', key: 'speed', label: 'Draw speed', type: 'range', kind: ANIM, min: 1, max: 10, step: 1 },
    { group: 'Drawing', key: 'concurrent', label: 'Strokes growing at once', type: 'range', kind: ANIM, min: 1, max: 60, step: 1 },
    { group: 'Drawing', key: 'reveal', label: 'Grow from', type: 'seg', kind: ANIM,
      options: [['seed', 'Seed point'], ['end', 'One end']] },
    { group: 'Drawing', key: 'animOrder', label: 'Order', type: 'seg', kind: ANIM,
      options: [['placed', 'As placed'], ['thick', 'Thick first'], ['thin', 'Thin first']] },
    { group: 'Drawing', key: 'fieldWhileDrawing', label: 'Show field only while drawing', type: 'toggle', kind: ANIM },
  ];

  const PAL = Studio.PALETTES;
  const PRESETS = {
    studio:   { label: 'Studio default', palette: PAL.kiln, p: { fieldMode: 'smooth', scale: 1.6, octaves: 2, lacunarity: 2, gain: 0.5, turbulence: 1.2, warp: 0, rotation: 0, curl: 0, jitter: 0.02, maxTurn: 0, strokes: 300, startRegion: 'anywhere', direction: 'both', minLen: 60, maxLen: 700, lenBias: 0, spacing: 4, spacingRel: 0, step: 3, minW: 3, maxW: 90, bias: 0.1, classes: 6, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 6, bleed: false, aspect: '4:5', colorMode: 'random', colorJitter: 0, alpha: 1, blend: 'source-over', caps: 'square', outline: false, outlineW: 1.5, outlineMode: 'auto', shadowOffset: 0, grain: 0.25, vignette: 0, bgGradient: 0, frameLine: 0, showField: false } },
    threads:  { label: 'Threads', palette: PAL.graphite, p: { fieldMode: 'smooth', scale: 1.1, octaves: 3, turbulence: 1.0, warp: 0.4, curl: 0, jitter: 0, maxTurn: 0, strokes: 3000, startRegion: 'anywhere', direction: 'both', minLen: 120, maxLen: 1600, lenBias: 0.3, spacing: 1.5, spacingRel: 0, step: 2.5, minW: 1, maxW: 7, bias: -0.6, classes: 4, quantize: false, widthByField: 0, taper: 0.3, widthNoise: 0, margin: 8, bleed: false, caps: 'round', outline: false, alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.15, vignette: 0.15 } },
    boulders: { label: 'Boulders', palette: PAL.tram, p: { fieldMode: 'smooth', scale: 0.9, octaves: 1, turbulence: 1.3, warp: 0, curl: 0, jitter: 0, maxTurn: 0, strokes: 120, startRegion: 'anywhere', direction: 'both', minLen: 40, maxLen: 260, lenBias: 0, spacing: 10, spacingRel: 0, step: 3, minW: 20, maxW: 220, bias: 1.4, classes: 4, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 4, bleed: true, caps: 'square', outline: true, outlineW: 2.5, outlineMode: 'auto', alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.3, vignette: 0 } },
    storm:    { label: 'Storm', palette: PAL.glacier, p: { fieldMode: 'ridged', scale: 3.5, octaves: 4, lacunarity: 2.2, gain: 0.55, turbulence: 2.4, warp: 0.8, curl: 0, jitter: 0.12, maxTurn: 0, strokes: 1500, startRegion: 'anywhere', direction: 'both', minLen: 30, maxLen: 500, lenBias: -0.2, spacing: 2, spacingRel: 0, step: 2.5, minW: 1.5, maxW: 40, bias: -0.2, classes: 6, quantize: false, widthByField: 0.4, taper: 0.5, widthNoise: 0.3, margin: 6, bleed: false, caps: 'butt', outline: false, alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.35, vignette: 0.3 } },
    eddy:     { label: 'Eddy', palette: PAL.harbor, p: { fieldMode: 'vortex', scale: 1.8, octaves: 2, turbulence: 0.9, warp: 0, curl: 0, jitter: 0.02, maxTurn: 0, strokes: 800, startRegion: 'anywhere', direction: 'both', minLen: 80, maxLen: 900, lenBias: 0.2, spacing: 3, spacingRel: 0, step: 3, minW: 3, maxW: 60, bias: 0.2, classes: 6, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 10, bleed: false, caps: 'square', outline: false, alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.2, vignette: 0 } },
    tide:     { label: 'Tide', palette: PAL.verdigris, p: { fieldMode: 'waves', scale: 1.4, octaves: 2, turbulence: 1.1, warp: 0.2, rotation: 0, curl: 0, jitter: 0.03, maxTurn: 0, strokes: 500, startRegion: 'anywhere', direction: 'both', minLen: 100, maxLen: 1200, lenBias: 0.3, spacing: 5, spacingRel: 0, step: 3, minW: 4, maxW: 70, bias: 0.4, classes: 5, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 0, bleed: true, caps: 'butt', outline: false, alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.2, vignette: 0 } },
    spirals:  { label: 'Spirals', palette: PAL.nightshade, p: { fieldMode: 'smooth', scale: 0.8, octaves: 1, turbulence: 0.5, warp: 0, curl: 0.03, jitter: 0, maxTurn: 0, strokes: 1200, startRegion: 'anywhere', direction: 'forward', minLen: 100, maxLen: 1400, lenBias: 0.5, spacing: 2, spacingRel: 0.3, step: 2.5, minW: 2, maxW: 24, bias: 0, classes: 5, quantize: true, widthByField: 0, taper: 0.9, widthNoise: 0, margin: 6, bleed: false, caps: 'round', outline: false, alpha: 1, blend: 'source-over', shadowOffset: 0, grain: 0.2, vignette: 0.2 } },
    overprint:{ label: 'Overprint', palette: PAL.risograph, p: { fieldMode: 'smooth', scale: 1.3, octaves: 2, turbulence: 1.4, warp: 0.3, curl: 0, jitter: 0.02, maxTurn: 0, strokes: 400, startRegion: 'anywhere', direction: 'both', minLen: 80, maxLen: 900, lenBias: 0, spacing: -22, spacingRel: 0, step: 3, minW: 6, maxW: 120, bias: 0.3, classes: 5, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 7, bleed: false, caps: 'butt', outline: false, alpha: 0.85, blend: 'multiply', shadowOffset: 0, grain: 0.3, vignette: 0 } },
    relief:   { label: 'Relief', palette: PAL.petri, p: { fieldMode: 'smooth', scale: 1.5, octaves: 2, turbulence: 1.1, warp: 0, curl: 0, jitter: 0.02, maxTurn: 0, strokes: 150, startRegion: 'anywhere', direction: 'both', minLen: 60, maxLen: 700, lenBias: 0, spacing: 8, spacingRel: 0, step: 3, minW: 6, maxW: 110, bias: 0.4, classes: 5, quantize: true, widthByField: 0, taper: 0, widthNoise: 0, margin: 6, bleed: false, caps: 'square', outline: true, outlineW: 1, outlineMode: 'darker', alpha: 1, blend: 'source-over', shadowOffset: 6, shadowAngle: 135, shadowAlpha: 0.25, grain: 0.2, vignette: 0.15 } },
  };

  const DEFAULTS = Object.assign({
    aspectCustom: 1.25, offsetX: 0, offsetY: 0, fieldAlpha: 0.25, selfAvoid: true, autoFit: true,
    shadowAngle: 135, shadowAlpha: 0.3, bgGradientAngle: 90,
  }, PRESETS.studio.p, {
    animate: true, speed: 6, concurrent: 14, reveal: 'seed', animOrder: 'placed', fieldWhileDrawing: true,
  });

  /* ------------------------------------------------------------------
     Geometry: the piece lives in a 1000-unit-wide virtual space
  ------------------------------------------------------------------ */
  function aspectRatio(P) {
    if (P.aspect === 'custom') return P.aspectCustom;
    const [w, h] = P.aspect.split(':').map(Number);
    return h / w;
  }
  function wrapAngle(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }

  function buildPiece(P) {
    const rng = U.makeRng(P.seed);
    const noise = U.makeNoise(rng);
    const W = 1000, H = Math.max(120, Math.round(W * aspectRatio(P)));
    const m = (P.margin / 100) * W;
    const frame = { x0: m, y0: m, x1: W - m, y1: H - m };
    const area = P.bleed ? { x0: 0, y0: 0, x1: W, y1: H } : frame;
    const pad = 40;
    const start = { x0: area.x0 - pad, y0: area.y0 - pad, x1: area.x1 + pad, y1: area.y1 + pad };

    const s = P.scale / W;
    const rot = P.rotation * Math.PI / 180;
    const turb = P.turbulence, oct = P.octaves, lac = P.lacunarity, gain = P.gain;
    const cx = W / 2, cy = H / 2;
    const noiseOff = rng() * 1000;
    const ox = P.offsetX * s, oy = P.offsetY * s;

    // scalar noise sample with optional domain warping
    function sample(x, y) {
      let nx = x * s + noiseOff + ox, ny = y * s + noiseOff + oy;
      if (P.warp > 0) {
        const qx = noise.fbm(nx + 5.2, ny + 1.3, 2, lac, gain);
        const qy = noise.fbm(nx + 9.7, ny + 2.8, 2, lac, gain);
        nx += P.warp * qx; ny += P.warp * qy;
      }
      return noise.fbm(nx, ny, oct, lac, gain);       // roughly -1..1
    }
    function field(x, y) {
      const n = sample(x, y);
      switch (P.fieldMode) {
        case 'ridged': return rot + (1 - 2 * Math.abs(n)) * turb * Math.PI;
        case 'vortex': return Math.atan2(y - cy, x - cx) + Math.PI / 2 + rot + n * turb * Math.PI * 0.5;
        case 'radial': return Math.atan2(y - cy, x - cx) + rot + n * turb * Math.PI * 0.5;
        case 'waves': {
          const wave = Math.sin((x * Math.cos(rot) + y * Math.sin(rot)) * s * TAU + n * turb * 2);
          return rot + wave * turb * 0.9;
        }
        case 'grid': {
          // snap the noise angle to the nearest 45° so strokes run in orthogonal/diagonal lanes
          const raw = rot + n * turb * Math.PI;
          return Math.round(raw / (Math.PI / 4)) * (Math.PI / 4);
        }
        default: return rot + n * turb * Math.PI;
      }
    }

    // sampled vectors for the overlay
    const fieldSamples = [];
    const gs = 28;
    for (let y = gs / 2; y < H; y += gs) for (let x = gs / 2; x < W; x += gs) fieldSamples.push({ x, y, a: field(x, y) });

    // width classes: geometric series from minW to maxW; weights skewed by bias
    const nCls = P.classes;
    const classes = [];
    for (let i = 0; i < nCls; i++) {
      const t = nCls === 1 ? 0.5 : i / (nCls - 1);
      classes.push(P.minW * Math.pow(P.maxW / P.minW, t));
    }
    const weights = classes.map((_, i) => Math.exp(P.bias * (i - (nCls - 1) / 2) * 1.6));
    const wsum = weights.reduce((a, b) => a + b, 0);
    function sampleClass() {
      let r = rng() * wsum;
      for (let i = 0; i < nCls; i++) { r -= weights[i]; if (r <= 0) return i; }
      return nCls - 1;
    }
    const ratio = nCls > 1 ? Math.pow(P.maxW / P.minW, 1 / (nCls - 1)) : 2;

    // spatial hash for collisions
    const cell = 24;
    const grid = new Map();
    let rmax = 0;
    const key = (gx, gy) => gx * 73856093 ^ gy * 19349663;
    function insert(pt) {
      const k = key(Math.floor(pt.x / cell), Math.floor(pt.y / cell));
      let b = grid.get(k);
      if (!b) { b = []; grid.set(k, b); }
      b.push(pt);
      if (pt.r > rmax) rmax = pt.r;
    }
    function gapFor(r1, r2) { return r1 + r2 + P.spacing + P.spacingRel * (r1 + r2); }
    function hits(x, y, r) {
      const reach = Math.max(0, gapFor(r, rmax));
      const c0x = Math.floor((x - reach) / cell), c1x = Math.floor((x + reach) / cell);
      const c0y = Math.floor((y - reach) / cell), c1y = Math.floor((y + reach) / cell);
      for (let gx = c0x; gx <= c1x; gx++) {
        for (let gy = c0y; gy <= c1y; gy++) {
          const b = grid.get(key(gx, gy));
          if (!b) continue;
          for (let i = 0; i < b.length; i++) {
            const q = b[i];
            const d = gapFor(r, q.r);
            if (d <= 0) continue;
            const dx = q.x - x, dy = q.y - y;
            if (dx * dx + dy * dy < d * d) return true;
          }
        }
      }
      return false;
    }
    function hitsOwn(own, x, y, r, skip) {
      if (!P.selfAvoid) return false;
      const lim = own.length - skip;
      const d = gapFor(r, r);
      if (d <= 0) return false;
      for (let i = 0; i < lim; i++) {
        const q = own[i];
        const dx = q.x - x, dy = q.y - y;
        if (dx * dx + dy * dy < d * d) return true;
      }
      return false;
    }
    const inArea = (x, y, slack) => x > area.x0 - slack && x < area.x1 + slack && y > area.y0 - slack && y < area.y1 + slack;

    const step = P.step;
    const maxTurn = P.maxTurn * Math.PI / 180;
    const strokes = [];
    let totalPts = 0;

    function walk(sx, sy, dir, w, maxSteps, own) {
      const r = w / 2;
      const out = [];
      let x = sx, y = sy;
      let prev = null, curlAcc = 0;
      const skip = Math.ceil(w / step) + 2;
      for (let i = 0; i < maxSteps; i++) {
        curlAcc += P.curl;
        let a = field(x, y) + curlAcc * dir + (P.jitter ? (rng() - 0.5) * P.jitter * 2 : 0);
        if (maxTurn > 0 && prev != null) {
          const da = wrapAngle(a - prev);
          if (Math.abs(da) > maxTurn) a = prev + Math.sign(da) * maxTurn;
        }
        prev = a;
        const nx = x + Math.cos(a) * step * dir, ny = y + Math.sin(a) * step * dir;
        if (!inArea(nx, ny, r + step)) break;
        if (hits(nx, ny, r)) break;
        if (hitsOwn(own, nx, ny, r, skip)) break;
        x = nx; y = ny;
        out.push({ x, y });
        own.push({ x, y });
      }
      return out;
    }

    function pickStart() {
      let x, y;
      if (P.startRegion === 'center') {
        x = start.x0 + (rng() + rng() + rng()) / 3 * (start.x1 - start.x0);
        y = start.y0 + (rng() + rng() + rng()) / 3 * (start.y1 - start.y0);
      } else if (P.startRegion === 'edges') {
        const band = 0.12;
        const side = Math.floor(rng() * 4);
        const u = rng(), v = rng() * band;
        const ww = start.x1 - start.x0, hh = start.y1 - start.y0;
        if (side === 0) { x = start.x0 + u * ww; y = start.y0 + v * hh; }
        else if (side === 1) { x = start.x0 + u * ww; y = start.y1 - v * hh; }
        else if (side === 2) { x = start.x0 + v * ww; y = start.y0 + u * hh; }
        else { x = start.x1 - v * ww; y = start.y0 + u * hh; }
      } else {
        x = start.x0 + rng() * (start.x1 - start.x0);
        y = start.y0 + rng() * (start.y1 - start.y0);
      }
      return [x, y];
    }

    const lenK = Math.exp(P.lenBias * 1.6);
    // keep placing until the target count is reached or the canvas is effectively full
    const target = P.strokes;
    const maxAttempts = Math.min(400000, Math.max(20000, target * 60));
    const maxDrySpell = 6000;
    let dry = 0, attempts = 0;
    for (; strokes.length < target && attempts < maxAttempts && dry < maxDrySpell; attempts++, dry++) {
      const ci = sampleClass();
      let w = classes[ci];
      if (!P.quantize) w *= Math.pow(ratio, rng() - 0.5);
      const [sx, sy] = pickStart();
      if (P.widthByField > 0) {
        // calm regions (noise near zero) keep full width; busy regions thin out
        const calm = 1 - Math.min(1, Math.abs(sample(sx, sy)) * 1.4);
        w *= 1 - P.widthByField * (1 - calm) * 0.85;
        w = Math.max(P.minW * 0.5, w);
      }
      const r = w / 2;
      if (hits(sx, sy, r)) continue;

      const u = Math.pow(rng(), 1 / lenK);
      const targetLen = P.minLen + u * (P.maxLen - P.minLen);
      const both = P.direction === 'both';
      const maxSteps = Math.max(2, Math.round(targetLen / step / (both ? 2 : 1)));

      const own = [{ x: sx, y: sy }];
      let fwd = [], bwd = [];
      if (P.direction !== 'backward') fwd = walk(sx, sy, 1, w, maxSteps, own);
      if (P.direction !== 'forward') {
        const ownBack = fwd.slice().reverse().concat([{ x: sx, y: sy }]);
        bwd = walk(sx, sy, -1, w, maxSteps, ownBack);
      }
      const pts = bwd.reverse().concat([{ x: sx, y: sy }], fwd);
      const len = (pts.length - 1) * step;
      if (len < P.minLen || pts.length < 3) continue;
      const seedIdx = bwd.length;

      // color index
      const n = P.palette.length;
      let cidx;
      switch (P.colorMode) {
        case 'field': cidx = Math.floor(((sample(sx * 0.7 + 200, sy * 0.7 + 200) + 1) / 2) * 0.999 * n); break;
        case 'width': cidx = Math.floor(((nCls - 1 - ci) / Math.max(1, nCls - 1)) * 0.999 * n); break;
        case 'sequence': cidx = strokes.length % n; break;
        case 'position': cidx = Math.floor(Math.min(0.999, Math.max(0, (sx - area.x0) / (area.x1 - area.x0))) * n); break;
        case 'angle': cidx = Math.floor(((wrapAngle(field(sx, sy)) + Math.PI) / TAU) * 0.999 * n); break;
        default: cidx = Math.floor(rng() * n);
      }
      cidx = Math.min(n - 1, Math.max(0, cidx));

      // per-point profile noise for width variation, computed once here so it is seed-stable
      const prof = new Float32Array(pts.length);
      const po = rng() * 500;
      for (let k = 0; k < pts.length; k++) prof[k] = noise.n2(k * 0.07 + po, po);

      // commit to grid, thinning stored points to roughly one radius apart
      const every = Math.max(1, Math.floor(r / step));
      for (let k = 0; k < pts.length; k++) {
        if (k % every === 0 || k === pts.length - 1) insert({ x: pts[k].x, y: pts[k].y, r });
      }
      strokes.push({ pts, w, cidx, ci, seedIdx, prof, jit: [rng() - 0.5, rng() - 0.5, rng() - 0.5] });
      totalPts += pts.length;
      dry = 0;
    }

    return { strokes, W, H, frame, clip: P.bleed ? null : frame, totalPts, fieldSamples, target, full: strokes.length < target };
  }

  // Build the piece; when the requested count does not fit, shrink widths (and spacing) until it does
  function buildFitted(P) {
    let pc = buildPiece(P);
    pc.fitScale = 1;
    if (!P.autoFit || !pc.full) return pc;
    let scale = 1;
    for (let i = 0; i < 9 && pc.full; i++) {
      scale *= 0.78;
      const Q = Object.assign({}, P, {
        minW: Math.max(0.5, P.minW * scale),
        maxW: Math.max(2, P.maxW * scale),
        spacing: P.spacing > 0 ? P.spacing * scale : P.spacing,
        minLen: Math.max(5, P.minLen * Math.sqrt(scale)),
      });
      pc = buildPiece(Q);
      pc.fitScale = scale;
    }
    return pc;
  }

  /* ------------------------------------------------------------------
     Color helpers
  ------------------------------------------------------------------ */
  function strokeColor(st, P) {
    const base = P.palette[st.cidx % P.palette.length];
    if (!P.colorJitter) return base;
    const [h, s, l] = U.rgbToHsl(...U.hexToRgb(base));
    const j = P.colorJitter;
    return 'hsl(' + (h + st.jit[0] * 40 * j).toFixed(1) + ' ' + U.clamp(s + st.jit[1] * 30 * j, 0, 100).toFixed(1) + '% ' + U.clamp(l + st.jit[2] * 24 * j, 2, 98).toFixed(1) + '%)';
  }
  function darkerOf(st, P) {
    const [h, s, l] = U.rgbToHsl(...U.hexToRgb(P.palette[st.cidx % P.palette.length]));
    return 'hsl(' + h.toFixed(1) + ' ' + s.toFixed(1) + '% ' + Math.max(0, l - 28).toFixed(1) + '%)';
  }
  function outlineColor(st, P) {
    if (P.outlineMode === 'bg') return P.bg;
    if (P.outlineMode === 'darker') return darkerOf(st, P);
    return U.inkRgba(P.bg, 0.88);
  }

  /* ------------------------------------------------------------------
     Painting
  ------------------------------------------------------------------ */
  function prepCtx(ctx, pc, pxW) {
    const sc = pxW / pc.W;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.lineJoin = 'round';
  }
  function paintBackground(ctx, pc, P) {
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, pc.W, pc.H);
    if (P.bgGradient > 0) {
      const a = P.bgGradientAngle * Math.PI / 180;
      const dx = Math.cos(a), dy = Math.sin(a);
      const L = Math.abs(dx) * pc.W + Math.abs(dy) * pc.H;
      const g = ctx.createLinearGradient(pc.W / 2 - dx * L / 2, pc.H / 2 - dy * L / 2, pc.W / 2 + dx * L / 2, pc.H / 2 + dy * L / 2);
      const light = U.isLight(P.bg);
      g.addColorStop(0, light ? 'rgba(255,255,255,' + (0.5 * P.bgGradient) + ')' : 'rgba(255,255,255,' + (0.12 * P.bgGradient) + ')');
      g.addColorStop(1, light ? 'rgba(30,20,10,' + (0.22 * P.bgGradient) + ')' : 'rgba(0,0,0,' + (0.6 * P.bgGradient) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, pc.W, pc.H);
    }
  }
  function applyClip(ctx, pc) {
    if (!pc.clip) return;
    ctx.beginPath();
    ctx.rect(pc.clip.x0, pc.clip.y0, pc.clip.x1 - pc.clip.x0, pc.clip.y1 - pc.clip.y0);
    ctx.clip();
  }
  function paintFieldVectors(ctx, pc, P) {
    if (!pc.fieldSamples.length) return;
    ctx.save();
    ctx.strokeStyle = U.inkRgba(P.bg, P.fieldAlpha);
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const v of pc.fieldSamples) {
      const dx = Math.cos(v.a) * 9, dy = Math.sin(v.a) * 9;
      ctx.moveTo(v.x - dx, v.y - dy);
      ctx.lineTo(v.x + dx, v.y + dy);
    }
    ctx.stroke();
    // arrowheads as small dots on the downstream end
    ctx.fillStyle = U.inkRgba(P.bg, P.fieldAlpha);
    for (const v of pc.fieldSamples) {
      ctx.beginPath();
      ctx.arc(v.x + Math.cos(v.a) * 9, v.y + Math.sin(v.a) * 9, 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // width at point k given taper and profile noise
  function widthAt(st, P, k) {
    let w = st.w;
    if (P.taper > 0) {
      const t = st.pts.length > 1 ? k / (st.pts.length - 1) : 0.5;
      w *= 1 - P.taper * Math.pow(Math.abs(2 * t - 1), 1.3);
    }
    if (P.widthNoise > 0) w *= 1 - P.widthNoise * 0.65 * (0.5 + 0.5 * st.prof[k]);
    return Math.max(0.15, w);
  }
  const usesShape = P => P.taper > 0 || P.widthNoise > 0;

  // Build the path for a stroke over the point range [i0, i1)
  function buildPath(ctx, st, P, i0, i1) {
    const pts = st.pts;
    i0 = Math.max(0, i0); i1 = Math.min(pts.length, i1);
    if (i1 - i0 < 2) return false;
    if (!usesShape(P)) {
      ctx.beginPath();
      ctx.moveTo(pts[i0].x, pts[i0].y);
      for (let i = i0 + 1; i < i1; i++) ctx.lineTo(pts[i].x, pts[i].y);
      return 'line';
    }
    // variable-width ribbon as a closed polygon
    const n = i1 - i0;
    const L = new Array(n), R = new Array(n), T = new Array(n);
    for (let i = i0; i < i1; i++) {
      const p = pts[i];
      const pa = pts[Math.max(i0, i - 1)], pb = pts[Math.min(i1 - 1, i + 1)];
      let tx = pb.x - pa.x, ty = pb.y - pa.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const hw = widthAt(st, P, i) / 2;
      const nx = -ty, ny = tx;
      L[i - i0] = [p.x + nx * hw, p.y + ny * hw];
      R[i - i0] = [p.x - nx * hw, p.y - ny * hw];
      T[i - i0] = [tx, ty, hw];
    }
    const ext = P.caps === 'square';
    ctx.beginPath();
    const [t0x, t0y, hw0] = T[0];
    const [t1x, t1y, hw1] = T[n - 1];
    const sx0 = ext ? -t0x * hw0 : 0, sy0 = ext ? -t0y * hw0 : 0;
    const sx1 = ext ? t1x * hw1 : 0, sy1 = ext ? t1y * hw1 : 0;
    ctx.moveTo(L[0][0] + sx0, L[0][1] + sy0);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    ctx.lineTo(L[n - 1][0] + sx1, L[n - 1][1] + sy1);
    if (P.caps === 'round') {
      const e = pts[i1 - 1];
      const angN = Math.atan2(-t1x, t1y) + Math.PI; // angle of (-ty, tx)
      ctx.arc(e.x, e.y, hw1, angN, angN - Math.PI, true);
    } else {
      ctx.lineTo(R[n - 1][0] + sx1, R[n - 1][1] + sy1);
    }
    for (let i = n - 2; i >= 1; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.lineTo(R[0][0] + sx0, R[0][1] + sy0);
    if (P.caps === 'round') {
      const sPt = pts[i0];
      const angN = Math.atan2(-t0x, t0y) + Math.PI;
      ctx.arc(sPt.x, sPt.y, hw0, angN + Math.PI, angN, true);
    }
    ctx.closePath();
    return 'shape';
  }

  function paintStroke(ctx, st, P, i0, i1, shadowPass) {
    if (i0 == null) { i0 = 0; i1 = st.pts.length; }
    const mode = buildPath(ctx, st, P, i0, i1);
    if (!mode) return;
    if (shadowPass) {
      const col = U.inkRgba(P.bg, P.shadowAlpha);
      if (mode === 'line') { ctx.lineCap = P.caps; ctx.strokeStyle = col; ctx.lineWidth = st.w; ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.fill(); }
      return;
    }
    if (P.outline) {
      ctx.strokeStyle = outlineColor(st, P);
      if (mode === 'line') { ctx.lineCap = P.caps; ctx.lineWidth = st.w + P.outlineW * 2; ctx.stroke(); }
      else { ctx.lineJoin = 'round'; ctx.lineWidth = P.outlineW * 2; ctx.stroke(); }
    }
    const col = strokeColor(st, P);
    if (mode === 'line') { ctx.lineCap = P.caps; ctx.strokeStyle = col; ctx.lineWidth = st.w; ctx.stroke(); }
    else { ctx.fillStyle = col; ctx.fill(); }
  }

  // one stroke (or a partial range of it) with its drop shadow beneath
  function paintOne(ctx, st, P, i0, i1) {
    if (P.shadowOffset > 0 && P.shadowAlpha > 0) {
      const a = P.shadowAngle * Math.PI / 180;
      ctx.save();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.translate(Math.cos(a) * P.shadowOffset, Math.sin(a) * P.shadowOffset);
      paintStroke(ctx, st, P, i0, i1, true);
      ctx.restore();
    }
    paintStroke(ctx, st, P, i0, i1);
  }
  function paintStrokes(ctx, P, strokes) {
    ctx.save();
    ctx.globalAlpha = P.alpha;
    ctx.globalCompositeOperation = P.blend;
    for (const st of strokes) paintOne(ctx, st, P);
    ctx.restore();
  }
  function paintGrain(ctx, pc, P, pxW) {
    if (!P.grain) return;
    const g = U.makeRng(P.seed + '/grain');
    const sc = pxW / pc.W;
    const count = Math.floor(pc.W * pc.H * 0.06 * P.grain);
    const size = 1 / sc;
    ctx.save();
    ctx.globalAlpha = 0.28 * P.grain;
    ctx.fillStyle = U.isLight(P.bg) ? '#2a2420' : '#f4efe6';
    for (let i = 0; i < count; i++) ctx.fillRect(g() * pc.W, g() * pc.H, size, size);
    ctx.restore();
  }
  function paintVignette(ctx, pc, P) {
    if (!P.vignette) return;
    const r = Math.hypot(pc.W, pc.H) / 2;
    const g = ctx.createRadialGradient(pc.W / 2, pc.H / 2, r * 0.35, pc.W / 2, pc.H / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, U.inkRgba(P.bg, 0.55 * P.vignette));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pc.W, pc.H);
    ctx.restore();
  }
  function paintFrame(ctx, pc, P) {
    if (pc.clip) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = U.inkFor(P.bg);
      ctx.lineWidth = 0.6;
      ctx.strokeRect(pc.clip.x0, pc.clip.y0, pc.clip.x1 - pc.clip.x0, pc.clip.y1 - pc.clip.y0);
      ctx.restore();
    }
    if (P.frameLine > 0) {
      ctx.save();
      ctx.strokeStyle = U.inkFor(P.bg);
      ctx.lineWidth = P.frameLine;
      const f = pc.frame;
      ctx.strokeRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
      ctx.restore();
    }
  }

  // The finished piece onto any canvas; the same routine serves screen, resize and export
  function paintFull(canvas, pc, P) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prepCtx(ctx, pc, canvas.width);
    paintBackground(ctx, pc, P);
    ctx.save();
    applyClip(ctx, pc);
    if (P.showField) paintFieldVectors(ctx, pc, P);
    paintStrokes(ctx, P, pc.strokes);
    ctx.restore();
    paintGrain(ctx, pc, P, canvas.width);
    paintVignette(ctx, pc, P);
    paintFrame(ctx, pc, P);
    ctx.restore();
  }

  function animOrder(pc, P) {
    const idx = pc.strokes.map((_, i) => i);
    if (P.animOrder === 'thick') idx.sort((a, b) => pc.strokes[b].w - pc.strokes[a].w);
    else if (P.animOrder === 'thin') idx.sort((a, b) => pc.strokes[a].w - pc.strokes[b].w);
    return idx;
  }

  /* ------------------------------------------------------------------
     Surprise: curated ranges for every geometry and paint parameter
  ------------------------------------------------------------------ */
  function surprise(g) {
    const rr = (a, b, st) => Math.round(g.range(a, b) / st) * st;
    const thin = g() < 0.35;
    const overlap = g() < 0.15;
    return {
      aspect: g.pick(['1:1', '4:5', '4:5', '5:4', '3:4', '2:3', '16:9']),
      margin: rr(0, 12, 0.5), bleed: g() < 0.3, frameLine: g() < 0.15 ? rr(1, 4, 0.25) : 0,
      fieldMode: g.pick(['smooth', 'smooth', 'smooth', 'ridged', 'vortex', 'waves', 'radial', 'grid']),
      scale: rr(0.6, 4, 0.1), octaves: rr(1, 4, 1), lacunarity: rr(1.8, 2.6, 0.05), gain: rr(0.35, 0.65, 0.01),
      turbulence: rr(0.5, 2.2, 0.05), warp: g() < 0.4 ? rr(0.2, 1.5, 0.05) : 0, rotation: rr(0, 355, 5),
      curl: g() < 0.2 ? rr(-0.04, 0.04, 0.001) : 0, offsetX: 0, offsetY: 0,
      strokes: rr(150, 3000, 10), startRegion: g.pick(['anywhere', 'anywhere', 'anywhere', 'center', 'edges']),
      direction: g.pick(['both', 'both', 'both', 'forward']),
      minLen: rr(20, 150, 5), maxLen: rr(300, 1500, 10), lenBias: rr(-0.5, 0.6, 0.05),
      step: 3, jitter: g() < 0.3 ? rr(0.02, 0.15, 0.01) : 0, maxTurn: g() < 0.15 ? rr(5, 30, 1) : 0,
      spacing: overlap ? rr(-25, -5, 0.5) : rr(1, 10, 0.5), spacingRel: g() < 0.3 ? rr(0.1, 0.6, 0.05) : 0,
      minW: thin ? rr(1, 3, 0.5) : rr(2, 12, 0.5), maxW: thin ? rr(6, 30, 1) : rr(50, 200, 1),
      bias: rr(-1, 1.4, 0.05), classes: rr(3, 7, 1), quantize: g() < 0.7, widthByField: g() < 0.25 ? rr(0.3, 0.9, 0.05) : 0,
      taper: g() < 0.35 ? rr(0.3, 1, 0.02) : 0, widthNoise: g() < 0.25 ? rr(0.2, 0.7, 0.02) : 0,
      caps: g.pick(['square', 'square', 'round', 'butt']),
      colorMode: g.pick(['random', 'random', 'field', 'width', 'position', 'angle', 'sequence']), colorJitter: g() < 0.4 ? rr(0.1, 0.5, 0.02) : 0,
      // the shell picks the palette after this, so overlapping strokes use translucency rather than a bg-dependent blend
      alpha: overlap ? rr(0.6, 0.9, 0.02) : 1, blend: 'source-over',
      outline: g() < 0.3, outlineW: rr(0.75, 3, 0.25), outlineMode: g.pick(['auto', 'auto', 'darker', 'bg']),
      shadowOffset: g() < 0.2 ? rr(3, 10, 0.5) : 0, shadowAngle: rr(0, 355, 5), shadowAlpha: rr(0.15, 0.4, 0.02),
      grain: rr(0, 0.5, 0.05), vignette: g() < 0.4 ? rr(0.1, 0.5, 0.05) : 0, bgGradient: g() < 0.3 ? rr(0.2, 0.7, 0.05) : 0, bgGradientAngle: rr(0, 355, 5),
    };
  }

  /* ------------------------------------------------------------------
     Instance
  ------------------------------------------------------------------ */
  function create(host) {
    const canvas = host.canvas;
    let piece = null;   // current built piece
    let anim = null;    // live-drawing session, or null

    function status(pc, drawn) {
      host.setStatus(
        '<span><b>' + drawn + '</b>/' + pc.strokes.length + ' strokes' +
          (pc.full ? ' <span title="The canvas filled before reaching the target; thinner strokes, tighter spacing, or a larger canvas fit more">(canvas full, target ' + pc.target + ')</span>' : '') +
          (pc.fitScale < 1 ? ' <span title="Widths and spacing were scaled down so the requested count would fit">(widths ×' + pc.fitScale.toFixed(2) + ' to fit)</span>' : '') +
        '</span>' +
        '<span>' + pc.W + '×' + pc.H + ' units</span>' +
        '<span>' + pc.ms + ' ms</span>');
    }
    function stopAnim() {
      if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    }
    // end the live drawing with a full paint of the finished piece
    function finishAnim() {
      stopAnim();
      paintFull(canvas, piece, host.getState());
      status(piece, piece.strokes.length);
    }

    // Live drawing: several strokes grow at once along the visible field. Finished strokes are
    // committed to an offscreen layer; growing ones are drawn on top of it every frame.
    function startAnim(pc, P) {
      stopAnim();
      const off = document.createElement('canvas');
      const octx = off.getContext('2d');
      const ctx = canvas.getContext('2d');
      const order = animOrder(pc, P);
      const a = { raf: 0, paused: false, next: 0, active: [], committed: [], prepOff };
      anim = a;

      const total = pc.totalPts || 1;
      const perFrame = Math.max(8, P.concurrent, Math.round(total / (440 - P.speed * 40)));

      // (re)build the committed layer at the canvas' current pixel size
      function prepOff() {
        off.width = canvas.width; off.height = canvas.height;
        octx.setTransform(1, 0, 0, 1, 0, 0);
        prepCtx(octx, pc, off.width);
        paintBackground(octx, pc, P);
        applyClip(octx, pc);
        if (P.showField || P.fieldWhileDrawing) paintFieldVectors(octx, pc, P);
        paintStrokes(octx, P, a.committed);
      }
      function range(st, prog) {
        if (P.reveal === 'seed') return [st.seedIdx - prog, st.seedIdx + prog + 1];
        return [0, prog + 1];
      }
      function stepsFor(st) {
        return P.reveal === 'seed' ? Math.max(st.seedIdx, st.pts.length - 1 - st.seedIdx) : st.pts.length - 1;
      }
      function commit(st) {
        a.committed.push(st);
        paintStrokes(octx, P, [st]);
      }

      function frame() {
        if (anim !== a) return;
        while (a.active.length < P.concurrent && a.next < order.length) {
          const st = pc.strokes[order[a.next++]];
          a.active.push({ st, prog: 0, total: stepsFor(st) });
        }
        let budget = perFrame;
        // share this frame's point budget across the active strokes
        const share = Math.max(1, Math.ceil(budget / Math.max(1, a.active.length)));
        for (let i = a.active.length - 1; i >= 0 && budget > 0; i--) {
          const g = a.active[i];
          const adv = Math.min(share, g.total - g.prog);
          g.prog += adv; budget -= adv;
          if (g.prog >= g.total) { commit(g.st); a.active.splice(i, 1); }
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(off, 0, 0);
        prepCtx(ctx, pc, canvas.width);
        ctx.save(); applyClip(ctx, pc);
        ctx.globalAlpha = P.alpha; ctx.globalCompositeOperation = P.blend;
        for (const g of a.active) {
          const [i0, i1] = range(g.st, g.prog);
          paintOne(ctx, g.st, P, i0, i1);
        }
        ctx.restore();
        ctx.restore();
        status(pc, a.committed.length);
        if (a.committed.length < pc.strokes.length) a.raf = requestAnimationFrame(frame);
        else finishAnim();
      }
      prepOff();
      frame();
    }

    return {
      aspect(s) { return aspectRatio(s); },
      regenerate() {
        stopAnim();
        const P = host.getState();
        const t0 = performance.now();
        piece = buildFitted(P);
        piece.ms = Math.round(performance.now() - t0);
        if (P.animate && !host.reducedMotion()) startAnim(piece, P);
        else { paintFull(canvas, piece, P); status(piece, piece.strokes.length); }
      },
      repaint() {
        if (!piece) { this.regenerate(); return; }
        if (anim) return;          // the live drawing finishes with a full paint using current settings
        paintFull(canvas, piece, host.getState());
        status(piece, piece.strokes.length);
      },
      resize() {
        if (!piece) return;
        if (anim) { if (anim.paused) finishAnim(); else anim.prepOff(); }
        else this.repaint();
      },
      pause() {
        if (anim) { cancelAnimationFrame(anim.raf); anim.paused = true; }
      },
      resume() {
        if (anim && anim.paused) finishAnim();
      },
      exportPNG(w, h) {
        const big = document.createElement('canvas');
        big.width = w; big.height = h;
        paintFull(big, piece, host.getState());
        return U.toBlob(big);
      },
      exportSVG(w, h) {
        const P = host.getState();
        if (!piece || !piece.strokes) return null;
        const W0 = piece.W || 1000, H0 = piece.H || 1000;
        const W = w || W0, H = h || H0;
        const sx = W / W0, sy = H / H0;
        const parts = [];
        for (const st of piece.strokes) {
          const col = P.palette[st.cidx] || '#000000';
          const pts = st.pts.map(p => (p.x * sx).toFixed(2) + ',' + (p.y * sy).toFixed(2)).join(' ');
          parts.push('<polyline fill="none" stroke="' + U.svgEsc(col) + '" stroke-width="' + (st.w * Math.min(sx, sy)).toFixed(2) +
            '" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/>');
        }
        return U.svgBlob(W, H, P.bg, parts.join('\n'));
      },
    };
  }

  Studio.register({
    id: 'flow', name: 'Flow Field', subtitle: 'collision-avoiding strokes in a noise field · 1985', equation: 'theta(x,y) = fbm(x·s, y·s)·turbulence;   p <- p + step·(cos theta, sin theta)', credit: "Gradient noise: Ken Perlin, 'An image synthesizer', 1985. The collision-avoiding stroke treatment follows the flow-field approach Tyler Hobbs describes in his published essay; this is an independent implementation, not his code.", order: 70,
    blurb: 'A flow field assigns a direction to every point of the plane, here from fractal Perlin noise (summed octaves, ' +
      'optionally warped through itself) or from analytic vortex, radial, wave and lane fields. Strokes are particles integrated ' +
      'through that field one step at a time; a spatial hash lets each one stop the moment it would touch a neighbor, so the ' +
      'picture packs itself like a river braids or a bundle of fibres settles. Widths come from a geometric series of size ' +
      'classes, and everything lives in a 1000-unit virtual canvas so a seed reproduces identically at any export size.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    hints: {
      'Field': 'Scale sets how many features span the canvas; turbulence is how far the noise bends the direction. Domain warp feeds the noise through itself for organic distortion. Curl adds constant curvature so strokes coil regardless of the field.',
      'Strokes': 'The generator keeps placing strokes until it reaches the target or the canvas is full; thousands fit when strokes are thin and spacing is tight. Negative spacing lets strokes overlap, which pairs well with opacity and Multiply.',
      'Width & shape': 'Sizes are a geometric series from thinnest to thickest; bias skews the draw toward one end. Taper and width variation switch strokes to a variable-width ribbon renderer.',
      'Drawing': 'Live drawing grows several strokes at once from their seed points along the field, in the order you pick. These settings apply to the next generation.',
    },
    closedGroups: ['Effects', 'Drawing'],
    palette: true, defaultPalette: 'kiln',
    paletteLabel: 'Stroke colors (duplicate a color to weight it)',
    paletteIsGeom: true,
    headline: 'strokes', headlineLabel: 'strokes',
    surprise,
    onParam(state, key) {
      if (key === 'minLen' && state.maxLen < state.minLen) state.maxLen = state.minLen;
      if (key === 'maxLen' && state.minLen > state.maxLen) state.minLen = state.maxLen;
      if (key === 'minW' && state.maxW < state.minW) state.maxW = state.minW;
      if (key === 'maxW' && state.minW > state.maxW) state.minW = state.maxW;
    },
    sanitize(state) {
      if (state.maxLen < state.minLen) state.maxLen = state.minLen;
      if (state.maxW < state.minW) state.maxW = state.minW;
    },
    create,
  });
})();

