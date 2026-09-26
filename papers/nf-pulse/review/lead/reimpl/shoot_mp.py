# shoot_mp.py -- Task 3 (NON-RIGOROUS): high-precision shooting for the pulse speed c* in mpmath.
# Written independently of papers/nf-pulse/code/ (not read).
#
# Run:   python3 shoot_mp.py [dps] [taylor_order] [manifold_order] [log10_start_distance]
#        e.g. python3 shoot_mp.py 80 40 24 -8   (default; about 15-30 minutes on one core, pure-python mpmath)
#        mpmath with the pure-python backend)
#
# Method:
#  * Wave ODE in deviation coordinates y = x - rest (see common.py): U' = k(Q-U-V), V' = eps k U,
#    Q' = P, P' = Q - D(U), D(U) = S(U) - S(0).
#  * Start: the unstable manifold parameterised to order `manifold_order` (parameterisation
#    method: (J - n lam) a_n = -[nonlinear part]_n), evaluated at sigma with |a_1 sigma| = 10^start.
#  * Integrator: fixed-order Taylor method, coefficients by the classical recursion
#    (exp and quotient recurrences), adaptive step from the last two coefficients, tolerance
#    10^-(dps-8) relative.
#  * Speed: a bracket [cl, cr] is always certified (numerically) by the SIGN OF THE ESCAPE
#    DIRECTION: the sign of U when |U| first exceeds 1 after the pulse is -1 at cl and +1 at cr.
#    To shrink it faster than plain bisection, each level uses the splitting function
#    g_T(c) = l . y(T) (l the left unstable eigenvector at rest) at T = (earlier escape time) - 5,
#    where both bracket orbits are still near rest; g_T is smooth in c and its root c_T tends to c*
#    as T grows.  The new bracket is c_T -/+ err, err estimated from the change of c_T between
#    T-4 and T, and it is accepted only if the escape signs at its ends are -1 and +1 (else widened).
import sys, time
import mpmath as mpm
from mpmath import mp, mpf

dps = int(sys.argv[1]) if len(sys.argv) > 1 else 80
NT = int(sys.argv[2]) if len(sys.argv) > 2 else 40
KM = int(sys.argv[3]) if len(sys.argv) > 3 else 24
START = int(sys.argv[4]) if len(sys.argv) > 4 else -8
mp.dps = dps
beta, theta, eps = mpf(20), mpf(1) / 4, mpf(1) / 10
A = mp.exp(beta * theta)
S0 = 1 / (1 + A)
s1 = beta * S0 * (1 - S0)
TOL = mpf(10) ** (-(dps - 8))

def D_coeffs(u, n):
    """Taylor coefficients 0..n-1 of D(u(t)) given coefficients u[0..n-1]."""
    E = [mp.exp(-beta * u[0])]
    for k in range(1, n):
        acc = mpf(0)
        for j in range(1, k + 1):
            acc += j * u[j] * E[k - j]
        E.append(-beta * acc / k)
    G = [-mp.expm1(-beta * u[0])] + [-E[k] for k in range(1, n)]
    W0 = 1 + A * E[0]
    D = []
    for k in range(n):
        acc = A * G[k] / (1 + A)
        for j in range(1, k + 1):
            acc -= A * E[j] * D[k - j]
        D.append(acc / W0)
    return D

def taylor(y, kap, n):
    U, V, Q, P = [[yi] for yi in y]
    E = [mp.exp(-beta * y[0])]
    G = [-mp.expm1(-beta * y[0])]
    W0 = 1 + A * E[0]
    Dl = [A * G[0] / (1 + A) / W0]
    for k in range(n):
        k1 = k + 1
        U.append(kap * (Q[k] - U[k] - V[k]) / k1)
        V.append(eps * kap * U[k] / k1)
        Q.append(P[k] / k1)
        P.append((Q[k] - Dl[k]) / k1)
        # extend E, D to order k+1 using U[0..k+1]
        acc = mpf(0)
        for j in range(1, k1 + 1):
            acc += j * U[j] * E[k1 - j]
        E.append(-beta * acc / k1)
        acc = A * (-E[k1]) / (1 + A)
        for j in range(1, k1 + 1):
            acc -= A * E[j] * Dl[k1 - j]
        Dl.append(acc / W0)
    return [U, V, Q, P]

def horner(c, h):
    r = mpf(0)
    for x in reversed(c):
        r = r * h + x
    return r

def eig(kap):
    co = [1, kap, eps * kap**2 - 1, kap * (s1 - 1), -eps * kap**2]
    lam = mp.findroot(lambda l: mp.polyval(co, l), mpf('0.9687611605793'))
    ls = mp.findroot(lambda l: mp.polyval(co, l), mpf('-0.1246531325'))
    return lam, ls

def Jmat(kap):
    return mp.matrix([[-kap, -kap, kap, 0], [eps * kap, 0, 0, 0], [0, 0, 0, 1], [-s1, 0, 1, 0]])

def manifold(kap, K):
    lam, _ = eig(kap)
    J = Jmat(kap)
    a = [[mpf(0)] * 4, [mpf(1), eps * kap / lam, -s1 / (lam**2 - 1), -s1 * lam / (lam**2 - 1)]]
    for n in range(2, K + 1):
        u = [a[m][0] for m in range(n)] + [mpf(0)]
        Dn = D_coeffs(u, n + 1)[n]          # nonlinear part of D at order n (U_n = 0 here)
        rhs = mp.matrix([0, 0, 0, Dn])        # (J - n lam) a_n = -(0,0,0,-Dn)
        an = mp.lu_solve(J - n * lam * mp.eye(4), rhs)
        a.append([an[i] for i in range(4)])
    return lam, a

