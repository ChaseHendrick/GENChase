"""Independent referee computation: RE by Kirchhoff equations, Jacobi tree (12)(34), rotation gauge
on c = c34 - c12, physical H = -(1/2pi) sum G G log r, finite-difference Taylor (mpmath),
real-coordinate Lie transform with matrix homological solve, torus-average resonant part."""
import sys, json, itertools
import mpmath as mp
mp.mp.dps = 60
PI = mp.pi

def re_collinear(G, x0):
    G = [mp.mpf(g) for g in G]
    def eqs(x1, x2, x3, x4, lam):
        x = [x1, x2, x3, x4]
        E = [sum(G[k] / (x[j] - x[k]) for k in range(4) if k != j) - lam * x[j] for j in range(3)]
        return E + [x2 - x1 - 1, sum(g * xx for g, xx in zip(G, x))]
    s = mp.findroot(eqs, list(map(mp.mpf, x0)) + [mp.mpf(-1)])
    return [mp.mpc(s[i], 0) for i in range(4)], s[4]

def re_kite(G, y0):
    G = [mp.mpf(g) for g in G]
    def eqs(y1, y3, y4, lam):
        z = [mp.mpc(-0.5, y1), mp.mpc(0.5, y1), mp.mpc(0, y3), mp.mpc(0, y4)]
        def E(j):
            return sum(G[k] / (z[j] - z[k]) for k in range(4) if k != j) - lam * mp.conj(z[j])
        return [mp.re(E(0)), mp.im(E(0)), mp.im(E(2)), mp.im(E(3))]
    s = mp.findroot(eqs, list(map(mp.mpf, y0)) + [mp.mpf(1)])
    z = [mp.mpc(-0.5, s[0]), mp.mpc(0.5, s[0]), mp.mpc(0, s[1]), mp.mpc(0, s[2])]
    c = sum(g * zz for g, zz in zip(G, z)) / sum(G)
    return [zz - c for zz in z], s[3]

def check_re(G, z):
    # residual of RE: sum G_k/(z_j - z_k) = lam conj(z_j) for a common lam
    lams = [sum(G[k] / (z[j] - z[k]) for k in range(4) if k != j) / mp.conj(z[j]) for j in range(4)]
    return lams

class Red:
    def __init__(self, G, z):
        self.G = G = [mp.mpf(g) for g in G]
        S12, S34 = G[0] + G[1], G[2] + G[3]
        S4 = S12 + S34
        self.S12, self.S34, self.S4 = S12, S34, S4
        self.mua = G[0] * G[1] / S12
        self.mub = G[2] * G[3] / S34
        self.muc = S12 * S34 / S4
        a = z[1] - z[0]; b = z[3] - z[2]
        c12 = (G[0] * z[0] + G[1] * z[1]) / S12; c34 = (G[2] * z[2] + G[3] * z[3]) / S34
        c = c34 - c12
        ph = c / abs(c)
        self.va, self.vb = a / ph, b / ph
        self.J2 = self.mua * abs(a) ** 2 + self.mub * abs(b) ** 2 + self.muc * abs(c) ** 2   # 2 J0
        self.rt = [mp.sqrt(abs(self.mua)), mp.sqrt(abs(self.mub))]
        self.sg = [mp.sign(self.mua), mp.sign(self.mub)]
    def pos(self, X):
        q2, p2, q3, p3 = X
        va = self.va + mp.mpc(q2 / self.rt[0], self.sg[0] * p2 / self.rt[0])
        vb = self.vb + mp.mpc(q3 / self.rt[1], self.sg[1] * p3 / self.rt[1])
        rho2 = (self.J2 - self.mua * abs(va) ** 2 - self.mub * abs(vb) ** 2) / self.muc
        c = mp.sqrt(rho2)
        G = self.G
        c12 = -self.S34 * c / self.S4; c34 = self.S12 * c / self.S4
        return [c12 - G[1] * va / self.S12, c12 + G[0] * va / self.S12, c34 - G[3] * vb / self.S34, c34 + G[2] * vb / self.S34]
    def H(self, *X):
        z = self.pos(X)
        G = self.G
        return -sum(G[i] * G[j] * mp.log(abs(z[i] - z[j])) for i in range(4) for j in range(i + 1, 4)) / (2 * PI)

