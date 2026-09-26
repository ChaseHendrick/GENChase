"""Task 3 (NOT rigorous): high-precision shooting for the pulse speed with mpmath.

Independent reimplementation from the equations only.  Wave ODE, xi = x + c t, kappa = 1/c:
    U' = kappa (Q - U - V),  V' = eps kappa (U - gamma V),  Q' = P,  P' = Q - S(U).
Own adaptive high-order Taylor integrator in mpmath (E = exp(-beta(U-theta)) series, Y = 1/(1+E)).
Start on the unstable manifold of rest by a 2nd-order parameterization at amplitude 1e-32 (error ~1e-96).
Observable: G(c,T) = l_u . (x(T) - rest), the projection on the unstable eigendirection (left eigenvector).
Speed found by bisection on the sign of the escape, then secant on G with T increasing.
"""
import sys, time, json
import mpmath as mp

DPS = int(sys.argv[1]) if len(sys.argv) > 1 else 100
mp.mp.dps = DPS
beta = mp.mpf(20); theta = mp.mpf(1)/4; eps = mp.mpf(1)/10; gamma = mp.mpf(0)
S = lambda u: 1/(1+mp.exp(-beta*(u-theta)))
S0 = S(0); s1 = beta*S0*(1-S0)                       # S'(0)
s2 = beta**2*S0*(1-S0)*(1-2*S0)                       # S''(0)
REST = [mp.mpf(0), S0, S0, mp.mpf(0)]

def jac(k):
    return mp.matrix([[-k, -k, k, 0], [eps*k, -eps*k*gamma, 0, 0], [0, 0, 0, 1], [-s1, 0, 1, 0]])

def unstable(k):
    # char poly (l^2 + k l + eps k^2)(l^2 - 1) + k s1 l   (gamma = 0)
    lam = mp.findroot(lambda l: (l*l + k*l + eps*k*k)*(l*l-1) + k*s1*l, mp.mpf('0.97'))
    v = mp.matrix([1, eps*k/lam, -s1/(lam**2-1), -s1*lam/(lam**2-1)])
    J = jac(k)
    # left eigenvector: solve (J^T - lam) l = 0 with l normalised so l.v = 1
    A = J.T - lam*mp.eye(4)
    # fix l[0] = 1 and solve rows 1..3 (drop row 0)
    M = mp.matrix(3, 3); rhs = mp.matrix(3, 1)
    for i in range(3):
        for j in range(3):
            M[i, j] = A[i+1, j+1]
        rhs[i] = -A[i+1, 0]
    l = mp.lu_solve(M, rhs); l = mp.matrix([1, l[0], l[1], l[2]])
    nrm = sum(l[i]*v[i] for i in range(4)); l = l/nrm
    # second order: (2 lam - J) p2 = e4 * (-S''(0)/2) * v1^2
    p2 = mp.lu_solve(2*lam*mp.eye(4) - J, mp.matrix([0, 0, 0, -s2/2]))
    return lam, v, l, p2

def taylor(x, k, N):
    U = [x[0]]; V = [x[1]]; Q = [x[2]]; P = [x[3]]
    E = [mp.exp(-beta*(x[0]-theta))]; Y = [1/(1+E[0])]; inv = Y[0]
    for n in range(N):
        U.append(k*(Q[n]-U[n]-V[n])/(n+1))
        V.append(eps*k*(U[n]-gamma*V[n])/(n+1))
        Q.append(P[n]/(n+1))
        P.append((Q[n]-Y[n])/(n+1))
        m = n+1
        E.append(-beta*mp.fsum(j*U[j]*E[m-j] for j in range(1, m+1))/m)
        Y.append(-mp.fsum(E[j]*Y[m-j] for j in range(1, m+1))*inv)
    return [U, V, Q, P]

def step(x, k, N, tol, hmax):
    c = taylor(x, k, N)
    a1 = max(abs(c[i][N]) for i in range(4)); a2 = max(abs(c[i][N-1]) for i in range(4))
    sc = max(1, max(abs(xi) for xi in x))
    h = hmax
    if a1 > 0: h = min(h, (tol*sc/a1)**(mp.mpf(1)/N))
    if a2 > 0: h = min(h, (tol*sc/a2)**(mp.mpf(1)/(N-1)))
    h = h*mp.mpf('0.8')
    xn = [mp.polyval(c[i][::-1], h) for i in range(4)]
    return xn, h

