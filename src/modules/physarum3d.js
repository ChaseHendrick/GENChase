
/* modules/physarum3d.js */
/* GENChase — Physarum 3D: slime mold agents weaving a filament network inside a volume. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };

  const AGENT_BUDGET = 150000;   // agent updates per frame before sub-steps are cut back
  const STEP_CAP = 48;           // hard ceiling on sub-steps in one frame
  const SIM_MAX_MS = 110;        // extra sub-steps are allowed only while the GPU is the bottleneck
  const WARM_MS = 40;            // synchronous warm-up inside regenerate()
  const WARM_STEPS = 260;        // reduced motion: bounded steps run in chunks, then one still frame
  const PACK_N = 4096;           // entries in the float -> byte encoding table
  const TOP = 1.6;               // encoded ceiling, as a multiple of the measured reference level
  const REF_PCT = 0.99;          // percentile of occupied cells used as the reference level
  const REF_FALL = 0.97;         // reference level rises at once, falls slowly (no flicker)

  const f1 = v => v.toFixed(1);
  const f2 = v => v.toFixed(2);
  const deg = v => v + '°';

  /* ----------------------------------------------------------------
     Volume raymarcher. The volume lives in a 2D atlas (u_cols slices
     per row); a sample is a hardware bilinear fetch inside each of the
     two nearest slices plus a manual lerp between them.
  ---------------------------------------------------------------- */
  const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_res;
uniform vec3 u_ro;
uniform float u_fov;
uniform float u_steps;
uniform sampler2D u_vol;
uniform vec2 u_atlas;
uniform float u_V;
uniform float u_cols;
uniform float u_top;
uniform float u_dens;
uniform float u_exposure;
uniform float u_gamma;
uniform float u_balance;
uniform float u_cue;
uniform vec3 u_bg;

${G.GLSL.hash}
${G.GLSL.ramp}

// one slice of the atlas, clamped inside its tile so bilinear never bleeds into the neighbor
float sliceAt(vec2 xy, float z) {
  float tx = floor(mod(z, u_cols));
  float ty = floor(z / u_cols);
  vec2 t = clamp(xy * u_V, vec2(0.5), vec2(u_V - 0.5));
  return texture(u_vol, (vec2(tx, ty) * u_V + t) / u_atlas).r;
}

float density(vec3 p) {
  float fz = clamp(p.z * u_V - 0.5, 0.0, u_V - 1.0);
  float z0 = floor(fz);
  float a = sliceAt(p.xy, z0);
  float b = sliceAt(p.xy, min(z0 + 1.0, u_V - 1.0));
  float v = mix(a, b, fz - z0);
  return v * v * u_top;             // undo the sqrt encoding: 1.0 == the measured reference level
}

