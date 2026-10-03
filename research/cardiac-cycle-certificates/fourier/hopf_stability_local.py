"""Near-Hopf coefficient pilot and exact conditional Cauchy bound closure.

No TP06 interval is certified by this module yet: the complex-family,
monodromy and contour producer gates are still missing. See the local lemma.
The accepted release inputs and all existing mathematical programs stay read-only.
"""
import argparse
import ast
import inspect
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import re
import time

for _name in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS',
              'BLIS_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS', 'NUMEXPR_NUM_THREADS'):
    os.environ[_name] = '1'

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LOCAL_FILES = ('hopf_stability_local.py', 'test_hopf_stability_local.py',
               'LEMMAS-hopf-stability-local.md')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


LOCAL_SHA256 = {name: sha(HERE / name) for name in LOCAL_FILES}
import hopf as hp  # noqa: E402
from flint import arb  # noqa: E402
from flint import acb, acb_mat, arb_mat  # noqa: E402

SOURCES_SHA256 = dict(hp.SOURCE_SHA256,
                     **{'fourier/' + key: value for key, value in LOCAL_SHA256.items()})
RELEASE_INPUTS = {
    'fourier/data/hopf/theoremA_final.json': '430e769e30f0502adb5775e2395b5d19529b64b959b357632195b4a0ee4722f6',
    'results/fourier-hopf.json': '9b0bc96cc60336562b949bb54b33d3ecfbe462e31528bcd2153a5134857ceeff',
}


def assert_sources_current():
    hp._assert_sources_current()
    if any(sha(HERE / name) != value for name, value in LOCAL_SHA256.items()):
        raise hp.ProofFailure('local sources changed after import')


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key ' + key)
        result[key] = value
    return result


def read_json(path):
    return parse_json(Path(path).read_bytes())


def parse_json(raw):
    def bad_constant(value):
        raise ValueError('nonfinite JSON number ' + value)
    return json.loads(raw, object_pairs_hook=unique_object,
                      parse_constant=bad_constant)


def strict_receipts(raw):
    if not raw or not raw.endswith(b'\n'):
        raise hp.ProofFailure('receipt JSONL is empty or has an unterminated tail')
    rows=[parse_json(line) for line in raw.splitlines()]
    indices=[row.get('idx') for row in rows]
    if (any(type(i) is not int for i in indices)
            or len(set(indices)) != len(indices)
            or set(indices) != set(range(hp.EXPECTED_PIECES))):
        raise hp.ProofFailure('receipt indices are duplicated, mistyped or incomplete')
    return rows


def accepted_inputs():
    """Pin one-read snapshots before using any current accepted proof proposal."""
    inputs={}; snapshot={}
    for relative,expected in RELEASE_INPUTS.items():
        raw=(ROOT/relative).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=expected:
            raise hp.ProofFailure('accepted release input changed: '+relative)
        inputs[relative]=parse_json(raw);snapshot[relative]=expected
    A=inputs['fourier/data/hopf/theoremA_final.json']
    H=inputs['results/fourier-hopf.json']
    if (A['code_sha256']!=hp.CODE_SHA256 or A['sources_sha256']!=hp.SOURCE_SHA256
            or H['sources_sha256']!=hp.SOURCE_SHA256
            or H['identification_at_eps0'].get('ok') is not True
            or not hp.check_theoremA_cover(A)['ok']):
        raise hp.ProofFailure('accepted central Hopf/zero identity provenance invalid')
    if Path(hp.DATA).resolve()!=(HERE/'data/hopf').resolve():
        raise hp.ProofFailure('pilot expects the pinned canonical Hopf input directory')
    for name,expected in H['data_sha256'].items():
        if Path(name).name!=name:
            raise hp.ProofFailure('non-basename accepted data path')
        relative='fourier/data/hopf/'+name
        raw=(ROOT/relative).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=expected:
            raise hp.ProofFailure('accepted amplitude input changed: '+relative)
        snapshot[relative]=expected
        if name==hp.REPROVE_LOG:
            strict_receipts(raw)
    return A,H,snapshot


def assert_inputs_current(snapshot):
    if any(sha(ROOT/name)!=expected for name,expected in snapshot.items()):
        raise hp.ProofFailure('accepted input changed during pilot')


RATIONAL = re.compile(r'-?(?:0|[1-9][0-9]*)(?:/[1-9][0-9]*)?\Z')


def rational(value):
    """Proof scalars are exact integers or canonical rational texts, never floats."""
    if type(value) is int:
        return Fraction(value)
    if type(value) is not str or not RATIONAL.fullmatch(value):
        raise ValueError('proof scalar must be an exact integer or rational text')
    return Fraction(value)


def close_local_bound(*, b_lo, b_hi, trace_sup, analytic_radius, e0,
                      stable_multiplier_upper, period_upper):
    """Only the implication of Lemma 4, conditional on numerical producer hypotheses.

    This function deliberately has no certified or TP06-success return flag.
    In particular caller booleans cannot stand in for complex-disk proofs.
    """
    bl, bh, M, R, e, rho, T = map(rational, (b_lo, b_hi, trace_sup,
                               analytic_radius, e0, stable_multiplier_upper, period_upper))
    if not (bl <= bh < 0 and M >= 0 and 0 < e < R and 0 < rho < 1 and T > 0):
        raise hp.ProofFailure('invalid coefficient/radius/trace/stable/period inputs')
    # Cauchy compatibility: the same sup must also bound the known quadratic coefficient.
    if M < max(abs(bl), abs(bh)) * R**2:
        raise hp.ProofFailure('trace sup inconsistent with supplied coefficient enclosure')
    E = M * e**2 / (R**4 * (1-(e/R)**2))
    c, u = -bh-E, -bl+E
    if c <= 0:
        raise hp.ProofFailure('Cauchy remainder does not preserve the radial sign')
    if u*e**2 >= 1:
        raise hp.ProofFailure('positive radial multiplier not certified')
    return dict(kind='conditional_local_bound_closure', schema=1,
                status='exact inequalities passed conditional on unproduced analytic hypotheses',
                model_stability_certified=False, amplitude_domain=['0', str(e)],
                zero_endpoint_included_as_periodic_orbit=False,
                analytic_radius=str(R), critical_trace_sup=str(M),
                radial_trace_quadratic_coefficient=[str(bl), str(bh)],
                scaled_remainder_upper=str(E), radial_multiplier_drop_coefficient=str(c),
                radial_multiplier_drop_upper=str(u),
                stable_multiplier_upper=str(rho), period_upper=str(T),
                radial_decay_coefficient=str(c/T), transverse_decay_lower=str((1-rho)/T),
                decay_formula='min(transverse_decay_lower, radial_decay_coefficient*epsilon^2)',
                missing_producer_gates=['complex_disk_blown_up_contraction',
                    'real_branch_and_zero_identity', 'verified_disk_monodromy',
                    'two_full_resolvent_contours_and_ranks', 'critical_trace_circle_sup'])


