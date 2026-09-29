/* Analytic marginal flow, not a trained neural model. Original implementation. */
(function () {
  'use strict';
  // X_t=(1-t) epsilon+t Z, epsilon~N(0,I), Z~sum_k N(mu_k,sigma^2 I)/K.
  // Integrating out both Z and the component label gives this nonsingular field,
  // including t=1. It is the marginalization construction of Holderrieth & Erives.
  function variance(t, sigma) { return (1-t)*(1-t)+t*t*sigma*sigma; }
  function velocity(x, y, t, model) {
    const v=variance(t,model.sigma), a=(t*model.sigma*model.sigma-(1-t))/v;
    let maximum=-Infinity;
    for(const m of model.means) maximum=Math.max(maximum,-((x-t*m[0])**2+(y-t*m[1])**2)/(2*v));
    let total=0,mx=0,my=0;
    for(const m of model.means){const w=Math.exp(-((x-t*m[0])**2+(y-t*m[1])**2)/(2*v)-maximum);total+=w;mx+=w*m[0];my+=w*m[1];}
    return [a*x+(1-a*t)*mx/total,a*y+(1-a*t)*my/total];
  }
  function density(x,y,t,model){
    const v=variance(t,model.sigma);let sum=0;
    for(const m of model.means)sum+=Math.exp(-((x-t*m[0])**2+(y-t*m[1])**2)/(2*v));
    return sum/(model.means.length*2*Math.PI*v);
  }
  function trajectory(x,y,model,steps){
    const points=new Float64Array(2*(steps+1)),dt=1/steps;points[0]=x;points[1]=y;
    for(let j=0;j<steps;j++){
      const t=j*dt,k1=velocity(x,y,t,model),k2=velocity(x+dt*k1[0]/2,y+dt*k1[1]/2,t+dt/2,model);
      const k3=velocity(x+dt*k2[0]/2,y+dt*k2[1]/2,t+dt/2,model),k4=velocity(x+dt*k3[0],y+dt*k3[1],t+dt,model);
      x+=dt*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6;y+=dt*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;
      points[2*j+2]=x;points[2*j+3]=y;
    }
    return points;
  }
  function normalPair(rng){const r=Math.sqrt(-2*Math.log(Math.max(1e-15,rng()))),a=2*Math.PI*rng();return [r*Math.cos(a),r*Math.sin(a)];}
  function modelFor(s){
    const means=[];
    for(let k=0;k<s.modes;k++){
      const a=2*Math.PI*k/s.modes+s.turn*Math.PI/180;
      if(s.layout==='line')means.push([s.radius*(2*k/(s.modes-1)-1),0]);
      else{const r=s.radius*(s.layout==='spiral'?(.25+.75*k/(s.modes-1)):1);means.push([r*Math.cos(a),r*Math.sin(a)]);}
    }
    return {means,sigma:s.sigma};
  }
  const core={variance,velocity,density,trajectory,normalPair,modelFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=core;
  if(typeof Studio==='undefined')return;
  const U=Studio.util,P=Studio.PALETTES;
  const range=(group,key,label,kind,min,max,step,fmt=String)=>({group,key,label,kind,min,max,step,fmt,type:'range'});
  Studio.register({
    id:'flow-matching',name:'Flow matching',tab:'Generative flow',order:125,familiarity:'occasional',
    subtitle:'analytic Gaussian-mixture transport · MIT 2026',
    equation:'X_t=(1−t)ε+tZ; v_t(x)=Σ_k r_k(x,t)[μ_k+(s′_t/s_t)(x−tμ_k)], s_t²=(1−t)²+t²σ²',
    credit:'Peter Holderrieth and Ezra Erives, An Introduction to Flow Matching and Diffusion Models, MIT 6.S184 (2026), Section 3, marginalization Eq. (18) and Gaussian conditional paths Eq. (20); arXiv:2506.02070. This plate analytically integrates the Gaussian-mixture target distribution in that construction and samples its marginal ODE with RK4. It does not train a neural network.',
    blurb:'A cloud of Gaussian noise separates into a chosen collection of Gaussian islands. Every colored thread follows the same time-dependent probability-flow field, rather than being assigned a destination in advance. This is an exactly specified transport target of the kind learned by flow-matching generative models. Here the target is a small, known Gaussian mixture, so its velocity can be calculated analytically. The trajectories are numerical RK4 approximations. No neural training, learned image generator or large-model benchmark is claimed.',
    schema:[
      {group:'Target',key:'layout',label:'Mixture layout',type:'seg',kind:'geom',options:[['ring','Ring'],['spiral','Spiral'],['line','Line']]},
      range('Target','modes','Gaussian islands','geom',2,12,1),
      range('Target','radius','Spread','geom',.5,3,.1,v=>v.toFixed(1)),
      range('Target','sigma','Island width σ','geom',.12,.8,.02,v=>v.toFixed(2)),
      range('Target','turn','Rotation','geom',0,360,5,v=>v+'°'),
      range('Sampling','count','Particles','geom',100,1200,100),
      range('Sampling','steps','RK4 steps','geom',32,256,16),
      range('Picture','time','Transport time','paint',0,1,.01,v=>v.toFixed(2)),
      range('Picture','trail','Trail duration','paint',0,1,.05,v=>v.toFixed(2)),
      range('Picture','extent','View half-width','paint',2,6,.1,v=>v.toFixed(1)),
      range('Picture','weight','Line weight','paint',.3,2.4,.1,v=>v.toFixed(1)),
      {group:'Picture',key:'points',label:'Show particles',kind:'paint',type:'toggle'},
    ],
    defaults:{layout:'ring',modes:5,radius:2.2,sigma:.24,turn:15,count:600,steps:128,time:1,trail:1,extent:3.8,weight:.7,points:true,seed:'probability-flow'},
    presets:{
      islands:{label:'Five islands',p:{layout:'ring',modes:5,radius:2.2,sigma:.24,time:1,trail:1},palette:P.ember},
      braid:{label:'Spiral target',p:{layout:'spiral',modes:9,radius:2.8,sigma:.2,time:1,trail:1},palette:P.glacier},
      split:{label:'Two destinations',p:{layout:'line',modes:2,radius:2.4,sigma:.3,time:1,trail:1},palette:P.graphite},
      midway:{label:'Halfway',p:{layout:'ring',modes:8,radius:2.5,sigma:.2,time:.5,trail:.5},palette:P.nightshade},
      cloud:{label:'Generated samples',p:{layout:'spiral',modes:7,radius:2.6,sigma:.38,time:1,trail:0,points:true},palette:P.meadow},
    },
    hints:{Target:'Equal-weight isotropic Gaussian components. The target is known analytically; this is a demonstration of the transport field, not a trained model.',Sampling:'RK4 integrates from t=0 to t=1. More steps refine these same trajectories. Samples are independent seeded standard-normal starting points.',Picture:'Time changes which part of the computed paths is shown. Cropping changes the view only. The full finite sample stays in the data export.'},
    palette:true,defaultPalette:'ember',paletteLabel:'Paths',headline:'modes',headlineLabel:'islands',
    surprise(rng){return {layout:rng.pick(['ring','spiral','line']),modes:rng.int(3,10),radius:rng.range(1.4,2.8),sigma:rng.range(.18,.55),turn:rng.int(0,72)*5,time:1,trail:rng.pick([.5,1]),points:true};},
    create(host){
      const canvas=host.canvas,ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});let paths=[],model=null,timer=0,token=0,resolveBuild=null,ready=Promise.resolve(),finished=false;
      function status(){const s=host.getState();host.setStatus('<span>analytic velocity · no neural training</span><span>'+paths.length+' particles · '+s.steps+' RK4 steps</span><span>t '+s.time.toFixed(2)+' · '+(finished?'complete':'computing')+'</span>');}
      function marks(w,h,line,point){
        if(!finished)return;
        const s=host.getState(),scale=Math.min(w,h)/(2*s.extent),lut=U.makeRampLUT(s.palette,null,256),last=s.time*s.steps,first=Math.max(0,last-s.trail*s.steps);
        const at=(p,t)=>{const j=Math.floor(t),f=t-j,k=Math.min(s.steps,j+1);return [U.lerp(p[2*j],p[2*k],f)*scale+w/2,h/2-U.lerp(p[2*j+1],p[2*k+1],f)*scale];};
        for(let i=0;i<paths.length;i++){
          const p=paths[i],end=at(p,last),angle=Math.atan2(p[p.length-1],p[p.length-2]),ci=Math.floor((angle/(2*Math.PI)+1)%1*255)*3,col='rgb('+lut[ci]+','+lut[ci+1]+','+lut[ci+2]+')';
          if(last>first){const pts=[at(p,first)];for(let j=Math.floor(first)+1;j<last;j++)pts.push(at(p,j));pts.push(end);line(pts,col,Math.max(.3,s.weight*Math.min(w,h)/900));}
          if(s.points)point(end,col,Math.max(.75,1.6*Math.min(w,h)/900));
        }
      }
      function paint(ctx,w,h){const s=host.getState();ctx.fillStyle=s.bg;ctx.fillRect(0,0,w,h);ctx.lineJoin=ctx.lineCap='round';
        marks(w,h,(pts,col,lw)=>{ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.globalAlpha=.6;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.globalAlpha=1;},(p,col,r)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(...p,r,0,2*Math.PI);ctx.fill();});}
      function draw(){paint(ctx,canvas.width,canvas.height);status();}
      function regenerate(){
        clearTimeout(timer);if(resolveBuild)resolveBuild();const generation=++token,s={...host.getState()};paths=[];finished=false;model=modelFor(s);const rng=U.makeRng(s.seed+'/flow');
        ready=new Promise(resolve=>{resolveBuild=resolve;});draw();
        function chunk(){if(generation!==token)return;const end=performance.now()+10;
          do{const z=normalPair(rng);paths.push(trajectory(z[0],z[1],model,s.steps));}while(paths.length<s.count&&performance.now()<end);
          if(paths.length<s.count){status();timer=setTimeout(chunk,0);}else{finished=true;timer=0;draw();resolveBuild();resolveBuild=null;}}
        timer=setTimeout(chunk,0);
      }
      return {aspect:()=>1,regenerate,repaint:draw,resize:draw,pause(){},resume:draw,
        async exportPNG(w,h){await ready;if(!finished)throw Error('Flow is still computing');const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d',{alpha:false,willReadFrequently:true}),w,h);return U.toBlob(c);},
        async exportSVG(w,h){await ready;if(!finished)throw Error('Flow is still computing');let body='';
          marks(w,h,(pts,col,lw)=>{body+='<path d="'+pts.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(3)).join(' ')).join('')+'" fill="none" stroke="'+col+'" stroke-width="'+lw+'" stroke-opacity="0.6" stroke-linecap="round" stroke-linejoin="round"/>';},(p,col,r)=>{body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="'+col+'"/>';});return U.svgBlob(w,h,host.getState().bg,body);},
        async exportData(){await ready;if(!finished)throw Error('Flow is still computing');const s=host.getState(),values=new Float64Array(paths.length*(s.steps+1)*2);paths.forEach((p,i)=>values.set(p,i*p.length));return {arrays:{trajectories:{data:values,shape:[paths.length,s.steps+1,2],units:'dimensionless',description:'Particle, time j/steps, x/y. Full paths, including any cropped points.'},means:{data:new Float64Array(model.means.flat()),shape:[model.means.length,2],units:'dimensionless'}},meta:{method:'RK4 analytic Gaussian-mixture marginal velocity; no neural training',sigma:model.sigma,steps:s.steps,time:s.time,seed:s.seed,precision:'Float64',equalMixtureWeights:true}};}
      };
    }
  });
})();
