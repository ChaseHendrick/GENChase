# KKT Newton refinement at high precision, own code; then second-order check two ways.
import sys, json
from mpmath import mp, mpf, mpc, matrix, lu_solve, svd_r, eigsy, sqrt, nstr, pi
import model

mp.dps = int(sys.argv[1]) if len(sys.argv) > 1 else 110
N = 4
F = model.lambdas(N, 'mpmath', hessian=True)
nv = 3 * N  # g2..gN (N-1), 2N coords, b -> 3N
nc = 2 * N + 1

G0 = ['0.167391431853814697651119608287', '0.104133188036199454472762981869', '-0.227251300382913963570471483562']
Z0 = [('0.0166495669172171320379784913405', '0'),
      ('-0.219122640223164016964857201527', '-0.329067622006817416107926375746'),
      ('-0.157987430012178450886765481268', '-0.286475993427200078671522237774'),
      ('-0.160533384304821086375863705901', '-0.373660167280816436844027021713')]
x = [mpf(s) for s in G0] + [mpf(c) for p in Z0 for c in p] + [mpf('1.59579356775972696153521174364')]

def C(x):
    return matrix(F['C'](*x))
def J(x):
    return matrix(F['J'](*x))

# initial multipliers: least squares J^T lam = -e_b
def lsq_lam(x):
    Jm = J(x)
    eb = matrix(nv, 1); eb[nv - 1] = 1
    A = Jm * Jm.T
    return lu_solve(A, -(Jm * eb))

lam = lsq_lam(x)
for it in range(40):
    Jm = J(x)
    Cv = C(x)
    H = matrix(F['H'](*(list(x) + [lam[i] for i in range(nc)])))
    eb = matrix(nv, 1); eb[nv - 1] = 1
    r1 = eb + Jm.T * lam
    K = matrix(nv + nc, nv + nc)
    rhs = matrix(nv + nc, 1)
    for i in range(nv):
        for j in range(nv):
            K[i, j] = H[i, j]
        for j in range(nc):
            K[i, nv + j] = Jm[j, i]
        rhs[i] = -r1[i]
    for i in range(nc):
        for j in range(nv):
            K[nv + i, j] = Jm[i, j]
        rhs[nv + i] = -Cv[i]
    d = lu_solve(K, rhs)
    x = [x[i] + d[i] for i in range(nv)]
    lam = matrix([lam[i] + d[nv + i] for i in range(nc)])
    res = max(max(abs(v) for v in r1), max(abs(v) for v in Cv))
    step = max(abs(v) for v in d)
    print(it, 'res', nstr(res, 3), 'step', nstr(step, 3), flush=True)
    if res < mpf(10) ** (-(mp.dps - 8)) and it > 2:
        break

b = x[-1]
print('b =', nstr(b, mp.dps - 10))
print('P =', nstr(b / 2, mp.dps - 10))
# Singular values of J (should be full rank nc = 2N+1 with our independent equation set)
Jm = J(x)
U, S, V = svd_r(Jm, full_matrices=True)
print('sing vals J', [nstr(s, 5) for s in S])
# Null space basis: rows of V beyond nc
Zb = matrix(nv, nv - nc)
for k in range(nv - nc):
    for i in range(nv):
        Zb[i, k] = V[nc + k, i]
H = matrix(F['H'](*(list(x) + [lam[i] for i in range(nc)])))
Hr = Zb.T * H * Zb
E, Q = eigsy(Hr)
print('reduced Hessian eigenvalues (orthonormal tangent basis in these coordinates):', [nstr(e, 8) for e in E])
json.dump({'dps': mp.dps, 'x': [str(v) for v in x], 'lam': [str(lam[i]) for i in range(nc)],
           'b': str(b), 'P': str(b / 2), 'redHess': [str(e) for e in E]},
          open('kkt_mp_%d.json' % mp.dps, 'w'), indent=1)