def complex_square(radius):
    r = hp._arb_q(rational(radius))
    return acb(arb(0, r), arb(0, r))


def square_grid(radius, count):
    if type(count) is not int or not 1 <= count <= 16:
        raise ValueError('complex grid count must be an integer from 1 to 16')
    R = rational(radius)
    return [acb(hp._ball_interval(-R+2*R*Fraction(i,count), -R+2*R*Fraction(i+1,count)).real,
                hp._ball_interval(-R+2*R*Fraction(j,count), -R+2*R*Fraction(j+1,count)).real)
            for i in range(count) for j in range(count)]


class ComplexLineCover(hp.EpsCover):
    """Fresh full-strip cover of a complex affine line and unknown polydiscs.

    Unlike the real-line cover, both real and imaginary center/parameter
    drifts are included. Opposite Fourier modes are independent complex balls.
    Conjugate symmetry is imposed only on the fixed real base/tangent.
    """
    def __init__(self, C, endpoints, radius, R, G_R, rho2, *, log=print):
        self.parameter_radius = rational(radius)
        if self.parameter_radius <= 0:
            raise ValueError('complex disk radius must be positive')
        self.endpoints = tuple(map(Fraction, endpoints))
        self.ec = sum(self.endpoints)/2
        self.C_digest = C.digest()
        self.K = C.K
        with hp.am.precision(192):
            self.abs_e = hp.up(hp._arb_q(self.parameter_radius)*arb(2).sqrt())
            self.delta = hp.up(self.abs_e+hp._arb_q(abs(self.ec)))
            # Point epsilon_c must be in the covered square too.
            if abs(self.ec) > self.parameter_radius:
                raise ValueError('complex parameter square omits the point inverse center')
            self.T = hp.up(self.abs_e+hp._arb_q('1/40'))
            self.R = [hp._arb_q(v) for v in R]
            self.G_R = hp._arb_q(G_R)
            self.rho2 = hp._arb_q(rho2)
            if not (all(v.is_exact() and v > 0 for v in self.R)
                    and self.G_R.is_exact() and self.G_R > 0
                    and self.rho2.is_exact() and self.rho2 > 0):
                raise ValueError('exact positive cover margins required')
            self.coeffs=[]
            for k in range(hp.DIM):
                row=[acb(0)]*(2*C.K+1)
                drift=hp.up(self.delta*abs(C.tc[k]))
                rad=hp.up(drift+self.R[k])
                row[C.K]=acb(C.c[k]+arb(0,rad),arb(0,rad))
                for m in range(1,C.K+1):
                    rad=hp.up(self.T*(C.w[k][C.K+m].abs_upper()
                                     +self.delta*C.tw[k][C.K+m].abs_upper()))
                    row[C.K+m]=acb(arb(0,rad),arb(0,rad))
                    row[C.K-m]=acb(arb(0,rad),arb(0,rad))
                self.coeffs.append(row)
            grad=hp.up(self.delta*abs(C.tg)+self.G_R)
            self.g_ball=acb(C.g+arb(0,grad),arb(0,grad))
            self.T_text=hp._dyadic_text(self.T)
            self.R_text=[hp._dyadic_text(v) for v in self.R]
            self.G_R_text=hp._dyadic_text(self.G_R)
            self.rho2_text=hp._dyadic_text(self.rho2)
        start=time.monotonic()
        phi=hp.fe.TrigPoly(self.coeffs)
        prm=hp.am.params(53);prm['g_Ks']=self.g_ball
        self.strip=hp.fe.strip_sup(lambda z:hp.hess19(z,prm,53),phi,self.rho2,
                                  nx=16,rtol=1.0,atol=0.0,max_evals=1500)
        if not self.strip.full_strip:
            raise hp.ProofFailure('complex-line cover is not a full strip')
        S=self.strip.S;o=0
        self.Mf=S[o:o+hp.DIM];o+=hp.DIM
        self.MJ=[[S[o+hp.DIM*k+j] for j in range(hp.DIM)] for k in range(hp.DIM)]
        o+=hp.DIM*hp.DIM
        self.MH=[[S[o+hp.NH*k+p] for p in range(hp.NH)] for k in range(hp.DIM)]
        o+=hp.DIM*hp.NH
        self.MF1=S[o:o+hp.DIM];o+=hp.DIM
        self.MG=[[S[o+hp.DIM*k+j] for j in range(hp.DIM)] for k in range(hp.DIM)]
        self.digest=phi.digest();self.seconds=time.monotonic()-start
        log('fresh complex-line full-strip cover in %.2fs'%self.seconds)

    def contains(self,C,a,b):
        # Construction has explicitly enclosed the entire complex square;
        # its point inverse must be exactly the stated real center/tangent.
        return (C.digest()==self.C_digest and (Fraction(a),Fraction(b))==self.endpoints
                and self.abs_e < self.T)


def complex_piece_blocks(C,a,b,cov,*,settings=None,log=print,label=None):
    """Six hash-locked substitutions in frozen real piece_blocks.

    A separate function namespace is used; hopf's globals/functions are never
    modified. The executable body is the pinned existing full finite/tail
    algebra with only the parameter domain and its two norm bounds enlarged.
    """
    if hp.CODE_SHA256!='8635b9337fe9f26b1e712700da583e3e409ef8d6b3fa889ae7fbab882ff2bd0c':
        raise hp.ProofFailure('complex adapter requires a new review for changed hopf source')
    tree=ast.parse(inspect.getsource(hp.piece_blocks))
    replacements={
        'delta':'cov.delta',
        'ehiB':'cov.abs_e',
        'subs_xi':'_local_square_grid(str(cov.parameter_radius), nxi)',
        'XiB':'_local_complex_square(str(cov.parameter_radius))',
    }
    # Four assignments, affecting six proof domains: width, |epsilon|,
    # nodal Y2 and Zc grid, full-strip Y2 and Zc square.
    found={key:0 for key in replacements}
    class Replace(ast.NodeTransformer):
        def visit_Assign(self,node):
            if len(node.targets)==1 and isinstance(node.targets[0],ast.Name):
                key=node.targets[0].id
                if key in replacements:
                    found[key]+=1
                    node.value=ast.parse(replacements[key],mode='eval').body
            return self.generic_visit(node)
    tree=Replace().visit(tree);ast.fix_missing_locations(tree)
    if any(v!=1 for v in found.values()):
        raise hp.ProofFailure('frozen block adapter assignment shape changed')
    namespace=dict(vars(hp),_local_square_grid=square_grid,_local_complex_square=complex_square)
    exec(compile(tree,'<reviewed complex-disk piece_blocks>','exec'),namespace)
    return namespace['piece_blocks'](C,a,b,cov,settings=settings,log=log,label=label)


