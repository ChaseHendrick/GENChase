"""Fourth-order Birkhoff normal form of a 2-degree-of-freedom Hamiltonian at an elliptic
equilibrium, with generic coefficients (Python float/complex, or python-flint arb/acb balls).

Input: the Taylor coefficients of H in canonical variables x = (q_a, p_a, q_b, p_b)
(dq_a^dp_a + dq_b^dp_b), as homogeneous parts H2, H3, H4 {exponent: coeff}.

Steps (every one is a closed-form expression, so ball arithmetic encloses the exact result):
 1. M = J S (S = Hessian).  Its characteristic polynomial is x^4 + e2 x^2 + e4 (Hamiltonian
    matrix).  Linear stability with distinct frequencies <=> e2 > 0, e4 > 0,
    disc = e2^2 - 4 e4 > 0; then w1^2 = (e2 + sqrt disc)/2 > w2^2 = (e2 - sqrt disc)/2 > 0.
 2. Eigenvector of M for i w_k: a nonzero column of adj(M - i w_k I).  With e = a + i b,
    kappa = a^T J b != 0; scale by |kappa|^(-1/2) and flip b if kappa < 0.  T = [a1 b1 a2 b2]
    is then exactly symplectic and H2(T X) = (1/2) s1 w1 (Q1^2+P1^2) + (1/2) s2 w2 (Q2^2+P2^2),
    s_k = sign(kappa_k) (the Krein signatures).
 3. xi = (Q + i P)/sqrt 2, eta = (Q - i P)/sqrt 2, {xi, eta} = -i, tau = xi eta = (Q^2+P^2)/2.
    H2 = s1 w1 tau1 + s2 w2 tau2.  For a monomial xi^a eta^b, {xi^a eta^b, H2} =
    -i <s w, a - b> xi^a eta^b.
 4. Lie transform with generator W3, {H2, W3} = -H3 (needs <s w, k> != 0 for |k| = 1, 3):
    w_ab = i h_ab / <s w, a - b>.  New quartic K4 = H4 + (1/2){H3, W3}; its resonant part
    (a = b) is A tau1^2 + B tau1 tau2 + C tau2^2.  The remaining quartic monomials are removable
    iff <s w, k> != 0 for 0 < |k| <= 4, k = a - b, which is certified too.
 5. Arnold's determinant (on the line H2 = 0 of the positive action quadrant, only meaningful
    when s1 != s2):  D = A w2^2 + B w1 w2 + C w1^2.
"""
from itertools import product


class CR:
    """Complex coefficient ring."""

    def __init__(self, kind):
        self.kind = kind
        if kind == 'float':
            import cmath, math
            self.c = complex
            self.r = float
            self.sqrt = lambda x: x ** 0.5 if not isinstance(x, complex) else cmath.sqrt(x)
            self.I = 1j
            self.re = lambda z: z.real
            self.im = lambda z: z.imag
        elif kind == 'cf2':
            from flint import arb, acb
            from cf import CF2, cplx2
            self.c = cplx2
            self.r = lambda x: CF2.const(arb(x))
            self.sqrt = lambda x: x.sqrt()
            self.I = CF2.const(acb(0, 1))
            self.re = lambda z: z.real
            self.im = lambda z: z.imag
        elif kind == 'cf':
            from flint import arb, acb
            from cf import CF, cplx
            self.c = cplx
            self.r = lambda x: CF.const(arb(x))
            self.sqrt = lambda x: x.sqrt()
            self.I = CF.const(acb(0, 1))
            self.re = lambda z: z.real
            self.im = lambda z: z.imag
        else:
            from flint import arb, acb
            self.c = lambda x, y=0: acb(x, y)
            self.r = arb
            self.sqrt = lambda x: x.sqrt()
            self.I = acb(0, 1)
            self.re = lambda z: z.real
            self.im = lambda z: z.imag


# ---------- small dict polynomials in 4 variables ----------

def padd(p, q, s=1):
    out = dict(p)
    for e, c in q.items():
        out[e] = out[e] + c * s if e in out else c * s
    return out


def pmul(p, q):
    out = {}
    for e1, c1 in p.items():
        for e2, c2 in q.items():
            e = tuple(x + y for x, y in zip(e1, e2))
            out[e] = out[e] + c1 * c2 if e in out else c1 * c2
    return out


def pscale(p, s):
    return {e: c * s for e, c in p.items()}


def pderiv(p, k):
    out = {}
    for e, c in p.items():
        if e[k] > 0:
            f = list(e)
            f[k] -= 1
            out[tuple(f)] = c * e[k]
    return out


def compose_linear(p, L, zero):
    """p(x) with x_i = sum_j L[i][j] X_j."""
    lin = [{tuple(1 if t == j else 0 for t in range(4)): L[i][j] for j in range(4)} for i in range(4)]
    out = {}
    for e, c in p.items():
        term = {(0, 0, 0, 0): c}
        for i in range(4):
            for _ in range(e[i]):
                term = pmul(term, lin[i])
        out = padd(out, term)
    return out


