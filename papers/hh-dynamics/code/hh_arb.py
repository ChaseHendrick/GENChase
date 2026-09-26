"""Rigorous Taylor-coefficient enclosures for the Hodgkin-Huxley vector field (python-flint arb).

State x = (u, m, n, h, E) with E = E_l carried as a state variable with E' = 0, so that a ball of
leak reversal potentials is propagated by the Lohner method as a set direction rather than as a
parameter that would be re-wrapped at every step.

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E)
    dm/dt = alpha_m(u)(1 - m) - beta_m(u) m     (same for n, h)
    dE/dt = 0

    alpha_n = 0.1 Psi((10 - u)/10)   beta_n = 0.125 exp(-u/80)
    alpha_m = Psi((25 - u)/10)       beta_m = 4 exp(-u/18)
    alpha_h = 0.07 exp(-u/20)        beta_h = 1/(exp((30 - u)/10) + 1)
    Psi(w) = w/(e^w - 1) = 1/E(w),  E(w) = (e^w - 1)/w = int_0^1 e^{s w} ds  (entire, > 0)

Taylor coefficients in time are obtained by automatic differentiation.  Every rate function is
a function of u alone, so it is expanded once around the (ball) value u0 = u(0),
    r(u0 + D) = sum_j r_j(u0) D^j,
and composed with the time series D(t) = u(t) - u0 = sum_{k>=1} u_k t^k through an incremental
table of the powers D(t)^j.  The coefficients r_j(u0) are rigorous ball enclosures:

  * exponentials: r_j = c e^{a u0} a^j / j!  (exact formula, ball arithmetic);
  * Psi: the Taylor coefficients of E at w0 are e_j(w0) = E^{(j)}(w0)/j! = 1F1(j+1; j+2; w0)/(j+1)!
    (Arb's rigorous confluent hypergeometric function).  Each e_j is increasing in w (its derivative
    is (j+1) e_{j+1} > 0), so on a wide ball it is enclosed by the hull of its values at the two
    endpoints.  No division by a ball containing 0 ever occurs: E(w0) >= E(-13) > 0.07 on the range
    used, and Psi's coefficients are the reciprocal series of E's;
  * beta_h: reciprocal series of 1 + e^{(30-u0)/10} e^{-D/10}, whose constant term is >= 1.

The Jacobian Df(x(t)) is expanded in time the same way (derivatives of the rate functions are the
shifted coefficient lists (j+1) r_{j+1}), so that the variational equation V' = Df V can be
expanded as well.
"""
from flint import arb, arb_mat, ctx

DIM = 5
NAMES = ('u', 'm', 'n', 'h', 'E')


def _fac_list(n):
    out = [arb(1)]
    for j in range(1, n + 1):
        out.append(out[-1] * j)
    return out


def recip_series(c):
    """Reciprocal of a power series with c[0] a ball not containing 0."""
    if c[0].contains(0):
        raise ZeroDivisionError('reciprocal of a series whose constant term contains 0')
    q0 = 1 / c[0]
    q = [q0]
    for j in range(1, len(c)):
        s = c[1] * q[j - 1]
        for i in range(2, j + 1):
            s += c[i] * q[j - i]
        q.append(-q0 * s)
    return q


def E_taylor(w0, deg, facs):
    """Taylor coefficients e_j = E^{(j)}(w0)/j!, j = 0..deg, of E(w) = (e^w - 1)/w at the ball w0."""
    if w0.rad() == 0:
        pts = [w0]
    else:
        pts = [w0.lower(), w0.upper()]
    out = []
    for j in range(deg + 1):
        vals = [p.hypgeom_1f1(j + 1, j + 2) / facs[j + 1] for p in pts]
        v = vals[0] if len(vals) == 1 else vals[0].union(vals[1])
        out.append(v)
    return out