def taylor(f, deg=4):
    out = {}
    for e in itertools.product(range(deg + 1), repeat=4):
        if sum(e) > deg or sum(e) == 0:
            continue
        d = mp.diff(f, (0, 0, 0, 0), e)
        out[e] = d / mp.fprod(mp.factorial(k) for k in e)
    return out

# ---- polynomial helpers (dicts) ----
def padd(p, q, s=1):
    o = dict(p)
    for e, c in q.items():
        o[e] = o.get(e, 0) + s * c
    return o
def pmul(p, q):
    o = {}
    for e1, c1 in p.items():
        for e2, c2 in q.items():
            e = tuple(a + b for a, b in zip(e1, e2)); o[e] = o.get(e, 0) + c1 * c2
    return o
def pder(p, k):
    o = {}
    for e, c in p.items():
        if e[k]:
            f = list(e); f[k] -= 1; o[tuple(f)] = o.get(tuple(f), 0) + c * e[k]
    return o
def pb(F, G):  # {F,G} = sum F_Q G_P - F_P G_Q, vars (Q1,P1,Q2,P2)
    o = {}
    for k in (0, 2):
        o = padd(o, pmul(pder(F, k), pder(G, k + 1)))
        o = padd(o, pmul(pder(F, k + 1), pder(G, k)), -1)
    return o
def compose(p, T):
    lin = [{tuple(1 if t == j else 0 for t in range(4)): T[i][j] for j in range(4)} for i in range(4)]
    o = {}
    for e, c in p.items():
        term = {(0, 0, 0, 0): c}
        for i in range(4):
            for _ in range(e[i]):
                term = pmul(term, lin[i])
        o = padd(o, term)
    return o
def evalp(p, x):
    return sum(c * mp.fprod(xx ** k for xx, k in zip(x, e)) for e, c in p.items())

def normal_form(tay):
    H2 = {e: c for e, c in tay.items() if sum(e) == 2}
    H3 = {e: c for e, c in tay.items() if sum(e) == 3}
    H4 = {e: c for e, c in tay.items() if sum(e) == 4}
    grad = max(abs(c) for e, c in tay.items() if sum(e) == 1)
    S = mp.matrix(4, 4)
    for e, c in H2.items():
        ks = [k for k in range(4) for _ in range(e[k])]
        if ks[0] == ks[1]:
            S[ks[0], ks[0]] = 2 * c
        else:
            S[ks[0], ks[1]] = c; S[ks[1], ks[0]] = c
    J = mp.matrix([[0, 1, 0, 0], [-1, 0, 0, 0], [0, 0, 0, 1], [0, 0, -1, 0]])
    ev, V = mp.eig(J * S)
    idx = sorted([i for i in range(4) if mp.im(ev[i]) > 0], key=lambda i: -mp.im(ev[i]))
    assert len(idx) == 2 and all(abs(mp.re(ev[i])) < mp.mpf(10) ** -30 for i in range(4)), ev
    cols, sig, w = [], [], []
    for i in idx:
        e = V[:, i]
        a = [mp.re(e[k]) for k in range(4)]; b = [mp.im(e[k]) for k in range(4)]
        kap = sum(a[r] * J[r, s] * b[s] for r in range(4) for s in range(4))
        s = 1 if kap > 0 else -1
        a = [x / mp.sqrt(abs(kap)) for x in a]; b = [s * x / mp.sqrt(abs(kap)) for x in b]
        cols += [a, b]; sig.append(s); w.append(mp.im(ev[i]))
    T = [[cols[j][i] for j in range(4)] for i in range(4)]
    Tm = mp.matrix(T)
    symp = mp.mnorm(Tm.T * J * Tm - J, 1)
    D2 = Tm.T * S * Tm
    diag_err = mp.mnorm(D2 - mp.diag([sig[0] * w[0]] * 2 + [sig[1] * w[1]] * 2), 1)
    h3 = compose(H3, T); h4 = compose(H4, T)
    h2 = {(2, 0, 0, 0): sig[0] * w[0] / 2, (0, 2, 0, 0): sig[0] * w[0] / 2, (0, 0, 2, 0): sig[1] * w[1] / 2, (0, 0, 0, 2): sig[1] * w[1] / 2}
    mons3 = [e for e in itertools.product(range(4), repeat=4) if sum(e) == 3]
    Lm = mp.matrix(20, 20)
    for j, e in enumerate(mons3):
        r = pb({e: mp.mpf(1)}, h2)
        for i, f in enumerate(mons3):
            Lm[i, j] = r.get(f, 0)
    rhs = mp.matrix([h3.get(f, 0) for f in mons3])
    sol = mp.lu_solve(Lm, rhs)
    W = {e: sol[j] for j, e in enumerate(mons3)}
    chk = padd(pb(W, h2), h3, -1)
    hom_err = max(abs(c) for c in chk.values())
    K4 = padd(h4, pb(h3, W), mp.mpf(1) / 2)
    # torus average by quadrature (exact for trig polynomials of degree <= 4 with N = 8)
    N = 8
    def avg(I1, I2):
        s = 0
        for i in range(N):
            for j in range(N):
                t1, t2 = 2 * PI * i / N, 2 * PI * j / N
                x = [mp.sqrt(2 * I1) * mp.cos(t1), mp.sqrt(2 * I1) * mp.sin(t1), mp.sqrt(2 * I2) * mp.cos(t2), mp.sqrt(2 * I2) * mp.sin(t2)]
                s += evalp(K4, x)
        return s / N ** 2
    A = avg(1, 0); C = avg(0, 1); B = avg(1, 1) - A - C
    D = A * w[1] ** 2 + B * w[0] * w[1] + C * w[0] ** 2
    return dict(w=w, sig=sig, A=A, B=B, C=C, D=D, grad=grad, symp=symp, diag_err=diag_err, hom_err=hom_err)

