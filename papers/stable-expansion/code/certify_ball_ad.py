# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Ball arithmetic kernel of certify_collapses.py: every rigorous step of that program goes through
this file and the Arb library underneath it.

  * T         second-order forward-mode automatic differentiation over Arb balls (value, gradient,
              Hessian). Each derivative that enters a Krawczyk operator or a Hessian test is the
              natural interval extension of the exact derivative formula, evaluated by FLINT/Arb with
              outward rounding.
  * F_T       the Euler collapse equations F_j = w_j - lam conj(z_j), w_j = sum_{k != j} G_k/(z_j - z_k),
              in real form (Re F_1..Re F_N, Im F_1..Im F_N), with their derivatives.
  * krawczyk  the Krawczyk test K(X) = x~ - Y f(x~) + (I - Y f'(X))(X - x~), K(X) in int(X).
  * inertia of symmetric interval matrices by leading principal minors (Sylvester, Jacobi).

Conventions. Full parameter vector v of length 3N - 1:
     v[0]          = x_1                        (z_1 = x_1 real: rotation gauge)
     v[2k-1], v[2k] = x_{k+1}, y_{k+1}           k = 1..N-1
     v[2N-2+k]     = Gamma_{k+1}                k = 1..N-1   (Gamma_1 = 1: circulation gauge)
     v[3N-2]       = P, lam = 2P - i            (Im lam = -1: length gauge)
With z_c = 0 and lam as above, P = Re(lam)/(2|Im lam|) is the signed winding number.

Non-rigorous arithmetic appears here only in `newton` (Arb midpoints, used to produce the candidate
x~) and in the choice of the preconditioner Y (the midpoint inverse); neither can affect soundness,
since the Krawczyk test encloses everything else.
"""
from flint import arb, arb_mat, ctx, fmpq

PREC = 320            # bits of working precision (about 96 decimal digits)
ctx.prec = PREC


def A(x):
    """An exact Arb number from a decimal string, int or fmpq. Strings are rounded to PREC bits and
    the midpoint is taken, so the result is exact; this is used only for starting points."""
    if isinstance(x, arb):
        return x
    if isinstance(x, fmpq):
        return arb(x)
    return arb(x).mid()


# ------------------------------------------------------------------------------------------------
#  second-order forward-mode automatic differentiation over Arb balls
# ------------------------------------------------------------------------------------------------
class T:
    """A scalar function of n variables: value v (arb), gradient g (n x 1 arb_mat, or None for a
    constant) and Hessian H (n x n arb_mat, or None). With T.order = 1 Hessians are skipped."""
    __slots__ = ('v', 'g', 'H')
    n = 0
    order = 2

    def __init__(self, v, g=None, H=None):
        self.v = v
        self.g = g
        self.H = H

    @staticmethod
    def var(value, i):
        g = arb_mat(T.n, 1)
        g[i, 0] = arb(1)
        return T(value, g, None)

    def __add__(a, b):
        if not isinstance(b, T):
            b = T(b)
        return T(a.v + b.v, _add(a.g, b.g), _add(a.H, b.H))
    __radd__ = __add__

    def __neg__(a):
        return T(-a.v, None if a.g is None else -a.g, None if a.H is None else -a.H)

    def __sub__(a, b):
        if not isinstance(b, T):
            b = T(b)
        return a + (-b)

    def __rsub__(a, b):
        return (-a) + b

    def __mul__(a, b):
        if not isinstance(b, T):
            return T(a.v*b, None if a.g is None else a.g*b, None if a.H is None else a.H*b)
        v = a.v*b.v
        g = _add(None if a.g is None else a.g*b.v, None if b.g is None else b.g*a.v)
        H = None
        if T.order >= 2:
            H = _add(None if a.H is None else a.H*b.v, None if b.H is None else b.H*a.v)
            if a.g is not None and b.g is not None:
                o = a.g*b.g.transpose()
                H = _add(H, o + o.transpose())
        return T(v, g, H)
    __rmul__ = __mul__

    def recip(a):
        r = 1/a.v
        if a.g is None:
            return T(r)
        r2 = r*r
        g = a.g*(-r2)
        H = None
        if T.order >= 2:
            H = a.g*a.g.transpose()*(2*r2*r)
            if a.H is not None:
                H = H + a.H*(-r2)
        return T(r, g, H)

    def pw(a, p):
        """a**p for a.v > 0 (p an exact arb or int)."""
        r = a.v**p
        if a.g is None:
            return T(r)
        d1 = r*p/a.v
        g = a.g*d1
        H = None
        if T.order >= 2:
            d2 = d1*(p - 1)/a.v
            H = a.g*a.g.transpose()*d2
            if a.H is not None:
                H = H + a.H*d1
        return T(r, g, H)


def _add(x, y):
    if x is None:
        return y
    if y is None:
        return x
    return x + y


# ------------------------------------------------------------------------------------------------
#  layout helpers
# ------------------------------------------------------------------------------------------------
def names(N):
    nm = ['x1']
    for k in range(2, N + 1):
        nm += ['x%d' % k, 'y%d' % k]
    nm += ['G%d' % k for k in range(2, N + 1)]
    nm += ['P']
    return nm


def idx_P(N):
    return 3*N - 2


def idx_G(N, k):
    """index of Gamma_k, k = 2..N"""
    return 2*N - 3 + k


def unpack_full(vals, N):
    """vals: list (length 3N - 1) of T or arb -> (x, y, G, P); y_1 = 0 and Gamma_1 = 1 exactly."""
    x = [vals[0]] + [vals[2*k - 1] for k in range(1, N)]
    y = [arb(0)] + [vals[2*k] for k in range(1, N)]
    G = [arb(1)] + [vals[2*N - 2 + k] for k in range(1, N)]
    P = vals[3*N - 2]
    return x, y, G, P


def load_start(path):
    """A starting point file {"P", "G", "z"} (decimal strings, z_1 real) -> (N, full vector as strings)."""
    import json
    with open(path) as f:
        d = json.load(f)
    N = len(d['G'])
    v = [d['z'][0][0]]
    for k in range(1, N):
        v += [d['z'][k][0], d['z'][k][1]]
    v += d['G'][1:]
    v += [d['P']]
    return N, v


# ------------------------------------------------------------------------------------------------
#  the Euler collapse equations with derivatives
# ------------------------------------------------------------------------------------------------
def F_T(full, free, N, order=1, lam=None):
    """full: list (3N - 1) of arb values (points or balls); free: the indices of `full` that are
    unknowns (the others are held fixed). Returns the 2N components of F as T numbers with
    derivatives with respect to the free unknowns, in the order of `free`.
    lam = None: lam = 2P - i. lam = (c, k): lam = c (k t - i), t the last coordinate."""
    T.n = len(free)
    T.order = order
    vals = [T(c) for c in full]
    for pos, i in enumerate(free):
        vals[i] = T.var(full[i], pos)
    x, y, G, P = unpack_full(vals, N)
    x = [t if isinstance(t, T) else T(t) for t in x]
    y = [t if isinstance(t, T) else T(t) for t in y]
    G = [t if isinstance(t, T) else T(t) for t in G]
    Re = [T(arb(0)) for _ in range(N)]
    Im = [T(arb(0)) for _ in range(N)]
    for j in range(N):
        for k in range(j + 1, N):
            a = x[j] - x[k]
            b = y[j] - y[k]
            im = (a*a + b*b).recip()
            rr = a*im
            ri = -(b*im)                                  # 1/(z_j - z_k) = rr + i ri
            Re[j] = Re[j] + G[k]*rr
            Im[j] = Im[j] + G[k]*ri
            Re[k] = Re[k] - G[j]*rr                       # 1/(z_k - z_j) = -(rr + i ri)
            Im[k] = Im[k] - G[j]*ri
    out_re, out_im = [], []
    if lam is None:
        for j in range(N):
            # lam conj(z_j) = (2P - i)(x_j - i y_j) = (2P x_j - y_j) + i(-2P y_j - x_j)
            out_re.append(Re[j] - (P*x[j]*2 - y[j]))
            out_im.append(Im[j] + (P*y[j]*2 + x[j]))
    else:
        c, kk = lam
        for j in range(N):
            out_re.append(Re[j] - (P*x[j]*kk - y[j])*c)
            out_im.append(Im[j] + (P*y[j]*kk + x[j])*c)
    return out_re + out_im


def jac_of(Ts):
    n = T.n
    J = arb_mat(len(Ts), n)
    for r, t in enumerate(Ts):
        if t.g is None:
            continue
        for c in range(n):
            J[r, c] = t.g[c, 0]
    return J


# ------------------------------------------------------------------------------------------------
#  Krawczyk
# ------------------------------------------------------------------------------------------------
def mid_mat(M):
    R = arb_mat(M.nrows(), M.ncols())
    for i in range(M.nrows()):
        for j in range(M.ncols()):
            R[i, j] = M[i, j].mid()
    return R


def krawczyk(fun, xt, rad):
    """fun(xlist, want_jac) -> (list of arb values, arb_mat Jacobian or None).
    xt: the candidate (list of arb; midpoints are taken), rad: list of arb radii, or one arb.
    Returns (ok, K, X, info). ok == True proves: fun has exactly one zero in the box X, the zero lies
    in K, and every matrix in the interval Jacobian over X is nonsingular."""
    m = len(xt)
    if not isinstance(rad, (list, tuple)):
        rad = [rad]*m
    xt = [a.mid() for a in xt]
    X = [arb(xt[i], rad[i]) for i in range(m)]
    f0, J0 = fun(xt, True)
    Y = mid_mat(mid_mat(J0).inv())                        # an exact real matrix (floating choice)
    _, MX = fun(X, True)
    fcol = arb_mat(m, 1, f0)
    dcol = arb_mat(m, 1, [X[i] - xt[i] for i in range(m)])
    I = arb_mat(m, m)
    for i in range(m):
        I[i, i] = arb(1)
    Kc = arb_mat(m, 1, xt) - Y*fcol + (I - Y*MX)*dcol
    K = [Kc[i, 0] for i in range(m)]
    ok = all(X[i].contains_interior(K[i]) for i in range(m))
    C = I - Y*MX
    cn = max(sum(C[i, j].abs_upper() for j in range(m)) for i in range(m))
    yf = max((Y*fcol)[i, 0].abs_upper() for i in range(m))
    return ok, K, X, dict(contraction=cn, step=yf)


def krawczyk_tighten(fun, K, rounds=4):
    """After a successful test K contains the zero; iterate K <- K(K) & K for a tight box."""
    for _ in range(rounds):
        xt = [a.mid() for a in K]
        rad = [arb(a.rad()) for a in K]
        ok, K2, X, info = krawczyk(fun, xt, rad)
        if not ok:
            break
        K = [K2[i].intersection(K[i]) for i in range(len(K))]
    return K


def newton(fun, x, iters=30, tol=None):
    """Point Newton at working precision on midpoints (non-rigorous; produces the candidate x~)."""
    tol = tol if tol is not None else arb(2)**(-PREC + 20)
    x = [a.mid() for a in x]
    for it in range(iters):
        f, J = fun(x, True)
        nf = max(abs(a.mid()) for a in f)
        if nf < tol:
            break
        dx = mid_mat(J).solve(arb_mat(len(x), 1, [a.mid() for a in f]))
        x = [(x[i] - dx[i, 0]).mid() for i in range(len(x))]
    f, _ = fun(x, False)
    return x, max(abs(a.mid()) for a in f)


# ------------------------------------------------------------------------------------------------
#  inertia of symmetric interval matrices (Sylvester, Jacobi)
# ------------------------------------------------------------------------------------------------
def leading_minors(M):
    d = M.nrows()
    out = []
    for k in range(1, d + 1):
        S = arb_mat(k, k)
        for i in range(k):
            for j in range(k):
                S[i, j] = M[i, j]
        out.append(S.det())
    return out


def neg_count(M):
    """The number of negative eigenvalues of every symmetric matrix enclosed by M, by Jacobi's rule
    (sign changes in 1, D_1, ..., D_d, the leading principal minors), valid when no D_k contains 0.
    Returns None if the sign of some minor is not certified."""
    signs = [1]
    for x in leading_minors(M):
        if x > 0:
            signs.append(1)
        elif x < 0:
            signs.append(-1)
        else:
            return None
    return sum(1 for i in range(len(signs) - 1) if signs[i] != signs[i + 1])


def sym(M):
    """(M + M^T)/2: contains the true matrix whenever M does and the true matrix is symmetric."""
    return (M + M.transpose())*arb(0.5)