# ---------- linear algebra helpers ----------

def det3(m):
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))


def det4(m):
    s = 0
    for j in range(4):
        minor = [[m[i][k] for k in range(4) if k != j] for i in range(1, 4)]
        t = m[0][j] * det3(minor)
        s = s + t if j % 2 == 0 else s - t
    return s


def adj_col(m, col):
    """Column `col` of adj(m): adj[i][col] = (-1)^(i+col) det(minor(col, i))."""
    out = []
    for i in range(4):
        minor = [[m[r][k] for k in range(4) if k != i] for r in range(4) if r != col]
        d = det3(minor)
        out.append(d if (i + col) % 2 == 0 else -d)
    return out


Jm = [[0, 1, 0, 0], [-1, 0, 0, 0], [0, 0, 0, 1], [0, 0, -1, 0]]


def hessian(H2, zero):
    S = [[zero] * 4 for _ in range(4)]
    for e, c in H2.items():
        ks = [k for k in range(4) for _ in range(e[k])]
        a, b = ks
        if a == b:
            S[a][a] = c * 2
        else:
            S[a][b] = c
            S[b][a] = c
    return S


def is_pos(x):
    return x > 0


def is_nonzero(x):
    return (x > 0) or (x < 0)


class Refused(Exception):
    pass


def symplectic_gram_schmidt(cols, one):
    """Exactly symplectic basis (a1, b1, a2, b2) from approximate columns, omega(x, y) = x^T J y.
    Performed in the coefficient ring, so balls enclose the exact Gram-Schmidt output of the
    given (exact) float input, which is exactly symplectic."""
    def om(x, y):
        return sum((x[i] * Jm[i][j] * y[j] for i in range(4) for j in range(4) if Jm[i][j] != 0), one * 0)
    def lin(x, cx, y, cy, z, cz):
        return [x[i] * cx + y[i] * cy + z[i] * cz for i in range(4)]
    a1, b1, a2, b2 = [[one * c for c in col] for col in cols]
    b1 = [x / om(a1, b1) for x in b1]
    a2 = lin(a2, one, a1, -om(a2, b1), b1, om(a2, a1))
    b2 = lin(b2, one, a1, -om(b2, b1), b1, om(b2, a1))
    b2 = [x / om(a2, b2) for x in b2]
    return [a1, b1, a2, b2]


def float_diagonaliser(H2):
    """Floating-point approximate symplectic diagonaliser of H2 (columns a1, b1, a2, b2)."""
    import numpy as np
    S = np.array([[float(x) for x in row] for row in hessian(H2, 0.0)])
    M = np.array(Jm, float) @ S
    ev, V = np.linalg.eig(M)
    cols = []
    for k in np.argsort(-ev.imag)[:2]:
        e = V[:, k]
        a, b = e.real, e.imag
        kap = a @ np.array(Jm, float) @ b
        a, b = a / abs(kap) ** 0.5, b / abs(kap) ** 0.5 * np.sign(kap)
        cols += [list(a), list(b)]
    return cols


