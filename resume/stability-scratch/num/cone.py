import numpy as np, json, sys
from ev import Df, E, rest, K, A0
blk = json.load(open('/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/data/closing_block_18.5_El10.613.json'))
T0 = np.array([[float.fromhex(v) for v in r] for r in blk['T_hex']]); W0 = np.array(blk['weights'], float)
M0 = np.diag(W0) @ T0; M0i = np.linalg.inv(M0); rho, r = blk['rho'], blk['r']
rng = np.random.default_rng(1)
def sample_B0(N, rho=rho, r=r, z1max=None):
    z = rng.normal(size=(N, 4)); z /= np.linalg.norm(z, axis=1)[:, None]
    rad = rho*rng.random(N)**0.25; rad[:N//3] = rho
    z *= rad[:, None]
    z1 = rng.uniform(-1, 1, N)*(r if z1max is None else z1max)
    Z = np.column_stack([z1, z])
    return [rest + M0i @ zz for zz in Z]
X = sample_B0(4000)
Dg = np.diag([1, -1, -1, -1, -1.])
def Mof(lam, w):
    A = A0 + lam*E
    ev, V = np.linalg.eig(A)
    order = np.argsort(-ev.real)   # unstable first
    V = V[:, order]
    V = V / V[0, :]                 # u-component 1
    Ti = np.linalg.inv(V)
    return np.diag(w) @ Ti, ev[order]
def margin(lam, w, X=X):
    M, ev = Mof(lam, w); Mi = np.linalg.inv(M)
    worst = 1e9
    for x in X:
        A = M @ (Df(x) + lam*E) @ Mi
        H = Dg @ A + A.conj().T @ Dg
        e = np.linalg.eigvalsh(H).min()
        worst = min(worst, e)
    return worst
if __name__ == '__main__':
    lam = complex(sys.argv[1]) if len(sys.argv) > 1 else 0
    # at lam=0 with stored M0:
    worst = 1e9
    for x in X:
        A = M0 @ Df(x) @ M0i; H = Dg @ A + A.T @ Dg; worst = min(worst, np.linalg.eigvalsh(H).min())
    print('stored M0, lam=0: min eig', worst)
    print('eigenbasis weights (10,7,1,1,40) at lam', lam, margin(lam, W0, X[:1000]))
