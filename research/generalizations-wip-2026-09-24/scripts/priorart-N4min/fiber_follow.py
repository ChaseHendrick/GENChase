# Follow the fixed-circulation family through the N=4 minimizer: vary b and re-solve F=0 with Gamma frozen.
import json, mpmath as mp
mp.mp.dps = 40
d = json.load(open('../n-vortex/n4_cert60.json'))
G = [mp.mpf(g) for g in d['G']]
W0 = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['w']]
b0 = mp.mpf(d['b']); N = 4
def F(w, b):
    kap = mp.mpc(-1, b); out = []
    for j in range(N):
        s = sum(G[k]/(w[j]-w[k]) for k in range(N) if k != j)
        out.append(s - 2j*mp.pi*mp.conj(kap)*mp.conj(w[j]))
    return [f.real for f in out] + [f.imag for f in out]
# unknowns: Re w1 (Im w1 = 0 gauge), Re/Im w2..w4 -> 7 ; plus b  -> 8 unknowns, 8 equations
def pack(w, b): return [w[0].real] + [w[i].real for i in range(1, N)] + [w[i].imag for i in range(1, N)] + [b]
def unpack(v): return [mp.mpc(v[0], 0)] + [mp.mpc(v[i], v[N-1+i]) for i in range(1, N)], v[-1]
def R(v):
    w, b = unpack(v); return F(w, b)
def newton_fixed_coord(v, idx, val, iters=60):
    # replace unknown idx by fixed value val (continuation parameter); solve remaining 7 unknowns by Gauss-Newton on 8 eqs
    v = list(v); v[idx] = val
    free = [i for i in range(len(v)) if i != idx]
    for it in range(iters):
        r = mp.matrix(R(v))
        if mp.norm(r) < mp.mpf('1e-35'): break
        J = mp.matrix(len(r), len(free)); h = mp.mpf('1e-20')
        for c, i in enumerate(free):
            vp = list(v); vp[i] += h; vm = list(v); vm[i] -= h
            rp, rm = R(vp), R(vm)
            for k in range(len(r)): J[k, c] = (rp[k]-rm[k])/(2*h)
        dx = mp.lu_solve(J.T*J, -(J.T*r))
        for c, i in enumerate(free): v[i] += dx[c]
    return v, mp.norm(mp.matrix(R(v)))
v0 = pack(W0, b0)
print('b0 =', mp.nstr(b0, 20), ' P0 =', mp.nstr(b0/2, 20))
# continuation in Re(w2) (index 1) at fixed Gamma, b free
for dv in ['-0.02', '-0.01', '-0.005', '0', '0.005', '0.01', '0.02']:
    v, res = newton_fixed_coord(v0, 1, v0[1] + mp.mpf(dv))
    w, b = unpack(v)
    # validate: Biot-Savart velocities / positions constant
    kap = mp.mpc(-1, b)
    zd = [mp.conj(sum(G[k]/(w[j]-w[k]) for k in range(N) if k != j)/(2j*mp.pi)) for j in range(N)]
    ratios = [zd[j]/w[j] for j in range(N)]
    spread = max(abs(r - kap) for r in ratios)
    print(f'dRe(w2)={dv:>7}  res={mp.nstr(res,3)}  b={mp.nstr(b,15)}  P={mp.nstr(b/2,15)}  spread={mp.nstr(spread,3)}  P-P0={mp.nstr(b/2-b0/2,5)}')
