"""High-precision feasibility certificate for a float64 configuration: minimum-norm Gauss-Newton projection onto
the self-similar manifold (kr=-1, G_j0=1, y_j1=0) in mpmath, then direct Biot-Savart diagnostics.
Usage: python3 certfeas.py contin.json N dps
"""
import sys, json
import mpmath as mp
from kkt_mp import residual, jacobian, normalize, free_indices, unpack
from core import diagnose_mp
fn, Nt, dps = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
rec = [r for r in json.load(open(fn)) if r['N'] == Nt][0]
mp.mp.dps = dps
G = [mp.mpf(g) for g in rec['G']]; z = [mp.mpc(a, b) for a, b in zip(rec['x'], rec['y'])]
N = len(G)
X, j0, j1 = normalize(G, z, dps)
fr = free_indices(N, j0, j1)
for it in range(6):
    R = residual(X, N)
    nr = max(abs(r) for r in R)
    print('it', it, 'res', mp.nstr(nr, 3), 'P', mp.nstr(abs(X[3 * N + 1]) / 2, 25), flush=True)
    if nr < mp.mpf(10) ** (-(dps - 6)):
        break
    J = jacobian(X, N)
    Jf = mp.matrix([[J[i][a] for a in fr] for i in range(2 * N)])
    y = mp.lu_solve(Jf * Jf.T, mp.matrix(R))
    d = Jf.T * y
    for a in range(len(fr)):
        X[fr[a]] -= d[a]
zz, GG, kap = unpack(X, N)
dg = diagnose_mp(GG, zz, dps=dps)
print('N', N, 'P', mp.nstr(dg['P'], 30), 'selfsim_res', mp.nstr(dg['res'], 3), 'S_rel', mp.nstr(dg['S_rel'], 3), 'L_rel', mp.nstr(dg['L_rel'], 3),
      'collapse', dg['collapse'], 'Gmin_rel', mp.nstr(dg['Gmin_rel'], 4), 'dmin_rel', mp.nstr(dg['dmin_rel'], 4), 'kappa', mp.nstr(dg['kappa'], 20))
json.dump(dict(N=N, dps=dps, P=mp.nstr(dg['P'], dps - 5), res=mp.nstr(dg['res'], 3), G=[mp.nstr(g, dps) for g in GG],
               z=[[mp.nstr(w.real, dps), mp.nstr(w.imag, dps)] for w in zz]), open('certfeas_N%d.json' % N, 'w'), indent=1)