def complex_branch_pilot(radius='1/100', log=print, *, _objects=False):
    """Fresh complex-disk contraction attempt, never a stability certificate."""
    R=rational(radius)
    assert_sources_current()
    _,_,snapshot=accepted_inputs()
    start=time.monotonic()
    # Accepted fresh first piece, with exact logged proposal inputs only.
    pieces=hp.final_pieces(hp.DATA)
    rec=pieces[0]
    if Fraction(rec['e_lo'])!=0 or rec['idx']!=0:
        raise hp.ProofFailure('first accepted amplitude piece does not start at zero')
    C=hp.Centre.from_record(rec['centre'])
    settings=dict(hp.PIECE_DEFAULTS,**{key:rec['settings'][key]
                        for key in ('M','nsub_xi','nsub_s','rho0')})
    with hp.am.precision(192):
        cov=ComplexLineCover(C,(rec['e_lo'],rec['e_hi']),str(R),
            [rec['settings']['R']]*hp.DIM,rec['settings']['G_R'],rec['settings']['rho2'],log=log)
        bl=complex_piece_blocks(C,rec['e_lo'],rec['e_hi'],cov,settings=settings,log=log)
        rs=str(hp.hex_fraction(rec['r_star']))
        res=hp.assemble(bl,rec['eta'],rs,log=log)
        obj=res.pop('_obj')
        # Same affine center and weights: one exact inclusion identifies
        # complex-family and accepted real-branch zeros on their overlap.
        old_exist=hp.hex_fraction(rec['result']['r_existence'])
        new_unique=hp.hex_fraction(res['r_uniqueness'])
        new_exist=hp.hex_fraction(res['r_existence'])
        old_unique=hp.hex_fraction(rec['result']['r_uniqueness'])
        if not (old_exist<=new_unique or new_exist<=old_unique):
            raise hp.ProofFailure('complex and accepted real zero balls cannot be identified')
        # Same proof controls all complex epsilon square points; positive
        # real lower bound on the modulus of omega follows by a disk norm.
        omega_error=hp.up(cov.delta*abs(C.tom)+obj['E'][0]*obj['r_lo'])
        if not C.om>omega_error:
            raise hp.ProofFailure('complex-family omega disk may contain zero')
        result=dict(kind='hopf_complex_disk_branch_pilot',schema=1,
            status='complex branch contraction passed; stability gates not produced',
            model_stability_certified=False,analytic_disk_radius=str(R),
            parameter_square=dict(real=[str(-R),str(R)],imag=[str(-R),str(R)]),
            sources_sha256=dict(SOURCES_SHA256),inputs_sha256=snapshot,
            settings=settings,first_piece_input_digest=hp._record_digest(rec),
            complex_cover=hp.EpsCover.record(cov),radius_from_point_center=hp.bound_rec(cov.delta),
            absolute_epsilon_upper=hp.bound_rec(cov.abs_e),proof_bounds=res,
            real_branch_identity=dict(old_existence=str(old_exist),new_uniqueness=str(new_unique),
                new_existence=str(new_exist),old_uniqueness=str(old_unique)),
            omega_nonzero_margin=hp.bound_rec(hp.lo(C.om-omega_error),'down'),
            reused_real_display_fields_are_not_complex_enclosures=True,
            seconds=time.monotonic()-start,
            missing_producer_gates=['verified_disk_monodromy','two_full_resolvent_contours_and_ranks'])
    assert_sources_current()
    assert_inputs_current(snapshot)
    return (result,C,cov,obj,rec) if _objects else result


def leading_from_normalization(omega, l1_scaled, q_voltage_abs_squared):
    """Return rigorous Arb leading radial exponent and multiplier-drop coefficient.

    q is Euclidean-normalized in scaled state coordinates. No omega-free
    l1 rescaling or physical voltage coefficient is silently substituted.
    """
    if not (omega.is_finite() and l1_scaled.is_finite()
            and q_voltage_abs_squared.is_finite() and omega > 0
            and l1_scaled < 0 and q_voltage_abs_squared > 0):
        raise hp.ProofFailure('Hopf coefficient or voltage normalization unresolved')
    exponent = omega*l1_scaled/(2*q_voltage_abs_squared)
    multiplier = arb.pi()*l1_scaled/q_voltage_abs_squared
    return exponent, multiplier


def quotient_coefficients(C,cov,obj,*,Kp=64,M=128,rho='5/8',log=print):
    """Fresh complex-square Jacobian and exact-phase coefficient enclosures.

    The model is holomorphic in the independent complex Fourier coefficients.
    The verified branch's unknown tube is bounded on its existence strip.
    These coefficient boxes include the whole parameter square, so they do
    not retain parameter correlations; poor bounds cause an honest failure.
    """
    if type(Kp) is not int or type(M) is not int or not 2*C.K <= Kp < M:
        raise ValueError('need 2 K <= Kp < M')
    rhoj=hp._arb_q(rho);rho0=obj['nu'].log()
    rhoe=hp._arb_q('1/16')
    if not 0<rhoe<rho0<cov.rho2 or not 0<rhoj<cov.rho2:
        raise hp.ProofFailure('Jacobian/phase derivative strip margins unresolved')
    Xi=complex_square(str(cov.parameter_radius))
    d=Xi-hp._arb_q(cov.ec)
    phi=[];phase=[]
    E,r=obj['E'],obj['r_lo']
    for k in range(hp.DIM):
        w=[C.w[k][j]+d*C.tw[k][j] for j in range(2*C.K+1)]
        row=[Xi*v for v in w];row[C.K]=acb(C.c[k])+d*C.tc[k]
        phi.append(row)
        phase.append([acb(0,m)*w[m+C.K] for m in range(-C.K,C.K+1)])
    tg=hp.up(E[1]*r)
    tube=[hp.up((E[hp.CC+k]+cov.abs_e*E[hp.CW+k])*r) for k in range(hp.DIM)]
    if not tg<cov.G_R or any(not t<rr for t,rr in zip(tube,cov.R)):
        raise hp.ProofFailure('complex eigenpair orbit tube escapes Hessian cover')
    eps=[[hp.up(sum((cov.H(k,j,l)*tube[l] for l in range(hp.DIM)),arb(0))
                      +cov.MG[k][j]*tg) for j in range(hp.DIM)] for k in range(hp.DIM)]
    def jac(z,prec):
        p=hp.am.params(prec);p['g_Ks']=acb(C.g)+d*C.tg
        return hp.ex._flat(hp.am.f_and_df(z,p,prec=prec)[1])
    poly=hp.fe.TrigPoly(phi)
    sj=hp.fe.strip_sup(lambda z:jac(z,53),poly,rhoj,nx=16,rtol=1000.0,max_evals=1200)
    if not sj.full_strip:raise hp.ProofFailure('complex quotient Jacobian strip incomplete')
    enc=hp.fe.fourier_coefficients(lambda z:jac(z,192),poly,rhoj,M,Kp,S=sj,prec=192)
    J={}
    for n in range(-Kp,Kp+1):
        q=(-rho0*abs(n)).exp()
        J[n]=acb_mat([[enc.c[hp.DIM*k+j][n+Kp]+acb(arb(0,hp.up(eps[k][j]*q)),
                     arb(0,hp.up(eps[k][j]*q))) for j in range(hp.DIM)] for k in range(hp.DIM)])
    SJ=[[sj.S[hp.DIM*k+j] for j in range(hp.DIM)] for k in range(hp.DIM)]
    p={}
    for n in range(-C.K,C.K+1):
        p[n]=[phase[k][n+C.K]+acb(arb(0,hp.up(abs(n)*E[hp.CW+k]*r/obj['nu']**abs(n))),
                      arb(0,hp.up(abs(n)*E[hp.CW+k]*r/obj['nu']**abs(n)))) for k in range(hp.DIM)]
    for n in (-1,1):p[n][hp.IV]=acb(0,hp._arb_q(Fraction(n,2)))
    domega=hp.up(cov.delta*abs(C.tom)+E[0]*r)
    omega=acb(C.om)+acb(arb(0,domega),arb(0,domega))
    # Rectangular complex balls bound |entry| by sqrt(2) times their radii.
    # The Jacobian tube estimate is entrywise modulus; use that same factor
    # for its explicit boxes and far coefficient majorant consistently.
    eps=[[hp.up(arb(2).sqrt()*v) for v in row] for row in eps]
    log('fresh full complex-square Jacobian coefficients Kp=%d'%Kp)
    return dict(J=J,SJ=SJ,eps=eps,rho=rhoj,rho0=rho0,rhoe=rhoe,
        phase=p,phase_radius=[hp.up(arb(2).sqrt()*E[hp.CW+k]*r) for k in range(hp.DIM)],
        phase_centre=phase,C=C,Kp=Kp,omega=omega,omega_error=hp.up(arb(2).sqrt()*domega),
        full_strip=True,n_evals=sj.n_evals,profile_tube=tube,g_tube=tg,ec=cov.ec)


