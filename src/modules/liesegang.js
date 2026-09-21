
/* modules/liesegang.js */
/* GENChase · Liesegang rings: a reaction front in a gel, Ostwald supersaturation, and the Jablczynski spacing law. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;              // reduce grid: 32x32 blocks, read back as bytes
  const SCAN = 256;            // samples along the radius (or the row) used to find the bands
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // The outer electrolyte is held at 1 in the source, and both electrolytes are clamped in the step
  // shader. Those clamps are not cosmetic: they are the numbers the step bound below is derived from,
  // so a poke that dumps reagent into the dish cannot quietly push the integrator past its limit.
  const A0 = 1.0, A_MAX = 1.5, B_MAX = 0.5;

  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
// The dish is closed, so every texture is clamp-to-edge and each difference sees its own value past the
// wall: zero gradient, no flux. Nothing leaks out of a Petri dish either.
vec4 st(sampler2D t, vec2 uv){ return texture(t, uv); }
`;

  // Source geometry, shared by the step shader and the initial field so the two never disagree.
  // u_geom: 0 point source, 1 a line (the classic test tube, drawn as a tilted junction), 2 two points.
  const SRC = `
uniform int u_geom; uniform vec2 u_s0, u_s1, u_nrm; uniform float u_srad;
float inSource(vec2 p){
  if (u_geom == 1) return step(dot(p - u_s0, u_nrm), 0.0);
  float m = step(length(p - u_s0), u_srad);
  if (u_geom == 2) m = max(m, step(length(p - u_s1), u_srad));
  return m;
}
`;

  // One pass carries the whole system: a, b, c, d live in the four channels of one texture, so a step is
  // a single draw and the five taps of the Laplacian are five fetches rather than twenty.
  //
  //   da/dt = Da lap a - k a b                      outer electrolyte, held at A0 inside the source
  //   db/dt = Db lap b - k a b                      inner electrolyte, loaded into the gel, never resupplied
  //   dc/dt = Dc lap c + k a b - S                  the soluble intermediate
  //   dd/dt = S,  S = pn max(c - c*, 0) + pg min(d/dsat, 1) max(c - cs, 0)
  //
  // The two terms in S are Ostwald's two events. The first is nucleation out of a supersaturated
  // solution, which needs c above c* and happens on clean gel. The second is growth on a crystal that
  // already exists, which only needs c above the plain solubility cs and runs far faster, which is why
  // pg is several times pn. min(d/dsat, 1) is the switch between them: a cell that has only just
  // nucleated is not yet a strong sink, and that delay is what lets a whole ring cross the threshold
  // together instead of one cell winning and starving its neighbors into a dotted line.
  const STEP_FS = HEAD + SRC + `
uniform sampler2D u_st; uniform vec2 u_res;
uniform float u_dt, u_Da, u_Db, u_Dc, u_k, u_cnuc, u_csat, u_pn, u_pg, u_dsat, u_njit, u_step, u_nOff;
${G.GLSL.hash}
void main(){
  vec2 px = 1.0 / u_res;
  vec4 s = st(u_st, v_uv);
  vec4 e = st(u_st, v_uv + vec2(px.x, 0.0)), w = st(u_st, v_uv - vec2(px.x, 0.0));
  vec4 n = st(u_st, v_uv + vec2(0.0, px.y)), so = st(u_st, v_uv - vec2(0.0, px.y));
  vec4 lap = e + w + n + so - 4.0 * s;
  float a = s.r, b = s.g, c = s.b, d = s.a;
  float rxn = u_k * a * b;
  // Nucleation is a fluctuation-driven event, so the barrier gets a small per-site, per-step jitter
  // rather than being a hard number everywhere. The offset comes from the seeded RNG, so the plate
  // still reprints exactly.
  float jit = 1.0 + u_njit * (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0;
  float thr = u_cnuc * jit;
  float grown = min(d / max(u_dsat, 1e-5), 1.0);
  float S = u_pn * max(c - thr, 0.0) + u_pg * grown * max(c - u_csat, 0.0);
  a = clamp(a + u_dt * (u_Da * lap.r - rxn), 0.0, ${A_MAX.toFixed(2)});
  b = clamp(b + u_dt * (u_Db * lap.g - rxn), 0.0, ${B_MAX.toFixed(2)});
  c = clamp(c + u_dt * (u_Dc * lap.b + rxn - S), 0.0, 4.0);
  d = clamp(d + u_dt * S, 0.0, 64.0);
  // The source is a reservoir, not an initial condition: it holds the outer electrolyte at A0 for the
  // whole run, which is what makes the front keep advancing instead of stalling once the first band eats it.
  if (inSource(v_uv * u_res) > 0.5) a = ${A0.toFixed(2)};
  outColor = vec4(a, b, c, d);
}`;

  const RENDER_FS = HEAD + `
uniform sampler2D u_st; uniform vec2 u_res;
uniform int u_view;
uniform float u_lo, u_hi, u_exposure, u_gamma, u_contrast, u_grain, u_curve;
uniform float u_dref, u_cref, u_rref, u_k, u_b0;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
void main(){
  // A few hundred cells across a few thousand print pixels is a ten-fold magnification, where nearest
  // gives a mosaic and bilinear leaves a lattice crease on every ring. Catmull-Rom is interpolating, so
  // a tap at a texel center still returns the cell's own value and the measurement pass agrees with this one.
  vec4 s = max(texCR4(u_st, v_uv, u_res), vec4(0.0));
  // The deposit is not flat across the plate: an outer band drains a wider annulus than an inner one, so
  // it ends up several times heavier, and a linear map that shows the outer rings loses the inner ones
  // entirely. The curve is the density response, the same job a photographic paper's does.
  float p = pow(clamp(s.a / u_dref, 0.0, 1.0), u_curve);
  float t;
  if (u_view == 1) {
    // the precipitate read over what is left in solution: outer electrolyte plus unspent gel loading
    float sol = clamp(0.55 * s.r + 0.45 * (s.g / max(u_b0, 1e-4)), 0.0, 1.0);
    t = clamp(0.34 * sol + 0.88 * p, 0.0, 1.0);
  } else if (u_view == 2) {
    t = pow(clamp(s.b / u_cref, 0.0, 1.0), u_curve);
  } else if (u_view == 3) {
    // the live reaction front, with the bands it has already laid down ghosted behind it
    float rr = pow(clamp(u_k * s.r * s.g / u_rref, 0.0, 1.0), u_curve);
    t = max(rr, 0.32 * p);
  } else {
    t = p;
  }
  t = clamp((t - u_lo) / max(u_hi - u_lo, 1e-4), 0.0, 1.0);
  vec3 col = ramp(t);
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  // Block statistics for the exposure references. Every quantity here is unbounded above, so each is
  // compressed through v/(1+v) before it is written to a byte and expanded again on the way out; a fixed
  // divisor would clip the moment a band got denser than whatever number was guessed.
  const REDUCE_FS = HEAD + `
uniform sampler2D u_st; uniform vec2 u_res, u_block; uniform float u_k;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sd = 0.0, md = 0.0, mc = 0.0, mr = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    vec4 s = max(texture(u_st, uv), vec4(0.0));
    sd += s.a; md = max(md, s.a); mc = max(mc, s.b); mr = max(mr, u_k * s.r * s.g);
  }
  sd /= 64.0;
  outColor = vec4(sd / (1.0 + sd), md / (1.0 + md), (20.0 * mc) / (1.0 + 20.0 * mc), (8.0 * mr) / (1.0 + 8.0 * mr));
}`;

  // The band profile: the precipitate averaged around each ring (or down each column, for a line source),
  // written into a 256x1 strip that the CPU reads back and looks for peaks in. Averaging along the band
  // before looking for peaks is the point, because a single ray through a real plate misses half the bands.
  const SCAN_FS = HEAD + `
uniform sampler2D u_st; uniform vec2 u_res;
uniform int u_geom; uniform vec2 u_s0; uniform float u_rmax, u_ar, u_th0, u_dref;
void main(){
  float f = v_uv.x;
  float acc = 0.0, wsum = 0.0, hit = 0.0;
  if (u_geom == 1) {
    for (int i = 0; i < 48; i++) {
      vec2 uv = vec2(f, (float(i) + 0.5) / 48.0);
      float v = max(texture(u_st, uv).a, 0.0);
      acc += v; wsum += 1.0; hit += step(0.25 * u_dref, v);
    }
  } else {
    // one ring at a time. For two sources the sweep is limited to the half turn facing away from the
    // other one, where the rings are that source's own and not an interference pattern.
    float span = u_geom == 2 ? 3.14159265 : 6.28318530718;
    float r = f * u_rmax;
    for (int i = 0; i < 48; i++) {
      float th = u_th0 + (float(i) + 0.5) / 48.0 * span;
      vec2 uv = u_s0 + vec2(cos(th) * r, sin(th) * r / u_ar);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
      float v = max(texture(u_st, uv).a, 0.0);
      acc += v; wsum += 1.0; hit += step(0.25 * u_dref, v);
    }
  }
  float m = wsum > 0.5 ? acc / wsum : 0.0;
  outColor = vec4(clamp(m / u_dref, 0.0, 1.0), wsum > 0.5 ? hit / wsum : 0.0, 0.0, 1.0);
}`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }

  // Explicit Euler on the 5-point lattice with dx = 1. The discrete Laplacian's symbol runs over [-8, 0],
  // so the stiffest linear mode of every field sits at the grid scale and forward Euler needs
  // dt < 2/|lambda| there. The fields are coupled, but what binds an explicit step is the diagonal rate
  // of each equation, so take the worst of the three:
  //
  //   a:  8 Da + k b_max        diffusion, plus the reaction seen as a decay of a at the largest b
  //   b:  8 Db + k a_max        the same with the roles swapped; a_max is the clamp, not a0, because a
  //                             poke can add reagent
  //   c:  8 Dc + pn + pg        diffusion, plus both precipitation sinks at once, which is the case
  //                             where the cell is both supersaturated and already carrying crystal
  //
  // d does not diffuse and has no sink, so it never binds. The 0.8 factor is the usual margin for the
  // nonlinear terms (the product k a b, the min() switch) that a linear estimate does not see. Past the
  // bound the field fills with the grid-scale checkerboard, which a 200 px thumbnail averages into a
  // perfectly plausible plate; tools/check.js reports it as nyq and fails below -0.35.
  function maxDt(s) {
    const Da = Number(s.Da) || 1, k = Number(s.k) || 2;
    const ra = 8 * Da + k * B_MAX;
    const rb = 8 * Da * (Number(s.Dbr) || 0.12) + k * A_MAX;
    const rc = 8 * Da * (Number(s.Dcr) || 0.3) + (Number(s.pn) || 1) + (Number(s.pg) || 3);
    return 1.6 / Math.max(1e-6, Math.max(ra, Math.max(rb, rc)));
  }

  // Where the outer electrolyte enters. Jitter comes from the seed, so two seeds at the same settings
  // are two different dishes rather than the same picture twice.
  function sources(s, W, H) {
    const rng = U.makeRng(s.seed + '/liesegang/src');
    if (s.geom === 'line') {
      // The junction stands along the left edge and the front crosses the long axis of the plate. That
      // is not a composition choice: an explicit scheme buys distance as the square root of the step
      // count, so giving the front the short axis of a wide plate would leave the junction's own solid
      // deposit filling a third of the picture. A small tilt, in cells, keeps the bands off the lattice axis.
      const tilt = rng.range(-0.05, 0.05);
      return { kind: 1, s0: [s.srad + 1.5, H * 0.5], s1: [0, 0], nrm: [Math.cos(tilt), Math.sin(tilt)], th0: 0 };
    }
    if (s.geom === 'two') {
      const th = rng.range(0, TAU), R = rng.range(0.24, 0.33) * Math.min(W, H);
      const dx = Math.cos(th) * R, dy = Math.sin(th) * R;
      return {
        kind: 2, th0: Math.atan2(dy, dx) - Math.PI / 2,
        s0: [W * 0.5 + dx, H * 0.5 + dy], s1: [W * 0.5 - dx, H * 0.5 - dy], nrm: [1, 0],
      };
    }
    return {
      kind: 0, nrm: [1, 0], th0: 0, s1: [0, 0],
      s0: [W * (0.5 + rng.range(-0.07, 0.07)), H * (0.5 + rng.range(-0.07, 0.07))],
    };
  }

  // The gel: uniform inner electrolyte plus a smooth inhomogeneity, and the source disc or strip
  // already flooded with the outer one. The inhomogeneity is deliberately smooth rather than white.
  // White noise at even two percent turns every band into a dotted line, because nucleation is a
  // threshold crossing and the first cell over drains its neighbors before they get there. A field
  // correlated over tens of cells bends the bands instead of breaking them, which is what a real gel does.
  function seedField(s, W, H, src) {
    const rng = U.makeRng(s.seed + '/liesegang/gel');
    const nz = U.makeNoise(rng);
    const data = new Float32Array(W * H * 4);
    const sc = Math.max(6, Number(s.gscale) || 45);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const g = 1 + s.gnoise * nz.fbm(x / sc, y / sc, 2, 2.1, 0.5);
        // cells are square by construction (H = round(W * aspect)), so distance in cells is plain hypot
        let inSrc;
        if (src.kind === 1) inSrc = (x + 0.5 - src.s0[0]) * src.nrm[0] + (y + 0.5 - src.s0[1]) * src.nrm[1] < 0;
        else {
          inSrc = Math.hypot(x + 0.5 - src.s0[0], y + 0.5 - src.s0[1]) <= s.srad;
          if (src.kind === 2) inSrc = inSrc || Math.hypot(x + 0.5 - src.s1[0], y + 0.5 - src.s1[1]) <= s.srad;
        }
        data[i] = inSrc ? A0 : 0;
        data[i + 1] = inSrc ? 0 : Math.max(0, s.b0 * g);
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
    return data;
  }

  // Jablczynski: the band positions measured from the junction obey x_{n+1}/x_n -> 1 + p. Find the peaks
  // in the scanned profile, drop anything narrower than two samples, and take the ratio over the outer
  // half of the bands, where the law is asymptotic and the first band (still inside the source's own
  // depletion zone) cannot drag the number around.
  function bandsFrom(raw, cov, scale, offset) {
    // Smooth the profile over about two cells first. A ring on a square lattice is a rounded polygon,
    // not a circle, so its flats and its corners sit at slightly different radii and the ring averages
    // into two or three peaks a fraction of a cell apart. Unsmoothed, that counts one band as three and
    // drags the measured ratio down towards one, which would be a wrong number stated confidently.
    const W2 = 3, prof = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      let sum = 0, n = 0;
      for (let j = i - W2; j <= i + W2; j++) if (j >= 0 && j < raw.length) { sum += raw[j]; n++; }
      prof[i] = sum / n;
    }
    let mx = 0;
    for (let i = 0; i < prof.length; i++) if (prof[i] > mx) mx = prof[i];
    if (mx <= 0.02) return { x: [], ratio: 0 };
    const cut = 0.10 * mx, x = [], at = [];
    // A band is wider than one sample, so a plateau counts once: keep the strongest sample of any run
    // closer together than two cells, which is nearer than two bands ever are.
    const near = Math.max(2, 2.5 * scale);
    // Height alone does not find the bands. The deposit is heaviest at the center, where the first few
    // rings run together into a disc, so a fixed fraction of the tallest peak throws away every outer
    // ring on the plate. What marks a band is that it stands clear of empty gel on both sides, so the
    // test is prominence: the peak has to rise above the deepest gap within a window either side of it.
    const win = Math.max(4, Math.round(prof.length / 24));
    const dip = i => {
      let l = prof[i], r = prof[i];
      for (let j = i - 1; j >= Math.max(0, i - win); j--) l = Math.min(l, prof[j]);
      for (let j = i + 1; j < Math.min(prof.length, i + win + 1); j++) r = Math.min(r, prof[j]);
      return Math.max(l, r);
    };
    for (let i = 1; i < prof.length - 1; i++) {
      if (prof[i] < cut || cov[i] < 0.08) continue;
      if (prof[i] < prof[i - 1] || prof[i] < prof[i + 1]) continue;
      if (prof[i] - dip(i) < 0.35 * prof[i]) continue;
      const pos = (i + 0.5) * scale - offset;
      if (pos <= 0.5) continue;
      if (x.length && pos - x[x.length - 1] < near) {
        if (prof[i] > prof[at[at.length - 1]]) { x[x.length - 1] = pos; at[at.length - 1] = i; }
        continue;
      }
      x.push(pos); at.push(i);
    }
    if (x.length < 3) return { x, ratio: 0 };
    const from = Math.max(1, Math.floor(x.length / 2));
    let sum = 0, n = 0;
    for (let i = Math.min(from, x.length - 3); i < x.length - 1; i++) { sum += Math.log(x[i + 1] / x[i]); n++; }
    return { x, ratio: n ? Math.exp(sum / n) : 0 };
  }

  const VIEWS = { precip: 0, over: 1, product: 2, front: 3 };
  const GEOM_LABEL = { point: 'point source', line: 'line source', two: 'two sources' };

  /* ---------- Liesegang Rings ---------- */
  Studio.register({
    id: 'liesegang',
    name: 'Liesegang Rings',
    tab: 'Liesegang',
    subtitle: 'periodic precipitation in a gel · 1896',
    order: 35,
    equation: '∂a/∂t = Dₐ∇²a − kab,  ∂b/∂t = D_b∇²b − kab,  ∂c/∂t = D_c∇²c + kab − S,  ∂d/∂t = S',
    credit: "Raphael E. Liesegang, 'Ueber einige Eigenschaften von Gallerten', Naturwissenschaftliche Wochenschrift 11 (30), 353 (1896), reported the rings that silver nitrate leaves when it diffuses into a gel loaded with potassium dichromate. Wilhelm Ostwald, in his note on those lines in Zeitschrift für physikalische Chemie 23, 365 (1897), explained them by supersaturation: the solution ahead of the front passes a nucleation threshold, a band nucleates, and the band then drains the solution around it back below saturation, so the next band has to wait for the front to move on. That supersaturation cycle is what this tab integrates. The geometric spacing is Karol Jablczynski, 'La formation rythmique des précipités: les anneaux de Liesegang', Bulletin de la Société Chimique de France 33, 1592 (1923). Tibor Antal, Michel Droz, Jacques Magnin and Zoltán Rácz, 'Formation of Liesegang patterns: a spinodal decomposition scenario', Physical Review Letters 83, 2880 (1999), derive x_n ~ Q(1+p)^n and the Matalon-Packter form of p from a moving particle source driving a spinodal quench, which is a different mechanism from the one computed here; the spacing law is common to both.",
    blurb: 'Silver nitrate is poured onto a gel loaded with dichromate. The two meet, react, and the product precipitates, but not as a smooth stain: as a set of sharp rings with clear gel between them, the spacing widening as you go out. Ostwald\'s account is the one this tab computes. The reaction front makes a soluble intermediate; the intermediate has to reach a supersaturation threshold before anything crystallises; once a band has nucleated it grows greedily, pulling the intermediate out of solution for some distance around it, and no new band can form until the front has run far enough ahead to build the concentration back up. Because the front moves as the square root of time it keeps slowing down, so each gap takes longer and is wider than the last, and the band positions form a geometric series. The status line measures that ratio off the plate rather than asserting it. Supersaturation c* is the knob that matters: raise it and the bands are fewer, wider apart and sharper, lower it and the deposit closes up into a continuous stain.',
    schema: [
      { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[96, '96'], [128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Dish', key: 'geom', label: 'Source', type: 'seg', kind: GEOM, wrap: true,
        options: [['point', 'Center'], ['line', 'Edge'], ['two', 'Two points']],
        hint: 'A drop at the center gives concentric rings, a flooded edge gives parallel bands, two drops give two ring systems that run into each other. The junction is tilted and the drops placed by the seed, so the same settings are a different dish each time.' },
      RANGE('Dish', 'srad', 'Source radius', GEOM, 1.5, 12, 0.5, f1),
      RANGE('Dish', 'b0', 'Gel loading b₀', GEOM, 0.03, 0.4, 0.005, f3, {
        hint: 'How much inner electrolyte the gel holds. It is never resupplied, so this sets how much precipitate there is to go round and how far the front gets before the gel is spent.' }),
      RANGE('Dish', 'gnoise', 'Gel inhomogeneity', GEOM, 0, 0.35, 0.005, f3, {
        hint: 'A smooth variation in the loading, correlated over tens of cells. Small values bend the bands. Past about 0.15 the bands break into separate crystallites, which is also what a badly set gel does.' }),
      RANGE('Dish', 'gscale', 'Inhomogeneity scale', GEOM, 10, 120, 5, String, { dimUnless: s => s.gnoise > 0 }),
      RANGE('Chemistry', 'k', 'Reaction rate k', LIVE, 0.4, 6, 0.1, f1),
      RANGE('Chemistry', 'Da', 'Outer diffusion Dₐ', LIVE, 0.4, 1.4, 0.02, f2, {
        hint: 'In cells squared per unit time. The front advances as the square root of Dₐt, which is the slowdown the spacing law is built on.' }),
      RANGE('Chemistry', 'Dbr', 'Inner mobility D_b/Dₐ', LIVE, 0.02, 0.6, 0.01, f2, {
        hint: 'The inner electrolyte is trapped in the gel and barely moves, which is what keeps the reaction in a narrow front instead of spreading it over the dish.' }),
      RANGE('Chemistry', 'Dcr', 'Product mobility D_c/Dₐ', LIVE, 0.05, 0.8, 0.01, f2, {
        hint: 'How far the soluble intermediate can travel before it is caught. This is the reach of a band: the distance over which a fresh band starves the gel around it.' }),
      RANGE('Precipitation', 'cnuc', 'Supersaturation c*', LIVE, 0.01, 0.16, 0.002, f3, {
        hint: 'The barrier a clean patch of gel has to clear before anything crystallises at all. Raise it and the bands are fewer, further apart and sharper; lower it and the front lays a continuous stain.' }),
      RANGE('Precipitation', 'csr', 'Saturation c_s/c*', LIVE, 0.05, 0.85, 0.01, f2, {
        hint: 'Once a crystal exists it goes on growing down to the plain solubility, well below the nucleation barrier. The gap between the two is the depletion zone, and therefore the gap between bands.' }),
      RANGE('Precipitation', 'pn', 'Nucleation rate', LIVE, 0.1, 4, 0.05, f2),
      RANGE('Precipitation', 'pg', 'Growth rate', LIVE, 1, 14, 0.2, f1, {
        hint: 'Growth on an existing crystal is much faster than nucleation on clean gel. That ratio is what makes a band a sink rather than a smear.' }),
      RANGE('Precipitation', 'dsat', 'Crystallite size', LIVE, 0.02, 1.5, 0.02, f2, {
        hint: 'How much precipitate a cell must hold before it draws at the full growth rate. Set it near zero and the first cell over the threshold starves the rest of its ring, so the bands come out dotted instead of continuous.' }),
      RANGE('Precipitation', 'njit', 'Nucleation jitter', LIVE, 0, 0.3, 0.005, f3, {
        hint: 'A thermal fluctuation in the barrier, drawn fresh per cell per step. Leave it at zero for continuous bands: nucleation is a threshold crossing, so even a few percent of jitter lets one cell cross first and starve its neighbors, and the ring comes out as a string of separate crystals.' }),
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 16, 1, String),
      RANGE('Simulation', 'dt', 'Time step', LIVE, 0.01, 0.2, 0.005, f3),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 24000, 250, String),
      { group: 'Simulation', key: 'burst', label: 'Run 1000 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
        options: [['precip', 'Precipitate'], ['over', 'Over solution'], ['product', 'Intermediate'], ['front', 'Front']] },
      RANGE('Picture', 'curve', 'Density curve', PAINT, 0.3, 1.5, 0.05, f2, {
        hint: 'Below 1 it lifts the thin inner rings, which carry far less precipitate than the outer ones. At 1 the plate is a linear map of the deposit.' }),
      RANGE('Picture', 'lo', 'Black point', PAINT, 0, 0.9, 0.01, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.1, 1.6, 0.01, f2),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    legacy: { 2: { grid: 128 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 384, aspect: '1:1',
      geom: 'point', srad: 4, b0: 0.22, gnoise: 0.03, gscale: 45,
      k: 2, Da: 1, Dbr: 0.12, Dcr: 0.3,
      cnuc: 0.055, csr: 0.22, pn: 1, pg: 3, dsat: 0.3, njit: 0,
      running: true, steps: 6, dt: 0.17, warmup: 9000,
      view: 'precip', curve: 0.6, lo: 0.02, hi: 0.7, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.05,
      seed: 'liesegang-1896',
    },
    presets: {
      rings: pre('Concentric rings', { geom: 'point', grid: 128, aspect: '1:1', view: 'precip', cnuc: 0.055, gnoise: 0.03, warmup: 9000, lo: 0.02, hi: 0.7 }, Pal.petri),
      plate: pre('The gel plate', { geom: 'point', grid: 128, aspect: '1:1', view: 'over', cnuc: 0.06, gnoise: 0.03, warmup: 8000, lo: 0, hi: 0.95, gamma: 0.9 }, Pal.kiln),
      bands: pre('Parallel bands', { geom: 'line', grid: 128, aspect: '3:2', view: 'precip', cnuc: 0.055, gnoise: 0.012, gscale: 70, warmup: 18000, lo: 0.02, hi: 0.65 }, Pal.graphite),
      twin: pre('Two fronts', { geom: 'two', grid: 128, aspect: '1:1', view: 'precip', cnuc: 0.05, gnoise: 0.02, srad: 3, warmup: 9000, lo: 0.02, hi: 0.7 }, Pal.verdigris),
      intermediate: pre('The intermediate', { geom: 'point', grid: 128, aspect: '1:1', view: 'product', cnuc: 0.055, gnoise: 0.03, warmup: 7000, lo: 0, hi: 0.85, gamma: 0.8 }, Pal.bioluminescent),
      front: pre('The reaction front', { geom: 'point', grid: 128, aspect: '1:1', view: 'front', cnuc: 0.06, gnoise: 0.03, warmup: 6000, lo: 0, hi: 0.8, gamma: 0.85 }, Pal.thermal),
      crystallites: pre('Crystallites', { geom: 'point', grid: 128, aspect: '1:1', view: 'precip', cnuc: 0.05, gnoise: 0.12, gscale: 26, njit: 0.09, dsat: 0.1, warmup: 9000, lo: 0.02, hi: 0.6 }, Pal.ember),
    },
    closedGroups: ['Chemistry'],
    hints: {
      Dish: 'Everything here rebuilds the dish. The gel is loaded once and never topped up, so a low loading runs out before the front crosses the plate.',
      Precipitation: 'Two events, not one: nucleation out of supersaturated solution at c*, and growth on a crystal that already exists at the far lower solubility c_s. The gap between them is the whole reason there are gaps between the bands.',
      Picture: 'Precipitate is the classic plate: the solid alone, on clean gel. Over solution puts it back on the electrolytes it grew out of. Intermediate is the soluble product, highest just behind the front and eaten away at every band. Front is the live reaction rate, with the finished bands ghosted behind it.',
    },
    palette: true, defaultPalette: 'petri', paletteLabel: 'Colors (gel → precipitate)',
    headline: 'cnuc', headlineLabel: 'supersaturation c*',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 512);
      // the explicit bound derived at maxDt(): past it the plate is the Nyquist checkerboard, not a pattern
      s.dt = U.clamp(Number(s.dt) || 0.17, 0.005, maxDt(s));
      // growth on an existing crystal must be easier than nucleation on clean gel, or there is no
      // depletion zone, no gap, and no rings: just a stain that tracks the front
      s.csr = U.clamp(Number(s.csr) || 0.22, 0.03, 0.85);
      s.srad = U.clamp(Number(s.srad) || 4, 1.5, 12);
    },
    surprise(rng) {
      const geom = rng.pick(['point', 'point', 'point', 'line', 'two']);
      const cnuc = Math.round(rng.range(0.035, 0.075) * 500) / 500;
      return {
        grid: rng.pick([96, 128, 128, 192]),
        aspect: geom === 'line' ? rng.pick(['5:4', '3:2', '3:2', '16:9']) : rng.pick(['1:1', '1:1', '4:5', '5:4']),
        geom, srad: rng.range(2.5, 6), b0: rng.range(0.14, 0.32),
        // a line source is the fragile one: a planar front dots at an inhomogeneity a ring shrugs off
        gnoise: geom === 'line' ? rng.range(0, 0.02) : rng.pick([0.03, 0.06, 0.1, 0.22]),
        gscale: rng.int(5, 20) * 5,
        k: rng.range(1.2, 3.2), Da: rng.range(0.8, 1.2), Dbr: rng.range(0.06, 0.25), Dcr: rng.range(0.18, 0.45),
        cnuc, csr: rng.range(0.12, 0.4), pn: rng.range(0.6, 1.6), pg: rng.range(2.4, 5),
        dsat: rng.pick([0.12, 0.3, 0.3, 0.45]), njit: rng.pick([0, 0, 0, 0.08]),
        running: true, steps: rng.int(4, 8), dt: 0.17, warmup: rng.int(24, 44) * 250,
        view: rng.pick(['precip', 'precip', 'precip', 'over', 'product', 'front']),
        curve: rng.range(0.45, 0.85), lo: rng.range(0, 0.06), hi: rng.range(0.6, 0.95),
        exposure: rng.range(0.9, 1.15), gamma: rng.range(0.82, 1.15),
        contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg); host.fault(msg);
        return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
      let stepPass, renderPass, reducePass, scanPass, splatPass;
      try {
        stepPass = new G.Pass(gl, STEP_FS);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        scanPass = new G.Pass(gl, SCAN_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let ST = null, gw = 0, gh = 0, ramp = null, rampKey = '';
      let reduceT = null, scanT = null, raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0;
      let src = null, dref = 0.05, cref = 0.05, rref = 0.05, bandX = [], ratio = 0;
      const redBuf = new Uint8Array(RED * RED * 4);
      const scanBuf = new Uint8Array(SCAN * 4);

      function sizeOf(s) {
        const n = Number(s.grid) || 128, ar = ASPECTS[s.aspect] || 1;
        return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (ST && gw === W && gh === H) return;
        if (ST) ST.dispose();
        // clamp-to-edge is the no-flux wall of a closed dish; nearest because this is state, not a picture
        ST = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'clamp' });
        gw = W; gh = H;
        if (!reduceT) reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
        if (!scanT) scanT = new G.Target(gl, SCAN, 1, { type: 'rgba8', filter: 'nearest' });
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureRamp(s) {
        const key = (s.bg || '') + '|' + (s.palette || []).join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function srcUniforms() {
        return {
          u_geom: { int: src.kind }, u_srad: host.getState().srad,
          u_s0: src.s0, u_s1: src.s1, u_nrm: src.nrm,
        };
      }
      function step(n) {
        const s = host.getState();
        const u = Object.assign({
          u_st: null, u_res: [gw, gh], u_dt: s.dt,
          u_Da: s.Da, u_Db: s.Da * s.Dbr, u_Dc: s.Da * s.Dcr, u_k: s.k,
          u_cnuc: s.cnuc, u_csat: s.cnuc * s.csr, u_pn: s.pn, u_pg: s.pg, u_dsat: s.dsat,
          u_njit: s.njit, u_nOff: nOff, u_step: 0,
        }, srcUniforms());
        for (let i = 0; i < n; i++) {
          // wrapped before it reaches the shader: hash21 takes fract() of its argument, and a step
          // counter in the tens of thousands has already spent the float mantissa the hash needs
          u.u_st = ST.read; u.u_step = ((stepCount + i) * 1.17) % 997;
          stepPass.draw(ST.write, u);
          ST.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_st: ST.read, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: VIEWS[s.view] || 0 },
          u_lo: s.lo, u_hi: s.hi, u_exposure: s.exposure, u_gamma: s.gamma,
          u_contrast: s.contrast, u_grain: s.grain, u_curve: s.curve,
          u_dref: dref, u_cref: cref, u_rref: rref, u_k: s.k, u_b0: s.b0,
          u_bg: hexToRgb01(s.bg),
        });
      }
      // v/(1+v) on the way in, so the inverse on the way out
      const unpack = byte => { const x = byte / 255; return x >= 0.999 ? 999 : x / (1 - x); };
      function pctile(arr, q) {
        const a = arr.slice().sort((x, y) => x - y);
        return a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))];
      }
      function measure() {
        const s = host.getState();
        reducePass.draw(reduceT, { u_st: ST.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED], u_k: s.k });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const md = [], mc = [], mr = [];
        for (let i = 0; i < RED * RED; i++) {
          md.push(unpack(redBuf[i * 4 + 1]));
          mc.push(unpack(redBuf[i * 4 + 2]) / 20);
          mr.push(unpack(redBuf[i * 4 + 3]) / 8);
        }
        // the 99th percentile of the block maxima, not the maximum: one runaway cell at the source should
        // not set the white point for the whole plate
        dref = Math.max(0.02, pctile(md, 0.99));
        cref = Math.max(0.004, pctile(mc, 0.99));
        rref = Math.max(0.002, pctile(mr, 0.99));

        const ar = gh / gw;
        // how far the scan reaches, in cells, and where the junction sits along it
        const rmaxCells = src.kind === 1 ? gw : Math.min(gw, gh) * 0.5;
        const rmaxUV = src.kind === 1 ? 1 : rmaxCells / gw;
        scanPass.draw(scanT, {
          u_st: ST.read, u_res: [gw, gh], u_geom: { int: src.kind },
          u_s0: [src.s0[0] / gw, src.s0[1] / gh], u_rmax: rmaxUV, u_ar: ar,
          u_th0: src.th0, u_dref: dref,
        });
        gl.bindFramebuffer(gl.FRAMEBUFFER, scanT.fbo);
        gl.readPixels(0, 0, SCAN, 1, gl.RGBA, gl.UNSIGNED_BYTE, scanBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const prof = new Float64Array(SCAN), cov = new Float64Array(SCAN);
        for (let i = 0; i < SCAN; i++) { prof[i] = scanBuf[i * 4] / 255; cov[i] = scanBuf[i * 4 + 1] / 255; }
        const scale = rmaxCells / SCAN;
        // x is measured from the junction, which is the edge of the source, not its center
        const offset = src.kind === 1 ? src.s0[0] : s.srad;
        const b = bandsFrom(prof, cov, scale, offset);
        bandX = b.x; ratio = b.ratio;
      }
      function status(extra) {
        const s = host.getState();
        const band = bandX.length < 3 || !ratio
          ? '<span>bands <b>' + bandX.length + '</b> · fewer than three, no spacing yet</span>'
          : '<span>bands <b>' + bandX.length + '</b> · x<sub>n+1</sub>/x<sub>n</sub> <b>' + ratio.toFixed(3) + '</b></span>';
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b> · ' + GEOM_LABEL[s.geom] + '</span>' +
          band +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (stepCount % 64 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : ''); render(); }
      }
      // The front crosses the plate as the square root of the step count, so a plate worth looking at is
      // thousands of steps deep. A step is one draw of one small texture, so the chunk can be large; what
      // must not happen is one unbroken block of work long enough to freeze the page.
      function burst(total) {
        stop();
        let left = total, tick = 0;
        (function chunk() {
          const n = Math.min(80, left); left -= n;
          step(n);
          // Painting the warm-up costs more than running it. A step is one draw of a 128 px texture;
          // a repaint is the whole canvas through a sixteen-tap Catmull-Rom, which at print-adjacent
          // canvas sizes is an order of magnitude more work than the eighty steps it is showing. Show
          // every fourth chunk, which still reads as the front advancing, and always paint the last one.
          if ((tick & 3) === 0 || left <= 0) render();
          // and report every sixteenth chunk, so a long warm-up does not leave the status line describing
          // the dish before this one. The readback costs a GPU sync, which is why it is not every chunk.
          if ((tick & 15) === 0) { measure(); status(); }
          tick++;
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); status(); startLoop(); }
        })();
      }

      return {
        // The plate is a simulation grid magnified to print size, so the shell is told the grid: it then
        // renders once at size rather than supersampling and averaging down, which on an already
        // band-limited field is a second low-pass, and it can state on the sheet what really limits the
        // detail. This tab has the worst ratio in the file at its default: 128 cells across 2,400 print
        // pixels is nineteen pixels a cell, and no amount of paper fixes that.
        fieldCells() { return gw && gh ? [gw, gh] : null; },
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop(); stepCount = 0;
          const s = host.getState();
          nOff = U.makeRng(s.seed + '/liesegang/off').range(0, 900);
          ensureGrid(s);
          src = sources(s, gw, gh);
          dref = 0.05; cref = 0.05; rref = 0.05; bandX = []; ratio = 0;
          upload(ST.read, seedField(s, gw, gh, src));
          render(); measure(); status();
          const warm = host.reducedMotion() ? Math.min(s.warmup, 2000) : s.warmup;
          if (warm > 0) burst(warm);
          else startLoop();
        },
        repaint() { if (ST) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (ST) render(); },
        pause() { stop(); },
        resume() { if (ST) { render(); startLoop(); } },
        action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst') burst(1000); },
        // A poke is a second drop of reagent, and it has to carry all three soluble species. Outer
        // electrolyte alone does nothing behind the front, where the gel is already spent, so the drop
        // brings fresh loading with it; and without a little of the intermediate the drop leaves no mark
        // at all until the reaction has run, which on a paused plate is never. With the intermediate
        // above c* the drop nucleates at once and then seeds a ring system of its own as it reacts.
        // The few steps afterwards are what make that visible while the dish is paused.
        disturb(p) {
          if (!ST) return;
          const s = host.getState();
          splatPass.draw(ST.write, {
            u_src: ST.read, u_pos: [p.x, p.yGL],
            u_add: [0.9, s.b0 * 1.8, s.cnuc * 2.2, 0], u_rad: 0.05, u_amt: 1, u_mode: { int: 1 },
          });
          ST.swap();
          step(10);
          render(); measure(); status(host.getState().running ? '' : 'paused');
          startLoop();
        },
        async exportPNG(w, h) {
          if (!ST) throw new Error('nothing to export');
          const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
          const T = new G.Target(gl, w, h, { type: 'rgba8' });
          render(T);
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