def normal_form(H2, H3, H4, kind='float', col_choice=None, need_order4=True, precond=None):
    CRg = CR(kind)
    if precond is not None:
        # exact symplectic change of variables x = T0 X, T0 from floats + symplectic Gram-Schmidt
        from flint import arb
        one = CRg.r(1) if kind != 'float' else 1.0
        cols = symplectic_gram_schmidt([[arb(float(c)) if kind != 'float' else float(c) for c in col] for col in precond], one)
        T0 = [[cols[j][i] for j in range(4)] for i in range(4)]
        z = one * 0
        H2 = compose_linear(H2, T0, z)
        H3 = compose_linear(H3, T0, z)
        H4 = compose_linear(H4, T0, z)
    if kind == 'float':
        zero = 0.0
    elif kind == 'cf':
        from flint import arb
        from cf import CF
        zero = CF.const(arb(0))
    elif kind == 'cf2':
        from flint import arb
        from cf import CF2
        zero = CF2.const(arb(0))
    else:
        from flint import arb
        zero = arb(0)
    S = hessian(H2, zero)
    M = [[sum((Jm[i][k] * S[k][j] for k in range(4)), zero) for j in range(4)] for i in range(4)]
    # characteristic polynomial x^4 - e1 x^3 + e2 x^2 - e3 x + e4
    e2 = zero
    for i in range(4):
        for j in range(i + 1, 4):
            e2 = e2 + M[i][i] * M[j][j] - M[i][j] * M[j][i]
    e4 = det4(M)
    disc = e2 * e2 - e4 * 4
    info = dict(e2=e2, e4=e4, disc=disc)
    if not (is_pos(e2) and is_pos(e4)):
        raise Refused('not linearly stable (e2 > 0 and e4 > 0 not certified)', info)
    if not is_pos(disc):
        raise Refused('distinct real frequencies not certified (Krein collision, complex quartet or 1:1)', info)
    sd = CRg.sqrt(disc)
    w2sq = [(e2 + sd) / 2, (e2 - sd) / 2]
    if not is_pos(w2sq[1]):
        raise Refused('w2^2 > 0 not certified', info)
    w = [CRg.sqrt(x) for x in w2sq]
    info.update(w=w)
    # eigenvectors
    cols = []
    signs = []
    kappas = []
    for k in range(2):
        lam = CRg.c(0, w[k]) if kind != 'float' else complex(0, w[k])
        Mc = [[(CRg.c(M[i][j]) if kind != 'float' else complex(M[i][j])) - (lam if i == j else 0) for j in range(4)] for i in range(4)]
        if col_choice is None:
            # choose the adjugate column of largest magnitude at the midpoint
            best, bi = -1, 0
            for c in range(4):
                v = adj_col(Mc, c)
                n = sum(abs(complex(float(x.real.mid()), float(x.imag.mid())) if kind != 'float' else x) ** 2 for x in v)
                if n > best:
                    best, bi = n, c
            ci = bi
        else:
            ci = col_choice[k]
        e = adj_col(Mc, ci)
        a = [CRg.re(x) for x in e]
        b = [CRg.im(x) for x in e]
        kap = sum((a[i] * Jm[i][j] * b[j] for i in range(4) for j in range(4) if Jm[i][j] != 0), zero)
        if not is_nonzero(kap):
            raise Refused('eigenvector normalisation kappa != 0 not certified', info)
        s = 1 if kap > 0 else -1
        sc = CRg.sqrt(abs(kap)) if kind == 'float' else abs(kap).sqrt()
        a = [x / sc for x in a]
        b = [x / sc * s for x in b]
        cols += [a, b]
        signs.append(s)
        kappas.append(kap)
    T = [[cols[j][i] for j in range(4)] for i in range(4)]
    info.update(signs=signs, T=T)
    sw = [signs[0] * w[0], signs[1] * w[1]]
    # complex coordinates: Q = (xi + eta)/sqrt2, P = (xi - eta)/(i sqrt2)
    r2 = CRg.sqrt(CRg.r(2)) if kind != 'float' else 2 ** 0.5
    I = CRg.I
    Cm = [[0] * 4 for _ in range(4)]
    for k in range(2):
        Cm[2 * k][2 * k] = 1 / r2 if kind == 'float' else CRg.c(1) / r2
        Cm[2 * k][2 * k + 1] = 1 / r2 if kind == 'float' else CRg.c(1) / r2
        Cm[2 * k + 1][2 * k] = 1 / (I * r2)
        Cm[2 * k + 1][2 * k + 1] = -1 / (I * r2)
    czero = CRg.c(0) if kind != 'float' else 0j
    L = [[sum((T[i][k] * Cm[k][j] for k in range(4) if not (isinstance(Cm[k][j], int) and Cm[k][j] == 0)), czero)
          for j in range(4)] for i in range(4)]
    h3 = compose_linear(H3, L, czero)
    h4 = compose_linear(H4, L, czero) if need_order4 else {}
    # check of the quadratic part (diagnostic, returned)
    h2 = compose_linear(H2, L, czero)
    info.update(h2=h2)

    def dot(e):
        # <s w, a - b>, variables ordered (xi1, eta1, xi2, eta2)
        return sw[0] * (e[0] - e[1]) + sw[1] * (e[2] - e[3])

    # resonance checks: all monomials of degree 3 and 4 with a != b
    for d in (3, 4):
        for e in product(range(d + 1), repeat=4):
            if sum(e) != d:
                continue
            if e[0] == e[1] and e[2] == e[3]:
                continue
            den = dot(e)
            if not is_nonzero(den):
                raise Refused('resonance of order <= 4 not excluded (monomial %s)' % (e,), info)
    W3 = {}
    for e, c in h3.items():
        W3[e] = c * I / dot(e)

    def bracket(F, G):
        out = {}
        for k in range(2):
            t1 = pmul(pderiv(F, 2 * k), pderiv(G, 2 * k + 1))
            t2 = pmul(pderiv(F, 2 * k + 1), pderiv(G, 2 * k))
            out = padd(out, padd(t1, t2, -1))
        return pscale(out, -I)

    K4 = padd(h4, pscale(bracket(h3, W3), CRg.c(1) / 2 if kind != 'float' else 0.5))
    A = K4.get((2, 2, 0, 0), czero)
    B = K4.get((1, 1, 1, 1), czero)
    C = K4.get((0, 0, 2, 2), czero)
    info.update(A=A, B=B, C=C, sw=sw)
    Ar, Br, Cr = CRg.re(A), CRg.re(B), CRg.re(C)
    D = Ar * w[1] * w[1] + Br * w[0] * w[1] + Cr * w[0] * w[0]
    info.update(D=D, imag=[CRg.im(A), CRg.im(B), CRg.im(C)])
    return info