def quotient_eigenpair(F,*,K=8,eta=None,r_star='1/10',weight_search=False,log=print):
    """Complete finite/tail contraction for L v+lambda v-alpha w'=0.

    Two gauges fix v[V,+1]=v[V,-1]=1/2. Exact phase identity is inherited
    from the freshly identified holomorphic branch, not from a numerical
    null vector. Every coefficient norm and both tail signs are included.
    A passing result alone does not exclude the other16 Floquet exponents.
    """
    ex=hp.ex;D=hp.DIM;C=F['C'];Kp=F['Kp']
    if (not F.get('full_strip') is True or any(not x.is_finite() or not x>=0
            for matrix in (F['SJ'],F['eps']) for row in matrix for x in row)
            or any(not x.is_finite() or not x>=0 for x in F['phase_radius'])
            or not F['omega_error'].is_finite() or not F['omega_error']>=0):
        raise hp.ProofFailure('invalid full-strip coefficient or frequency majorants')
    if type(K) is not int or K<1 or not 2*K<=Kp:
        raise ValueError('need 1 <= K <= Kp/2')
    if eta is None:eta=['1/100','1/100']+['1']*D
    if len(eta)!=D+2:raise ValueError('need two scalar and18 profile weights')
    E=[hp._arb_q(rational(e)) for e in eta]
    if any(not e.is_exact() or not e>0 for e in E):raise ValueError('positive dyadic weights required')
    nu=F['rhoe'].exp();nupow=[nu**i for i in range(Kp+K+2)]
    modes=list(range(-K,K+1));N=2+D*(2*K+1)
    ix=lambda k,m:2+k*(2*K+1)+m+K
    comp=[0,1]+[2+k for k in range(D) for m in modes]
    mode=[0,0]+modes*D
    WR=arb_mat(D+2,N)
    for i in range(N):WR[comp[i],i]=hp.up(nupow[abs(mode[i])])
    def jbound(n):
        if abs(n)<=Kp:return F['J'][n]
        return acb_mat([[acb(arb(0,hp.up(F['SJ'][k][j]*(-F['rho']*abs(n)).exp()
                     +F['eps'][k][j]*(-F['rho0']*abs(n)).exp())),
                     arb(0,hp.up(F['SJ'][k][j]*(-F['rho']*abs(n)).exp()
                     +F['eps'][k][j]*(-F['rho0']*abs(n)).exp()))) for j in range(D)] for k in range(D)])
    v={m:[acb(0)]*D for m in modes}
    # Fixed exact dyadic proposal from the first harmonic at the zero end.
    for m in (-1,1):
        v[m]=[C.w[k][C.K+m]-hp._arb_q(F['ec'])*C.tw[k][C.K+m] for k in range(D)]
    v[1][hp.IV]=v[-1][hp.IV]=acb(hp._arb_q('1/2'))
    def phase(n):
        if n in F['phase']:return F['phase'][n]
        return [acb(arb(0,hp.up(abs(n)*F['phase_radius'][k]*(-F['rho0']*abs(n)).exp())),
                    arb(0,hp.up(abs(n)*F['phase_radius'][k]*(-F['rho0']*abs(n)).exp()))) for k in range(D)]
    mat=acb_mat(N,N);mat[0,ix(hp.IV,1)]=mat[1,ix(hp.IV,-1)]=acb(1)
    for m in modes:
        jm=jbound(m)
        for k in range(D):
            row=ix(k,m);mat[row,0]=v[m][k];mat[row,1]=-phase(m)[k]
            for mp in modes:
                jj=jbound(m-mp)
                for j in range(D):mat[row,ix(j,mp)]=-jj[k,j]
            mat[row,row]+=acb(0,m)*F['omega']
    mid=acb_mat([[acb(mat[i,j].real.mid(),mat[i,j].imag.mid()) for j in range(N)] for i in range(N)])
    try: Afin=hp.mat_from_np(hp.np.linalg.inv(hp.np_from_mat(mid)))
    except hp.np.linalg.LinAlgError as err:
        raise hp.ProofFailure('finite quotient inverse proposal failed') from err
    invres=ex._abs_mat(ex._identity(N)-Afin*mid)
    invq=hp.amax_list([hp.up(sum((invres[i,j] for i in range(N)),arb(0))) for j in range(N)])
    if not invq<1:raise hp.ProofFailure('finite quotient preconditioner not injective')
    Aabs=ex._abs_mat(Afin)
    def blocks(matrix,columns):
        sums=WR*ex._abs_mat(matrix);out=[[arb(0)]*(D+2) for _ in range(D+2)]
        for i,(c,m) in enumerate(columns):
            for r in range(D+2):out[r][c]=hp.amax(out[r][c],hp.up(sums[r,i]/nupow[abs(m)]))
        return out
    columns=list(zip(comp,mode))
    Bff=blocks(ex._identity(N)-Afin*mat,columns)
    NA=blocks(Afin,columns)
    # Tail resolvent is based on exact real J0hat, independently of the
    # complex family. Both signed tail products are checked in _tail_bounds.
    Jhat=acb_mat([[acb(F['J'][0][k,j].real.mid()) for j in range(D)] for k in range(D)])
    Jp={n:jj-(Jhat if n==0 else acb_mat(D,D)) for n,jj in F['J'].items()}
    tail=ex._tail_bounds(K,Kp,C.om,Jhat,Jp,{},1,dict(theta_target='1/2',n_explicit=12),nupow,log)
    Ab=arb_mat(tail['Abar0']);Ab1=tail['Abar1']
    def geosum(rho,start):
        q=(-rho+F['rhoe']).exp()
        if not q<1:raise hp.ProofFailure('Fourier coefficient tail is not summable')
        return hp.up(2*q**start/(1-q))
    far=arb_mat([[hp.up(F['SJ'][k][j]*geosum(F['rho'],Kp+1)
                       +F['eps'][k][j]*geosum(F['rho0'],Kp+1)) for j in range(D)] for k in range(D)])
    T=Ab*far
    for n,cn in tail['C'].items():
        for k in range(D):
            for j in range(D):T[k,j]+=cn[k][j]*nupow[abs(n)]
    for k in range(D):T[k,k]+=F['omega_error']*Ab1[k][k]
    # omega variation couples every output component, not only the diagonal.
    for k in range(D):
        for j in range(D):
            if j!=k:T[k,j]+=F['omega_error']*Ab1[k][j]
    Bft=[[arb(0)]*(D+2) for _ in range(D+2)]
    for mp in list(range(K+1,K+9))+list(range(-K-8,-K)):
        cols=acb_mat(N,D)
        for m in modes:
            jj=jbound(m-mp)
            for k in range(D):
                for j in range(D):cols[ix(k,m),j]=-jj[k,j]
        vals=blocks(Afin*cols,[(2+j,mp) for j in range(D)])
        for r in range(D+2):
            for j in range(D+2):Bft[r][j]=hp.amax(Bft[r][j],vals[r][j])
    # Beyond these explicit columns, |m-m'| grows monotonically for every
    # window row and the two exponential coefficient bounds dominate.
    for mp in (K+9,-K-9):
        cols=arb_mat(N,D)
        for m in modes:
            for k in range(D):
                for j in range(D):cols[ix(k,m),j]=hp.up(F['SJ'][k][j]*(-F['rho']*abs(m-mp)).exp()
                         +F['eps'][k][j]*(-F['rho0']*abs(m-mp)).exp())
        sums=WR*Aabs*cols
        for r in range(D+2):
            for j in range(D):Bft[r][j+2]=hp.amax(Bft[r][j+2],hp.up(sums[r,j]/nupow[abs(mp)]))
    # Exact phase derivative tail in the smaller Fourier strip. The unknown
    # derivative acts on the known branch radius, not an assumed finite tail.
    q=(-F['rho0']+F['rhoe']).exp()
    phase_tail=[]
    for k in range(D):
        fixed=sum((F['phase_centre'][k][m+C.K].abs_upper()*nu**abs(m)
                   for m in range(-C.K,C.K+1) if abs(m)>K),arb(0))
        phase_tail.append(hp.up(fixed+F['phase_radius'][k]*q**(K+1)*((K+1)-K*q)/(1-q)**2))
    apt=Ab*arb_mat([[p] for p in phase_tail])
    Z1rows=[];B1=[[arb(0)]*(D+2) for _ in range(D+2)]
    for r in range(D+2):
        row=arb(0)
        for c in range(D+2):
            b=hp.amax(Bff[r][c],Bft[r][c])
            if r>=2 and c>=2:b+=T[r-2,c-2]
            if r>=2 and c==1:b+=apt[r-2,0]
            B1[r][c]=hp.up(b)
            row+=E[c]*b
        Z1rows.append(hp.up(row/E[r]))
    Z1=hp.amax_list(Z1rows)
    residual=acb_mat(N,1)
    for m in modes:
        for k in range(D):
            value=acb(0,m)*F['omega']*v[m][k]
            for mp in (-1,1):
                jj=jbound(m-mp)
                value-=sum((jj[k,j]*v[mp][j] for j in range(D)),acb(0))
            residual[ix(k,m),0]=value
    af=WR*ex._abs_mat(Afin*residual)
    rt=[arb(0)]*D
    for m in list(range(K+1,Kp+2))+list(range(-Kp-1,-K)):
        for k in range(D):
            val=acb(0)
            for mp in (-1,1):
                jj=jbound(m-mp)
                val-=sum((jj[k,j]*v[mp][j] for j in range(D)),acb(0))
            rt[k]+=val.abs_upper()*nu**abs(m)
    for k in range(D):
        for j in range(D):
            normv=sum((v[mp][j].abs_upper()*nu for mp in (-1,1)),arb(0))
            rt[k]+=(F['SJ'][k][j]*geosum(F['rho'],Kp+1)
                     +F['eps'][k][j]*geosum(F['rho0'],Kp+1))*normv
    art=Ab*arb_mat([[x] for x in rt])
    Yc=[hp.up(af[r,0]+(art[r-2,0] if r>=2 else 0)) for r in range(D+2)]
    PP=[[hp.up(NA[r][j+2]+(Ab[r-2,j] if r>=2 else 0)) for j in range(D)] for r in range(D+2)]
    def scalars(ee):
        yy=hp.amax_list([hp.up(Yc[r]/ee[r]) for r in range(D+2)])
        z1=hp.amax_list([hp.up(sum((B1[r][c]*ee[c] for c in range(D+2)),arb(0))/ee[r]) for r in range(D+2)])
        z2=hp.amax_list([hp.up(2*ee[0]*sum((PP[r][j]*ee[j+2] for j in range(D)),arb(0))/ee[r]) for r in range(D+2)])
        return yy,z1,z2
    Y0,Z1,Z2=scalars(E)
    rs=hp._arb_q(rational(r_star));radii=ex._radii(Y0,Z1,Z2,rs)
    search_diagnostic=None
    if weight_search and radii is None:
        # Floating arithmetic proposes only positive exact dyadic weights.
        # Every selected candidate is reassembled and accepted by Arb.
        bf=hp.np.array([[float(x) for x in row] for row in B1])
        yf=hp.np.array([float(x) for x in Yc]);pf=hp.np.array([[float(x) for x in row] for row in PP])
        candidates=[];base=[Fraction(v) for v in eta]
        for le in range(-24,9):
            for ve in range(0,6):
                for ae in (-4,0,4):
                    ee=[base[0]*Fraction(2)**le,base[1]*Fraction(2)**ae]+[v*Fraction(2)**ve for v in base[2:]]
                    ef=hp.np.array([float(v) for v in ee]);yy=float(max(yf/ef))
                    zz=float(max((bf@ef)/ef));z2=float(max((2*ef[0]*(pf@ef[2:]))/ef))
                    if 0<=zz<1 and z2>0:
                        score=2*z2*yy/(1-zz)**2
                        if score<1:candidates.append((score,ee))
        candidates.sort(key=lambda pair:pair[0])
        eig=hp.np.linalg.eigvals(bf)
        search_diagnostic=dict(component_bound_spectral_radius_proposal=float(max(abs(eig))),
                               exact_weight_candidates=len(candidates))
        for _,ee in candidates[:64]:
            ee=[hp._arb_q(v) for v in ee];yy,zz,z2=scalars(ee)
            rr=ex._radii(yy,zz,z2,rs)
            if rr is not None:
                E=ee;eta=[hp._dyadic_text(v) for v in E];Y0,Z1,Z2=yy,zz,z2;radii=rr;break
    if Y0.is_zero() and Z1<1 and Z2>0 and rs>0:
        for k in range(128):
            rr=rs/(arb(2)**k)
            if Y0+(Z1-1)*rr+Z2*rr*rr/2<0 and Z1+Z2*rr<1:
                radii=(rr,rr);break
    diag=dict(Y0=hp.bound_rec(Y0),Z1=hp.bound_rec(Z1),Z2=hp.bound_rec(Z2),r_star=hp.bound_rec(rs),
              weight_search=search_diagnostic,Y0_components=[hp.bound_rec(v) for v in Yc],
              derivative_component_bound=[[hp.bound_rec(v) for v in row] for row in B1],
              hessian_residual_component_bound=[[hp.bound_rec(v) for v in row] for row in PP])
    if radii is None:
        err=hp.ProofFailure('augmented radial quotient contraction failed');err.diag=diag;raise err
    rl,rh=radii
    zero_identification=None
    if 'zero_profile_error' in F:
        lhs=hp.amax_list([hp.up(F['zero_profile_error'][k]/E[k+2]) for k in range(D)])
        if not lhs<rh:
            raise hp.ProofFailure('central Hopf radial vector not inside quotient uniqueness ball')
        zero_identification=dict(ok=True,lhs=hp.bound_rec(lhs),uniqueness_radius=hp.bound_rec(rh),
             lambda_at_zero='0',alpha_at_zero='0',
             premises='accepted Hopf/branch zero identity and fresh normalized central eigenpair')
    log('radial quotient: Y0=%.3e Z1=%.3e Z2=%.3e r=%.3e'%(float(Y0),float(Z1),float(Z2),float(rl)))
    return dict(kind='analytic_radial_quotient_contraction',model_stability_certified=False,
        gauges='v[V,+1]=v[V,-1]=1/2',physical_H_definition='H=Df-omega*d_theta',
        physical_exponent_equation='-H v+lambda v-alpha w_prime=0',
        physical_exponent_newton_proposal=hp._ball_rec((-(Afin*residual)[0,0]).real),
        K=K,Kp=Kp,eta=eta,rho_eigenvector='1/16',proof_bounds=diag,
        finite_preconditioner_injectivity=hp.bound_rec(invq),r_existence=hp.bound_rec(rl),
        r_uniqueness=hp.bound_rec(rh),physical_exponent_disk_radius=hp.bound_rec(hp.up(E[0]*rl)),
        zero_identification=zero_identification,
        phase_column='exact identified branch w_prime; lower-strip derivative majorant included',
        remaining_gate='other16 spectral exclusion and actual Cauchy closure')


