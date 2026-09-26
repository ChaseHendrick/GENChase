# block_lemma.py -- the isolating block N around rest: exact verification of (P1) cone condition,
# (P2) inflow on the b-faces, (P3) outflow on the a-faces, for all kappa in [1/c2, 1/c1] and all
# states in N.  See BLOCK.md, section 2 (lemma and proof).
#
# Run:   python3 block_lemma.py            (main check, r = 1/80; then the negative controls)
# Time:  about 2 s.
#
# Method.  Block coordinates z = (a, b) = Ti y, y = x - x*, T = T_blk exact dyadic, Ti = T^{-1}
# exact rational.  In N = {|a| <= r, |b|_2 <= r} the vector field is EXACTLY z' = A(s, kap) z with
# A(s, kap) = Ti J(s, kap) T and s = (S(U) - S(0)) / U in [S'(-Umax), S'(Umax)] (mean value theorem;
# S' is increasing on (-inf, theta) and Umax < theta), because the U-row of T is (1,1,1,1), so
# |U| <= |a| + |b|_1 <= r (1 + sqrt 3) <= Umax.  J is affine in (s, kap), so each symmetric matrix
# below is affine in (s, kap); lambda_min is concave on symmetric matrices, hence its minimum over the
# parameter box is attained at one of the four vertices.  At each vertex the matrix is an exact
# rational matrix and positive definiteness is decided exactly by Sylvester's criterion (all leading
# principal minors > 0, computed in fmpq).  No floating point enters any decision.
import sys, time
from flint import arb, fmpq, fmpq_mat
import blk_common as B

def pd(M):
    """exact Sylvester test for a symmetric fmpq_mat"""
    n = M.nrows()
    for k in range(1, n + 1):
        sub = fmpq_mat([[M[i, j] for j in range(k)] for i in range(k)])
        if not sub.det() > 0:
            return False
    return True

def sym(M):
    return fmpq_mat([[(M[i, j] + M[j, i]) / 2 for j in range(M.ncols())] for i in range(M.nrows())])

def matrices(A, mu, mu2):
    """(P1) M1 = G A + A^T G, G = diag(1,-1,-1,-1);  (P2) H2 = [[-mu, A_ba^T],[A_ba, A_bb + A_bb^T + mu I]]
    must be NEGATIVE definite;  (P3) H3 = [[A_aa - mu2, A_ab/2],[A_ab^T/2, mu2 I]] positive definite."""
    G = fmpq_mat([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, -1]])
    M1 = G * A + A.transpose() * G
    H2 = fmpq_mat(4, 4)
    H2[0, 0] = -mu
    for i in range(1, 4):
        H2[i, 0] = A[i, 0]; H2[0, i] = A[i, 0]
        for j in range(1, 4):
            H2[i, j] = A[i, j] + A[j, i] + (mu if i == j else 0)
    H3 = fmpq_mat(4, 4)
    H3[0, 0] = A[0, 0] - mu2
    for i in range(1, 4):
        H3[0, i] = A[0, i] / 2; H3[i, 0] = A[0, i] / 2; H3[i, i] = mu2
    return sym(M1), sym(H2), sym(H3)

def srange(r):
    Umax = r * (1 + fmpq(1732051, 10**6))          # 1.732051 > sqrt 3
    assert Umax < B.THETA
    lo = B.Sp_arb(arb(-Umax)); hi = B.Sp_arb(arb(Umax))
    s_lo = fmpq(int((lo.lower() * 2**80).floor().unique_fmpz()), 2**80)
    s_hi = fmpq(int((hi.upper() * 2**80).ceil().unique_fmpz()), 2**80)
    return Umax, s_lo, s_hi

def check(r, mu=fmpq(1, 10), mu2=fmpq(1, 2), margins=(fmpq(1, 10), fmpq(1, 50), fmpq(1, 5)),
          kaps=None, T=None, Ti=None, verbose=True):
    """returns True iff (P1)-(P3) hold with the given margins at all four vertices"""
    if T is None:
        T, Ti, _ = B.block_matrix(1 / arb(B.C1))
    if kaps is None:
        kaps = B.kappa_range()
    Umax, s_lo, s_hi = srange(r)
    I4 = fmpq_mat([[1 if i == j else 0 for j in range(4)] for i in range(4)])
    m1, m2, m3 = margins
    allok = True
    for s in (s_lo, s_hi):
        for k in kaps:
            M1, H2, H3 = matrices(B.A_exact(T, Ti, s, k), mu, mu2)
            ok1 = pd(M1 - m1 * I4); ok2 = pd(-H2 - m2 * I4); ok3 = pd(H3 - m3 * I4)
            if verbose:
                kn = "1/c2" if k == B.kappa_range()[0] else ("1/c1" if k == B.kappa_range()[1] else str(k))
                print(f"  vertex s={float(s):.6f} kappa={kn}: (P1) M1 - {m1} I PD: {ok1};"
                      f" (P2) -H2 - {m2} I PD: {ok2}; (P3) H3 - {m3} I PD: {ok3}")
            allok &= ok1 and ok2 and ok3
    if verbose:
        print(f"  r = {r}  Umax = {float(Umax):.6f}  s in [{float(s_lo):.6f}, {float(s_hi):.6f}]  ->  {'ALL HOLD' if allok else 'FAILS'}")
    return allok

if __name__ == "__main__":
    t0 = time.time()
    T, Ti, lams = B.block_matrix(1 / arb(B.C1))
    print("T_blk (exact dyadic, U-row = 1):")
    for i in range(4):
        print("  ", [float(T[i, j]) for j in range(4)])
    print("A at s = S'(0), kappa = 1/c1 (should be near diag(lambda_u, lambda_slow, lambda_2, lambda_3)):")
    s0q = fmpq(int((B.s0.mid() * 2**80).floor().unique_fmpz()), 2**80)
    A0 = B.A_exact(T, Ti, s0q, 1 / B.C1)
    for i in range(4):
        print("  ", [f"{float(A0[i, j]): .3e}" for j in range(4)])
    print("\nMAIN CHECK: r = 1/80, mu = 1/10, mu2 = 1/2, margins m1 = 1/10, m2 = 1/50, m3 = 1/5")
    main = check(fmpq(1, 80), T=T, Ti=Ti)
    print("\nNEGATIVE CONTROLS (each must FAIL):")
    print(" (n1) block too large, r = 1/20 (s reaches the range where the cone condition breaks):")
    n1 = check(fmpq(1, 20), T=T, Ti=Ti)
    print(" (n2) r = 1/30:")
    n2 = check(fmpq(1, 30), T=T, Ti=Ti)
    print(" (n3) the PD test is not vacuous: margin m1 = 1 in (P1) (above lambda_min, about 0.22):")
    n3 = check(fmpq(1, 80), margins=(fmpq(1), fmpq(1, 50), fmpq(1, 5)), T=T, Ti=Ti)
    print(" (n4) mu = 3/10 in (P2) (larger than 2|lambda_slow| = 0.249, so the slow direction breaks):")
    n4 = check(fmpq(1, 80), mu=fmpq(3, 10), T=T, Ti=Ti)
    ctrl = not (n1 or n2 or n3 or n4)
    print(f"\nRESULT: main check {'PASSES' if main else 'FAILS'}; negative controls {'all fail as they should' if ctrl else 'NOT all fail'}"
          f"   ({time.time()-t0:.1f} s)")
