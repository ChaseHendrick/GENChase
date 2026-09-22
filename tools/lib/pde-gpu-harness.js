'use strict';
// Test-only runner for the maintained shaders, independent of the studio scheduler.
module.exports=()=>{
    window.runPde=({p,initial,dt,steps,mutant})=>{
      const G=Studio.gl,S=window.pdeAudit,gl=G.createGL(document.createElement('canvas'));if(!gl?.floatExt)throw Error('Float32 required');
      const pair={cahn:['MU_CH','STEP_CH'],ohta:['MU_CH','STEP_OK'],amb:['MU_AMB','STEP_AMB'],swift:['MU_SH','STEP_SH'],ks:['MU_KS','STEP_KS'],pfc:['MU_PFC','STEP_PFC']}[p.id];
      let muSource=S[pair[0]],stepSource=S[pair[1]];
      if(mutant==='mixed-pfc')muSource=S.MU_SH;
      if(mutant==='sign')stepSource=stepSource.replace(p.id==='pfc'?'psi += u_dt':p.id==='cahn'||p.id==='ohta'||p.id==='amb'?'c += u_dt':'u += u_dt',p.id==='pfc'?'psi -= u_dt':p.id==='cahn'||p.id==='ohta'||p.id==='amb'?'c -= u_dt':'u -= u_dt');
      if(mutant==='clip-ks')stepSource=stepSource.replace('vec4(u, max(texture(u_c, v_uv).g, crossed(u, 10000.0)), 0.0, 1.0)','vec4(clamp(u,-8.0,8.0),0.0,0.0,1.0)');
      const opts={type:'rgba32f',filter:'nearest',wrap:p.bc==='noflux'?'clamp':'repeat'},data=new Float32Array(initial.length*4);
      initial.forEach((v,i)=>{data[4*i]=v;data[4*i+3]=1;});
      let a=new G.Target(gl,p.W,p.H,{...opts,data}),b=new G.Target(gl,p.W,p.H,opts),mu=new G.Target(gl,p.W,p.H,opts),mid=new G.Target(gl,p.W,p.H,opts);
      const passMu=new G.Pass(gl,muSource),passStep=new G.Pass(gl,stepSource),passMid=p.id==='pfc'?new G.Pass(gl,S.MID_PFC):null;
      for(let i=0;i<steps;i++){
        passMu.draw(mu,{u_c:a,u_res:[p.W,p.H],u_eps2:p.eps*p.eps,u_lambda:p.lambda});
        if(passMid)passMid.draw(mid,{u_c:a,u_v:mu,u_res:[p.W,p.H],u_r:p.r,u_k0:p.k0});
        passStep.draw(b,{u_c:a,u_mu:passMid?mid:mu,u_res:[p.W,p.H],u_dt:dt,u_M:p.M,u_sigma:p.sigma,u_m:mutant==='wrong-mean'?0:p.mean,u_deg:p.deg?1:0,u_zeta:p.zeta,u_r:p.r,u_k0:p.k0,u_g:p.g,u_cub:p.cub,u_nu:p.nu,u_alpha:p.alpha,u_noise:0,u_step:i,u_nOff:0});[a,b]=[b,a];
      }
      const pixels=new Float32Array(data.length);gl.bindFramebuffer(gl.FRAMEBUFFER,a.fbo);gl.readPixels(0,0,p.W,p.H,gl.RGBA,gl.FLOAT,pixels);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback failed');
      const out=Array.from({length:initial.length},(_,i)=>pixels[4*i]),flagged=Array.from({length:initial.length},(_,i)=>pixels[4*i+1]).some(v=>v>0);
      for(const t of[a,b,mu,mid])t.dispose();for(const pass of[passMu,passStep,passMid])if(pass)gl.deleteProgram(pass.prog);gl.getExtension('WEBGL_lose_context')?.loseContext();
      return {out,flagged};
    };
};