def shrunk_quotient_coefficients(C,cov,obj,*,radius='1/100000',Kp=64,M=128,log=print):
    """Exploit validated signed parity and the exact Hopf zero before boxing.

    Banach-valued Cauchy estimates shrink the actual complex branch tube,
    not the affine proposal. The requested square must fit strictly inside
    the previously replayed analytic disk. This still discards Jacobian
    correlations; it is a first bounded refinement, not a sign theorem.
    """
    rr=rational(radius);R=hp._arb_q(cov.parameter_radius)
    aa=hp.up(hp._arb_q(rr)*arb(2).sqrt())
    if not 0<aa<R:raise hp.ProofFailure('shrunken square must fit analytic branch disk')
    A,_,_=accepted_inputs();ga,gb=map(Fraction,A['gH_interval'])
    fam=hp.jacobian_family(ga,gb,hp.FloatHopf(),192);sp=hp.spectrum_on(fam,192)
    g0=hp._ball_interval(ga,gb).real;om0=sp['lam'].imag
    x0=[z.real for z in fam['eq_G']['X']]
    q=sp['v'];qv=q[hp.IV]
    if qv.contains(0):raise hp.ProofFailure('zero voltage eigenvector normalization unresolved')
    q0=[z/(2*qv) for z in q];q0[hp.IV]=acb(hp._arb_q('1/2'))
    qm=[acb(z.real.mid(),z.imag.mid()) for z in q0]
    zero_w=[[acb(0)]*(2*C.K+1) for _ in range(hp.DIM)]
    wmid=[[acb(0)]*(2*C.K+1) for _ in range(hp.DIM)]
    for k in range(hp.DIM):
        zero_w[k][C.K+1]=q0[k];zero_w[k][C.K-1]=q0[k].conjugate()
        wmid[k][C.K+1]=qm[k];wmid[k][C.K-1]=qm[k].conjugate()
    C0=hp.Centre(om0.mid(),g0.mid(),[x.mid() for x in x0],wmid,0,0,[0]*hp.DIM,
                 [[acb(0)]*(2*C.K+1) for _ in range(hp.DIM)],C.K)
    E,r=obj['E'],obj['r_lo'];nu=obj['nu'];rho0=nu.log();rhoe=hp._arb_q('1/16')
    rhoj=hp._arb_q('5/8')
    even=hp.up((aa/R)**2/(1-(aa/R)**2));odd=hp.up((aa/R)/(1-(aa/R)**2))
    def scalar_sup(value,tangent,zero,weight):
        return hp.up(abs(acb(value)-hp._arb_q(cov.ec)*tangent-acb(zero))+R*abs(tangent)+weight*r)
    Mc=[scalar_sup(C.c[k],C.tc[k],x0[k],E[hp.CC+k]) for k in range(hp.DIM)]
    Mg=scalar_sup(C.g,C.tg,g0,E[1]);Mo=scalar_sup(C.om,C.tom,om0,E[0])
    d_w=[];Mwe=[];Mwo=[];zero_error=[];de=[];do=[]
    for k in range(hp.DIM):
        me=mo=arb(0)
        for m in range(-C.K,C.K+1):
            if m==0:continue
            val=(C.w[k][m+C.K]-hp._arb_q(cov.ec)*C.tw[k][m+C.K]-zero_w[k][m+C.K]).abs_upper()
            val+=R*C.tw[k][m+C.K].abs_upper()
            if m%2:me+=val*nu**abs(m)
            else:mo+=val*nu**abs(m)
        me=hp.up(me+E[hp.CW+k]*r);mo=hp.up(mo+E[hp.CW+k]*r)
        qerr=hp.up(2*(q0[k]-qm[k]).abs_upper()*nu)
        zero_error.append(hp.up(2*(q0[k]-qm[k]).abs_upper()*rhoe.exp()))
        de.append(hp.up(qerr+me*even));do.append(hp.up(mo*odd))
        d_w.append(hp.up(de[-1]+do[-1]));Mwe.append(me);Mwo.append(mo)
    dc=[hp.up(x0[k].rad()+Mc[k]*even) for k in range(hp.DIM)]
    dg=hp.up(g0.rad()+Mg*even);dom=hp.up(om0.rad()+Mo*even)
    t=[hp.up(dc[k]+aa*d_w[k]) for k in range(hp.DIM)]
    # The enlarged original Hessian cover contains both exact zeros and
    # all connecting profile/g segments. Its reservations are not exceeded.
    base_distance=[]
    for k in range(hp.DIM):
        dd=abs(C0.c[k]-C.c[k]+hp._arb_q(cov.ec)*C.tc[k])+aa*abs(C.tc[k])
        ww=sum(((wmid[k][m+C.K]-C.w[k][m+C.K]+hp._arb_q(cov.ec)*C.tw[k][m+C.K]).abs_upper()
                  +aa*C.tw[k][m+C.K].abs_upper())*nu**abs(m)
               for m in range(-C.K,C.K+1) if m!=0)
        base_distance.append(hp.up(dd+aa*ww))
    gbase=hp.up(abs(C0.g-C.g+hp._arb_q(cov.ec)*C.tg)+aa*abs(C.tg))
    if not gbase+dg<cov.G_R or any(not dd+tt<rad for dd,tt,rad in zip(base_distance,t,cov.R)):
        raise hp.ProofFailure('Cauchy-shrunk orbit tube exceeds Hessian reservations')
    # Keep the exact Fourier support of the first parameter derivative.
    # J'(0)=D²f(c_H;g_H)[w0,.], since c'(0)=g'(0)=0.
    prm=hp.am.params(192);prm['g_Ks']=acb(g0)
    hh=hp.hess19([acb(x) for x in x0],prm,192)
    off=hp.DIM+hp.DIM*hp.DIM
    H=[[hh[off+hp.NH*k+p] for p in range(hp.NH)] for k in range(hp.DIM)]
    J1={m:acb_mat([[sum((H[k][hp.HPI[(min(j,l),max(j,l))]]*zero_w[l][m+C.K]
                         for l in range(hp.DIM)),acb(0)) for j in range(hp.DIM)] for k in range(hp.DIM)])
        for m in (-1,1)}
    # Full parent-circle sup of J(e)-J(0), including all branch tails.
    # Both actual profile and the zero equilibrium belong to the convex
    # model boxes of the original full-strip Hessian cover.
    parent_profile=[hp.up(Mc[k]+R*(2*q0[k].abs_upper()*nu+Mwe[k]+Mwo[k])) for k in range(hp.DIM)]
    Gsup=[[hp.up(sum((cov.H(k,j,l)*parent_profile[l] for l in range(hp.DIM)),arb(0))
                    +cov.MG[k][j]*Mg) for j in range(hp.DIM)] for k in range(hp.DIM)]
    remainder_factor=hp.up((aa/R)**2/(1-aa/R))
    eps=[[hp.up(Gsup[k][j]*remainder_factor) for j in range(hp.DIM)] for k in range(hp.DIM)]
    Xi=complex_square(str(rr));J={}
    for n in range(-Kp,Kp+1):
        base=fam['A'] if n==0 else (J1[n]*Xi if n in (-1,1) else acb_mat(hp.DIM,hp.DIM))
        J[n]=base+acb_mat([[acb(arb(0,hp.up(eps[k][j]*(-rho0*abs(n)).exp())),
                    arb(0,hp.up(eps[k][j]*(-rho0*abs(n)).exp()))) for j in range(hp.DIM)] for k in range(hp.DIM)])
    phase={}
    for m in range(-C.K,C.K+1):
        phase[m]=[]
        for k in range(hp.DIM):
            rad=hp.up(abs(m)*(de[k] if m%2 else do[k])/nu**abs(m))
            phase[m].append(acb(0,m)*wmid[k][m+C.K]+acb(arb(0,rad),arb(0,rad)))
    for m in (-1,1):phase[m][hp.IV]=acb(0,hp._arb_q(Fraction(m,2)))
    fixed_phase=[[acb(0,m)*wmid[k][m+C.K] for m in range(-C.K,C.K+1)] for k in range(hp.DIM)]
    log('fresh Taylor/Cauchy complex-square coefficients radius=%s'%rr)
    return dict(J=J,SJ=[[arb(0)]*hp.DIM for _ in range(hp.DIM)],
        eps=[[hp.up(arb(2).sqrt()*e) for e in row] for row in eps],rho=rhoj,rho0=rho0,rhoe=rhoe,
        phase=phase,phase_radius=d_w,phase_centre=fixed_phase,C=C0,Kp=Kp,
        omega=acb(C0.om)+acb(arb(0,dom),arb(0,dom)),omega_error=hp.up(arb(2).sqrt()*dom),
        full_strip=cov.strip.full_strip,n_evals=cov.strip.n_evals,ec=Fraction(0),zero_profile_error=zero_error,
        shrink=dict(radius=str(rr),analytic_parent_radius=str(cov.parameter_radius),
          zero_identification='fresh central TheoremA family plus accepted exact zero identity',
          even_factor=hp.bound_rec(even),odd_factor=hp.bound_rec(odd),
          jacobian_route='J_H constant mode plus epsilon*D²f_H[w0,.] modes±1 plus Cauchy remainder',
          jacobian_remainder_factor=hp.bound_rec(remainder_factor),
          jacobian_difference_parent_sup=[[hp.bound_rec(v) for v in row] for row in Gsup],
          c_sup=[hp.bound_rec(v) for v in Mc],g_sup=hp.bound_rec(Mg),omega_sup=hp.bound_rec(Mo),
          w_odd_modes_sup=[hp.bound_rec(v) for v in Mwe],w_even_modes_sup=[hp.bound_rec(v) for v in Mwo],
          profile_tube=[hp.bound_rec(v) for v in t],g_tube=hp.bound_rec(dg)))