void main() {
  vec3 fwd = normalize(-u_ro);
  vec3 rgt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 upv = cross(rgt, fwd);
  vec2 sc = (v_uv * 2.0 - 1.0) * vec2(u_res.x / u_res.y, 1.0);
  vec3 rd = normalize(fwd * u_fov + rgt * sc.x + upv * sc.y);

  vec3 inv = 1.0 / rd;
  vec3 ta = (vec3(-0.5) - u_ro) * inv, tb = (vec3(0.5) - u_ro) * inv;
  vec3 lo = min(ta, tb), hi = max(ta, tb);
  float tN = max(max(max(lo.x, lo.y), lo.z), 0.0);
  float tF = min(min(hi.x, hi.y), hi.z);

  vec3 col = vec3(0.0);
  float T = 1.0;
  if (tF > tN) {
    int N = int(u_steps);
    float dt = (tF - tN) / u_steps;
    float span = max(tF - tN, 1e-4);
    float t = tN + dt * hash21(gl_FragCoord.xy);
    for (int i = 0; i < 256; i++) {
      if (i >= N || T < 0.004) break;
      vec3 q = u_ro + rd * t + 0.5;
      float d = density(q);
      if (d > 0.002) {
        vec3 e = smoothstep(vec3(0.0), vec3(0.07), q) * smoothstep(vec3(0.0), vec3(0.07), 1.0 - q);
        d *= e.x * e.y * e.z;
        float a = 1.0 - exp(-d * u_dens * 8.0 * dt);
        float tone = pow(1.0 - exp(-d * u_exposure * 4.4), u_gamma);
        vec3 c = ramp(tone) * u_balance;
        c = mix(c, u_bg, u_cue * clamp((t - tN) / span, 0.0, 1.0));
        col += T * a * c;
        T *= 1.0 - a;
      }
      t += dt;
    }
  }
  outColor = vec4(col + T * u_bg, 1.0);
}`;

  const schema = [
    // ---- Colony
    { group: 'Colony', key: 'agents', label: 'Agents', type: 'range', kind: GEOM, min: 10000, max: 200000, step: 5000, fmt: v => v.toLocaleString() },
    { group: 'Colony', key: 'vol', label: 'Volume', type: 'seg', kind: GEOM, options: [['64', '64³'], ['96', '96³'], ['128', '128³'], ['160', '160³']] },
    { group: 'Colony', key: 'spawn', label: 'Spawn', type: 'seg', kind: GEOM, wrap: true,
      options: [['uniform', 'Uniform'], ['shell', 'Shell'], ['filament', 'Filament seeds'], ['noise', 'Noise']] },
    { group: 'Colony', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    // ---- Behavior
    { group: 'Behavior', key: 'sensorAngle', label: 'Sensor angle', type: 'range', kind: LIVE, min: 8, max: 80, step: 1, fmt: deg },
    { group: 'Behavior', key: 'sensorDist', label: 'Sensor distance', type: 'range', kind: LIVE, min: 1, max: 24, step: 0.5, fmt: v => f1(v) + ' cells' },
    { group: 'Behavior', key: 'turnRate', label: 'Turn rate', type: 'range', kind: LIVE, min: 5, max: 90, step: 1, fmt: deg },
    { group: 'Behavior', key: 'stepSize', label: 'Step size', type: 'range', kind: LIVE, min: 0.2, max: 2.5, step: 0.1, fmt: f1 },
    { group: 'Behavior', key: 'deposit', label: 'Deposit', type: 'range', kind: LIVE, min: 0.5, max: 15, step: 0.5, fmt: f1 },
    { group: 'Behavior', key: 'decay', label: 'Decay', type: 'range', kind: LIVE, min: 0.5, max: 15, step: 0.5, fmt: v => f1(v) + '%' },
    { group: 'Behavior', key: 'respawn', label: 'Respawn', type: 'range', kind: LIVE, min: 0, max: 3, step: 0.1, fmt: v => v.toFixed(1) + '% / step' },
    { group: 'Behavior', key: 'blurEvery', label: 'Blur interval', type: 'range', kind: LIVE, min: 1, max: 8, step: 1, fmt: v => v === 1 ? 'every step' : 'every ' + v + ' steps' },
    { group: 'Behavior', key: 'stepsPerFrame', label: 'Steps per frame', type: 'range', kind: LIVE, min: 1, max: 6, step: 1 },
    { group: 'Behavior', key: 'stopAfter', label: 'Run for', type: 'range', kind: LIVE, min: 200, max: 4000, step: 100, fmt: v => v >= 4000 ? '∞' : v + ' steps' },
    { group: 'Behavior', key: 'reset', label: 'Restart from seed', type: 'action' },
    // ---- Food
    { group: 'Food', key: 'food', label: 'Food points', type: 'range', kind: GEOM, min: 0, max: 40, step: 1 },
    { group: 'Food', key: 'foodStrength', label: 'Food strength', type: 'range', kind: LIVE, min: 0.5, max: 10, step: 0.5, fmt: f1, dimUnless: s => s.food > 0 },
    // ---- Camera
    { group: 'Camera', key: 'azimuth', label: 'Azimuth', type: 'range', kind: PAINT, min: 0, max: 359, step: 1, fmt: deg },
    { group: 'Camera', key: 'elevation', label: 'Elevation', type: 'range', kind: PAINT, min: -80, max: 80, step: 1, fmt: deg },
    { group: 'Camera', key: 'distance', label: 'Distance', type: 'range', kind: PAINT, min: 1.1, max: 4, step: 0.05, fmt: f2 },
    { group: 'Camera', key: 'fov', label: 'Lens (higher = tighter)', type: 'range', kind: PAINT, min: 0.9, max: 4, step: 0.05, fmt: f2 },
    { group: 'Camera', key: 'autoOrbit', label: 'Auto orbit', type: 'toggle', kind: LIVE },
    { group: 'Camera', key: 'orbitSpeed', label: 'Orbit speed', type: 'range', kind: PAINT, min: 1, max: 20, step: 1, dimUnless: s => s.autoOrbit },
    // ---- Render
    { group: 'Render', key: 'samples', label: 'Ray samples', type: 'range', kind: PAINT, min: 64, max: 192, step: 8 },
    { group: 'Render', key: 'dens', label: 'Density scale', type: 'range', kind: PAINT, min: 0.2, max: 6, step: 0.05, fmt: f2 },
    { group: 'Render', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.3, max: 4, step: 0.05, fmt: f2 },
    { group: 'Render', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 3, step: 0.05, fmt: f2 },
    { group: 'Render', key: 'balance', label: 'Emission ⇄ absorption', type: 'range', kind: PAINT, min: 0, max: 1.5, step: 0.05, fmt: f2 },
    { group: 'Render', key: 'cue', label: 'Depth cueing', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: v => Math.round(v * 100) + '%' },
  ];

  const defaults = {
    agents: 60000, vol: '96', spawn: 'filament', aspect: '1:1',
    sensorAngle: 32, sensorDist: 4, turnRate: 44, stepSize: 1, deposit: 5, decay: 9,
    respawn: 0.8, blurEvery: 3, stepsPerFrame: 2, stopAfter: 1600,
    food: 22, foodStrength: 3.5,
    azimuth: 35, elevation: 18, distance: 1.75, fov: 2.75, autoOrbit: false, orbitSpeed: 6,
    samples: 96, dens: 2.4, exposure: 1.3, gamma: 2, balance: 1.05, cue: 0.34,
    seed: 'physarum3d-0417',
  };

  const P = Studio.PALETTES;
  const presets = {
    cosmic: { label: 'Cosmic web', palette: P.xray,
      p: { agents: 60000, vol: '96', spawn: 'filament', sensorAngle: 32, sensorDist: 4, turnRate: 44, stepSize: 1, deposit: 5, decay: 9, respawn: 0.8, blurEvery: 3, stepsPerFrame: 2, stopAfter: 1600, food: 22, foodStrength: 3.5, azimuth: 35, elevation: 18, distance: 1.75, fov: 2.75, samples: 96, dens: 2.4, exposure: 1.3, gamma: 2, balance: 1.05, cue: 0.34 } },
    mycelium: { label: 'Mycelium', palette: P.bioluminescent,
      p: { agents: 90000, vol: '96', spawn: 'uniform', sensorAngle: 34, sensorDist: 3, turnRate: 46, stepSize: 0.9, deposit: 5, decay: 9, respawn: 0.9, blurEvery: 3, stepsPerFrame: 2, stopAfter: 1600, food: 0, foodStrength: 3, azimuth: 28, elevation: 14, distance: 1.7, fov: 2.6, samples: 112, dens: 1.9, exposure: 0.8, gamma: 1.7, balance: 1.05, cue: 0.44 } },
    neurons: { label: 'Neurons', palette: P.nightshade,
      p: { agents: 55000, vol: '96', spawn: 'filament', sensorAngle: 16, sensorDist: 15, turnRate: 15, stepSize: 1.3, deposit: 6, decay: 5, respawn: 0.4, blurEvery: 4, stepsPerFrame: 2, stopAfter: 1600, food: 14, foodStrength: 6, azimuth: 52, elevation: 24, distance: 1.9, fov: 2.85, samples: 112, dens: 2, exposure: 0.75, gamma: 1.8, balance: 1.1, cue: 0.3 } },
    nebula: { label: 'Nebula', palette: P.thermal,
      p: { agents: 120000, vol: '96', spawn: 'noise', sensorAngle: 58, sensorDist: 3, turnRate: 62, stepSize: 1.4, deposit: 3, decay: 3.5, respawn: 0.3, blurEvery: 1, stepsPerFrame: 1, stopAfter: 1200, food: 0, foodStrength: 3, azimuth: 20, elevation: 10, distance: 1.6, fov: 2.5, samples: 128, dens: 1.4, exposure: 0.55, gamma: 1.6, balance: 1.2, cue: 0.46 } },
    roots: { label: 'Roots', palette: P.petri,
      p: { agents: 70000, vol: '96', spawn: 'shell', sensorAngle: 20, sensorDist: 9, turnRate: 34, stepSize: 1, deposit: 5, decay: 7, respawn: 0.5, blurEvery: 3, stepsPerFrame: 2, stopAfter: 1600, food: 0, foodStrength: 3, azimuth: 44, elevation: 12, distance: 1.8, fov: 2.7, samples: 112, dens: 2.6, exposure: 0.95, gamma: 1.45, balance: 0.28, cue: 0.1 } },
    capillaries: { label: 'Capillaries', palette: P.ember,
      p: { agents: 100000, vol: '96', spawn: 'filament', sensorAngle: 42, sensorDist: 2.5, turnRate: 60, stepSize: 0.7, deposit: 4, decay: 11, respawn: 1.2, blurEvery: 2, stepsPerFrame: 2, stopAfter: 1600, food: 30, foodStrength: 2.5, azimuth: 12, elevation: 28, distance: 1.65, fov: 2.65, samples: 112, dens: 2.3, exposure: 0.85, gamma: 1.7, balance: 1, cue: 0.28 } },
  };

  Studio.register({
    id: 'physarum3d',
    name: 'Physarum 3D',
    subtitle: 'slime mold agents building a filament network in a volume · 2020',
    order: 9,
    equation: 'sense 5 cones around h -> h ← normalize(h + t·(best − h)) -> p += h·SS -> deposit;   trail ← blur₃(trail)·(1−decay)',
    credit: "The 3D Physarum model is Jeff Jones' 2010 agent rule lifted into a volume. Oskar Elek, Joseph N. Burchett, J. Xavier Prochaska and Angus G. Forbes used exactly this construction — slime mold agents released around seed points that deposit constantly — to reconstruct the cosmic web from galaxy positions: Burchett, Elek et al., 'Revealing the Dark Threads of the Cosmic Web', Astrophysical Journal Letters 891, L35 (2020).",
    blurb: 'The same rule that makes Physarum solve mazes on a dish works just as well in three dimensions: each agent smells the trail ahead through a cone of five sensors, turns toward the strongest scent, steps forward and leaves a little more trail. The trail blurs and decays, so only routes that many agents keep re-using survive, and the swarm condenses into a branching filament network with dense nodes where paths meet. In 2020 a team of astronomers and graphics researchers fed the positions of 37,000 galaxies to this model as constantly-emitting food points and let the slime mold find the dark matter filaments between them — the reconstruction matched the absorption seen in Hubble quasar spectra. The volume here is raymarched directly: density is composited front to back, so depth comes from occlusion rather than from shading.',
    schema, defaults, presets,
    hints: {
      Colony: 'The volume is V³ float cells on the CPU, packed into a 2D atlas texture (⌈√V⌉ slices per row) because WebGL2 fullscreen passes have no 3D textures. 96³ with 60k agents is the sweet spot: about 20 ms of simulation per frame. 128³ and 160³ quadruple the diffusion and upload cost — drop steps per frame to 1 there.',
      Behavior: 'Sensor angle and distance set how wide and how far ahead an agent smells; turn rate is how much of that angle it actually takes per step, so a small turn rate with long sensors sweeps out long filaments and a large one knots them into tight cells. Decay runs every step (one multiply over the whole volume) but the separable 3×3×3 blur only runs every few steps — that is what keeps a frame inside its budget. Blurring every step is the most expensive setting here.',
      Food: 'Food points deposit trail constantly, so the colony discovers them and builds filaments between them. This is the cosmic-web construction: galaxies become emitters and the network the slime mold settles into traces the matter between them. "Filament seeds" also releases the agents around those points.',
      Render: 'The ray takes this many samples through the volume and composites them front to back. Density scale sets how opaque the medium is, exposure and gamma map density onto the palette ramp, and emission ⇄ absorption slides from a purely absorbing dust (0, best on a light background) to a self-luminous gas (1.5). Density is normalized against a measured high percentile of the volume every frame, so the picture stays exposed as the network grows. The atlas is re-uploaded once per frame at 64³ and 96³ and every second frame above that, where packing the bytes costs more than the draw.',
    },
    closedGroups: ['Food'],
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors (empty → dense)',
    headline: 'agents', headlineLabel: 'agents',

    surprise(rng) {
      const regime = rng.pick(['web', 'web', 'mycelium', 'cloud', 'lace']);
      const p = {
        vol: rng.pick(['64', '96', '96', '96']),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '16:9']),
        stepSize: Math.round(rng.range(0.8, 1.5) * 10) / 10,
        deposit: rng.pick([3, 4, 5, 6]),
        blurEvery: rng.int(2, 4), stepsPerFrame: 2, stopAfter: 1600,
        respawn: Math.round(rng.range(0.3, 1.2) * 10) / 10,
        azimuth: rng.int(0, 359), elevation: rng.int(-35, 45),
        distance: Math.round(rng.range(1.6, 2.1) * 100) / 100,
        fov: Math.round(rng.range(2.4, 3.2) * 100) / 100,
        autoOrbit: false, orbitSpeed: 6, samples: rng.pick([96, 112, 128]),
        dens: Math.round(rng.range(1.4, 2.8) * 100) / 100,
        exposure: Math.round(rng.range(0.6, 1.5) * 100) / 100,
        gamma: Math.round(rng.range(1.3, 2.2) * 100) / 100,
        balance: rng() < 0.2 ? Math.round(rng.range(0.2, 0.5) * 100) / 100 : Math.round(rng.range(0.85, 1.25) * 100) / 100,
        cue: Math.round(rng.range(0.15, 0.5) * 100) / 100,
      };
      if (regime === 'web') Object.assign(p, { agents: rng.pick([50000, 60000, 75000]), spawn: 'filament', food: rng.int(12, 30), foodStrength: rng.range(2, 5), sensorAngle: rng.int(18, 32), sensorDist: rng.range(7, 14), turnRate: rng.int(22, 40), decay: rng.range(4, 7) });
      else if (regime === 'mycelium') Object.assign(p, { agents: rng.pick([70000, 90000]), spawn: rng.pick(['uniform', 'shell']), food: 0, foodStrength: 3, sensorAngle: rng.int(28, 42), sensorDist: rng.range(4, 8), turnRate: rng.int(40, 60), decay: rng.range(6, 10) });
      else if (regime === 'cloud') Object.assign(p, { agents: rng.pick([110000, 140000]), spawn: 'noise', food: 0, foodStrength: 3, sensorAngle: rng.int(48, 70), sensorDist: rng.range(2, 5), turnRate: rng.int(50, 75), decay: rng.range(2.5, 5), blurEvery: 1, stepsPerFrame: 1, respawn: 0.3 });
      else Object.assign(p, { agents: rng.pick([60000, 80000]), spawn: 'filament', food: rng.int(6, 16), foodStrength: rng.range(4, 7), sensorAngle: rng.int(12, 22), sensorDist: rng.range(14, 22), turnRate: rng.int(10, 22), decay: rng.range(3, 6) });
      return p;
    },

    create(host) {
      const canvas = host.canvas;
      let gl = null, pass = null, rampTex = null, rampKey = '', volTex = null, volKey = '', failed = false;
      let raf = 0, timer = 0, orbitPhase = 0, frameMs = 0, uploadTick = 0;
      let lastGap = 16, lastSimMs = 0, lastFrameAt = 0;
      let sim = null, refLevel = 0, dirty = true;

      const packLUT = new Uint8Array(PACK_N);
      for (let i = 0; i < PACK_N; i++) packLUT[i] = Math.round(255 * Math.sqrt((i + 0.5) / PACK_N));
      const samplesBuf = [];

      function init() {
        if (gl || failed) return !!gl;
        try {
          gl = G.createGL(canvas);
          if (!gl) throw new Error('WebGL2 unavailable');
          pass = new G.Pass(gl, FRAG);
        } catch (e) {
          failed = true; gl = null;
          host.setStatus('<span>WebGL2 is not available in this browser, so this technique cannot render.</span>');
          return false;
        }
        return true;
      }

      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (rampTex && key === rampKey) return rampTex;
        if (rampTex) rampTex.dispose();
        rampTex = G.rampTexture(gl, s.palette, s.bg);
        rampKey = key;
        return rampTex;
      }

      function ensureVolTex() {
        const key = sim.aw + 'x' + sim.ah;
        if (volTex && key === volKey) return;
        if (volTex) gl.deleteTexture(volTex);
        volTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, volTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, sim.aw, sim.ah, 0, gl.RED, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        volKey = key;
      }

      /* ---------------- volume + agents ---------------- */
      // 3D value noise folded out of the shared 2D noise, for the "noise" spawn mode
      function noise3(nz, x, y, z) {
        return (nz.n2(x + z * 0.71, y - z * 0.43) + nz.n2(y + 31.4, z - x * 0.37) + nz.n2(z + 7.7, x + y * 0.51)) / 3;
      }

      function clusterPoints(rng, V, n) {
        const pts = [], margin = V * 0.12, minD2 = Math.pow(V * 0.2, 2);
        for (let i = 0; i < n; i++) {
          let bx = 0, by = 0, bz = 0, best = -1;
          for (let t = 0; t < 26; t++) {         // best-candidate sampling keeps the points spread out
            const cx = margin + rng() * (V - 2 * margin), cy = margin + rng() * (V - 2 * margin), cz = margin + rng() * (V - 2 * margin);
            let d2 = Infinity;
            for (let k = 0; k < pts.length; k++) {
              const ddx = pts[k][0] - cx, ddy = pts[k][1] - cy, ddz = pts[k][2] - cz;
              d2 = Math.min(d2, ddx * ddx + ddy * ddy + ddz * ddz);
            }
            if (d2 > best) { best = d2; bx = cx; by = cy; bz = cz; }
            if (d2 > minD2) break;
          }
          pts.push([bx, by, bz]);
        }
        return pts;
      }

      // Place one agent according to the spawn mode, with a fresh uniformly random heading.
      function placeAgent(mode, i) {
        const rng = sim.rng, V = sim.V, c = V / 2, pts = sim.pts, nz = sim.nz;
        let px, py, pz;
        if (mode === 'shell') {
          const u = rng() * 2 - 1, a = rng() * TAU, r = V * (0.36 + rng.gauss() * 0.012), sq = Math.sqrt(1 - u * u);
          px = c + sq * Math.cos(a) * r; py = c + sq * Math.sin(a) * r; pz = c + u * r;
        } else if (mode === 'filament') {
          const p0 = pts[rng.int(0, pts.length - 1)], spread = V * 0.085;
          px = p0[0] + rng.gauss() * spread; py = p0[1] + rng.gauss() * spread; pz = p0[2] + rng.gauss() * spread;
        } else if (mode === 'noise') {
          let tries = 0;
          do { px = rng() * V; py = rng() * V; pz = rng() * V; tries++; }
          while (tries < 10 && rng() > U.smoothstep(-0.15, 0.45, noise3(nz, px / V * 3.1, py / V * 3.1, pz / V * 3.1)));
        } else { px = rng() * V; py = rng() * V; pz = rng() * V; }
        sim.x[i] = wrap1(px, V); sim.y[i] = wrap1(py, V); sim.z[i] = wrap1(pz, V);
        const u = rng() * 2 - 1, a = rng() * TAU, sq = Math.sqrt(1 - u * u);
        sim.hx[i] = sq * Math.cos(a); sim.hy[i] = sq * Math.sin(a); sim.hz[i] = u;
      }

      function wrap1(v, V) { v = v % V; if (v < 0) v += V; return Math.min(v, V - 1e-3); }

      function placeFood(pts) {
        const V = sim.V, VV = V * V, rad = Math.max(1.6, V * 0.03), r2 = rad * rad;
        const idx = [], wgt = [];
        for (let k = 0; k < pts.length; k++) {
          const px = pts[k][0], py = pts[k][1], pz = pts[k][2];
          const x0 = Math.max(0, Math.floor(px - rad)), x1 = Math.min(V - 1, Math.ceil(px + rad));
          const y0 = Math.max(0, Math.floor(py - rad)), y1 = Math.min(V - 1, Math.ceil(py + rad));
          const z0 = Math.max(0, Math.floor(pz - rad)), z1 = Math.min(V - 1, Math.ceil(pz + rad));
          for (let zz = z0; zz <= z1; zz++) for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
            const ddx = xx + 0.5 - px, ddy = yy + 0.5 - py, ddz = zz + 0.5 - pz, d2 = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 < r2) { idx.push(zz * VV + yy * V + xx); wgt.push(Math.exp(-d2 / r2 * 2.5)); }
          }
        }
        sim.foodIdx = idx.length ? Int32Array.from(idx) : null;
        sim.foodW = idx.length ? Float32Array.from(wgt) : null;
      }

      function initSim(s) {
        const V = Number(s.vol), N = s.agents;
        const cols = Math.ceil(Math.sqrt(V)), rows = Math.ceil(V / cols);
        sim = {
          rng: U.makeRng(s.seed + '/physarum3d'), V, VV: V * V, N, step: 0, done: false,
          trail: new Float32Array(V * V * V), tmp: new Float32Array(V * V * V),
          x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
          hx: new Float32Array(N), hy: new Float32Array(N), hz: new Float32Array(N),
          cols, rows, aw: cols * V, ah: rows * V, bytes: new Uint8Array(cols * V * rows * V),
          foodIdx: null, foodW: null, pts: null, nz: null,
        };
        sim.pts = clusterPoints(sim.rng, V, s.food > 0 ? s.food : 10);
        sim.nz = s.spawn === 'noise' ? U.makeNoise(sim.rng) : null;
        for (let i = 0; i < N; i++) placeAgent(s.spawn, i);
        if (s.food > 0) placeFood(sim.pts);
        refLevel = 0; dirty = true;
      }

      /* ---------------- one simulation step ---------------- */
      function step(s) {
        const V = sim.V, VV = sim.VV, N = sim.N, trail = sim.trail;
        const x = sim.x, y = sim.y, z = sim.z, hx = sim.hx, hy = sim.hy, hz = sim.hz;
        const SO = s.sensorDist, SS = s.stepSize, D = s.deposit;
        const sa = s.sensorAngle * TAU / 360;
        const cs = Math.cos(sa), sn = Math.sin(sa);
        const tf = Math.min(1, s.turnRate / s.sensorAngle);   // take this much of the sensor angle per step

        if (sim.foodIdx) {
          const fi = sim.foodIdx, fw = sim.foodW, amt = s.foodStrength * D;
          for (let k = 0; k < fi.length; k++) trail[fi[k]] += amt * fw[k];
        }

        for (let i = 0; i < N; i++) {
          const px = x[i] + 0.5, py = y[i] + 0.5, pz = z[i] + 0.5;
          let ax = hx[i], ay = hy[i], az = hz[i];
          // an orthonormal pair perpendicular to the heading, so the cone is well conditioned
          let ux, uy, uz;
          if (az < 0.9 && az > -0.9) { ux = -ay; uy = ax; uz = 0; } else { ux = 0; uy = -az; uz = ay; }
          const il = 1 / Math.sqrt(ux * ux + uy * uy + uz * uz);
          ux *= il; uy *= il; uz *= il;
          const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
          const fx = ax * cs, fy = ay * cs, fz = az * cs;
          const sux = ux * sn, suy = uy * sn, suz = uz * sn;
          const svx = vx * sn, svy = vy * sn, svz = vz * sn;
          let sx, sy, sz, val, dx, dy, dz;

          sx = (px + ax * SO) | 0; sy = (py + ay * SO) | 0; sz = (pz + az * SO) | 0;
          if (sx < 0) sx += V; else if (sx >= V) sx -= V;
          if (sy < 0) sy += V; else if (sy >= V) sy -= V;
          if (sz < 0) sz += V; else if (sz >= V) sz -= V;
          let best = trail[sz * VV + sy * V + sx], bx = ax, by = ay, bz = az;

          dx = fx + sux; dy = fy + suy; dz = fz + suz;
          sx = (px + dx * SO) | 0; sy = (py + dy * SO) | 0; sz = (pz + dz * SO) | 0;
          if (sx < 0) sx += V; else if (sx >= V) sx -= V;
          if (sy < 0) sy += V; else if (sy >= V) sy -= V;
          if (sz < 0) sz += V; else if (sz >= V) sz -= V;
          val = trail[sz * VV + sy * V + sx];
          if (val > best) { best = val; bx = dx; by = dy; bz = dz; }

          dx = fx - sux; dy = fy - suy; dz = fz - suz;
          sx = (px + dx * SO) | 0; sy = (py + dy * SO) | 0; sz = (pz + dz * SO) | 0;
          if (sx < 0) sx += V; else if (sx >= V) sx -= V;
          if (sy < 0) sy += V; else if (sy >= V) sy -= V;
          if (sz < 0) sz += V; else if (sz >= V) sz -= V;
          val = trail[sz * VV + sy * V + sx];
          if (val > best) { best = val; bx = dx; by = dy; bz = dz; }

          dx = fx + svx; dy = fy + svy; dz = fz + svz;
          sx = (px + dx * SO) | 0; sy = (py + dy * SO) | 0; sz = (pz + dz * SO) | 0;
          if (sx < 0) sx += V; else if (sx >= V) sx -= V;
          if (sy < 0) sy += V; else if (sy >= V) sy -= V;
          if (sz < 0) sz += V; else if (sz >= V) sz -= V;
          val = trail[sz * VV + sy * V + sx];
          if (val > best) { best = val; bx = dx; by = dy; bz = dz; }

          dx = fx - svx; dy = fy - svy; dz = fz - svz;
          sx = (px + dx * SO) | 0; sy = (py + dy * SO) | 0; sz = (pz + dz * SO) | 0;
          if (sx < 0) sx += V; else if (sx >= V) sx -= V;
          if (sy < 0) sy += V; else if (sy >= V) sy -= V;
          if (sz < 0) sz += V; else if (sz >= V) sz -= V;
          val = trail[sz * VV + sy * V + sx];
          if (val > best) { best = val; bx = dx; by = dy; bz = dz; }

          const tx = ax + (bx - ax) * tf, ty = ay + (by - ay) * tf, tz = az + (bz - az) * tf;
          const l2 = 1 / Math.sqrt(tx * tx + ty * ty + tz * tz + 1e-12);
          ax = tx * l2; ay = ty * l2; az = tz * l2;

          let nx = px - 0.5 + ax * SS, ny = py - 0.5 + ay * SS, nz2 = pz - 0.5 + az * SS;
          if (nx < 0) nx += V; else if (nx >= V) nx -= V;
          if (ny < 0) ny += V; else if (ny >= V) ny -= V;
          if (nz2 < 0) nz2 += V; else if (nz2 >= V) nz2 -= V;
          x[i] = nx; y[i] = ny; z[i] = nz2; hx[i] = ax; hy[i] = ay; hz[i] = az;
          trail[(nz2 | 0) * VV + (ny | 0) * V + (nx | 0)] += D;
        }

        // A slice of the colony is relocated every step. Without it every agent eventually
        // joins the single strongest filament and the network collapses to one tube.
        const rs = Math.round(N * s.respawn / 100);
        if (rs > 0) { const rng = sim.rng; for (let k = 0; k < rs; k++) placeAgent('uniform', rng.int(0, N - 1)); }

        sim.step++;
        if (sim.step % s.blurEvery === 0) blur(1 - s.decay / 100);
        else decay(1 - s.decay / 100);
        dirty = true;
      }

      function decay(keep) {
        const t = sim.trail, n = t.length;
        for (let i = 0; i < n; i++) t[i] *= keep;
      }

      // Separable (1,2,1)/4 blur across x, y and z, each pass walking memory in slabs
      // so the z pass is sequential rather than strided. Decay is folded into the last pass.
      function blur(keep) {
        const V = sim.V, VV = sim.VV, n = V * V * V;
        const a = sim.trail, b = sim.tmp;
        for (let s0 = 0; s0 < n; s0 += V) {
          let prev = a[s0 + V - 1];
          for (let i = 0; i < V - 1; i++) { const c = a[s0 + i]; b[s0 + i] = (prev + c + c + a[s0 + i + 1]) * 0.25; prev = c; }
          const c = a[s0 + V - 1]; b[s0 + V - 1] = (prev + c + c + a[s0]) * 0.25;
        }
        for (let sl = 0; sl < n; sl += VV) {
          for (let i = 0; i < V; i++) {
            const o = sl + i * V, up = sl + (i === 0 ? V - 1 : i - 1) * V, dn = sl + (i === V - 1 ? 0 : i + 1) * V;
            for (let j = 0; j < V; j++) a[o + j] = (b[up + j] + b[o + j] + b[o + j] + b[dn + j]) * 0.25;
          }
        }
        const q = keep * 0.25;
        for (let k = 0; k < V; k++) {
          const o = k * VV, up = (k === 0 ? V - 1 : k - 1) * VV, dn = (k === V - 1 ? 0 : k + 1) * VV;
          for (let j = 0; j < VV; j++) b[o + j] = (a[up + j] + a[o + j] + a[o + j] + a[dn + j]) * q;
        }
        sim.trail = b; sim.tmp = a;
      }

      /* ---------------- self-calibrating encode ---------------- */
      // The trail's absolute scale swings by orders of magnitude with agents, deposit and
      // decay, so the reference level is measured from the volume itself: a high percentile
      // of the occupied cells. It rises at once and falls slowly, so the picture neither
      // clips nor flickers while the network grows.
      function measureRef() {
        const t = sim.trail, n = t.length, stride = Math.max(1, Math.floor(n / 9000));
        samplesBuf.length = 0;
        for (let i = 0; i < n; i += stride) { const v = t[i]; if (v > 1e-6) samplesBuf.push(v); }
        if (!samplesBuf.length) return Math.max(refLevel, 1e-6);
        samplesBuf.sort((p, q) => p - q);
        const p = samplesBuf[Math.min(samplesBuf.length - 1, Math.floor(samplesBuf.length * REF_PCT))];
        refLevel = refLevel > 0 ? Math.max(p, refLevel * REF_FALL) : p;
        return Math.max(refLevel, 1e-6);
      }

      // volume -> atlas bytes, encoded as sqrt(v / (ref*TOP)) so 8 bits keep the faint trail
      function packAtlas() {
        const ref = measureRef();
        const V = sim.V, VV = sim.VV, cols = sim.cols, aw = sim.aw;
        const t = sim.trail, bytes = sim.bytes, lut = packLUT;
        const sc = PACK_N / (ref * TOP), top = PACK_N - 1;
        for (let zz = 0; zz < V; zz++) {
          const tx = (zz % cols) * V, ty = ((zz / cols) | 0) * V;
          for (let yy = 0; yy < V; yy++) {
            const src = zz * VV + yy * V, dst = (ty + yy) * aw + tx;
            for (let xx = 0; xx < V; xx++) {
              let k = (t[src + xx] * sc) | 0; if (k > top) k = top;
              bytes[dst + xx] = lut[k];
            }
          }
        }
        ensureVolTex();
        gl.bindTexture(gl.TEXTURE_2D, volTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sim.aw, sim.ah, gl.RED, gl.UNSIGNED_BYTE, bytes);
        dirty = false;
      }

      /* ---------------- render ---------------- */
      function uniforms(s, w, h, steps) {
        const az = (s.azimuth + orbitPhase) * Math.PI / 180, el = s.elevation * Math.PI / 180;
        const ro = [
          s.distance * Math.cos(el) * Math.cos(az),
          s.distance * Math.sin(el),
          s.distance * Math.cos(el) * Math.sin(az),
        ];
        const bg = U.hexToRgb(s.bg).map(v => v / 255);
        return {
          u_res: [w, h], u_ro: ro, u_fov: s.fov, u_steps: steps,
          u_vol: volTex, u_atlas: [sim.aw, sim.ah], u_V: sim.V, u_cols: sim.cols, u_top: TOP,
          u_dens: s.dens, u_exposure: s.exposure, u_gamma: s.gamma, u_balance: s.balance, u_cue: s.cue,
          u_bg: bg, u_ramp: ensureRamp(s),
        };
      }

      function uploadEvery() { return sim.V >= 128 ? 2 : 1; }

      function draw(preview) {
        if (!init() || !sim) return;
        const s = host.getState();
        const t0 = performance.now();
        if (dirty && (uploadTick++ % uploadEvery() === 0 || !preview)) packAtlas();
        else ensureVolTex();
        const steps = preview ? Math.max(48, Math.round(s.samples * 0.6)) : s.samples;
        pass.draw(null, uniforms(s, canvas.width, canvas.height, steps));
        gl.finish();
        frameMs = lastSimMs + (performance.now() - t0);
        status();
      }

      function status() {
        host.setStatus(
          '<span><b>' + sim.N.toLocaleString() + '</b> agents</span>' +
          '<span>step ' + sim.step + (sim.done ? ' · settled' : '') + '</span>' +
          '<span>' + sim.V + '³ volume</span>' +
          '<span>' + Math.round(frameMs) + ' ms</span>');
      }

      /* ---------------- loop ---------------- */
      function stopLimit(s) { return s.stopAfter >= 4000 ? Infinity : s.stopAfter; }
      function orbiting(s) { return s.autoOrbit && !host.reducedMotion(); }
      function stopLoop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

      function substeps(s) { return Math.max(1, Math.min(s.stepsPerFrame, Math.floor(AGENT_BUDGET / sim.N))); }

      function frame() {
        raf = 0;
        const s = host.getState();
        const limit = stopLimit(s);
        const want = substeps(s);
        const t0 = performance.now();
        lastGap = lastFrameAt ? Math.min(t0 - lastFrameAt, 1000) : 16;
        lastFrameAt = t0;
        // when the draw dominates the frame (software rasteriser, very large canvas) the CPU
        // would otherwise idle waiting for it, so spend that slack on extra sub-steps
        const budget = U.clamp(lastGap - lastSimMs - 20, 0, SIM_MAX_MS);
        let n = 0;
        while (sim.step < limit && n < STEP_CAP && (n < want || performance.now() - t0 < budget)) { step(s); n++; }
        lastSimMs = performance.now() - t0;
        sim.done = sim.step >= limit;
        if (orbiting(s)) orbitPhase = (orbitPhase + s.orbitSpeed * 0.06) % 360;
        draw(!sim.done || orbiting(s));
        if ((!sim.done || orbiting(s)) && host.isActive()) raf = requestAnimationFrame(frame);
      }

      // Reduced motion: advance in bounded synchronous chunks, then draw one settled frame.
      function chunk() {
        timer = 0;
        const s = host.getState();
        const limit = Math.min(WARM_STEPS, stopLimit(s));
        const t0 = performance.now();
        while (sim.step < limit && performance.now() - t0 < 40) step(s);
        lastSimMs = performance.now() - t0;
        frameMs = lastSimMs;
        if (sim.step < limit) { status(); timer = setTimeout(chunk, 0); }
        else { sim.done = true; draw(false); }
      }

      function start() {
        stopLoop();
        const s = host.getState();
        if (host.reducedMotion()) { if (!sim.done) timer = setTimeout(chunk, 0); else draw(false); return; }
        if (sim.done && !orbiting(s)) { draw(false); return; }
        raf = requestAnimationFrame(frame);
      }

      function readTarget(target) {
        const w = target.w, h = target.h;
        const px = new Uint8Array(w * h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d');
        const img = cx.createImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        cx.putImageData(img, 0, 0);
        return c;
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stopLoop();
          if (!init()) return;
          const s = host.getState();
          initSim(s);
          lastFrameAt = 0; lastSimMs = 0;
          if (!host.reducedMotion()) {          // a short warm-up so the first frame already has structure
            const t0 = performance.now();
            while (sim.step < 12 && performance.now() - t0 < WARM_MS) step(s);
            lastSimMs = performance.now() - t0;
          }
          draw(true);
          start();
        },
        repaint() { if (!raf && !timer) draw(false); },
        live(key) {
          const s = host.getState();
          if (key === 'stopAfter' && sim && sim.step < stopLimit(s)) sim.done = false;
          if (!raf && !timer) start();
        },
        resize() { if (!raf && !timer) draw(false); },
        pause() { stopLoop(); },
        resume() { if (!raf && !timer) start(); },
        action(key) { if (key === 'reset') this.regenerate(); },
        async exportPNG(w, h) {
          if (!init()) throw new Error('WebGL2 unavailable');
          const s = host.getState();
          if (dirty) packAtlas(); else ensureVolTex();
          const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
          const mp = (w * h) / 1e6;
          const ss = mp <= 20 ? 2 : (mp <= 45 ? 1.5 : 1);
          let pw = Math.round(w * ss), ph = Math.round(h * ss);
          const fit = Math.min(1, maxTex / Math.max(pw, ph));
          pw = Math.max(64, Math.round(pw * fit)); ph = Math.max(64, Math.round(ph * fit));
          const target = new G.Target(gl, pw, ph, { type: 'rgba8', filter: 'linear' });
          try {
            pass.draw(target, uniforms(s, pw, ph, s.samples));
            gl.finish();
            let c = readTarget(target);
            if (pw !== w || ph !== h) c = U.upscale(c, w, h, true);
            return await U.toBlob(c);
          } finally {
            target.dispose();
          }
        },
      };
    },
  });
})();

