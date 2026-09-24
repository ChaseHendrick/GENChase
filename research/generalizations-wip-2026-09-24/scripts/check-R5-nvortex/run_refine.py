import sys, json, time, mpmath as mp
from core import all_explorer_configs, diagnose_mp
from kkt_mp import normalize, kkt_refine, reduced_hessian, unpack
name = sys.argv[1]; dps = int(sys.argv[2]); iters = int(sys.argv[3]) if len(sys.argv) > 3 else 8
cfg = dict(all_explorer_configs())[name]
G, z = cfg; N = len(G)
t0 = time.time()
X, j0, j1 = normalize(G, z, dps)
mp.mp.dps = dps
X, lam, hist = kkt_refine(X, N, j0, j1, dps=dps, iters=iters)
ev, sv, rank, stat = reduced_hessian(X, lam, N, j0, j1)
zz, GG, kap = unpack(X, N)
d = diagnose_mp(GG, zz, dps=dps)
out = dict(name=name, N=N, dps=dps, P=mp.nstr(d['P'], dps - 10), P_from_ki=mp.nstr(abs(kap.imag) / 2, dps - 10),
           selfsim_res=mp.nstr(d['res'], 3), S_rel=mp.nstr(d['S_rel'], 3), L_rel=mp.nstr(d['L_rel'], 3),
           collapse=d['collapse'], kappa=mp.nstr(d['kappa'], 20), Gmin_rel=mp.nstr(d['Gmin_rel'], 5), dmin_rel=mp.nstr(d['dmin_rel'], 5),
           stationarity=mp.nstr(stat, 3), rankJ=rank, nfree=3 * N - 1, tangent_dim=3 * N - 1 - rank,
           min_sv=mp.nstr(min(sv), 5), hess_eigs=[mp.nstr(e, 6) for e in ev],
           G=[mp.nstr(g, dps - 10) for g in GG], z=[[mp.nstr(w.real, dps - 10), mp.nstr(w.imag, dps - 10)] for w in zz],
           secs=round(time.time() - t0, 1))
json.dump(out, open('ref_%s_N%d.json' % (name.replace('/', '_').replace('[', '_').replace(']', ''), N), 'w'), indent=1)
for k in ['name', 'N', 'P', 'P_from_ki', 'selfsim_res', 'S_rel', 'L_rel', 'collapse', 'kappa', 'Gmin_rel', 'dmin_rel', 'stationarity', 'rankJ', 'tangent_dim', 'min_sv', 'secs']:
    print(k, out[k])
print('hess_eigs', out['hess_eigs'])
