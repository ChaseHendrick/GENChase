/* modules/volume-wave.js */
/* Periodic scalar wave volume. Float32 3D seven-point leapfrog on a 2D atlas. */
(function () {
  'use strict';
  const U=Studio.util,G=Studio.gl;
  const HEAD=`#version 300 es
precision highp float; precision highp int;
in vec2 v_uv; out vec4 outColor;
uniform int u_n, u_tiles;
ivec3 position(){ivec2 a=ivec2(gl_FragCoord.xy);return ivec3(a.x%u_n,a.y%u_n,(a.y/u_n)*u_tiles+a.x/u_n);}
ivec2 atlas(ivec3 p){p=(p+u_n)%u_n;return ivec2((p.z%u_tiles)*u_n+p.x,(p.z/u_tiles)*u_n+p.y);}
`;
  const STEP_FS=HEAD+`
uniform sampler2D u_state; uniform float u_r2; uniform bool u_first;
float at(ivec3 p){return texelFetch(u_state,atlas(p),0).r;}
void main(){ivec3 p=position();if(p.z>=u_n){outColor=vec4(0);return;}
vec2 q=texelFetch(u_state,atlas(p),0).rg;
float lap=at(p+ivec3(1,0,0))+at(p-ivec3(1,0,0))+at(p+ivec3(0,1,0))+at(p-ivec3(0,1,0))+at(p+ivec3(0,0,1))+at(p-ivec3(0,0,1))-6.0*q.r;
float next=2.0*q.r-q.g+u_r2*lap;
outColor=u_first?vec4(q.r,q.r+0.5*u_r2*lap,0,1):vec4(next,q.r,0,1);
}`;
  const SEED_FS=HEAD+`
uniform vec3 u_center;uniform float u_phase,u_width;uniform int u_pattern;
void main(){ivec3 p=position();if(p.z>=u_n){outColor=vec4(0);return;}
vec3 x=vec3(p)/float(u_n),d=x-u_center;d-=floor(d+0.5);
float q=cos(6.28318530718*dot(vec3(2,3,1),x)+u_phase);
if(u_pattern==0)q=exp(-dot(d,d)/(2.0*u_width*u_width))*cos(6.28318530718*6.0*length(d));
if(u_pattern==2)q=cos(6.28318530718*dot(vec3(2,3,1),x)+u_phase)+0.6*cos(6.28318530718*dot(vec3(5,-2,3),x)-u_phase);
outColor=vec4(q,q,0,1);
}`;
  const DISPLAY_FS=HEAD+`
uniform sampler2D u_state;uniform float u_slice,u_exposure;uniform int u_axis;
${G.GLSL.bicubic}
${G.GLSL.ramp}
float sampleSlice(ivec2 p,int z){ivec3 a=u_axis==0?ivec3(p,z):u_axis==1?ivec3(p.x,z,p.y):ivec3(z,p);return texelFetch(u_state,atlas(a),0).r;}
void main(){vec2 q=v_uv*float(u_n);ivec2 base=ivec2(floor(q));vec2 f=fract(q);int z=min(u_n-1,int(u_slice*float(u_n)));float v=0.0;
for(int j=0;j<4;j++)for(int i=0;i<4;i++)v+=crW(float(i-1)-f.x)*crW(float(j-1)-f.y)*sampleSlice(base+ivec2(i-1,j-1),z);
float a=v*u_exposure;outColor=vec4(ramp(0.5+0.49*a/sqrt(1.0+a*a)),1);}
`;
  function layout(n){const tiles=Math.ceil(Math.sqrt(n));return {tiles,w:n*tiles,h:n*Math.ceil(n/tiles)};}
  function timeStep(s){return s.courant/(Math.sqrt(3)*s.speed*s.grid);}
  function sanitize(s){
    const clamp=(v,d,a,b)=>U.clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
    s.grid=[32,48,64,96,128,192,256].includes(Number(s.grid))?Number(s.grid):32;
    s.courant=clamp(s.courant,0.8,0.05,0.95);s.speed=clamp(s.speed,1,0.1,5);
    s.width=clamp(s.width,0.12,0.06,0.25);s.slice=clamp(s.slice,0.5,0,0.999);
    s.exposure=clamp(s.exposure,2,0.1,8);s.warmup=Math.round(clamp(s.warmup,16,0,512));
  }
  function create(host){
    const gl=G.createGL(host.canvas),noop=()=>{};
    function dead(message){host.fault(message);return {aspect:()=>1,regenerate:noop,pause:noop,resume:noop,resize:noop,exportPNG:()=>Promise.reject(Error(message))};}
    if(!gl||!gl.floatExt)return dead('Wave volume needs WebGL2 and float32 color buffers.');
    let evolve,seed,display;
    try{evolve=new G.Pass(gl,STEP_FS);seed=new G.Pass(gl,SEED_FS);display=new G.Pass(gl,DISPLAY_FS);}catch(error){return dead('Wave volume shader failed: '+error.message);}
    let field=null,n=0,shape=null,dt=0,count=0,pending=0,raf=0,fence=null,ramp=null,rampKey='',failed=false,halted=false;
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function uniforms(){return {u_n:{int:n},u_tiles:{int:shape.tiles}};}
    function step(first){evolve.draw(field.write,Object.assign(uniforms(),{u_state:field.read,u_r2:(host.getState().courant**2)/3,u_first:!!first}));field.swap();if(!first)count++;}
    function status(){const bytes=shape.w*shape.h*32;host.setStatus('<span>grid <b>'+n+'³</b> · float32</span><span>textures <b>'+(bytes/1048576).toFixed(1)+' MiB</b></span><span>step <b>'+count+'</b> · t '+(count*dt).toFixed(3)+'</span><span>dt '+dt.toExponential(2)+(halted?' · stopped':pending?' · '+pending+' queued':'')+'</span>');}
    function render(target){const s=host.getState(),key=s.bg+'|'+s.palette.join(',');if(!ramp||key!==rampKey){if(ramp)ramp.dispose();ramp=G.rampTexture(gl,s.palette,s.bg);rampKey=key;}
      display.draw(target||null,Object.assign(uniforms(),{u_state:field.read,u_ramp:ramp,u_slice:s.slice,u_exposure:s.exposure,u_axis:{int:{xy:0,xz:1,yz:2}[s.axis]||0}}));}
    let lastWorkAt=-Infinity;
    function schedule(){
      if(raf||failed||halted||!field||!host.isActive())return;
      const s=host.getState();if(!pending&&(!s.running||host.reducedMotion()))return;
      raf=requestAnimationFrame(now=>{raf=0;
        const budget=host.computeBudget?host.computeBudget():{gpuSteps:1,gpuIntervalMs:0};
        if(!pending&&now-lastWorkAt<budget.gpuIntervalMs){schedule();return;}
        if(fence){const ready=gl.clientWaitSync(fence,0,0);if(ready===gl.TIMEOUT_EXPIRED){schedule();return;}gl.deleteSync(fence);fence=null;if(ready===gl.WAIT_FAILED){failed=true;host.fault('GPU work failed. Select a smaller grid and regenerate.');return;}}
        if(gl.isContextLost()){failed=true;host.fault('GPU context lost. Reload and select a smaller grid.');return;}
        const batch=pending?1:budget.gpuSteps;for(let i=0;i<batch;i++)step(false);lastWorkAt=now;if(pending)pending--;render();status();fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();schedule();
      });
    }
    return {
      aspect:()=>1,
      regenerate(){stop();pending=0;failed=false;halted=false;if(fence){gl.deleteSync(fence);fence=null;}const s=host.getState(),next=layout(s.grid),max=gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if(field){field.read.dispose();field.write.dispose();field=null;}
        // Browsers expose texture limits, not free VRAM. Allocation can still fail below this explicit budget.
        if(next.w>max||next.h>max||next.w*next.h*32>576*1048576){host.fault('Selected volume exceeds the texture or 576 MiB field budget. Select a smaller grid.');return;}
        let a=null,b=null;try{a=new G.Target(gl,next.w,next.h,{type:'rgba32f',filter:'nearest'});b=new G.Target(gl,next.w,next.h,{type:'rgba32f',filter:'nearest'});if(gl.getError()!==gl.NO_ERROR)throw Error('GPU allocation failed');}catch(error){if(a)a.dispose();if(b)b.dispose();host.fault(error.message+'. Select a smaller grid.');return;}
        field={read:a,write:b,swap(){const t=this.read;this.read=this.write;this.write=t;}};n=s.grid;shape=next;dt=timeStep(s);count=0;
        const rng=U.makeRng(s.seed+'/volume-wave');seed.draw(field.read,Object.assign(uniforms(),{u_center:[rng.range(0.35,0.65),rng.range(0.35,0.65),rng.range(0.35,0.65)],u_phase:rng.range(-Math.PI,Math.PI),u_width:s.width,u_pattern:{int:{pulse:0,mode:1,crossed:2}[s.pattern]||0}}));
        step(true);pending=s.warmup;render();status();schedule();
      },
      fieldCells(){return field?[n,n]:null;},
      resize(){if(field)render();},repaint(){if(field)render();},pause:stop,resume:schedule,live(){stop();halted=false;if(!host.getState().running)pending=0;schedule();},
      action(key){if(!field)return;if(key==='cancel'){stop();halted=true;pending=0;status();}else if(key==='burst'){halted=false;pending+=128;schedule();}else if(key==='reseed')this.regenerate();},
      async exportPNG(w,h){if(!field)throw Error('No wave volume to export.');if(w>gl.getParameter(gl.MAX_TEXTURE_SIZE)||h>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Print exceeds the GPU texture limit.');
        const target=new G.Target(gl,w,h,{type:'rgba8'}),pixels=new Uint8Array(w*h*4);
        try{render(target);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);target.dispose();}
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),image=ctx.createImageData(w,h);for(let y=0;y<h;y++)image.data.set(pixels.subarray((h-y-1)*w*4,(h-y)*w*4),y*w*4);ctx.putImageData(image,0,0);return U.toBlob(canvas);
      },
    };
  }
  const range=(group,key,label,kind,min,max,step)=>({group,key,label,kind,type:'range',min,max,step,fmt:v=>Number(v).toFixed(step<1?2:0)});
  Studio.register({
    id:'volume-wave',name:'Wave volume',tab:'Wave volume',subtitle:'three-dimensional wave equation · classical',order:96.3,
    equation:'∂²u/∂t² = c²(∂²u/∂x² + ∂²u/∂y² + ∂²u/∂z²)',
    credit:'Classical scalar wave equation. Centered finite differences and the three-dimensional CFL bound follow H. P. Langtangen and S. Linge, Finite Difference Computing with PDEs (2017), wave equation chapter, https://hplgit.github.io/fdm-book/doc/pub/wave/html/._wave-solarized004.html. No novelty or full acoustic model is claimed.',
    blurb:'A wave travels through a periodic cube, including the unseen layers behind this slice. Select XY, XZ or YZ to look inside the same evolving field. A pulse launches waves in every direction; standing and crossed Fourier modes reveal interference. This is a scalar, uniform-speed, lossless wave equation in normalized units, not a full electromagnetic or elastic material model. Every step updates the whole volume. Heavy grids are explicit choices, and a print preserves the current field rather than adding simulated cells.',
    schema:[
      {group:'Field',key:'pattern',label:'Initial field',type:'seg',kind:'geom',options:[['pulse','Pulse'],['mode','Standing mode'],['crossed','Crossed modes']]},
      range('Field','speed','Wave speed','geom',0.1,5,0.1),range('Field','width','Pulse width','geom',0.06,0.25,0.01),
      {group:'Workload',key:'grid',label:'Cells per side',type:'seg',kind:'geom',options:[[32,'32³'],[48,'48³'],[64,'64³'],[96,'96³'],[128,'128³ · heavy'],[192,'192³ · extreme'],[256,'256³ · 512 MiB']]},
      range('Workload','courant','CFL fraction','geom',0.05,0.95,0.01),range('Workload','warmup','Initial steps','geom',0,512,1),
      {group:'Workload',key:'running',label:'Running',type:'toggle',kind:'live'},
      {group:'Workload',key:'burst',label:'Run 128 steps',type:'action'},{group:'Workload',key:'cancel',label:'Stop queued work',type:'action'},
      {group:'Slice',key:'axis',label:'Slice plane',type:'seg',kind:'paint',options:[['xy','XY'],['xz','XZ'],['yz','YZ']]},range('Slice','slice','Slice position','paint',0,0.999,0.001),range('Slice','exposure','Exposure','paint',0.1,8,0.1),
    ],
    defaults:{grid:32,courant:0.8,speed:1,width:0.12,pattern:'crossed',warmup:16,running:false,axis:'xy',slice:0.5,exposure:2,seed:'wave-cube'},
    presets:{
      crossed:{label:'Crossed waves',p:{pattern:'crossed',grid:32,warmup:16,axis:'xy'},palette:Studio.PALETTES.thermal},
      pulse:{label:'Expanding pulse',p:{pattern:'pulse',grid:32,warmup:12,axis:'xy'},palette:Studio.PALETTES.glacier},
      standing:{label:'Standing mode',p:{pattern:'mode',grid:32,warmup:20,axis:'xy'},palette:Studio.PALETTES.ember},
      transverse:{label:'Transverse interference',p:{pattern:'crossed',grid:32,warmup:24,axis:'xz',slice:0.3},palette:Studio.PALETTES.bioluminescent},
      side:{label:'Side view of a mode',p:{pattern:'mode',grid:32,warmup:8,axis:'yz',slice:0.7},palette:Studio.PALETTES.harbor}
    },
    hints:{Field:'The starting time derivative is zero. Opposite cube faces connect. Standing mode numbers are (2, 3, 1). Crossed adds 0.6 times (5, -2, 3).',Workload:'Each frame advances at most one full-volume step and waits for prior GPU work. 256³ has 16.8 million cells and two 256 MiB textures, plus driver overhead. Free GPU memory cannot be queried reliably. Stop queued work cancels future steps, but cannot cancel a GPU command already submitted. The CFL ceiling is enforced, not user-overridable.',Slice:'The plate is one cell-aligned slice with bicubic display interpolation. Its resolution is the selected grid. Colors and exposure are illustrative, not calibrated intensity.'},
    closedGroups:['Workload'],palette:true,defaultPalette:'thermal',familiarity:'occasional',sanitize,create,
    surprise(rng){return {pattern:rng.pick(['pulse','mode','crossed']),axis:rng.pick(['xy','xz','yz']),slice:rng.range(0.15,0.85)};},
  });
})();
