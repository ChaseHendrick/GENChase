import numpy as np
from ev import A0, K, phi
# space-clamped 4x4 at rest (u, m, n, h): u_t = -I; from A0: row1 = K*(Iu, 1, Im, In, Ih) -> -I derivatives = -(row1)/K without the w entry
B = np.zeros((4,4))
B[0,0] = -A0[1,0]/K; B[0,1:] = -A0[1,2:]/K
B[1:,0] = A0[2:,0]; B[1:,1:] = A0[2:,2:]
print(B)
best = -1e9
for s in np.concatenate([np.linspace(0, 5, 2001), np.logspace(0.7, 6, 400)]):
    M = B.copy(); M[0,0] -= s
    a = np.linalg.eigvals(M).real.max()
    if a > best: best, sb = a, s
print('max spectral abscissa', best, 'at s', sb)
for s in [0, 0.1, 0.3, 1, 3, 10, 100, 1e4]:
    M = B.copy(); M[0,0] -= s; print(s, np.sort_complex(np.linalg.eigvals(M)))
