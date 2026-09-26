"""Salnikov's printed matrices (arXiv:1303.4904 v2, p. 2-3), transcribed from the TeX source, and
elementary checks on them (numerical, 2-decimal data)."""
import numpy as np
M1 = np.array([
    [20.72 - 17.12j, 15.79 - 1.34j, 4.94 + 29.46j, -14.55 + 10.90j],
    [-17.67 + 12.78j, -12.24 - 0.06j, -1.93 - 24.87j, 12.91 - 7.99j],
    [12.28 + 6.91j, 3.55 + 7.78j, -13.07 + 7.86j, -8.18 - 5.42j],
    [-11.84 - 12.56j, -1.31 - 10.39j, 19.32 - 4.06j, 8.59 + 9.31j]])
M2 = np.array([
    [-18.72 - 17.12j, -15.79 - 1.34j, -4.94413 + 29.46j, 14.55 + 10.90j],
    [17.67 + 12.78j, 14.24 - 0.06j, 1.92944 - 24.87j, -12.91 - 7.99j],
    [-12.28 + 6.91j, -3.55 + 7.78j, 15.0698 + 7.86j, 8.18 - 5.42j],
    [11.84 - 12.56j, 1.31 - 10.39j, -19.319 - 4.06j, -6.59 + 9.31j]])
if __name__ == '__main__':
    np.set_printoptions(precision=3, suppress=True, linewidth=160)
    for n, M in (('M1', M1), ('M2', M2)):
        print(n, 'det', np.linalg.det(M), 'trace', np.trace(M))
        print('  eig', np.linalg.eigvals(M))
        N = M - np.eye(4)
        print('  rank-ish singular values of M - I', np.linalg.svd(N, compute_uv=False))
        print('  sv of (M-I)^2', np.linalg.svd(N @ N, compute_uv=False))
    C = M1 @ M2 - M2 @ M1
    print('||[M1,M2]|| =', np.linalg.norm(C), ' ||M1|| ||M2|| =', np.linalg.norm(M1) * np.linalg.norm(M2))
    A = (M1 - M2) / 2; B = ((M1 + M2) / 2 - np.eye(4)) / 1j
    print('A real part max imag', np.abs(A.imag).max(), 'B max imag', np.abs(B.imag).max())
    print('M1 M2', M1 @ M2)
