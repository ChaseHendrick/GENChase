import os, sys, time
os.chdir('/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/code'); sys.path.insert(0, '.')
import numpy as np
import stab_large as SL, stab_region as SR
from flint import arb, acb, ctx, acb_mat, arb_mat
T = 18.5
R = SR.Region(T)
fm = SL.float_model(T)
N, M, Js = fm
cell = (-0.1, 0.4, 100.0, 105.0)
lc = complex(-0.1 + 0.125, 102.5)
m, w = N.best_weights(M, lc, Js, N.STARTS)
Mf = N.eig_coords(M, lc, w)
Mx, Mi = SL.coords_matrix(Mf)
lam = SL.rect(*cell)
j = 466
for a, b in [(0.984375, 1.0), (0.9990234375, 1.0)]:
    yb = R.path_box(j, arb(a), arb(b))
    print('box', [v.str(8) for v in yb])
    J = SR.jac5(yb, R.Kball, R.phi, R.EL)
    Jm = acb_mat(arb_mat(J))
    At = Mx * Jm * Mi + Mx * SL.E_matrix(R.Kball) * Mi * lam
    H = SL.cone_H(At)
    Hm = np.array([[complex(float(H[i,k].real.mid()), float(H[i,k].imag.mid())) for k in range(5)] for i in range(5)])
    Hr = np.array([[max(float(H[i,k].real.rad()), float(H[i,k].imag.rad())) for k in range(5)] for i in range(5)])
    print('mid eig', np.linalg.eigvalsh((Hm + Hm.conj().T)/2).round(3))
    print('max radius', Hr.max(), 'diag', np.diag(Hm).real.round(3))
    print('pd?', SL.hermitian_pd(H))
    # float margin at the box midpoint and at the lambda corners
    ym = np.array([float(v.mid()) for v in yb])
    for l in [complex(-0.1, 100), complex(0.4, 105), lc]:
        print('  float margin at', l, SL.np.linalg.eigvalsh(SL.np.array(N.DG) @ (Mf @ (M.Df(ym) + l*M.E) @ np.linalg.inv(Mf)) + ((Mf @ (M.Df(ym) + l*M.E) @ np.linalg.inv(Mf))).conj().T @ N.DG).min())
