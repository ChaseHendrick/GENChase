
/* modules/cortex.js */
/* GENChase — Wilson–Cowan neural field with a Mexican-hat kernel, and the retinocortical map that turns its planforms into Klüver's form constants. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
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

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
`;

  // The lateral kernel is a difference of Gaussians, so the interaction is a genuine nonlocal convolution
  // rather than a Laplacian expansion of one. Both Gaussians are separable, so one horizontal pass and one
  // vertical pass carry both widths at once, in .r and .g. The tap spacing widens with sigma so twenty-one
  // taps always reach four standard deviations: at a fixed spacing a wide excitatory surround would be
  // truncated, which shifts the critical wavenumber and quietly changes the pattern the plate is claiming.
  const BLUR_H = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res; uniform float u_s1, u_s2, u_beta, u_theta;
float rate(float u){ return 1.0 / (1.0 + exp(-u_beta * (u - u_theta))); }
void main(){
  vec2 px = 1.0 / u_res;
  float p1 = max(1.0, u_s1 / 2.5), p2 = max(1.0, u_s2 / 2.5);
  float a = 0.0, wa = 0.0, b = 0.0, wb = 0.0;
  for (int i = -10; i <= 10; i++) {
    float fi = float(i);
    float d1 = fi * p1, d2 = fi * p2;
    float w1 = exp(-d1 * d1 / (2.0 * u_s1 * u_s1));
    float w2 = exp(-d2 * d2 / (2.0 * u_s2 * u_s2));
    a += w1 * rate(texture(u_c, v_uv + vec2(d1 * px.x, 0.0)).r); wa += w1;
    b += w2 * rate(texture(u_c, v_uv + vec2(d2 * px.x, 0.0)).r); wb += w2;
  }
  outColor = vec4(a / wa, b / wb, 0.0, 1.0);
}`;

  const BLUR_V = HEAD + `
uniform sampler2D u_h; uniform vec2 u_res; uniform float u_s1, u_s2;
void main(){
  vec2 px = 1.0 / u_res;
  float p1 = max(1.0, u_s1 / 2.5), p2 = max(1.0, u_s2 / 2.5);
  float a = 0.0, wa = 0.0, b = 0.0, wb = 0.0;
  for (int i = -10; i <= 10; i++) {
    float fi = float(i);
    float d1 = fi * p1, d2 = fi * p2;
    float w1 = exp(-d1 * d1 / (2.0 * u_s1 * u_s1));
    float w2 = exp(-d2 * d2 / (2.0 * u_s2 * u_s2));
    a += w1 * texture(u_h, v_uv + vec2(0.0, d1 * px.y)).r; wa += w1;
    b += w2 * texture(u_h, v_uv + vec2(0.0, d2 * px.y)).g; wb += w2;
  }
  outColor = vec4(a / wa, b / wb, 0.0, 1.0);
}`;

  const STEP = HEAD + `
uniform sampler2D u_c, u_s; uniform vec2 u_res;
uniform float u_dt, u_A1, u_A2, u_h, u_noise, u_step, u_nOff;
${G.GLSL.hash}
void main(){
  float u = texture(u_c, v_uv).r;
  vec2 S = texture(u_s, v_uv).rg;
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  u += u_dt * (-u + u_A1 * S.x - u_A2 * S.y + u_h + n);
  outColor = vec4(clamp(u, -12.0, 12.0), 0.0, 0.0, 1.0);
}`;

  // Cortex to retina. The complex logarithm sends the cortical strip to the visual field: cortical x is
  // log eccentricity, cortical y is polar angle. The field is periodic in y by construction, so one turn of
  // the retina is exactly one wrap of the texture and the seam closes. The warp is analytic per output pixel,
  // so the print recomputes it rather than enlarging a screen buffer. Near the fovea the map compresses many
  // cortical cells into one pixel, so the retinal view takes four samples per pixel; without that the center
  // aliases into a moire that looks like structure and is not.
  const RENDER_FS = HEAD + `
uniform sampler2D u_c;
uniform vec2 u_res;
uniform int u_view, u_style;
uniform float u_lo, u_hi, u_zoom, u_fovea, u_twist, u_bands, u_exposure, u_gamma, u_contrast, u_grain, u_bump, u_lw, u_lightAng, u_ar;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
vec2 cortical(vec2 uv){
  if (u_view == 0) return uv;
  vec2 q = vec2(uv.x - 0.5, (uv.y - 0.5) * u_ar) * 2.0 * u_zoom;
  float r = max(length(q), u_fovea);
  float th = atan(q.y, q.x) + u_twist;
  return vec2(log(r / u_fovea) / log(1.0 / u_fovea), th / 6.28318530718 + 0.5);
}
float field(vec2 uv){ return texCR(u_c, cortical(uv), u_res); }
void main(){
  vec2 px = 1.0 / u_res;
  float u;
  if (u_view == 1) {
    vec2 d = vec2(dFdx(v_uv.x), dFdy(v_uv.y)) * 0.25;
    u = 0.25 * (field(v_uv + vec2(d.x, d.y)) + field(v_uv + vec2(-d.x, d.y))
              + field(v_uv + vec2(d.x, -d.y)) + field(v_uv + vec2(-d.x, -d.y)));
  } else u = field(v_uv);
  vec2 cu = cortical(v_uv);
  float gx = 0.5 * (texture(u_c, cu + vec2(px.x, 0.0)).r - texture(u_c, cu - vec2(px.x, 0.0)).r);
  float gy = 0.5 * (texture(u_c, cu + vec2(0.0, px.y)).r - texture(u_c, cu - vec2(0.0, px.y)).r);
  float t = (u - u_lo) / max(u_hi - u_lo, 1e-4);
  if (u_style == 1) t = 0.5 - 0.5 * cos(6.28318530718 * u_bands * clamp(t, 0.0, 1.0));
  else if (u_style == 2) {
    float ang = u_lightAng * 3.14159265 / 180.0;
    vec3 N = normalize(vec3(-gx * u_bump, -gy * u_bump, 1.0));
    vec3 L = normalize(vec3(cos(ang), sin(ang), 0.85));
    t = pow(max(dot(N, L), 0.0), 1.15);
  } else if (u_style == 3) {
    // Contour line at the mid level, drawn at a width fixed in picture units rather than in pixels. The
    // distance to the level set is |u - mid| / |grad u| with the gradient taken in the same units, so the
    // line keeps its weight when the plate is exported at print size instead of thinning to a hairline,
    // and it keeps it across the log-polar warp, where a pixel covers wildly different amounts of cortex.
    float mid = 0.5 * (u_lo + u_hi);
    vec2 duv = max(vec2(abs(dFdx(v_uv.x)), abs(dFdy(v_uv.y))), vec2(1e-7));
    vec2 g = vec2(dFdx(u), dFdy(u)) / duv;
    float d = abs(u - mid) / max(length(g), 1e-5);
    float aa = max(duv.x, duv.y), hw = u_lw * 0.5;
    t = 1.0 - smoothstep(hw, hw + aa, d);
  }
  t = clamp(t, 0.0, 1.0);
  vec3 col = ramp(t);
  if (u_style == 3) col = mix(u_bg, ramp(0.82), t);
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  const REDUCE_FS = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res, u_block;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sm = 0.0, sa = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    float v = texture(u_c, uv).r;
    sm += v; sa += abs(v);
  }
  outColor = vec4(0.5 + 0.5 * clamp(sm / 8.0 / 64.0, -1.0, 1.0), clamp(sa / 64.0, 0.0, 8.0) / 8.0, 0.0, 1.0);
}`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }

  // Critical wavenumber of the difference of Gaussians. w(k) = A1 exp(-s1^2 k^2/2) - A2 exp(-s2^2 k^2/2) is
  // maximised where A1 s1^2 exp(-s1^2 k^2/2) = A2 s2^2 exp(-s2^2 k^2/2). A finite maximum exists only when the
  // surround wins the second-moment comparison, A2 s2^2 > A1 s1^2; otherwise the most unstable mode is k = 0 and
  // the sheet saturates uniformly instead of patterning, which is a blank plate, not a subtle one.
  function critK(A1, s1, A2, s2) {
    const num = 2 * Math.log((A1 * s1 * s1) / (A2 * s2 * s2));
    const den = s1 * s1 - s2 * s2;
    if (den >= -1e-9) return 0;
    const k2 = num / den;
    return k2 > 1e-9 ? Math.sqrt(k2) : 0;
  }

  // Explicit Euler on du/dt = -u + A1 S1 - A2 S2 + h. The convolutions are bounded by the firing rate, so the
  // stiffest linear rate is 1 + (A1 + A2) max f' and max f' = beta/4 for the logistic. Forward Euler needs
  // dt < 2 over that; the 0.8 factor is the usual margin for the nonlinearity the linear estimate does not see.
  function maxDt(A1, A2, beta) {
    return 1.6 / Math.max(1e-6, 1 + (A1 + A2) * beta / 4);
  }

  // The drive has a window, and outside it the plate is blank rather than subtle. Linearising about the uniform
  // state u0, which solves u0 = W0 f(u0) + h with W0 = A1 - A2 the kernel's own integral, the mode at k grows when
  // w(k) f'(u0) > 1, and f'(u0) = beta f (1 - f) for the logistic. So the sheet patterns exactly while
  // f (1 - f) > 1 / (w_max beta), which is an interval in f, hence an interval in u0, hence an interval in h.
  // Below it the sheet relaxes flat at the low branch, above it flat at the high branch, and in both cases the
  // status line says so rather than leaving a uniform plate to be read as a subtle one. At u0 = theta the
  // sigmoid's second derivative vanishes, the quadratic term with it, and stripes beat hexagons; that is the
  // center of the window, h = theta - W0 / 2.
  function bandWindow(s) {
    const s2 = s.s1 * s.ratio;
    const k = critK(s.A1, s.s1, s.A2, s2);
    const W0 = s.A1 - s.A2;
    const wmax = k > 0 ? s.A1 * Math.exp(-s.s1 * s.s1 * k * k / 2) - s.A2 * Math.exp(-s2 * s2 * k * k / 2) : W0;
    const out = { k, lam: k > 0 ? TAU / k : 0, wmax, W0, ok: false, hLo: 0, hHi: 0, hMid: s.theta - W0 / 2, bistable: W0 * s.beta / 4 >= 1 };
    if (!(k > 0) || wmax <= 0) return out;
    const disc = 1 - 4 / (wmax * s.beta);
    if (disc <= 0) return out;
    const r = Math.sqrt(disc), fLo = (1 - r) / 2, fHi = (1 + r) / 2;
    const uLo = s.theta + Math.log(fLo / (1 - fLo)) / s.beta;
    const uHi = s.theta + Math.log(fHi / (1 - fHi)) / s.beta;
    const a = uLo - W0 * fLo, b = uHi - W0 * fHi;
    out.ok = true; out.hLo = Math.min(a, b); out.hHi = Math.max(a, b);
    return out;
  }

  // Planform seeds. Each is a small-amplitude template in the cortical cell lattice, at the critical wavenumber
  // rounded to the nearest mode the periodic grid actually holds, plus noise. The dynamics selects and saturates
  // it; the template only chooses which basin. Under the log-polar map a cortical stripe along y becomes a radial
  // fan, a stripe along x becomes concentric rings, and an oblique stripe becomes a spiral, which is how
  // Ermentrout and Cowan recovered Kluver's form constants from a cortical Turing bifurcation.
  function seedField(s, W, H) {
    const rng = U.makeRng(s.seed + '/cortex');
    const data = new Float32Array(W * H * 4);
    const k = critK(s.A1, s.s1, s.A2, s.s1 * s.ratio);
    const amp = s.start;
    // A mode on a periodic W x H grid is a pair of integers (p, q): the wavevector is 2pi(p/W, q/H), so a
    // template only lands on the critical circle if its integers are chosen from k itself. Rounding each axis
    // independently is the trap: (nx, ny) with nx = W k / 2pi and ny = H k / 2pi has length sqrt(2) k, a mode
    // the kernel damps, and the sheet then reorganises into whatever it prefers instead of the planform asked for.
    const nx = Math.max(1, Math.round(W * k / TAU));
    const ny = Math.max(1, Math.round(H * k / TAU));
    const ph = rng() * TAU, ph2 = rng() * TAU, ph3 = rng() * TAU;
    // one mode at angle phi, rounded onto the lattice
    const mode = phi => [Math.round(W * k * Math.cos(phi) / TAU), Math.round(H * k * Math.sin(phi) / TAU)];
    let modes = [];
    if (s.plan === 'fan') modes = [[0, ny]];
    else if (s.plan === 'rings') modes = [[nx, 0]];
    else if (s.plan === 'spiral') modes = [mode(rng.range(0.6, 1.0) * (rng() < 0.5 ? 1 : -1))];
    else if (s.plan === 'square') modes = [[nx, 0], [0, ny]];
    else if (s.plan === 'lattice') {
      // hexagons need three wavevectors of equal length at 120 degrees summing to zero. Make the x count even
      // so half of it is still an integer, then pick the y count that puts the other two on the same circle.
      const a = Math.max(2, 2 * Math.round(nx / 2));
      const b = Math.max(1, Math.round(a * (H / W) * Math.sqrt(3) / 2));
      modes = [[a, 0], [-a / 2, b], [-a / 2, -b]];
    }
    const ph_ = [ph, ph2, ph3];
    const norm = modes.length ? 1 / Math.sqrt(modes.length) : 0;
    for (let j = 0; j < H; j++) {
      const yy = j / H;
      for (let i = 0; i < W; i++) {
        const xx = i / W;
        let v = 0;
        for (let m = 0; m < modes.length; m++) v += Math.cos(TAU * (modes[m][0] * xx + modes[m][1] * yy) + ph_[m]);
        const o = (j * W + i) * 4;
        data[o] = s.h0 + amp * v * norm + (rng() * 2 - 1) * s.startNoise;
        data[o + 3] = 1;
      }
    }
    return data;
  }

  const PLAN_LABEL = { noise: 'from noise', fan: 'radial fan', rings: 'concentric rings', spiral: 'spiral', lattice: 'hexagonal lattice', square: 'square lattice' };

  /* ---------- Cortical Planforms ---------- */
  Studio.register({
    id: 'cortex',
    name: 'Cortical Planforms',
    tab: 'Cortex',
    subtitle: 'a neural field patterning, seen through the retinocortical map · 1979',
    order: 10,
    equation: '∂u/∂t = −u + ∫ w(|x−x′|) f(u(x′)) dx′ + h,   w = A₁ G_σ₁ − A₂ G_σ₂,   f(u) = 1/(1+e^{−β(u−θ)})',
    credit: "Neural field with lateral inhibition: Hugh R. Wilson and Jack D. Cowan, Biophysical Journal 12, 1 (1972) and Kybernetik 13, 55 (1973); Shun-ichi Amari, Biological Cybernetics 27, 77 (1977). The claim that a Turing bifurcation in such a sheet, pushed through the retinocortical map, produces the visual hallucinations catalogued by Heinrich Klüver (Mescal, 1928; Mescal and Mechanisms of Hallucinations, 1966) is G. Bard Ermentrout and Jack D. Cowan, 'A mathematical theory of visual hallucination patterns', Biological Cybernetics 34, 137 (1979). The complex-logarithm form of the map follows Eric Schwartz, Biological Cybernetics 25, 181 (1977). Paul Bressloff, Jack Cowan, Martin Golubitsky, Peter Thomas and Matthew Wiener, Philosophical Transactions of the Royal Society B 356, 299 (2001), extended the account to contoured planforms by adding orientation preference as a third coordinate; that extension is not what this tab computes.",
    blurb: 'A sheet of neurons that excite their close neighbors and inhibit their distant ones has a preferred wavelength, and past a threshold in drive it stops being uniform and breaks into stripes, hexagons or rhombs. That is Turing\'s instability with a synaptic kernel in place of two diffusing chemicals. The second half of the argument is anatomical: primary visual cortex is laid out as roughly the complex logarithm of the visual field, so cortical distance is log eccentricity and the direction across the cortex is polar angle. Push a cortical stripe through that map and it is not a stripe any more. Stripes along one cortical axis become a radial fan, along the other they become concentric rings, obliquely they become a spiral, and a hexagonal cortical lattice becomes a cobweb. Those are the form constants people report under mescaline, flicker and migraine, and nothing in the model was told about them.',
    schema: [
      { group: 'Sheet', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768']] },
      { group: 'Sheet', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Kernel', 's1', 'Excitatory width σ₁', LIVE, 1.2, 6, 0.1, f1, { hint: 'In cortical cells. The pattern wavelength is set by the two widths and the two weights together, and the status line prints it.' }),
      RANGE('Kernel', 'ratio', 'Inhibitory ratio σ₂/σ₁', LIVE, 1.4, 4, 0.05, f2),
      RANGE('Kernel', 'A1', 'Excitation A₁', LIVE, 0.2, 4, 0.02, f2),
      RANGE('Kernel', 'A2', 'Inhibition A₂', LIVE, 0.2, 4, 0.02, f2),
      RANGE('Kernel', 'beta', 'Gain β', LIVE, 1, 20, 0.2, f1, { hint: 'Slope of the firing-rate sigmoid. Low β is a gentle, almost linear sheet; high β saturates into flat plateaus with sharp walls.' }),
      RANGE('Kernel', 'theta', 'Threshold θ', LIVE, -1, 2, 0.02, f2),
      RANGE('Kernel', 'h', 'Drive h', LIVE, -1, 1.5, 0.005, f3, { hint: 'Tonic input. Raising it past the bifurcation is what makes the uniform sheet break into pattern; this is the knob a hallucinogen is standing in for. Setting h = θ − (A₁−A₂)/2 puts the resting level at the sigmoid\'s inflection, where the quadratic term vanishes and stripes win over spots.' }),
      { group: 'Onset', key: 'plan', label: 'Seeded planform', type: 'seg', kind: GEOM, wrap: true,
        options: [['noise', 'Noise'], ['fan', 'Fan'], ['rings', 'Rings'], ['spiral', 'Spiral'], ['lattice', 'Hexagons'], ['square', 'Rhombs']],
        hint: 'Which basin to start in. The template is a small-amplitude mode at the critical wavelength; the equation still has to select and saturate it, and with the drive below onset it will decay instead.' },
      RANGE('Onset', 'start', 'Template amplitude', GEOM, 0, 0.6, 0.01, f2, { dimUnless: s => s.plan !== 'noise' }),
      RANGE('Onset', 'startNoise', 'Initial noise', GEOM, 0, 0.6, 0.01, f2),
      RANGE('Onset', 'h0', 'Initial level', GEOM, -1, 1, 0.02, f2),
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 8, 1, String),
      RANGE('Simulation', 'dt', 'Time step', LIVE, 0.01, 0.5, 0.005, f3),
      RANGE('Simulation', 'noise', 'Noise', LIVE, 0, 0.1, 0.002, f3),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 3000, 50, String),
      { group: 'Simulation', key: 'burst', label: 'Run 400 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
      { group: 'Picture', key: 'view', label: 'Frame', type: 'seg', kind: PAINT,
        options: [['cortex', 'Cortex'], ['retina', 'Visual field']],
        hint: 'Cortex is the sheet the equation runs on. Visual field applies the inverse complex logarithm, which is where the form constants appear.' },
      { group: 'Picture', key: 'style', label: 'Ink', type: 'seg', kind: PAINT, wrap: true,
        options: [['field', 'Field'], ['bands', 'Contours'], ['relief', 'Relief'], ['lines', 'Contour lines']] },
      RANGE('Picture', 'zoom', 'Eccentricity', PAINT, 0.4, 3, 0.02, f2, { dimUnless: s => s.view === 'retina' }),
      RANGE('Picture', 'fovea', 'Foveal radius', PAINT, 0.004, 0.25, 0.002, f3, { dimUnless: s => s.view === 'retina',
        hint: 'The log map has no value at the center of gaze, so the inner disc is clamped. Small values open a deep tunnel; large ones leave a plain hub.' }),
      RANGE('Picture', 'twist', 'Rotation', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'retina' }),
      RANGE('Picture', 'bands', 'Contour count', PAINT, 1, 16, 1, String, { dimUnless: s => s.style === 'bands' }),
      RANGE('Picture', 'lo', 'Black point', PAINT, -3, 1, 0.05, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, -1, 4, 0.05, f2),
      RANGE('Picture', 'bump', 'Relief', PAINT, 0.5, 30, 0.5, f1, { dimUnless: s => s.style === 'relief' }),
      RANGE('Picture', 'lw', 'Line weight', PAINT, 0.001, 0.03, 0.001, f3, { dimUnless: s => s.style === 'lines' }),
      RANGE('Picture', 'lightAng', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.style === 'relief' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    legacy: { 2: { grid: 256 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1',
      s1: 2.2, ratio: 2.1, A1: 1.9, A2: 1.75, beta: 7, theta: 0.35, h: 0.28,
      plan: 'spiral', start: 0.25, startNoise: 0.12, h0: 0,
      running: true, steps: 3, dt: 0.12, noise: 0.004, warmup: 600,
      view: 'retina', style: 'field', zoom: 1, fovea: 0.03, twist: 0, bands: 5,
      lo: -0.6, hi: 1.2, bump: 8, lw: 0.006, lightAng: 135, exposure: 1, gamma: 1, contrast: 1, grain: 0.04,
      seed: 'kluver-1928',
    },
    presets: {
      spiral: pre('Spiral', { plan: 'spiral', h: 0.28, view: 'retina', style: 'field', fovea: 0.03, zoom: 1, lo: -0.7, hi: 1.1 }, Pal.nightshade),
      funnel: pre('Funnel', { plan: 'fan', h: 0.28, view: 'retina', style: 'field', fovea: 0.012, zoom: 1.1, lo: -0.7, hi: 1.1 }, Pal.ember),
      tunnel: pre('Tunnel', { plan: 'rings', h: 0.28, view: 'retina', style: 'field', fovea: 0.008, zoom: 1.2, lo: -0.7, hi: 1.1 }, Pal.glacier),
      cobweb: pre('Cobweb', { plan: 'lattice', h: 0.37, view: 'retina', style: 'lines', lw: 0.005, fovea: 0.04, zoom: 1.3, lo: -0.9, hi: 1.5 }, Pal.graphite),
      sheet: pre('The cortical sheet', { plan: 'noise', h: 0.28, view: 'cortex', style: 'field', startNoise: 0.35, warmup: 1400, lo: -0.9, hi: 1.2 }, Pal.kiln),
      lattice: pre('Honeycomb, on the cortex', { plan: 'lattice', h: 0.37, view: 'cortex', style: 'field', lo: -0.9, hi: 1.5 }, Pal.verdigris),
      contour: pre('Contoured rhombs', { plan: 'square', h: 0.28, view: 'retina', style: 'bands', bands: 4, fovea: 0.02, zoom: 1.1, lo: -0.9, hi: 1.3 }, Pal.risograph),
    },
    hints: {
      Kernel: 'Short-range excitation and longer-range inhibition. The instability needs the inhibition to win the second-moment comparison, A₂σ₂² > A₁σ₁²; when it does not, the status line says so and the sheet saturates flat instead of patterning.',
      Picture: 'Cortical x is log eccentricity and cortical y is polar angle, so the visual-field view is the inverse complex logarithm of the sheet. It is computed per output pixel, which is why the print is sharp at the center rather than an enlargement of the screen.',
    },
    palette: true, defaultPalette: 'nightshade',
    headline: 'h', headlineLabel: 'drive',
    sanitize(s) {
      s.dt = Math.min(Number(s.dt) || 0.12, maxDt(s.A1, s.A2, s.beta));
      s.fovea = U.clamp(Number(s.fovea) || 0.03, 0.004, 0.25);
    },
    surprise(rng) {
      // A near-balanced kernel keeps the uniform state monostable and the patterning window wide; the drive is
      // then placed inside that window rather than guessed, so a surprise lands on a plate instead of a blank sheet.
      const s1 = Math.round(rng.range(1.6, 3.4) * 10) / 10, ratio = Math.round(rng.range(1.7, 2.8) * 20) / 20;
      const A1 = Math.round(rng.range(1.4, 2.4) * 50) / 50, A2 = Math.round(A1 * rng.range(0.86, 0.97) * 50) / 50;
      const beta = Math.round(rng.range(5, 12) * 5) / 5, theta = Math.round(rng.range(0.1, 0.7) * 50) / 50;
      const w = bandWindow({ s1, ratio, A1, A2, beta, theta });
      const plan = rng.pick(['fan', 'rings', 'spiral', 'spiral', 'lattice', 'square', 'noise']);
      // stripe planforms want the middle of the window, hexagons want to sit off-center where the quadratic term bites
      const frac = plan === 'lattice' ? rng.pick([0.24, 0.76]) : rng.range(0.42, 0.58);
      const h = w.ok ? w.hLo + frac * (w.hHi - w.hLo) : theta - (A1 - A2) / 2;
      return {
        s1, ratio, A1, A2, beta, theta, h: Math.round(h * 200) / 200,
        plan,
        start: rng.range(0.15, 0.4), startNoise: rng.range(0.05, 0.3),
        view: rng() < 0.75 ? 'retina' : 'cortex',
        style: rng.pick(['field', 'field', 'bands', 'relief', 'lines']),
        zoom: rng.range(0.8, 1.6), fovea: rng.pick([0.008, 0.015, 0.03, 0.06, 0.12]),
        twist: rng.int(0, 71) * 5, bands: rng.int(3, 8),
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
      let blurH, blurV, stepPass, renderPass, reducePass, splatPass;
      try {
        blurH = new G.Pass(gl, BLUR_H);
        blurV = new G.Pass(gl, BLUR_V);
        stepPass = new G.Pass(gl, STEP);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let C = null, hT = null, sT = null, gw = 0, gh = 0, ramp = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let reduceT = null, raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0, meanV = 0, absV = 0;

      function sizeOf(s) {
        const n = Number(s.grid) || 256, ar = ASPECTS[s.aspect] || 1;
        return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (C && gw === W && gh === H) return;
        if (C) { C.dispose(); hT.dispose(); sT.dispose(); }
        // the sheet wraps in both directions: y is polar angle, so the seam is the map's own periodicity
        const o = { type: texType, filter: 'nearest', wrap: 'repeat' };
        C = new G.PingPong(gl, W, H, o);
        hT = new G.Target(gl, W, H, o);
        sT = new G.Target(gl, W, H, o);
        gw = W; gh = H;
        if (reduceT) reduceT.dispose();
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
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
      function step(n) {
        const s = host.getState();
        const s2 = s.s1 * s.ratio;
        for (let i = 0; i < n; i++) {
          blurH.draw(hT, { u_c: C.read, u_res: [gw, gh], u_s1: s.s1, u_s2: s2, u_beta: s.beta, u_theta: s.theta });
          blurV.draw(sT, { u_h: hT, u_res: [gw, gh], u_s1: s.s1, u_s2: s2 });
          stepPass.draw(C.write, {
            u_c: C.read, u_s: sT, u_res: [gw, gh],
            u_dt: s.dt, u_A1: s.A1, u_A2: s.A2, u_h: s.h,
            u_noise: s.noise, u_step: (stepCount + i) * 1.17, u_nOff: nOff,
          });
          C.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_c: C.read, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: s.view === 'retina' ? 1 : 0 },
          u_style: { int: { field: 0, bands: 1, relief: 2, lines: 3 }[s.style] || 0 },
          u_lo: s.lo, u_hi: s.hi, u_zoom: s.zoom, u_fovea: s.fovea, u_twist: s.twist * Math.PI / 180,
          u_bands: s.bands, u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast,
          u_grain: s.grain, u_bump: s.bump, u_lw: s.lw, u_lightAng: s.lightAng,
          u_ar: ASPECTS[s.aspect] || 1, u_bg: hexToRgb01(s.bg),
        });
      }
      function measure() {
        reducePass.draw(reduceT, { u_c: C.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sm = 0, sa = 0;
        for (let i = 0; i < RED * RED; i++) { sm += ((redBuf[i * 4] / 255) * 2 - 1) * 8; sa += (redBuf[i * 4 + 1] / 255) * 8; }
        meanV = sm / (RED * RED); absV = sa / (RED * RED);
      }
      function status(extra) {
        const s = host.getState();
        const w = bandWindow(s);
        let band;
        if (!w.k) band = '<span><b>no Turing band</b>: A₂σ₂² must exceed A₁σ₁²</span>';
        else if (!w.ok) band = '<span>λ <b>' + w.lam.toFixed(1) + '</b> cells · <b>gain too low</b> to pattern at any drive</span>';
        else {
          const inside = s.h > w.hLo && s.h < w.hHi;
          band = '<span>λ <b>' + w.lam.toFixed(1) + '</b> cells · ' + (gw / w.lam).toFixed(1) + ' across</span>' +
            '<span>drive window <b>' + w.hLo.toFixed(2) + ' … ' + w.hHi.toFixed(2) + '</b>' +
            (inside ? '' : ' · <b>h is outside it</b>, the sheet will go flat') + '</span>';
        }
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>' + PLAN_LABEL[s.plan] + ' · ' + (s.view === 'retina' ? 'visual field' : 'cortex') + '</span>' +
          band +
          '<span>mean <b>' + meanV.toFixed(2) + '</b> · |u| ' + absV.toFixed(2) + '</span>' +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (stepCount % 16 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : ''); render(); }
      }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(24, left); left -= n;
          step(n); render();
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); status(); startLoop(); }
        })();
      }

      return {
        // The plate is a simulation grid magnified to print size, so the shell is told the grid: it then
        // renders once at size instead of supersampling and averaging down, which on an already
        // band-limited field is a second low-pass for twice the memory, and it can state on the sheet
        // what the real limit on detail is.
        fieldCells() { return gw && gh ? [gw, gh] : null; },
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop(); stepCount = 0;
          const s = host.getState();
          nOff = U.makeRng(s.seed + '/cortex/off').range(0, 900);
          ensureGrid(s);
          upload(C.read, seedField(s, gw, gh));
          hT.clear(0, 0, 0, 1); sT.clear(0, 0, 0, 1);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 120) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (C) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (C) render(); },
        pause() { stop(); },
        resume() { if (C) { render(); startLoop(); } },
        action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst') burst(400); },
        // A poke lands where the viewer aimed it. In the visual-field view that means running the pointer
        // through the same forward map the picture uses, so touching the retina disturbs the matching
        // patch of cortex rather than an unrelated corner of the sheet.
        disturb(p) {
          if (!C) return;
          const s = host.getState();
          let ux = p.x, uy = p.yGL;
          if (s.view === 'retina') {
            const ar = ASPECTS[s.aspect] || 1;
            const qx = (p.x - 0.5) * 2 * s.zoom, qy = -(p.yGL - 0.5) * 2 * s.zoom * ar;
            const r = Math.max(Math.hypot(qx, qy), s.fovea);
            const th = Math.atan2(qy, qx) + s.twist * Math.PI / 180;
            ux = Math.log(r / s.fovea) / Math.log(1 / s.fovea);
            uy = th / TAU + 0.5;
            ux -= Math.floor(ux); uy -= Math.floor(uy);
          }
          splatPass.draw(C.write, { u_src: C.read, u_pos: [ux, uy], u_add: [1.2, 0, 0, 0], u_rad: 0.045, u_amt: 1, u_mode: { int: 1 } });
          C.swap(); render(); startLoop();
        },
        async exportPNG(w, h) {
          if (!C) throw new Error('nothing to export');
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
