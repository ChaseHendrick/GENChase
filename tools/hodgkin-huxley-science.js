// Actual maintained HH solver versus analytic limits and a separately expressed adaptive DOPRI5 reference.
// Node only. node tools/hodgkin-huxley-science.js > validation/results/hodgkin-huxley-science.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/hodgkin-huxley.js'),'utf8'),shared=fs.readFileSync(path.join(root,'src/shared/studio.js'),'utf8');
const rngSource=shared.slice(shared.indexOf('  function makeRng('),shared.indexOf('  function makeNoise('));
const makeRng=new Function('const TAU=2*Math.PI;'+rngSource+'return makeRng;')();
function load(text){const hooks={},marker='  Studio.register({';assert.equal(text.split(marker).length,2);let mod;const Studio={util:{makeRng,clamp:(x,a,b)=>Math.max(a,Math.min(x,b))},gl:{GLSL:{bicubic:'',ramp:''}},PALETTES:new Proxy({},{get:()=>({})}),register(m){mod=m;}};new Function('Studio','hooks',text.replace(marker,'  Object.assign(hooks,{P,exprel,rates,rhs,rk4,makeSim});\n'+marker))(Studio,hooks);return {...hooks,mod};}
const A=load(source),config=p=>({...A.mod.defaults,...p}),started=performance.now();
// Independent formulas use depolarization relative to the -65mV resting convention.
const trap=z=>Math.abs(z)<1e-7?1-z/2+z*z/12:z/(Math.exp(z)-1);
function referenceRates(V){const u=V+65;return [trap((25-u)/10),4*Math.exp(-u/18),.07*Math.exp(-u/20),1/(1+Math.exp((30-u)/10)),.1*trap((10-u)/10),.125*Math.exp(-u/80)];}
function referenceRhs(y,I){const [V,m,h,n]=y,r=referenceRates(V);return [I-120*m*m*m*h*(V-50)-36*n*n*n*n*(V+77)-.3*(V+54.387),r[0]-(r[0]+r[1])*m,r[2]-(r[2]+r[3])*h,r[4]-(r[4]+r[5])*n];}
const maxError=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const rateRows=[];
for(const V of [-100,-65,-55,-40,0,40]){const actual=Array.from(A.rates(V,new Float64Array(6))),expected=referenceRates(V),error=maxError(actual,expected);assert(error<2e-13);rateRows.push({voltageMv:V,actual,maximumError:error});}
assert.equal(A.rates(-40,new Float64Array(6))[0],1);assert.equal(A.rates(-55,new Float64Array(6))[4],.1);
for(const offset of [-1e-12,1e-12]){assert(Math.abs(A.rates(-40+offset,new Float64Array(6))[0]-1)<1e-12);assert(Math.abs(A.rates(-55+offset,new Float64Array(6))[4]-.1)<1e-12);}
const yCheck=[-20,.35,.6,.4],derivative=new Float64Array(22);A.rhs(...yCheck,8,derivative);assert(maxError(Array.from(derivative.slice(0,4)),referenceRhs(yCheck,8))<1e-12);

const gateClamps=[];
for(const V of [-65,-55,-40,20]){
  const y=new Float64Array([V,.12,.24,.36]),next=new Float64Array(4),work=new Float64Array(22),dt=.005,r=referenceRates(V);let error=0;
  for(let i=1;i<=400;i++){A.rk4(y,0,0,dt,next,work,{...A.P,gNa:0,gK:0,gL:0});y.set(next);for(let k=0;k<3;k++){const a=r[2*k],b=r[2*k+1],inf=a/(a+b),exact=inf+([.12,.24,.36][k]-inf)*Math.exp(-(a+b)*i*dt);error=Math.max(error,Math.abs(y[k+1]-exact));}}
  assert(error<2e-8);assert.equal(y[0],V);gateClamps.push({voltageMv:V,timeMs:2,dtMs:dt,maximumGateError:error});
}
const leak=new Float64Array([-75,.05,.6,.32]),leakNext=new Float64Array(4),leakWork=new Float64Array(22),leakI=1.5;
let leakError=0;const equilibrium=A.P.EL+leakI/A.P.gL;
for(let i=1;i<=2000;i++){A.rk4(leak,0,leakI,.01,leakNext,leakWork,{...A.P,gNa:0,gK:0});leak.set(leakNext);const exact=equilibrium+(-75-equilibrium)*Math.exp(-.3*i*.01);leakError=Math.max(leakError,Math.abs(leak[0]-exact));}
assert(leakError<1e-9);

