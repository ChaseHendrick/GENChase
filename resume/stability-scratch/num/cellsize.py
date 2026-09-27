import sys, numpy as np
sys.path.insert(0, '/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/code')
import os; os.chdir('/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/code')
import stab_num as N
M = N.Model(18.5)
xs = np.concatenate([np.linspace(-3, 1.5, 3000), np.linspace(1.5, 30, 1500)])
Js = np.array([M.Df(y) for y in M.S(xs).T])
def marg(lamc, w, lam):
    C = N.eig_coords(M, lamc, w); Ci = np.linalg.inv(C)
    A = C[None] @ (Js + lam*M.E) @ Ci[None]
    H = N.DG[None] @ A + np.conj(np.transpose(A,(0,2,1))) @ N.DG[None]
    return np.linalg.eigvalsh(H).min()
for lamc in [complex(sys.argv[1])]:
    m, w = N.best_weights(M, lamc, Js, N.STARTS)
    print('centre', lamc, 'margin', m, 'w', w)
    for d in [0.5, 1, 2, 5, 10, 20, 40]:
        worst = min(marg(lamc, w, lamc + d*np.exp(1j*t)) for t in np.linspace(0, 2*np.pi, 9))
        print('  radius', d, 'worst margin', round(worst, 4), flush=True)
