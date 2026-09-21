/* modules/maxwell.js */
/* Lossless periodic TMz Maxwell fields on a spatially and temporally staggered Yee grid. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, TAU = U.TAU;
  const GEOM = 'geom', LIVE = 'live', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const f2 = value => value.toFixed(2), pre = (label, p, palette) => ({ label, p, palette });
  const HEAD = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv; out vec4 outColor;`;
  const PERIODIC = `uniform sampler2D u_state; uniform ivec2 u_size;
vec4 cell(ivec2 p){ return texelFetch(u_state, (p + u_size) % u_size, 0); }`;

  // A texel stores Ez(i,j,n), Hx(i,j+1/2,n-1/2), Hy(i+1/2,j,n-1/2), epsilon(i,j).
  // The two passes keep the curl operators as negative adjoints under periodic boundaries.
  const H_FS = HEAD + PERIODIC + `
uniform float u_dt, u_dx, u_mu;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); vec4 q = cell(p);
  float ey = cell(p + ivec2(0,1)).r - q.r;
  float ex = cell(p + ivec2(1,0)).r - q.r;
  q.g -= u_dt * ey / (u_mu * u_dx);
  q.b += u_dt * ex / (u_mu * u_dx);
  outColor = q;
}`;
  const E_FS = HEAD + PERIODIC + `
uniform float u_dt, u_dx;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); vec4 q = cell(p);
  float curlH = (q.b - cell(p - ivec2(1,0)).b) - (q.g - cell(p - ivec2(0,1)).g);
  q.r += u_dt * curlH / (q.a * u_dx);
  outColor = q;
}`;
  const SEED_FS = HEAD + `
uniform vec2 u_size, u_center; uniform float u_eps, u_ratio, u_width, u_cycles, u_angle, u_phase;
uniform int u_material, u_pattern;
vec2 displacement(vec2 a, vec2 b){ vec2 d = a-b; d -= floor(d+0.5); return d * vec2(1.0,u_size.y/u_size.x); }
float packet(vec2 center, float phase){
  vec2 d = displacement(v_uv, center);
  float c = cos(u_angle)*d.x + sin(u_angle)*d.y;
  return exp(-dot(d,d)/(2.0*u_width*u_width)) * cos(6.28318530718*u_cycles*c+phase);
}
void main(){
  float eps = u_eps, material = 0.0;
  vec2 d = displacement(v_uv, vec2(0.56,0.5));
  if(u_material == 1) material = length(d) < 0.18*min(1.0,u_size.y/u_size.x) ? 1.0 : 0.0;
  else if(u_material == 2) material = v_uv.x > 0.43 && v_uv.x < 0.62 ? 1.0 : 0.0;
  else if(u_material == 3){ vec2 p = fract(v_uv*vec2(7.0,5.0))-0.5; material = length(p) < 0.26 ? 1.0 : 0.0; }
  else if(u_material == 4){ float center = 0.5+0.12*sin(6.28318530718*v_uv.x); material = abs(v_uv.y-center) < 0.065 ? 1.0 : 0.0; }
  eps *= mix(1.0,u_ratio,material);
  float e = packet(u_center,u_phase);
  if(u_pattern == 1) e += packet(vec2(1.0-u_center.x,1.0-u_center.y),-u_phase);
  else if(u_pattern == 2){ float r = length(displacement(v_uv,vec2(0.5))); e = exp(-pow((r-0.23)/u_width,2.0))*cos(6.28318530718*u_cycles*r+u_phase); }
  else if(u_pattern == 3) e = cos(6.28318530718*(3.0*v_uv.x+2.0*v_uv.y)+u_phase);
  outColor = vec4(e,0.0,0.0,eps);
}`;
  const REDUCE_FS = HEAD + `
uniform sampler2D u_state; uniform vec2 u_res;
${G.GLSL.bicubic}
void main(){ float e = texCR(u_state,v_uv,u_res); outColor = vec4(e*e,0.0,0.0,1.0); }`;
  const RENDER_FS = HEAD + `
uniform sampler2D u_state; uniform vec2 u_res;
uniform float u_scale, u_exposure, u_eps, u_ratio; uniform int u_view;
${G.GLSL.bicubic}
${G.GLSL.ramp}
void main(){
  vec4 q = texCR4(u_state,v_uv,u_res);
  float z = q.r * u_exposure / max(u_scale,1e-6);
  float value = 0.5 + 0.49*z/sqrt(1.0+z*z);
  if(u_view == 1) value = clamp(log(1.0+z*z)/log(9.0),0.0,1.0);
  // Material is displayed from nearest cells, so interpolation does not invent intermediate epsilon.
  if(u_view == 2) value = (texture(u_state,v_uv).a/u_eps-1.0)/max(u_ratio-1.0,1e-6);
  outColor = vec4(ramp(value),1.0);
}`;

  function sizeOf(s) { return [s.grid, Math.max(32, Math.round(s.grid * (ASPECTS[s.aspect] || 1)))]; }
  function timeStep(s) {
    // dx = dy = 1/grid. epsilon(x,y) >= s.epsilon, with constant positive permeability.
    // dt <= sqrt(epsilon_min*mu)/(sqrt(dx^-2+dy^-2)); courant is a fraction of that bound.
    return s.courant * Math.sqrt(s.epsilon * s.mu) / (Math.SQRT2 * s.grid);
  }
  function sanitize(s) {
    const finite = (value, fallback, lo, hi) => U.clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, lo, hi);
    s.grid = [128,256,512,1024,2048].includes(Number(s.grid)) ? Number(s.grid) : 512;
    s.epsilon = finite(s.epsilon,1,0.25,9); s.mu = finite(s.mu,1,0.25,4);
    s.ratio = finite(s.ratio,4,1,9); s.courant = finite(s.courant,0.8,0.1,0.95);
    s.width = finite(s.width,0.07,0.035,0.2); s.cycles = finite(s.cycles,12,2,20);
    s.steps = Math.round(finite(s.steps,3,1,8)); s.warmup = Math.round(finite(s.warmup,96,0,1500));
    s.exposure = finite(s.exposure,1,0.2,3);
  }

  function create(host) {
    const gl = G.createGL(host.canvas), noop = () => {};
    function dead(message) {
      host.setStatus(message); host.fault(message);
      return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(message)) };
    }
    if (!gl || !gl.floatExt) return dead('Maxwell needs WebGL2 with float32 color buffers.');
    let magnetic, electric, seed, display, reduction;
    try {
      magnetic = new G.Pass(gl,H_FS); electric = new G.Pass(gl,E_FS); seed = new G.Pass(gl,SEED_FS);
      display = new G.Pass(gl,RENDER_FS); reduction = new G.Pass(gl,REDUCE_FS);
    } catch (error) { return dead('Maxwell shaders could not compile on this GPU.'); }
    let field = null, sample = null, gw = 0, gh = 0, dt = 0, stepCount = 0, simTime = 0;
    let scale = 1, raf = 0, timer = 0, ramp = null, rampKey = '', pending = 0;
    const reduced = new Float32Array(64*64*4);
    function stop() { cancelAnimationFrame(raf); clearTimeout(timer); raf = 0; timer = 0; }
    function ensureGrid(s) {
      const [w,h] = sizeOf(s), max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (w > max || h > max) throw Error('Selected grid exceeds this GPU limit of '+max+' cells.');
      if (field && w === gw && h === gh) return;
      if (field) { field.dispose(); field = null; }
      field = new G.PingPong(gl,w,h,{ type:'rgba32f',filter:'nearest',wrap:'repeat' });
      if (!sample) sample = new G.Target(gl,64,64,{ type:'rgba32f',filter:'nearest' });
      gw = w; gh = h;
    }
    function advanceH(amount) {
      magnetic.draw(field.write,{u_state:field.read,u_size:{ivec:[gw,gh]},u_dt:amount,u_dx:1/gw,u_mu:host.getState().mu}); field.swap();
    }
    function step(n) {
      for (let i=0;i<n;i++) {
        advanceH(dt);
        electric.draw(field.write,{u_state:field.read,u_size:{ivec:[gw,gh]},u_dt:dt,u_dx:1/gw}); field.swap();
      }
      stepCount += n; simTime += n*dt;
    }
    function measure() {
      reduction.draw(sample,{u_state:field.read,u_res:[gw,gh]});
      gl.bindFramebuffer(gl.FRAMEBUFFER,sample.fbo);
      gl.readPixels(0,0,64,64,gl.RGBA,gl.FLOAT,reduced); gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      let sum=0; for (let i=0;i<reduced.length;i+=4) sum+=reduced[i];
      scale=Math.max(1e-5,Math.sqrt(sum/(64*64)));
    }
    function status() {
      host.setStatus('<span>grid <b>'+gw+'×'+gh+'</b> · float32</span><span>periodic · t <b>'+simTime.toFixed(3)+'</b></span><span>dt <b>'+dt.toExponential(2)+'</b></span><span>step <b>'+stepCount.toLocaleString()+'</b>'+(pending?' · warming up':'')+'</span>');
    }
    function render(target) {
      const s=host.getState(), key=s.bg+'|'+s.palette.join(',');
      if (!ramp || key!==rampKey) { if(ramp)ramp.dispose(); ramp=G.rampTexture(gl,s.palette,s.bg); rampKey=key; }
      display.draw(target||null,{u_state:field.read,u_res:[gw,gh],u_ramp:ramp,u_scale:scale,u_exposure:s.exposure,u_eps:s.epsilon,u_ratio:s.ratio,u_view:{int:{electric:0,intensity:1,material:2}[s.view]||0}});
    }
    function animate() {
      const s=host.getState();
      if (!s.running || host.reducedMotion() || !host.isActive()) return;
      raf=requestAnimationFrame(()=>{raf=0;step(s.steps); if(stepCount%24<s.steps)measure();render();status();animate();});
    }
    function warm() {
      stop();
      if (!pending) { measure();render();status();animate();return; }
      const count=Math.min(gw>=1024?2:8,pending);pending-=count;step(count);
      measure();render();status();
      if(pending)timer=setTimeout(()=>{timer=0;warm();},0);else animate();
    }
    return {
      aspect(s) { return ASPECTS[s.aspect]||1; },
      regenerate() {
        stop(); const s=host.getState();
        try { ensureGrid(s); } catch(error) { host.fault(error.message+' Try a smaller grid.'); return; }
        dt=timeStep(s); stepCount=0;simTime=0;
        const rng=U.makeRng(s.seed+'/maxwell');
        seed.draw(field.read,{u_size:[gw,gh],u_center:[rng.range(0.23,0.29),rng.range(0.46,0.54)],u_eps:s.epsilon,u_ratio:s.ratio,u_width:s.width,u_cycles:s.cycles,u_angle:rng.range(-0.35,0.35),u_phase:rng.range(-Math.PI,Math.PI),u_material:{int:{uniform:0,disk:1,slab:2,rods:3,guide:4}[s.material]||0},u_pattern:{int:{packet:0,twins:1,ring:2,plane:3}[s.pattern]||0}});
        // The user-facing initial field has H(t=0)=0. Back up H by dt/2 before leapfrog.
        advanceH(-0.5*dt); pending=s.warmup;warm();
      },
      fieldCells() { return field?[gw,gh]:null; },
      repaint() { if(field)render(); }, resize() { if(field)render(); },
      pause() { stop(); }, resume() { if(field)warm(); },
      live() { if(field){stop();warm();} },
      action(key) { if(key==='reseed')this.regenerate();else if(key==='burst'&&field){stop();pending+=128;warm();} },
      async exportPNG(w,h) {
        if(!field)throw Error('No Maxwell field to export.');
        const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if(w>max||h>max)throw Error('Print dimensions exceed this GPU limit of '+max+' pixels.');
        const target=new G.Target(gl,w,h,{type:'rgba8'}),pixels=new Uint8Array(w*h*4);
        try { render(target);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels); }
        finally { gl.bindFramebuffer(gl.FRAMEBUFFER,null);target.dispose(); }
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d'),image=ctx.createImageData(w,h);
        for(let y=0;y<h;y++)image.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);
        ctx.putImageData(image,0,0);return U.toBlob(canvas);
      },
    };
  }

  Studio.register({
    id: 'maxwell', name: 'Maxwell FDTD', tab: 'Maxwell', subtitle: 'electric and magnetic waves · 1966', order: 53.6,
    equation: 'ε ∂Ez/∂t = ∂Hy/∂x − ∂Hx/∂y; μ ∂Hx/∂t = −∂Ez/∂y; μ ∂Hy/∂t = ∂Ez/∂x',
    credit: 'K. S. Yee, Numerical solution of initial boundary value problems involving Maxwell’s equations in isotropic media, IEEE Transactions on Antennas and Propagation 14, 302–307 (1966), doi:10.1109/TAP.1966.1138693. TMz Yee differences and staggering follow the equations described in John B. Schneider, Understanding the FDTD Method, chapter 8. This is an original implementation of the classical method, not new physics.',
    blurb: 'An electric pattern starts with zero magnetic field, then splits into waves as electric and magnetic fields exchange energy. Dielectric disks, strips and rods slow and scatter the wave. Opposite edges connect: any wave leaving one edge returns through the other. This is a lossless periodic sheet in normalized units, with no absorbing layer. Electric colors the signed out-of-plane field; Intensity shows Ez squared, not total electromagnetic energy; Material shows the sampled permittivity. Fine grids reveal smaller features but cost more work. The numerical fields stay at the chosen cell count when printed.',
    schema: [
      {group:'Medium',key:'material',label:'Dielectric',type:'seg',kind:GEOM,options:[['uniform','Uniform'],['disk','Disk'],['slab','Slab'],['rods','Rods'],['guide','Winding strip']]},
      RANGE('Medium','epsilon','Background ε',GEOM,0.25,9,0.05,f2),
      RANGE('Medium','ratio','Dielectric ratio',GEOM,1,9,0.1,f2),
      RANGE('Medium','mu','Permeability μ',GEOM,0.25,4,0.05,f2),
      {group:'Excitation',key:'pattern',label:'Initial electric field',type:'seg',kind:GEOM,options:[['packet','Packet'],['twins','Two packets'],['ring','Ring'],['plane','Standing plane wave']]},
      RANGE('Excitation','width','Packet width',GEOM,0.035,0.2,0.005,f2),
      RANGE('Excitation','cycles','Cycles per unit length',GEOM,2,20,0.5,f2),
      {group:'Grid',key:'grid',label:'Cells across',type:'seg',kind:GEOM,options:[[128,'128'],[256,'256'],[512,'512'],[1024,'1024 · heavy'],[2048,'2048 · very heavy']]},
      {group:'Grid',key:'aspect',label:'Aspect',type:'seg',kind:GEOM,options:[['1:1','1:1'],['4:5','4:5'],['5:4','5:4'],['3:2','3:2'],['16:9','16:9']]},
      RANGE('Simulation','courant','CFL fraction',GEOM,0.1,0.95,0.01,f2),
      RANGE('Simulation','warmup','Warm-up steps',GEOM,0,1500,16,String),
      RANGE('Simulation','steps','Steps per frame',LIVE,1,8,1,String),
      {group:'Simulation',key:'running',label:'Running',type:'toggle',kind:LIVE},
      {group:'Simulation',key:'burst',label:'Run 128 steps',type:'action'},
      {group:'Simulation',key:'reseed',label:'Reseed',type:'action'},
      {group:'Picture',key:'view',label:'View',type:'seg',kind:PAINT,options:[['electric','Electric'],['intensity','Intensity'],['material','Material']]},
      RANGE('Picture','exposure','Exposure',PAINT,0.2,3,0.05,f2),
    ],
    defaults: {grid:512,aspect:'1:1',material:'disk',epsilon:1,ratio:4,mu:1,pattern:'twins',width:0.07,cycles:12,courant:0.8,warmup:96,steps:3,running:true,view:'electric',exposure:1,seed:'yee-1966'},
    presets: {
      disk:pre('Dielectric disk',{material:'disk',pattern:'twins',ratio:4,width:0.07},Studio.PALETTES.thermal),
      rings:pre('Vacuum ring',{material:'uniform',pattern:'ring',cycles:15,view:'intensity',width:0.06},Studio.PALETTES.glacier),
      slab:pre('Glass slab',{material:'slab',pattern:'packet',ratio:2.25,cycles:10,warmup:160},Studio.PALETTES.harbor),
      rods:pre('Dielectric rods',{material:'rods',pattern:'plane',ratio:6,view:'electric',warmup:128},Studio.PALETTES.ember),
      strip:pre('Winding strip',{material:'guide',pattern:'twins',ratio:4,view:'intensity',cycles:8,width:0.1,warmup:160},Studio.PALETTES.bioluminescent),
      plane:pre('Homogeneous plane wave',{material:'uniform',pattern:'plane',epsilon:2.25,mu:1,view:'electric',warmup:112},Studio.PALETTES.graphite),
    },
    hints: {
      Medium:'Positive, lossless, nondispersive material. Opposite edges connect. Stair-stepped dielectric interfaces need their own refinement check.',
      Excitation:'The initial magnetic field is zero, so these electric patterns launch waves in both directions. The standing plane pattern has fixed mode numbers (3, 2).',
      Grid:'512 is the default. A square 2048 grid uses about 128 MiB for the two field textures alone and roughly 64 times the solver work per physical time as 512. Select heavy grids explicitly; they can be slow or exhaust GPU memory.',
      Simulation:'The time step is derived from cell spacing and the fastest material wave speed. Changing the CFL fraction rebuilds the staggered state. There is no numerical damping or clipping.',
      Picture:'Exposure uses a sampled field RMS. Intensity is Ez squared with a display curve, not calibrated energy or a physical detector. A larger print does not add resolved physics.',
    },
    closedGroups:['Excitation','Grid','Simulation'], palette:true,defaultPalette:'thermal',familiarity:'occasional',
    surprise(rng) { return {material:rng.pick(['disk','slab','rods','guide']),pattern:rng.pick(['packet','twins','ring']),ratio:rng.range(1.5,7),cycles:rng.range(6,18),width:rng.range(0.045,0.12)}; },
    sanitize, create,
  });
})();
