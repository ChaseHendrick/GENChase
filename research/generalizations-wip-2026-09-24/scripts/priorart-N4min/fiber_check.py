# Is the N=4 minimizer isolated at FIXED circulations, or on a 1-parameter family?
# Relevant to how Yu (arXiv 2111.07292, finiteness of 4-vortex collapse configurations) relates.
import json, mpmath as mp
mp.mp.dps = 60
d = json.load(open('../n-vortex/n4_cert60.json'))
G = [mp.mpf(g) for g in d['G']]
W = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['w']]
b0 = mp.mpf(d['b'])
N = 4
def F(w, b):
    kap = mp.mpc(-1, b)
    out = []
    for j in range(N):
        s = sum(G[k]/(w[j]-w[k]) for k in range(N) if k != j)
        out.append(s - 2j*mp.pi*mp.conj(kap)*mp.conj(w[j]))
    return [f.real for f in out] + [f.imag for f in out]
def vec2w(v):
    return [mp.mpc(v[i], v[N+i]) for i in range(N)]
v0 = [w.real for w in W] + [w.imag for w in W]
print('residual', max(abs(x) for x in F(W, b0)))
# Jacobian wrt (Re w, Im w, b) at fixed G
h = mp.mpf('1e-25')
cols = []
for i in range(2*N+1):
    vp = list(v0) + [b0]; vm = list(v0) + [b0]
    vp[i] += h; vm[i] -= h
    fp = F(vec2w(vp[:2*N]), vp[2*N]); fm = F(vec2w(vm[:2*N]), vm[2*N])
    cols.append([(a-c)/(2*h) for a, c in zip(fp, fm)])
J = mp.matrix(2*N, 2*N+1)
for i in range(2*N+1):
    for r in range(2*N):
        J[r, i] = cols[i][r]
U, S, V = mp.svd_r(J)
print('singular values of dF/d(w,b) at fixed Gamma:', [mp.nstr(s, 5) for s in S])
# also dF/dw alone
Jw = mp.matrix(2*N, 2*N)
for i in range(2*N):
    for r in range(2*N):
        Jw[r, i] = cols[i][r]
U2, S2, V2 = mp.svd_r(Jw)
print('singular values of dF/dw at fixed Gamma and b:', [mp.nstr(s, 5) for s in S2])