// Dormand-Prince 5(4), independent stage implementation/RHS, no dependency on maintained RK4.
const C=[0,1/5,3/10,4/5,8/9,1,1];
const B=[[],[1/5],[3/40,9/40],[44/45,-56/15,32/9],[19372/6561,-25360/2187,64448/6561,-212/729],[9017/3168,-355/33,46732/5247,49/176,-5103/18656],[35/384,0,500/1113,125/192,-2187/6784,11/84]];
const W5=[35/384,0,500/1113,125/192,-2187/6784,11/84,0],W4=[5179/57600,0,7571/16695,393/640,-92097/339200,187/2100,1/40];
function reference(tolerance){const r=referenceRates(-65);let y=[-65,r[0]/(r[0]+r[1]),r[2]/(r[2]+r[3]),r[4]/(r[4]+r[5])],t=0,h=.01,accepted=0,rejected=0;const samples=[y.slice()];
  for(let sample=1;sample<=300;sample++){const target=sample/10;
    while(t<target-1e-12){h=Math.min(h,target-t);const current=t>=5-1e-12&&t<25-1e-12?10:0,k=[];
      for(let stage=0;stage<7;stage++){const state=y.map((v,j)=>v+h*B[stage].reduce((sum,b,i)=>sum+b*k[i][j],0));k.push(referenceRhs(state,current));}
      const high=y.map((v,j)=>v+h*W5.reduce((sum,b,i)=>sum+b*k[i][j],0)),low=y.map((v,j)=>v+h*W4.reduce((sum,b,i)=>sum+b*k[i][j],0));
      const norm=Math.max(...high.map((v,j)=>Math.abs(v-low[j])/(tolerance*(1+Math.max(Math.abs(v),Math.abs(y[j]))))));
      if(norm<=1){y=high;t+=h;accepted++;}else rejected++;
      h*=Math.max(.2,Math.min(4,.9*Math.max(norm,1e-16)**(-.2)));assert(h>1e-12&&accepted+rejected<1000000);
    } samples.push(y.slice());
  }return {samples,accepted,rejected,tolerance};}
