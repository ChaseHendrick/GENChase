/* modules/nonreciprocal.js: original finite-difference implementation of a published 2025 model. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const ASPECTS = {'1:1':1,'4:5':1.25,'5:4':0.8,'3:2':2/3,'16:9':9/16};
  const HEAD = `#version 300 es
precision highp float; precision highp int;
in vec2 v_uv; out vec4 outColor;`;
  // The local nonlinear chemical potential is evaluated BEFORE taking its Laplacian.
  const RHS_FS = HEAD + `
uniform sampler2D u_state; uniform ivec2 u_size;
uniform float u_dx, u_K, u_a0, u_a1;
vec2 cell(ivec2 p){return texelFetch(u_state,(p+2*u_size)%u_size,0).rg;}
vec2 localMu(vec2 z){float r2=dot(z,z); return (r2-1.0)*z+(u_a0-u_a1*r2)*vec2(-z.y,z.x);}
vec2 lap(ivec2 p){return (cell(p+ivec2(1,0))+cell(p-ivec2(1,0))+cell(p+ivec2(0,1))+cell(p-ivec2(0,1))-4.0*cell(p))/(u_dx*u_dx);}
void main(){ivec2 p=ivec2(gl_FragCoord.xy);
 vec2 chemical=localMu(cell(p+ivec2(1,0)))+localMu(cell(p-ivec2(1,0)))+localMu(cell(p+ivec2(0,1)))+localMu(cell(p-ivec2(0,1)))-4.0*localMu(cell(p));
 vec2 biharm=lap(p+ivec2(1,0))+lap(p-ivec2(1,0))+lap(p+ivec2(0,1))+lap(p-ivec2(0,1))-4.0*lap(p);
 outColor=vec4((chemical-u_K*biharm)/(u_dx*u_dx),0.0,1.0);
}`;
  const MIX_FS = HEAD + `
uniform sampler2D u_base,u_k1,u_k2; uniform float u_dt; uniform int u_correct;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);vec2 b=texelFetch(u_base,p,0).rg,k=texelFetch(u_k1,p,0).rg;
 if(u_correct==1) k=0.5*(k+texelFetch(u_k2,p,0).rg);
 outColor=vec4(b+u_dt*k,0.0,1.0);}`;
  const COPY_FS = HEAD + `uniform sampler2D u_state; void main(){outColor=texelFetch(u_state,ivec2(gl_FragCoord.xy),0);}`;
  const RENDER_FS = HEAD + `
uniform sampler2D u_state; uniform vec2 u_res; uniform int u_view; uniform float u_a0,u_a1,u_gain;
${G.GLSL.bicubic}
${G.GLSL.ramp}
void main(){vec2 z=texCR4(u_state,v_uv,u_res).rg; float a=length(z),v=0.5+0.45*tanh(z.x*u_gain);
 if(u_view==1)v=0.5+0.45*tanh(z.y*u_gain);
 if(u_view==2)v=clamp(a*u_gain/1.6,0.0,1.0);
 if(u_view==3)v=atan(z.y,z.x)/6.28318530718+0.5;
 if(u_view==4)v=0.5+0.45*tanh((u_a0-u_a1*a*a)*u_gain/4.0);
 outColor=vec4(ramp(v),1.0);}`;
  const LIMIT = 2.5;
  function timeStep(s) {
    // Conservative scale estimate for Heun: q <= 8/dx² and the nonlinear Jacobian
    // norm <= 1+3R²+|a0|+3|a1|R². Not a nonlinear stability proof.
    const q=8/(s.spacing*s.spacing), j=1+3*LIMIT*LIMIT+Math.abs(s.alpha0)+3*Math.abs(s.alpha1)*LIMIT*LIMIT;
    return s.safety/(q*(j+s.stiffness*q));
  }
  function initial(s,w,h){
    const rng=U.makeRng(s.seed+'/nonreciprocal'), data=new Float32Array(w*h*4), phases=Array.from({length:8},()=>rng()*U.TAU);
    const mode=Math.max(1,Math.round(w/24)), rho=Math.sqrt(Math.max(0.02,1-s.stiffness*4*Math.sin(Math.PI*mode/w)**2/(s.spacing*s.spacing)));
    let mx=0,my=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=4*(y*w+x), angle=U.TAU*(mode*x/w+(s.pattern==='diagonal'?2*y/h:0))+phases[0];
      let a,b;
      if(s.pattern==='noise'){a=rng.range(-0.35,0.35);b=rng.range(-0.35,0.35);}
      else {a=rho*Math.cos(angle);b=rho*Math.sin(angle);if(s.pattern==='perturbed'){a+=0.12*Math.sin(U.TAU*(3*x/w+4*y/h)+phases[1]);b+=0.12*Math.cos(U.TAU*(5*x/w-2*y/h)+phases[2]);}}
      data[p]=a;data[p+1]=b;data[p+3]=1;mx+=data[p];my+=data[p+1];
    }
    mx/=w*h;my/=w*h;
    for(let p=0;p<data.length;p+=4){data[p]-=mx;data[p+1]-=my;}
    return data;
  }
  function create(host){
    const gl=G.createGL(host.canvas), noop=()=>{};
    const dead=message=>{host.fault(message);return {aspect:s=>ASPECTS[s.aspect]||1,regenerate:noop,repaint:noop,resize:noop,pause:noop,resume:noop,exportPNG:()=>Promise.reject(Error(message))};};
    if(!gl||!gl.floatExt)return dead('Active mixture requires WebGL2 float32 color buffers.');
    let rhs,mix,copy,display;
    try{rhs=new G.Pass(gl,RHS_FS);mix=new G.Pass(gl,MIX_FS);copy=new G.Pass(gl,COPY_FS);display=new G.Pass(gl,RENDER_FS);}catch(error){return dead('Active-mixture shaders could not compile.');}
    let field,k1,k2,stage,backup,ramp,rampKey='',readback,gw=0,gh=0,steps=0,pending=0,dt=0,raf=0,timer=0,stopped='',drift=0,initialMean=[0,0];
    const stop=()=>{cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;};
    function read(){gl.bindFramebuffer(gl.FRAMEBUFFER,field.read.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,readback);gl.bindFramebuffer(gl.FRAMEBUFFER,null);let mx=0,my=0,max=0;for(let p=0;p<readback.length;p+=4){mx+=readback[p];my+=readback[p+1];max=Math.max(max,Math.hypot(readback[p],readback[p+1]));}return {mean:[mx/(gw*gh),my/(gw*gh)],max};}
    function allocate(s){const w=s.grid,h=Math.max(32,Math.round(w*(ASPECTS[s.aspect]||1)));if(w>gl.getParameter(gl.MAX_TEXTURE_SIZE)||h>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Selected grid exceeds the device limit.');if(w===gw&&h===gh&&field)return;for(const t of [field,k1,k2,stage,backup])if(t)t.dispose();const options={type:'rgba32f',filter:'nearest',wrap:'repeat'};field=new G.PingPong(gl,w,h,options);k1=new G.Target(gl,w,h,options);k2=new G.Target(gl,w,h,options);stage=new G.Target(gl,w,h,options);backup=new G.Target(gl,w,h,options);gw=w;gh=h;readback=new Float32Array(w*h*4);}
    function advance(n){
      if(stopped)return;const s=host.getState();copy.draw(backup,{u_state:field.read});
      const u={u_size:{ivec:[gw,gh]},u_dx:s.spacing,u_K:s.stiffness,u_a0:s.alpha0,u_a1:s.alpha1};
      for(let i=0;i<n;i++){
        rhs.draw(k1,Object.assign({u_state:field.read},u));
        mix.draw(stage,{u_base:field.read,u_k1:k1,u_k2:k1,u_dt:dt,u_correct:{int:0}});
        rhs.draw(k2,Object.assign({u_state:stage},u));
        mix.draw(field.write,{u_base:field.read,u_k1:k1,u_k2:k2,u_dt:dt,u_correct:{int:1}});field.swap();
      }
      const m=read();
      if(!Number.isFinite(m.max)||m.max>LIMIT||!m.mean.every(Number.isFinite)){
        copy.draw(field.read,{u_state:backup});stopped='Amplitude guard reached. Lower the step fraction or change the initial field.';pending=0;stop();return;
      }
      steps+=n;drift=Math.max(Math.abs(m.mean[0]-initialMean[0]),Math.abs(m.mean[1]-initialMean[1]));
    }
    // The periodic discrete Laplacian conserves both field means exactly, so the drift is float32
    // round-off: a regression test of the conservative form, not a measurement of the physics.
    function status(){host.setStatus('<span>step <b>'+steps.toLocaleString()+'</b>'+(pending?' · warming up':'')+'</span><span>grid <b>'+gw+'×'+gh+'</b> · t '+(steps*dt).toFixed(3)+'</span><span>dt <b>'+dt.toExponential(2)+'</b></span>'+U.stats.compare({label:'mean drift',measured:drift,expected:0,basis:'construction'})+(stopped?'<span>Stopped: '+stopped+'</span>':''));}
    function render(target){if(!field)return;const s=host.getState(),key=s.bg+'|'+s.palette.join(',');if(!ramp||key!==rampKey){if(ramp)ramp.dispose();ramp=G.rampTexture(gl,s.palette,s.bg);rampKey=key;}display.draw(target||null,{u_state:field.read,u_res:[gw,gh],u_ramp:ramp,u_view:{int:{first:0,second:1,amplitude:2,phase:3,coupling:4}[s.view]||0},u_a0:s.alpha0,u_a1:s.alpha1,u_gain:s.exposure});}
    function animate(){const s=host.getState();if(stopped||!s.running||host.reducedMotion()||!host.isActive())return;raf=requestAnimationFrame(()=>{raf=0;advance(s.steps);render();status();animate();});}
    function warm(){stop();if(stopped)return;const n=Math.min(16,pending);pending-=n;if(n)advance(n);render();status();if(pending)timer=setTimeout(warm,0);else animate();}
    return {
      aspect:s=>ASPECTS[s.aspect]||1,
      regenerate(){stop();const s=host.getState();try{allocate(s);}catch(error){host.fault(error.message);return;}steps=0;pending=s.warmup;dt=timeStep(s);stopped='';drift=0;field.read.upload(initial(s,gw,gh));initialMean=read().mean;warm();},
      fieldCells:()=>field?[gw,gh]:null,repaint:()=>render(),resize:()=>render(),pause:stop,resume(){if(field)warm();},live(){if(field)warm();},
      action(key){if(key==='burst'&&field&&!stopped){pending+=1024;warm();}},
      async exportPNG(w,h){if(!field)throw Error('No field to export.');const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(w>max||h>max)throw Error('Print exceeds this GPU texture limit.');const t=new G.Target(gl,w,h,{type:'rgba8'}),pixels=new Uint8Array(w*h*4);try{render(t);gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);t.dispose();}const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d'),im=cx.createImageData(w,h);for(let y=0;y<h;y++)im.data.set(pixels.subarray((h-y-1)*w*4,(h-y)*w*4),y*w*4);cx.putImageData(im,0,0);return U.toBlob(c);},
    };
  }
  const range=(group,key,label,kind,min,max,step)=>({group,key,label,type:'range',kind,min,max,step,fmt:v=>Number.isInteger(v)?String(v):v.toFixed(2)});
  const pre=(label,p,palette)=>({label,p,palette});
  Studio.register({
    id:'nonreciprocal',name:'Nonlinear Active Mixture',tab:'Active mixture',subtitle:'nonlinear nonreciprocal fields · 2025',order:10.5,
    equation:'∂t ψ = ∇²[(-1+iα₀)ψ + (1−iα₁)|ψ|²ψ − K∇²ψ]',
    credit:'S. Saha and R. Golestanian, Effervescence in a binary mixture with nonlinear non-reciprocal interactions, Nature Communications 16, 7310 (2025), doi:10.1038/s41467-025-61728-8, equation 5. Original finite-difference implementation; the paper uses a different spectral solver.',
    blurb:'Two conserved fields influence one another with a coupling that changes with their combined amplitude. Explore an active-mixture equation published in 2025, with periodic boundaries and mobility set to one. Initial waves and perturbed waves are prepared patterns; their presence alone is not evidence of spontaneous ordering. The paper reports traveling patterns and transient droplets, but this finite-grid viewer does not certify its phase diagram or chaos. Colors show either field, amplitude, phase, or the local coupling. Printing preserves the chosen numerical grid.',
    schema:[
      range('Mixture','alpha0','Linear coupling α₀','geom',-5,5,0.1),range('Mixture','alpha1','Nonlinear coupling α₁','geom',-5,5,0.1),range('Mixture','stiffness','Interface K','geom',0.5,2,0.1),
      {group:'Initial field',key:'pattern',label:'Preparation',type:'seg',kind:'geom',options:[['wave','Plane wave'],['perturbed','Perturbed wave'],['diagonal','Oblique wave'],['noise','Random mixture']]},
      {group:'Grid',key:'grid',label:'Cells across',type:'seg',kind:'geom',options:[[128,'128'],[256,'256'],[512,'512'],[1024,'1024 · heavy']]},
      {group:'Grid',key:'aspect',label:'Aspect',type:'seg',kind:'geom',options:Object.keys(ASPECTS).map(k=>[k,k])},range('Grid','spacing','Cell spacing','geom',0.5,2,0.1),
      range('Simulation','safety','Step fraction','geom',0.1,0.8,0.05),range('Simulation','warmup','Warm-up steps','geom',0,4096,64),range('Simulation','steps','Steps per frame','live',1,32,1),
      {group:'Simulation',key:'running',label:'Running',type:'toggle',kind:'live'},{group:'Simulation',key:'burst',label:'Run 1024 steps',type:'action'},
      {group:'Picture',key:'view',label:'View',type:'seg',kind:'paint',options:[['first','Field 1'],['second','Field 2'],['amplitude','Amplitude'],['phase','Phase'],['coupling','Local coupling']]},range('Picture','exposure','Exposure','paint',0.2,4,0.1),
    ],
    defaults:{seed:'active-mixture-2025',alpha0:4,alpha1:4,stiffness:1,pattern:'perturbed',grid:256,aspect:'1:1',spacing:1,safety:0.6,warmup:128,steps:8,running:true,view:'first',exposure:1.5},
    presets:{
      waves:pre('Constant coupling',{alpha0:3,alpha1:0,pattern:'wave',view:'first'},Studio.PALETTES.harbor),
      active:pre('Nonlinear mixture',{alpha0:4,alpha1:4,pattern:'perturbed',view:'first'},Studio.PALETTES.thermal),
      noise:pre('Random preparation',{alpha0:2.3,alpha1:4.6,pattern:'noise',warmup:512,view:'phase'},Studio.PALETTES.bioluminescent),
      oblique:pre('Oblique wave',{alpha0:1,alpha1:-1,pattern:'diagonal',view:'second'},Studio.PALETTES.ember),
      passive:pre('Reciprocal limit',{alpha0:0,alpha1:0,pattern:'noise',warmup:512,view:'first',exposure:3},Studio.PALETTES.graphite),
      coupling:pre('Coupling reversals',{alpha0:4,alpha1:5,pattern:'perturbed',view:'coupling'},Studio.PALETTES.verdigris),
    },
    hints:{Mixture:'A recently published model, not a new GENChase discovery. Local coupling is α₀−α₁|ψ|². No forcing or stochastic noise is applied after preparation.', 'Initial field':'All fields have near-zero sample means. Wave preparations are imposed initial conditions, not discoveries of a pattern.',Grid:'Cell spacing and cell count together set the physical box. More cells at fixed spacing enlarge the box; reduce spacing and increase count together to refine a fixed box.',Simulation:'Explicit Heun stepping uses a conservative local scale estimate, with no clipping. An amplitude guard stops and restores the last accepted batch. This is not a global stability proof. Long-time phases need separate convergence tests.',Picture:'Display colors are nonlinear. The phase near zero amplitude is not a reliable physical orientation.'},
    closedGroups:['Initial field','Grid','Simulation'],palette:true,defaultPalette:'thermal',
    sanitize(s){if(![128,256,512,1024].includes(Number(s.grid)))s.grid=256;s.grid=Number(s.grid);s.steps=Math.round(U.clamp(s.steps,1,32));s.warmup=Math.round(U.clamp(s.warmup,0,4096));},
    surprise:rng=>({alpha0:rng.range(1,5),alpha1:rng.range(1,5),pattern:rng.pick(['perturbed','diagonal','noise']),view:rng.pick(['first','second','phase'])}),create,
  });
})();
