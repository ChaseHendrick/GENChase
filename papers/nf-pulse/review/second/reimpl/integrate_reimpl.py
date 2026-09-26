"""Task 2b (rigorous): interval Taylor-series integration (no Lohner/QR, no Taylor models) of the orbits at
c = c1 and c = c2 from the enclosed point of W^u_+ (manifold_reimpl.py) until they return near rest and
separate along the unstable direction.

One step of length h from the ball vector x:
  1. c_k = Taylor coefficients at x (orders 0..N), in ball arithmetic (inclusion-monotone).
  2. A priori enclosure: a box B with x + [0,h] f(B) contained in B (checked); by the Picard-Schauder argument
     the solution through every point of x stays in B on [0, h].
  3. Lagrange remainder: x_i(h) = sum_{k<=N} c_{k,i} h^k + F_{N+1,i}(x(tau_i)) h^{N+1}, and F_{N+1}(B) (the order
     N+1 coefficient computed with B as initial value) encloses F_{N+1,i}(x(tau_i)).
The unstable coordinate is a = (row 0 of E^{-1}) (x - rest), E the exact matrix of manifold_reimpl.py.
"""
import json
import sys
import time
from flint import arb, ctx
import nfr
import manifold_reimpl as MR

ctx.prec = nfr.PREC
NORD = 36
TOL = arb(10) ** -100


def field(x, kap):
    U, V, Q, P = x
    return [kap * (Q - U - V), nfr.EPS * kap * U, P, Q - nfr.S(U)]


def hull(a, b):
    return a.union(b)


def step(x, kap, h):
    co = nfr.taylor_coeffs(x, kap, NORD)
    hb = arb(h)
    tI = arb(h / 2, h / 2)  # the interval [0, h] (h is an exact double)
    # candidate box from the Taylor polynomial on [0, h]
    B = []
    for i in range(4):
        p = arb(0)
        for k in range(NORD, -1, -1):
            p = p * tI + co[i][k]
        w = abs(p - x[i]).upper() + (abs(x[i]).upper() + 1) * arb(10) ** -60
        B.append(arb(p.mid(), (p.rad() + x[i].rad() + w * arb(0.2)).upper() * 2))
        B[i] = hull(B[i], x[i])
    for attempt in range(6):
        fB = field(B, kap)
        Bn = [x[i] + tI * fB[i] for i in range(4)]
        if all(B[i].contains(Bn[i]) for i in range(4)):
            break
        B = [arb(B[i].mid(), (B[i].rad() * 2 + abs(Bn[i] - B[i].mid()).upper())) for i in range(4)]
    else:
        return None
    coB = nfr.taylor_coeffs(Bn, kap, NORD + 1)
    xn = []
    for i in range(4):
        p = arb(0)
        for k in range(NORD, -1, -1):
            p = p * hb + co[i][k]
        p += coB[i][NORD + 1] * hb ** (NORD + 1)
        xn.append(p)
    return xn, co


def choose_h(co, hmax=0.25):
    # size of the last two coefficients -> step for which the truncation is ~ TOL
    m = arb(0)
    for i in range(4):
        m = max(m, abs(co[i][NORD]).upper(), abs(co[i][NORD - 1]).upper())
    if m.is_zero():
        return hmax
    h = float((TOL / m).root(NORD).mid()) * 0.5
    return min(h, hmax)


def run(cq, label, xi_max=70.0, log_every=1.0):
    info = MR.build(cq, label)
    assert info["ok"]
    b = info["_balls"]
    x, Ei, rest, kap = b["x0"], b["Ei"], b["rest"], b["kap"]
    ua = [Ei[0, j] for j in range(4)]

    def acoord(x):
        return sum(ua[j] * (x[j] - rest[j]) for j in range(4))

    xi = 0.0
    co = nfr.taylor_coeffs(x, kap, NORD)
    h = choose_h(co)
    rows = []
    Umax = arb(0)
    xi_Umax = 0
    next_log = 0.0
    sign_cert = None
    amin = None
    first_neg = None
    excursion_done = False
    t0 = time.time()
    nsteps = 0
    while xi < xi_max:
        r = step(x, kap, h)
        if r is None:
            h /= 2
            continue
        x, co = r
        xi += h
        nsteps += 1
        a = acoord(x)
        if x[0].lower() > Umax.lower():
            Umax, xi_Umax = x[0], xi
        dist = max(abs(x[i] - rest[i]).upper() for i in range(4))
        if not excursion_done and xi > 5 and dist < arb(0.05):
            excursion_done = True
        wid = max(x[i].rad() for i in range(4))
        if xi >= next_log:
            rows.append(dict(xi=round(xi, 4), U=x[0].str(12), a=a.str(8), maxrad=wid.str(3), dist=dist.str(3)))
            next_log += log_every
        if excursion_done:
            if amin is None or abs(a).upper() < amin[1]:
                amin = (xi, abs(a).upper(), a.str(8), dist.str(5))
            if (a > 0 or a < 0) and abs(a).lower() > arb(0.005):
                sign_cert = dict(xi=xi, sign=int(a > 0) - int(a < 0), a=a.str(10), U=x[0].str(10), maxrad=wid.str(3))
                break
            if a < 0 and first_neg is None:
                first_neg = xi
        if not all(v.is_finite() for v in x) or wid > arb(0.1):
            print("enclosure lost at xi", xi)
            break
        h = choose_h(co)
    final = dict(xi=xi, U=x[0].str(15), V=x[1].str(15), Q=x[2].str(15), P=x[3].str(15), a=acoord(x).str(15),
                 maxrad=max(x[i].rad() for i in range(4)).str(3))
    out = dict(label=label, c=str(cq), order=NORD, steps=nsteps, seconds=round(time.time() - t0, 1),
               Umax=Umax.str(12), xi_Umax=round(xi_Umax, 3), sign_certified=sign_cert, min_abs_a_after_return=dict(xi=amin[0], a=amin[2], dist=amin[3]), first_xi_a_certified_negative=first_neg, final=final, trace=rows)
    return out


if __name__ == "__main__":
    res = {}
    for cq, lab in ((nfr.C1_Q, "c1"), (nfr.C2_Q, "c2")):
        o = run(cq, lab)
        res[lab] = o
        print(json.dumps({k: v for k, v in o.items() if k != 'trace'}, indent=1))
        for r in o["trace"]:
            print("  ", r)
        sys.stdout.flush()
    with open("integration_result.json", "w") as f:
        json.dump(res, f, indent=1)
