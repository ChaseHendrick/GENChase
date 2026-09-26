import numpy as np, sys
sys.path.insert(0,'.')
N=8
def hess(z):
    H = np.eye(2 * N)
    for i in range(N):
        for j in range(i + 1, N):
            d = z[i] - z[j]; dx, dy = d.real, d.imag; r2 = dx * dx + dy * dy
            B = np.array([[dx * dx - dy * dy, 2 * dx * dy], [2 * dx * dy, dy * dy - dx * dx]]) / r2 ** 2
            for (a, b, s) in ((i, i, 1), (j, j, 1), (i, j, -1), (j, i, -1)):
                H[a, b] += s * B[0, 0]; H[a, N + b] += s * B[0, 1]
                H[N + a, b] += s * B[1, 0]; H[N + a, N + b] += s * B[1, 1]
    return H
z0 = np.array([0]+[2*np.exp(2j*np.pi*k/7) for k in range(7)])
x0 = np.concatenate([z0.real,z0.imag])
Jx = np.concatenate([-z0.imag, z0.real]); Jx/=np.linalg.norm(Jx)
P = np.eye(16)-np.outer(Jx,Jx)
Q = np.linalg.svd(P)[0][:, :15]  # basis of slice
rng=np.random.default_rng(0)
H0=Q.T@hess(z0)@Q; w,V=np.linalg.eigh(H0); print('slice eig', np.round(w,4))
rs=[]
for t in range(400):
    v = Q@rng.normal(size=15) if t%2 else Q@V[:, rng.integers(0,3)]*(1 if rng.random()<.5 else -1)
    v/=np.linalg.norm(v)
    r=0
    while r<3:
        r+=0.005
        x=x0+r*v; z=x[:N]+1j*x[N:]
        if np.linalg.eigvalsh(Q.T@hess(z)@Q)[0]<=0: break
    rs.append(r)
rs=np.array(rs); print('PD radius along rays: min %.3f  median %.3f  (soft-mode rays min %.3f)'%(rs.min(), np.median(rs), rs[0::2].min()))