def radial_quotient_pilot(radius='1/500',log=print,*,shrink=None):
    start=time.monotonic()
    branch,C,cov,obj,rec=complex_branch_pilot(radius,log,_objects=True)
    with hp.am.precision(192):
        F=(shrunk_quotient_coefficients(C,cov,obj,radius=shrink,log=log) if shrink is not None
           else quotient_coefficients(C,cov,obj,log=log))
        eta=[rec['eta'][0],rec['eta'][0]]+rec['eta'][hp.CW:]
        radial=quotient_eigenpair(F,eta=eta,r_star='1',weight_search=True,log=log)
    sign=None;leading=None
    if radial['zero_identification'] is not None:
        leading=leading_coefficient(192,log)
        bl=hp.hex_fraction(leading['radial_exponent_quadratic_coefficient']['lower'])
        bh=hp.hex_fraction(leading['radial_exponent_quadratic_coefficient']['upper'])
        M=hp.hex_fraction(radial['physical_exponent_disk_radius']);R=rational(shrink)
        if not bl<=bh<0 or M<max(abs(bl),abs(bh))*R**2:
            raise hp.ProofFailure('radial disk sup and cubic coefficient are inconsistent')
        for k in range(1,129):
            e=R/Fraction(2)**k;err=M*e**2/(R**4*(1-(e/R)**2))
            c=-bh-err
            if c>=-bh/2:
                sign=dict(ok=True,scope='radial Floquet exponent only; other16 not certified',
                    analytic_radius=str(R),exponent_disk_sup=str(M),e0=str(e),
                    zero_endpoint_excluded=True,leading_coefficient=[str(bl),str(bh)],
                    scaled_remainder_upper=str(err),decay_coefficient=str(c),
                    physical_exponent_upper='-decay_coefficient*epsilon^2',
                    model_stability_certified=False);break
        if sign is None:raise hp.ProofFailure('no positive radial Cauchy interval found within bounded search')
    assert_sources_current();assert_inputs_current(branch['inputs_sha256'])
    return dict(kind='hopf_local_radial_quotient_pilot',schema=1,model_stability_certified=False,
        sources_sha256=dict(SOURCES_SHA256),inputs_sha256=branch['inputs_sha256'],
        complex_branch=branch,radial_quotient=radial,shrink=F.get('shrink'),
        leading_coefficient=leading,radial_sign=sign,seconds=time.monotonic()-start)


