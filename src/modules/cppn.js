
/* modules/cppn.js */
/* Neural Patterns — compositional pattern-producing networks (CPPN) evaluated per pixel on the GPU (WebGL2). */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16, '2:3': 1.5 };
  const DEG = Math.PI / 180;
  // activation ids stored per neuron in the weights texture (5 = linear, used by the output layer)
  const ACTS = ['tanh', 'sin', 'gauss', 'softsign', 'abs'];
  const MIX_POOL = ['tanh', 'tanh', 'sin', 'sin', 'gauss', 'softsign', 'abs'];
  const MODES = { ramp: 0, duo: 1, rgb: 2, tri: 3 };
  const SYMS = { none: 0, x: 1, xy: 2, rot: 3 };

  /* ---------------- shader ----------------
     The network is an MLP whose neurons are packed four to a vec4. Weights live in an RGBA32F texture:
     row = one vec4 of output neurons, columns 0..4C-1 = weights for each input scalar, column 4C = biases,
     column 4C+1 = activation ids. The GLSL is generated per architecture (layers, width, input count). */
  function buildSource(arch) {
    const inputs = arch.ins.slice();
    while (inputs.length % 4) inputs.push('0.0');
    let inCode = '';
    for (let k = 0; k < arch.C0; k++) inCode += `  h[${k}] = vec4(${inputs.slice(k * 4, k * 4 + 4).join(', ')});\n`;
    // one dense layer: C input chunks -> K output chunks, weight rows starting at R
    const layer = (C, K, R) => `    for (int j = 0; j < ${K}; j++) { int row = ${R} + j; vec4 acc = T(${4 * C}, row);
      for (int k = 0; k < ${C}; k++) { vec4 v = h[k];
        acc += T(4 * k, row) * v.x + T(4 * k + 1, row) * v.y + T(4 * k + 2, row) * v.z + T(4 * k + 3, row) * v.w; }
      n[j] = act4(u_wscale * acc, T(${4 * C + 1}, row)); }
    for (int j = 0; j < ${K}; j++) h[j] = n[j];\n`;
    let layers = '';
    for (let l = 0; l < arch.L; l++) layers += layer(l === 0 ? arch.C0 : arch.K, arch.K, l * arch.K);
    layers += layer(arch.K, 1, arch.L * arch.K);
    return `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform highp sampler2D u_w;
  uniform vec2 u_res, u_aspect, u_pan, u_warpOff;
  uniform float u_zoom, u_rot, u_z, u_wscale, u_symN, u_warp, u_warpScale, u_pfreq;
  uniform float u_contrast, u_gamma, u_levels, u_inkStrength;
  uniform int u_sym, u_mode;
  uniform bool u_ink;
  uniform vec3 u_bg, u_inkColor, u_triA, u_triB, u_triC;
  ${G.GLSL.hash}
  ${G.GLSL.noise}
  ${G.GLSL.ramp}
  vec4 T(int x, int y){ return texelFetch(u_w, ivec2(x, y), 0); }
  float actS(float x, int id){
    if (id == 0) return tanh(clamp(x, -10.0, 10.0));
    if (id == 1) return sin(x);
    if (id == 2) return exp(-x * x) * 2.0 - 1.0;
    if (id == 3) return x / (1.0 + abs(x));
    if (id == 4) return abs(x) - 1.0;
    return x;
  }
  vec4 act4(vec4 x, vec4 id){
    return vec4(actS(x.x, int(id.x + 0.5)), actS(x.y, int(id.y + 0.5)), actS(x.z, int(id.z + 0.5)), actS(x.w, int(id.w + 0.5)));
  }
  #define HK ${arch.HK}
  #define LAYER(C, K, R) \\
    for (int j = 0; j < K; j++) { int row = R + j; vec4 acc = T(4 * C, row); \\
      for (int k = 0; k < C; k++) { vec4 v = h[k]; \\
        acc += T(4 * k, row) * v.x + T(4 * k + 1, row) * v.y + T(4 * k + 2, row) * v.z + T(4 * k + 3, row) * v.w; } \\
      n[j] = act4(u_wscale * acc, T(4 * C + 1, row)); } \\
    for (int j = 0; j < K; j++) h[j] = n[j];
  void main(){
    vec2 p = (v_uv - 0.5) * 2.0 * u_aspect / u_zoom;
    float cr = cos(u_rot), sr = sin(u_rot);
    p = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y) + u_pan;
    if (u_sym == 1) p.x = abs(p.x);
    else if (u_sym == 2) p = abs(p);
    else if (u_sym == 3) {
      float r = length(p), w = 6.2831853 / u_symN;
      float a = mod(atan(p.y, p.x), w);
      a = abs(a - 0.5 * w);
      p = r * vec2(cos(a), sin(a));
    }
    if (u_warp > 0.0) {
      vec2 wp = p * u_warpScale + u_warpOff;
      p += u_warp * 0.6 * vec2(fbm(wp, 4), fbm(wp + vec2(19.1, -7.3), 4));
    }
    vec2 q = p;
    vec4 h[HK]; vec4 n[HK];
${inCode}${layers}
    vec3 o = n[0].xyz;
    // outputs -> [0,1] with tone controls
    vec3 vc = 0.5 + 0.5 * tanh(clamp(o, -10.0, 10.0));
    vc = clamp((vc - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    vc = pow(vc, vec3(u_gamma));
    vec3 v = vc;
    if (u_levels > 0.0) v = min(floor(v * u_levels), u_levels - 1.0) / (u_levels - 1.0);
    vec3 col;
    if (u_mode == 0) col = ramp(v.x);
    else if (u_mode == 1) col = mix(u_bg, ramp(v.x), 0.15 + 0.85 * v.y);
    else if (u_mode == 2) col = v;
    else { vec3 w = v * v + 0.002; col = (u_triA * w.x + u_triB * w.y + u_triC * w.z) / (w.x + w.y + w.z); }
    if (u_ink) {
      // gradient of the continuous outputs per *reference* pixel (800 px tall), so line weight survives export
      vec3 gx = dFdx(vc), gy = dFdy(vc);
      vec3 g = sqrt(gx * gx + gy * gy) * (u_res.y / 800.0);
      vec3 use = u_mode == 0 ? vec3(1.0, 0.0, 0.0) : u_mode == 1 ? vec3(1.0, 1.0, 0.0) : vec3(1.0);
      vec3 e;
      if (u_levels > 0.0) {
        // distance (in reference pixels) to the nearest posterize boundary -> crisp lead lines of constant width
        vec3 f = fract(vc * u_levels);
        vec3 d = min(f, 1.0 - f) / max(g * u_levels, 1e-5);
        d = mix(vec3(1e5), d, step(vec3(0.002), vc) * step(vc, vec3(0.998)));
        float hw = 0.6 + 2.2 * u_inkStrength;
        e = 1.0 - smoothstep(hw - 0.8, hw + 0.8, d);
      } else {
        e = smoothstep(0.0, 1.0, g * 14.0 * u_inkStrength - 0.1);
      }
      e *= use;
      col = mix(col, u_inkColor, max(e.x, max(e.y, e.z)));
    }
    outColor = vec4(col, 1.0);
  }`;
  }

  /* ---------------- architecture + weights ---------------- */
  function archOf(s) {
    const ins = ['q.x', 'q.y', 'length(q)'];
    if (s.theta) ins.push('atan(q.y, q.x) * 0.31831');
    ins.push('u_z');
    if (s.periodic) ins.push('sin(u_pfreq * q.x)', 'cos(u_pfreq * q.x)', 'sin(u_pfreq * q.y)', 'cos(u_pfreq * q.y)');
    const NI = ins.length, C0 = Math.ceil(NI / 4), K = Number(s.width) / 4, L = Math.round(s.layers);
    const HK = Math.max(C0, K);
    return { ins, NI, C0, K, L, HK, rows: L * K + 1, cols: 4 * HK + 2, key: L + '|' + K + '|' + ins.join(',') };
  }

  // Gaussian weights, fan-in normalized; biases; per-neuron activation ids. All from the seed.
  // attempt 0 uses the original sub-seeds, so every plate that already works is bit-for-bit what it
  // was; only a draw that comes out degenerate advances to another one.
  function buildWeights(s, arch, attempt) {
    const tag = attempt ? '#' + attempt : '';
    const rng = U.makeRng(s.seed + '/weights' + tag), arng = U.makeRng(s.seed + '/act' + tag);
    const data = new Float32Array(arch.cols * arch.rows * 4);
    let row = 0;
    for (let l = 0; l <= arch.L; l++) {
      const isOut = l === arch.L;
      const C = l === 0 ? arch.C0 : arch.K, fanIn = l === 0 ? arch.NI : arch.K * 4;
      const std = (l === 0 ? 2.2 : isOut ? 1.6 : 1.7) / Math.sqrt(fanIn);
      const kout = isOut ? 1 : arch.K;
      for (let j = 0; j < kout; j++, row++) {
        const base = row * arch.cols * 4;
        for (let i = 0; i < 4 * C; i++) {
          for (let c = 0; c < 4; c++) data[base + i * 4 + c] = i < fanIn ? rng.gauss() * std : 0;
        }
        for (let c = 0; c < 4; c++) data[base + 16 * C + c] = rng.gauss() * (isOut ? 0.25 : 0.6);
        for (let c = 0; c < 4; c++) {
          data[base + 16 * C + 4 + c] = isOut ? 5 : ACTS.indexOf(s.activation === 'mixed' ? arng.pick(MIX_POOL) : s.activation);
        }
      }
    }
    return data;
  }

  const rgb01 = hex => U.hexToRgb(hex).map(v => v / 255);
  const fmt2 = v => v.toFixed(2), fmt1 = v => v.toFixed(1), fmtDeg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  // every non-palette key, so presets fully define a look
  const BASE = {
    layers: 4, width: 16, activation: 'mixed', weightScale: 1, theta: true, periodic: false, periodicFreq: 2,
    z: 0, animateZ: false, aspect: '1:1', zoom: 1, panX: 0, panY: 0, rotation: 0, symmetry: 'none', symN: 6,
    warp: 0, warpScale: 1.5, output: 'duo', contrast: 1.2, gamma: 1, levels: 0, ink: false, inkStrength: 1,
  };
  const P = o => Object.assign({}, BASE, o);

  Studio.register({
    id: 'cppn', name: 'Neural Patterns', subtitle: 'compositional pattern-producing networks evaluated per pixel · 2007', equation: 'c(x,y) = sigma(Wn · phi( ... phi(W1 · [x, y, r, theta, z, 1]) ... ))', credit: "CPPNs: Kenneth O. Stanley, 2007, 'Compositional pattern producing networks: a novel abstraction of development'. The lineage of evolved images starts with Karl Sims, 'Artificial evolution for computer graphics', 1991.", order: 50,
    blurb: 'A compositional pattern-producing network (Stanley, 2007) is a tiny neural network that is never trained: every pixel feeds its own coordinates — x, y, distance from the center, angle, a latent z — through a few layers of randomly weighted neurons and reads the color off the outputs. Because the inputs are continuous, the picture is a smooth function with infinite resolution; because each layer composes the last, symmetry, repetition and gradients in the inputs become organic structure in the output. Sines give ripples and plasma, Gaussians give ridges, |x| gives creases; random weights pick the composition and the seed is the whole genome.',

    schema: [
      RANGE('Network', 'layers', 'Hidden layers', 'geom', 1, 6, 1, String),
      { group: 'Network', key: 'width', label: 'Neurons per layer', type: 'seg', kind: 'geom', options: [[4, '4'], [8, '8'], [12, '12'], [16, '16'], [24, '24'], [32, '32']] },
      { group: 'Network', key: 'activation', label: 'Activation', type: 'seg', kind: 'geom', wrap: true, options: [['tanh', 'tanh'], ['sin', 'sin'], ['gauss', 'gauss'], ['softsign', 'softsign'], ['abs', 'abs'], ['mixed', 'mixed']] },
      RANGE('Network', 'weightScale', 'Weight scale', 'paint', 0.3, 4, 0.05, fmt2),

      { group: 'Inputs', key: 'theta', label: 'Angle input θ', type: 'toggle', kind: 'geom' },
      { group: 'Inputs', key: 'periodic', label: 'Periodic inputs (sin, cos)', type: 'toggle', kind: 'geom' },
      RANGE('Inputs', 'periodicFreq', 'Period frequency', 'paint', 0.5, 8, 0.1, fmt1, { dimUnless: s => s.periodic }),
      RANGE('Inputs', 'warp', 'Input warp', 'paint', 0, 1, 0.01, fmt2),
      RANGE('Inputs', 'warpScale', 'Warp scale', 'paint', 0.5, 6, 0.1, fmt1, { dimUnless: s => s.warp > 0 }),
      RANGE('Inputs', 'z', 'Latent z', 'live', -2, 2, 0.01, fmt2),
      { group: 'Inputs', key: 'animateZ', label: 'Animate z', type: 'toggle', kind: 'live' },

      { group: 'View', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['2:3', '2:3'], ['5:4', '5:4'], ['16:9', '16:9']] },
      RANGE('View', 'zoom', 'Zoom', 'paint', 0.3, 5, 0.01, fmt2),
      RANGE('View', 'panX', 'Pan X', 'paint', -2, 2, 0.01, fmt2),
      RANGE('View', 'panY', 'Pan Y', 'paint', -2, 2, 0.01, fmt2),
      RANGE('View', 'rotation', 'Rotation', 'paint', 0, 359, 1, fmtDeg),
      { group: 'View', key: 'symmetry', label: 'Symmetry', type: 'seg', kind: 'paint', options: [['none', 'None'], ['x', 'Mirror X'], ['xy', 'Mirror XY'], ['rot', 'Rotational']] },
      RANGE('View', 'symN', 'Folds', 'paint', 2, 16, 1, String, { dimUnless: s => s.symmetry === 'rot' }),

      { group: 'Color', key: 'output', label: 'Outputs', type: 'seg', kind: 'paint', wrap: true, options: [['ramp', '1 → ramp'], ['duo', '2 → ramp + light'], ['rgb', '3 → RGB'], ['tri', '3 → palette mix']] },
      RANGE('Color', 'contrast', 'Contrast', 'paint', 0.5, 4, 0.01, fmt2),
      RANGE('Color', 'gamma', 'Gamma', 'paint', 0.3, 3, 0.01, fmt2),

      RANGE('Finish', 'levels', 'Posterize levels', 'paint', 0, 12, 1, v => v > 0 ? String(Math.max(2, v)) : 'off'),
      { group: 'Finish', key: 'ink', label: 'Ink outline', type: 'toggle', kind: 'paint' },
      RANGE('Finish', 'inkStrength', 'Ink strength', 'paint', 0.1, 3, 0.05, fmt2, { dimUnless: s => s.ink }),
    ],
    defaults: Object.assign({}, BASE),
    presets: {
      silk: { label: 'Silk', p: P({ layers: 4, width: 16, activation: 'mixed', weightScale: 1.1, output: 'duo', warp: 0.25, warpScale: 1.2, contrast: 1.3 }), palette: Studio.PALETTES.nightshade },
      topography: { label: 'Topography', p: P({ layers: 3, width: 12, activation: 'tanh', weightScale: 1.2, theta: false, output: 'ramp', levels: 7, ink: true, inkStrength: 0.5, contrast: 1.4, zoom: 0.8, warp: 0.3, warpScale: 1 }), palette: Studio.PALETTES.meadow },
      glass: { label: 'Stained glass', p: P({ layers: 3, width: 12, activation: 'softsign', weightScale: 1.6, output: 'tri', levels: 4, ink: true, inkStrength: 1.4, contrast: 1.8, periodic: true, periodicFreq: 1.5 }), palette: Studio.PALETTES.kiln },
      plasma: { label: 'Plasma', p: P({ layers: 4, width: 16, activation: 'sin', weightScale: 1.1, periodic: true, periodicFreq: 2.5, output: 'duo', contrast: 1.5, gamma: 0.9 }), palette: Studio.PALETTES.thermal },
      mandala: { label: 'Mandala', p: P({ layers: 4, width: 16, activation: 'mixed', weightScale: 1.3, symmetry: 'rot', symN: 8, output: 'duo', contrast: 1.5, zoom: 0.85 }), palette: Studio.PALETTES.ember },
      inkwash: { label: 'Ink wash', p: P({ layers: 3, width: 16, activation: 'gauss', weightScale: 1, theta: false, output: 'ramp', warp: 0.6, warpScale: 2, contrast: 1.1, gamma: 1.4, aspect: '2:3' }), palette: Studio.PALETTES.graphite },
      circuit: { label: 'Circuit', p: P({ layers: 4, width: 16, activation: 'abs', weightScale: 1.2, output: 'duo', levels: 6, contrast: 1.6, symmetry: 'xy', theta: false }), palette: Studio.PALETTES.bioluminescent },
      aurora: { label: 'Aurora', p: P({ layers: 3, width: 12, activation: 'mixed', weightScale: 1.2, output: 'duo', warp: 0.7, warpScale: 1, rotation: 20, aspect: '16:9', contrast: 1.3, gamma: 1.1, theta: false }), palette: Studio.PALETTES.glacier },
    },
    hints: {
      Network: 'Depth and width set how intricate the function can be; weight scale sets how sharply it turns. Mixed picks an activation per neuron from the seed.',
      Inputs: 'Periodic inputs tile the plane; warp bends every input through fbm noise. z is a spare input: sliding it morphs the whole piece through neighboring designs.',
      Finish: 'Posterize with an ink outline gives lead lines along every level boundary — contour maps and stained glass.',
    },
    closedGroups: ['View'],
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Colors (ramp order)',
    headline: 'layers', headlineLabel: 'layers',

    surprise(rng) {
      const act = rng.pick(['mixed', 'mixed', 'mixed', 'tanh', 'sin', 'sin', 'gauss', 'softsign', 'abs']);
      const p = {
        layers: rng.int(3, 5), width: rng.pick([8, 12, 12, 16, 16]), activation: act,
        weightScale: +rng.range(act === 'abs' ? 1.5 : 0.8, act === 'sin' ? 1.6 : 2.4).toFixed(2),
        theta: rng() < 0.6, periodic: rng() < 0.3, periodicFreq: +rng.range(1, 4).toFixed(1),
        z: +rng.range(-1, 1).toFixed(2), animateZ: false,
        aspect: rng.pick(['1:1', '1:1', '4:5', '2:3', '5:4', '16:9']),
        zoom: +rng.range(0.6, 1.6).toFixed(2), panX: +rng.range(-0.4, 0.4).toFixed(2), panY: +rng.range(-0.4, 0.4).toFixed(2), rotation: rng.int(0, 359),
        symmetry: rng.pick(['none', 'none', 'none', 'x', 'xy', 'rot', 'rot']), symN: rng.pick([3, 4, 5, 6, 8, 10, 12]),
        warp: rng() < 0.45 ? +rng.range(0.15, 0.7).toFixed(2) : 0, warpScale: +rng.range(0.8, 3).toFixed(1),
        output: rng.pick(['duo', 'duo', 'ramp', 'rgb', 'tri']),
        contrast: +rng.range(1.1, 1.9).toFixed(2), gamma: +rng.range(0.8, 1.3).toFixed(2),
        levels: rng() < 0.3 ? rng.int(3, 8) : 0, ink: false, inkStrength: +rng.range(0.4, 1.5).toFixed(2),
      };
      if (p.levels > 0 && rng() < 0.6) p.ink = true;
      else if (rng() < 0.15) p.ink = true;
      return p;
    },

    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg);
        host.fault(msg);
        return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');

      const wtex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, wtex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const programs = new Map();   // arch key -> Pass (recompiled only when the architecture changes)
      let pass = null, ramp = null, rampKey = '', warpOff = [0, 0], ready = false;
      let raf = 0, animT = 0, last = 0, frameNo = 0;
      let redrawn = 0;              // how many degenerate weight draws were skipped for this plate

      function ensureProgram(arch) {
        let p = programs.get(arch.key);
        if (!p) {
          p = new G.Pass(gl, buildSource(arch));
          if (programs.size >= 6) { const [k, old] = programs.entries().next().value; gl.deleteProgram(old.prog); programs.delete(k); }
          programs.set(arch.key, p);
        }
        pass = p;
      }
      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function zEff(s) { return s.z + (s.animateZ ? 0.6 * Math.sin(animT * 0.21) + 0.3 * Math.sin(animT * 0.087 + 2) : 0); }
      function draw(target, w, h) {
        if (!ready) return;
        const s = host.getState();
        ensureRamp(s);
        const ar = ASPECTS[s.aspect] || 1, pal = s.palette;
        pass.draw(target, {
          u_w: { tex: wtex }, u_ramp: ramp, u_res: [w, h], u_aspect: ar >= 1 ? [1 / ar, 1] : [1, ar],
          u_zoom: s.zoom, u_rot: s.rotation * DEG, u_pan: [s.panX, s.panY], u_z: zEff(s), u_wscale: s.weightScale,
          u_sym: { int: SYMS[s.symmetry] || 0 }, u_symN: s.symN,
          u_warp: s.warp, u_warpScale: s.warpScale, u_warpOff: warpOff, u_pfreq: s.periodicFreq,
          u_mode: { int: MODES[s.output] || 0 }, u_contrast: s.contrast, u_gamma: s.gamma,
          u_levels: s.levels <= 0 ? 0 : Math.max(2, s.levels),
          u_ink: !!s.ink, u_inkStrength: s.inkStrength, u_inkColor: rgb01(U.inkFor(s.bg)), u_bg: rgb01(s.bg),
          u_triA: rgb01(pal[0]), u_triB: rgb01(pal[Math.floor((pal.length - 1) / 2)]), u_triC: rgb01(pal[pal.length - 1]),
        });
      }
      function paint() { draw(null, gl.drawingBufferWidth, gl.drawingBufferHeight); }
      function status() {
        const s = host.getState();
        host.setStatus('<span>net <b>' + Math.round(s.layers) + '×' + s.width + '</b></span><span>' + s.activation + '</span>' +
          '<span>z <b>' + zEff(s).toFixed(2) + '</b></span>' + (raf ? '<span>drifting</span>' : '') +
          // Say so rather than quietly handing back a different genome than the seed first drew.
          (redrawn ? '<span title="The first draw from this seed saturated to a flat color at these settings; a lower weight scale or fewer layers will find one that does not">redrawn <b>×' + redrawn + '</b></span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; }
      function frame(now) {
        raf = 0;
        animT += Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
        paint();
        raf = requestAnimationFrame(frame);
        if (++frameNo % 4 === 0) status();
      }
      function startLoop() {
        stop();
        if (host.getState().animateZ && !host.reducedMotion()) { last = performance.now(); raf = requestAnimationFrame(frame); }
        status();
      }

      // Render a small probe and report whether the whole thing is one color. Cheap: 48x48 through
      // the same shader the plate uses, so it tests what will actually be drawn rather than a model
      // of it.
      function degenerate() {
        const N = 48;
        let T = null;
        try {
          T = new G.Target(gl, N, N, { type: 'rgba8' });
          draw(T, N, N);
          const px = new Uint8Array(N * N * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
          gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          let lo = 255, hi = 0;
          for (let i = 0; i < px.length; i += 4) {
            const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            if (L < lo) lo = L;
            if (L > hi) hi = L;
          }
          return hi - lo < 8;
        } catch (err) {
          return false;                 // a probe that cannot run is not evidence of a bad draw
        } finally { if (T) T.dispose(); }
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          const s = host.getState(), arch = archOf(s);
          try { ensureProgram(arch); }
          catch (err) { console.error(err); ready = false; host.setStatus('Shader compilation failed on this GPU'); return; }
          const wr = U.makeRng(s.seed + '/warp');
          warpOff = [wr.range(0, 100), wr.range(0, 100)];
          ready = true;
          // A CPPN is a random function and some draws are degenerate: every neuron lands in the
          // same place for every pixel and the plate comes out one flat color. It is not a rare
          // curiosity. abs is expansive rather than saturating, so a deep stack of it blows up, and
          // the mixed pool contains abs; measured, one seed in eight did this on Mandala. Redraw
          // rather than hand back a blank sheet. Attempt 0 is the original draw, so a plate that
          // already works does not move.
          for (let attempt = 0; attempt < 4; attempt++) {
            gl.bindTexture(gl.TEXTURE_2D, wtex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, arch.cols, arch.rows, 0, gl.RGBA, gl.FLOAT, buildWeights(s, arch, attempt));
            redrawn = attempt;
            if (!degenerate()) break;
          }
          paint(); startLoop();
        },
        repaint() { paint(); status(); },
        live(key) { if (key === 'animateZ') startLoop(); else { paint(); status(); } },
        resize() { paint(); },
        pause() { stop(); },
        resume() { paint(); startLoop(); },
        async exportPNG(w, h) {
          if (!ready) throw new Error('nothing to export');
          const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
          const T = new G.Target(gl, w, h, { type: 'rgba8' });
          draw(T, w, h);
          const px = new Uint8Array(w * h * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          T.dispose();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
          for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
          ctx.putImageData(img, 0, 0);
          return U.toBlob(c);
        },
      };
    },
  });
})();

