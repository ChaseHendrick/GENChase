# Same as fiber_follow.py but at a perturbed circulation vector (S = sum_{i<j} G_i G_j = 0 re-imposed),
# to check the fixed-Gamma one-parameter family is not special to the minimizer.
import json, mpmath as mp
mp.mp.dps = 40
d = json.load(open('../n-vortex/n4_cert60.json'))
G = [mp.mpf(g) for g in d['G']]
W0 = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['w']]
b0 = mp.mpf(d['b']); N = 4
# perturb G2 (index 1) by +3%, G3 (index 2) by -2%, then solve S=0 for G4 (index 3): S = s3 + G4*(G1+G2+G3)
G[1] *= mp.mpf('1.03'); G[2] *= mp.mpf('0.98')
s3 = G[0]*G[1] + G[0]*G[2] + G[1]*G[2]
G[3] = -s3/(G[0]+G[1]+G[2])
print('perturbed Gamma:', [mp.nstr(g, 12) for g in G], ' S =', mp.nstr(sum(G[i]*G[j] for i in range(N) for j in range(i+1, N)), 3))
def F(w, b):
    kap = mp.mpc(-1, b); out = []
    for j in range(N):
        s = sum(G[k]/(w[j]-w[k]) for k in range(N) if k != j)
        out.append(s - 2j*mp.pi*mp.conj(kap)*mp.conj(w[j]))
    return [f.real for f in out] + [f.imag for f in out]
def pack(w, b): return [w[0].real] + [w[i].real for i in range(1, N)] + [w[i].imag for i in range(1, N)] + [b]
def unpack(v): return [mp.mpc(v[0], 0)] + [mp.mpc(v[i], v[N-1+i]) for i in range(1, N)], v[-1]
def R(v):
    w, b = unpack(v); return F(w, b)
def solve(v, idx, val, iters=80):
    v = list(v); v[idx] = val
    free = [i for i in range(len(v)) if i != idx]
    lam = mp.mpf('1e-6')
    for it in range(iters):
        r = mp.matrix(R(v)); nr = mp.norm(r)
        if nr < mp.mpf('1e-34'): break
        J = mp.matrix(len(r), len(free)); h = mp.mpf('1e-18')
        for c, i in enumerate(free):
            vp = list(v); vp[i] += h; vm = list(v); vm[i] -= h
            rp, rm = R(vp), R(vm)
            for k in range(len(r)): J[k, c] = (rp[k]-rm[k])/(2*h)
        A = J.T*J
        for k in range(A.rows): A[k, k] += lam*A[k, k]
        dx = mp.lu_solve(A, -(J.T*r))
        vn = list(v)
        for c, i in enumerate(free): vn[i] += dx[c]
        if mp.norm(mp.matrix(R(vn))) < nr: v = vn; lam /= 10
        else: lam *= 10
    return v, mp.norm(mp.matrix(R(v)))
v0 = pack(W0, b0)
v1, res = solve(v0, 1, v0[1])
print('base solve residual', mp.nstr(res, 3), ' P =', mp.nstr(unpack(v1)[1]/2, 15))
for dv in ['-0.02', '-0.01', '0.01', '0.02']:
    v, res = solve(v1, 1, v1[1] + mp.mpf(dv))
    w, b = unpack(v); kap = mp.mpc(-1, b)
    zd = [mp.conj(sum(G[k]/(w[j]-w[k]) for k in range(N) if k != j)/(2j*mp.pi)) for j in range(N)]
    Gt = sum(G); zc = sum(G[j]*w[j] for j in range(N))/Gt
    spread = max(abs(zd[j]/(w[j]-zc) - kap) for j in range(N))
    L = sum(G[j]*abs(w[j]-zc)**2 for j in range(N))
    print(f'dRe(w2)={dv:>6}  res={mp.nstr(res,3)}  P={mp.nstr(b/2,15)}  spread={mp.nstr(spread,3)}  |zc|={mp.nstr(abs(zc),3)}  L={mp.nstr(L,3)}')