def left_unstable(kap, lam):
    # left eigenvector: solve (J^T - lam) w = 0 with w_0 = 1 by dropping the first equation
    M = (Jmat(kap).T - lam * mp.eye(4))
    B = mp.matrix([[M[i, j] for j in range(1, 4)] for i in range(1, 4)])
    r = mp.matrix([-M[i, 0] for i in range(1, 4)])
    w = mp.lu_solve(B, r)
    return [mpf(1), w[0], w[1], w[2]]

def start_point(c):
    kap = 1 / c
    lam, a = manifold(kap, KM)
    # choose sigma so that the U-component of the linear term is 10^START
    sig = mpf(10) ** START
    y = [sum(a[n][i] * sig**n for n in range(1, KM + 1)) for i in range(4)]
    tail = max(abs(a[KM][i]) for i in range(4)) * sig**KM
    return kap, lam, y, tail

def integrate(c, Touts=(), tmax=400):
    """Integrate from the manifold start. Returns a dict: 'esc' = sign of U when |U| first exceeds 1
    after the pulse (0 if not by tmax), 't_esc', 'Umax', 'out' = states at the requested times."""
    kap, lam, y, tail = start_point(c)
    t = mpf(0); Umax = mpf(0); passed = False
    Touts = sorted(Touts); out = {}
    while True:
        cs = taylor(y, kap, NT)
        scale = max(abs(v) for v in y) + mpf(10) ** (-dps * 3)
        cn = max(max(abs(cs[i][NT]), abs(cs[i][NT - 1])) for i in range(4)) + mpf(10) ** (-dps * 4)
        h = min((TOL * scale / cn) ** (mpf(1) / NT) * mpf('0.8'), mpf(1))
        for To in Touts:
            if t < To <= t + h:
                out[To] = [horner(cs[i], To - t) for i in range(4)]
        y = [horner(cs[i], h) for i in range(4)]
        t += h
        Umax = max(Umax, y[0])
        if y[0] > mpf('0.5'):
            passed = True
        if passed and abs(y[0]) > 1:
            return dict(esc=1 if y[0] > 0 else -1, t_esc=t, Umax=Umax, out=out, lam=lam, kap=kap)
        if t > tmax:
            return dict(esc=0, t_esc=t, Umax=Umax, out=out, lam=lam, kap=kap)

def gproj(r, T):
    l = left_unstable(r['kap'], r['lam'])
    return sum(l[i] * r['out'][T][i] for i in range(4))

if __name__ == "__main__":
    t0 = time.time()
    print(f"dps={dps} Taylor order={NT} manifold order={KM} start |sigma| = 10^{START}")
    kap, lam, y, tail = start_point(mpf('1.1027477097'))
    print("manifold: size of the order-%d term at the start point: %s" % (KM, mp.nstr(tail, 3)))
    cl, cr = mpf('1.1027477'), mpf('1.1027478')
    rl, rr = integrate(cl), integrate(cr)
    assert rl['esc'] == -1 and rr['esc'] == 1, (rl['esc'], rr['esc'])
    print(f"bracket [{cl}, {cr}]: escape signs {rl['esc']}, {rr['esc']}; max U {mp.nstr(rl['Umax'],10)}", flush=True)
    target = mpf(10) ** (-(dps - 15))
    while cr - cl > target:
        T = min(rl['t_esc'], rr['t_esc']) - 5
        gl = integrate(cl, Touts=(T - 4, T)); gr = integrate(cr, Touts=(T - 4, T))
        roots = []
        for TT in (T - 4, T):
            a, b = gproj(gl, TT), gproj(gr, TT)
            roots.append(cl - a * (cr - cl) / (b - a))
        cT = roots[1]
        err = abs(roots[1] - roots[0]) / 10 + (cr - cl) * mpf(10) ** (-dps + 20)
        # verify a new bracket by the sign of the escape direction; widen on failure
        while True:
            nl, nr = cT - err, cT + err
            ql, qr = integrate(nl), integrate(nr)
            if ql['esc'] == -1 and qr['esc'] == 1:
                break
            print("   bracket check failed; widening", flush=True)
            err *= 100
        cl, cr, rl, rr = nl, nr, ql, qr
        print(f"  T={mp.nstr(T,5)}: c_T = {mp.nstr(cT, dps - 10)}  bracket width {mp.nstr(cr-cl,3)} "
              f"(signs -,+ verified; escape t = {mp.nstr(rl['t_esc'],5)}, {mp.nstr(rr['t_esc'],5)})  [{time.time()-t0:.0f}s]", flush=True)
    cstar = (cl + cr) / 2
    print("FINAL escape-sign bracket: [", mp.nstr(cl, dps - 12), ",", mp.nstr(cr, dps - 12), "]")
    print("c* ~", mp.nstr(cstar, dps - 12))
    ref = mpf('1.10274770973415924914786773574662')
    print("difference from the claimed 1.10274770973415924914786773574662:", mp.nstr(cstar - ref, 5))
    print("max U on the last run:", mp.nstr(rl['Umax'], 20))
    print(f"total time {time.time()-t0:.0f}s")