def run(c, T, delta=mp.mpf('1e-32'), N=None, record=None, stop_abs=None):
    k = 1/c
    lam, v, l, p2 = unstable(k)
    x = [REST[i] + delta*v[i] + delta**2*p2[i] for i in range(4)]
    N = N or max(30, int(DPS*0.6))
    tol = mp.mpf(10)**(-DPS-5)
    t = mp.mpf(0)
    while t < T:
        xn, h = step(x, k, N, tol, min(mp.mpf(2), T-t))
        x = xn; t += h
        if record is not None: record.append((t, x))
        if stop_abs is not None and abs(x[0]) > stop_abs: break
    G = sum(l[i]*(x[i]-REST[i]) for i in range(4))
    return G, x, t

if __name__ == "__main__" and len(sys.argv) <= 2:
    t0 = time.time()
    G, x, t = run(mp.mpf('1.1027477097341592491478677'), 90)
    print('test run', mp.nstr(G, 10), [mp.nstr(xx, 8) for xx in x], time.time()-t0)

def escape_sign(c, delta=mp.mpf('1e-32'), Tmax=400, thresh=mp.mpf('1e-2')):
    """Integrate until, after the pulse has fired (U > 0.5) and returned (U < -0.1), the orbit
    either fires a second time (U > 0.5: sign +1) or runs away below (U < -1: sign -1).
    Returns (sign, t, G, x, max U of the first pulse)."""
    k = 1/c
    lam, v, l, p2 = unstable(k)
    x = [REST[i] + delta*v[i] + delta**2*p2[i] for i in range(4)]
    N = max(30, int(DPS*0.6)); tol = mp.mpf(10)**(-DPS-5)
    t = mp.mpf(0); fired = False; ret = False; umax = mp.mpf(0)
    while t < Tmax:
        x, h = step(x, k, N, tol, mp.mpf(2)); t += h
        umax = max(umax, x[0])
        if x[0] > mp.mpf('0.5'): fired = True
        if fired and x[0] < mp.mpf('-0.1'): ret = True
        if ret and (x[0] > mp.mpf('0.5') or x[0] < -1):
            G = sum(l[i]*(x[i]-REST[i]) for i in range(4))
            return (1 if x[0] > 0 else -1), t, G, x, umax
    raise RuntimeError('no decision by Tmax')

def bisect(lo, hi, width, log):
    slo = escape_sign(lo)[0]; shi = escape_sign(hi)[0]
    assert slo != shi, (slo, shi)
    log.write('bracket signs lo %d hi %d\n' % (slo, shi)); log.flush()
    it = 0
    while hi - lo > width:
        mid = (lo+hi)/2
        sm, t, G, x, umax = escape_sign(mid)
        if sm == slo: lo = mid
        else: hi = mid
        it += 1
        log.write('%3d  t_dec=%7.2f  width=%s  lo=%s\n' % (it, float(t), mp.nstr(hi-lo, 3), mp.nstr(lo, 70))); log.flush()
    return lo, hi, slo, shi

def main_bisect():
    out = sys.argv[2] if len(sys.argv) > 2 else 'shoot_mp_result.json'
    width = mp.mpf(10)**(-int(sys.argv[3]) if len(sys.argv) > 3 else -64)
    log = open(out.replace('.json', '.log'), 'w')
    t0 = time.time()
    lo, hi, slo, shi = bisect(mp.mpf('1.1027'), mp.mpf('1.1028'), width, log)
    ref = mp.mpf('1.10274770973415924914786773574662')
    c1 = mp.mpf('1.1027477097341592491478677'); c2 = c1 + mp.mpf(10)**-25
    res = dict(dps=DPS, lo=mp.nstr(lo, 80), hi=mp.nstr(hi, 80), sign_lo=slo, sign_hi=shi,
               width=mp.nstr(hi-lo, 5), readme_prefix=str(ref),
               readme_digits_are_prefix_of_bracket=bool(mp.nstr(lo, 75, strip_zeros=False).startswith(str(ref)) and mp.nstr(hi, 75, strip_zeros=False).startswith(str(ref))),
               bracket_inside_c1c2=bool(c1 <= lo and hi <= c2),
               seconds=time.time()-t0)
    s_lo = mp.nstr(lo, 75, strip_zeros=False); s_hi = mp.nstr(hi, 75, strip_zeros=False)
    n = 0
    while n < min(len(s_lo), len(s_hi)) and s_lo[n] == s_hi[n]: n += 1
    res['common_prefix'] = s_lo[:n]
    json.dump(res, open(out, 'w'), indent=1)
    print(json.dumps(res, indent=1))

if __name__ == '__main__' and len(sys.argv) > 2:
    main_bisect()
