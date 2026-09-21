
/* modules/wavesflow.js */
/* GENChase: Schrodinger wave packets (Visscher staggered leapfrog) and Rayleigh-Benard convection (vorticity-streamfunction Boussinesq), both GPU grids. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const deg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }
  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }
  function sizeOf(s) {
    const n = Number(s.grid) || 192;
    const ar = ASPECTS[s.aspect] || 1;
    const W = n, H = Math.max(64, Math.round(n * ar));
    return [W & ~1, H & ~1];
  }
  // Both reduce passes store large positive quantities as log2(1 + v) / 32 in one byte.
  const decLog = b => Math.pow(2, (b / 255) * 32) - 1;

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
`;
  // Bilinear sample of a nearest-filtered texture at continuous cell coordinates p (cell centers at k + 0.5).
  // x wraps through the texture's repeat mode, y is clamped to the outermost rows.
  const BILERP = `
vec4 bilerp(sampler2D t, vec2 p, vec2 res){
  vec2 q = p - 0.5; vec2 i = floor(q); vec2 f = q - i;
  float y0 = clamp(i.y, 0.0, res.y - 1.0), y1 = clamp(i.y + 1.0, 0.0, res.y - 1.0);
  vec4 a = texture(t, (vec2(i.x, y0) + 0.5) / res), b = texture(t, (vec2(i.x + 1.0, y0) + 0.5) / res);
  vec4 c = texture(t, (vec2(i.x, y1) + 0.5) / res), d = texture(t, (vec2(i.x + 1.0, y1) + 0.5) / res);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;
  // Catmull-Rom bicubic on the same lattice, clamped to the range of the 4 nearest cells so it cannot overshoot.
  const BICUBIC = `
vec4 tap(sampler2D t, vec2 ij, vec2 res){ ij.y = clamp(ij.y, 0.0, res.y - 1.0); return texture(t, (ij + 0.5) / res); }
vec4 cubicRow(sampler2D t, vec2 ij, float fx, vec2 res){
  vec4 a = tap(t, ij + vec2(-1.0, 0.0), res), b = tap(t, ij, res), c = tap(t, ij + vec2(1.0, 0.0), res), d = tap(t, ij + vec2(2.0, 0.0), res);
  vec4 r = b + 0.5 * fx * (c - a + fx * (2.0 * a - 5.0 * b + 4.0 * c - d + fx * (3.0 * (b - c) + d - a)));
  return r;
}
vec4 bicubic(sampler2D t, vec2 p, vec2 res){
  vec2 q = p - 0.5; vec2 i = floor(q); vec2 f = q - i;
  vec4 r0 = cubicRow(t, i + vec2(0.0, -1.0), f.x, res), r1 = cubicRow(t, i, f.x, res);
  vec4 r2 = cubicRow(t, i + vec2(0.0, 1.0), f.x, res), r3 = cubicRow(t, i + vec2(0.0, 2.0), f.x, res);
  vec4 r = r1 + 0.5 * f.y * (r2 - r0 + f.y * (2.0 * r0 - 5.0 * r1 + 4.0 * r2 - r3 + f.y * (3.0 * (r1 - r2) + r3 - r0)));
  vec4 b00 = tap(t, i, res), b10 = tap(t, i + vec2(1.0, 0.0), res), b01 = tap(t, i + vec2(0.0, 1.0), res), b11 = tap(t, i + vec2(1.0, 1.0), res);
  return clamp(r, min(min(b00, b10), min(b01, b11)), max(max(b00, b10), max(b01, b11)));
}
`;
  const TONE = `
vec3 tone(vec3 col, float con, float grain){
  col = clamp((clamp(col, 0.0, 1.0) - 0.5) * con + 0.5, 0.0, 1.0);
  if (grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * grain * 0.4, 0.0, 1.0);
  return col;
}
`;

  /* Shared GPU rig: context, float format, palette ramps, reduce readback, loop, burst, export. */
  function makeRig(host, passes) {
    const gl = G.createGL(host.canvas);
    const noop = () => {};
    const dead = msg => {
      host.setStatus(msg);
      host.fault(msg);
      return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
    };
    if (!gl) return { dead: dead('WebGL2 is not available in this browser') };
    const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
    if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
    const P = {};
    try {
      for (const k in passes) P[k] = new G.Pass(gl, passes[k]);
    } catch (err) { console.error(err); return { dead: dead('Shader compilation failed on this GPU') }; }
    const reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
    const redBuf = new Uint8Array(RED * RED * 4);
    const pbo = gl.createBuffer();
    let fence = null, pollTimer = 0, next = null;
    let ramp = null, ramp2 = null, rampKey = '';
    const rig = {
      gl, texType, P, raf: 0, chunkTimer: 0, stepCount: 0,
      upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      },
      // [ramp with the background as its first stop, ramp of the palette colors only]
      ramps(s) {
        const key = (s.bg || '') + '|' + (s.palette || []).join(',');
        if (!ramp || rampKey !== key) {
          if (ramp) { ramp.dispose(); ramp2.dispose(); }
          ramp = G.rampTexture(gl, s.palette, s.bg);
          ramp2 = G.rampTexture(gl, s.palette, null);
          rampKey = key;
        }
        return [ramp, ramp2];
      },
      // Runs the reduce pass over the field and hands its RED x RED x 4 bytes to cb once the GPU is done.
      // The readback goes through a pixel pack buffer and a fence, so the CPU never stalls on the GPU.
      // One readback in flight at a time; a request made while one is pending runs after it (only the latest is kept).
      reduce(uniforms, cb) {
        if (fence) { next = [uniforms, cb]; return; }
        P.reduce.draw(reduceT, uniforms);
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, RED * RED * 4, gl.STREAM_READ);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          pollTimer = 0;
          if (!fence) return;
          if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) { pollTimer = setTimeout(poll, 4); return; }
          gl.deleteSync(fence); fence = null;
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, redBuf);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          cb(redBuf);
          if (next) { const n = next; next = null; rig.reduce(n[0], n[1]); }
        };
        pollTimer = setTimeout(poll, 0);
      },
      stop() {
        cancelAnimationFrame(rig.raf); rig.raf = 0;
        clearTimeout(rig.chunkTimer); rig.chunkTimer = 0;
        clearTimeout(pollTimer); pollTimer = 0; next = null;
        if (fence) { gl.deleteSync(fence); fence = null; }
      },
      // Living loop: step, render, measure every 16 steps. Never animates under reduced motion.
      startLoop(step, render, measure) {
        rig.stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) {
          const frame = () => {
            rig.raf = 0;
            const st = host.getState();
            step(st.steps);
            render();
            if (rig.stepCount % 64 < st.steps) measure('');
            rig.raf = requestAnimationFrame(frame);
          };
          rig.raf = requestAnimationFrame(frame);
        } else { measure(!s.running ? 'paused' : ''); render(); }
      },
      // Warm-up in chunks so the UI never blocks; the plate is painted progressively.
      burst(total, step, render, measure, status, then) {
        rig.stop();
        let left = total, k = 0;
        (function chunk() {
          const n = Math.min(24, left); left -= n;
          step(n);
          if (k % 4 === 0 || left <= 0) render();
          if (k++ === 0) measure('warming up'); else status('warming up');
          if (left > 0) rig.chunkTimer = setTimeout(chunk, 0);
          else then();
        })();
      },
      async exportPNG(w, h, render) {
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
        const Tgt = new G.Target(gl, w, h, { type: 'rgba8' });
        render(Tgt);
        const px = new Uint8Array(w * h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, Tgt.fbo);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        Tgt.dispose();
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        ctx.putImageData(img, 0, 0);
        return U.toBlob(c);
      },
    };
    return rig;
  }

  const GRID = [
    { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512']] },
    { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
  ];
  function simFields(dtMin, dtMax, dtStep, dtFmt) {
    return [
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 8, 1, String),
      RANGE('Simulation', 'dt', 'Time step', LIVE, dtMin, dtMax, dtStep, dtFmt),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 3000, 50, String),
      { group: 'Simulation', key: 'burst', label: 'Run 400 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
    ];
  }
  function toneFields() {
    return [
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.2, 4, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.3, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ];
  }

  /* ---------- Schrödinger ---------- */
  Studio.register({
    id: 'schrodinger',
    name: 'Schrödinger',
    tab: 'Schrödinger',
    subtitle: 'wave packet on a detector · 1926',
    order: 53,
    equation: 'i ∂ψ/∂t = −½ ∇²ψ + V ψ   (ħ = m = 1);   Re ψ on integer steps, Im ψ on half steps',
    credit: "Erwin Schrödinger, 'Quantisierung als Eigenwertproblem', Annalen der Physik, 1926. Integrated with P. B. Visscher's staggered leapfrog, Computers in Physics 5, 596 (1991): real values live at integer times and imaginary values at adjacent half times. With fixed steps, a static real potential and no absorption or injection, the summed discrete norm Re² + Im₋ Im₊ is conserved in exact arithmetic. Displayed density uses the centered imaginary value and is an approximation. The disorder potential is P. W. Anderson's, Phys. Rev. 109, 1492 (1958); the stadium is L. A. Bunimovich's, Communications in Mathematical Physics, 1979.",
    blurb: 'A Gaussian wave packet is launched with a momentum and left to meet a potential: a wall with one or two slits, a barrier it can only tunnel through, a bowl, a stadium of hard walls, a lattice, or a random landscape that pins it in place (Anderson localization). The plate is not one frame of the wave. It is the detector: |ψ|² integrated over the whole run, the way a photographic plate behind the slits records where the particle was likely to be. Density and Phase show the live wave; the phase view colors the complex argument through the palette. An absorbing layer at the edge swallows whatever leaves the frame, so what you print is the part of the history that happened in front of the camera. Drag to add a packet moving along your stroke.',
    schema: GRID.concat([
      { group: 'Potential', key: 'kind', label: 'Potential', type: 'seg', kind: GEOM, wrap: true,
        options: [['double', 'Double slit'], ['single', 'Single slit'], ['barrier', 'Barrier'], ['well', 'Harmonic well'], ['stadium', 'Stadium'], ['lattice', 'Lattice'], ['disorder', 'Disorder'], ['free', 'Free']] },
      RANGE('Potential', 'V0', 'Strength V₀', GEOM, 0, 6, 0.02, f2, { dimUnless: usesV0,
        hint: 'Barrier height, harmonic-well scale, lattice bump height, or disorder width. Harmonic corners exceed V₀. The continuum packet-energy estimate is k²/2; the grid has numerical dispersion.' }),
      RANGE('Potential', 'wallX', 'Wall position', GEOM, 0.2, 0.8, 0.01, f2, { dimUnless: usesWallX }),
      RANGE('Potential', 'thick', 'Wall thickness', GEOM, 2, 16, 1, v => v + ' px', { dimUnless: usesWallX }),
      RANGE('Potential', 'slitW', 'Slit width', GEOM, 2, 24, 1, v => v + ' px', { dimUnless: usesSlit }),
      RANGE('Potential', 'slitSep', 'Slit separation', GEOM, 6, 80, 1, v => v + ' px', { dimUnless: s => s.kind === 'double' }),
      { group: 'Potential', key: 'wallMode', label: 'Wall', type: 'seg', kind: GEOM, options: [['hard', 'Hard'], ['absorbing', 'Absorbing']], dimUnless: usesSlit,
        hint: 'A hard wall projects the wave to zero inside it. An absorbing wall attenuates amplitude but can still transmit and reflect some of the packet.' },
      RANGE('Potential', 'period', 'Lattice period', GEOM, 6, 48, 1, v => v + ' px', { dimUnless: s => s.kind === 'lattice' }),
      RANGE('Potential', 'corr', 'Disorder grain', GEOM, 1, 12, 1, v => v + ' px', { dimUnless: s => s.kind === 'disorder' }),
      RANGE('Packet', 'px', 'Packet x', GEOM, 0.05, 0.95, 0.01, f2),
      RANGE('Packet', 'py', 'Packet y', GEOM, 0.05, 0.95, 0.01, f2),
      RANGE('Packet', 'sigma', 'Width σ', GEOM, 3, 30, 0.5, v => v + ' px'),
      RANGE('Packet', 'k', 'Momentum k', GEOM, 0, 1.6, 0.02, f2, { hint: 'In 1/cell. Wavelength 2π/k. Speed k is the long-wavelength limit; the continuous-time lattice group velocity is (sin kₓ, sin kᵧ). Finite time steps add further phase error.' }),
      RANGE('Packet', 'ang', 'Direction', GEOM, 0, 359, 1, deg),
    ]).concat(simFields(0.02, 0.3, 0.005, f3)).concat([
      RANGE('Simulation', 'absorb', 'Absorber width', LIVE, 0, 0.2, 0.01, pct, { hint: 'Fraction of the frame, on every side, where the wave is damped. Off inside the stadium.' }),
      RANGE('Simulation', 'damp', 'Absorber strength', LIVE, 0.05, 1.5, 0.05, f2),
    ]).concat([
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['detector', 'Detector'], ['density', '|ψ|²'], ['phase', 'Phase']] },
      { group: 'Picture', key: 'showV', label: 'Show potential', type: 'toggle', kind: PAINT },
    ]).concat(toneFields()),
    defaults: {
      grid: 192, aspect: '1:1',
      kind: 'double', V0: 0.6, wallX: 0.42, thick: 4, slitW: 5, slitSep: 22, wallMode: 'absorbing', period: 16, corr: 2,
      px: 0.2, py: 0.5, sigma: 12, k: 0.9, ang: 0,
      running: true, steps: 4, dt: 0.2, warmup: 1000, absorb: 0.1, damp: 0.6,
      view: 'detector', showV: true, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04,
      seed: 'visscher-1991',
    },
    presets: {
      double: pre('Double slit', { kind: 'double', px: 0.2, py: 0.5, sigma: 12, k: 0.9, ang: 0, wallMode: 'absorbing', slitW: 5, slitSep: 22, warmup: 1000, view: 'detector', exposure: 1, gamma: 1 }, Pal.xray),
      mirror: pre('Reflecting wall', { kind: 'double', px: 0.2, py: 0.5, sigma: 12, k: 0.9, ang: 0, wallMode: 'hard', slitW: 5, slitSep: 22, warmup: 1000, view: 'detector', exposure: 1, gamma: 1 }, Pal.harbor),
      single: pre('Single slit', { kind: 'single', px: 0.2, py: 0.5, sigma: 14, k: 1, ang: 0, wallMode: 'absorbing', slitW: 6, warmup: 1000, view: 'detector', exposure: 1, gamma: 1 }, Pal.glacier),
      tunnel: pre('Tunneling', { kind: 'barrier', V0: 0.5, wallX: 0.5, thick: 3, px: 0.22, py: 0.5, sigma: 12, k: 0.95, ang: 0, warmup: 1000, view: 'detector', exposure: 1 }, Pal.thermal),
      orbit: pre('Coherent orbit', { kind: 'well', V0: 2, px: 0.5, py: 0.72, sigma: 8, k: 0.6, ang: 0, warmup: 1500, view: 'detector', exposure: 1 }, Pal.nightshade),
      stadium: pre('Stadium', { kind: 'stadium', px: 0.36, py: 0.5, sigma: 8, k: 1.1, ang: 28, warmup: 1500, view: 'detector', exposure: 1, aspect: '3:2' }, Pal.graphite),
      lattice: pre('Lattice', { kind: 'lattice', V0: 0.5, period: 14, px: 0.25, py: 0.5, sigma: 12, k: 0.8, ang: 15, warmup: 1000, view: 'detector', exposure: 1 }, Pal.bioluminescent),
      anderson: pre('Anderson', { kind: 'disorder', V0: 3, corr: 2, px: 0.5, py: 0.5, sigma: 6, k: 0.4, ang: 0, warmup: 1200, view: 'detector', exposure: 1 }, Pal.ember),
    },
    closedGroups: ['Packet'],
    hints: {
      Potential: 'The slits, barrier and well shape the packet. k²/2 is a continuum energy estimate, not an exact threshold on this grid. With the edge absorber off, outer boundaries are periodic.',
      Packet: 'Where the packet starts, how wide it is, and which way it moves. Narrow packets spread faster (uncertainty). The seed jitters position and aim slightly.',
      Simulation: 'The step limit uses the largest potential on this grid, including harmonic-well corners. Changing the step recenters and restaggers the imaginary field. The edge absorber deliberately removes wave amplitude; conservation is not claimed with it enabled.',
      Picture: 'Detector integrates the centered numerical density over time. Density and Phase center the two imaginary half steps at the real field’s time. The displayed packet percentage is a sampled estimate, not a conserved-norm check.',
    },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors (dark → bright)',
    headline: 'k', headlineLabel: 'momentum k',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      s.V0 = U.clamp(Number(s.V0) || 0, 0, 8);
      s.k = U.clamp(Number(s.k) || 0, 0, 1.6);
      // |E| dt < 2; the kinetic spectrum is [0,4] on the unit-cell 5-point grid.
      // A harmonic corner can exceed V0, especially on a rectangular grid.
      const [W, H] = sizeOf(s), minWH = Math.min(W, H);
      const vBound = s.kind === 'well' ? s.V0 * (((W - 1) / minWH) ** 2 + ((H - 1) / minWH) ** 2) : Math.abs(s.V0);
      const dtMax = Math.min(0.25, 1.6 / (4 + vBound));
      s.dt = U.clamp(Number(s.dt) || 0.2, 0.01, dtMax);
      s.sigma = U.clamp(Number(s.sigma) || 12, 2, 40);
      s.absorb = U.clamp(Number(s.absorb) || 0, 0, 0.25);
    },
    surprise(rng) {
      const kind = rng.pick(['double', 'double', 'single', 'barrier', 'well', 'stadium', 'lattice', 'disorder']);
      const k = kind === 'disorder' ? rng.range(0.3, 0.6) : rng.range(0.6, 1.2);
      const side = kind === 'well' || kind === 'stadium' || kind === 'disorder' || kind === 'free';
      return {
        grid: rng.pick([192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '3:2']),
        kind, V0: kind === 'barrier' ? k * k * 0.5 * rng.range(0.8, 1.4) : kind === 'well' ? rng.range(1, 3) : kind === 'disorder' ? rng.range(2, 4) : rng.range(0.3, 0.8),
        wallX: rng.range(0.38, 0.55), thick: rng.int(3, 7), slitW: rng.int(4, 8), slitSep: rng.int(14, 34),
        wallMode: rng.pick(['hard', 'absorbing']), period: rng.int(10, 22), corr: rng.int(1, 4),
        px: side ? rng.range(0.35, 0.65) : rng.range(0.15, 0.25), py: side ? rng.range(0.35, 0.7) : rng.range(0.42, 0.58),
        sigma: rng.range(6, 16), k, ang: side ? rng.int(0, 359) : (rng.int(-8, 8) + 360) % 360,
        running: true, steps: rng.int(3, 5), dt: 0.2, warmup: rng.int(800, 1500), absorb: rng.pick([0.08, 0.1, 0.12]), damp: rng.range(0.4, 0.8),
        view: 'detector', showV: rng() < 0.8, exposure: rng.range(0.7, 1.5), gamma: rng.range(0.85, 1.15), contrast: rng.range(1, 1.2), grain: rng.pick([0, 0.04, 0.08]),
      };
    },
    create: schrodingerCreate,
  });

  function usesV0(s) { return s.kind === 'barrier' || s.kind === 'well' || s.kind === 'lattice' || s.kind === 'disorder'; }
  function usesSlit(s) { return s.kind === 'single' || s.kind === 'double'; }
  function usesWallX(s) { return usesSlit(s) || s.kind === 'barrier'; }

  // State: r = R(t), g = I(t+dt/2), a = I(t-dt/2), b = integrated centered numerical density.
  // Potential texture: r = V, g = hard wall (1 inside), b = absorber weight 0..1.
  const SCH_POT_FS = HEAD + `
uniform vec2 u_res;
uniform int u_kind, u_wallMode;
uniform float u_V0, u_slitW, u_slitSep, u_wallX, u_thick, u_period, u_corr, u_nOff, u_absorb;
${G.GLSL.hash}
void main(){
  vec2 c = floor(v_uv * u_res);
  vec2 ctr = 0.5 * (u_res - 1.0);
  float V = 0.0, wall = 0.0;
  float wx = u_wallX * u_res.x;
  if (u_kind == 1 || u_kind == 2) {
    bool inWall = abs(c.x - wx) < 0.5 * u_thick;
    float dy = c.y - ctr.y;
    bool open = (u_kind == 1) ? abs(dy) < 0.5 * u_slitW
              : (abs(dy - 0.5 * u_slitSep) < 0.5 * u_slitW || abs(dy + 0.5 * u_slitSep) < 0.5 * u_slitW);
    if (inWall && !open) wall = 1.0;
  } else if (u_kind == 3) {
    if (abs(c.x - wx) < 0.5 * u_thick) V = u_V0;
  } else if (u_kind == 4) {
    vec2 d = (c - ctr) / (0.5 * min(u_res.x, u_res.y));
    V = u_V0 * dot(d, d);
  } else if (u_kind == 5) {
    float r = 0.44 * u_res.y, L2 = max(0.0, 0.46 * u_res.x - r);
    vec2 d = c - ctr;
    vec2 q = vec2(max(abs(d.x) - L2, 0.0), d.y);
    if (length(q) > r) wall = 1.0;
  } else if (u_kind == 6) {
    vec2 ph = 6.28318530718 * c / u_period;
    V = u_V0 * (0.5 + 0.5 * cos(ph.x)) * (0.5 + 0.5 * cos(ph.y));
  } else if (u_kind == 7) {
    vec2 site = floor(c / max(u_corr, 1.0));
    V = u_V0 * (hash21(site + vec2(u_nOff, u_nOff * 0.37)) - 0.5);
  }
  // absorbing layer over the outer fraction of the grid (off inside a hard-wall stadium)
  float edge = min(min(c.x, u_res.x - 1.0 - c.x), min(c.y, u_res.y - 1.0 - c.y));
  float layer = u_absorb * min(u_res.x, u_res.y);
  float a = (u_kind == 5 || layer < 1.0) ? 0.0 : clamp(1.0 - edge / layer, 0.0, 1.0);
  a = a * a;
  float drawn = wall;
  if (u_wallMode == 1 && wall > 0.5 && u_kind != 5) { wall = 0.0; a = 1.0; }
  outColor = vec4(V, wall, a, drawn);
}`;

  const SCH_STEP_FS = HEAD + `
uniform sampler2D u_p, u_pot;
uniform vec2 u_res;
uniform float u_dt, u_dtE, u_damp;
uniform int u_phase;
float lapc(vec2 uv, vec2 px, int ch){
  vec4 e = texture(u_p, uv + vec2(px.x, 0.0)), w = texture(u_p, uv - vec2(px.x, 0.0));
  vec4 n = texture(u_p, uv + vec2(0.0, px.y)), s = texture(u_p, uv - vec2(0.0, px.y));
  vec4 c = texture(u_p, uv);
  vec4 l = e + w + n + s - 4.0 * c;
  return ch == 0 ? l.r : l.g;
}
void main(){
  vec2 px = 1.0 / u_res;
  vec4 c = texture(u_p, v_uv);
  vec4 pot = texture(u_pot, v_uv);
  float V = pot.r, keep = 1.0 - pot.g;
  float damp = exp(-u_dt * u_damp * pot.b);
  if (u_phase == 2) {
    // Center the two imaginary half levels and project both components onto the allowed domain.
    float I = 0.5 * (c.g + c.a) * keep;
    outColor = vec4(c.r * keep, I, c.b, I);
  } else if (u_phase == 0) {
    // Re(t + dt) = Re(t) + dt * H Im(t + dt/2)
    float HI = -0.5 * lapc(v_uv, px, 1) + V * c.g;
    float R = (c.r + u_dt * HI) * keep * damp;
    outColor = vec4(R, c.g, c.b, c.a);
  } else {
    // Advance the imaginary level, retaining its predecessor for centered density/phase.
    float HR = -0.5 * lapc(v_uv, px, 0) + V * c.r;
    float I = (c.g - u_dt * HR) * keep * damp;
    // Phase 3 initializes/restaggers a symmetric pair about the supplied integer-time I.
    float previous = u_phase == 3 ? (2.0 * c.g - I) * keep : c.g;
    float centered = 0.5 * (previous + I);
    float dens = c.r * c.r + centered * centered;
    outColor = vec4(c.r, I, c.b + u_dtE * dens, previous);
  }
}`;

  // Adds a Gaussian packet at the pointer, moving along the drag direction (or at rest).
  const SCH_KICK_FS = HEAD + `
uniform sampler2D u_p, u_pot;
uniform vec2 u_res, u_pos, u_kv;
uniform float u_rad, u_amp;
void main(){
  vec4 c = texture(u_p, v_uv);
  vec2 d = (v_uv - u_pos) * u_res;
  float g = exp(-dot(d, d) / (4.0 * u_rad * u_rad));
  float ph = dot(u_kv, d);
  float keep = 1.0 - texture(u_pot, v_uv).g;
  float R = (c.r + u_amp * g * cos(ph)) * keep;
  float I = (c.g + u_amp * g * sin(ph)) * keep;
  outColor = vec4(R, I, c.b, I);
}`;

  const SCH_RENDER_FS = HEAD + `
uniform sampler2D u_p, u_pot, u_ramp2;
uniform vec2 u_res;
uniform int u_view, u_showV;
uniform float u_expScale, u_densScale, u_vMax, u_exposure, u_gamma, u_contrast, u_grain;
uniform vec3 u_bg, u_ink;
${G.GLSL.hash}
${G.GLSL.ramp}
${BICUBIC}
${TONE}
void main(){
  vec2 p = v_uv * u_res;
  vec4 c = bicubic(u_p, p, u_res);
  vec4 pot = bicubic(u_pot, p, u_res);
  float imaginary = 0.5 * (c.g + c.a);
  float dens = c.r * c.r + imaginary * imaginary;
  vec3 col;
  float K = 12.0 * u_exposure;
  if (u_view == 0) {
    float x = clamp(c.b * u_expScale, 0.0, 1.0);
    col = ramp(pow(log(1.0 + K * x) / log(1.0 + K), u_gamma));
  } else if (u_view == 1) {
    float x = clamp(dens * u_densScale, 0.0, 1.0);
    col = ramp(pow(log(1.0 + K * x) / log(1.0 + K), u_gamma));
  } else {
    float ph = atan(imaginary, c.r) / 6.28318530718 + 0.5;
    float m = pow(clamp(sqrt(dens * u_densScale) * u_exposure, 0.0, 1.0), u_gamma);
    vec3 hue = texture(u_ramp2, vec2(1.0 - abs(2.0 * ph - 1.0), 0.5)).rgb;
    col = mix(u_bg, hue, m);
  }
  if (u_showV == 1) {
    col = mix(col, mix(u_bg, u_ink, 0.4), 0.9 * clamp(pot.a, 0.0, 1.0));
    float vn = clamp(abs(pot.r) / max(u_vMax, 1e-6), 0.0, 1.0);
    col = mix(col, u_ink, 0.22 * vn);
  }
  outColor = vec4(tone(col, u_contrast, u_grain), 1.0);
}`;

  // Per block: rg = quantized sampled centered density, b = log mean exposure, a = log max density.
  const SCH_REDUCE_FS = HEAD + `
uniform sampler2D u_p; uniform vec2 u_res, u_block;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sd = 0.0, se = 0.0, md = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + (vec2(x, y) + 0.5) * u_block * 0.125) / u_res;
    vec4 c = texture(u_p, uv);
    float imaginary = 0.5 * (c.g + c.a);
    float d = c.r * c.r + imaginary * imaginary;
    sd += d; se += c.b; md = max(md, d);
  }
  float m = clamp(sd / 64.0 / 4.0, 0.0, 1.0) * 255.0;
  float hi = floor(m) / 255.0, lo = fract(m);
  outColor = vec4(hi, lo, clamp(log2(1.0 + se / 64.0) / 32.0, 0.0, 1.0), clamp(log2(1.0 + md) / 32.0, 0.0, 1.0));
}`;

  const SCH_KINDS = { free: 0, single: 1, double: 2, barrier: 3, well: 4, stadium: 5, lattice: 6, disorder: 7 };
  const SCH_LABEL = { free: 'free packet', single: 'single slit', double: 'double slit', barrier: 'barrier', well: 'harmonic well', stadium: 'stadium billiard', lattice: 'periodic lattice', disorder: 'Anderson disorder' };

  function schrodingerCreate(host) {
    const rig = makeRig(host, { pot: SCH_POT_FS, step: SCH_STEP_FS, kick: SCH_KICK_FS, render: SCH_RENDER_FS, reduce: SCH_REDUCE_FS });
    if (rig.dead) return rig.dead;
    const gl = rig.gl, P = rig.P;
    let S = null, potT = null, gw = 0, gh = 0;
    let nOff = 0, norm0 = 0, normNow = 0, expWhite = 0, densWhite = 0, simTime = 0, staggerDt = 0;

    function ensureGrid(s) {
      const [W, H] = sizeOf(s);
      if (S && gw === W && gh === H) return;
      if (S) { S.dispose(); potT.dispose(); }
      S = new G.PingPong(gl, W, H, { type: rig.texType, filter: 'nearest', wrap: 'repeat' });
      potT = new G.Target(gl, W, H, { type: rig.texType, filter: 'nearest', wrap: 'repeat' });
      gw = W; gh = H;
    }
    function buildPotential(s) {
      P.pot.draw(potT, {
        u_res: [gw, gh], u_kind: { int: SCH_KINDS[s.kind] || 0 }, u_wallMode: { int: s.wallMode === 'absorbing' ? 1 : 0 },
        u_V0: s.V0, u_slitW: s.slitW, u_slitSep: s.slitSep, u_wallX: s.wallX, u_thick: s.thick,
        u_period: s.period, u_corr: s.corr, u_nOff: nOff, u_absorb: s.absorb,
      });
    }
    function packet(s) {
      const rng = U.makeRng(s.seed + '/schrodinger/packet');
      const data = new Float32Array(gw * gh * 4);
      const x0 = s.px * (gw - 1) + rng.range(-1.5, 1.5), y0 = s.py * (gh - 1) + rng.range(-1.5, 1.5);
      const ang = (s.ang + rng.range(-1, 1)) * PI / 180;
      const kx = s.k * Math.cos(ang), ky = s.k * Math.sin(ang);
      const sig2 = 4 * s.sigma * s.sigma;
      norm0 = 0;
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const dx = x - x0, dy = y - y0;
        const g = Math.exp(-(dx * dx + dy * dy) / sig2);
        const ph = kx * dx + ky * dy;
        const i = (y * gw + x) * 4;
        data[i] = g * Math.cos(ph); data[i + 1] = g * Math.sin(ph); data[i + 2] = 0; data[i + 3] = data[i + 1];
        norm0 += g * g;
      }
      return data;
    }
    function halfStep(s, dt, dtE, phase) {
      P.step.draw(S.write, { u_p: S.read, u_pot: potT, u_res: [gw, gh], u_dt: dt, u_dtE: dtE, u_damp: s.damp, u_phase: { int: phase } });
      S.swap();
    }
    function step(n) {
      const s = host.getState();
      if (s.dt !== staggerDt) restagger(s);
      for (let i = 0; i < n; i++) { halfStep(s, s.dt, 0, 0); halfStep(s, s.dt, s.dt, 1); }
      rig.stepCount += n; simTime += n * s.dt;
    }
    function restagger(s) {
      halfStep(s, 0, 0, 2);
      halfStep(s, 0.5 * s.dt, 0, 3);
      staggerDt = s.dt;
    }
    function measure(extra) {
      rig.reduce({ u_p: S.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED] }, b => applyMeasure(b, extra));
    }
    function applyMeasure(b, extra) {
      let sn = 0, me = 0, md = 0;
      for (let i = 0; i < RED * RED; i++) {
        sn += ((b[i * 4] + b[i * 4 + 1] / 255) / 255) * 4;
        me = Math.max(me, decLog(b[i * 4 + 2]));
        md = Math.max(md, decLog(b[i * 4 + 3]));
      }
      normNow = (sn / (RED * RED)) * gw * gh;
      // white point: the brightest block mean; the log film curve in the render pass lifts the dim parts
      const tE = Math.max(me, 1e-6), tD = Math.max(md, 1e-6);
      const a = rig.raf ? 0.5 : 1;
      expWhite = U.lerp(expWhite, tE, a);
      densWhite = U.lerp(densWhite, tD, a);
      status(extra);
      if (!rig.raf) render();
    }
    function status(extra) {
      const s = host.getState();
      host.setStatus(
        '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
        '<span>' + SCH_LABEL[s.kind] + ' · k <b>' + s.k.toFixed(2) + '</b></span>' +
        // the exposure view integrates the packet over its whole flight, so what matters there is the dose, not what is left in the box
        (s.view === 'density' || s.view === 'phase'
          ? '<span>density weight ≈ <b>' + Math.round(100 * normNow / Math.max(norm0, 1e-9)) + '%</b> · t <b>' + simTime.toFixed(0) + '</b></span>'
          : '<span>exposure to t <b>' + simTime.toFixed(0) + '</b> · packet left ≈ <b>' + Math.round(100 * normNow / Math.max(norm0, 1e-9)) + '%</b></span>') +
        '<span>step <b>' + rig.stepCount.toLocaleString() + '</b></span>' +
        (extra ? '<span>' + extra + '</span>' : '')
      );
    }
    function render(target) {
      const s = host.getState();
      const [ramp, ramp2] = rig.ramps(s);
      const view = s.view === 'density' ? 1 : s.view === 'phase' ? 2 : 0;
      P.render.draw(target || null, {
        u_p: S.read, u_pot: potT, u_res: [gw, gh], u_ramp: ramp, u_ramp2: ramp2,
        u_view: { int: view }, u_showV: { int: s.showV ? 1 : 0 },
        u_expScale: 1 / Math.max(expWhite, 1e-6), u_densScale: 1 / Math.max(densWhite, 1e-6),
        u_vMax: Math.max(Math.abs(s.V0), 1e-3),
        u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
        u_bg: hexToRgb01(s.bg), u_ink: hexToRgb01(U.inkFor(s.bg)),
      });
    }
    function loop() { rig.startLoop(step, render, measure); }
    function burst(total) { rig.burst(total, step, render, measure, status, () => { measure(''); loop(); }); }

    return {
      aspect(s) { return ASPECTS[s.aspect] || 1; },
      fieldCells() { return [gw, gh]; },
      regenerate() {
        rig.stop(); rig.stepCount = 0; simTime = 0; norm0 = 0; normNow = 0; expWhite = 0; densWhite = 0;
        const s = host.getState();
        nOff = U.makeRng(s.seed + '/schrodinger/off').range(0, 900);
        ensureGrid(s);
        buildPotential(s);
        rig.upload(S.read, packet(s));
        // Mask the initial wave before evaluating H, then retain symmetric imaginary half levels.
        restagger(s);
        normNow = norm0;
        expWhite = 2 * s.sigma / Math.max(s.k, 0.1); densWhite = 1;
        if (s.warmup > 0) burst(s.warmup); else { measure(''); render(); loop(); }
      },
      repaint() { if (S) render(); },
      live(key) {
        if (!S) return;
        if (key === 'dt') restagger(host.getState());
        if (key === 'absorb') buildPotential(host.getState());
        if (key === 'running') loop(); else if (!rig.raf) loop();
      },
      resize() { if (S) render(); },
      pause() { rig.stop(); },
      resume() { if (S) { render(); loop(); } },
      action(key) {
        if (key === 'reseed') this.regenerate();
        else if (key === 'burst') burst(400);
      },
      disturb(p) {
        if (!S) return;
        const s = host.getState();
        const L = Math.hypot(p.dx, p.dy);
        const kv = L > 1e-4 ? [p.dx / L * s.k, p.dy / L * s.k] : [0, 0];
        halfStep(s, 0, 0, 2);
        P.kick.draw(S.write, { u_p: S.read, u_pot: potT, u_res: [gw, gh], u_pos: [p.x, p.yGL], u_kv: kv, u_rad: Math.max(3, s.sigma * 0.6), u_amp: 0.5 });
        S.swap();
        restagger(s);
        render();
        if (!rig.raf) loop();
      },
      exportPNG(w, h) { if (!S) return Promise.reject(new Error('nothing to export')); return rig.exportPNG(w, h, render); },
    };
  }

  /* ---------- Rayleigh–Bénard ---------- */
  Studio.register({
    id: 'convection',
    name: 'Rayleigh–Bénard',
    tab: 'Convection',
    subtitle: 'heated from below · 1900',
    order: 99,
    equation: '∂ω/∂t + u·∇ω = √(Pr/Ra) ∇²ω + ∂T/∂x,   ∂T/∂t + u·∇T = ∇²T/√(Ra Pr),   ∇²ψ = −ω,   u = ∂ψ/∂y, v = −∂ψ/∂x',
    credit: "Henri Bénard, Revue générale des Sciences pures et appliquées 11, 1261 (1900), saw the cells in a thin layer of spermaceti heated from below. Lord Rayleigh, Philosophical Magazine 32, 529 (1916), showed with the Boussinesq equations that the layer turns over only once the number now named for him passes a threshold: 657.5 for free surfaces, 1708 for rigid plates (Jeffreys 1928; Pellew and Southwell 1940). This is the two-dimensional Boussinesq system in vorticity-streamfunction form, scaled by the free-fall time, with a red-black SOR Poisson solve for ψ, semi-Lagrangian advection and Thom's wall vorticity.",
    blurb: 'A pan of fluid, hot floor and cold lid. Ideal no-slip plates have an onset threshold near Ra ≈ 1708; free-slip plates have a lower threshold near 658. The finite box and numerical resolution also affect the onset seen here. Above onset the layer can roll over in cells. Push Ra to a hundred thousand and the rolls give way to plumes: thin thermal boundary layers grow on the plates until a blob of hot fluid tears free and rises as a mushroom, its cold twin falling from the lid. Push further and the plumes fight each other in a turbulent soup. The plate shows temperature, or the vorticity that drives it, or a schlieren view of the temperature gradient, the way a shadowgraph shows convection in a lab. Drag to drop a warm blob into the flow.',
    schema: GRID.concat([
      RANGE('Convection', 'logRa', 'Rayleigh number', LIVE, 3, 7, 0.05, fmtRa, {
        hint: 'Buoyancy against viscosity and diffusion. Ideal onset is near 1708 for no-slip plates and 658 for free-slip plates. Higher Ra needs finer resolution; Ra alone does not verify that a simulated flow is turbulent.' }),
      RANGE('Convection', 'Pr', 'Prandtl number', LIVE, 0.1, 10, 0.1, f1, { hint: 'Viscosity over thermal diffusivity. 0.7 is air, 7 is water. Low Pr: swirling, inertial. High Pr: sluggish, viscous.' }),
      { group: 'Convection', key: 'wall', label: 'Plates', type: 'seg', kind: LIVE, options: [['noslip', 'No-slip'], ['free', 'Free-slip']] },
      { group: 'Seeding', key: 'init', label: 'Perturbation', type: 'seg', kind: GEOM, options: [['noise', 'Noise'], ['rolls', 'Rolls'], ['blobs', 'Blobs'], ['plume', 'One plume']] },
      RANGE('Seeding', 'pert', 'Amplitude', GEOM, 0.01, 0.5, 0.01, f2),
      RANGE('Seeding', 'rolls', 'Rolls across', GEOM, 1, 12, 1, String, { dimUnless: s => s.init === 'rolls' }),
    ]).concat(simFields(0.0005, 0.03, 0.0005, v => v.toFixed(4))).concat([
      RANGE('Simulation', 'iters', 'SOR sweeps per step', LIVE, 1, 12, 1, String, { hint: 'Red-black SOR passes on ∇²ψ = −ω each step, warm-started from the last step.' }),
    ]).concat([
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true, options: [['temp', 'Temperature'], ['etched', 'Etched'], ['vort', 'Vorticity'], ['schlieren', 'Schlieren']] },
      RANGE('Picture', 'etch', 'Etch depth', PAINT, 0, 1, 0.02, f2, { dimUnless: s => s.view === 'etched' }),
    ]).concat(toneFields()),
    defaults: {
      grid: 192, aspect: '16:9',
      logRa: 5.6, Pr: 1, wall: 'noslip', init: 'noise', pert: 0.25, rolls: 2,
      running: true, steps: 3, dt: 0.011, warmup: 600, iters: 4,
      view: 'etched', etch: 0.5, exposure: 1.3, gamma: 1, contrast: 1.05, grain: 0.04,
      seed: 'benard-1900',
    },
    presets: {
      plumes: pre('Plumes', { logRa: 5.6, Pr: 1, init: 'noise', pert: 0.25, view: 'etched', etch: 0.5, exposure: 1.3, warmup: 600 }, Pal.thermal),
      rolls: pre('Rolls', { logRa: 4.7, Pr: 1, init: 'rolls', rolls: 1, pert: 0.25, grid: 128, view: 'temp', exposure: 1.2, warmup: 1200, aspect: '3:2' }, Pal.harbor),
      mushroom: pre('Mushrooms', { logRa: 5.8, Pr: 1, init: 'blobs', pert: 0.2, view: 'etched', etch: 0.6, exposure: 1.3, warmup: 700 }, Pal.kiln),
      turbulent: pre('Turbulent', { logRa: 6.5, Pr: 0.7, init: 'noise', pert: 0.2, grid: 256, view: 'temp', warmup: 900, gamma: 0.9 }, Pal.ember),
      schlieren: pre('Schlieren', { logRa: 5.8, Pr: 1, init: 'noise', pert: 0.2, view: 'schlieren', warmup: 900, exposure: 1 }, Pal.xray),
      vorticity: pre('Vorticity', { logRa: 5.5, Pr: 0.7, init: 'blobs', pert: 0.2, view: 'vort', warmup: 800 }, Pal.glacier),
      oneplume: pre('One plume', { logRa: 5.6, Pr: 1, init: 'plume', pert: 0.4, view: 'etched', etch: 0.5, exposure: 1.3, warmup: 800, aspect: '16:9' }, Pal.verdigris),
    },
    closedGroups: ['Seeding'],
    hints: {
      Convection: 'Ra controls thermal driving and Pr the viscosity-to-diffusivity ratio. Ideal onset is about 1708 for no-slip plates and 658 for free-slip plates; the finite box and numerical resolution also matter. Nu now is sampled instantaneous heat transport, not a time average or a certified accuracy check.',
      Simulation: 'The time step is clamped to the explicit diffusion bound for this Ra, Pr and grid, so low Ra runs slowly. More SOR sweeps track the streamfunction more tightly.',
      Picture: 'Temperature is T through the palette, floor at the bottom. Etched darkens the edges of the plumes. Schlieren is |∇T|, the shadowgraph of the lab.',
    },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Colors (cold → hot)',
    headline: 'logRa', headlineLabel: 'Ra',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      s.logRa = U.clamp(Number(s.logRa) || 5, 3, 7);
      s.Pr = U.clamp(Number(s.Pr) || 1, 0.1, 10);
      s.iters = U.clamp(Math.round(Number(s.iters) || 4), 1, 12);
      // Apply the diffusion ceiling last: fine grids may need dt below the slider minimum.
      s.dt = Math.min(U.clamp(Number(s.dt) || 0.008, 0.00005, 0.03), convDtMax(s));
    },
    surprise(rng) {
      const logRa = rng.pick([4.5, 5, 5.3, 5.6, 6, 6.4]);
      const init = rng.pick(['noise', 'noise', 'blobs', 'rolls', 'plume']);
      return {
        grid: rng.pick([192, 192, 256]), aspect: rng.pick(['16:9', '16:9', '3:2']),
        logRa, Pr: rng.pick([0.7, 1, 1, 2]), wall: rng() < 0.8 ? 'noslip' : 'free',
        init, pert: rng.range(0.15, 0.35), rolls: rng.int(1, 3),
        running: true, steps: rng.int(2, 4), dt: 0.011, warmup: rng.int(600, 900), iters: 4,
        view: rng.pick(['temp', 'temp', 'etched', 'schlieren', 'vort']), etch: rng.range(0.4, 0.8),
        exposure: rng.range(0.95, 1.2), gamma: rng.range(0.85, 1.1), contrast: rng.range(1, 1.2), grain: rng.pick([0, 0.04, 0.08]),
      };
    },
    create: convectionCreate,
  });

  function raOf(s) { return Math.pow(10, s.logRa); }
  function fmtRa(v) {
    const e = Math.floor(v), m = Math.pow(10, v - e);
    const sup = String(e).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
    return m.toFixed(1) + '×10' + sup;
  }
  // Explicit diffusion limit on the 5-point Laplacian plus a semi-Lagrangian accuracy cap.
  function convDtMax(s) {
    const [, H] = sizeOf(s);
    const dx = 1 / (H - 1);
    const Ra = raOf(s), Pr = s.Pr;
    const kappa = 1 / Math.sqrt(Ra * Pr), nu = Math.sqrt(Pr / Ra);
    return Math.min(0.2 * dx * dx / Math.max(kappa, nu), 1.2 * dx);
  }

  // Free-fall units: length = layer depth, velocity = sqrt(g alpha dT d). F texture: r = T, g = omega.
  // PSI texture: r = psi. VEL texture: r = psi, g = u, b = v. x is periodic (hardware repeat); y walls are
  // handled in the shaders: row 0 is the hot floor, row H-1 the cold lid.
  // Advection pass: semi-Lagrangian back-trace (RK2 midpoint) with a clamped bicubic fetch of (T, omega).
  // Wall rows get their fixed temperature and Thom's vorticity (no-slip) or zero (free-slip).
  const CONV_ADV_FS = HEAD + `
uniform sampler2D u_f, u_vel;
uniform vec2 u_res;
uniform float u_dt, u_dx;
uniform int u_wall;
${BILERP}
${BICUBIC}
void main(){
  vec2 ij = floor(v_uv * u_res);
  float H = u_res.y;
  if (ij.y < 0.5 || ij.y > H - 1.5) {
    float inner = ij.y < 0.5 ? 1.0 : H - 2.0;
    float psi1 = texture(u_vel, (vec2(ij.x, inner) + 0.5) / u_res).r;
    float w = (u_wall == 0) ? -2.0 * psi1 / (u_dx * u_dx) : 0.0;
    outColor = vec4(ij.y < 0.5 ? 1.0 : 0.0, w, 0.0, 1.0);
    return;
  }
  vec2 v0 = texture(u_vel, v_uv).gb / u_dx;
  vec2 mid = ij + 0.5 - 0.5 * u_dt * v0;
  vec2 vm = bilerp(u_vel, mid, u_res).gb / u_dx;
  vec2 src = ij + 0.5 - u_dt * vm;
  vec2 adv = bicubic(u_f, src, u_res).rg;
  outColor = vec4(adv, 0.0, 1.0);
}`;

  // Diffusion and buoyancy pass on the advected field. Diffusing the advected field (not the old one) is what
  // keeps the grid-scale mode stable when the back-trace moves more than half a cell.
  const CONV_DIFF_FS = HEAD + `
uniform sampler2D u_f;
uniform vec2 u_res;
uniform float u_dt, u_kappa, u_nu, u_dx;
vec4 F(vec2 ij){ ij.y = clamp(ij.y, 0.0, u_res.y - 1.0); return texture(u_f, (ij + 0.5) / u_res); }
void main(){
  vec2 ij = floor(v_uv * u_res);
  vec2 c = texture(u_f, v_uv).rg;
  if (ij.y < 0.5 || ij.y > u_res.y - 1.5) { outColor = vec4(c, 0.0, 1.0); return; }
  vec2 e = F(ij + vec2(1.0, 0.0)).rg, w = F(ij - vec2(1.0, 0.0)).rg;
  vec2 n = F(ij + vec2(0.0, 1.0)).rg, s = F(ij - vec2(0.0, 1.0)).rg;
  vec2 lap = (e + w + n + s - 4.0 * c) / (u_dx * u_dx);
  float Tx = (e.x - w.x) / (2.0 * u_dx);
  float T = c.x + u_dt * u_kappa * lap.x;
  float om = c.y + u_dt * (u_nu * lap.y + Tx);
  outColor = vec4(clamp(T, 0.0, 1.0), om, 0.0, 1.0);
}`;

  // One red-black SOR half sweep for lap psi = -omega with psi = 0 on the walls.
  const CONV_SOR_FS = HEAD + `
uniform sampler2D u_psi, u_f;
uniform vec2 u_res;
uniform float u_dx, u_omega;
uniform int u_parity;
float Ps(vec2 ij){ ij.y = clamp(ij.y, 0.0, u_res.y - 1.0); return texture(u_psi, (ij + 0.5) / u_res).r; }
void main(){
  vec2 ij = floor(v_uv * u_res);
  float cur = texture(u_psi, v_uv).r;
  if (ij.y < 0.5 || ij.y > u_res.y - 1.5) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float parity = mod(ij.x + ij.y, 2.0);
  if (abs(parity - float(u_parity)) > 0.5) { outColor = vec4(cur, 0.0, 0.0, 1.0); return; }
  float om = texture(u_f, v_uv).g;
  float sum = Ps(ij + vec2(1.0, 0.0)) + Ps(ij - vec2(1.0, 0.0)) + Ps(ij + vec2(0.0, 1.0)) + Ps(ij - vec2(0.0, 1.0));
  float gs = 0.25 * (sum + u_dx * u_dx * om);
  outColor = vec4(cur + u_omega * (gs - cur), 0.0, 0.0, 1.0);
}`;

  const CONV_VEL_FS = HEAD + `
uniform sampler2D u_psi;
uniform vec2 u_res;
uniform float u_dx;
uniform int u_wall;
float Ps(vec2 ij){ ij.y = clamp(ij.y, 0.0, u_res.y - 1.0); return texture(u_psi, (ij + 0.5) / u_res).r; }
void main(){
  vec2 ij = floor(v_uv * u_res);
  float p = texture(u_psi, v_uv).r;
  float u = (Ps(ij + vec2(0.0, 1.0)) - Ps(ij - vec2(0.0, 1.0))) / (2.0 * u_dx);
  float v = -(Ps(ij + vec2(1.0, 0.0)) - Ps(ij - vec2(1.0, 0.0))) / (2.0 * u_dx);
  bool wall = ij.y < 0.5 || ij.y > u_res.y - 1.5;
  if (wall) {
    v = 0.0;
    if (u_wall == 0) u = 0.0;
    // Free slip has an odd streamfunction extension through its zero-valued wall.
    // Clamping the outside sample instead halves the tangential velocity.
    else u = ij.y < 0.5 ? (Ps(ij + vec2(0.0, 1.0)) - p) / u_dx
                       : (p - Ps(ij - vec2(0.0, 1.0))) / u_dx;
  }
  outColor = vec4(p, u, v, 1.0);
}`;

  const CONV_RENDER_FS = HEAD + `
uniform sampler2D u_f;
uniform vec2 u_res;
uniform int u_view;
uniform float u_wMax, u_gMax, u_dx, u_exposure, u_gamma, u_contrast, u_grain, u_etch;
${G.GLSL.hash}
${G.GLSL.ramp}
${BICUBIC}
${TONE}
void main(){
  vec2 p = v_uv * u_res;
  vec4 c = bicubic(u_f, p, u_res);
  float T = c.r;
  vec2 gT = vec2(bicubic(u_f, p + vec2(1.0, 0.0), u_res).r - bicubic(u_f, p - vec2(1.0, 0.0), u_res).r,
                 bicubic(u_f, p + vec2(0.0, 1.0), u_res).r - bicubic(u_f, p - vec2(0.0, 1.0), u_res).r) / (2.0 * u_dx);
  float g = length(gT) / max(u_gMax, 1e-6);
  vec3 col;
  if (u_view == 1) {
    float t = 0.5 + 0.5 * clamp(c.g / max(u_wMax, 1e-6) * u_exposure, -1.0, 1.0);
    col = ramp(pow(t, u_gamma));
  } else if (u_view == 2) {
    float t = pow(1.0 - exp(-g * u_exposure * 1.5), u_gamma);
    col = ramp(t);
  } else {
    float t = pow(clamp(0.5 + (T - 0.5) * u_exposure, 0.0, 1.0), u_gamma);
    col = ramp(t);
    if (u_view == 3) col *= 1.0 - u_etch * clamp(g * 1.2, 0.0, 1.0);
  }
  outColor = vec4(tone(col, u_contrast, u_grain), 1.0);
}`;

  // Per block: rg = signed 16-bit mean v T with an exact zero code,
  // b = log max |omega|, a = log max |grad T|. Encoding error <= 0.5/65534.
  // This is sampled instantaneous transport, not a converged time average.
  const CONV_REDUCE_FS = HEAD + `
uniform sampler2D u_f, u_vel; uniform vec2 u_res, u_block; uniform float u_dx;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  vec2 px = 1.0 / u_res;
  float svt = 0.0, mw = 0.0, mg = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + (vec2(x, y) + 0.5) * u_block * 0.125) / u_res;
    vec4 c = texture(u_f, uv);
    vec4 v = texture(u_vel, uv);
    svt += v.b * c.r;
    mw = max(mw, abs(c.g));
    float gx = (texture(u_f, uv + vec2(px.x, 0.0)).r - texture(u_f, uv - vec2(px.x, 0.0)).r) / (2.0 * u_dx);
    float gy = (texture(u_f, uv + vec2(0.0, px.y)).r - texture(u_f, uv - vec2(0.0, px.y)).r) / (2.0 * u_dx);
    mg = max(mg, length(vec2(gx, gy)));
  }
  float encoded = floor(clamp(svt / 64.0, -0.5, 0.5) * 65534.0 + 32768.5);
  float hi = floor(encoded / 256.0) / 255.0, lo = mod(encoded, 256.0) / 255.0;
  outColor = vec4(hi, lo, clamp(log2(1.0 + mw) / 32.0, 0.0, 1.0), clamp(log2(1.0 + mg) / 32.0, 0.0, 1.0));
}`;

  function convectionCreate(host) {
    const rig = makeRig(host, { adv: CONV_ADV_FS, diff: CONV_DIFF_FS, sor: CONV_SOR_FS, vel: CONV_VEL_FS, render: CONV_RENDER_FS, reduce: CONV_REDUCE_FS, splat: G.GLSL.splatFS });
    if (rig.dead) return rig.dead;
    const gl = rig.gl, P = rig.P;
    let F = null, PSI = null, velT = null, gw = 0, gh = 0, dx = 1;
    let wMax = 0, gMax = 0, nusselt = 1, simTime = 0;

    function ensureGrid(s) {
      const [W, H] = sizeOf(s);
      if (F && gw === W && gh === H) return;
      if (F) { F.dispose(); PSI.dispose(); velT.dispose(); }
      F = new G.PingPong(gl, W, H, { type: rig.texType, filter: 'nearest', wrap: 'repeat' });
      PSI = new G.PingPong(gl, W, H, { type: rig.texType, filter: 'nearest', wrap: 'repeat' });
      velT = new G.Target(gl, W, H, { type: rig.texType, filter: 'nearest', wrap: 'repeat' });
      gw = W; gh = H; dx = 1 / (H - 1);
    }
    function seedField(s) {
      const rng = U.makeRng(s.seed + '/convection');
      const data = new Float32Array(gw * gh * 4);
      const blobs = [];
      const nb = s.init === 'plume' ? 1 : rng.int(4, 8);
      for (let i = 0; i < nb; i++) {
        blobs.push({ x: rng() * gw, y: s.init === 'plume' ? 2 : rng.range(0.15, 0.85) * gh, r: rng.range(0.04, 0.09) * gw, sg: s.init === 'plume' ? 1 : (rng() < 0.5 ? -1 : 1) });
      }
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const yn = y / (gh - 1);
        let pert = 0;
        if (s.init === 'noise') pert = rng() * 2 - 1;
        else if (s.init === 'rolls') pert = Math.cos(TAU * s.rolls * x / gw + 0.3 * (rng() - 0.5)) + 0.15 * (rng() * 2 - 1);
        else {
          for (const b of blobs) {
            let ddx = x - b.x; if (ddx > gw / 2) ddx -= gw; if (ddx < -gw / 2) ddx += gw;
            const ddy = y - b.y;
            pert += b.sg * 2 * Math.exp(-(ddx * ddx + ddy * ddy) / (2 * b.r * b.r));
          }
          pert += 0.05 * (rng() * 2 - 1);
        }
        const i = (y * gw + x) * 4;
        let T = 1 - yn + s.pert * pert * Math.sin(PI * yn);
        if (y === 0) T = 1; else if (y === gh - 1) T = 0;
        data[i] = U.clamp(T, 0, 1); data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 1;
      }
      return data;
    }
    function coeffs(s) {
      const Ra = raOf(s), Pr = s.Pr;
      return { kappa: 1 / Math.sqrt(Ra * Pr), nu: Math.sqrt(Pr / Ra) };
    }
    function solvePsi(s, iters) {
      // a little under the optimal factor: at 4 sweeps per step the optimum leaves an oscillatory residual next to strong sources
      const om = 0.95 * 2 / (1 + Math.sin(PI / gh));
      for (let i = 0; i < iters; i++) {
        for (let par = 0; par < 2; par++) {
          P.sor.draw(PSI.write, { u_psi: PSI.read, u_f: F.read, u_res: [gw, gh], u_dx: dx, u_omega: om, u_parity: { int: par } });
          PSI.swap();
        }
      }
      P.vel.draw(velT, { u_psi: PSI.read, u_res: [gw, gh], u_dx: dx, u_wall: { int: s.wall === 'free' ? 1 : 0 } });
    }
    function step(n) {
      const s = host.getState();
      const c = coeffs(s);
      for (let i = 0; i < n; i++) {
        solvePsi(s, s.iters);
        P.adv.draw(F.write, { u_f: F.read, u_vel: velT, u_res: [gw, gh], u_dt: s.dt, u_dx: dx, u_wall: { int: s.wall === 'free' ? 1 : 0 } });
        F.swap();
        P.diff.draw(F.write, { u_f: F.read, u_res: [gw, gh], u_dt: s.dt, u_kappa: c.kappa, u_nu: c.nu, u_dx: dx });
        F.swap();
      }
      rig.stepCount += n; simTime += n * s.dt;
    }
    function measure(extra) {
      rig.reduce({ u_f: F.read, u_vel: velT, u_res: [gw, gh], u_block: [gw / RED, gh / RED], u_dx: dx }, b => applyMeasure(b, extra));
    }
    function applyMeasure(b, extra) {
      const s = host.getState();
      // white points come from the interior blocks (the wall rows carry Thom's vorticity and the wall gradient)
      let svt = 0, transportClipped = false;
      const ws = [], gs = [];
      for (let i = 0; i < RED * RED; i++) {
        const packed = b[i * 4] * 256 + b[i * 4 + 1];
        svt += (packed - 32768) / 65534;
        if (packed <= 1 || packed >= 65535) transportClipped = true;
        const row = Math.floor(i / RED);
        if (row >= 2 && row < RED - 2) { ws.push(b[i * 4 + 2]); gs.push(b[i * 4 + 3]); }
      }
      nusselt = transportClipped ? NaN : 1 + Math.sqrt(raOf(s) * s.Pr) * (svt / (RED * RED));
      ws.sort((x, y) => x - y); gs.sort((x, y) => x - y);
      const q = Math.floor(0.97 * (ws.length - 1));
      const tw = Math.max(decLog(ws[q]), 1e-3), tg = Math.max(decLog(gs[q]), 1e-3);
      const a = rig.raf ? 0.5 : 1;
      wMax = U.lerp(wMax, tw, a);
      gMax = U.lerp(gMax, tg, a);
      status(extra);
      if (!rig.raf) render();
    }
    function status(extra) {
      const s = host.getState();
      const Ra = raOf(s);
      const threshold = s.wall === 'free' ? 27 * Math.PI ** 4 / 4 : 1707.76;
      const regime = Ra < threshold ? 'below ideal onset' : 'above ideal onset';
      host.setStatus(
        '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
        '<span>Ra <b>' + fmtRa(s.logRa) + '</b> · Pr <b>' + s.Pr.toFixed(1) + '</b> · ' + regime + '</span>' +
        '<span>Nu now ≈ <b>' + (Number.isFinite(nusselt) ? nusselt.toFixed(1) : 'out of range') + '</b> · t <b>' + simTime.toFixed(1) + '</b></span>' +
        '<span>step <b>' + rig.stepCount.toLocaleString() + '</b></span>' +
        (extra ? '<span>' + extra + '</span>' : '')
      );
    }
    function render(target) {
      const s = host.getState();
      const [ramp] = rig.ramps(s);
      const view = s.view === 'vort' ? 1 : s.view === 'schlieren' ? 2 : s.view === 'etched' ? 3 : 0;
      P.render.draw(target || null, {
        u_f: F.read, u_res: [gw, gh], u_ramp: ramp, u_view: { int: view },
        u_wMax: wMax, u_gMax: gMax, u_dx: dx, u_etch: s.etch,
        u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
      });
    }
    function loop() { rig.startLoop(step, render, measure); }
    function burst(total) { rig.burst(total, step, render, measure, status, () => { measure(''); loop(); }); }

    return {
      aspect(s) { return ASPECTS[s.aspect] || 1; },
      fieldCells() { return [gw, gh]; },
      regenerate() {
        rig.stop(); rig.stepCount = 0; simTime = 0; wMax = 30; gMax = 3; nusselt = 1;
        const s = host.getState();
        ensureGrid(s);
        rig.upload(F.read, seedField(s));
        PSI.read.clear(0, 0, 0, 1); PSI.write.clear(0, 0, 0, 1); velT.clear(0, 0, 0, 1);
        // a deeper first solve so the warm start has something to start from
        solvePsi(s, 40);
        if (s.warmup > 0) burst(s.warmup); else { render(); measure(''); loop(); }
      },
      repaint() { if (F) render(); },
      live(key) { if (!F) return; if (key === 'running') loop(); else if (!rig.raf) loop(); },
      resize() { if (F) render(); },
      pause() { rig.stop(); },
      resume() { if (F) { render(); loop(); } },
      action(key) {
        if (key === 'reseed') this.regenerate();
        else if (key === 'burst') burst(400);
      },
      disturb(p) {
        if (!F) return;
        // a warm blob under the pointer, spun by the drag
        const swirl = U.clamp((p.dx || 0) * 40, -1, 1) * 20;
        P.splat.draw(F.write, { u_src: F.read, u_pos: [p.x, p.yGL], u_add: [0.5, swirl, 0, 0], u_rad: 0.045, u_amt: 1, u_mode: { int: 1 } });
        F.swap();
        render();
        if (!rig.raf) loop();
      },
      exportPNG(w, h) { if (!F) return Promise.reject(new Error('nothing to export')); return rig.exportPNG(w, h, render); },
    };
  }
})();