const ref=reference(1e-11),refFine=reference(2e-12),referenceDifference=Math.max(...ref.samples.map((row,i)=>maxError(row,refFine.samples[i])));assert(referenceDifference<2e-7);
function trajectory(dt,solver=A){const sim=solver.makeSim(config({n:1,current:10,spread:0,jitter:0,start:5,pulse:20,duration:30,dt})),samples=[Array.from(sim.state)];const stride=Math.round(.1/dt);for(let i=0;i<300;i++){sim.advance(stride);assert.equal(sim.halted,'');samples.push(Array.from(sim.state));}return {sim,samples};}
const refinement=[];
for(const dt of [.02,.01,.005]){const run=trajectory(dt);let voltage=0,gates=0,squared=0;
  run.samples.forEach((row,i)=>row.forEach((v,j)=>{const error=Math.abs(v-refFine.samples[i][j]);if(j===0)voltage=Math.max(voltage,error);else gates=Math.max(gates,error);squared+=(error/(j===0?100:1))**2;}));
  refinement.push({dtMs:dt,timeMs:run.sim.time,maxVoltageErrorMv:voltage,maxGateError:gates,normalizedRmsError:Math.sqrt(squared/(4*run.samples.length)),spikes:run.sim.events[0],minimumVoltageMv:run.sim.minV,maximumVoltageMv:run.sim.maxV});
  assert(run.sim.events[0].length===2);assert(run.sim.maxV>35&&run.sim.maxV<45);assert(voltage<.005&&gates<.0001);
}
for(let i=1;i<refinement.length;i++){const ratio=refinement[i-1].normalizedRmsError/refinement[i].normalizedRmsError;refinement[i].errorReduction=ratio;assert(ratio>10&&ratio<22);}
const quiet=A.makeSim(config({n:1,current:0,spread:0,jitter:0,duration:40,start:5,pulse:20}));quiet.advance(quiet.totalSteps);assert.equal(quiet.halted,'');assert.equal(quiet.totalSpikes,0);assert(Math.abs(quiet.state[0]+65)<.01);
const presets=[];
for(const [name,preset]of [['default',{p:{}}],...Object.entries(A.mod.presets)]){const settings=config(preset.p),sim=A.makeSim(settings);sim.advance(sim.totalSteps);assert.equal(sim.halted,'');assert.equal(sim.step,sim.totalSteps);assert.equal(sim.samples,sim.columns);assert(sim.state.every(Number.isFinite)&&sim.history.every(Number.isFinite));presets.push({name,neurons:sim.n,steps:sim.step,timeMs:sim.time,spikes:sim.totalSpikes,minVoltageMv:sim.minV,maxVoltageMv:sim.maxV,minStepCurrent:sim.currents[0],maxStepCurrent:sim.currents.at(-1)});}
const heavyStart=performance.now(),heavy=A.makeSim(config({n:256,duration:240,dt:.0025,start:0}));heavy.advance(100);assert.equal(heavy.halted,'');const highLoad={neurons:heavy.n,columns:heavy.columns,dtMs:heavy.dt,steps:heavy.step,timeMs:heavy.time,elapsedMs:performance.now()-heavyStart,historyBytes:heavy.history.byteLength};
// Wrong channel exponent, missing removable singularity and invalid-trial controls.
const wrong=load(source.replace('p.gNa * m ** 3','p.gNa * m ** 2')),wrongDerivative=new Float64Array(22);wrong.rhs(...yCheck,8,wrongDerivative);const wrongError=maxError(Array.from(wrongDerivative.slice(0,4)),referenceRhs(yCheck,8));assert(wrongError>1);
const singular=load(source.replace('Math.abs(x) < 1e-5 ? 1 + x / 2 + x * x / 12 - x ** 4 / 720 : -x / Math.expm1(-x)','-x / Math.expm1(-x)'));assert(!Number.isFinite(singular.rates(-40,new Float64Array(6))[0]));
const guard=A.makeSim(config({n:1,current:1000,spread:0,jitter:0,start:0,pulse:1,duration:10,dt:1})),before={state:guard.state.slice(),history:guard.history.slice(),step:guard.step,time:guard.time,events:JSON.stringify(guard.events),counts:guard.spikeCounts.slice()};guard.advance(1);assert(guard.halted);assert.deepEqual(guard.state,before.state);assert.deepEqual(guard.history,before.history);assert.equal(guard.step,before.step);assert.equal(guard.time,before.time);assert.equal(JSON.stringify(guard.events),before.events);assert.deepEqual(guard.spikeCounts,before.counts);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
console.log(JSON.stringify({sourceSha256:hash(source),rngSha256:hash(rngSource),harnessSha256:hash(fs.readFileSync(__filename)),command:'node tools/hodgkin-huxley-science.js > validation/results/hodgkin-huxley-science.json',scope:'Classical squid HH at 6.3 C: exact rates/singular limits, analytic voltage-clamp gates and passive leak, independent adaptive DOPRI5 driven trajectory, fixed-time RK4 convergence, all preset recordings, short largest-count fixture.',rateRows,gateClamps,passiveLeak:{timeMs:20,currentDensity:leakI,equilibriumMv:equilibrium,maximumVoltageErrorMv:leakError},reference:{method:'Independently expressed modern-voltage RHS and Dormand-Prince 5(4)',tolerances:[ref.tolerance,refFine.tolerance],acceptedSteps:[ref.accepted,refFine.accepted],rejectedSteps:[ref.rejected,refFine.rejected],maxDifferenceBetweenReferences:referenceDifference},refinement,zeroCurrent:{timeMs:quiet.time,spikes:quiet.totalSpikes,finalVoltageMv:quiet.state[0]},presets,highLoad,failureControls:{wrongSodiumExponentDerivativeError:wrongError,missingSingularLimitRejected:true,invalidTrialReason:guard.halted,lastAcceptedPhysicalStateRestored:true},seconds:(performance.now()-started)/1000,limitations:'Independent ODE agreement is not experimental validation. No human, network, stochastic channel, propagation or arbitrary parameter claim. Original parameter convention differs from later cortical HH variants. No general global stability proof; high-count case covers 100 steps only.'},null,2));