if __name__ == '__main__':
    tv = json.load(open(sys.argv[1]))
    res = {}
    for key, d in tv.items():
        fam, m = key.split(); m = mp.mpf(m)
        G = [1, 1, 1, m]
        z0 = d['z']
        if fam == 'three-collinear':
            z, lam = re_collinear(G, [p[0] for p in z0])
        else:
            z, lam = re_kite(G, [z0[0][1], z0[2][1], z0[3][1]])
        lams = check_re(G, z)
        # scale so that |z2 - z1| = 1 (the project's normalisation)
        sc = 1 / abs(z[1] - z[0]); z = [zz * sc for zz in z]
        R = Red(G, z)
        tay = taylor(R.H)
        nf = normal_form(tay)
        w = nf['w']
        J0 = R.J2 / 2
        # convert to the project's time units: Ht = 2 pi H  => w, A, B, C scale by 2 pi
        k = 2 * PI
        rec = dict(w1=k * w[0], w2=k * w[1], ratio=w[0] / w[1], sig=nf['sig'], A=k * nf['A'], B=k * nf['B'], C=k * nf['C'],
                   D=k ** 3 * nf['D'], Dw3=nf['D'] / w[0] ** 3, DJw3=nf['D'] * J0 / w[0] ** 3, J0=J0,
                   grad=nf['grad'], symp=nf['symp'], diag=nf['diag_err'], hom=nf['hom_err'],
                   re_lam_spread=max(abs(l - lams[0]) for l in lams))
        res[key] = {a: (str(mp.nstr(b, 12)) if not isinstance(b, list) else b) for a, b in rec.items()}
        print(key, {a: (mp.nstr(b, 10) if not isinstance(b, list) else b) for a, b in rec.items()}, flush=True)
        print('    project:', 'w1 %.10f w2 %.10f ratio %.10f D %.8f D/w1^3 %.10f J0 %.10f A %.6f B %.6f C %.6f' % (d['w'][0], d['w'][1], d['ratio'], d['D'], d['Dw3'], d['J0'], d['A'], d['B'], d['C']), flush=True)
    json.dump(res, open('indep_results.json', 'w'), indent=1)
