
/* modules/fractal.js */
/* GENChase — Fractal Geometry: signed-distance raymarching of 3D fractals. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3), deg = v => v + '°';

  const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_res;
uniform vec3 u_ro;
uniform vec3 u_ta;
uniform float u_fov;
uniform float u_fractal;
uniform float u_iters;
uniform float u_power;
uniform float u_scale;
uniform float u_minRad;
uniform float u_foldLimit;
uniform vec3 u_fold;
uniform vec4 u_julia;
uniform float u_maxSteps;
uniform float u_eps;
uniform vec3 u_bg;
uniform float u_lightAz;
uniform float u_lightEl;
uniform float u_ao;
uniform float u_spec;
uniform float u_fog;
uniform float u_shadow;
uniform float u_colorMode;
uniform float u_trapScale;
uniform float u_trapOffset;
uniform float u_section;
uniform float u_sectionZ;
uniform float u_contour;
uniform float u_zoom;
uniform sampler2D u_ramp;

vec3 ramp(float t){ return texture(u_ramp, vec2(clamp(t,0.003,0.997), 0.5)).rgb; }

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }

float deMandelbulb(vec3 p, out float trap){
  vec3 z = p; float dr = 1.0; float r = length(z); trap = 1e10;
  int N = int(u_iters);
  for(int i=0;i<40;i++){
    if(i>=N) break;
    r = length(z);
    trap = min(trap, r);
    if(r > 2.2) break;
    float theta = acos(clamp(z.z/max(r,1e-9), -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, u_power-1.0)*u_power*dr + 1.0;
    float zr = pow(r, u_power);
    theta *= u_power; phi *= u_power;
    z = zr*vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + p;
  }
  return 0.5*log(max(r,1e-9))*r/max(dr,1e-9);
}

float deMenger(vec3 p, out float trap){
  float d = sdBox(p, vec3(1.0));
  float s = 1.0; trap = 1e10;
  int N = int(u_iters);
  for(int m=0;m<8;m++){
    if(m>=N) break;
    vec3 a = mod(p*s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0*abs(a));
    trap = min(trap, length(a)*0.7);
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0)/s;
    d = max(d, c);
  }
  return d;
}

float deMandelbox(vec3 p, out float trap){
  vec3 z = p; float dr = 1.0; trap = 1e10;
  float minR2 = u_minRad*u_minRad;
  int N = int(u_iters);
  for(int i=0;i<32;i++){
    if(i>=N) break;
    z = clamp(z, -u_foldLimit, u_foldLimit)*2.0 - z;
    float r2 = dot(z,z);
    trap = min(trap, sqrt(r2)*0.4);
    if(r2 < minR2){ float t = 1.0/minR2; z *= t; dr *= t; }
    else if(r2 < 1.0){ float t = 1.0/r2; z *= t; dr *= t; }
    z = z*u_scale + p;
    dr = dr*abs(u_scale) + 1.0;
  }
  return length(z)/abs(dr);
}

float deKifs(vec3 p, out float trap){
  float s = u_scale; float d = 1.0; trap = 1e10;
  int N = int(u_iters);
  for(int i=0;i<24;i++){
    if(i>=N) break;
    p = abs(p);
    if(p.x < p.y) p.xy = p.yx;
    if(p.x < p.z) p.xz = p.zx;
    if(p.y < p.z) p.yz = p.zy;
    p = p*s - u_fold*(s-1.0);
    d *= s;
    trap = min(trap, length(p)/d);
  }
  return (length(p)-2.0)/d;
}

float deSierpinski(vec3 p, out float trap){
  vec3 a1 = vec3(1,1,1), a2 = vec3(-1,-1,1), a3 = vec3(1,-1,-1), a4 = vec3(-1,1,-1);
  float sc = 2.0; trap = 1e10; int n = 0;
  int N = int(u_iters);
  for(int i=0;i<20;i++){
    if(i>=N) break;
    vec3 c = a1; float dist = length(p-a1);
    float d2 = length(p-a2); if(d2 < dist){ c = a2; dist = d2; }
    float d3 = length(p-a3); if(d3 < dist){ c = a3; dist = d3; }
    float d4 = length(p-a4); if(d4 < dist){ c = a4; dist = d4; }
    p = sc*p - c*(sc-1.0);
    n++;
    trap = min(trap, length(p)*pow(sc, -float(n)));
  }
  return (length(p)-1.2)*pow(sc, -float(n));
}

float deApollonian(vec3 p, out float trap){
  float s = 1.0; trap = 1e10;
  int N = int(u_iters);
  for(int i=0;i<16;i++){
    if(i>=N) break;
    p = -1.0 + 2.0*fract(0.5*p + 0.5);
    float r2 = dot(p,p);
    trap = min(trap, r2);
    float k = max(u_scale, 0.2)/max(r2, 1e-4);
    p *= k; s *= k;
  }
  trap = sqrt(trap);
  return 0.25*abs(p.y)/s;
}

vec4 qsqr(vec4 a){ return vec4(a.x*a.x - dot(a.yzw, a.yzw), 2.0*a.x*a.yzw); }
float deJulia(vec3 pos, out float trap){
  vec4 z = vec4(pos, 0.0);
  float md2 = 1.0, mz2 = dot(z,z); trap = 1e10;
  int N = int(u_iters);
  for(int i=0;i<16;i++){
    if(i>=N) break;
    md2 *= 4.0*mz2;
    z = qsqr(z) + u_julia;
    mz2 = dot(z,z);
    trap = min(trap, mz2*0.25);
    if(mz2 > 4.0) break;
  }
  trap = sqrt(trap);
  return 0.25*sqrt(mz2/max(md2,1e-9))*log(max(mz2,1.0001));
}

float map(vec3 p, out float trap){
  int f = int(u_fractal);
  if(f == 0) return deMandelbulb(p, trap);
  if(f == 1) return deMenger(p, trap);
  if(f == 2) return deMandelbox(p, trap);
  if(f == 3) return deKifs(p, trap);
  if(f == 4) return deSierpinski(p, trap);
  if(f == 5) return deApollonian(p, trap);
  return deJulia(p, trap);
}
float mapD(vec3 p){ float t; return map(p, t); }

vec3 calcNormal(vec3 p, float e){
  vec2 h = vec2(e, 0.0);
  return normalize(vec3(
    mapD(p + h.xyy) - mapD(p - h.xyy),
    mapD(p + h.yxy) - mapD(p - h.yxy),
    mapD(p + h.yyx) - mapD(p - h.yyx)));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k){
  float res = 1.0, t = mint;
  for(int i=0;i<40;i++){
    float h = mapD(ro + rd*t);
    res = min(res, k*h/t);
    t += clamp(h, 0.02, 0.3);
    if(res < 0.005 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

void main(){
  vec2 uv = (v_uv*2.0 - 1.0);
  uv.x *= u_res.x/u_res.y;

  vec3 lightDir = normalize(vec3(
    cos(u_lightEl)*cos(u_lightAz),
    sin(u_lightEl),
    cos(u_lightEl)*sin(u_lightAz)));

  // 2D contour section through the distance field
  if(u_section > 0.5){
    vec3 p = vec3(uv*u_zoom, u_sectionZ) + u_ta;
    float trap;
    float d = map(p, trap);
    float band = abs(fract(d/u_contour + 0.5) - 0.5)*2.0;
    float aa = fwidth(d/u_contour)*1.6 + 1e-4;
    float line = 1.0 - smoothstep(0.0, aa, band);
    float shade = clamp(0.5 - d*0.55, 0.0, 1.0);
    vec3 base = mix(u_bg, ramp(clamp(shade, 0.0, 1.0)), 0.85);
    vec3 ink = ramp(clamp(shade*0.6 + 0.35, 0.0, 1.0));
    vec3 col = mix(base, ink, line*0.9);
    if(d < 0.0) col = mix(col, ramp(0.92), 0.55);
    vec3 sc = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    float sd = fract(dot(gl_FragCoord.xy, vec2(0.7548776662, 0.5698402909)));
    outColor = vec4(clamp(sc + (sd - 0.5)/255.0, 0.0, 1.0), 1.0);
    return;
  }

  vec3 ww = normalize(u_ta - u_ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ww));
  vec3 rd = normalize(uv.x*uu + uv.y*vv + u_fov*ww);

  float t = 0.0;
  float trap = 0.0, lastTrap = 0.0;
  int steps = 0;
  bool hit = false;
  int MS = int(u_maxSteps);
  float tmax = 14.0;
  for(int i=0;i<512;i++){
    if(i >= MS) break;
    vec3 p = u_ro + rd*t;
    float d = map(p, trap);
    lastTrap = trap;
    steps = i;
    float eps = u_eps*(1.0 + t*0.35);
    if(d < eps){ hit = true; break; }
    t += max(d*0.85, eps*0.6);
    if(t > tmax) break;
  }

  vec3 col = u_bg;
  if(hit){
    vec3 p = u_ro + rd*t;
    float e = max(u_eps*0.75, 0.00025)*(1.0 + t*0.3);
    vec3 n = calcNormal(p, e);

    float occ = 1.0 - float(steps)/float(MS);
    occ = pow(clamp(occ, 0.0, 1.0), 1.0 + u_ao*2.5);
    float amb = 0.30 + 0.25*clamp(0.5 + 0.5*n.y, 0.0, 1.0);
    float dif = clamp(dot(n, lightDir), 0.0, 1.0);
    float sh = 1.0;
    if(u_shadow > 0.5 && dif > 0.001) sh = softShadow(p + n*e*4.0, lightDir, 0.03, 6.0, 12.0);
    vec3 h = normalize(lightDir - rd);
    float spe = pow(clamp(dot(n, h), 0.0, 1.0), 32.0)*u_spec;

    int cm = int(u_colorMode);
    vec3 base;
    if(cm == 0) base = ramp(clamp(lastTrap*u_trapScale + u_trapOffset, 0.0, 1.0));
    else if(cm == 1) base = 0.5 + 0.5*n;
    else if(cm == 2) base = ramp(clamp(1.0 - (t - 1.0)/5.0, 0.0, 1.0));
    else base = ramp(clamp(float(steps)/float(MS)*2.4, 0.0, 1.0));

    col = base*(amb*(0.35 + 0.65*occ) + dif*sh*1.05) + vec3(spe)*sh;
    float fog = 1.0 - exp(-u_fog*max(t - 1.0, 0.0));
    col = mix(col, u_bg, clamp(fog, 0.0, 1.0));
  } else {
    float glow = 1.0 - clamp(length(uv)*0.7, 0.0, 1.0);
    col = mix(u_bg, ramp(0.08), glow*0.10*u_fog);
  }
  vec3 outc = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
  // ordered dither at ~1/255: kills visible banding across large smooth gradients in print
  float dth = fract(dot(gl_FragCoord.xy, vec2(0.7548776662, 0.5698402909)));
  outc += (dth - 0.5)/255.0;
  outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}`;

  const FRACTALS = [['bulb', 'Bulb'], ['menger', 'Menger'], ['box', 'Box'], ['kifs', 'KIFS'], ['sierp', 'Sierpinski'], ['apollo', 'Apollonian'], ['julia', 'Julia']];
  const FIDX = { bulb: 0, menger: 1, box: 2, kifs: 3, sierp: 4, apollo: 5, julia: 6 };
  const CMODE = { trap: 0, normal: 1, depth: 2, iteration: 3 };

  const SCHEMA = [
    { group: 'Fractal', key: 'fractal', label: 'Distance estimator', type: 'seg', kind: GEOM, wrap: true, options: FRACTALS },
    { group: 'Fractal', key: 'iters', label: 'Iterations', type: 'range', kind: LIVE, min: 2, max: 20, step: 1 },
    { group: 'Fractal', key: 'power', label: 'Power (Bulb)', type: 'range', kind: LIVE, min: 2, max: 12, step: 0.1, fmt: v => v.toFixed(1), dimUnless: s => s.fractal === 'bulb' },
    { group: 'Fractal', key: 'scale', label: 'Scale (Box / KIFS / Apollonian)', type: 'range', kind: LIVE, min: -3, max: 3, step: 0.01, fmt: f2, dimUnless: s => s.fractal === 'box' || s.fractal === 'kifs' || s.fractal === 'apollo' },
    { group: 'Fractal', key: 'minRad', label: 'Min radius (Box)', type: 'range', kind: LIVE, min: 0.1, max: 1.2, step: 0.01, fmt: f2, dimUnless: s => s.fractal === 'box' },
    { group: 'Fractal', key: 'foldLimit', label: 'Fold limit (Box)', type: 'range', kind: LIVE, min: 0.5, max: 2, step: 0.01, fmt: f2, dimUnless: s => s.fractal === 'box' },
    { group: 'Fractal', key: 'reroll', label: 'Reroll seeded constants', type: 'action' },

    { group: 'Camera', key: 'azimuth', label: 'Azimuth', type: 'range', kind: LIVE, min: 0, max: 360, step: 1, fmt: deg },
    { group: 'Camera', key: 'elevation', label: 'Elevation', type: 'range', kind: LIVE, min: -85, max: 85, step: 1, fmt: deg },
    { group: 'Camera', key: 'distance', label: 'Distance', type: 'range', kind: LIVE, min: 1.2, max: 9, step: 0.05, fmt: f2 },
    { group: 'Camera', key: 'fov', label: 'Lens (higher = tighter)', type: 'range', kind: LIVE, min: 0.7, max: 4, step: 0.05, fmt: f2 },
    { group: 'Camera', key: 'targetY', label: 'Look height', type: 'range', kind: LIVE, min: -1.5, max: 1.5, step: 0.01, fmt: f2 },
    { group: 'Camera', key: 'autoOrbit', label: 'Auto orbit', type: 'toggle', kind: LIVE },
    { group: 'Camera', key: 'orbitSpeed', label: 'Orbit speed', type: 'range', kind: LIVE, min: 1, max: 20, step: 1, dimUnless: s => s.autoOrbit },
    { group: 'Camera', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },

    { group: 'Light', key: 'lightAz', label: 'Light azimuth', type: 'range', kind: PAINT, min: 0, max: 360, step: 5, fmt: deg },
    { group: 'Light', key: 'lightEl', label: 'Light elevation', type: 'range', kind: PAINT, min: -20, max: 85, step: 1, fmt: deg },
    { group: 'Light', key: 'ao', label: 'Ambient occlusion', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: v => Math.round(v * 100) + '%' },
    { group: 'Light', key: 'spec', label: 'Specular', type: 'range', kind: PAINT, min: 0, max: 1.2, step: 0.02, fmt: f2 },
    { group: 'Light', key: 'fog', label: 'Atmosphere', type: 'range', kind: PAINT, min: 0, max: 1.2, step: 0.02, fmt: f2 },
    { group: 'Light', key: 'shadow', label: 'Soft shadows (slower)', type: 'toggle', kind: PAINT },

    { group: 'Color', key: 'colorMode', label: 'Surface color', type: 'seg', kind: PAINT, wrap: true, options: [['trap', 'Orbit trap'], ['normal', 'Normals'], ['depth', 'Depth'], ['iteration', 'Steps']] },
    { group: 'Color', key: 'trapScale', label: 'Trap scale', type: 'range', kind: PAINT, min: 0.1, max: 6, step: 0.05, fmt: f2, dimUnless: s => s.colorMode === 'trap' },
    { group: 'Color', key: 'trapOffset', label: 'Trap offset', type: 'range', kind: PAINT, min: -1, max: 1, step: 0.02, fmt: f2, dimUnless: s => s.colorMode === 'trap' },

    { group: 'Quality', key: 'maxSteps', label: 'Max ray steps', type: 'range', kind: PAINT, min: 48, max: 512, step: 8 },
    { group: 'Quality', key: 'eps', label: 'Surface epsilon', type: 'range', kind: PAINT, min: 0.0002, max: 0.006, step: 0.0002, fmt: f3 },
    { group: 'Quality', key: 'ssaa', label: 'Supersample exports (anti-aliasing)', type: 'toggle', kind: 'anim', hint: 'Renders the export at up to 2× and resolves it down, so edges on a large print are smooth rather than stair-stepped. Slower, and only affects exports.' },

    { group: 'Section', key: 'section', label: 'Contour section (2D slice)', type: 'toggle', kind: PAINT },
    { group: 'Section', key: 'sectionZ', label: 'Slice depth', type: 'range', kind: PAINT, min: -1.5, max: 1.5, step: 0.01, fmt: f2, dimUnless: s => s.section },
    { group: 'Section', key: 'contour', label: 'Contour spacing', type: 'range', kind: PAINT, min: 0.01, max: 0.4, step: 0.005, fmt: f3, dimUnless: s => s.section },
    { group: 'Section', key: 'zoom', label: 'Slice zoom', type: 'range', kind: PAINT, min: 0.3, max: 4, step: 0.05, fmt: f2, dimUnless: s => s.section },
  ];

  const DEFAULTS = {
    fractal: 'bulb', iters: 10, power: 8, scale: 2, minRad: 0.5, foldLimit: 1,
    azimuth: 35, elevation: 18, distance: 2.9, fov: 1.6, targetY: 0,
    autoOrbit: false, orbitSpeed: 6, aspect: '1:1',
    lightAz: 40, lightEl: 45, ao: 0.55, spec: 0.35, fog: 0.35, shadow: false,
    colorMode: 'trap', trapScale: 2.6, trapOffset: -0.12,
    maxSteps: 128, eps: 0.0012, ssaa: true,
    section: false, sectionZ: 0, contour: 0.08, zoom: 1.6,
    seed: 'fractal-0417',
  };

  const PRESETS = {
    bulb: { label: 'Mandelbulb', p: { fractal: 'bulb', power: 8, iters: 10, azimuth: 35, elevation: 18, distance: 2.9, fov: 1.6, colorMode: 'trap', trapScale: 2.6, trapOffset: -0.12, ao: 0.55, fog: 0.35, shadow: false, section: false }, palette: Studio.PALETTES.ember },
    menger: { label: 'Menger sponge', p: { fractal: 'menger', iters: 5, azimuth: 40, elevation: 28, distance: 3.4, fov: 1.5, colorMode: 'trap', trapScale: 2.2, trapOffset: -0.1, ao: 0.5, fog: 0.25, shadow: true, section: false }, palette: Studio.PALETTES.graphite },
    box: { label: 'Mandelbox', p: { fractal: 'box', scale: -1.75, minRad: 0.5, foldLimit: 1, iters: 12, azimuth: 20, elevation: 12, distance: 4.2, fov: 1.5, colorMode: 'trap', trapScale: 2.6, ao: 0.6, fog: 0.4, shadow: false, section: false }, palette: Studio.PALETTES.glacier },
    kifs: { label: 'Kaleidoscopic', p: { fractal: 'kifs', scale: 1.9, iters: 14, azimuth: 55, elevation: 22, distance: 3.6, fov: 1.5, colorMode: 'trap', trapScale: 3.2, ao: 0.6, fog: 0.45, shadow: false, section: false }, palette: Studio.PALETTES.verdigris },
    apollo: { label: 'Apollonian', p: { fractal: 'apollo', scale: 1.15, iters: 10, azimuth: 30, elevation: 15, distance: 2.4, fov: 1.8, colorMode: 'trap', trapScale: 2.0, ao: 0.7, fog: 0.5, shadow: false, section: false }, palette: Studio.PALETTES.bioluminescent },
    sierp: { label: 'Sierpinski', p: { fractal: 'sierp', iters: 12, azimuth: 45, elevation: 20, distance: 4.4, fov: 1.5, colorMode: 'trap', trapScale: 2.4, ao: 0.45, fog: 0.3, shadow: true, section: false }, palette: Studio.PALETTES.tram },
    julia: { label: 'Quaternion Julia', p: { fractal: 'julia', iters: 12, azimuth: 25, elevation: 10, distance: 2.6, fov: 1.7, colorMode: 'trap', trapScale: 2.8, ao: 0.5, fog: 0.35, shadow: false, section: false }, palette: Studio.PALETTES.nightshade },
    section: { label: 'Contour section', p: { fractal: 'bulb', power: 8, iters: 8, section: true, sectionZ: 0.05, contour: 0.06, zoom: 1.5, colorMode: 'trap' }, palette: Studio.PALETTES.petri },
  };

  function aspectRatio(s) {
    const [w, h] = s.aspect.split(':').map(Number);
    return h / w;
  }

  Studio.register({
    id: 'fractal',
    name: 'Fractal Geometry',
    subtitle: 'signed-distance raymarching of 3D fractals · 2009', equation: 'march t <- t + DE(p) until DE(p) < eps;   normal n = grad DE(p)', credit: "Ray tracing of deterministic 3D fractals: Hart, Sandin and Kauffman, 1989; sphere tracing formalized by John C. Hart, 1996. The Mandelbulb was found by Daniel White and Paul Nylander in 2009, the Mandelbox by Tom Lowe in 2010, and the Apollonian formulation is Inigo Quilez's.",
    order: 40,
    blurb: 'Every surface here is defined by a distance estimator, a function that returns how far you are from the set rather than where its surface lies. A ray marches forward by that safe distance until it lands within epsilon of the boundary, so shading, ambient occlusion and depth all fall out of the marching itself: occlusion from the step count, color from the orbit trap (how close the iterated point came to the origin before escaping). The same machinery renders escape-time sets like the Mandelbulb and quaternion Julia, and folding systems like the Mandelbox and kaleidoscopic IFS.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Quality', 'Section'],
    hints: {
      'Fractal': 'Iterations deepen the set but cost time; the Box, KIFS and Apollonian estimators are folding systems where scale is the whole character. Seeded constants (KIFS fold planes and the Julia constant) come from the seed.',
      'Quality': 'Raise max steps for thin filaments and deep zooms; lower epsilon for crisper edges. Both slow the render, and exports use the same settings.',
    },
    palette: true,
    defaultPalette: 'glacier',
    paletteLabel: 'Ramp (dark → light)',
    headline: 'iters',
    headlineLabel: 'iterations',
    surprise(rng) {
      const f = rng.pick(['bulb', 'menger', 'box', 'kifs', 'sierp', 'apollo', 'julia']);
      const p = {
        fractal: f,
        iters: f === 'menger' ? rng.int(4, 6) : rng.int(8, 14),
        power: Math.round(rng.range(3, 10) * 10) / 10,
        scale: f === 'box' ? Math.round(rng.range(-2.4, -1.4) * 100) / 100 : (f === 'apollo' ? Math.round(rng.range(1.0, 1.4) * 100) / 100 : Math.round(rng.range(1.6, 2.3) * 100) / 100),
        minRad: Math.round(rng.range(0.35, 0.8) * 100) / 100,
        foldLimit: Math.round(rng.range(0.8, 1.3) * 100) / 100,
        azimuth: rng.int(0, 359), elevation: rng.int(-20, 45),
        distance: Math.round(rng.range(2.2, 4.6) * 100) / 100,
        fov: Math.round(rng.range(1.3, 2.2) * 100) / 100,
        lightAz: rng.int(0, 359), lightEl: rng.int(20, 70),
        ao: Math.round(rng.range(0.3, 0.85) * 100) / 100,
        spec: Math.round(rng.range(0.1, 0.7) * 100) / 100,
        fog: Math.round(rng.range(0.15, 0.7) * 100) / 100,
        shadow: rng() < 0.35,
        colorMode: rng.pick(['trap', 'trap', 'trap', 'normal', 'iteration']),
        trapScale: Math.round(rng.range(1.0, 3.4) * 100) / 100,
        trapOffset: Math.round(rng.range(-0.3, 0.3) * 100) / 100,
        section: rng() < 0.12,
        maxSteps: 128,
      };
      return p;
    },

    create(host) {
      const canvas = host.canvas;
      let gl = null, pass = null, rampTex = null, rampKey = '';
      let raf = 0, orbitPhase = 0, running = false, failed = false;
      let lastMs = 0;

      function init() {
        if (gl || failed) return !!gl;
        try {
          gl = G.createGL(canvas, { preserveDrawingBuffer: true });
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

      function seeded(s) {
        const rng = U.makeRng(s.seed + '/fractal/' + (s.rerolls || 0));
        return {
          fold: [rng.range(0.6, 1.6), rng.range(0.4, 1.4), rng.range(0.6, 1.8)],
          julia: [rng.range(-0.5, 0.1), rng.range(-0.7, 0.7), rng.range(-0.5, 0.5), rng.range(-0.4, 0.4)],
        };
      }

      function uniforms(s, w, h) {
        const k = seeded(s);
        const az = (s.azimuth + orbitPhase) * Math.PI / 180;
        const el = s.elevation * Math.PI / 180;
        const ta = [0, s.targetY, 0];
        const ro = [
          ta[0] + s.distance * Math.cos(el) * Math.cos(az),
          ta[1] + s.distance * Math.sin(el),
          ta[2] + s.distance * Math.cos(el) * Math.sin(az),
        ];
        const bg = U.hexToRgb(s.bg).map(v => Math.pow(v / 255, 2.2));
        return {
          u_res: [w, h], u_ro: ro, u_ta: ta, u_fov: s.fov,
          u_fractal: FIDX[s.fractal], u_iters: s.iters, u_power: s.power,
          u_scale: s.scale, u_minRad: s.minRad, u_foldLimit: s.foldLimit,
          u_fold: k.fold, u_julia: k.julia,
          u_maxSteps: s.maxSteps, u_eps: s.eps, u_bg: bg,
          u_lightAz: s.lightAz * Math.PI / 180, u_lightEl: s.lightEl * Math.PI / 180,
          u_ao: s.ao, u_spec: s.spec, u_fog: s.fog, u_shadow: s.shadow ? 1 : 0,
          u_colorMode: CMODE[s.colorMode], u_trapScale: s.trapScale, u_trapOffset: s.trapOffset,
          u_section: s.section ? 1 : 0, u_sectionZ: s.sectionZ, u_contour: s.contour, u_zoom: s.zoom,
          u_ramp: ensureRamp(s),
        };
      }

      function draw(preview) {
        if (!init()) return;
        const s = host.getState();
        const t0 = performance.now();
        const u = uniforms(s, canvas.width, canvas.height);
        if (preview) { u.u_maxSteps = Math.max(48, Math.round(s.maxSteps * 0.55)); u.u_shadow = 0; }
        pass.draw(null, u);
        gl.finish();
        lastMs = Math.round(performance.now() - t0);
        status(s);
      }

      function status(s) {
        const name = (FRACTALS.find(f => f[0] === s.fractal) || [, s.fractal])[1];
        host.setStatus(
          '<span><b>' + name + '</b>' + (s.section ? ' section' : '') + '</span>' +
          '<span>' + s.iters + ' iters</span>' +
          '<span>' + s.maxSteps + ' steps</span>' +
          '<span>' + lastMs + ' ms</span>');
      }

      function loop() {
        if (!running) return;
        const s = host.getState();
        orbitPhase = (orbitPhase + s.orbitSpeed * 0.06) % 360;
        draw(true);
        raf = requestAnimationFrame(loop);
      }
      function startOrbit() {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(loop);
      }
      function stopOrbit(redraw) {
        if (!running) return;
        running = false;
        cancelAnimationFrame(raf);
        if (redraw) draw(false);
      }

      function readTarget(target) {
        const w = target.w, h = target.h;
        const px = new Uint8Array(w * h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        ctx.putImageData(img, 0, 0);
        return c;
      }

      return {
        aspect(s) { return aspectRatio(s); },
        regenerate() {
          if (!init()) return;
          const s = host.getState();
          if (s.autoOrbit && !host.reducedMotion()) startOrbit();
          else { stopOrbit(false); draw(false); }
        },
        repaint() {
          const s = host.getState();
          if (running && !(s.autoOrbit && !host.reducedMotion())) stopOrbit(false);
          if (!running) draw(false);
        },
        live(key) {
          const s = host.getState();
          if (key === 'autoOrbit') {
            if (s.autoOrbit && !host.reducedMotion()) startOrbit();
            else stopOrbit(true);
            return;
          }
          if (!running) draw(false);
        },
        resize() { if (!running) draw(false); },
        pause() { if (running) { cancelAnimationFrame(raf); running = false; } },
        resume() {
          const s = host.getState();
          if (s.autoOrbit && !host.reducedMotion()) startOrbit();
          else draw(false);
        },
        action(key) {
          if (key !== 'reroll') return;
          const s = host.getState();
          s.rerolls = (s.rerolls || 0) + 1;
          if (!running) draw(false);
        },
        async exportPNG(w, h) {
          if (!init()) throw new Error('WebGL2 unavailable');
          const s = host.getState();
          const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
          // supersample where the budget allows, then resolve down for clean edges
          let ss = 1;
          if (s.ssaa) {
            const mp = (w * h) / 1e6;
            ss = mp <= 26 ? 2 : (mp <= 60 ? 1.5 : 1.25);
          }
          let pw = Math.round(w * ss), ph = Math.round(h * ss);
          const fit = Math.min(1, maxTex / Math.max(pw, ph));
          pw = Math.max(64, Math.round(pw * fit)); ph = Math.max(64, Math.round(ph * fit));
          const target = new G.Target(gl, pw, ph, { type: 'rgba8', filter: 'linear' });
          try {
            pass.draw(target, uniforms(s, pw, ph));
            gl.finish();
            let c = readTarget(target);
            if (pw !== w || ph !== h) c = U.upscale(c, w, h, true);
            return await U.toBlob(c);
          } finally {
            target.dispose();
            if (!running) draw(false);
          }
        },
      };
    },
  });
})();