def leading_coefficient(precision=192, log=print):
    """Fresh central-interval proof of the quadratic radial coefficient only."""
    if type(precision) is not int or not 128 <= precision <= 512:
        raise ValueError('precision must be an integer from 128 to 512')
    assert_sources_current()
    A,_,snapshot=accepted_inputs()
    start = time.monotonic()
    ga, gb = map(Fraction, A['gH_interval'])
    with hp.am.precision(precision):
        fh = hp.FloatHopf()
        fam = hp.jacobian_family(ga, gb, fh, precision)
        sp = hp.spectrum_on(fam, precision)
        dl, p = hp.dlambda_dg(fam, sp)
        if not dl.real < 0:
            raise hp.ProofFailure('fresh central transversality failed')
        cov = dict(gH_interval=[str(ga), str(gb)], famH=fam, spH=sp, p=p)
        L = hp.lyapunov_at_hopf(cov, prec=precision)
        q = list(sp['v'])
        norm_squared = sum(((x*x.conjugate()).real for x in q), arb(0))
        voltage_squared = (q[hp.IV]*q[hp.IV].conjugate()).real/norm_squared
        leading_exponent, leading_multiplier = leading_from_normalization(
            L['omega'], L['l1_scaled'], voltage_squared)
        if not sp['others_max_re'] < 0:
            raise hp.ProofFailure('fresh transverse Hopf spectrum unresolved')
        result = dict(kind='hopf_local_leading_coefficient_pilot', schema=1,
            status='central coefficient certified; explicit amplitude interval not certified',
            model_stability_certified=False, e0=None, precision=precision,
            source_sha256=dict(SOURCES_SHA256), inputs_sha256=snapshot,
            gH_interval=[str(ga), str(gb)],
            omega_H=hp._ball_rec(L['omega']), l1_scaled=hp._ball_rec(L['l1_scaled']),
            q_voltage_abs_squared_scaled_unit_norm=hp._ball_rec(voltage_squared),
            radial_exponent_quadratic_coefficient=hp._ball_rec(leading_exponent),
            radial_multiplier_quadratic_coefficient=hp._ball_rec(leading_multiplier),
            transverse_Hopf_real_part_upper=hp.bound_rec(sp['others_max_re']),
            normalization='fixed scaled TP06; a_1,V=epsilon/2; physical |Vhat_1|=epsilon/8 mV',
            derivative_convention='physical time cubic real coefficient equals omega_H*l1_scaled',
            seconds=time.monotonic()-start,
            missing_producer_gates=['complex_disk_blown_up_contraction',
                'real_branch_extension_identity', 'verified_disk_monodromy',
                'two_full_resolvent_contours_and_ranks', 'critical_trace_circle_sup',
                'away_from_zero_overlap'])
    assert_sources_current()
    assert_inputs_current(snapshot)
    log('fresh radial leading coefficient certified; e0 remains unset')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--complex-disk', type=str)
    parser.add_argument('--radial-quotient', type=str)
    parser.add_argument('--shrink', type=str)
    parser.add_argument('--precision', type=int, default=192)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    if sum((args.pilot,bool(args.complex_disk),bool(args.radial_quotient)))!=1:
        parser.error('choose --pilot, --complex-disk R or --radial-quotient R; full stability is unproduced')
    if args.shrink and not args.radial_quotient:parser.error('--shrink requires --radial-quotient')
    if args.out is not None and (args.out.exists() or args.out.is_symlink()
                                or ROOT.resolve() in args.out.resolve().parents):
        parser.error('pilot output must be a new external file; release data stays read-only')
    try:
        rec = (leading_coefficient(args.precision) if args.pilot else
               radial_quotient_pilot(args.radial_quotient,shrink=args.shrink) if args.radial_quotient else
               complex_branch_pilot(args.complex_disk))
    except hp.ProofFailure as exc:
        rec=dict(kind='hopf_local_failed_pilot',status='proof attempt failed',
                 model_stability_certified=False,sources_sha256=SOURCES_SHA256,
                 error=str(exc),diagnostic=getattr(exc,'diag',None))
    if args.out:
        with args.out.open('x') as stream:
            json.dump(rec, stream, indent=2, allow_nan=False, sort_keys=True)
            stream.write('\n')
    else:
        print(json.dumps(rec, indent=2, allow_nan=False, sort_keys=True))
    if rec['kind']=='hopf_local_failed_pilot':
        raise SystemExit(2)


if __name__ == '__main__':
    main()
