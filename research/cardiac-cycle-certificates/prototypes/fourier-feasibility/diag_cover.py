import sys, time
sys.path.insert(0, '/home/user/GENChase/research/cardiac-cycle-certificates/fourier')
import bench_strip as B, fourier_eval as fe, arbmodel as am
from tp06_18d import NAMES
from flint import acb, arb
phi, T, res, hist = B.refine_orbit(B.DEFAULT_NPZ, log=lambda *a: None)
import pickle
pickle.dump([[ (c.real.mid().str(40, radius=False), c.imag.mid().str(40, radius=False)) for c in row] for row in phi.coeffs], open(sys.argv[2], 'wb'))
for prec in (53, 80):
    prm = am.params(prec)
    f = lambda z: am.f(z, prm, prec=prec)
    st = fe.strip_sup(f, phi, float(sys.argv[1]), rtol=1.0, max_evals=20000, prec=prec)
    print('prec', prec, 'evals', st.n_evals, 'unres', st.n_unresolved, f'{st.seconds:.1f}s')
    for i in range(18):
        print(f'  {NAMES[i]:6s} S {float(st.S[i].mid()):.3e} L {float(st.L[i].mid()):.3e}')
    # a thin point evaluation at theta=0 for reference
    z = phi.eval(acb(0))
    y = f(z)
    print('  point rel radius', ' '.join(f'{float(v.rad())/max(float(abs(v.mid())),1e-300):.1e}' for v in y))
