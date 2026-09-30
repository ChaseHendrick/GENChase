// Fixed-work standard-map initialization, independently transcribed orbit/bin oracle.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/swarm.js'),'utf8'),engine=fs.readFileSync(path.join(root,'src/shared/engine.js'),'utf8');
const rngSource=engine.slice(engine.indexOf('  function makeRng('),engine.indexOf('  function makeNoise('));
const makeRng=vm.runInNewContext('(function(){const TAU=2*Math.PI;'+rngSource+';return makeRng;})()');
const marker='      function tone(s, rgba, W, H) {';
const hook="      globalThis.chirikovProbe = () => ({dens,lyap,orbitC,walkers,count,hits,BW,BH});\n";
function subject(recipe,mutate=s=>s){
 const c={Studio:{util:{TAU:2*Math.PI,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),makeRng},PALETTES:{},register:m=>{if(m.id==='chirikov')c.mod=m;}},cancelAnimationFrame(){},requestAnimationFrame(){throw Error('Paused recipe scheduled animation');},performance:{now(){throw Error('Fixed initialization read the wall clock');}}};
 const code=mutate(source).replace(marker,hook+marker).replace('        if (!dens) return;','        return; // Numerical harness omits drawing.');
 vm.runInNewContext(code,c);const s={...c.mod.defaults,...recipe,running:false};c.mod.sanitize(s);
 let status='';const inst=c.mod.create({canvas:{getContext:()=>({})},getState:()=>s,reducedMotion:()=>false,setStatus:x=>{status=x;}});inst.regenerate();
 return {s,state:c.chirikovProbe(),status};
}
function oracle(s){
 const T=2*Math.PI,ar={'1:1':1,'4:5':1.25,'5:4':.8}[s.aspect],W=ar>=1?Math.round(720/ar):720,H=ar>=1?720:Math.round(720*ar),rng=makeRng(s.seed+'/map');
 const walkers=Array.from({length:s.orbits},()=>({th:rng()*T,p:rng()*T,ux:1,uy:0,lam:0,n:0,hue:rng()}));
 const dens=new Float32Array(W*H),lyap=new Float32Array(W*H),orbitC=new Float32Array(W*H);
 for(let base=0;base<s.iters;base+=24)for(const w of walkers)for(let k=0;k<Math.min(24,s.iters-base);k++){
  const theta=w.th, momentum=w.p+s.K*Math.sin(theta), a=s.K*Math.cos(theta);
  const vector=[(1+a)*w.ux+w.uy,a*w.ux+w.uy],norm=Math.hypot(...vector)||1;
  w.th=((theta+momentum)%T+T)%T;w.p=(momentum%T+T)%T;w.ux=vector[0]/norm;w.uy=vector[1]/norm;w.lam+=Math.log(norm);w.n++;
  if(w.n>s.burn){const x=Math.min(W-1,Math.floor(w.th/T*W)),y=Math.min(H-1,Math.floor(w.p/T*H)),i=y*W+x;dens[i]++;lyap[i]+=w.lam/w.n;orbitC[i]+=w.hue;}
 }
 return {walkers,dens,lyap,orbitC};
}
const digest=a=>crypto.createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
// Integrable K=0 also has a closed-form oracle, independent of the loop transcription.
const integrable=subject({K:0,orbits:400,iters:40,burn:0,seed:'zero-analytic'}),r0=makeRng('zero-analytic/map');
let zeroKickMaxError=0;
for(const w of integrable.state.walkers){
 const theta=r0()*2*Math.PI,p=r0()*2*Math.PI;r0();
 const expected=((theta+40*p)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
 zeroKickMaxError=Math.max(zeroKickMaxError,Math.abs(w.p-p),Math.abs(w.th-expected));
 assert.equal(w.ux,1);assert.equal(w.uy,0);assert.equal(w.lam,0);
}
assert.ok(zeroKickMaxError<1e-11,'K=0 momentum invariant and linear angle');
const rows=[];
for(const recipe of [{K:0,iters:40,burn:0},{K:.5,iters:53,burn:12},{K:1.2,iters:220,burn:12},{K:4,iters:80,burn:80},{K:1.2,iters:80,burn:0,aspect:'4:5'}]){
 const got=subject({orbits:400,seed:'chirikov-fixed-work',...recipe}),expected=oracle(got.s),state=got.state;
 for(const key of ['dens','lyap','orbitC'])assert.equal(digest(state[key]),digest(expected[key]),'independent '+key+' bins');
 assert.deepEqual(JSON.parse(JSON.stringify(state.walkers)),expected.walkers,'independent map/tangent state');
 assert.equal(state.count,got.s.orbits*got.s.iters);assert.equal(state.hits,got.s.orbits*Math.max(0,got.s.iters-got.s.burn));
 assert.match(got.status,new RegExp(state.count.toLocaleString('en-US')));
 assert.equal(state.walkers[0].n,got.s.iters);
 rows.push({parameters:got.s,kicks:state.count,hits:state.hits,densitySha256:digest(state.dens),independentStateMatch:true});
}
const baseline=subject({orbits:400,iters:40,seed:'controls'}),more=subject({orbits:400,iters:41,seed:'controls'}),seed=subject({orbits:400,iters:40,seed:'other'});
assert.notEqual(digest(baseline.state.dens),digest(more.state.dens));assert.notEqual(digest(baseline.state.dens),digest(seed.state.dens));
const wrong=subject({orbits:400,iters:40,seed:'controls'},s=>s.replace('w.p += K * s;','w.p -= K * s;'));
assert.notEqual(digest(wrong.state.dens),digest(oracle(wrong.s).dens),'wrong kick sign must fail');
const malformed=subject({orbits:'bad',iters:40,seed:'fallback'});assert.equal(malformed.s.orbits,2400);
const fractional=subject({orbits:400,iters:40.6,burn:2.6,K:0});assert.equal(fractional.s.iters,41);assert.equal(fractional.s.burn,3);assert.equal(fractional.s.K,0);
const result={passed:true,source:'src/modules/swarm.js',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),command:'node tools/chirikov-replay-check.js --write',scope:'Paused fixed-work initialization only; independent map, tangent and histogram transcription. Not a KAM threshold or asymptotic Lyapunov validation.',rows,zeroKickMaxError,controls:{wallClockForbidden:true,changedSeed:true,changedIterations:true,wrongKickSignRejected:true,integerBudgets:true,zeroKickPreserved:true,invalidOrbitFallback:true}};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/chirikov-replay-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
