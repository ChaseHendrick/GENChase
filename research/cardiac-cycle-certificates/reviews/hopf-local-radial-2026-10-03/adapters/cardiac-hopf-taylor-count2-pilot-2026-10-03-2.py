"""Fresh local other16 exclusion from a Taylor/Cauchy analytic branch enclosure."""
import ast, hashlib, inspect, json, sys, time
from fractions import Fraction
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
import hopf_stability_local as lc
import branch_stability as bs
from flint import arb, acb, acb_mat

SOURCE_PINS={'hopf_stability_local.py':'486bada9b514e9ac91b1abfa33a61af1db60dd2be46b338c6f5c3dc5d6a5602b',
 'LEMMAS-hopf-stability-local.md':'c3eb4277b09460ff474b4bd3566ab72e6272ac0429880007cddea24589ae3283',
 'test_hopf_stability_local.py':'a5acb3d6b8d477b8a0f710b0d6bf75106d29e8d1bd6512cc00e7a9b41d7460ab',
 'branch_stability.py':'b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463'}
E0=Fraction(1,51200000)

def assert_pins():
    lc.assert_sources_current()
    for name,digest in bs.SOURCES_SHA256.items():
        if lc.sha(lc.ROOT/name)!=digest:raise RuntimeError('Hill source drift: '+name)
    for name,digest in SOURCE_PINS.items():
        if lc.sha(lc.HERE/name)!=digest:raise RuntimeError('source drift: '+name)

def core_adapter():
    assert_pins();tree=ast.parse(inspect.getsource(bs._certify_uniform));hits=[]
    class Count(ast.NodeTransformer):
        def visit_Compare(self,node):
            if (isinstance(node.left,ast.Name) and node.left.id=='count' and len(node.ops)==1
             and isinstance(node.ops[0],ast.NotEq) and len(node.comparators)==1
             and isinstance(node.comparators[0],ast.Constant) and node.comparators[0].value==1):
                node.comparators[0]=ast.Constant(2);hits.append(1)
            return self.generic_visit(node)
    tree=Count().visit(tree);ast.fix_missing_locations(tree)
    if len(hits)!=1:raise RuntimeError('count guard AST changed')
    ns=dict(vars(bs));exec(compile(tree,'<Taylor other16 rank2 adapter>','exec'),ns)
    return ns['_certify_uniform']

def coefficients(C,cov,obj,radius=E0):
    hq=radius if type(radius) is Fraction else lc.rational(radius)
    if hq!=E0:raise ValueError('only exact declared local interval')
    hp=lc.hp;D=hp.DIM;h=hp._arb_q(hq)
    F=lc.shrunk_quotient_coefficients(C,cov,obj,radius=str(hq))
    A,_,_=lc.accepted_inputs();ga,gb=map(Fraction,A['gH_interval'])
    fam=hp.jacobian_family(ga,gb,hp.FloatHopf(),192);sp=hp.spectrum_on(fam,192)
    g0=hp._ball_interval(ga,gb).real;x0=[z.real for z in fam['eq_G']['X']]
    q=sp['v'];q0=[z/(2*q[hp.IV]) for z in q];q0[hp.IV]=acb(hp._arb_q('1/2'))
    prm=hp.am.params(192);prm['g_Ks']=acb(g0)
    hh=hp.hess19([acb(x) for x in x0],prm,192);off=D+D*D
    H=[[hh[off+hp.NH*k+p] for p in range(hp.NH)] for k in range(D)]
    Jone={m:acb_mat([[sum((H[k][hp.HPI[(min(j,l),max(j,l))]]*(q0[l] if m==1 else q0[l].conjugate())
         for l in range(D)),acb(0)) for j in range(D)] for k in range(D)]) for m in (-1,1)}
    J0={n:[[fam['A'][k,j] if n==0 else acb(0) for j in range(D)] for k in range(D)] for n in range(-64,65)}
    J1c={};rad1={}
    for n in range(-64,65):
        exact=Jone[n] if n in (-1,1) else acb_mat(D,D)
        J1c[n]=[[acb(exact[k,j].real.mid(),exact[k,j].imag.mid()) for j in range(D)] for k in range(D)]
        rad1[n]=[[hp.up((exact[k,j]-J1c[n][k][j]).abs_upper()+F['eps'][k][j]*(-F['rho0']*abs(n)).exp()/h)
                   for j in range(D)] for k in range(D)]
    rho=hp._arb_q('5/8')
    U=dict(K=F['C'].K,Kp=64,A=F['C'].w,h=h,om_bar=F['C'].om,om1=arb(0),rho_om=F['omega_error'],
      rho=rho,rho0=F['rho0'],rho2=cov.rho2,J0=J0,J1c=J1c,rad1=rad1,
      SJ0=[[fam['A'][k,j].abs_upper() for j in range(D)] for k in range(D)],
      SJ1=[[hp.up(sum((Jone[n][k,j].abs_upper()*rho.exp() for n in (-1,1)),arb(0))) for j in range(D)] for k in range(D)],
      epsW=F['eps'])
    return U,F['shrink']

def main():
    start=time.monotonic();core=core_adapter();own=lc.sha(__file__)
    out=dict(kind='Taylor_local_other16_exclusion_pilot',schema=1,model_stability_certified=False,
      expected_critical_rank=2,scope='other16 only, epsilon in [-1/51200000,1/51200000]; no radial sign or attraction promotion',
      adapter_sha256=own,source_pins=SOURCE_PINS,scientific_sources=lc.SOURCES_SHA256,hill_sources=bs.SOURCES_SHA256,
      e_lo=str(-E0),e_hi=str(E0),delta='3e-5')
    try:
        branch,C,cov,obj,rec=lc.complex_branch_pilot('1/500',print,_objects=True)
        out['complex_branch']=branch
        with lc.hp.am.precision(192):
            U,shrink=coefficients(C,cov,obj);out['shrink']=shrink
            st=dict(bs.DEFAULTS,delta='3e-5',Ke_offset=12)
            cert=core(U,st,dict(Ke=12),print,192)
        if cert['count_in_Omega']!=2:raise RuntimeError('wrong critical count')
        cert['outside_critical_cluster_multiplier_upper']=cert.pop('multiplier_bound_full_period')
        out.update(spectral_certificate=cert,other16_exclusion_passed=True)
    except Exception as exc:
        out.update(error=type(exc).__name__+': '+str(exc),diagnostic=getattr(exc,'diag',None),other16_exclusion_passed=False)
    assert_pins()
    if 'complex_branch' in out:lc.assert_inputs_current(out['complex_branch']['inputs_sha256'])
    if lc.sha(__file__)!=own:raise RuntimeError('adapter drift')
    out['seconds']=time.monotonic()-start
    with Path('/private/tmp/cardiac-hopf-taylor-count2-pilot-2026-10-03-2.json').open('x') as f:
        json.dump(out,f,indent=2,allow_nan=False,sort_keys=True);f.write('\n')
    if not out['other16_exclusion_passed']:raise SystemExit(2)
if __name__=='__main__':main()
