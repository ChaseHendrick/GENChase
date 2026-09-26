"""Task 2 (RIGOROUS): validated integration of the unstable-manifold branch at a POINT speed c.

Usage: python3 prove_ends.py <c-spec> [prec=600] [N=40] [dexp=40] [Tmax=175] [out.json]
  c-spec: c1 | c2 | c1c2 (whole interval) | c1+<decimal offset> e.g. c1+5e-26 | a plain decimal speed.

Chain (all in ball arithmetic, python-flint arb):
  1. eigen-decomposition of the rest Jacobian at c (eigsys.EigSystem; bracketed real roots of the quartic);
  2. manifold_cone.check: quadratic-cone lemma with K = 1000, r = 1e-5, rho = 1e-6, so the branch of W^u that
     leaves with a > 0 (U increasing) meets {a = delta} in the box {a = delta, |b|_inf <= K delta^2};
  3. hoe.step: interval Taylor order N, high-order a priori enclosure, mean-value form; the box enclosing the
     orbit is carried in eigen-coordinates z = (a, b) (a = unstable coordinate, b = stable coordinates);
  4. events (all certified by ball comparisons): FIRED when U > 0.5; RETURNED when later U < -0.1; after that,
     SIGN when a has a certified sign and |a| > 2 |b|_inf; LEFT when |U| > 0.1 with a certified sign.
Everything reported for the orbit is an enclosure of the true orbit through the true manifold point.
"""
import sys, json, time
from flint import arb, ctx
import nfmodel as M, hoe
from eigsys import EigSystem
import manifold_cone

def parse_c(spec):
    if spec == 'c1': return M.c1()
    if spec == 'c2': return M.c2()
    if spec == 'c1c2': return M.c_interval()      # the whole speed interval as one ball
    if spec.startswith('c1+'): return M.c1() + arb(spec[3:])
    if spec.startswith('c1-'): return M.c1() - arb(spec[3:])
    if spec.startswith('c2+'): return M.c2() + arb(spec[3:])
    return arb(spec)

def sgn(x):
    if x > 0: return 1
    if x < 0: return -1
    return 0

def run(spec, prec=600, N=40, dexp=40, Tmax=175, snap_every=5.0, verbose=True):
    ctx.prec = prec
    c = parse_c(spec)
    S = EigSystem(c)
    K, r, rho = '1000', '1e-5', '1e-6'
    ok, cone = manifold_cone.check(S, K, r, rho)
    assert ok, 'manifold cone lemma not verified'
    delta = arb(10)**(-dexp)
    assert delta < arb(r)
    e = arb(K)*delta*delta
    z = [delta] + [arb(0, e.upper())]*3
    t = arb(0); t0 = time.time()
    ev = {}; snaps = [dict(t=0.0, z=[x.str(60, radius=True) for x in z])]
    next_snap = snap_every
    closest = None
    umax_lo = arb(-10); umax_hi = arb(-10)   # max U over the first pulse: lower bound (grid), upper bound (a priori boxes)
    nsteps = 0
    while float(t.mid()) < Tmax:
        h = hoe.choose_h(S, z, N, 1)
        try:
            z, B, rem, h = hoe.step(S, z, N, h)
        except RuntimeError as err:
            ev['stopped'] = 'step failure at xi=%.3f (%s)' % (float(t.mid()), err); break
        t = t + h; nsteps += 1
        U = z[0]+z[1]+z[2]+z[3]           # U - U_rest = sum z (U-row of V is 1,1,1,1); U_rest = 0
        # the a priori box B also encloses U over the whole step: use it for the event tests on U
        UB = B[0]+B[1]+B[2]+B[3]
        tt = float(t.mid())
        if 'returned' not in ev:
            umax_lo = umax_lo.max(arb(U.lower())); umax_hi = umax_hi.max(arb(UB.upper()))
        if 'fired' not in ev and U > arb('0.5'):
            ev['fired'] = dict(xi=tt, U=U.str(10))
        if 'fired' in ev and 'returned' not in ev and U < arb('-0.1'):
            ev['returned'] = dict(xi=tt, U=U.str(10))
        if 'returned' in ev:
            nb = max(abs(x).upper() for x in z[1:])
            dist = max(abs(z[0]).upper(), nb)
            if closest is None or dist < closest[1]:
                closest = (tt, dist, [x.str(8) for x in z], U.str(8))
            if 'sign' not in ev and sgn(z[0]) != 0 and abs(z[0]).lower() > 2*nb:
                ev['sign'] = dict(xi=tt, sign_a=sgn(z[0]), a=z[0].str(20, radius=True),
                                  b_inf_upper=arb(nb).str(8), U=U.str(20, radius=True),
                                  sign_U=sgn(U), radius_a=arb(z[0].rad()).str(5))
            if 'sign' in ev and 'left' not in ev and (U > arb('0.1') or U < arb('-0.1')):
                ev['left'] = dict(xi=tt, U=U.str(20, radius=True), sign_U=sgn(U), a=z[0].str(20, radius=True),
                                  sign_a=sgn(z[0]))
        if tt >= next_snap:
            snaps.append(dict(t=tt, t_exact=t.str(80, radius=True), z=[x.str(60, radius=True) for x in z]))
            next_snap += snap_every
            if verbose:
                print('xi=%7.2f h=%.3f U=%s a=%s rad=%.2e' % (tt, float(h.mid()), U.str(8), z[0].str(8),
                      max(float(x.rad()) for x in z)), flush=True)
        if 'left' in ev and tt > ev['left']['xi'] + 10:
            break
    ev['closest_after_return'] = dict(xi=closest[0], max_abs_z_upper=arb(closest[1]).str(8), z=closest[2], U=closest[3]) if closest else None
    ev['max_U_first_pulse'] = dict(lower=umax_lo.str(12), upper=umax_hi.str(12))
    res = dict(c=spec, c_ball=c.str(40, radius=True), prec=prec, order=N, delta='1e-%d' % dexp,
               manifold_cone=cone, eigenvalues=[l.str(30) for l in S.lam], w=[x.str(20) for x in S.w],
               events=ev, final=dict(xi=float(t.mid()), z=[x.str(20, radius=True) for x in z],
               U=(z[0]+z[1]+z[2]+z[3]).str(20, radius=True), max_radius=max(float(x.rad()) for x in z)),
               steps=nsteps, seconds=time.time()-t0, snapshots=snaps)
    return res

if __name__ == '__main__':
    a = sys.argv[1:]
    spec = a[0]
    prec = int(a[1]) if len(a) > 1 else 600
    N = int(a[2]) if len(a) > 2 else 40
    dexp = int(a[3]) if len(a) > 3 else 40
    Tmax = float(a[4]) if len(a) > 4 else 175
    out = a[5] if len(a) > 5 else 'prove_%s.json' % spec.replace('+', 'p').replace('-', 'm')
    res = run(spec, prec, N, dexp, Tmax)
    json.dump(res, open(out, 'w'), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != 'snapshots'}, indent=1))