class HH:
    """Hodgkin-Huxley vector field; J is fixed (arb), E_l is state variable 4."""
    dim = DIM
    names = NAMES

    def __init__(self, J, gna=120, gk=36, gl=None, ena=115, ek=-12):
        self.J = arb(J) if not isinstance(J, arb) else J
        self.gna = arb(gna)
        self.gk = arb(gk)
        self.gl = arb(3) / 10 if gl is None else (gl if isinstance(gl, arb) else arb(gl))
        self.ena = arb(ena)
        self.ek = arb(ek)
        self.tenth = arb(1) / 10
        self.c007 = arb(7) / 100
        self.c0125 = arb(1) / 8
        self.facs = _fac_list(80)
        self.zero = arb(0)

    # ---- rate-function Taylor coefficients in D = u - u0 --------------------------------
    def _exp_coeffs(self, scale, a, u0, deg):
        e0 = scale * (a * u0).exp()
        out = [e0]
        p = e0
        for j in range(1, deg + 1):
            p = p * a / j
            out.append(p)
        return out

    def _psi_coeffs(self, w0, deg):
        e = E_taylor(w0, deg, self.facs)
        q = recip_series(e)                # Psi(w0 + eps) coefficients in eps
        s = -self.tenth                     # eps = -D/10
        out = []
        p = arb(1)
        for j in range(deg + 1):
            out.append(q[j] * p)
            p = p * s
        return out

    def rate_coeffs(self, u0, deg):
        t = self.tenth
        an = [t * c for c in self._psi_coeffs((10 - u0) * t, deg)]
        am = self._psi_coeffs((25 - u0) * t, deg)
        bn = self._exp_coeffs(self.c0125, -arb(1) / 80, u0, deg)
        bm = self._exp_coeffs(arb(4), -arb(1) / 18, u0, deg)
        ah = self._exp_coeffs(self.c007, -arb(1) / 20, u0, deg)
        e0 = ((30 - u0) * t).exp()
        D = self._exp_coeffs(arb(1), -t, arb(0), deg)       # (-1/10)^j / j!
        D = [e0 * d for d in D]
        D[0] = D[0] + 1
        bh = recip_series(D)
        sm = [a + b for a, b in zip(am, bm)]
        sn = [a + b for a, b in zip(an, bn)]
        sh = [a + b for a, b in zip(ah, bh)]
        return {'am': am, 'sm': sm, 'an': an, 'sn': sn, 'ah': ah, 'sh': sh}

    # ---- Taylor series of the solution (and of the Jacobian along it) -------------------
    def series(self, x0, N, jac=False):
        """Coefficients x_k, k = 0..N, of the solution through x0 (list of 5 arb balls).

        If jac, also returns Df_k, k = 0..N-1, the time-Taylor coefficients of Df(x(t)), as
        arb_mat.  Valid for every point of the box x0 simultaneously.
        """
        u0 = x0[0]
        deg = N if jac else max(N - 1, 0)
        R = self.rate_coeffs(u0, deg)
        dR = {}
        if jac:
            for key in ('am', 'sm', 'an', 'sn', 'ah', 'sh'):
                r = R[key]
                dR[key] = [r[j + 1] * (j + 1) for j in range(deg)]
        u = [x0[0]]; m = [x0[1]]; n = [x0[2]]; h = [x0[3]]; E0 = x0[4]
        uNa = [x0[0] - self.ena]
        uK = [x0[0] - self.ek]
        P = {}                       # P[(j,k)] = [t^k] D(t)^j
        comp = {key: [] for key in R}
        dcomp = {key: [] for key in dR}
        m2 = []; m3 = []; m3h = []; INa = []; n2 = []; n4 = []; IK = []
        m2h = []; m2hU = []; n3 = []; n3U = []; m3U = []
        xs = [[x0[i] for i in range(5)]]
        Dfs = []
        z = self.zero

        def conv(a, b, k):
            s = a[0] * b[k]
            for i in range(1, k + 1):
                s += a[i] * b[k - i]
            return s

        for k in range(N):
            # power table column k
            if k >= 1:
                P[(1, k)] = u[k]
                for j in range(2, k + 1):
                    s = u[1] * P[(j - 1, k - 1)]
                    for i in range(2, k - j + 2):
                        s += u[i] * P[(j - 1, k - i)]
                    P[(j, k)] = s

            def compose(r, k):
                if k == 0:
                    return r[0]
                s = r[1] * P[(1, k)]
                for j in range(2, k + 1):
                    s += r[j] * P[(j, k)]
                return s

            for key in comp:
                comp[key].append(compose(R[key], k))
            m2.append(conv(m, m, k)); m3.append(conv(m2, m, k)); m3h.append(conv(m3, h, k))
            INa.append(conv(m3h, uNa, k))
            n2.append(conv(n, n, k)); n4.append(conv(n2, n2, k)); IK.append(conv(n4, uK, k))
            fu = -self.gna * INa[k] - self.gk * IK[k] - self.gl * u[k]
            if k == 0:
                fu += self.J + self.gl * E0
            fm = comp['am'][k] - conv(comp['sm'], m, k)
            fn = comp['an'][k] - conv(comp['sn'], n, k)
            fh = comp['ah'][k] - conv(comp['sh'], h, k)
            if jac:
                for key in dcomp:
                    dcomp[key].append(compose(dR[key], k))
                m2h.append(conv(m2, h, k)); m2hU.append(conv(m2h, uNa, k))
                n3.append(conv(n2, n, k)); n3U.append(conv(n3, uK, k))
                m3U.append(conv(m3, uNa, k))
                A = arb_mat(5, 5)
                a00 = -self.gna * m3h[k] - self.gk * n4[k]
                if k == 0:
                    a00 -= self.gl
                    A[0, 4] = self.gl
                A[0, 0] = a00
                A[0, 1] = -3 * self.gna * m2hU[k]
                A[0, 2] = -4 * self.gk * n3U[k]
                A[0, 3] = -self.gna * m3U[k]
                A[1, 0] = dcomp['am'][k] - conv(dcomp['sm'], m, k)
                A[1, 1] = -comp['sm'][k]
                A[2, 0] = dcomp['an'][k] - conv(dcomp['sn'], n, k)
                A[2, 2] = -comp['sn'][k]
                A[3, 0] = dcomp['ah'][k] - conv(dcomp['sh'], h, k)
                A[3, 3] = -comp['sh'][k]
                Dfs.append(A)
            k1 = k + 1
            nu = fu / k1
            u.append(nu); uNa.append(nu); uK.append(nu)
            m.append(fm / k1); n.append(fn / k1); h.append(fh / k1)
            xs.append([nu, m[k1], n[k1], h[k1], z])
        return xs, Dfs

    def f(self, x):
        xs, _ = self.series(x, 1)
        return xs[1]

    def Df(self, x):
        _, Dfs = self.series(x, 1, jac=True)
        return Dfs[0]
